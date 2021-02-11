import { CallOptions, SendOptions } from 'web3-eth-contract';
import { actionCreator } from '../utils';
import { ContractCallSync, Contract, ContractId, CALL_BLOCK_SYNC, CALL_TRANSACTION_SYNC } from './model';

const name = 'Contract';

export const CREATE = `${name}/CREATE`;
export const UPDATE = `${name}/UPDATE`;
export const REMOVE = `${name}/DELETE`;

export const CALL = `${name}/CALL`;

export const SEND = `${name}/SEND`;

export const create = actionCreator<typeof CREATE, Contract>(CREATE);
export const update = actionCreator<typeof UPDATE, Contract>(UPDATE);
export const remove = actionCreator<typeof REMOVE, ContractId>(REMOVE);

interface CallActionInput extends ContractId {
    method: string;
    args?: any[];
    options?: CallOptions;
    defaultBlock?: number | string;
    sync?: ContractCallSync | boolean | typeof CALL_BLOCK_SYNC | typeof CALL_TRANSACTION_SYNC;
}
export const call = actionCreator<typeof CALL, CallActionInput>(CALL);

interface SendActionInput extends ContractId {
    method: string;
    args?: any[];
    options?: SendOptions;
}
export const send = actionCreator<typeof SEND, SendActionInput>(SEND);

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
export type CallAction = ReturnType<typeof call>;
export function isCallAction(action: { type: string }): action is CallAction {
    return action.type === CALL;
}
export type SendAction = ReturnType<typeof send>;
export function isSendAction(action: { type: string }): action is SendAction {
    return action.type === SEND;
}

export type ReducerAction = CreateAction | UpdateAction | RemoveAction;
export function isReducerAction(action: { type: string }): action is ReducerAction {
    return isCreateAction(action) || isUpdateAction(action) || isRemoveAction(action);
}

export type SagaAction = CallAction | SendAction;
export function isSagaAction(action: { type: string }): action is SagaAction {
    return isCallAction(action) || isSendAction(action);
}

export type Action = ReducerAction | SagaAction;
export function isAction(action: { type: string }): action is Action {
    return isReducerAction(action) || isSagaAction(action);
}
