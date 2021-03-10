import { assert } from 'chai';
import Web3 from 'web3';
import ganache from 'ganache-core';

import { createStore } from '../store';
import { Network, Block } from '../index';
import { ganacheLogger, mineBlock } from './utils';
import { validatedBlock } from '../block';

const networkId = '1337';

describe('block.sagas', () => {
    let web3: Web3; //Web3 loaded from store
    let accounts: string[];
    let store: ReturnType<typeof createStore>;
    let rpcLogger: ReturnType<typeof ganacheLogger>;
    let ethGetBlockByNumber = 0;
    let ethSubscribe = 0;
    let ethUnsubscribe = 0;

    before(async () => {
        const networkIdInt = parseInt(networkId);
        rpcLogger = ganacheLogger();

        const provider = ganache.provider({
            networkId: networkIdInt,
            logger: rpcLogger,
            verbose: true,
        });
        //@ts-ignore
        web3 = new Web3(provider);
        accounts = await web3.eth.getAccounts();

        const ethGetBlockByNumberIncr = () => (ethGetBlockByNumber += 1);
        const ethSubscribeIncr = () => (ethSubscribe += 1);
        const ethUnsubscribeIncr = () => (ethUnsubscribe += 1);
        rpcLogger.addListener('eth_getBlockByNumber', ethGetBlockByNumberIncr);
        rpcLogger.addListener('eth_subscribe', ethSubscribeIncr);
        rpcLogger.addListener('eth_unsubscribe', ethUnsubscribeIncr);
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
        const ethGetBlockByNumberInitial = ethGetBlockByNumber;

        await mineBlock(web3);
        store.dispatch(Block.fetch({ networkId, blockHashOrBlockNumber: 'latest', returnTransactionObjects: false }));

        const latestBlock = await web3.eth.getBlock('latest');
        const expectedBlocks: Block.BlockHeader[] = [validatedBlock({ ...latestBlock, networkId })];
        //@ts-ignore
        delete expectedBlocks[0].transactions;

        const blocks = Block.selectMany(store.getState());
        assert.deepEqual(blocks, expectedBlocks, 'Block.selectMany');
        //Count rpc calls since test began
        assert.equal(ethGetBlockByNumber - ethGetBlockByNumberInitial, 2, 'eth_getBlockByNumber rpc calls != expected');
    });

    it('store.dispatch(Block.subscribe({returnTransactionObjects:false}))', async () => {
        const ethGetBlockByNumberInitial = ethGetBlockByNumber;
        const ethSubscribeInitial = ethSubscribe;
        //let ethUnsubscribeInitial = ethUnsubscribe;

        store.dispatch(Block.subscribe({ networkId, returnTransactionObjects: false }));

        const expectedBlocks: Block.BlockHeader[] = [];
        const subscription = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            expectedBlocks.push(validatedBlock({ ...block, networkId }));
        });

        await mineBlock(web3);
        await mineBlock(web3);
        store.dispatch(Block.unsubscribe({ networkId }));
        subscription.unsubscribe();
        //Block ignored
        await mineBlock(web3);

        const blocks = Block.selectMany(store.getState());
        assert.equal(blocks.length, 2, 'blocks.length != expected');
        assert.deepEqual(blocks, expectedBlocks);
        assert.equal(ethSubscribe - ethSubscribeInitial, 2, 'eth_subscribe rpc calls != expected');
        //assert.equal(ethUnsubscribe - ethUnsubscribeInitial, 2, 'eth_unsubscribe rpc calls != expected')
        //No getBlockByNumber calls as relying on subscription
        assert.equal(ethGetBlockByNumber - ethGetBlockByNumberInitial, 0, 'eth_getBlockByNumber rpc calls != expected');
    });

    it('store.dispatch(Block.subscribe({returnTransactionObjects:true})', async () => {
        const ethGetBlockByNumberInitial = ethGetBlockByNumber;
        const ethSubscribeInitial = ethSubscribe;
        //let ethUnsubscribeInitial = ethUnsubscribe;

        store.dispatch(Block.subscribe({ networkId, returnTransactionObjects: true }));

        const expectedBlocksPromise: Promise<Block.BlockTransactionObject>[] = [];
        const subscription = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            //@ts-ignore
            expectedBlocksPromise.push(web3.eth.getBlock(block.number, true));
        });

        //Sending a transactions also mines a block
        await web3.eth.sendTransaction({ from: accounts[0], to: accounts[0], value: '100' });
        await mineBlock(web3);
        store.dispatch(Block.unsubscribe({ networkId }));
        subscription.unsubscribe();
        //Block ignored
        await mineBlock(web3);

        const expectedBlocks = (await Promise.all(expectedBlocksPromise)).map(b =>
            validatedBlock({ ...b, networkId }),
        ) as Block.BlockTransaction[];

        const blocks = Block.selectManyBlockTransaction(store.getState());
        assert.equal(blocks.length, 2, 'blocks.length != expected');
        assert.deepEqual(blocks, expectedBlocks);
        assert.equal(ethSubscribe - ethSubscribeInitial, 2, 'eth_subscribe rpc calls != expected');
        //assert.equal(ethUnsubscribe - ethUnsubscribeInitial, 2, 'eth_unsubscribe rpc calls != expected')
        //No getBlockByNumber calls as relying on subscription
        assert.equal(
            ethGetBlockByNumber - ethGetBlockByNumberInitial,
            Object.keys(blocks).length + Object.keys(expectedBlocks).length,
            'eth_getBlockByNumber rpc calls != expected',
        );
    });

    it('store.dispatch(Block.subscribe) - multiple networks', async () => {
        const ethGetBlockByNumberInitial = ethGetBlockByNumber;
        const ethSubscribeInitial = ethSubscribe;

        const network1 = networkId;
        const network2 = '1338';
        const provider2 = ganache.provider({
            blockTime: 1,
            networkId: 1338,
        });
        //@ts-ignore
        const web3Network2 = new Web3(provider2);

        store.dispatch(Network.create({ networkId: network1, web3 }));
        store.dispatch(Network.create({ networkId: network2, web3: web3Network2 }));
        store.dispatch(Block.subscribe({ networkId: network1, returnTransactionObjects: false }));
        store.dispatch(Block.subscribe({ networkId: network2, returnTransactionObjects: false }));

        const expectedBlocks1: Block.BlockHeader[] = [];
        const subscription1 = web3.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            expectedBlocks1.push(validatedBlock({ ...block, networkId: network1 }));
        });

        const expectedBlocks2: Block.BlockHeader[] = [];
        const subscription2 = web3Network2.eth.subscribe('newBlockHeaders').on('data', (block: any) => {
            expectedBlocks2.push(validatedBlock({ ...block, networkId: network2 }));
        });

        await mineBlock(web3);
        await mineBlock(web3Network2);

        store.dispatch(Block.unsubscribe({ networkId: network1 }));
        subscription1.unsubscribe();

        let blocks = Block.selectMany(store.getState());
        assert.equal(blocks.length, 2, 'blocks.length != expected');
        assert.deepEqual(blocks, [...expectedBlocks1, ...expectedBlocks2]);

        await mineBlock(web3); //Ignored as subscription closed
        await mineBlock(web3Network2);

        store.dispatch(Block.unsubscribe({ networkId: network2 }));
        subscription2.unsubscribe();

        blocks = Block.selectMany(store.getState());
        assert.equal(blocks.length, 3, 'blocks.length != expected');
        assert.deepEqual(blocks, [...expectedBlocks1, ...expectedBlocks2]);

        //Rpc calls for network1 node ONLY
        assert.equal(ethSubscribe - ethSubscribeInitial, 2, 'eth_subscribe rpc calls != expected');
        assert.equal(ethGetBlockByNumber - ethGetBlockByNumberInitial, 0, 'eth_getBlockByNumber rpc calls != expected');
    });
});
