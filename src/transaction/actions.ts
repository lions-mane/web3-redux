import { NetworkId } from '../network/model';
import { actionCreator } from '../utils';
import { Transaction } from './model';

const name = 'Transaction';

export const CREATE = `${name}/CREATE`;
export const UPDATE = `${name}/UPDATE`;
export const REMOVE = `${name}/DELETE`;
export const FETCH = `${name}/FETCH`;

export const create = actionCreator<typeof CREATE, Transaction>(CREATE);
export const update = actionCreator<typeof UPDATE, Transaction>(UPDATE);
export const remove = actionCreator<typeof REMOVE, string>(REMOVE);

interface FetchActionInput extends NetworkId {
    hash: string;
}
export const fetch = actionCreator<typeof FETCH, FetchActionInput>(FETCH);

export type CreateAction = ReturnType<typeof create>;
export type UpdateAction = ReturnType<typeof update>;
export type RemoveAction = ReturnType<typeof remove>;
export type FetchAction = ReturnType<typeof fetch>;

export type Action = CreateAction | UpdateAction | RemoveAction | FetchAction;
