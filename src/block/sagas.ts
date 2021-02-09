import { put, call, takeEvery, take, all, cancel, fork } from 'redux-saga/effects';
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
import { BlockHeader, BlockTransaction } from './model';
import { END, eventChannel, EventChannel, TakeableChannel } from 'redux-saga';

export function* fetch(action: FetchAction) {
    const web3 = web3ForNetworkId(action.payload.networkId);
    const { payload } = action;
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

export function* subscribe(action: SubscribeAction) {
    while (true) {
        const channel: TakeableChannel<ChannelMessage> = yield call(subscribeChannel, action.payload.networkId);

        try {
            while (true) {
                const message: ChannelMessage = yield take(channel);
                const { type, block, error } = message;
                if (type === SUBSCRIBE_DATA) {
                    yield put(create({ ...block!, networkId: action.payload.networkId }));
                } else if (type === SUBSCRIBE_ERROR) {
                    yield put({ type: SUBSCRIBE_ERROR, error });
                } else if (type === SUBSCRIBE_CHANGED) {
                    yield put(update({ ...block!, networkId: action.payload.networkId }));
                }
            }
        } catch (error) {
            yield put({ type: SUBSCRIBE_ERROR, error });
        } finally {
            yield put({ type: SUBSCRIBE_DONE });
        }
    }
}

export function* subscribeLoop() {
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
