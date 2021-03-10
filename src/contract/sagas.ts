import { END, eventChannel, EventChannel, TakeableChannel } from 'redux-saga';
import { put, call, select, takeEvery, take, cancel, all, fork } from 'redux-saga/effects';
import { EventData } from 'web3-eth-contract';
import { PromiEvent } from 'web3-core';
import { Subscription } from 'web3-core-subscriptions';
import { TransactionReceipt } from 'web3-eth';

import {
    Contract,
    CALL_BLOCK_SYNC,
    ContractCallSync,
    CALL_TRANSACTION_SYNC,
    defaultTransactionSyncForContract,
    defaultBlockSync,
    eventId,
    contractId,
    callArgsHash,
} from './model';
import { Network } from '../network/model';
import { validatedEthCall } from '../ethcall/model';

import * as ContractActions from './actions';
import * as TransactionActions from '../transaction/actions';
import * as EthCallActions from '../ethcall/actions';

import * as ContractSelector from './selector';
import * as NetworkSelector from '../network/selector';
import { ZERO_ADDRESS } from '../utils';

function* contractCallSynced(action: ContractActions.CallSyncedAction) {
    const { payload } = action;
    const id = contractId(payload);
    const contract: Contract = yield select(ContractSelector.selectSingle, id);

    //Defaults
    const from: string = payload.from ?? ZERO_ADDRESS;
    const defaultBlock = payload.defaultBlock ?? 'latest';

    let sync: ContractCallSync | false;
    const defaultTransactionSync = defaultTransactionSyncForContract(contract.address);

    if (defaultBlock === 'latest') {
        if (payload.sync === false) {
            sync = false;
        } else if (payload.sync === true) {
            sync = defaultTransactionSync;
        } else if (!payload.sync) {
            sync = defaultTransactionSync;
        } else if (payload.sync === CALL_TRANSACTION_SYNC) {
            sync = defaultTransactionSync;
        } else if (payload.sync === CALL_BLOCK_SYNC) {
            sync = defaultBlockSync;
        } else {
            sync = payload.sync as ContractCallSync;
        }
    } else {
        sync = false;
    }

    //Update contract call sync
    const key = callArgsHash({ from, defaultBlock, args: payload.args });
    const contractCallSync = contract.methods[payload.method][key];
    if (!contractCallSync) {
        contract.methods[payload.method][key] = { sync };
        yield put(ContractActions.create({ ...contract }));
        yield put(ContractActions.call(payload));
    } else if (contractCallSync.sync != sync) {
        contract.methods[payload.method][key].sync = sync;
        yield put(ContractActions.create({ ...contract }));
        yield put(ContractActions.call(payload));
    }
}

function* contractCall(action: ContractActions.CallAction) {
    const { payload } = action;
    const id = contractId(payload);
    const contract: Contract = yield select(ContractSelector.selectSingle, id);

    //Defaults
    const from: string = payload.from ?? ZERO_ADDRESS;
    const defaultBlock = payload.defaultBlock ?? 'latest';

    const web3Contract = contract.web3Contract!;
    let tx: any;
    if (!payload.args || payload.args.length == 0) {
        tx = web3Contract.methods[payload.method]();
    } else {
        tx = web3Contract.methods[payload.method](...payload.args);
    }
    const data = tx.encodeABI();

    const ethCall = validatedEthCall({
        networkId: payload.networkId,
        from,
        to: contract.address,
        defaultBlock,
        data,
        gas: payload.gas,
    });

    //Create base call
    yield put(EthCallActions.create(ethCall));

    //Update contract call key if not stored
    const key = callArgsHash({ from, defaultBlock, args: payload.args });
    const contractCallSync = contract.methods[payload.method][key];
    if (!contractCallSync) {
        contract.methods[payload.method][key] = { ethCallId: ethCall.id };
        yield put(ContractActions.create(contract));
    } else if (contractCallSync.ethCallId != ethCall.id) {
        contract.methods[payload.method][key].ethCallId = ethCall.id;
        yield put(ContractActions.create(contract));
    }

    const gas = ethCall.gas ?? (yield call(tx.estimateGas, { ...ethCall })); //default gas
    const returnValue = yield call(tx.call, { ...ethCall, gas }, ethCall.defaultBlock);
    yield put(EthCallActions.create({ ...ethCall, returnValue }));
}

