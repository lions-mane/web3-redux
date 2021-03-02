import { assert } from 'chai';
import Web3 from 'web3';
import { Contract as Web3Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import ganache from 'ganache-core';

import BlockNumber from './abis/BlockNumber.json';
import Multicall from '../abis/Multicall.json';

import { createStore } from '../store';
import { Block, Contract, Network, Transaction } from '../index';
import { TransactionReceipt } from 'web3-core';
import { CALL_BLOCK_SYNC, CALL_TRANSACTION_SYNC, contractId, eventId } from '../contract/model';
import { mineBlock, sleep, ganacheLogger } from './utils';

const networkId = '1337';

describe('contract.sagas', () => {
    let web3: Web3; //Web3 loaded from store
    let accounts: string[];
    let store: ReturnType<typeof createStore>;
    let web3Contract: Web3Contract;
    let testContractId: string;
    let rpcLogger: ReturnType<typeof ganacheLogger>;

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
        web3.eth.defaultAccount = accounts[0];
    });

    beforeEach(async () => {
        store = createStore();
        store.dispatch(Network.create({ networkId, web3 }));

        const tx = new web3.eth.Contract(BlockNumber.abi as AbiItem[]).deploy({
            data: BlockNumber.bytecode,
        });
        const gas = await tx.estimateGas();
        web3Contract = await tx.send({ from: accounts[0], gas, gasPrice: '10000' });
        testContractId = contractId({ networkId, address: web3Contract.options.address });

        store.dispatch(
            Contract.create({
                networkId,
                address: web3Contract.options.address,
                abi: BlockNumber.abi as AbiItem[],
            }),
        );
    });

    it('store.dispatch(ContractSagas.call())', async () => {
        const tx2 = await web3Contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        store.dispatch(
            Contract.create({
                networkId,
                address: web3Contract.options.address,
                abi: BlockNumber.abi as AbiItem[],
            }),
        );
        store.dispatch(
            Contract.call({
                networkId,
                address: web3Contract.options.address,
                method: 'getValue',
            }),
        );
        await sleep(100);

        //Selector
        const value = Contract.selectContractCall(store.getState(), testContractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        assert.equal(value, 42, 'getValue');
        assert.strictEqual(value, '42', 'getValue');
    });

    it('store.dispatch(Contract.callBatched())', async () => {
        const tx2 = await web3Contract.methods.setValue(42);
        await tx2.send({ from: accounts[0], gas: await tx2.estimateGas() });
        await sleep(100);

        const expectedBlockNumber = await web3.eth.getBlockNumber();

        const ethCall1 = {
            address: web3Contract.options.address,
            method: 'getValue',
        };
        const ethCall2 = {
            address: web3Contract.options.address,
            method: 'blockNumber',
        };
        store.dispatch(Contract.callBatched({ networkId, requests: [ethCall1, ethCall2] }));
        await sleep(100);

        //Selector
        const getValue = Contract.selectContractCall(store.getState(), testContractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        const blockNumber = Contract.selectContractCall(store.getState(), testContractId, 'blockNumber', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        assert.equal(getValue, 42, 'getValue');
        assert.equal(blockNumber, expectedBlockNumber, 'blockNumber');
    });

    it('store.dispatch(Contract.callBatched(multicall:true))', async () => {
        const tx2 = await web3Contract.methods.setValue(42);
        await tx2.send({ from: accounts[0], gas: await tx2.estimateGas() });
        await sleep(100);

        const tx3 = new web3.eth.Contract(Multicall.abi as AbiItem[]).deploy({
            data: Multicall.bytecode,
        });
        const gas3 = await tx3.estimateGas();
        const multiCallContract = await tx3.send({ from: accounts[0], gas: gas3, gasPrice: '10000' });
        store.dispatch(Network.create({ networkId, web3, multicallAddress: multiCallContract.options.address }));
        await sleep(100);

        const expectedBlockNumber = await web3.eth.getBlockNumber();

        const ethCall1 = {
            address: web3Contract.options.address,
            method: 'getValue',
        };
        const ethCall2 = {
            address: web3Contract.options.address,
            method: 'blockNumber',
        };
        store.dispatch(Contract.callBatched({ networkId, requests: [ethCall1, ethCall2] }));
        await sleep(100);

        //Selector
        const getValue = Contract.selectContractCall(store.getState(), testContractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        const blockNumber = Contract.selectContractCall(store.getState(), testContractId, 'blockNumber', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        assert.equal(getValue, 42, 'getValue');
        assert.equal(blockNumber, expectedBlockNumber, 'blockNumber');
    });

    it('store.dispatch(ContractSagas.callSynced({sync:false}))', async () => {
        const tx2 = await web3Contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        store.dispatch(
            Contract.callSynced({
                networkId,
                address: web3Contract.options.address,
                method: 'getValue',
                sync: false,
            }),
        );
        await sleep(100);

        //Selector
        const value = Contract.selectContractCall(store.getState(), testContractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        assert.equal(value, 42, 'getValue');
        assert.strictEqual(value, '42', 'getValue');
    });

    it('store.dispatch(ContractSagas.callSynced({sync:CALL_BLOCK_SYNC}))', async () => {
        //Block subsciption used for updates
        store.dispatch(Block.subscribe({ networkId, returnTransactionObjects: false }));
        store.dispatch(
            Contract.callSynced({
                networkId,
                address: web3Contract.options.address,
                method: 'blockNumber',
                sync: CALL_BLOCK_SYNC,
            }),
        );
        await sleep(100);

        const blockNumber1 = Contract.selectContractCall(store.getState(), testContractId, 'blockNumber', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        //Increment block
        await mineBlock(web3);

        const blockNumber2 = Contract.selectContractCall(store.getState(), testContractId, 'blockNumber', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        assert.equal(parseInt(blockNumber2), parseInt(blockNumber1) + 1);
    });

    it('store.dispatch(ContractSagas.callSynced({sync:CALL_TRANSACTION_SYNC})) - Transaction.fetch', async () => {
        const tx2 = await web3Contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        store.dispatch(
            Contract.callSynced({
                networkId,
                address: web3Contract.options.address,
                method: 'getValue',
                sync: CALL_TRANSACTION_SYNC,
            }),
        );
        await sleep(100);

        const value1 = Contract.selectContractCall(store.getState(), testContractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.equal(value1, 42);

        //Send transaction to contract, triggering a refresh
        const tx3 = await web3Contract.methods.setValue(666);
        const gas3 = await tx3.estimateGas();
        const receipt: TransactionReceipt = await tx3.send({ from: accounts[0], gas: gas3, gasPrice: '10000' });
        //Fetch transaction, triggering a refresh
        store.dispatch(
            Transaction.fetch({
                networkId,
                hash: receipt.transactionHash,
            }),
        );

        //Updated from transaction sync
        await sleep(100);
        const value2 = Contract.selectContractCall(store.getState(), testContractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.equal(value2, 666);
    });

    it('store.dispatch(ContractSagas.callSynced({sync:CALL_TRANSACTION_SYNC})) - Block.subscribe', async () => {
        //Block subsciption used for updates, must fetch transactions
        store.dispatch(Block.subscribe({ networkId, returnTransactionObjects: true }));
        const tx2 = await web3Contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        store.dispatch(
            Contract.callSynced({
                networkId,
                address: web3Contract.options.address,
                method: 'getValue',
                sync: CALL_TRANSACTION_SYNC,
            }),
        );
        await sleep(100);

        const value1 = Contract.selectContractCall(store.getState(), testContractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.equal(value1, 42);

        //Send transaction to contract, triggering a refresh
        const tx3 = await web3Contract.methods.setValue(666);
        const gas3 = await tx3.estimateGas();
        await tx3.send({ from: accounts[0], gas: gas3, gasPrice: '10000' });

        //Updated from transaction sync
        await sleep(100);
        const value2 = Contract.selectContractCall(store.getState(), testContractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.equal(value2, 666);
    });

    it('store.dispatch(ContractSagas.send())', async () => {
        store.dispatch(
            Contract.send({
                networkId,
                address: web3Contract.options.address,
                method: 'setValue',
                args: [42],
            }),
        );

        await sleep(100);

        const value = await web3Contract.methods.getValue().call();
        assert.equal(value, 42, 'setValue() did not work!');
    });

    it('store.dispatch(ContractSagas.eventSubscribe())', async (): Promise<void> => {
        const expectedEvents: any = {};
        web3Contract.events['NewValue']().on('data', (event: any) => {
            expectedEvents[eventId(event)] = event;
        });
        store.dispatch(
            Contract.eventSubscribe({
                networkId,
                address: web3Contract.options.address,
                eventName: 'NewValue',
            }),
        );

        const tx2 = await web3Contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        const contractSel = Contract.selectSingle(store.getState(), testContractId);

        assert.deepEqual(contractSel!.events!.NewValue, expectedEvents);
    });
});
