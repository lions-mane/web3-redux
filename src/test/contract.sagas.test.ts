import { assert } from 'chai';
import Web3 from 'web3';
import { Contract as Web3Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import ganache from 'ganache-core';

import BlockNumber from '../abis/BlockNumber.json';

import { createStore } from '../store';
import { BlockActions, ContractActions, ContractSelector, NetworkActions, TransactionActions } from '../index';
import { sleep, sleepForPort } from '../utils';
import { TransactionReceipt } from 'web3-core';
import { CALL_BLOCK_SYNC, CALL_TRANSACTION_SYNC, eventId } from '../contract/model';

const networkId = '1337';

describe('contract.sagas', () => {
    let web3: Web3; //Web3 loaded from store
    let accounts: string[];
    let store: ReturnType<typeof createStore>;
    let web3Contract: Web3Contract;

    before(async () => {
        const networkIdInt = parseInt(networkId);
        const server = ganache.server({
            port: 0,
            networkId: networkIdInt,
            blockTime: 1,
        });
        const port = await sleepForPort(server, 1000);
        const rpc = `ws://localhost:${port}`;
        web3 = new Web3(rpc);
        accounts = await web3.eth.getAccounts();
        web3.eth.defaultAccount = accounts[0];
    });

    beforeEach(async () => {
        store = createStore();
        store.dispatch(NetworkActions.create({ networkId, web3 }));

        const tx = new web3.eth.Contract(BlockNumber.abi as AbiItem[]).deploy({
            data: BlockNumber.bytecode,
        });
        const gas = await tx.estimateGas();
        web3Contract = await tx.send({ from: accounts[0], gas, gasPrice: '10000' });
    });

    it('store.dispatch(ContractSagas.callSynced({sync:false}))', async () => {
        const tx2 = await web3Contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        store.dispatch(
            ContractActions.create({
                networkId,
                address: web3Contract.options.address,
                abi: BlockNumber.abi as AbiItem[],
            }),
        );
        store.dispatch(
            ContractActions.callSynced({
                networkId,
                address: web3Contract.options.address,
                method: 'getValue',
                sync: false,
            }),
        );
        await sleep(100);

        const contractId = `${networkId}-${web3Contract.options.address}`;

        //Selector
        const value = ContractSelector.selectContractCall(store.getState(), contractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        assert.equal(value, 42, 'getValue');
        assert.strictEqual(value, '42', 'getValue');
    });

    it('store.dispatch(ContractSagas.callSynced({sync:CALL_BLOCK_SYNC}))', async () => {
        //Block subsciption used for updates
        store.dispatch(BlockActions.subscribe({ networkId, returnTransactionObjects: false }));
        store.dispatch(
            ContractActions.create({
                networkId,
                address: web3Contract.options.address,
                abi: BlockNumber.abi as AbiItem[],
            }),
        );
        store.dispatch(
            ContractActions.callSynced({
                networkId,
                address: web3Contract.options.address,
                method: 'blockNumber',
                sync: CALL_BLOCK_SYNC,
            }),
        );
        await sleep(2000);

        const contractId = `${networkId}-${web3Contract.options.address}`;

        const blockNumber1 = ContractSelector.selectContractCall(store.getState(), contractId, 'blockNumber', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        await sleep(2000);
        const blockNumber2 = ContractSelector.selectContractCall(store.getState(), contractId, 'blockNumber', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        assert.isAtLeast(parseInt(blockNumber2), parseInt(blockNumber1) + 1);
    });

    it('store.dispatch(ContractSagas.callSynced({sync:CALL_TRANSACTION_SYNC})) - TransactionActions.fetch', async () => {
        const tx2 = await web3Contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        store.dispatch(
            ContractActions.create({
                networkId,
                address: web3Contract.options.address,
                abi: BlockNumber.abi as AbiItem[],
            }),
        );
        store.dispatch(
            ContractActions.callSynced({
                networkId,
                address: web3Contract.options.address,
                method: 'getValue',
                sync: CALL_TRANSACTION_SYNC,
            }),
        );
        await sleep(2000);

        const contractId = `${networkId}-${web3Contract.options.address}`;

        const value1 = ContractSelector.selectContractCall(store.getState(), contractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.equal(value1, 42);

        //Send transaction to contract, triggering a refresh
        const tx3 = await web3Contract.methods.setValue(666);
        const gas3 = await tx3.estimateGas();
        const receipt: TransactionReceipt = await tx3.send({ from: accounts[0], gas: gas3, gasPrice: '10000' });
        //Fetch transaction, triggering a refresh
        store.dispatch(
            TransactionActions.fetch({
                networkId,
                hash: receipt.transactionHash,
            }),
        );

        //Updated from transaction sync
        await sleep(2000);
        const value2 = ContractSelector.selectContractCall(store.getState(), contractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.equal(value2, 666);
    });

    it('store.dispatch(ContractSagas.callSynced({sync:CALL_TRANSACTION_SYNC})) - BlockActions.subscribe', async () => {
        //Block subsciption used for updates, must fetch transactions
        store.dispatch(BlockActions.subscribe({ networkId, returnTransactionObjects: true }));
        const tx2 = await web3Contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        store.dispatch(
            ContractActions.create({
                networkId,
                address: web3Contract.options.address,
                abi: BlockNumber.abi as AbiItem[],
            }),
        );
        store.dispatch(
            ContractActions.callSynced({
                networkId,
                address: web3Contract.options.address,
                method: 'getValue',
                sync: CALL_TRANSACTION_SYNC,
            }),
        );
        await sleep(2000);

        const contractId = `${networkId}-${web3Contract.options.address}`;

        const value1 = ContractSelector.selectContractCall(store.getState(), contractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.equal(value1, 42);

        //Send transaction to contract, triggering a refresh
        const tx3 = await web3Contract.methods.setValue(666);
        const gas3 = await tx3.estimateGas();
        await tx3.send({ from: accounts[0], gas: gas3, gasPrice: '10000' });

        //Updated from transaction sync
        await sleep(2000);
        const value2 = ContractSelector.selectContractCall(store.getState(), contractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.equal(value2, 666);
    });

    it('store.dispatch(ContractSagas.send())', async () => {
        store.dispatch(
            ContractActions.create({
                networkId,
                address: web3Contract.options.address,
                abi: BlockNumber.abi as AbiItem[],
            }),
        );

        store.dispatch(
            ContractActions.send({
                networkId,
                address: web3Contract.options.address,
                method: 'setValue',
                args: [42],
            }),
        );

        await sleep(2000);

        const value = await web3Contract.methods.getValue().call();
        assert.equal(value, 42, 'setValue() did not work!');
    });

    it('store.dispatch(ContractSagas.eventSubscribe())', async (): Promise<void> => {
        store.dispatch(
            ContractActions.create({
                networkId,
                address: web3Contract.options.address,
                abi: BlockNumber.abi as AbiItem[],
            }),
        );

        const expectedEvents: any = {};
        web3Contract.events['NewValue']().on('data', (event: any) => {
            expectedEvents[eventId(event)] = event;
        });
        store.dispatch(
            ContractActions.eventSubscribe({
                networkId,
                address: web3Contract.options.address,
                eventName: 'NewValue',
            }),
        );

        const tx2 = await web3Contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        const contractSel = ContractSelector.selectSingle(
            store.getState(),
            `${networkId}-${web3Contract.options.address}`,
        );

        assert.deepEqual(contractSel!.events!.NewValue, expectedEvents);
    });
});
