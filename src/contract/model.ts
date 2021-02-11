import { attr, Model as ORMModel } from 'redux-orm';
import { AbiItem } from 'web3-utils';
import { BlockHeader } from '../block/model';
import { NetworkId } from '../network/model';
import { Transaction } from '../transaction/model';

const name = 'Contract';
//Sync call block filter
export const CALL_BLOCK_SYNC = `${name}/CALL_BLOCK_SYNC`;
//Sync call tx filter
export const CALL_TRANSACTION_SYNC = `${name}/CALL_TRANSACTION_SYNC`;
interface ContractCallBlockSync {
    type: typeof CALL_BLOCK_SYNC;
    filter: (block: BlockHeader) => boolean;
}
export function isContractCallBlockSync(action: { type: string }): action is ContractCallBlockSync {
    return action.type === CALL_BLOCK_SYNC;
}

interface ContractCallTransactionSync {
    type: typeof CALL_TRANSACTION_SYNC;
    filter: (transaction: Transaction) => boolean;
}
export function isContractCallTransactionSync(action: { type: string }): action is ContractCallTransactionSync {
    return action.type === CALL_TRANSACTION_SYNC;
}

export type ContractCallSync = ContractCallBlockSync | ContractCallTransactionSync | boolean;
interface ContractCall {
    value: any;
    defaultBlock: string | number;
    args?: any[];
    sync: ContractCallSync;
}

export interface Contract extends NetworkId {
    id?: string;
    address: string;
    abi: AbiItem[];
    methods?: {
        [callerFunctionName: string]: {
            [argsHash: string]: ContractCall;
        };
    };
    defaultCallSync?: ContractCallSync;
}

export interface ContractId extends NetworkId {
    address: string;
}

class Model extends ORMModel {
    static options = {
        idAttribute: 'id',
    };

    static modelName = 'Contract';

    static fields = {
        address: attr(),
        abi: attr(),
    };

    static toId({ address, networkId }: ContractId) {
        return `${networkId}-${address}`;
    }
}

export { Model };
