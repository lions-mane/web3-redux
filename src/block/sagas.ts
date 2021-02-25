import { put, call, takeEvery, take, all, cancel, fork, select } from 'redux-saga/effects';
import { END, eventChannel, EventChannel, TakeableChannel } from 'redux-saga';
import Web3 from 'web3';

import { Block, BlockHeader, BlockTransaction, isBlockTransactionObject, isBlockTransactionString } from './model';
import { Network } from '../network/model';
import { isContractCallBlockSync, Contract } from '../contract/model';
import { transactionId } from '../transaction/model';

import * as BlockActions from './actions';
import * as ContractActions from '../contract/actions';
import * as TransactionActions from '../transaction/actions';

import * as NetworkSelector from '../network/selector';
import * as ContractSelector from '../contract/selector';

export function* fetch(action: BlockActions.FetchAction) {
    const { payload } = action;
    const network: Network = yield select(NetworkSelector.selectSingle, payload.networkId);
    if (!network)
        throw new Error(
            `Could not find Network with id ${payload.networkId}. Make sure to dispatch a Network/CREATE action.`,
        );
    const web3 = network.web3;
    const block: BlockTransaction = yield call(
        web3.eth.getBlock,
        payload.blockHashOrBlockNumber,
        payload.returnTransactionObjects ?? true,
    );
    yield put(BlockActions.create({ ...block, networkId: payload.networkId }));
}

function* fetchLoop() {
    const cache: { [key: string]: boolean } = {};

    const actionPattern = (action: { type: string }) => {
        if (!BlockActions.isFetchAction(action)) return false;
        if (action.payload.blockHashOrBlockNumber === 'latest') return true;
        if (action.payload.blockHashOrBlockNumber === 'pending') return true;
        if (action.payload.blockHashOrBlockNumber === 'earliest') return true;

        const actionId = `${action.payload.networkId}-${action.payload.blockHashOrBlockNumber}`;
        if (cache[actionId]) return false;
        cache[actionId] = true;
        return true;
    };

    yield takeEvery(actionPattern, fetch);
}

const SUBSCRIBE_CONNECTED = `${BlockActions.SUBSCRIBE}/CONNECTED`;
const SUBSCRIBE_DATA = `${BlockActions.SUBSCRIBE}/DATA`;
const SUBSCRIBE_ERROR = `${BlockActions.SUBSCRIBE}/ERROR`;
const SUBSCRIBE_CHANGED = `${BlockActions.SUBSCRIBE}/CHANGED`;
const SUBSCRIBE_DONE = `${BlockActions.SUBSCRIBE}/DONE`;
interface ChannelMessage {
    type: typeof SUBSCRIBE_CONNECTED | typeof SUBSCRIBE_DATA | typeof SUBSCRIBE_ERROR | typeof SUBSCRIBE_CHANGED;
    error?: any;
    block?: BlockHeader;
}
function subscribeChannel(web3: Web3): EventChannel<ChannelMessage> {
    const subscription = web3.eth.subscribe('newBlockHeaders');

    return eventChannel(emitter => {
        subscription
            .on('data', (block: any) => {
                emitter({ type: SUBSCRIBE_DATA, block });
            })
            .on('connected', () => {
                emitter({ type: SUBSCRIBE_CONNECTED });
            })
            .on('error', (error: any) => {
                emitter({ type: SUBSCRIBE_ERROR, error });
                emitter(END);
            })
            .on('changed', (block: any) => {
                emitter({ type: SUBSCRIBE_CHANGED, block });
            });
        // The subscriber must return an unsubscribe function
        return () => {
            subscription.unsubscribe();
        };
    });
}

