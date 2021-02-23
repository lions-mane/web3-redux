import Web3 from 'web3';

import { createStore } from '../store';
import { Network, NetworkActions, ContractActions, ContractSelector } from '../index';
import { assertDeepEqual } from '../utils';
import { CreateActionInput } from '../contract/actions';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network: Network = {
    networkId,
    web3,
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const contract: CreateActionInput = {
    networkId,
    address: ZERO_ADDRESS,
    abi: [],
};

describe('contract.actions', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        store.dispatch(NetworkActions.create(network));
    });

    it('ContractActions.create', async () => {
        store.dispatch(ContractActions.create({ ...contract }));
        const expected = { ...contract, methods: {}, events: {}, id: `${contract.networkId}-${contract.address}` };
        const state = store.getState();

        //State
        assertDeepEqual(
            state.web3Redux['Contract'].itemsById[expected.id!],
            expected,
            ['web3Contract'],
            'state.web3Redux.Contract.itemsById',
        );

        //Contract.select
        assertDeepEqual(
            //@ts-ignore
            ContractSelector.select(state, expected.id!),
            expected,
            ['web3Contract'],
            'Contract.select(id)',
        );
        assertDeepEqual(
            //@ts-ignore
            ContractSelector.select(state, [expected.id!]),
            [expected],
            ['web3Contract'],
            'Contract.select([id])',
        );
        assertDeepEqual(ContractSelector.select(state), [expected], ['web3Contract'], 'Contract.select()');
    });
});
