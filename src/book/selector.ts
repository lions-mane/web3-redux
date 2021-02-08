import { createSelector } from 'redux-orm';
import { Fields } from './model';
import { orm } from '../orm';

type selectWithIdSingle = (state: any, id?: Fields['name']) => Fields;
type selectWithIdMany = (state: any, ids?: Fields['name'][]) => Fields[];
export const selectWithId: selectWithIdSingle | selectWithIdMany = createSelector(orm.Book);