function* subscribe(action: BlockActions.SubscribeAction) {
    const networkId = action.payload.networkId;
    const network: Network = yield select(NetworkSelector.selectSingle, networkId);

    if (!network)
        throw new Error(`Could not find Network with id ${networkId}. Make sure to dispatch a Network/CREATE action.`);
    const web3 = network.web3;

    while (true) {
        const channel: TakeableChannel<ChannelMessage> = yield call(subscribeChannel, web3);

        try {
            while (true) {
                const message: ChannelMessage = yield take(channel);
                const { type, block, error } = message;
                if (type === SUBSCRIBE_DATA) {
                    const newBlock = { ...block!, networkId };
                    yield put(BlockActions.create(newBlock));
                    if (action.payload.returnTransactionObjects ?? true) {
                        yield fork(
                            fetch,
                            BlockActions.fetch({
                                networkId,
                                blockHashOrBlockNumber: newBlock.number,
                                returnTransactionObjects: true,
                            }),
                        );
                    }
                } else if (type === SUBSCRIBE_ERROR) {
                    yield put({ type: SUBSCRIBE_ERROR, error });
                } else if (type === SUBSCRIBE_CHANGED) {
                    const newBlock = { ...block!, networkId };
                    yield put(BlockActions.create(newBlock));
                    if (action.payload.returnTransactionObjects) {
                        yield fork(
                            fetch,
                            BlockActions.fetch({
                                networkId,
                                blockHashOrBlockNumber: newBlock.number,
                                returnTransactionObjects: true,
                            }),
                        );
                    }
                }
            }
        } catch (error) {
            yield put({ type: SUBSCRIBE_ERROR, error });
        } finally {
            yield put({ type: SUBSCRIBE_DONE });
        }
    }
}

function* subscribeLoop() {
    const subscribed: { [key: string]: boolean } = {};
    const tasks: { [key: string]: any } = {};

    function* subscribeLoopStart() {
        while (true) {
            const subscribePattern = (action: { type: string }) => {
                if (!BlockActions.isSubscribeAction(action)) return false;
                if (subscribed[action.payload.networkId]) return false;
                subscribed[action.payload.networkId] = true;
                return true;
            };
            const action: BlockActions.SubscribeAction = yield take(subscribePattern);
            tasks[action.payload.networkId] = yield fork(subscribe, action);
        }
    }

    function* subscribeLoopEnd() {
        while (true) {
            const unsubscribePattern = (action: { type: string }) => {
                if (!BlockActions.isUnsubscribeAction(action)) return false;
                if (!subscribed[action.payload.networkId]) return false;
                subscribed[action.payload.networkId] = false;
                return true;
            };
            const action: BlockActions.UnsubscribeAction = yield take(unsubscribePattern);
            yield cancel(tasks[action.payload.networkId]);
        }
    }

    yield all([subscribeLoopStart(), subscribeLoopEnd()]);
}

function* createBlockTransactions(block: Block) {
    if (isBlockTransactionString(block)) {
        const transactions = block.transactions;
        const actions = transactions.map((hash: string) => {
            return put(
                TransactionActions.create({
                    hash,
                    networkId: block.networkId,
                    blockNumber: block.number,
                    blockId: block.id!,
                    id: transactionId({ hash, networkId: block.networkId }),
                }),
            );
        });
        yield all(actions);
    } else if (isBlockTransactionObject(block)) {
        const transactions = block.transactions;
        const actions = transactions.map(tx => {
            return put(
                TransactionActions.create({
                    ...tx,
                    networkId: block.networkId,
                    blockId: block.id!,
                    id: transactionId({ hash: tx.hash, networkId: block.networkId }),
                }),
            );
        });
        yield all(actions);
    }
}

function* contractCallBlockSync(block: Block) {
    const contracts: Contract[] = yield select(ContractSelector.select);
    const putContractCall: any[] = [];
    contracts
        .filter(contract => contract.networkId === block.networkId)
        .map(contract => {
            Object.entries(contract.methods ?? {}).map(([methodName, method]) => {
                Object.values(method).map(contractCall => {
                    if (
                        !!contractCall.sync &&
                        isContractCallBlockSync(contractCall.sync) &&
                        contractCall.sync.filter(block)
                    ) {
                        putContractCall.push(
                            put(
                                ContractActions.call({
                                    address: contract.address,
                                    networkId: contract.networkId,
                                    method: methodName,
                                    ...contractCall,
                                }),
                            ),
                        );
                    }
                });
            });
        });

    yield all(putContractCall);
}

function* onCreate(action: BlockActions.CreateAction) {
    yield all([createBlockTransactions(action.payload), contractCallBlockSync(action.payload)]);
}

export function* saga() {
    yield all([fetchLoop(), subscribeLoop(), takeEvery(BlockActions.CREATE, onCreate)]);
}
