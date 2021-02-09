import { createSelector } from 'redux-orm';
import { Block } from './model';
import { Transaction } from '../transaction/model';
import { orm } from '../orm';

type selectWithIdSingle = (state: any, id?: string) => Block;
type selectWithIdMany = (state: any, ids?: string[]) => Block[];
export const selectWithId: selectWithIdSingle | selectWithIdMany = createSelector(orm.Block);

type selectTransactionsSingle = (state: any, id?: string) => Transaction[];
type selectTransactionsMany = (state: any, ids?: string[]) => Transaction[][];
export const selectTransactions: selectTransactionsSingle | selectTransactionsMany = createSelector(
    orm.Block.transactions,
);
