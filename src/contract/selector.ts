import { createSelector } from 'redux-orm';
import { CallArgsHash, callArgsHash, Contract } from './model';
import { orm } from '../orm';

type selectSingle = (state: any, id: string) => Contract | undefined;
type selectMany = (state: any, ids?: string[]) => (Contract | null)[];
export const select: selectSingle | selectMany = createSelector(orm.Contract);
export const selectSingle = select as selectSingle;
export const selectMany = select as selectMany;

type selectContractCall = (state: any, id: string, methodName: string, callArgs?: CallArgsHash) => any;
export const selectContractCall: selectContractCall = createSelector(
    orm.Contract,
    (_1: string, id: string) => id,
    (_1: string, _2: string, methodName: string) => methodName,
    (_1: string, _2: string, _3: string, callArgs?: CallArgsHash) => callArgs,
    (contract: Contract | undefined, _: string, methodName: string, callArgs?: CallArgsHash) => {
        if (!contract) return undefined;
        if (!contract.methods) return undefined;

        const method = contract.methods[methodName];
        if (!method) return undefined;

        const hash = callArgsHash(callArgs);
        const call = method[hash];
        if (!call) return undefined;

        return call.value;
    },
);
