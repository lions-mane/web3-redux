import { attr, fk, Model as ORMModel } from 'redux-orm';
import { Transaction as Web3Transaction } from 'web3-eth';

export type Transaction = Web3Transaction;

class Model extends ORMModel {
    static options = {
        idAttribute: 'hash',
    };

    static modelName = 'Transaction';

    static fields = {
        number: attr(),
        blockNumber: fk({ to: 'Block', as: 'block', relatedName: 'transactions' }),
    };
}

export { Model };
