import { put, call, takeEvery, take, all, cancel, fork, select } from 'redux-saga/effects';
import { END, eventChannel, EventChannel, TakeableChannel } from 'redux-saga';

import {
    create,
    FETCH,
    FetchAction,
    SubscribeAction,
    SUBSCRIBE,
    update,
    isSubscribeAction,
    isUnsubscribeAction,
    UnsubscribeAction,
} from './actions';
import { web3ForNetworkId } from '../utils';
import { Block, BlockHeader, BlockTransaction } from './model';
import * as ContractSelector from '../contract/selector';
import * as ContractActions from '../contract/actions';
import { isContractCallBlockSync, Contract } from '../contract/model';

export function* fetch(action: FetchAction) {
    const { payload } = action;
    const web3 = web3ForNetworkId(payload.networkId);
    const block: BlockTransaction = yield call(
        web3.eth.getBlock,
        payload.blockHashOrBlockNumber,
        payload.returnTransactionObjects ?? false,
    );
    yield put(create({ ...block, networkId: payload.networkId }));
}

const SUBSCRIBE_CONNECTED = `${SUBSCRIBE}/CONNECTED`;
const SUBSCRIBE_DATA = `${SUBSCRIBE}/DATA`;
const SUBSCRIBE_ERROR = `${SUBSCRIBE}/ERROR`;
const SUBSCRIBE_CHANGED = `${SUBSCRIBE}/CHANGED`;
const SUBSCRIBE_DONE = `${SUBSCRIBE}/DONE`;
interface ChannelMessage {
    type: typeof SUBSCRIBE_CONNECTED | typeof SUBSCRIBE_DATA | typeof SUBSCRIBE_ERROR | typeof SUBSCRIBE_CHANGED;
    error?: any;
    block?: BlockHeader;
}
function subscribeChannel(networkId: string): EventChannel<ChannelMessage> {
    const web3 = web3ForNetworkId(networkId);
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

function* subscribe(action: SubscribeAction) {
    while (true) {
        const channel: TakeableChannel<ChannelMessage> = yield call(subscribeChannel, action.payload.networkId);

        try {
            while (true) {
                const message: ChannelMessage = yield take(channel);
                const { type, block, error } = message;
                if (type === SUBSCRIBE_DATA) {
                    const newBlock = { ...block!, networkId: action.payload.networkId };
                    yield put(create(newBlock));
                    //@ts-ignore
                    yield fork(handleBlockUpdate, newBlock);
                } else if (type === SUBSCRIBE_ERROR) {
                    yield put({ type: SUBSCRIBE_ERROR, error });
                } else if (type === SUBSCRIBE_CHANGED) {
                    const newBlock = { ...block!, networkId: action.payload.networkId };
                    yield put(update(newBlock));
                    //@ts-ignore
                    yield fork(handleBlockUpdate, newBlock);
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
                if (!isSubscribeAction(action)) return false;
                if (subscribed[action.payload.networkId]) return false;
                subscribed[action.payload.networkId] = true;
                return true;
            };
            const action: SubscribeAction = yield take(subscribePattern);
            tasks[action.payload.networkId] = yield fork(subscribe, action);
        }
    }

    function* subscribeLoopEnd() {
        while (true) {
            const unsubscribePattern = (action: { type: string }) => {
                if (!isUnsubscribeAction(action)) return false;
                if (!subscribed[action.payload.networkId]) return false;
                subscribed[action.payload.networkId] = false;
                return true;
            };
            const action: UnsubscribeAction = yield take(unsubscribePattern);
            yield cancel(tasks[action.payload.networkId]);
        }
    }

    yield all([subscribeLoopStart(), subscribeLoopEnd()]);
}

export function* saga() {
    yield all([takeEvery(FETCH, fetch), subscribeLoop()]);
}
