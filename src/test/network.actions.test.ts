import { assert } from 'chai';
import Web3 from 'web3';

import { createStore } from '../store';
import { Network } from '../index';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network = {
    networkId,
    web3,
};

describe('Network', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
    });

    it('Network.selectSingle(state, id) => undefined', async () => {
        const selected = Network.selectSingle(store.getState(), '');
        assert.equal(selected, undefined);
    });

    it('Network.selectSingle(state, [id]) => []', async () => {
        const selected = Network.selectMany(store.getState(), ['']);
        assert.deepEqual(selected, [null]);
    });

    it('Network.create', async () => {
        store.dispatch(Network.create(network));

        const expected = network;

        //State
        assert.deepEqual(
            store.getState().web3Redux['Network'].itemsById[network.networkId],
            expected,
            'state.web3Redux.Network.itemsById',
        );

        //Network.select
        assert.deepEqual(
            Network.selectSingle(store.getState(), network.networkId),
            expected,
            'Network.select(networkId)',
        );
    });
});
