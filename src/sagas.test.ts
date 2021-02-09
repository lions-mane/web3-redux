import { assert } from 'chai';
import { before } from 'mocha';
import { put } from 'redux-saga/effects';
import Web3 from 'web3';
import dotenv from 'dotenv';

import * as BlockActions from './block/actions';
import * as BlockSagas from './block/sagas';
//import * as TransactionActions from './transaction/actions';
import * as BlockSelector from './block/selector';
//import * as TransactionSelector from './transaction/selector';
import { createStore } from './store';
import { Block, BlockTransaction } from './block/model';

function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

const networkId = '1337';

describe('sagas', () => {
    let web3: Web3;
    let store: ReturnType<typeof createStore>;

    before(() => {
        dotenv.config();
        web3 = new Web3(process.env.ETH_RPC);
    });

    beforeEach(() => {
        store = createStore();
    });

    it('fetch', async () => {
        const gen = BlockSagas.fetch(BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest' }));
        const expectedBlock: Block = await web3.eth.getBlock('latest');
        const expectedPutBlockAction = put(BlockActions.create(expectedBlock));

        gen.next();
        const putBlock = gen.next(expectedBlock).value;
        assert.deepEqual(putBlock, expectedPutBlockAction);
    });

    it('fetch', async () => {
        const gen = BlockSagas.fetch(
            BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest', returnTransactionObjects: true }),
        );
        const expectedBlock: BlockTransaction = await web3.eth.getBlock('latest', true);
        const expectedPutBlockAction = put(BlockActions.create(expectedBlock));

        gen.next();
        const putBlock = gen.next(expectedBlock).value;
        assert.deepEqual(putBlock, expectedPutBlockAction);
    });

    it('fetch', async () => {
        store.dispatch(BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest' }));
        const expectedBlock: BlockTransaction = await web3.eth.getBlock('latest');

        await sleep(100);

        const state = store.getState();
        const expectedBlockState = {
            [expectedBlock.number]: expectedBlock,
        };
        const expectedBlockSelected = [expectedBlock];
        assert.deepEqual(state.orm['Block'].itemsById, expectedBlockState, 'state.orm.Block.itemsById');
        assert.deepEqual(BlockSelector.selectWithId(state), expectedBlockSelected, 'Block.selectWithId');
        //assert.deepEqual(BlockSelector.selectTransactions(state), expectedBlockTransactionsSelected, 'Block.selectTransactions');
    });
});
