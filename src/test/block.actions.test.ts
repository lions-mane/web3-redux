import { assert } from 'chai';
import Web3 from 'web3';

import { createStore } from '../store';
import { NetworkActions, BlockActions, TransactionActions, BlockSelector } from '../index';
import { blockId, validatedBlock } from '../block/model';
import { Network } from '../network/model';
import { validatedTransaction } from '../transaction/model';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network: Network = {
    networkId,
    web3,
};

describe('block.actions', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        store.dispatch(NetworkActions.create(network));
    });

    describe('selectors:empty', () => {
        it('BlockSelector.selectSingle(state, id) => undefined', async () => {
            const selected = BlockSelector.selectSingle(store.getState(), '');
            assert.equal(selected, undefined);
        });

        it('BlockSelector.selectMany(state, [id]) => []', async () => {
            const selected = BlockSelector.selectMany(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });

        it('BlockSelector.selectSingleTransactions(state, blockId) => null', async () => {
            const selected = BlockSelector.selectSingleTransactions(store.getState(), '');
            assert.equal(selected, null);
        });

        it('BlockSelector.selectManyTransactions(state, [blockNo]) => [null]', async () => {
            const selected = BlockSelector.selectManyTransactions(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });

        it('BlockSelector.selectSingleBlockTransaction(state, blockId) => null', async () => {
            const selected = BlockSelector.selectSingleBlockTransaction(store.getState(), '');
            assert.equal(selected, null);
        });

        it('BlockSelector.selectManyBlockTransaction(state, [blockNo]) => [null]', async () => {
            const selected = BlockSelector.selectManyBlockTransaction(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });
    });

    describe('selectors:memoization', () => {
        it('BlockSelector.selectSingle(state, id)', async () => {
            //Test payload != selected reference
            const block1 = { networkId, number: 1 };
            store.dispatch(BlockActions.create(block1)); //[redux antipattern] mutates block1 with id
            const selected1 = BlockSelector.selectSingle(store.getState(), blockId(block1));

            assert.notEqual(selected1, block1, 'unequal reference');
            assert.deepEqual(selected1, block1, 'equal deep values');

            //Test selected unchanged after new block insert
            const block2 = { networkId, number: 2 };
            store.dispatch(BlockActions.create(block2));

            const selected2 = BlockSelector.selectSingle(store.getState(), blockId(block1));
            assert.equal(selected2, selected1, 'memoized selector');

            //Test selected unchanged after transaction insert
            const transaction1 = { networkId, hash: '0x1', blockNumber: 1 };
            store.dispatch(TransactionActions.create(transaction1));

            const selected3 = BlockSelector.selectSingle(store.getState(), blockId(block1));
            assert.equal(selected3, selected1, 'memoized selector');

            //Test selected changed after block update
            store.dispatch(BlockActions.create({ ...block1, gasUsed: 1 }));

            const selected4 = BlockSelector.selectSingle(store.getState(), blockId(block1));
            assert.notEqual(selected4, selected1, 'memoization should be invalidated');
        });

        it('BlockSelector.selectSingleBlockTransaction(state, id)', async () => {
            //Create block with transaction
            const block1 = { networkId: '1337', number: 1 };
            store.dispatch(BlockActions.create(block1)); //[redux antipattern] mutates block1 with id
            const transaction1 = { networkId, hash: '0x1', blockNumber: 1 };
            store.dispatch(TransactionActions.create(transaction1));

            const selected1 = BlockSelector.selectSingleBlockTransaction(store.getState(), blockId(block1));

            //Test selected unchanged after new block insert
            const block2 = { networkId: '1337', number: 2 };
            store.dispatch(BlockActions.create(block2));

            const selected2 = BlockSelector.selectSingleBlockTransaction(store.getState(), blockId(block1));
            assert.equal(selected2, selected1, 'memoized selector');

            //Test selected unchanged after unrelated transaction insert
            const transaction2 = { networkId, hash: '0x2', blockNumber: 2 };
            store.dispatch(TransactionActions.create(transaction2));

            const selected3 = BlockSelector.selectSingleBlockTransaction(store.getState(), blockId(block1));
            assert.equal(selected3, selected1, 'memoized selector');

            //Test selected changed after related transaction insert
            const transaction3 = { networkId, hash: '0x3', blockNumber: 1 };
            store.dispatch(TransactionActions.create(transaction3));

            const selected4 = BlockSelector.selectSingleBlockTransaction(store.getState(), blockId(block1));
            assert.notEqual(selected4, selected1, 'memoization should be invalidated');
        });
    });

    describe('selectors:many', () => {
        it('BlockSelector.selectMany(state)', async () => {
            const block1 = { networkId, number: 1 };
            store.dispatch(BlockActions.create(block1));
            const expected = { ...block1, id: blockId(block1) };

            //State
            const expectedState = { [expected.id!]: expected };
            assert.deepEqual(
                store.getState().web3Redux['Block'].itemsById,
                expectedState,
                'state.web3Redux.Block.itemsById',
            );

            //Block.selectMany
            assert.deepEqual(
                BlockSelector.selectMany(store.getState(), [expected.id!]),
                [expected],
                'Block.select([id])',
            );
            assert.deepEqual(BlockSelector.selectMany(store.getState()), [expected], 'Block.select()');
        });

        it('BlockSelector.selectManyTransactions', async () => {
            const block1 = { networkId, number: 1 };
            const transaction1 = { networkId, hash: '0x1', blockNumber: 1 };
            store.dispatch(BlockActions.create(block1));
            store.dispatch(TransactionActions.create(transaction1));

            const expectedBlock = validatedBlock(block1);
            const expectedTransaction = validatedTransaction(transaction1);

            assert.deepEqual(
                BlockSelector.selectManyTransactions(store.getState(), [expectedBlock.id!]),
                [[expectedTransaction]],
                'Block.selectTransactions([id])',
            );
            assert.deepEqual(
                BlockSelector.selectManyTransactions(store.getState()),
                [[expectedTransaction]],
                'Block.selectTransactions()',
            );
        });

        it('BlockSelector.selectManyBlockTransaction', async () => {
            const block1 = { networkId, number: 1 };
            const transaction1 = { networkId, hash: '0x1', blockNumber: 1 };
            store.dispatch(BlockActions.create(block1));
            store.dispatch(TransactionActions.create(transaction1));

            const expectedBlock = validatedBlock(block1);
            const expectedTransaction = validatedTransaction(transaction1);

            assert.deepEqual(
                BlockSelector.selectManyBlockTransaction(store.getState(), [expectedBlock.id!]),
                [{ ...expectedBlock, transactions: [expectedTransaction] }],
                'Block.selectBlockTransaction([id])',
            );
            assert.deepEqual(
                BlockSelector.selectManyBlockTransaction(store.getState()),
                [{ ...expectedBlock, transactions: [expectedTransaction] }],
                'Block.selectBlockTransaction()',
            );
        });
    });
});
