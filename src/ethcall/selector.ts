import { createSelector } from 'redux-orm';
import { EthCall } from './model';
import { orm } from '../orm';

type selectSingle = (state: any, id: string) => EthCall | undefined;
type selectMany = (state: any, ids?: string[]) => (EthCall | null)[];
export const select: selectSingle | selectMany = createSelector(orm.EthCall);
export const selectSingle = select as selectSingle;
export const selectMany = select as selectMany;
