import { attr, fk, Model as ORMModel } from 'redux-orm';
import { Transaction as Web3Transaction, TransactionReceipt } from 'web3-eth';
import { NetworkId } from '../network/model';

export interface Transaction extends Web3Transaction, NetworkId {
    id?: string;
    blockId: string;
    receipt?: TransactionReceipt;
    confirmations?: number;
}
export interface TransactionId extends NetworkId {
    hash: string;
}
export interface TransactionBlockId extends NetworkId {
    blockNumber: string;
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

    static toId({ hash, networkId }: TransactionId) {
        return `${networkId}-${hash}`;
    }
    static toBlockId({ blockNumber, networkId }: TransactionBlockId) {
        return `${networkId}-${blockNumber}`;
    }
}

export { Model };
