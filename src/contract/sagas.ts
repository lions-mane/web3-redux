import { put, call, select, takeEvery, take, cancel, all, fork } from 'redux-saga/effects';
import { Contract as Web3Contract } from 'web3-eth-contract';
import { web3ForNetworkId } from '../utils';
import {
    Contract,
    Model,
    CALL_BLOCK_SYNC,
    ContractCallSync,
    ContractCallBlockSync,
    ContractCallTransactionSync,
    CALL_TRANSACTION_SYNC,
} from './model';
import {
    CALL,
    CallAction,
    EventSubscribeAction,
    EventUnsubscribeAction,
    EVENT_SUBSCRIBE,
    isEventSubscribeAction,
    isEventUnsubscribeAction,
    update,
} from './actions';
import * as ContractSelector from './selector';
import { Transaction } from '../transaction/model';
import { END, eventChannel, EventChannel, TakeableChannel } from 'redux-saga';

function argsHash({ from, defaultBlock, args }: { from: string; defaultBlock: string | number; args?: any[] }) {
    if (!args || args.length == 0) {
        return `().call(${defaultBlock},${JSON.stringify({ from })})`;
    } else {
        return `(${args}).call(${defaultBlock},${JSON.stringify({ from })})`;
    }
}

export function* contractCall(action: CallAction) {
    const { payload } = action;
    const web3 = web3ForNetworkId(payload.networkId);
    const id = Model.toId(payload);
    //@ts-ignore
    const contract: Contract = yield select(ContractSelector.select, id);
    const web3Contract = new web3.eth.Contract(contract.abi, contract.address);
    const defaultBlock = payload.defaultBlock ?? 'latest';
    //No sync if block isn't set to "latest"
    let sync: ContractCallSync | undefined;
    if (defaultBlock === 'latest') {
        if (payload.sync != false) {
            const defaultBlockSync: ContractCallBlockSync = {
                type: CALL_BLOCK_SYNC,
                filter: () => true,
            };
            const defaultTransactionSync: ContractCallTransactionSync = {
                type: CALL_TRANSACTION_SYNC,
                filter: (transaction: Transaction) => transaction.to === contract.address,
            };

            if (payload.sync === undefined || payload.sync === true || payload.sync === CALL_TRANSACTION_SYNC) {
                sync = defaultTransactionSync;
            } else if (payload.sync === CALL_BLOCK_SYNC) {
                sync = defaultBlockSync;
            } else {
                sync = payload.sync as ContractCallSync;
            }
        }
    }

    const from: string = payload.options?.from ?? web3.eth.defaultAccount!;
    const gasPrice = payload.options?.gasPrice ?? 0;

    if (!payload.args || payload.args.length == 0) {
        const tx = web3Contract.methods[payload.method]();
        //@ts-ignore
        const gas = payload.options?.gas ?? (yield call(tx.estimateGas, { from }));
        const key = argsHash({ from, defaultBlock });
        //@ts-ignore
        const value = yield call(tx.call, { from, gas, gasPrice }, defaultBlock);
        contract.methods![payload.method][key] = { value, sync, defaultBlock };
    } else {
        const tx = web3Contract.methods[payload.method](payload.args);
        const key = argsHash({ from, defaultBlock, args: payload.args });
        //@ts-ignore
        const value = yield call(tx.call, { from, gas, gasPrice }, defaultBlock);
        contract.methods![payload.method][key] = { value, defaultBlock, sync, args: payload.args };
    }

    yield put(update({ ...contract }));
}

const SUBSCRIBE_CONNECTED = `${EVENT_SUBSCRIBE}/CONNECTED`;
const SUBSCRIBE_DATA = `${EVENT_SUBSCRIBE}/DATA`;
const SUBSCRIBE_ERROR = `${EVENT_SUBSCRIBE}/ERROR`;
const SUBSCRIBE_CHANGED = `${EVENT_SUBSCRIBE}/CHANGED`;
const SUBSCRIBE_DONE = `${EVENT_SUBSCRIBE}/DONE`;
interface ChannelMessage {
    type: typeof SUBSCRIBE_CONNECTED | typeof SUBSCRIBE_DATA | typeof SUBSCRIBE_ERROR | typeof SUBSCRIBE_CHANGED;
    error?: any;
    event?: any;
}

