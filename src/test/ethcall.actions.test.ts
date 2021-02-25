import { assert } from 'chai';
import Web3 from 'web3';

import { createStore } from '../store';
import { Network, NetworkActions, EthCallSelector, EthCallActions } from '../index';
import { validatedEthCall } from '../ethcall/model';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network: Network = {
    networkId,
    web3,
};

describe('ethcall.actions', () => {
    let store: ReturnType<typeof createStore>;
    let accounts: string[];

    before(async () => {
        accounts = await web3.eth.getAccounts();
    });

    beforeEach(() => {
        store = createStore();
        store.dispatch(NetworkActions.create(network));
    });

    describe('selectors:empty', () => {
        it('EthCallSelector.selectSingle(state, id) => undefined', async () => {
            const selected = EthCallSelector.selectSingle(store.getState(), '');
            assert.equal(selected, undefined);
        });

        it('EthCallSelector.selectSingle(state, [id]) => []', async () => {
            const selected = EthCallSelector.selectMany(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });
    });

    describe('selectors:memoization', () => {
        it('EthCallSelector.selectSingle(state, id)', async () => {
            //Test payload != selected reference
            const ethCall1 = validatedEthCall({ networkId, from: accounts[0], to: accounts[1], data: '0x1' });
            store.dispatch(EthCallActions.create(ethCall1));
            const selected1 = EthCallSelector.selectSingle(store.getState(), ethCall1.id);

            assert.notEqual(selected1, ethCall1, 'unequal reference');
            assert.deepEqual(selected1, { ...ethCall1, id: ethCall1.id }, 'equal deep values');

            //Test selected unchanged after new insert
            const ethCall2 = validatedEthCall({ networkId, from: accounts[0], to: accounts[1], data: '0x2' });
            store.dispatch(EthCallActions.create(ethCall2));

            const selected2 = EthCallSelector.selectSingle(store.getState(), ethCall1.id);
            assert.equal(selected2, selected1, 'memoized selector');
        });
    });
});
