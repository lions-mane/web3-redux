import { createSelector } from 'redux-orm';
import { Contract } from './model';
import { orm } from '../orm';

type selectSingle = (state: any, id?: string) => Contract;
type selectMany = (state: any, ids?: string[]) => Contract[];
export const select: selectSingle | selectMany = createSelector(orm.Contract);
