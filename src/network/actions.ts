import { actionCreator } from '../utils';
import { Network } from './model';

const name = 'Network';

export const CREATE = `${name}/CREATE`;
export const UPDATE = `${name}/UPDATE`;
export const REMOVE = `${name}/DELETE`;
export const FETCH = `${name}/FETCH`;

export const create = actionCreator<typeof CREATE, Network>(CREATE);
export const update = actionCreator<typeof UPDATE, Network>(UPDATE);
export const remove = actionCreator<typeof REMOVE, Network['networkId']>(REMOVE);

export type CreateAction = ReturnType<typeof create>;
export type UpdateAction = ReturnType<typeof update>;
export type RemoveAction = ReturnType<typeof remove>;

export type Action = CreateAction | UpdateAction | RemoveAction;
