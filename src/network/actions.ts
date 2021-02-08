import { actionCreator } from '../utils';
import { Network } from './model';

const name = 'Network';

export const CREATE = `${name}/CREATE`;
export const UPDATE = `${name}/UPDATE`;
export const REMOVE = `${name}/DELETE`;

export const create = actionCreator<typeof CREATE, Network>(CREATE);
export const update = actionCreator<typeof UPDATE, Network>(UPDATE);
export const remove = actionCreator<typeof REMOVE, Network['networkId']>(REMOVE);

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

export type ReducerAction = CreateAction | UpdateAction | RemoveAction;
export function isReducerAction(action: { type: string }): action is ReducerAction {
    return isCreateAction(action) || isUpdateAction(action) || isRemoveAction(action);
}

export type Action = ReducerAction;
export function isAction(action: { type: string }): action is Action {
    return isReducerAction(action);
}
