import { assert } from 'chai';
import Web3 from 'web3';
import { createStore } from '../store';
import { Network, Block, Transaction } from '../index';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network = {
    networkId,
    web3,
};

describe('block.actions', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        store.dispatch(Network.create(network));
    });

    describe('selectors:empty', () => {
        it('Block.selectSingle(state, id) => undefined', async () => {
            const selected = Block.selectSingle(store.getState(), '');
            assert.equal(selected, undefined);
        });

        it('Block.selectMany(state, [id]) => []', async () => {
            const selected = Block.selectMany(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });

        it('Block.selectSingleTransactions(state, blockId) => null', async () => {
            const selected = Block.selectSingleTransactions(store.getState(), '');
            assert.equal(selected, null);
        });

        it('Block.selectManyTransactions(state, [blockNo]) => [null]', async () => {
            const selected = Block.selectManyTransactions(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });

        it('Block.selectSingleBlockTransaction(state, blockId) => null', async () => {
            const selected = Block.selectSingleBlockTransaction(store.getState(), '');
            assert.equal(selected, null);
        });

        it('Block.selectManyBlockTransaction(state, [blockNo]) => [null]', async () => {
            const selected = Block.selectManyBlockTransaction(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });
    });

    describe('selectors:memoization', () => {
        it('Block.selectSingle(state, id)', async () => {
            //Test payload != selected reference
            const block1 = { networkId, number: 1 };
            const block1Id = Block.blockId(block1);
            store.dispatch(Block.create(block1)); //[redux antipattern] mutates block1 with id
            const selected1 = Block.selectSingle(store.getState(), block1Id);

            assert.notEqual(selected1, block1, 'unequal reference');
            assert.deepEqual(selected1, block1, 'equal deep values');

            //Test selected unchanged after new block insert
            const block2 = { networkId, number: 2 };
            store.dispatch(Block.create(block2));

            const selected2 = Block.selectSingle(store.getState(), block1Id);
            assert.equal(selected2, selected1, 'memoized selector');

            //Test selected unchanged after transaction insert
            const transaction1 = { networkId, hash: '0x1', blockNumber: 1 };
            store.dispatch(Transaction.create(transaction1));

            const selected3 = Block.selectSingle(store.getState(), block1Id);
            assert.equal(selected3, selected1, 'memoized selector');

            //Test selected changed after block update
            store.dispatch(Block.create({ ...block1, gasUsed: 1 }));

            const selected4 = Block.selectSingle(store.getState(), block1Id);
            assert.notEqual(selected4, selected1, 'memoization should be invalidated');
        });

        it('Block.selectSingleBlockTransaction(state, id)', async () => {
            //Create block with transaction
            const block1 = { networkId: '1337', number: 1 };
            const block1Id = Block.blockId(block1);
            store.dispatch(Block.create(block1)); //[redux antipattern] mutates block1 with id
            const transaction1 = { networkId, hash: '0x1', blockNumber: 1 };
            store.dispatch(Transaction.create(transaction1));

            const selected1 = Block.selectSingleBlockTransaction(store.getState(), block1Id);

            //Test selected unchanged after new block insert
            const block2 = { networkId: '1337', number: 2 };
            store.dispatch(Block.create(block2));

            const selected2 = Block.selectSingleBlockTransaction(store.getState(), block1Id);
            assert.equal(selected2, selected1, 'memoized selector');

            //Test selected unchanged after unrelated transaction insert
            const transaction2 = { networkId, hash: '0x2', blockNumber: 2 };
            store.dispatch(Transaction.create(transaction2));

            const selected3 = Block.selectSingleBlockTransaction(store.getState(), block1Id);
            assert.equal(selected3, selected1, 'memoized selector');

            //Test selected changed after related transaction insert
            const transaction3 = { networkId, hash: '0x3', blockNumber: 1 };
            store.dispatch(Transaction.create(transaction3));

            const selected4 = Block.selectSingleBlockTransaction(store.getState(), block1Id);
            assert.notEqual(selected4, selected1, 'memoization should be invalidated');
        });
    });

    describe('selectors:many', () => {
        it('Block.selectMany(state)', async () => {
            const block1 = { networkId, number: 1 };
            const block1Id = Block.blockId(block1);
            store.dispatch(Block.create(block1));
            const expected = { ...block1, id: block1Id };

            //State
            const expectedState = { [expected.id!]: expected };
            assert.deepEqual(
                store.getState().web3Redux['Block'].itemsById,
                expectedState,
                'state.web3Redux.Block.itemsById',
            );

            //Block.selectMany
            assert.deepEqual(Block.selectMany(store.getState(), [expected.id!]), [expected], 'Block.select([id])');
            assert.deepEqual(Block.selectMany(store.getState()), [expected], 'Block.select()');
        });

        it('Block.selectManyTransactions', async () => {
            const block1 = { networkId, number: 1 };
            const transaction1 = { networkId, hash: '0x1', blockNumber: 1 };
            store.dispatch(Block.create(block1));
            store.dispatch(Transaction.create(transaction1));

            const expectedBlock = Block.validatedBlock(block1);
            const expectedTransaction = Transaction.validatedTransaction(transaction1);

            assert.deepEqual(
                Block.selectManyTransactions(store.getState(), [expectedBlock.id!]),
                [[expectedTransaction]],
                'Block.selectTransactions([id])',
            );
            assert.deepEqual(
                Block.selectManyTransactions(store.getState()),
                [[expectedTransaction]],
                'Block.selectTransactions()',
            );
        });

        it('Block.selectManyBlockTransaction', async () => {
            const block1 = { networkId, number: 1 };
            const transaction1 = { networkId, hash: '0x1', blockNumber: 1 };
            store.dispatch(Block.create(block1));
            store.dispatch(Transaction.create(transaction1));

            const expectedBlock = Block.validatedBlock(block1);
            const expectedTransaction = Transaction.validatedTransaction(transaction1);

            assert.deepEqual(
                Block.selectManyBlockTransaction(store.getState(), [expectedBlock.id!]),
                [{ ...expectedBlock, transactions: [expectedTransaction] }],
                'Block.selectBlockTransaction([id])',
            );
            assert.deepEqual(
                Block.selectManyBlockTransaction(store.getState()),
                [{ ...expectedBlock, transactions: [expectedTransaction] }],
                'Block.selectBlockTransaction()',
            );
        });
    });
});
