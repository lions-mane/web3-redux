import { NetworkId } from '../network/model';
import { actionCreator } from '../utils';
import { Block, BlockId, BlockTransaction } from './model';

const name = 'Block';

export const CREATE = `${name}/CREATE`;
export const UPDATE = `${name}/UPDATE`;
export const REMOVE = `${name}/DELETE`;
export const FETCH = `${name}/FETCH`;

export const create = actionCreator<typeof CREATE, Block | BlockTransaction>(CREATE);
export const update = actionCreator<typeof UPDATE, Block>(UPDATE);
export const remove = actionCreator<typeof REMOVE, BlockId>(REMOVE);

interface FetchActionInput extends NetworkId {
    blockHashOrBlockNumber: string | number;
    returnTransactionObjects?: boolean;
}
export const fetch = actionCreator<typeof FETCH, FetchActionInput>(FETCH);

export type CreateAction = ReturnType<typeof create>;
export function isCreateAction(action: { type: string }): action is CreateAction {
    return action.type === CREATE;
}
export type UpdateAction = ReturnType<typeof update>;
export function isUpdateAction(action: { type: string }): action is UpdateAction {
    return action.type === UPDATE;
}
export type RemoveAction = ReturnType<typeof remove>;
export function isRemoveAction(action: { type: string }): action is RemoveAction {
    return action.type === REMOVE;
}
export type FetchAction = ReturnType<typeof fetch>;
export function isFetchAction(action: { type: string }): action is FetchAction {
    return action.type === FETCH;
}

export type ReducerAction = CreateAction | UpdateAction | RemoveAction;
export function isReducerAction(action: { type: string }): action is ReducerAction {
    return isCreateAction(action) || isUpdateAction(action) || isRemoveAction(action);
}
export type Action = ReducerAction | FetchAction;
export function isAction(action: { type: string }): action is Action {
    return isReducerAction(action) || isFetchAction(action);
}
