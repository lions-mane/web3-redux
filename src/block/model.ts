import { attr, Model as ORMModel } from 'redux-orm';
import { BlockTransactionBase } from 'web3-eth';
import { NetworkId } from '../network/model';
import { Transaction } from '../transaction/model';
import { isStrings } from '../utils';

export interface Block extends BlockTransactionBase, NetworkId {
    id?: string;
}
export interface BlockTransactionString extends Block {
    transactions: string[];
}
export interface BlockTransactionObject extends Block {
    transactions: Transaction[];
}
export type BlockTransaction = BlockTransactionString | BlockTransactionObject;
export interface BlockId extends NetworkId {
    number: number;
}

function isBlockTransaction(block: Block | BlockTransaction): block is BlockTransaction {
    return !!(block as BlockTransaction).transactions;
}
export function isBlockTransactionString(
    block: Block | BlockTransactionString | BlockTransactionObject,
): block is BlockTransactionString {
    return isBlockTransaction(block) && isStrings(block.transactions);
}
export function isBlockTransactionObject(
    block: Block | BlockTransactionString | BlockTransactionObject,
): block is BlockTransactionObject {
    return isBlockTransaction(block) && !isStrings(block.transactions);
}

class Model extends ORMModel {
    static options = {
        idAttribute: 'id',
    };

    static modelName = 'Block';

    static fields = {
        number: attr(),
    };

    static toId({ number, networkId }: BlockId) {
        return `${networkId}-${number}`;
    }
}

export { Model };
