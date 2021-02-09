import { createSelector } from 'redux-orm';
import { Transaction } from './model';
import { orm } from '../orm';

type selectSingle = (state: any, id?: string) => Transaction;
type selectMany = (state: any, ids?: string[]) => Transaction[];
export const select: selectSingle | selectMany = createSelector(orm.Transaction);
