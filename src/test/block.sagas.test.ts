import { assert } from 'chai';
import { before } from 'mocha';
import Web3 from 'web3';
import dotenv from 'dotenv';
import ganache from 'ganache-core';

import { createStore } from '../store';
import {
    Network,
    Block,
    BlockHeader,
    BlockTransaction,
    BlockTransactionObject,
    NetworkActions,
    BlockActions,
    NetworkSelector,
    BlockSelector,
} from '../index';
import { sleep, sleepForPort } from '../utils';

const networkId = '1337';

describe('block.sagas', () => {
    let web3Default: Web3;
    let web3: Web3; //Web3 loaded from store
    let accounts: string[];
    let store: ReturnType<typeof createStore>;

    before(async () => {
        dotenv.config();
        const networkIdInt = parseInt(networkId);
        const server = ganache.server({
            port: 0,
            networkId: networkIdInt,
            blockTime: 1,
        });
        const port = await sleepForPort(server, 1000);
        const rpc = `ws://localhost:${port}`;
        web3Default = new Web3(rpc);
        accounts = await web3Default.eth.getAccounts();
        web3Default.eth.defaultAccount = accounts[0];
    });

    beforeEach(async () => {
        store = createStore();
        store.dispatch(NetworkActions.create({ networkId, web3: web3Default }));
        const network: Network = NetworkSelector.selectSingle(store.getState(), networkId) as Network;
        if (!network)
            throw new Error(
                `Could not find Network with id ${networkId}. Make sure to dispatch a Network/CREATE action.`,
            );
        web3 = network.web3;
    });

    /*
    it('BlockSagas.fetch({returnTransactionObjects:false})', async () => {
        const gen = BlockSagas.fetch(BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest' }));
        const block = await web3.eth.getBlock('latest');
        const expectedBlock: BlockTransactionString = { ...block, networkId, id: `${networkId}-${block.number}` };
        const expectedPutBlockAction = put(BlockActions.create(expectedBlock));

        gen.next(); //select web3 TODO: pass mock state
        gen.next(); //call web3
        //@ts-ignore
        const putBlock = gen.next(expectedBlock).value;
        assert.deepEqual(putBlock, expectedPutBlockAction);
    });

    it('BlockSagas.fetch({returnTransactionObjects:true})', async () => {
        const gen = BlockSagas.fetch(
            BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest', returnTransactionObjects: true }),
        );
        const block = await web3.eth.getBlock('latest', true);
        //@ts-ignore
        const expectedBlock: BlockTransactionObject = { ...block, networkId, id: `${networkId}-${block.number}` };
        const expectedPutBlockAction = put(BlockActions.create(expectedBlock));

        gen.next(); //select web3 TODO: pass mock state
        gen.next(); //call web3
        //@ts-ignore
        const putBlock = gen.next(expectedBlock).value;
        assert.deepEqual(putBlock, expectedPutBlockAction);
    });
    */

    it('store.dispatch(BlockActions.fetch({returnTransactionObjects:false}))', async () => {
        store.dispatch(
            BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest', returnTransactionObjects: false }),
        );
        const block = await web3.eth.getBlock('latest');
        const expectedBlock: Block = { ...block, networkId, id: `${networkId}-${block.number}` };

        await sleep(100);

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
        assert.deepEqual(BlockSelector.selectMany(store.getState()), expectedBlockSelected, 'Block.selectWithId');
        //assert.deepEqual(BlockSelector.selectTransactions(state), expectedBlockTransactionsSelected, 'Block.selectTransactions');
    });

    it('store.dispatch(BlockActions.subscribe({returnTransactionObjects:false}))', async () => {
        store.dispatch(BlockActions.subscribe({ networkId, returnTransactionObjects: false }));

        const expectedBlocks: { [key: string]: BlockHeader } = {};
        web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${networkId}-${block.number}`;
            expectedBlocks[id] = { ...block, networkId, id };
        });

        await sleep(2000);

        assert.deepEqual(store.getState().web3Redux['Block'].itemsById, expectedBlocks);
    });

    it('store.dispatch(BlockActions.subscribe({returnTransactionObjects:true})', async () => {
        store.dispatch(BlockActions.subscribe({ networkId, returnTransactionObjects: true }));

        const expectedBlocksPromise: Promise<BlockTransactionObject>[] = [];
        const subscription = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            //@ts-ignore
            expectedBlocksPromise.push(web3.eth.getBlock(block.number, true));
        });

        await web3.eth.sendTransaction({ from: accounts[0], to: accounts[0], value: '100' });
        await sleep(2000);

        subscription.unsubscribe();

        const expectedBlocks = (await Promise.all(expectedBlocksPromise))
            .map(block => {
                const id = `${networkId}-${block.number}`;
                block.transactions = block.transactions.map(tx => {
                    return { ...tx, networkId, blockId: id, id: `${networkId}-${tx.hash}` };
                });
                block.networkId = networkId;
                block.id = id;
                return block;
            })
            .reduce((acc, block) => {
                return { ...acc, [block.id!]: block };
            }, {});
        const blocks = (BlockSelector.selectManyBlockTransaction(store.getState()) as BlockTransaction[]).reduce(
            (acc, block) => {
                return { ...acc, [block.id!]: block };
            },
            {},
        );
        assert.deepEqual(blocks, expectedBlocks);
    });

    it('store.dispatch(unsubscribe())', async () => {
        store.dispatch(BlockActions.subscribe({ networkId, returnTransactionObjects: false }));

        const expectedBlocks: { [key: string]: BlockHeader } = {};
        const subscription = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            const id = `${networkId}-${block.number}`;
            expectedBlocks[id] = { ...block, networkId, id };
        });

        await sleep(2000);
        store.dispatch(BlockActions.unsubscribe({ networkId }));
        subscription.unsubscribe();
        await sleep(2000);

        const blockState = store.getState().web3Redux['Block'].itemsById;
        assert.deepEqual(blockState, expectedBlocks);
    });

    it('store.dispatch(unsubscribe()) - multiple networks', async () => {
        const network1 = `${networkId}-1`;
        const network2 = `${networkId}-2`;
        store.dispatch(NetworkActions.create({ networkId: network1, web3: web3Default }));
        store.dispatch(NetworkActions.create({ networkId: network2, web3: web3Default }));
        store.dispatch(BlockActions.subscribe({ networkId: network1, returnTransactionObjects: false }));
        store.dispatch(BlockActions.subscribe({ networkId: network2, returnTransactionObjects: false }));

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
        assert.deepEqual(state.web3Redux['Block'].itemsById, { ...expectedBlocks1, ...expectedBlocks2 });

        await sleep(2000);
        store.dispatch(BlockActions.unsubscribe({ networkId: network2 }));
        subscription2.unsubscribe();
        state = store.getState();
        assert.deepEqual(state.web3Redux['Block'].itemsById, { ...expectedBlocks1, ...expectedBlocks2 });
    });
});
