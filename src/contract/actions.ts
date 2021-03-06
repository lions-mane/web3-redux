import { actionCreator } from '../utils';
import {
    ContractCallSync,
    ContractId,
    CALL_BLOCK_SYNC,
    CALL_TRANSACTION_SYNC,
    ContractPartial,
    ContractIdDeconstructed,
} from './model';

const name = 'Contract';

export const CREATE = `${name}/CREATE`;
export const UPDATE = `${name}/UPDATE`;
export const REMOVE = `${name}/DELETE`;

export const CALL = `${name}/CALL`;
export const CALL_BATCHED = `${name}/CALL_BATCHED`;
export const CALL_SYNCED = `${name}/CALL_SYNCED`;
export const SEND = `${name}/SEND`;

export const EVENT_SUBSCRIBE = `${name}/EVENT_SUBSCRIBE`;
export const EVENT_UNSUBSCRIBE = `${name}/EVENT_UNSUBSCRIBE`;

export const create = actionCreator<typeof CREATE, ContractPartial>(CREATE);
export const remove = actionCreator<typeof REMOVE, ContractId>(REMOVE);

export interface CallActionInput extends ContractIdDeconstructed {
    method: string;
    args?: any[];
    from?: string;
    defaultBlock?: number | string;
    gas?: string;
}
export const call = actionCreator<typeof CALL, CallActionInput>(CALL);

export interface CallBatchedActionInput {
    networkId: string;
    requests: {
        address: string;
        method: string;
        args?: any[];
        from?: string;
        defaultBlock?: number | string;
        gas?: string;
    }[];
}
/**
 * Optimally batched call requests.
 * Requests are grouped by network and batched with web3.BatchRequest().
 * @see {@link https://web3js.readthedocs.io/en/v1.2.0/web3-eth.html#batchrequest}
 *
 * Calls will be batched busing Multicall if:
 *  - network has a Multicall contract
 *  - from == undefined
 *  - defaultBlock == 'latest' || defaultBlock == undefined
 * @see {@link https://github.com/makerdao/multicall}
 */
export const callBatched = actionCreator<typeof CALL_BATCHED, CallBatchedActionInput>(CALL_BATCHED);

export interface CallSyncedActionInput extends CallActionInput {
    sync?: ContractCallSync | boolean | typeof CALL_BLOCK_SYNC | typeof CALL_TRANSACTION_SYNC;
}
export const callSynced = actionCreator<typeof CALL_SYNCED, CallSyncedActionInput>(CALL_SYNCED);

export interface SendActionInput extends ContractIdDeconstructed {
    method: string;
    args?: any[];
    from: string;
    gasPrice?: string;
    gas?: string;
    value?: string;
}
export const send = actionCreator<typeof SEND, SendActionInput>(SEND);

export interface EventSubscribeActionInput extends ContractIdDeconstructed {
    eventName: string;
    filter?: { [key: string]: any };
    fromBlock?: number | string;
}
export const eventSubscribe = actionCreator<typeof EVENT_SUBSCRIBE, EventSubscribeActionInput>(EVENT_SUBSCRIBE);

export interface EventUnsubscribeActionInput extends ContractIdDeconstructed {
    eventName: string;
}
export const eventUnsubscribe = actionCreator<typeof EVENT_UNSUBSCRIBE, EventUnsubscribeActionInput>(EVENT_UNSUBSCRIBE);

export type CreateAction = ReturnType<typeof create>;
export function isCreateAction(action: { type: string }): action is CreateAction {
    return action.type === CREATE;
}

export type RemoveAction = ReturnType<typeof remove>;
export function isRemoveAction(action: { type: string }): action is RemoveAction {
    return action.type === REMOVE;
}

export type CallAction = ReturnType<typeof call>;
export function isCallAction(action: { type: string }): action is CallAction {
    return action.type === CALL;
}

export type CallBatchedAction = ReturnType<typeof callBatched>;
export function isCallBatchedAction(action: { type: string }): action is CallBatchedAction {
    return action.type === CALL_BATCHED;
}

export type CallSyncedAction = ReturnType<typeof callSynced>;
export function isCallSyncedAction(action: { type: string }): action is CallSyncedAction {
    return action.type === CALL_SYNCED;
}

export type SendAction = ReturnType<typeof send>;
export function isSendAction(action: { type: string }): action is SendAction {
    return action.type === SEND;
}

export type EventSubscribeAction = ReturnType<typeof eventSubscribe>;
export function isEventSubscribeAction(action: { type: string }): action is EventSubscribeAction {
    return action.type === EVENT_SUBSCRIBE;
}

export type EventUnsubscribeAction = ReturnType<typeof eventUnsubscribe>;
export function isEventUnsubscribeAction(action: { type: string }): action is EventUnsubscribeAction {
    return action.type === EVENT_UNSUBSCRIBE;
}

export type ReducerAction = CreateAction | RemoveAction;
export function isReducerAction(action: { type: string }): action is ReducerAction {
    return isCreateAction(action) || isRemoveAction(action);
}

export type SagaAction = CallAction | CallBatchedAction | CallSyncedAction | SendAction;
export function isSagaAction(action: { type: string }): action is SagaAction {
    return isCallAction(action) || isCallBatchedAction(action) || isCallSyncedAction(action) || isSendAction(action);
}

export type Action = ReducerAction | SagaAction;
export function isAction(action: { type: string }): action is Action {
    return isReducerAction(action) || isSagaAction(action);
}
