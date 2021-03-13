import { NetworkId } from '../network/model';
import { actionCreator } from '../utils';
import { Block, BlockId } from './model';

const name = 'Block';

export const CREATE = `${name}/CREATE`;
export const REMOVE = `${name}/DELETE`;
export const FETCH = `${name}/FETCH`;
export const SUBSCRIBE = `${name}/SUBSCRIBE`;
export const UNSUBSCRIBE = `${name}/UNSUBSCRIBE`;

export const create = actionCreator<typeof CREATE, Block>(CREATE);
export const remove = actionCreator<typeof REMOVE, BlockId>(REMOVE);

/** Block fetch action.  Uses web3.eth.getBlock(). */
export interface FetchActionInput extends NetworkId {
    /** The block number or block hash. Or the string "earliest", "latest" or "pending" */
    blockHashOrBlockNumber: string | number;
    /**
     * If specified true, the returned block will contain all transactions as objects. If false it will only contains the transaction hashes.
     * @defaultValue `true`
     */
    returnTransactionObjects?: boolean;
}
export const fetch = actionCreator<typeof FETCH, FetchActionInput>(FETCH);

/** Subscribe to new block headers. Uses web3.eth.subscribe(). */
export interface SubscribeActionInput extends NetworkId {
    /**
     * If specified true, the returned block will contain all transactions as objects. If false it will only contains the transaction hashes.
     * @defaultValue `true`
     */
    returnTransactionObjects?: boolean;
}
export const subscribe = actionCreator<typeof SUBSCRIBE, SubscribeActionInput>(SUBSCRIBE);
export const unsubscribe = actionCreator<typeof UNSUBSCRIBE, NetworkId>(UNSUBSCRIBE);

export type CreateAction = ReturnType<typeof create>;
export function isCreateAction(action: { type: string }): action is CreateAction {
    return action.type === CREATE;
}
export type RemoveAction = ReturnType<typeof remove>;
export function isRemoveAction(action: { type: string }): action is RemoveAction {
    return action.type === REMOVE;
}
export type FetchAction = ReturnType<typeof fetch>;
export function isFetchAction(action: { type: string }): action is FetchAction {
    return action.type === FETCH;
}
export type SubscribeAction = ReturnType<typeof subscribe>;
export function isSubscribeAction(action: { type: string }): action is SubscribeAction {
    return action.type === SUBSCRIBE;
}
export type UnsubscribeAction = ReturnType<typeof unsubscribe>;
export function isUnsubscribeAction(action: { type: string }): action is UnsubscribeAction {
    return action.type === UNSUBSCRIBE;
}

export type ReducerAction = CreateAction | RemoveAction;
export function isReducerAction(action: { type: string }): action is ReducerAction {
    return isCreateAction(action) || isRemoveAction(action);
}

export type SagaAction = FetchAction | SubscribeAction | UnsubscribeAction;
export function isSagaAction(action: { type: string }): action is SagaAction {
    return isFetchAction(action) || isSubscribeAction(action) || isUnsubscribeAction(action);
}

export type Action = ReducerAction | SagaAction;
export function isAction(action: { type: string }): action is Action {
    return isReducerAction(action) || isSagaAction(action);
}
