import { actionCreator } from '../utils';
import { Fields } from './model';

const name = 'Book';

export const CREATE = `${name}/CREATE`;
export const UPDATE = `${name}/UPDATE`;
export const REMOVE = `${name}/DELETE`;
export const FETCH = `${name}/FETCH`;

export const create = actionCreator<typeof CREATE, Fields>(CREATE);
export const update = actionCreator<typeof UPDATE, Fields>(UPDATE);
export const remove = actionCreator<typeof REMOVE, number>(REMOVE);
export const fetch = actionCreator<typeof FETCH, number>(FETCH);

export type CreateAction = ReturnType<typeof create>;
export type UpdateAction = ReturnType<typeof update>;
export type RemoveAction = ReturnType<typeof remove>;
export type FetchAction = ReturnType<typeof fetch>;

export type Action = CreateAction | UpdateAction | RemoveAction | FetchAction;
