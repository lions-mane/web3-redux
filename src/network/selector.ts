import { createSelector } from 'redux-orm';
import { Network } from './model';
import { orm } from '../orm';

type selectWithIdSingle = (state: any, id?: number) => Network;
type selectWithIdMany = (state: any, ids?: number[]) => Network[];
export const selectWithId: selectWithIdSingle | selectWithIdMany = createSelector(orm.Network);
