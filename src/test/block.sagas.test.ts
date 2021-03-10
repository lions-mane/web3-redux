import { assert } from 'chai';
import Web3 from 'web3';
import ganache from 'ganache-core';

import { createStore } from '../store';
import { Network, Block, Transaction } from '../index';
import { mineBlock } from './utils';

const networkId = '1337';

describe('block.sagas', () => {
    let web3: Web3; //Web3 loaded from store
    let accounts: string[];
    let store: ReturnType<typeof createStore>;

    before(async () => {
        const networkIdInt = parseInt(networkId);
        const provider = ganache.provider({
            blockTime: 1,
            networkId: networkIdInt,
        });
        //@ts-ignore
        web3 = new Web3(provider);
        accounts = await web3.eth.getAccounts();
    });

    beforeEach(async () => {
        store = createStore();
        store.dispatch(Network.create({ networkId, web3 }));
    });

    /*
    it('BlockSagas.fetch({returnTransactionObjects:false})', async () => {
        const gen = BlockSagas.fetch(Block.fetch({ networkId, blockHashOrBlockNumber: 'latest' }));
        const block = await web3.eth.getBlock('latest');
        const expectedBlock: BlockTransactionString = { ...block, networkId, id: `${networkId}-${block.number}` };
        const expectedPutBlockAction = put(Block.create(expectedBlock));

        gen.next(); //select web3 TODO: pass mock state
        gen.next(); //call web3
        //@ts-ignore
        const putBlock = gen.next(expectedBlock).value;
        assert.deepEqual(putBlock, expectedPutBlockAction);
    });

    it('BlockSagas.fetch({returnTransactionObjects:true})', async () => {
        const gen = BlockSagas.fetch(
            Block.fetch({ networkId, blockHashOrBlockNumber: 'latest', returnTransactionObjects: true }),
        );
        const block = await web3.eth.getBlock('latest', true);
        //@ts-ignore
        const expectedBlock: BlockTransactionObject = { ...block, networkId, id: `${networkId}-${block.number}` };
        const expectedPutBlockAction = put(Block.create(expectedBlock));

        gen.next(); //select web3 TODO: pass mock state
        gen.next(); //call web3
        //@ts-ignore
        const putBlock = gen.next(expectedBlock).value;
        assert.deepEqual(putBlock, expectedPutBlockAction);
    });
    */

    it('store.dispatch(Block.fetch({returnTransactionObjects:false}))', async () => {
        await mineBlock(web3);
        store.dispatch(Block.fetch({ networkId, blockHashOrBlockNumber: 'latest', returnTransactionObjects: false }));
        const block = await web3.eth.getBlock('latest');
        const expectedBlock: Block.Block = { ...block, networkId, id: `${networkId}-${block.number}` };
        const expectedBlockSelected = [expectedBlock];
        //@ts-ignore
        delete expectedBlock.transactions;
        const expectedBlockState = {
            [expectedBlock.id!]: expectedBlock,
        };

        assert.deepEqual(
            store.getState().web3Redux['Block'].itemsById,
            expectedBlockState,
            'state.web3Redux.Block.itemsById',
        );
        assert.deepEqual(Block.selectMany(store.getState()), expectedBlockSelected, 'Block.selectWithId');
        //assert.deepEqual(Block.selectTransactions(state), expectedBlockTransactionsSelected, 'Block.selectTransactions');
    });

    it('store.dispatch(Block.subscribe({returnTransactionObjects:false}))', async () => {
        store.dispatch(Block.subscribe({ networkId, returnTransactionObjects: false }));

        const expectedBlocks: { [key: string]: Block.BlockHeader } = {};
        web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${networkId}-${block.number}`;
            expectedBlocks[id] = { ...block, networkId, id };
        });

        await mineBlock(web3);
        await mineBlock(web3);

        assert.deepEqual(store.getState().web3Redux['Block'].itemsById, expectedBlocks);
    });

    it('store.dispatch(Block.subscribe({returnTransactionObjects:true})', async () => {
        store.dispatch(Block.subscribe({ networkId, returnTransactionObjects: true }));

        const expectedBlocksPromise: Promise<Block.BlockTransactionObject>[] = [];
        const subscription = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            //@ts-ignore
            expectedBlocksPromise.push(web3.eth.getBlock(block.number, true));
        });

        await web3.eth.sendTransaction({ from: accounts[0], to: accounts[0], value: '100' });
        await mineBlock(web3);

        subscription.unsubscribe();

        const expectedBlocks = (await Promise.all(expectedBlocksPromise))
            .map(block => {
                const id = `${networkId}-${block.number}`;
                block.transactions = block.transactions.map(tx => {
                    return Transaction.validatedTransaction({ ...tx, networkId });
                });
                block.networkId = networkId;
                block.id = id;
                return block;
            })
            .reduce((acc, block) => {
                return { ...acc, [block.id!]: block };
            }, {});
        const blocks = (Block.selectManyBlockTransaction(store.getState()) as Block.BlockTransaction[]).reduce(
            (acc, block) => {
                return { ...acc, [block.id!]: block };
            },
            {},
        );
        assert.deepEqual(blocks, expectedBlocks);
    });

    it('store.dispatch(unsubscribe())', async () => {
        store.dispatch(Block.subscribe({ networkId, returnTransactionObjects: false }));

        const expectedBlocks: { [key: string]: Block.BlockHeader } = {};
        const subscription = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${networkId}-${block.number}`;
            expectedBlocks[id] = { ...block, networkId, id };
        });

        await mineBlock(web3);
        await mineBlock(web3);

        store.dispatch(Block.unsubscribe({ networkId }));
        subscription.unsubscribe();

        ///Block ignored
        await mineBlock(web3);

        const blockState = store.getState().web3Redux['Block'].itemsById;
        assert.deepEqual(blockState, expectedBlocks);
    });

    it('store.dispatch(unsubscribe()) - multiple networks', async () => {
        const network1 = networkId;
        const network2 = '2';
        const provider2 = ganache.provider({
            blockTime: 1,
            networkId: 2,
        });
        //@ts-ignore
        const web3Network2 = new Web3(provider2);

        store.dispatch(Network.create({ networkId: network1, web3 }));
        store.dispatch(Network.create({ networkId: network2, web3: web3Network2 }));
        store.dispatch(Block.subscribe({ networkId: network1, returnTransactionObjects: false }));
        store.dispatch(Block.subscribe({ networkId: network2, returnTransactionObjects: false }));

        const expectedBlocks1: { [key: string]: Block.BlockHeader } = {};
        const subscription1 = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${network1}-${block.number}`;
            expectedBlocks1[id] = { ...block, networkId: network1, id };
        });

        const expectedBlocks2: { [key: string]: Block.BlockHeader } = {};
        const subscription2 = web3Network2.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${network2}-${block.number}`;
            expectedBlocks2[id] = { ...block, networkId: network2, id };
        });

        await mineBlock(web3);
        await mineBlock(web3Network2);

        store.dispatch(Block.unsubscribe({ networkId: network1 }));
        subscription1.unsubscribe();
        let state = store.getState();
        assert.deepEqual(state.web3Redux['Block'].itemsById, { ...expectedBlocks1, ...expectedBlocks2 });

        await mineBlock(web3);
        await mineBlock(web3Network2);

        store.dispatch(Block.unsubscribe({ networkId: network2 }));
        subscription2.unsubscribe();
        state = store.getState();
        assert.deepEqual(state.web3Redux['Block'].itemsById, { ...expectedBlocks1, ...expectedBlocks2 });
    });
});
