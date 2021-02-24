import { assert } from 'chai';
import { createStore } from '../store';
import { Web3ReduxActions, NetworkSelector } from '../index';

describe('Web3ReduxActions', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
    });

    it('Web3ReduxActions.initialize', async () => {
        store.dispatch(Web3ReduxActions.initialize());

        const state = store.getState();

        //State
        assert.equal(
            Object.values(state.web3Redux['Network'].itemsById).length,
            6,
            'state.web3Redux.Network.itemsById.length',
        );

        //Network.select
        assert.equal(
            //@ts-ignore
            NetworkSelector.select(state).length,
            6,
            'Network.select().length',
        );
    });
});
