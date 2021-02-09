import { createSelector } from 'redux-orm';
import { Transaction } from './model';
import { orm } from '../orm';

type selectWithIdSingle = (state: any, id?: string) => Transaction;
type selectWithIdMany = (state: any, ids?: string[]) => Transaction[];
export const selectWithId: selectWithIdSingle | selectWithIdMany = createSelector(orm.Transaction);
