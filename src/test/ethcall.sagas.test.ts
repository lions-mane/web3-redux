import { assert } from 'chai';
import Web3 from 'web3';
import dotenv from 'dotenv';
import ganache from 'ganache-core';
import BlockNumber from '../abis/BlockNumber.json';

import { createStore } from '../store';
import { Network, NetworkActions, NetworkSelector, EthCallActions, EthCallSelector } from '../index';
import { sleep, sleepForPort } from '../utils';
import { validatedEthCall } from '../ethcall/model';

const networkId = '1337';

describe('ethcall.sagas', () => {
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

    it('store.dispatch(EthCallActions.fetch())', async () => {
        //Deploy contract
        const tx1 = new web3.eth.Contract(BlockNumber.abi as any[]).deploy({
            data: BlockNumber.bytecode,
        });
        const gas1 = await tx1.estimateGas();
        const contract = await tx1.send({ from: accounts[0], gas: gas1, gasPrice: '10000' });
        const tx2 = await contract.methods.setValue(42);
        await tx2.send({ from: accounts[0], gas: await tx2.estimateGas() });

        const ethCall1 = validatedEthCall({
            networkId,
            from: web3.eth.defaultAccount!,
            to: contract.options.address,
            data: '0x20965255',
        });
        store.dispatch(
            EthCallActions.fetch(ethCall1), //getValue() 4byte selector
        );

        await sleep(100);

        const tx3 = await contract.methods.getValue();
        const expected = await tx3.call({ from: accounts[0], gas: await tx3.estimateGas() });

        assert.equal(EthCallSelector.selectMany(store.getState()).length, 1, 'EthCallSelector.selectMany');
        assert.equal(
            Web3.utils.hexToNumber(EthCallSelector.selectSingle(store.getState(), ethCall1.id)!.returnValue!),
            expected,
            'EthCallSelector.selectSingle',
        );
    });
});
