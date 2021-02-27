import { createSelector } from 'redux-orm';
import { Network } from './model';
import { Block } from '../block/model';
import { Transaction } from '../transaction/model';
import { Contract } from '../contract/model';
import { orm } from '../orm';

type selectSingle = (state: any, id: string) => Network | undefined;
type selectMany = (state: any, ids?: string[]) => (Network | null)[];
export const select: selectSingle | selectMany = createSelector(orm.Network);
export const selectSingle = select as selectSingle;
export const selectMany = select as selectMany;

type selectSingleBlocks = (state: any, id: string) => Block[] | null;
type selectManyBlocks = (state: any, ids?: string[]) => (Block[] | null)[];
export const selectBlocks: selectSingleBlocks | selectManyBlocks = createSelector(orm.Network.blocks);
export const selectSingleBlocks = selectBlocks as selectSingleBlocks;
export const selectManyBlocks = selectBlocks as selectManyBlocks;

type selectSingleTransactions = (state: any, id: string) => Transaction[] | null;
type selectManyTransactions = (state: any, ids?: string[]) => (Transaction[] | null)[];
export const selectTransactions: selectSingleTransactions | selectManyTransactions = createSelector(
    orm.Network.transactions,
);
export const selectSingleTransactions = selectTransactions as selectSingleTransactions;
export const selectManyTransactions = selectTransactions as selectManyTransactions;

type selectSingleContracts = (state: any, id: string) => Contract[] | null;
type selectManyContracts = (state: any, ids?: string[]) => (Contract[] | null)[];
export const selectContracts: selectSingleContracts | selectManyContracts = createSelector(orm.Network.contracts);
export const selectSingleContracts = selectContracts as selectSingleContracts;
export const selectManyContracts = selectContracts as selectManyContracts;
