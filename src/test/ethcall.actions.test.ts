import { assert } from 'chai';
import Web3 from 'web3';
import ganache from 'ganache-core';

import { createStore } from '../store';
import { Network, EthCall } from '../index';
import { sleepForPort } from '../utils';

const networkId = '1337';

describe('ethcall.actions', () => {
    let web3: Web3;
    let store: ReturnType<typeof createStore>;
    let accounts: string[];

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

    beforeEach(() => {
        store = createStore();
        store.dispatch(Network.create({ networkId, web3 }));
    });

    describe('selectors:empty', () => {
        it('EthCall.selectSingle(state, id) => undefined', async () => {
            const selected = EthCall.selectSingle(store.getState(), '');
            assert.equal(selected, undefined);
        });

        it('EthCall.selectSingle(state, [id]) => []', async () => {
            const selected = EthCall.selectMany(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });
    });

    describe('selectors:memoization', () => {
        it('EthCall.selectSingle(state, id)', async () => {
            //Test payload != selected reference
            const ethCall1 = EthCall.validatedEthCall({ networkId, from: accounts[0], to: accounts[1], data: '0x1' });
            store.dispatch(EthCall.create(ethCall1));
            const selected1 = EthCall.selectSingle(store.getState(), ethCall1.id);

            assert.notEqual(selected1, ethCall1, 'unequal reference');
            assert.deepEqual(selected1, ethCall1, 'equal deep values');

            //Test selected unchanged after new insert
            const ethCall2 = EthCall.validatedEthCall({ networkId, from: accounts[0], to: accounts[1], data: '0x2' });
            store.dispatch(EthCall.create(ethCall2));

            const selected2 = EthCall.selectSingle(store.getState(), ethCall1.id);
            assert.equal(selected2, selected1, 'memoized selector');
        });
    });
});
