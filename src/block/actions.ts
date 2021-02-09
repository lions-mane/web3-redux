import { NetworkId } from '../network/model';
import { actionCreator } from '../utils';
import { Block, BlockTransaction } from './model';

const name = 'Block';

export const CREATE = `${name}/CREATE`;
export const UPDATE = `${name}/UPDATE`;
export const REMOVE = `${name}/DELETE`;
export const FETCH = `${name}/FETCH`;

export const create = actionCreator<typeof CREATE, Block | BlockTransaction>(CREATE);
export const update = actionCreator<typeof UPDATE, Block>(UPDATE);

export const remove = actionCreator<typeof REMOVE, string | number>(REMOVE);

interface FetchActionInput extends NetworkId {
    blockHashOrBlockNumber: string | number;
    returnTransactionObjects?: boolean;
}
export const fetch = actionCreator<typeof FETCH, FetchActionInput>(FETCH);

export type CreateAction = ReturnType<typeof create>;
export type UpdateAction = ReturnType<typeof update>;
export type RemoveAction = ReturnType<typeof remove>;
export type FetchAction = ReturnType<typeof fetch>;

export type Action = CreateAction | UpdateAction | RemoveAction | FetchAction;
export function isAction(action: { type: string }): action is Action {
    return action.type === CREATE || action.type === UPDATE || action.type === REMOVE || action.type === FETCH;
}
