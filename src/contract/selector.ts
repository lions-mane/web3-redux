import { createSelector } from 'redux-orm';
import { CallArgsHash, callArgsHash, Contract } from './model';
import { orm } from '../orm';
import { EthCall } from '../ethcall/model';

type selectSingle = (state: any, id: string) => Contract | undefined;
type selectMany = (state: any, ids?: string[]) => (Contract | null)[];
export const select: selectSingle | selectMany = createSelector(orm.Contract);
export const selectSingle = select as selectSingle;
export const selectMany = select as selectMany;

type selectContractCall = (state: any, id: string, methodName: string, callArgs?: CallArgsHash) => any;
export const selectContractCall: selectContractCall = createSelector(
    orm,
    (_1: string, id: string) => id,
    (_1: string, _2: string, methodName: string) => methodName,
    (_1: string, _2: string, _3: string, callArgs?: CallArgsHash) => callArgs,
    (session: any, id: string, methodName: string, callArgs?: CallArgsHash) => {
        const contract: Contract | undefined = session.Contract.withId(id);
        if (!contract) return undefined;
        if (!contract.methods) return undefined;

        const method = contract.methods[methodName];
        if (!method) return undefined;

        const hash = callArgsHash(callArgs);
        if (!method[hash]) return undefined;
        const { ethCallId } = method[hash];
        if (!ethCallId) return undefined;

        const ethCall: EthCall = session.EthCall.withId(ethCallId);
        if (!ethCall) return undefined;

        const returnValue = ethCall.returnValue;
        //const methodAbi = contract.abi.filter(v => v.name === methodName)[0];

        return returnValue; //TODO: parse output
    },
);
