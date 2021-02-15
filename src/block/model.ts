import { attr, Model as ORMModel } from 'redux-orm';
import { BlockHeader as Web3BlockHeader } from 'web3-eth';
import { NetworkId } from '../network/model';
import { Transaction } from '../transaction/model';
import { isStrings } from '../utils';

export interface BlockHeader extends Web3BlockHeader, NetworkId {
    id?: string;
}
export interface BlockTransactionBase extends BlockHeader {
    size?: number;
    difficulty?: number;
    totalDifficulty?: number;
    uncles?: string[];
}
export interface BlockTransactionString extends BlockTransactionBase {
    transactions: string[];
}
export interface BlockTransactionObject extends BlockTransactionBase {
    transactions: Transaction[];
}
export type BlockTransaction = BlockTransactionString | BlockTransactionObject;
export interface BlockId extends NetworkId {
    number: number;
}
export type Block = BlockHeader | BlockTransaction;

export function isBlockTransaction(block: Block): block is BlockTransaction {
    return !!(block as BlockTransaction).transactions;
}
export function isBlockTransactionString(block: Block): block is BlockTransactionString {
    return isBlockTransaction(block) && isStrings(block.transactions);
}
export function isBlockTransactionObject(block: Block): block is BlockTransactionObject {
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
