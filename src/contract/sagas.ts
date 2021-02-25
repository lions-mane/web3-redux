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
    callArgsHash,
    contractId,
} from './model';
import { Network } from '../network/model';

import * as ContractActions from './actions';
import * as TransactionActions from '../transaction/actions';

import * as ContractSelector from './selector';
import * as NetworkSelector from '../network/selector';
import { ZERO_ADDRESS } from '../utils';

export function* contractCall(action: ContractActions.CallAction) {
    const { payload } = action;
    const network: Network = yield select(NetworkSelector.selectSingle, payload.networkId);
    if (!network)
        throw new Error(
            `Could not find Network with id ${payload.networkId}. Make sure to dispatch a Network/CREATE action.`,
        );
    const id = contractId(payload);
    const web3 = network.web3;
    const contract: Contract = yield select(ContractSelector.selectSingle, id);
    const web3Contract = contract.web3Contract!;
    const defaultBlock = payload.defaultBlock ?? 'latest';
    const from: string = payload.options?.from ?? web3.eth.defaultAccount ?? ZERO_ADDRESS;
    const gasPrice = payload.options?.gasPrice ?? 0;

    //No sync if block isn't set to "latest"
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

    if (!payload.args || payload.args.length == 0) {
        const tx = web3Contract.methods[payload.method]();
        const gas = payload.options?.gas ?? (yield call(tx.estimateGas, { from }));
        const key = callArgsHash({ from, defaultBlock });
        const value = yield call(tx.call, { from, gas, gasPrice }, defaultBlock);
        contract.methods![payload.method][key] = { value, sync, defaultBlock };
    } else {
        const tx = web3Contract.methods[payload.method](payload.args);
        const gas = payload.options?.gas ?? (yield call(tx.estimateGas, { from }));
        const key = callArgsHash({ from, defaultBlock, args: payload.args });
        const value = yield call(tx.call, { from, gas, gasPrice }, defaultBlock);
        contract.methods![payload.method][key] = { value, defaultBlock, sync, args: payload.args };
    }

    yield put(ContractActions.create({ ...contract }));
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
        let savedHash: string;
        let savedReceipt: TransactionReceipt;
        let savedConfirmations: number;

        tx.on('transactionHash', (hash: string) => {
            savedHash = hash;
            emitter({ type: CONTRACT_SEND_HASH, hash });
        })
            .on('receipt', (receipt: TransactionReceipt) => {
                savedReceipt = receipt;
                emitter({ type: CONTRACT_SEND_RECEIPT, hash: savedHash, receipt });
            })
            .on('confirmation', (confirmations: number) => {
                savedConfirmations = confirmations;
                emitter({ type: CONTRACT_SEND_CONFIRMATION, hash: savedHash, receipt: savedReceipt, confirmations });
                if (confirmations == 24) emitter(END);
            })
            .on('error', (error: any) => {
                emitter({
                    type: CONTRACT_SEND_ERROR,
                    hash: savedHash,
                    receipt: savedReceipt,
                    confirmations: savedConfirmations,
                    error,
                });
                emitter(END);
            });
        // The subscriber must return an unsubscribe function
        return () => {}; //eslint-disable-line @typescript-eslint/no-empty-function
    });
}

export function* contractSend(action: ContractActions.SendAction) {
    const { payload } = action;
    const networkId = payload.networkId;
    const network: Network = yield select(NetworkSelector.selectSingle, networkId);
    if (!network)
        throw new Error(`Could not find Network with id ${networkId}. Make sure to dispatch a Network/CREATE action.`);
    const id = contractId(payload);
    const web3 = network.web3;
    const contract: Contract = yield select(ContractSelector.selectSingle, id);
    const web3Contract = contract.web3Contract!;

    const from = payload.options?.from ?? web3.eth.defaultAccount;
    if (!from)
        throw new Error('contractSend: Missing from address. Make sure to set options.from or web3.eth.defaultAccount');
    const gasPrice = payload.options?.gasPrice ?? 0;

    let txPromiEvent: PromiEvent<TransactionReceipt>;
    if (!payload.args || payload.args.length == 0) {
        const tx = web3Contract.methods[payload.method]();
        const gas = payload.options?.gas ?? (yield call(tx.estimateGas, { from }));
        txPromiEvent = tx.send({ from, gas, gasPrice });
    } else {
        const tx = web3Contract.methods[payload.method](payload.args);
        const gas = payload.options?.gas ?? (yield call(tx.estimateGas, { from }));
        txPromiEvent = tx.send({ from, gas, gasPrice });
    }

    const channel: TakeableChannel<ContractSendChannelMessage> = yield call(contractSendChannel, txPromiEvent);
    try {
        while (true) {
            const message: ContractSendChannelMessage = yield take(channel);
            const { type, hash, receipt, confirmations } = message;
            if (type === CONTRACT_SEND_HASH) {
                yield put(TransactionActions.create({ networkId, hash: hash! }));
            } else if (type === CONTRACT_SEND_RECEIPT) {
                yield put(
                    TransactionActions.create({
                        networkId,
                        hash: hash!,
                        receipt: receipt!,
                        blockNumber: receipt!.blockNumber,
                        blockId: `${networkId}-${receipt!.blockNumber}`,
                        blockHash: receipt!.blockHash,
                        from: receipt!.from,
                        to: receipt!.to,
                    }),
                );
            } else if (type === CONTRACT_SEND_CONFIRMATION) {
                yield put(
                    TransactionActions.create({
                        networkId,
                        hash: hash!,
                        receipt: receipt!,
                        blockNumber: receipt!.blockNumber,
                        blockId: `${networkId}-${receipt!.blockNumber}`,
                        blockHash: receipt!.blockHash,
                        from: receipt!.from,
                        to: receipt!.to,
                        confirmations: confirmations!,
                    }),
                );
            }
        }
    } catch (error) {
        yield put({ type: CONTRACT_SEND_ERROR, error });
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

export function* eventSubscribe(action: ContractActions.EventSubscribeAction) {
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
        takeEvery(ContractActions.SEND, contractSend),
        eventSubscribeLoop(),
    ]);
}
