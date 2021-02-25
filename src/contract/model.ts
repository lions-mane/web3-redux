import { attr, Model as ORMModel } from 'redux-orm';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract as Web3Contract, EventData } from 'web3-eth-contract';

import { BlockHeader } from '../block/model';
import { NetworkId } from '../network/model';
import { Transaction } from '../transaction/model';
import { ZERO_ADDRESS } from '../utils';

const name = 'Contract';
export const CALL_BLOCK_SYNC = `${name}/CALL_BLOCK_SYNC`;
export const CALL_TRANSACTION_SYNC = `${name}/CALL_TRANSACTION_SYNC`;

/**
 * Contract Call Block Sync strategy.
 * Syncs calls based on block filter. Default syncs call every block.
 *
 * @param type CALL_BLOCK_SYNC
 * @param filter Block filter function that returns true if call should be refreshed.
 */
export interface ContractCallBlockSync {
    type: typeof CALL_BLOCK_SYNC;
    filter: (block: BlockHeader) => boolean;
}
export function isContractCallBlockSync(action: { type: string }): action is ContractCallBlockSync {
    return action.type === CALL_BLOCK_SYNC;
}
export const defaultBlockSync: ContractCallBlockSync = {
    type: CALL_BLOCK_SYNC,
    filter: () => true,
};

/**
 * Contract Call Transaction Sync strategy.
 * Syncs calls based on transaction filter. Default syncs call every tx with to param set to contract address.
 *
 * @param type CALL_TRANSACTION_SYNC
 * @param filter Transaction filter function that returns true if call should be refreshed.
 */
export interface ContractCallTransactionSync {
    type: typeof CALL_TRANSACTION_SYNC;
    filter: (transaction: Transaction) => boolean;
}
export function isContractCallTransactionSync(action: { type: string }): action is ContractCallTransactionSync {
    return action.type === CALL_TRANSACTION_SYNC;
}
export const defaultTransactionSyncForContract: (address: string) => ContractCallTransactionSync = (
    address: string,
) => {
    return {
        type: CALL_TRANSACTION_SYNC,
        filter: (transaction: Transaction) => transaction.to === address,
    };
};

export type ContractCallSync = ContractCallBlockSync | ContractCallTransactionSync;

/**
 * Contract call object. Stores a cached contract call.
 *
 * @param value - Contract call return value.
 * @param defaultBlock - Call at a specific block height. Block number or "latest".
 * @param args - Call function arguments.
 * @param sync - {@link ContractCallSync} used to sync calls. defaultBlock MUST be "latest".
 */
export interface ContractCall {
    value: any;
    defaultBlock: string | number;
    args?: any[];
    sync: ContractCallSync | false;
}

/**
 * Contract object.
 *
 * @param id - Contract id. Used to index contracts in redux-orm. Computed as `${networkId}-${address}`.
 * @param networkId - A network id.
 * @param address - Contract address.
 * @param abi - Contract ABI.
 * @param methods - Contract call store. Call data is stored at [methodName][`(${...args}).call(${defaultBlock},${from})`]
 * @param events - Contract event subscription store
 * @param web3Contract - Web3 Contract instance
 */
export interface Contract extends NetworkId {
    id: string;
    address: string;
    abi: AbiItem[];
    methods: {
        [callerFunctionName: string]: {
            [argsHash: string]: ContractCall;
        };
    };
    events: {
        [eventName: string]: {
            [eventId: string]: EventData;
        };
    };
    web3Contract?: Web3Contract;
}

export interface ContractPartial extends NetworkId {
    address: string;
    abi: AbiItem[];
    methods?: {
        [callerFunctionName: string]: {
            [argsHash: string]: ContractCall;
        };
    };
    events?: {
        [eventName: string]: {
            [eventId: string]: EventData;
        };
    };
    web3Contract?: Web3Contract;
}

/**
 * Contract Id object.
 *
 * @param networkId - A network id.
 * @param address - Contract address.
 */
export interface ContractIdDeconstructed extends NetworkId {
    address: string;
}

export type ContractId = ContractIdDeconstructed | string;

class Model extends ORMModel {
    static options = {
        idAttribute: 'id',
    };

    static modelName = 'Contract';

    static fields = {
        address: attr(),
        abi: attr(),
    };
}

export function validatedContract(contract: ContractPartial): Contract {
    const { networkId, address } = contract;
    const addressCheckSum = Web3.utils.toChecksumAddress(address);
    const methods =
        contract.methods ??
        contract.abi
            .filter(item => item.type == 'function')
            .map(item => item.name!)
            .reduce((acc, m) => {
                return { ...acc, [m]: {} };
            }, {});
    const events =
        contract.events ??
        contract.abi
            .filter(item => item.type == 'event')
            .map(item => item.name!)
            .reduce((acc, m) => {
                return { ...acc, [m]: {} };
            }, {});
    const id = `${networkId}-${address}`;
    return {
        ...contract,
        id,
        address: addressCheckSum,
        methods,
        events,
    };
}

export function contractId({ address, networkId }: ContractIdDeconstructed): string {
    const addressCheckSum = Web3.utils.toChecksumAddress(address);
    return `${networkId}-${addressCheckSum}`;
}

export function deconstructId(id: string): ContractIdDeconstructed {
    const [networkId, address] = id.split('-');
    return {
        networkId,
        address,
    };
}

export function eventId(event: EventData): string {
    return `${event.transactionHash}-${event.transactionIndex}`;
}

export interface CallArgsHash {
    args?: any[];
    defaultBlock?: string | number;
    from?: string;
}
export function callArgsHash(callArgs?: CallArgsHash): string {
    if (!callArgs) return `().call(latest,${ZERO_ADDRESS})`;

    // eslint-disable-next-line prefer-const
    let { args, from, defaultBlock } = callArgs!;
    if (!defaultBlock) defaultBlock = 'latest';
    if (!from) from = ZERO_ADDRESS;

    if (!args || args.length == 0) {
        return `().call(${defaultBlock},${from})`;
    } else {
        return `(${JSON.stringify(args)}).call(${defaultBlock},${from})`;
    }
}

export { Model };
