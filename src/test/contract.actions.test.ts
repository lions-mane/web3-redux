import Web3 from 'web3';
import { assert } from 'chai';
import { createStore } from '../store';
import { NetworkActions, ContractActions, ContractSelector, EthCallActions } from '../index';
import { assertDeepEqual } from '../utils';
import { callArgsHash, contractId, ContractPartial, validatedContract } from '../contract/model';
import BlockNumber from '../abis/BlockNumber.json';
import { Network } from '../network/model';
import { validatedEthCall } from '../ethcall/model';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network: Network = {
    networkId,
    web3,
};

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
    address: '0x0000000000000000000000000000000000000001',
    abi: BlockNumber.abi as any,
};

const addressList = [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000003',
    '0x0000000000000000000000000000000000000004',
    '0x0000000000000000000000000000000000000005',
    '0x0000000000000000000000000000000000000006',
];

describe('contract.actions', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        store.dispatch(NetworkActions.create(network));
    });

    describe('selectors:empty', () => {
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
    });

    describe('selectors:memoization', () => {
        it('ContractSelector.selectSingle(state, id)', async () => {
            //Test payload != selected reference
            const contract1 = {
                networkId,
                address: addressList[0],
                abi: BlockNumber.abi as any[],
            };
            const contract1Id = contractId(contract1);
            store.dispatch(ContractActions.create(contract1));
            const expected1 = validatedContract(contract1);
            const selected1 = ContractSelector.selectSingle(store.getState(), contract1Id);

            assert.notEqual(selected1, expected1, 'unequal reference');
            assert.deepEqual(
                { ...selected1!, web3Contract: undefined },
                { ...expected1, web3Contract: undefined },
                'equal deep values',
            );

            //Test selected unchanged after insert
            const contract2 = {
                networkId,
                address: addressList[1],
                abi: BlockNumber.abi as any[],
            };
            store.dispatch(ContractActions.create(contract2));

            const selected2 = ContractSelector.selectSingle(store.getState(), contract1Id);
            assert.equal(selected2, selected1, 'memoized selector');
        });

        it('ContractSelector.selectContractCall(state, id)', async () => {
            //Test selected unchanged after eth call
            const contract1 = validatedContract({
                networkId,
                address: addressList[0],
                abi: BlockNumber.abi as any[],
            });
            const contract1Id = contractId(contract1);
            const methodAbi = contract1.abi.filter(f => f.name === 'getValue')[0];
            const data = web3.eth.abi.encodeFunctionCall(methodAbi, []);

            const ethCall1 = validatedEthCall({ networkId, from: addressList[2], to: addressList[3], data });
            const argsHash = callArgsHash();

            contract1.methods['getValue'][argsHash] = { ethCallId: ethCall1.id, sync: false };
            store.dispatch(ContractActions.create(contract1));
            store.dispatch(EthCallActions.create(ethCall1));

            const selected1 = ContractSelector.selectSingle(store.getState(), contract1Id);
            const selectedCall1 = ContractSelector.selectContractCall(store.getState(), contract1Id, 'getValue');
            store.dispatch(
                EthCallActions.create({
                    ...ethCall1,
                    returnValue: '0x000000000000000000000000000000000000000000000000000000000000002a',
                }),
            );

            const selected2 = ContractSelector.selectSingle(store.getState(), contract1Id);
            const selectedCall2 = ContractSelector.selectContractCall(store.getState(), contract1Id, 'getValue');
            assert.equal(selected2, selected1, 'equal reference: contract unchanged');
            assert.notEqual(selectedCall2, selectedCall1, 'unequal reference: contract call changed');
            assert.equal(selectedCall2, '42', 'invalid decoding');
        });
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
