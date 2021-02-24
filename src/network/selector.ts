import { createSelector } from 'redux-orm';
import { Network } from './model';
import { orm } from '../orm';

type selectSingle = (state: any, id?: string) => Network | undefined;
type selectMany = (state: any, ids?: string[]) => Network[];
export const select: selectSingle | selectMany = createSelector(orm.Network);
export const selectSingle = select as selectSingle;
export const selectMany = select as selectMany;
