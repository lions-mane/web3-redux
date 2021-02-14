import { createSelector } from 'redux-orm';
import { Network } from './model';
import { orm } from '../orm';

type selectSingle = (state: any, id?: string) => Network;
type selectMany = (state: any, ids?: string[]) => Network[];
export const select: selectSingle | selectMany = createSelector(orm.Network);
