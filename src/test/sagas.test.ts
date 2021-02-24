import { assert } from 'chai';
import { createStore } from '../store';
import { Web3ReduxActions, NetworkSelector, BlockSelector, TransactionSelector } from '../index';
import { sleep } from '../utils';

describe('Web3ReduxActions', () => {
    let store: ReturnType<typeof createStore>;

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
        assert.isAtLeast(BlockSelector.selectMany(store.getState()).length, 6, 'synced block headers');

        //Transaction.select
        assert.isAtLeast(TransactionSelector.selectMany(store.getState()).length, 6, 'synced block transactions');
    });
});
