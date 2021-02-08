import { createSelector } from 'redux-orm';
import { Fields } from './model';
import { Fields as BookFields } from '../book/model';
import { orm } from '../orm';

type selectWithIdSingle = (state: any, id?: number) => Fields;
type selectWithIdMany = (state: any, ids?: number[]) => Fields[];
export const selectWithId: selectWithIdSingle | selectWithIdMany = createSelector(orm.Author);

type selectBooksSingle = (state: any, id?: number) => BookFields[];
type selectBooksMany = (state: any, ids?: number[]) => BookFields[][];
export const selectBooks: selectBooksSingle | selectBooksMany = createSelector(orm.Author.books);