function eventSubscribeChannel({
    eventName,
    fromBlock,
    filter,
    web3Contract,
}: {
    eventName: string;
    fromBlock: number | string;
    filter: { [key: string]: any };
    web3Contract: Web3Contract;
}): EventChannel<ChannelMessage> {
    const subscription = web3Contract.events[eventName]({ fromBlock, filter });

    return eventChannel(emitter => {
        subscription
            .on('data', (event: any) => {
                emitter({ type: SUBSCRIBE_DATA, event });
            })
            .on('connected', () => {
                emitter({ type: SUBSCRIBE_CONNECTED });
            })
            .on('error', (error: any) => {
                emitter({ type: SUBSCRIBE_ERROR, error });
                emitter(END);
            })
            .on('changed', (event: any) => {
                emitter({ type: SUBSCRIBE_CHANGED, event });
            });
        // The subscriber must return an unsubscribe function
        return () => {
            subscription.unsubscribe();
        };
    });
}

export function* eventSubscribe(action: EventSubscribeAction) {
    const { payload } = action;
    const web3 = web3ForNetworkId(payload.networkId);
    const id = Model.toId(payload);
    //@ts-ignore
    const contract: Contract = yield select(ContractSelector.select, id);
    const web3Contract = new web3.eth.Contract(contract.abi, contract.address);
    const eventName = payload.eventName;
    const filter = payload.filter ?? {};
    const fromBlock = payload.fromBlock ?? 'latest';

    while (true) {
        const channel: TakeableChannel<ChannelMessage> = yield call(eventSubscribeChannel, {
            eventName,
            filter,
            fromBlock,
            web3Contract,
        });

        try {
            while (true) {
                const message: ChannelMessage = yield take(channel);
                const { type, event, error } = message;
                if (type === SUBSCRIBE_DATA) {
                    contract.events![eventName][event.id] = event;
                    yield put(update(contract));
                    //@ts-ignore
                    yield fork(handleBlockUpdate, newBlock);
                } else if (type === SUBSCRIBE_ERROR) {
                    yield put({ type: SUBSCRIBE_ERROR, error });
                } else if (type === SUBSCRIBE_CHANGED) {
                    delete contract.events![eventName][event.id];
                    yield put(update(contract));
                }
            }
        } catch (error) {
            yield put({ type: SUBSCRIBE_ERROR, error });
        } finally {
            yield put({ type: SUBSCRIBE_DONE });
        }
    }
}

function* eventSubscribeLoop() {
    const subscribed: { [key: string]: boolean } = {};
    const tasks: { [key: string]: any } = {};

    function* eventSubscribeLoopStart() {
        while (true) {
            const subscribePattern = (action: { type: string }) => {
                if (!isEventSubscribeAction(action)) return false;
                const eventId = `${action.payload.networkId}-${action.payload.address}-${action.payload.eventName}`;
                if (subscribed[eventId]) return false;
                subscribed[eventId] = true;
                return true;
            };
            const action: EventSubscribeAction = yield take(subscribePattern);
            tasks[action.payload.networkId] = yield fork(eventSubscribe, action);
        }
    }

    function* eventSubscribeLoopEnd() {
        while (true) {
            const unsubscribePattern = (action: { type: string }) => {
                if (!isEventUnsubscribeAction(action)) return false;
                const eventId = `${action.payload.networkId}-${action.payload.address}-${action.payload.eventName}`;

                if (!subscribed[eventId]) return false;
                subscribed[eventId] = false;
                return true;
            };
            const action: EventUnsubscribeAction = yield take(unsubscribePattern);
            const eventId = `${action.payload.networkId}-${action.payload.address}-${action.payload.eventName}`;
            yield cancel(tasks[eventId]);
        }
    }

    yield all([eventSubscribeLoopStart(), eventSubscribeLoopEnd()]);
}

export function* saga() {
    yield all([takeEvery(CALL, contractCall), eventSubscribeLoop()]);
}
