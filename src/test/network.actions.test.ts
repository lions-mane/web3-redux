import { assert } from 'chai';
import Web3 from 'web3';

import { createStore } from '../store';
import { Network, NetworkSelector, NetworkActions } from '../index';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network: Network = {
    networkId,
    web3,
};

describe('Network', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
    });

    it('NetworkSelector.selectSingle(state, id) => undefined', async () => {
        const state = store.getState();
        const selected = NetworkSelector.selectSingle(state, '');
        assert.equal(selected, undefined);
    });

    it('NetworkSelector.selectSingle(state, [id]) => []', async () => {
        const state = store.getState();
        const selected = NetworkSelector.selectMany(state, ['']);
        console.debug(selected);
        assert.deepEqual(selected, [null]);
    });

    it('NetworkActions.create', async () => {
        store.dispatch(NetworkActions.create(network));

        const expected = network;
        const state = store.getState();

        //State
        assert.deepEqual(
            state.web3Redux['Network'].itemsById[network.networkId],
            expected,
            'state.web3Redux.Network.itemsById',
        );

        //Network.select
        assert.deepEqual(NetworkSelector.selectSingle(state, network.networkId), expected, 'Network.select(networkId)');
    });
});
