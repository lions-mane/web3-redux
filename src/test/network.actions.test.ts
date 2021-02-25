import { assert } from 'chai';
import Web3 from 'web3';

import { createStore } from '../store';
import { NetworkSelector, NetworkActions } from '../index';
import { Network } from '../network/model';

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
        const selected = NetworkSelector.selectSingle(store.getState(), '');
        assert.equal(selected, undefined);
    });

    it('NetworkSelector.selectSingle(state, [id]) => []', async () => {
        const selected = NetworkSelector.selectMany(store.getState(), ['']);
        assert.deepEqual(selected, [null]);
    });

    it('NetworkActions.create', async () => {
        store.dispatch(NetworkActions.create(network));

        const expected = network;

        //State
        assert.deepEqual(
            store.getState().web3Redux['Network'].itemsById[network.networkId],
            expected,
            'state.web3Redux.Network.itemsById',
        );

        //Network.select
        assert.deepEqual(
            NetworkSelector.selectSingle(store.getState(), network.networkId),
            expected,
            'Network.select(networkId)',
        );
    });
});
