import { createSelector } from 'redux-orm';
import { Block, BlockTransaction, BlockTransactionObject, BlockTransactionBase } from './model';
import { Transaction } from '../transaction/model';
import { orm } from '../orm';

type selectSingle = (state: any, id?: string) => Block;
type selectMany = (state: any, ids?: string[]) => Block[];
export const select: selectSingle | selectMany = createSelector(orm.Block);

type selectTransactionsSingle = (state: any, id?: string) => Transaction[];
type selectTransactionsMany = (state: any, ids?: string[]) => Transaction[][];
export const selectTransactions: selectTransactionsSingle | selectTransactionsMany = createSelector(
    orm.Block.transactions,
);

type selectBlockTransactionSingle = (state: any, id?: string) => BlockTransaction;
type selectBlockTransactionMany = (state: any, ids?: string[]) => BlockTransaction[];
export const selectBlockTransaction: selectBlockTransactionSingle | selectBlockTransactionMany = createSelector(
    orm.Block,
    orm.Block.transactions,
    (blocks: BlockTransactionBase | BlockTransactionBase[], transactions: Transaction[] | Transaction[][]) => {
        if (!Array.isArray(blocks)) {
            return { ...blocks, transactions } as BlockTransactionObject;
        } else {
            return blocks.map((b, idx) => {
                return { ...b, transactions: transactions[idx] };
            }) as BlockTransactionObject[];
        }
    },
);
