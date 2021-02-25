import { attr, fk, Model as ORMModel } from 'redux-orm';
import { TransactionReceipt } from 'web3-eth';
import { NetworkId } from '../network/model';

/**
 * Transaction object.
 * Extends the web3 interface.
 *
 * @param id - Tx id. Used to index transactions in redux-orm. Computed as `${networkId}-${hash}`.
 * @param networkId - A network id.
 * @param blockId - Tx id. Used to index the block this transaction is in. Computed as `${networkId}-${blockNumber}`.
 * @param receipt - Tx receipt. Applicable when this is a pending sent transaction.
 * @param confirmations - Tx confirmations. Applicable when this is a pending sent transaction.
 * @param hash - 32 Bytes - String: Hash of the transaction.
 * @param nonce - Number: The number of transactions made by the sender prior to this one.
 * @param blockHash - 32 Bytes - String: Hash of the block where this transaction was in. null if pending.
 * @param blockNumber - Number: Block number where this transaction was in. null if pending.
 * @param transactionIndex - Number: Integer of the transactions index position in the block. null if pending.
 * @param from - String: Address of the sender.
 * @param to - String: Address of the receiver. null if it’s a contract creation transaction.
 * @param value - String: Value transferred in wei.
 * @param gasPrice  - String: Gas price provided by the sender in wei.
 * @param gas - Number: Gas provided by the sender.
 * @param input - String: The data sent along with the transaction.
 */
export interface Transaction extends NetworkId {
    id?: string;
    //Web3
    hash: string;
    nonce?: number;
    blockHash?: string | null;
    blockNumber?: number | null;
    transactionIndex?: number | null;
    from?: string;
    to?: string | null;
    value?: string;
    gasPrice?: string;
    gas?: number;
    input?: string;
    //Other
    blockId?: string | null;
    receipt?: TransactionReceipt;
    confirmations?: number;
}

/**
 * Transaction Id object.
 *
 * @param networkId - A network id.
 * @param hash - 32 Bytes - String: Hash of the transaction.
 */
export interface TransactionId extends NetworkId {
    hash: string;
}

/**
 * Transaction Block Id object.
 * @see {@link NetworkId} for additional params.
 *
 * @param blockNumber - Number: Block number where this transaction was in. null if pending.
 */
export interface TransactionBlockId extends NetworkId {
    blockNumber?: string | number | null;
}

class Model extends ORMModel {
    static options = {
        idAttribute: 'id',
    };

    static modelName = 'Transaction';

    static fields = {
        number: attr(),
        blockId: fk({ to: 'Block', as: 'block', relatedName: 'transactions' }),
    };
}

export function transactionId({ hash, networkId }: TransactionId) {
    return `${networkId}-${hash}`;
}

export function transactionBlockId({ blockNumber, networkId }: TransactionBlockId) {
    if (!blockNumber) return null;

    return `${networkId}-${blockNumber}`;
}

export { Model };
