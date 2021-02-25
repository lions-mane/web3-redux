import Web3 from 'web3';
import { assert } from 'chai';
import { createStore } from '../store';
import { Network, NetworkActions, ContractActions, ContractSelector } from '../index';
import { assertDeepEqual } from '../utils';
import { ContractPartial } from '../contract/model';
import BlockNumber from '../abis/BlockNumber.json';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network: Network = {
    networkId,
    web3,
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const methods = BlockNumber.abi
    .filter(item => item.type == 'function')
    .map(item => item.name!)
    .reduce((acc, m) => {
        return { ...acc, [m]: {} };
    }, {});
const events = BlockNumber.abi
    .filter(item => item.type == 'event')
    .map(item => item.name!)
    .reduce((acc, m) => {
        return { ...acc, [m]: {} };
    }, {});

const contract: ContractPartial = {
    networkId,
    address: ZERO_ADDRESS,
    abi: BlockNumber.abi as any,
};

describe('contract.actions', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        store.dispatch(NetworkActions.create(network));
    });

    it('ContractSelector.selectSingle(state, id) => undefined', async () => {
        const selected = ContractSelector.selectSingle(store.getState(), '');
        assert.equal(selected, undefined);
    });

    it('ContractSelector.selectSingle(state, [id]) => []', async () => {
        const selected = ContractSelector.selectMany(store.getState(), ['']);
        assert.deepEqual(selected, [null]);
    });

    it('ContractSelector.selectContractCall(state, id) => undefined', async () => {
        const selected1 = ContractSelector.selectContractCall(store.getState(), '', 'xyz');
        assert.equal(selected1, undefined, 'contract undefined');

        store.dispatch(ContractActions.create({ ...contract }));

        const contractId = `${contract.networkId}-${contract.address}`;
        const selected2 = ContractSelector.selectContractCall(store.getState(), contractId, 'xyz');
        assert.equal(selected2, undefined, 'method undefined');

        const selected3 = ContractSelector.selectContractCall(store.getState(), contractId, 'blockNumber');
        assert.equal(selected3, undefined, 'argsHash undefined');
    });

    it('ContractActions.create', async () => {
        store.dispatch(ContractActions.create({ ...contract }));
        const expected = { ...contract, methods, events, id: `${contract.networkId}-${contract.address}` };

        //State
        assertDeepEqual(
            store.getState().web3Redux['Contract'].itemsById[expected.id!],
            expected,
            ['web3Contract'],
            'state.web3Redux.Contract.itemsById',
        );

        //Contract.select
        assertDeepEqual(
            ContractSelector.selectSingle(store.getState(), expected.id!),
            expected,
            ['web3Contract'],
            'Contract.select(id)',
        );
        assertDeepEqual(
            ContractSelector.selectMany(store.getState(), [expected.id!]),
            [expected],
            ['web3Contract'],
            'Contract.select([id])',
        );
        assertDeepEqual(
            ContractSelector.selectMany(store.getState()),
            [expected],
            ['web3Contract'],
            'Contract.select()',
        );
    });
});
