import { createSelector } from 'redux-orm';
import { Transaction } from './model';
import { orm } from '../orm';

type selectSingle = (state: any, id?: string) => Transaction | undefined;
type selectMany = (state: any, ids?: string[]) => Transaction[];
export const select: selectSingle | selectMany = createSelector(orm.Transaction);
export const selectSingle = select as selectSingle;
export const selectMany = select as selectMany;
