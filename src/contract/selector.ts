import { createSelector } from 'redux-orm';
import { CallArgsHash, callArgsHash, Contract } from './model';
import { orm } from '../orm';

type selectSingle = (state: any, id?: string) => Contract;
type selectMany = (state: any, ids?: string[]) => Contract[];
export const select: selectSingle | selectMany = createSelector(orm.Contract);

type selectContractCall = (state: any, id: string, methodName: string, callArgs?: CallArgsHash) => any;
export const selectContractCall: selectContractCall = createSelector(
    orm.Contract,
    (_1: string, id: string) => id,
    (_1: string, _2: string, methodName: string) => methodName,
    (_1: string, _2: string, _3: string, callArgs?: CallArgsHash) => callArgs,
    (contract: Contract, _: string, methodName: string, callArgs?: CallArgsHash) => {
        const method = contract.methods[methodName];
        if (!method) return null;

        const hash = callArgsHash(callArgs);
        return method[hash].value;
    },
);
