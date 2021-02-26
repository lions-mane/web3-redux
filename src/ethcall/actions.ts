import { NetworkId } from '../network/model';
import { actionCreator } from '../utils';
import { EthCall, EthCallId } from './model';

const name = 'EthCall';

export const CREATE = `${name}/CREATE`;
export const REMOVE = `${name}/DELETE`;
export const FETCH = `${name}/FETCH`;

export interface EthCallFetchInput extends NetworkId {
    from?: string; //default to web3.defaultAccount | ZERO_ADDRESS
    to: string;
    defaultBlock?: string; //default to latest
    data: string;
    gas?: string;
    gasPrice?: string;
}

export const create = actionCreator<typeof CREATE, EthCall>(CREATE);
export const remove = actionCreator<typeof REMOVE, EthCallId>(REMOVE);
export const fetch = actionCreator<typeof FETCH, EthCallFetchInput>(FETCH);

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

export type ReducerAction = CreateAction | RemoveAction;
export function isReducerAction(action: { type: string }): action is ReducerAction {
    return isCreateAction(action) || isRemoveAction(action);
}

export type SagaAction = FetchAction;
export function isSagaAction(action: { type: string }): action is SagaAction {
    return isFetchAction(action);
}

export type Action = ReducerAction | SagaAction;
export function isAction(action: { type: string }): action is Action {
    return isReducerAction(action) || isSagaAction(action);
}