function* contractCallBatched(action: ContractActions.CallBatchedAction) {
    const { payload } = action;
    const { networkId, requests } = payload;

    const network: Network = yield select(NetworkSelector.selectSingle, networkId);
    if (!network)
        throw new Error(`Could not find Network with id ${networkId}. Make sure to dispatch a Network/CREATE action.`);
    const web3 = network.web3;
    const multicallContract = network.multicallContract;

    const contractIds = Array.from(new Set(requests.map(f => contractId({ address: f.address, networkId }))));
    const contracts: Contract[] = yield select(ContractSelector.selectMany, contractIds);
    const contractsByAddress: { [key: string]: Contract } = {};
    contracts.forEach(c => (contractsByAddress[c.address] = c));

    const batch = new web3.eth.BatchRequest();

    //TODO: Multicall
    //TODO: Investigate save eth_estimagegas  by setting default to block limit as opposed to estimate
    //TODO: Investigate potential issue if gas not specified
    //TODO: Investigate potential issue max batch size
    const preCallTasks = requests.map(f => {
        const contract = contractsByAddress[f.address];
        const web3Contract = contract.web3Contract!;

        let tx: any;
        if (!f.args || f.args.length == 0) {
            tx = web3Contract.methods[f.method]();
        } else {
            tx = web3Contract.methods[f.method](...f.args);
        }

        const data = tx.encodeABI();
        const ethCall = validatedEthCall({
            networkId: network.networkId,
            to: f.address,
            data,
            gas: f.gas,
        });

        //Create base call
        const putEthCallTask = put(EthCallActions.create(ethCall));

        //Update contract call key if not stored
        const key = callArgsHash({ from: ethCall.from, defaultBlock: ethCall.defaultBlock, args: f.args });
        const contractCallSync = contract.methods[f.method][key];
        if (!contractCallSync) {
            contract.methods[f.method][key] = { ethCallId: ethCall.id };
        } else if (contractCallSync.ethCallId != ethCall.id) {
            contract.methods[f.method][key].ethCallId = ethCall.id;
        }

        //Output decoder for multicall
        const methodAbi = contract.abi.find(m => m.name === f.method)!;
        const methodAbiOutput = methodAbi.outputs;

        return { tx, ethCall, putEthCallTask, methodAbiOutput };
    });

    //All update eth call
    yield all(preCallTasks.map(x => x.putEthCallTask));
    //All update contract
    yield all(contracts.map(c => put(ContractActions.create(c))));

    //If not Multicall, or from/defaultBlock specified
    const regularCallTasks = preCallTasks.filter(
        t => !multicallContract || t.ethCall.from != ZERO_ADDRESS || t.ethCall.defaultBlock != 'latest',
    );
    //Batch at smart-contract level with Multicall
    const multiCallTasks = preCallTasks.filter(
        t => !(!multicallContract || t.ethCall.from != ZERO_ADDRESS || t.ethCall.defaultBlock != 'latest'),
    );

    const regularCalls = regularCallTasks.map(t => {
        //@ts-ignore
        const batchFetchTask = new Promise((resolve, reject) => {
            batch.add(
                t.tx.call.request({ from: t.ethCall.from }, (error: any, result: any) => {
                    if (error) reject(error);
                    resolve(result);
                }),
            );
        });

        return batchFetchTask;
    });

    //See https://github.com/makerdao/multicall/blob/master/src/Multicall.sol
    const multicallCallsInput = multiCallTasks.map(t => {
        return { target: t.ethCall.to, callData: t.ethCall.data };
    });
    if (!!multicallContract && multicallCallsInput.length > 0) {
        const tx = multicallContract.methods.aggregate(multicallCallsInput);
        const batchFetchTask = new Promise((resolve, reject) => {
            batch.add(
                tx.call.request({ from: ZERO_ADDRESS }, (error: any, result: any) => {
                    if (error) reject(error);
                    resolve(result);
                }),
            );
        });
        regularCalls.push(batchFetchTask);
    }

    //All return call result
    const batchCallTasks = all(regularCalls);
    batch.execute();

    const batchResults: any[] = yield batchCallTasks;
    //Track call task
    let callTaskIdx = 0;
    const updateEthCallTasks = all(
        batchResults.map(returnValue => {
            if (callTaskIdx < regularCallTasks.length) {
                const ethCall = preCallTasks[callTaskIdx].ethCall;
                callTaskIdx += 1;
                return put(EthCallActions.create({ ...ethCall, returnValue }));
            } else {
                const [, returnData]: [any, string[]] = returnValue;
                const putActions = returnData.map(data => {
                    const task = preCallTasks[callTaskIdx];
                    const ethCall = task.ethCall;
                    //TODO: Format based on __length__
                    const multicallReturnValue = task.methodAbiOutput
                        ? web3.eth.abi.decodeParameters(task.methodAbiOutput, data)
                        : undefined;
                    if (!multicallReturnValue || multicallReturnValue.__length__ == 0) return Promise.resolve(); //No value

                    let formatedValue: any;
                    if (multicallReturnValue.__length__ == 1) {
                        formatedValue = multicallReturnValue['0'];
                    } else if (multicallReturnValue.__length__ > 1) {
                        formatedValue = [];
                        for (let i = 0; i < multicallReturnValue.__length__; i++) {
                            formatedValue.push(multicallReturnValue[i]);
                        }
                    }
                    callTaskIdx += 1;
                    return put(EthCallActions.create({ ...ethCall, returnValue: formatedValue }));
                });

                return all(putActions);
            }
        }),
    );

    yield updateEthCallTasks;
}

