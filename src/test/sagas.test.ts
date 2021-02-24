import { assert } from 'chai';
import ganache from 'ganache-core';
import { createStore } from '../store';
import { Web3ReduxActions, NetworkSelector, BlockSelector, TransactionSelector } from '../index';
import { sleep, sleepForPort } from '../utils';

describe('Web3ReduxActions', () => {
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

    it('Web3ReduxActions.initialize', async () => {
        store.dispatch(Web3ReduxActions.initialize());

        //State
        assert.equal(
            Object.values(store.getState().web3Redux['Network'].itemsById).length,
            6,
            'state.web3Redux.Network.itemsById.length',
        );

        //Network.select
        assert.equal(NetworkSelector.selectMany(store.getState()).length, 6, 'Network.select().length');

        await sleep(5000);

        //Block.select
        assert.isAtLeast(BlockSelector.selectMany(store.getState()).length, 3, 'synced block headers');
        console.debug(BlockSelector.selectMany(store.getState()));

        //Transaction.select
        assert.isAtLeast(TransactionSelector.selectMany(store.getState()).length, 3, 'synced block transactions');
    });
});
