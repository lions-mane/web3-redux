import { put, call, takeEvery, take, all, cancel, fork, select } from 'redux-saga/effects';
import { END, eventChannel, EventChannel, TakeableChannel } from 'redux-saga';
import Web3 from 'web3';

import { Block, BlockHeader, BlockTransaction } from './model';
import { Network } from '../network/model';
import { isContractCallBlockSync, Contract } from '../contract/model';

import * as BlockActions from './actions';
import * as ContractActions from '../contract/actions';

import * as NetworkSelector from '../network/selector';
import * as ContractSelector from '../contract/selector';

export function* fetch(action: BlockActions.FetchAction) {
    const { payload } = action;
    //@ts-ignore
    const network: Network = yield select(NetworkSelector.select, payload.networkId);
    if (!network)
        throw new Error(
            `Could not find Network with id ${payload.networkId}. Make sure to dispatch a Network/CREATE action.`,
        );
    const web3 = network.web3;
    const block: BlockTransaction = yield call(
        web3.eth.getBlock,
        payload.blockHashOrBlockNumber,
        payload.returnTransactionObjects ?? false,
    );
    yield put(BlockActions.create({ ...block, networkId: payload.networkId }));
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

function* handleBlockUpdate(block: Block) {
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

function* subscribe(action: BlockActions.SubscribeAction) {
    const networkId = action.payload.networkId;
    //@ts-ignore
    const network: Network = yield select(NetworkSelector.select, networkId);

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
                    //@ts-ignore
                    yield fork(handleBlockUpdate, newBlock);
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
                } else if (type === SUBSCRIBE_ERROR) {
                    yield put({ type: SUBSCRIBE_ERROR, error });
                } else if (type === SUBSCRIBE_CHANGED) {
                    const newBlock = { ...block!, networkId };
                    yield put(BlockActions.update(newBlock));
                    //@ts-ignore
                    yield fork(handleBlockUpdate, newBlock);
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

export function* saga() {
    yield all([takeEvery(BlockActions.FETCH, fetch), subscribeLoop()]);
}
