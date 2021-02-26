import { assert } from 'chai';
import ganache from 'ganache-core';
import { createStore } from '../store';
import { Network, Web3Redux, Block, Transaction } from '../index';
import { sleep, sleepForPort } from '../utils';

describe('Web3Redux', () => {
    let store: ReturnType<typeof createStore>;

    before(async () => {
        const server = ganache.server({
            port: 0,
            networkId: 1337,
            blockTime: 1,
        });

        const port = await sleepForPort(server, 1000);
        const rpc = `ws://localhost:${port}`;
        //Warning: For testing purposes only
        process.env['LOCAL_RPC'] = rpc;
    });

    beforeEach(() => {
        store = createStore();
    });

    it('Web3Redux.initialize', async () => {
        store.dispatch(Web3Redux.initialize());

        //State
        assert.equal(
            Object.values(store.getState().web3Redux['Network'].itemsById).length,
            6,
            'state.web3Redux.Network.itemsById.length',
        );

        //Network.select
        assert.equal(Network.selectMany(store.getState()).length, 6, 'Network.select().length');

        await sleep(5000);

        //Block.select
        assert.isAtLeast(Block.selectMany(store.getState()).length, 3, 'synced block headers');

        //Transaction.select
        assert.isAtLeast(Transaction.selectMany(store.getState()).length, 3, 'synced block transactions');
    });
});
