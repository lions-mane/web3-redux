import { createSelector } from 'redux-orm';
import { BlockTransaction, BlockTransactionObject, BlockTransactionBase } from './model';
import { Transaction } from '../transaction/model';
import { orm } from '../orm';

type selectSingle = (state: any, id: string) => BlockTransactionBase | undefined;
type selectMany = (state: any, ids?: string[]) => (BlockTransactionBase | null)[];
export const select: selectSingle | selectMany = createSelector(orm.Block);
export const selectSingle = select as selectSingle;
export const selectMany = select as selectMany;

type selectTransactionsSingle = (state: any, id: string) => Transaction[] | null;
type selectTransactionsMany = (state: any, ids?: string[]) => (Transaction[] | null)[];
export const selectTransactions: selectTransactionsSingle | selectTransactionsMany = createSelector(
    orm.Block.transactions,
);
export const selectSingleTransactions = selectTransactions as selectTransactionsSingle;
export const selectManyTransactions = selectTransactions as selectTransactionsMany;

type selectBlockTransactionSingle = (state: any, id: string) => BlockTransaction | null;
type selectBlockTransactionMany = (state: any, ids?: string[]) => (BlockTransaction | null)[];
export const selectBlockTransaction: selectBlockTransactionSingle | selectBlockTransactionMany = createSelector(
    orm.Block,
    orm.Block.transactions,
    (blocks: BlockTransactionBase | BlockTransactionBase[], transactions: Transaction[] | Transaction[][]) => {
        if (!blocks) return null;

        if (!Array.isArray(blocks)) {
            return { ...blocks, transactions } as BlockTransactionObject;
        } else {
            return blocks.map((b, idx) => {
                if (!b) return null;
                return { ...b, transactions: transactions[idx] };
            }) as (BlockTransactionObject | null)[];
        }
    },
);
export const selectSingleBlockTransaction = selectBlockTransaction as selectBlockTransactionSingle;
export const selectManyBlockTransaction = selectBlockTransaction as selectBlockTransactionMany;