const CONTRACT_SEND_HASH = `${ContractActions.SEND}/HASH`;
const CONTRACT_SEND_RECEIPT = `${ContractActions.SEND}/RECEIPT`;
const CONTRACT_SEND_CONFIRMATION = `${ContractActions.SEND}/CONFIRMATION`;
const CONTRACT_SEND_ERROR = `${ContractActions.SEND}/ERROR`;
const CONTRACT_SEND_DONE = `${ContractActions.SEND}/DONE`;
interface ContractSendChannelMessage {
    type:
        | typeof CONTRACT_SEND_HASH
        | typeof CONTRACT_SEND_RECEIPT
        | typeof CONTRACT_SEND_CONFIRMATION
        | typeof CONTRACT_SEND_ERROR;
    error?: any;
    hash?: string;
    receipt?: TransactionReceipt;
    confirmations?: number;
}

function contractSendChannel(tx: PromiEvent<TransactionReceipt>): EventChannel<ContractSendChannelMessage> {
    return eventChannel(emitter => {
        tx.on('transactionHash', (hash: string) => {
            emitter({ type: CONTRACT_SEND_HASH, hash });
        })
            .on('receipt', (receipt: TransactionReceipt) => {
                emitter({ type: CONTRACT_SEND_RECEIPT, receipt });
            })
            .on('confirmation', (confirmations: number) => {
                emitter({ type: CONTRACT_SEND_CONFIRMATION, confirmations });
                if (confirmations == 24) emitter(END);
            })
            .on('error', (error: any) => {
                emitter({
                    type: CONTRACT_SEND_ERROR,
                    error,
                });
                emitter(END);
            });
        // The subscriber must return an unsubscribe function
        return () => {}; //eslint-disable-line @typescript-eslint/no-empty-function
    });
}

function* contractSend(action: ContractActions.SendAction) {
    const { payload } = action;
    const networkId = payload.networkId;
    const id = contractId(payload);
    const contract: Contract = yield select(ContractSelector.selectSingle, id);
    const web3Contract = contract.web3SenderContract!;

    const from = payload.from;
    const gasPrice = payload.gasPrice ?? 0;

    let tx: any;
    if (!payload.args || payload.args.length == 0) {
        tx = web3Contract.methods[payload.method]();
    } else {
        tx = web3Contract.methods[payload.method](...payload.args);
    }
    const gas = payload.gas ?? (yield call(tx.estimateGas, { from }));
    const txPromiEvent: PromiEvent<TransactionReceipt> = tx.send({ from, gas, gasPrice });

    const channel: TakeableChannel<ContractSendChannelMessage> = yield call(contractSendChannel, txPromiEvent);
    try {
        let savedHash: string | undefined;
        while (true) {
            const message: ContractSendChannelMessage = yield take(channel);
            const { type, hash, receipt, confirmations } = message;
            if (hash) savedHash = hash;

            if (type === CONTRACT_SEND_HASH) {
                yield put(TransactionActions.create({ networkId, hash: hash! }));
            } else if (type === CONTRACT_SEND_RECEIPT) {
                yield put(
                    TransactionActions.create({
                        networkId,
                        hash: savedHash!,
                        receipt: receipt,
                        blockNumber: receipt?.blockNumber,
                        blockHash: receipt?.blockHash,
                        from: receipt!.from,
                        to: receipt!.to,
                    }),
                );
            } else if (type === CONTRACT_SEND_CONFIRMATION) {
                yield put(
                    TransactionActions.create({
                        networkId,
                        hash: savedHash!,
                        confirmations: confirmations,
                    }),
                );
            } else if (type === CONTRACT_SEND_ERROR) {
                throw new Error(JSON.stringify(message));
            }
        }
    } catch (error) {
        throw error;
    } finally {
        yield put({ type: CONTRACT_SEND_DONE });
    }
}

