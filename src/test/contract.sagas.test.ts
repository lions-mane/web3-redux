import { assert } from 'chai';
import { before } from 'mocha';
import Web3 from 'web3';
import { TransactionReceipt } from 'web3-eth';
import { AbiItem } from 'web3-utils';
import dotenv from 'dotenv';
import ganache from 'ganache-core';

import BlockNumber from '../abis/BlockNumber.json';

import { createStore } from '../store';
import {
    Network,
    eventId,
    CALL_BLOCK_SYNC,
    CALL_TRANSACTION_SYNC,
    BlockActions,
    TransactionActions,
    ContractActions,
    Web3ReduxActions,
    NetworkSelector,
    ContractSelector,
} from '../index';
import { sleep, sleepForPort } from '../utils';

const networkId = '1337';

describe('contract.sagas', () => {
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
        store.dispatch(Web3ReduxActions.initialize({ networks: [{ networkId, web3: web3Default }] }));
        const network: Network = NetworkSelector.selectSingle(store.getState(), networkId) as Network;
        if (!network)
            throw new Error(
                `Could not find Network with id ${networkId}. Make sure to dispatch a Network/CREATE action.`,
            );
        web3 = network.web3;
    });

    it('store.dispatch(ContractSagas.call({sync:false}))', async () => {
        //Block subsciption used for updates
        store.dispatch(BlockActions.subscribe({ networkId, returnTransactionObjects: false }));
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
        const blockNumber = await web3.eth.getBlockNumber();
        await sleep(2000);

        const contractId = `${networkId}-${contract.options.address}`;

        //Selector
        const value = ContractSelector.selectContractCall(store.getState(), contractId, 'blockNumber', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.approximately(parseInt(value), blockNumber, 1, 'blockNumber');
    });

    it('store.dispatch(ContractSagas.call({sync:CALL_BLOCK_SYNC}))', async () => {
        //Block subsciption used for updates
        store.dispatch(BlockActions.subscribe({ networkId, returnTransactionObjects: false }));
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

        const contractId = `${networkId}-${contract.options.address}`;

        const blockNumber1 = ContractSelector.selectContractCall(store.getState(), contractId, 'blockNumber', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        await sleep(2000);
        const blockNumber2 = ContractSelector.selectContractCall(store.getState(), contractId, 'blockNumber', {
            from: web3.eth.defaultAccount ?? undefined,
        });

        assert.isAtLeast(parseInt(blockNumber2), parseInt(blockNumber1) + 1);
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

        const contractId = `${networkId}-${contract.options.address}`;

        const value1 = ContractSelector.selectContractCall(store.getState(), contractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
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
        const value2 = ContractSelector.selectContractCall(store.getState(), contractId, 'getValue', {
            from: web3.eth.defaultAccount ?? undefined,
        });
        assert.equal(value2, 666);
    });

    it('store.dispatch(ContractSagas.send())', async () => {
        const tx1 = new web3.eth.Contract(BlockNumber.abi as AbiItem[]).deploy({
            data: BlockNumber.bytecode,
        });
        const gas1 = await tx1.estimateGas();
        const contract = await tx1.send({ from: accounts[0], gas: gas1, gasPrice: '10000' });
        store.dispatch(
            ContractActions.create({ networkId, address: contract.options.address, abi: BlockNumber.abi as AbiItem[] }),
        );

        store.dispatch(
            ContractActions.send({
                networkId,
                address: contract.options.address,
                method: 'setValue',
                args: [42],
            }),
        );

        await sleep(2000);

        const value = await contract.methods.getValue().call();
        assert.equal(value, 42, 'setValue() did not work!');
    });

    it('store.dispatch(ContractSagas.eventSubscribe())', async () => {
        const tx1 = new web3.eth.Contract(BlockNumber.abi as AbiItem[]).deploy({
            data: BlockNumber.bytecode,
        });
        const gas1 = await tx1.estimateGas();
        const contract = await tx1.send({ from: accounts[0], gas: gas1, gasPrice: '10000' });
        store.dispatch(
            ContractActions.create({ networkId, address: contract.options.address, abi: BlockNumber.abi as AbiItem[] }),
        );

        const expectedEvents: any = {};
        contract.events['NewValue']().on('data', (event: any) => {
            expectedEvents[eventId(event)] = event;
        });
        store.dispatch(
            ContractActions.eventSubscribe({
                networkId,
                address: contract.options.address,
                eventName: 'NewValue',
            }),
        );

        const tx2 = await contract.methods.setValue(42);
        const gas2 = await tx2.estimateGas();
        await tx2.send({ from: accounts[0], gas: gas2, gasPrice: '10000' });

        const contractSel = ContractSelector.selectSingle(store.getState(), `${networkId}-${contract.options.address}`);

        assert.deepEqual(contractSel!.events!.NewValue, expectedEvents);
    });
});
