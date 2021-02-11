import { assert } from 'chai';
import { before } from 'mocha';
import { put } from 'redux-saga/effects';
import Web3 from 'web3';
import dotenv from 'dotenv';
import BlockNumber from './abis/BlockNumber.json';

import * as BlockActions from './block/actions';
import * as ContractActions from './contract/actions';
import * as TransactionActions from './transaction/actions';
import * as BlockSagas from './block/sagas';
import * as BlockSelector from './block/selector';
import * as ContractSelector from './contract/selector';
//import * as TransactionSelector from './transaction/selector';
import { createStore } from './store';
import { Block, BlockHeader, BlockTransaction, BlockTransactionObject, BlockTransactionString } from './block/model';
import { web3ForNetworkId } from './utils';
import { AbiItem } from 'web3-utils';
import { CALL_BLOCK_SYNC, CALL_TRANSACTION_SYNC, Contract } from './contract/model';
import { TransactionReceipt } from 'web3-eth';

function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

const networkId = '1337';

describe('sagas', () => {
    let web3: Web3;
    let accounts: string[];
    let store: ReturnType<typeof createStore>;

    before(async () => {
        dotenv.config();
        web3 = web3ForNetworkId(networkId);
        accounts = await web3.eth.getAccounts();
        web3.eth.defaultAccount = accounts[0];
    });

    beforeEach(() => {
        store = createStore();
    });

    it('BlockSagas.fetch({returnTransactionObjects:false})', async () => {
        const gen = BlockSagas.fetch(BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest' }));
        const block = await web3.eth.getBlock('latest');
        const expectedBlock: BlockTransactionString = { ...block, networkId, id: `${networkId}-${block.number}` };
        const expectedPutBlockAction = put(BlockActions.create(expectedBlock));

        gen.next();
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

        gen.next();
        const putBlock = gen.next(expectedBlock).value;
        assert.deepEqual(putBlock, expectedPutBlockAction);
    });

    it('store.dispatch(BlockActions.fetch({returnTransactionObjects:false}))', async () => {
        store.dispatch(BlockActions.fetch({ networkId, blockHashOrBlockNumber: 'latest' }));
        const block = await web3.eth.getBlock('latest');
        const expectedBlock: Block = { ...block, networkId, id: `${networkId}-${block.number}` };

        await sleep(100);

        const state = store.getState();

        const expectedBlockSelected = [expectedBlock];
        //@ts-ignore
        delete expectedBlock.transactions;
        const expectedBlockState = {
            [expectedBlock.id!]: expectedBlock,
        };

        assert.deepEqual(state.orm['Block'].itemsById, expectedBlockState, 'state.orm.Block.itemsById');
        assert.deepEqual(BlockSelector.select(state), expectedBlockSelected, 'Block.selectWithId');
        //assert.deepEqual(BlockSelector.selectTransactions(state), expectedBlockTransactionsSelected, 'Block.selectTransactions');
    });

    it('store.dispatch(BlockActions.subscribe())', async () => {
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
        const state = store.getState();
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
        const blocks = (BlockSelector.selectBlockTransaction(state) as BlockTransaction[]).reduce((acc, block) => {
            return { ...acc, [block.id!]: block };
        }, {});
        assert.deepEqual(blocks, expectedBlocks);
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
        const blockState = state.orm['Block'].itemsById;
        assert.deepEqual(blockState, expectedBlocks);
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

    it('store.dispatch(ContractSagas.call())', async () => {
        //Block subsciption used for updates
        store.dispatch(BlockActions.subscribe({ networkId }));
        const tx = new web3.eth.Contract(BlockNumber.abi as AbiItem[]).deploy({
            data: BlockNumber.bytecode,
        });
        const gas = await tx.estimateGas();
        const contract = await tx.send({ from: accounts[0], gas, gasPrice: '10000' });

        store.dispatch(
            ContractActions.create({ networkId, address: contract.options.address, abi: BlockNumber.abi as AbiItem[] }),
        );
        store.dispatch(
            ContractActions.call({
                networkId,
                address: contract.options.address,
                method: 'blockNumber',
                sync: false,
            }),
        );
        await sleep(2000);

        //@ts-ignore
        const contractSel: Contract = ContractSelector.select(
            store.getState(),
            //@ts-ignore
            `${networkId}-${contract.options.address}`,
        );
        const blockNumberKey = `().call(latest,{"from":"${accounts[0]}"})`;
        const blockNumber1 = contractSel.methods!.blockNumber[blockNumberKey].value;
        await sleep(2000);
        const blockNumber2 = contractSel.methods!.blockNumber[blockNumberKey].value;
        assert.equal(blockNumber1, blockNumber2);
    });

    it('store.dispatch(ContractSagas.call({sync:CALL_BLOCK_SYNC}))', async () => {
        //Block subsciption used for updates
        store.dispatch(BlockActions.subscribe({ networkId }));
        const tx = new web3.eth.Contract(BlockNumber.abi as AbiItem[]).deploy({
            data: BlockNumber.bytecode,
        });
        const gas = await tx.estimateGas();
        const contract = await tx.send({ from: accounts[0], gas, gasPrice: '10000' });

        store.dispatch(
            ContractActions.create({ networkId, address: contract.options.address, abi: BlockNumber.abi as AbiItem[] }),
        );
        store.dispatch(
            ContractActions.call({
                networkId,
                address: contract.options.address,
                method: 'blockNumber',
                sync: CALL_BLOCK_SYNC,
            }),
        );
        await sleep(2000);

        //@ts-ignore
        const contractSel: Contract = ContractSelector.select(
            store.getState(),
            //@ts-ignore
            `${networkId}-${contract.options.address}`,
        );
        const blockNumberKey = `().call(latest,{"from":"${accounts[0]}"})`;
        const blockNumber1 = contractSel.methods!.blockNumber[blockNumberKey].value;
        await sleep(2000);
        const blockNumber2 = contractSel.methods!.blockNumber[blockNumberKey].value;
        assert.notEqual(blockNumber1, blockNumber2);
    });

    it('store.dispatch(ContractSagas.call({sync:CALL_TRANSACTION_SYNC}))', async () => {
        const tx1 = new web3.eth.Contract(BlockNumber.abi as AbiItem[]).deploy({
            data: BlockNumber.bytecode,
        });
        const gas1 = await tx1.estimateGas();
        const contract = await tx1.send({ from: accounts[0], gas: gas1, gasPrice: '10000' });
        const tx2 = await contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        store.dispatch(
            ContractActions.create({ networkId, address: contract.options.address, abi: BlockNumber.abi as AbiItem[] }),
        );
        store.dispatch(
            ContractActions.call({
                networkId,
                address: contract.options.address,
                method: 'getValue',
                sync: CALL_TRANSACTION_SYNC,
            }),
        );
        await sleep(2000);

        //@ts-ignore
        const contractSel: Contract = ContractSelector.select(
            store.getState(),
            //@ts-ignore
            `${networkId}-${contract.options.address}`,
        );
        const valueKey = `().call(latest,{"from":"${accounts[0]}"})`;
        const value1 = contractSel.methods!.getValue[valueKey].value;
        assert.equal(value1, 42);

        const tx3 = await contract.methods.setValue(666);
        const gas3 = await tx3.estimateGas();
        const receipt: TransactionReceipt = await tx3.send({ from: accounts[0], gas: gas3, gasPrice: '10000' });
        store.dispatch(
            TransactionActions.fetch({
                networkId,
                hash: receipt.transactionHash,
            }),
        );

        //Updated from transaction sync
        await sleep(2000);
        const value2 = contractSel.methods!.getValue[valueKey].value;
        assert.equal(value2, 666);
    });
});
