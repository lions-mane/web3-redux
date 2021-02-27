import Web3 from 'web3';
import { assert } from 'chai';
import { createStore } from '../store';
import { Network, Contract, EthCall } from '../index';
import { addressList, assertDeepEqual } from './utils';
import BlockNumber from '../abis/BlockNumber.json';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network = {
    networkId,
    web3,
};

const contract = {
    networkId,
    address: '0x0000000000000000000000000000000000000001',
    abi: BlockNumber.abi as any,
};

describe('contract.actions', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        store.dispatch(Network.create(network));
    });

    describe('selectors:empty', () => {
        it('Contract.selectSingle(state, id) => undefined', async () => {
            const selected = Contract.selectSingle(store.getState(), '');
            assert.equal(selected, undefined);
        });

        it('Contract.selectSingle(state, [id]) => []', async () => {
            const selected = Contract.selectMany(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });

        it('Contract.selectContractCall(state, id) => undefined', async () => {
            const selected1 = Contract.selectContractCall(store.getState(), '', 'xyz');
            assert.equal(selected1, undefined, 'contract undefined');

            store.dispatch(Contract.create({ ...contract }));

            const contractId = Contract.contractId(contract);
            const selected2 = Contract.selectContractCall(store.getState(), contractId, 'xyz');
            assert.equal(selected2, undefined, 'method undefined');

            const selected3 = Contract.selectContractCall(store.getState(), contractId, 'blockNumber');
            assert.equal(selected3, undefined, 'argsHash undefined');
        });
    });

    describe('selectors:memoization', () => {
        it('Contract.selectSingle(state, id)', async () => {
            //Test payload != selected reference
            const contract1 = {
                networkId,
                address: addressList[0],
                abi: BlockNumber.abi as any[],
            };
            const contract1Id = Contract.contractId(contract1);
            store.dispatch(Contract.create(contract1));
            const expected1 = Contract.validatedContract(contract1);
            const selected1 = Contract.selectSingle(store.getState(), contract1Id);

            assert.notEqual(selected1, expected1, 'unequal reference');
            assert.deepEqual(
                { ...selected1!, web3Contract: undefined, web3SenderContract: undefined },
                { ...expected1, web3Contract: undefined, web3SenderContract: undefined },
                'equal deep values',
            );

            //Test selected unchanged after insert
            const contract2 = {
                networkId,
                address: addressList[1],
                abi: BlockNumber.abi as any[],
            };
            store.dispatch(Contract.create(contract2));

            const selected2 = Contract.selectSingle(store.getState(), contract1Id);
            assert.equal(selected2, selected1, 'memoized selector');
        });

        it('Contract.selectContractCall(state, id)', async () => {
            //Test selected unchanged after eth call
            const contract1 = Contract.validatedContract({
                networkId,
                address: addressList[0],
                abi: BlockNumber.abi as any[],
            });
            const contract1Id = Contract.contractId(contract1);
            const methodAbi = contract1.abi.filter(f => f.name === 'getValue')[0];
            const data = web3.eth.abi.encodeFunctionCall(methodAbi, []);

            const ethCall1 = EthCall.validatedEthCall({ networkId, from: addressList[2], to: addressList[3], data });
            const argsHash = Contract.callArgsHash();

            contract1.methods['getValue'][argsHash] = { ethCallId: ethCall1.id, sync: false };
            store.dispatch(Contract.create(contract1));
            store.dispatch(EthCall.create(ethCall1));

            const selected1 = Contract.selectSingle(store.getState(), contract1Id);
            const selectedCall1 = Contract.selectContractCall(store.getState(), contract1Id, 'getValue');
            store.dispatch(
                EthCall.create({
                    ...ethCall1,
                    returnValue: '42',
                }),
            );

            const selected2 = Contract.selectSingle(store.getState(), contract1Id);
            const selectedCall2 = Contract.selectContractCall(store.getState(), contract1Id, 'getValue');
            assert.equal(selected2, selected1, 'equal reference: contract unchanged');
            assert.notEqual(selectedCall2, selectedCall1, 'unequal reference: contract call changed');
            assert.equal(selectedCall2, '42', 'invalid decoding');
        });
    });

    describe('selectors:many', () => {
        it('Contract.selectMany(state)', async () => {
            const validated1 = Contract.validatedContract(contract);
            store.dispatch(Contract.create(contract));

            //State
            assertDeepEqual(
                store.getState().web3Redux['Contract'].itemsById[validated1.id!],
                validated1,
                ['web3Contract', 'web3SenderContract'],
                'state.web3Redux.Contract.itemsById',
            );

            //Contract.select
            assertDeepEqual(
                Contract.selectSingle(store.getState(), validated1.id!),
                validated1,
                ['web3Contract', 'web3SenderContract'],
                'Contract.select(id)',
            );
            assertDeepEqual(
                Contract.selectMany(store.getState(), [validated1.id!]),
                [validated1],
                ['web3Contract', 'web3SenderContract'],
                'Contract.select([id])',
            );
            assertDeepEqual(
                Contract.selectMany(store.getState()),
                [validated1],
                ['web3Contract', 'web3SenderContract'],
                'Contract.select()',
            );
        });
    });
});
