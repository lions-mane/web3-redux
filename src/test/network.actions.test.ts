import { assert } from 'chai';
import Web3 from 'web3';
import BlockNumber from './abis/BlockNumber.json';

import { createStore } from '../store';
import { Network, Block, Transaction, Contract } from '../index';
import { addressList, assertDeepEqual } from './utils';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network = {
    networkId,
    web3,
    web3Sender: web3,
    gasLimit: 12000000,
};

function removeWeb3Contract(contract: Contract.Contract): Contract.Contract {
    return { ...contract, web3Contract: undefined, web3SenderContract: undefined };
}

describe('Network', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
    });

    describe('selectors:empty', () => {
        it('Network.selectSingle(state, id) => undefined', async () => {
            const selected = Network.selectSingle(store.getState(), '');
            assert.equal(selected, undefined);
        });

        it('Network.selectSingle(state, [id]) => []', async () => {
            const selected = Network.selectMany(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });

        it('Network.selectSingleBlocks(state, blockId) => null', async () => {
            const selected = Network.selectSingleBlocks(store.getState(), '');
            assert.equal(selected, null);
        });

        it('Network.selectManyBlocks(state, [blockNo]) => [null]', async () => {
            const selected = Network.selectManyBlocks(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });

        it('Network.selectSingleTransactions(state, blockId) => null', async () => {
            const selected = Network.selectSingleTransactions(store.getState(), '');
            assert.equal(selected, null);
        });

        it('Network.selectManyTransactions(state, [blockNo]) => [null]', async () => {
            const selected = Network.selectManyTransactions(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });
    });

    describe('selectors:memoization', () => {
        it('Network.selectSingle(state, id)', async () => {
            //Test payload != selected reference
            store.dispatch(Network.create(network));
            const selected1 = Network.selectSingle(store.getState(), network.networkId);

            assert.notEqual(selected1, network, 'unequal reference');
            assertDeepEqual(selected1, network, ['web3', 'web3Sender', 'multicallContract'], 'equal deep values');
        });
    });

    describe('selectors:many', () => {
        it('Network.selectMany(state)', async () => {
            store.dispatch(Network.create(network));
            const expected = network;
            //console.debug(store.getState().web3Redux['Network'].itemsById[network.networkId])

            //State
            assertDeepEqual(
                store.getState().web3Redux['Network'].itemsById[network.networkId],
                expected,
                ['web3', 'web3Sender', 'multicallContract'],
                'state.web3Redux.Network.itemsById',
            );

            //Network.selectMany
            assertDeepEqual(
                Network.selectMany(store.getState(), [network.networkId]),
                [expected],
                ['web3', 'web3Sender', 'multicallContract'],
                'Network.selectMany([networkId])',
            );

            assertDeepEqual(
                Network.selectMany(store.getState()),
                [expected],
                ['web3', 'web3Sender', 'multicallContract'],
                'Network.selectMany()',
            );
        });

        it('Network.selectManyBlocks(state)', async () => {
            const block1 = { networkId, number: 1 };
            const blockValidated1 = Block.validatedBlock(block1);
            store.dispatch(Network.create(network));
            store.dispatch(Block.create(block1));

            //Network.selectMany
            assert.deepEqual(
                Network.selectManyBlocks(store.getState(), [network.networkId]),
                [[blockValidated1]],
                'Network.selectManyBlocks([networkId])',
            );

            assert.deepEqual(
                Network.selectManyBlocks(store.getState()),
                [[blockValidated1]],
                'Network.selectManyBlocks()',
            );
        });

        it('Network.selectManyTransactions(state)', async () => {
            const transaction1 = { networkId, hash: '0x1', from: addressList[0], to: addressList[1] };
            const transactionValidated1 = Transaction.validatedTransaction(transaction1);
            store.dispatch(Network.create(network));
            store.dispatch(Transaction.create(transaction1));

            //Network.selectManyTransactions
            assert.deepEqual(
                Network.selectManyTransactions(store.getState(), [network.networkId]),
                [[transactionValidated1]],
                'Network.selectManyTransactions([networkId])',
            );

            assert.deepEqual(
                Network.selectManyTransactions(store.getState()),
                [[transactionValidated1]],
                'Network.selectManyTransactions()',
            );
        });

        it('Network.selectManyContracts(state)', async () => {
            const contract1 = {
                networkId,
                address: addressList[0],
                abi: BlockNumber.abi as any,
            };
            const contractValidated1 = Contract.validatedContract(contract1);
            contractValidated1.web3Contract = undefined;
            contractValidated1.web3SenderContract = undefined;
            store.dispatch(Network.create(network));
            store.dispatch(Contract.create(contract1));

            //Network.selectManyContracts
            assert.deepEqual(
                Network.selectManyContracts(store.getState(), [network.networkId]).map(arr =>
                    arr ? arr.map(removeWeb3Contract) : undefined,
                ),
                [[contractValidated1]],
                'Network.selectManyContracts([networkId])',
            );

            assert.deepEqual(
                Network.selectManyContracts(store.getState()).map(arr =>
                    arr ? arr.map(removeWeb3Contract) : undefined,
                ),
                [[contractValidated1]],
                'Network.selectManyContracts()',
            );
        });
    });
});
