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
import { Block, BlockHeader, BlockTransactionObject, BlockTransactionString } from './block/model';

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

    it('fetch({returnTransactionObjects:false})', async () => {
        const gen = BlockSagas.fetch(BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest' }));
        const block = await web3.eth.getBlock('latest');
        const expectedBlock: BlockTransactionString = { ...block, networkId, id: `${networkId}-${block.number}` };
        const expectedPutBlockAction = put(BlockActions.create(expectedBlock));

        gen.next();
        const putBlock = gen.next(expectedBlock).value;
        assert.deepEqual(putBlock, expectedPutBlockAction);
    });

    it('fetch({returnTransactionObjects:true})', async () => {
        const gen = BlockSagas.fetch(
            BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest', returnTransactionObjects: true }),
        );
        const block = await web3.eth.getBlock('latest', true);
        //@ts-ignore
        const expectedBlock: BlockTransactionObject = { ...block, networkId, id: `${networkId}-${block.number}` };
        const expectedPutBlockAction = put(BlockActions.create(expectedBlock));

        gen.next();
        const putBlock = gen.next(expectedBlock).value;
        assert.deepEqual(putBlock, expectedPutBlockAction);
    });

    it('store.dispatch(fetch({returnTransactionObjects:false}))', async () => {
        store.dispatch(BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest' }));
        const block = await web3.eth.getBlock('latest');
        const expectedBlock: Block = { ...block, networkId, id: `${networkId}-${block.number}` };

        await sleep(100);

        const state = store.getState();
        const expectedBlockState = {
            [expectedBlock.id!]: expectedBlock,
        };
        const expectedBlockSelected = [expectedBlock];
        assert.deepEqual(state.orm['Block'].itemsById, expectedBlockState, 'state.orm.Block.itemsById');
        assert.deepEqual(BlockSelector.selectWithId(state), expectedBlockSelected, 'Block.selectWithId');
        //assert.deepEqual(BlockSelector.selectTransactions(state), expectedBlockTransactionsSelected, 'Block.selectTransactions');
    });

    it('store.dispatch(subscribe())', async () => {
        store.dispatch(BlockActions.subscribe({ networkId }));

        const expectedBlocks: { [key: string]: BlockHeader } = {};
        web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${networkId}-${block.number}`;
            expectedBlocks[id] = { ...block, networkId, id };
        });

        await sleep(2000);

        const state = store.getState();
        assert.deepEqual(state.orm['Block'].itemsById, expectedBlocks);
    });

    it('store.dispatch(unsubscribe())', async () => {
        store.dispatch(BlockActions.subscribe({ networkId }));

        const expectedBlocks: { [key: string]: BlockHeader } = {};
        const subscription = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${networkId}-${block.number}`;
            expectedBlocks[id] = { ...block, networkId, id };
        });

        await sleep(2000);
        store.dispatch(BlockActions.unsubscribe({ networkId }));
        subscription.unsubscribe();
        await sleep(2000);

        const state = store.getState();
        assert.deepEqual(state.orm['Block'].itemsById, expectedBlocks);
    });

    it('store.dispatch(unsubscribe()) - multiple networks', async () => {
        const network1 = '1';
        const network2 = '2';
        store.dispatch(BlockActions.subscribe({ networkId: network1 }));
        store.dispatch(BlockActions.subscribe({ networkId: network2 }));

        const expectedBlocks1: { [key: string]: BlockHeader } = {};
        const subscription1 = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${network1}-${block.number}`;
            expectedBlocks1[id] = { ...block, networkId: network1, id };
        });

        const expectedBlocks2: { [key: string]: BlockHeader } = {};
        const subscription2 = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${network2}-${block.number}`;
            expectedBlocks2[id] = { ...block, networkId: network2, id };
        });

        await sleep(2000);
        store.dispatch(BlockActions.unsubscribe({ networkId: network1 }));
        subscription1.unsubscribe();
        let state = store.getState();
        assert.deepEqual(state.orm['Block'].itemsById, { ...expectedBlocks1, ...expectedBlocks2 });

        await sleep(2000);
        store.dispatch(BlockActions.unsubscribe({ networkId: network2 }));
        subscription2.unsubscribe();
        state = store.getState();
        assert.deepEqual(state.orm['Block'].itemsById, { ...expectedBlocks1, ...expectedBlocks2 });
    });
});