const SUBSCRIBE_DATA = `${ContractActions.EVENT_SUBSCRIBE}/DATA`;
const SUBSCRIBE_ERROR = `${ContractActions.EVENT_SUBSCRIBE}/ERROR`;
const SUBSCRIBE_CHANGED = `${ContractActions.EVENT_SUBSCRIBE}/CHANGED`;
const SUBSCRIBE_DONE = `${ContractActions.EVENT_SUBSCRIBE}/DONE`;
interface EventSubscribeChannelMessage {
    type: typeof SUBSCRIBE_DATA | typeof SUBSCRIBE_ERROR | typeof SUBSCRIBE_CHANGED;
    error?: any;
    event?: EventData;
}

function eventSubscribeChannel(subscription: Subscription<EventData>): EventChannel<EventSubscribeChannelMessage> {
    return eventChannel(emitter => {
        subscription
            .on('data', (event: EventData) => {
                emitter({ type: SUBSCRIBE_DATA, event });
            })
            .on('error', (error: any) => {
                emitter({ type: SUBSCRIBE_ERROR, error });
                emitter(END);
            })
            .on('changed', (event: EventData) => {
                emitter({ type: SUBSCRIBE_CHANGED, event });
            });
        // The subscriber must return an unsubscribe function
        return () => {
            subscription.unsubscribe();
        };
    });
}

function* eventSubscribe(action: ContractActions.EventSubscribeAction) {
    const { payload } = action;
    const network: Network = yield select(NetworkSelector.selectSingle, payload.networkId);
    if (!network)
        throw new Error(
            `Could not find Network with id ${payload.networkId}. Make sure to dispatch a Network/CREATE action.`,
        );
    const id = contractId(payload);
    const contract: Contract = yield select(ContractSelector.selectSingle, id);
    const web3Contract = contract.web3Contract!;
    const eventName = payload.eventName;
    const filter = payload.filter ?? {};
    const fromBlock = payload.fromBlock ?? 'latest';
    const subscription = web3Contract.events[eventName]({ fromBlock, filter });
    const channel: TakeableChannel<EventSubscribeChannelMessage> = yield call(eventSubscribeChannel, subscription);

    try {
        while (true) {
            const message: EventSubscribeChannelMessage = yield take(channel);
            const { type, event, error } = message;
            const id = eventId(event!);
            if (type === SUBSCRIBE_DATA) {
                contract.events![eventName][id] = event!;
                yield put(ContractActions.create(contract));
            } else if (type === SUBSCRIBE_ERROR) {
                yield put({ type: SUBSCRIBE_ERROR, error });
            } else if (type === SUBSCRIBE_CHANGED) {
                delete contract.events![eventName][id];
                yield put(ContractActions.create(contract));
            }
        }
    } catch (error) {
        yield put({ type: SUBSCRIBE_ERROR, error });
    } finally {
        yield put({ type: SUBSCRIBE_DONE });
    }
}

function* eventSubscribeLoop() {
    const subscribed: { [key: string]: boolean } = {};
    const tasks: { [key: string]: any } = {};

    function* eventSubscribeLoopStart() {
        while (true) {
            const subscribePattern = (action: { type: string }) => {
                if (!ContractActions.isEventSubscribeAction(action)) return false;
                const eventId = `${action.payload.networkId}-${action.payload.address}-${action.payload.eventName}`;
                if (subscribed[eventId]) return false;
                subscribed[eventId] = true;
                return true;
            };
            const action: ContractActions.EventSubscribeAction = yield take(subscribePattern);
            tasks[action.payload.networkId] = yield fork(eventSubscribe, action);
        }
    }

    function* eventSubscribeLoopEnd() {
        while (true) {
            const unsubscribePattern = (action: { type: string }) => {
                if (!ContractActions.isEventUnsubscribeAction(action)) return false;
                const eventId = `${action.payload.networkId}-${action.payload.address}-${action.payload.eventName}`;

                if (!subscribed[eventId]) return false;
                subscribed[eventId] = false;
                return true;
            };
            const action: ContractActions.EventUnsubscribeAction = yield take(unsubscribePattern);
            const eventId = `${action.payload.networkId}-${action.payload.address}-${action.payload.eventName}`;
            yield cancel(tasks[eventId]);
        }
    }

    yield all([eventSubscribeLoopStart(), eventSubscribeLoopEnd()]);
}

export function* saga() {
    yield all([
        takeEvery(ContractActions.CALL, contractCall),
        takeEvery(ContractActions.CALL_BATCHED, contractCallBatched),
        takeEvery(ContractActions.CALL_SYNCED, contractCallSynced),
        takeEvery(ContractActions.SEND, contractSend),
        eventSubscribeLoop(),
    ]);
}
