import { assert } from 'chai';
import Web3 from 'web3';

import { createStore } from '../store';
import { Network, Block, Transaction, NetworkActions, BlockActions, TransactionActions, BlockSelector } from '../index';
import { blockId } from '../block/model';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network: Network = {
    networkId,
    web3,
};

const block: Block = {
    id: `${networkId}-${42}`,
    networkId,
    number: 42,
    hash: '',
    parentHash: '',
    nonce: '',
    sha3Uncles: '',
    logsBloom: '',
    transactionRoot: '',
    receiptRoot: '',
    stateRoot: '',
    miner: '',
    extraData: '',
    gasLimit: 0,
    gasUsed: 0,
    timestamp: 0,
    size: 0,
    difficulty: 0,
    totalDifficulty: 0,
    uncles: [],
};

const transaction: Transaction = {
    id: `${networkId}-0x4242`,
    networkId,
    hash: '0x4242',
    nonce: 0,
    blockHash: '',
    blockNumber: 42,
    blockId: block.id!,
    transactionIndex: 0,
    from: '',
    to: '',
    value: '',
    gasPrice: '',
    gas: 0,
    input: '',
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

        it('BlockSelector.selectSingle(state, [id]) => []', async () => {
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

        it('BlockSelector.selectSingleTransactions(state, blockId) => null', async () => {
            const selected = BlockSelector.selectSingleBlockTransaction(store.getState(), '');
            assert.equal(selected, null);
        });

        it('BlockSelector.selectManyTransactions(state, [blockNo]) => [null]', async () => {
            const selected = BlockSelector.selectManyBlockTransaction(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });
    });

    describe('selectors:memoization', () => {
        it('BlockSelector.selectSingle(state, id)', async () => {
            //Test payload != selected reference
            const block1 = { networkId: '1337', number: 1 };
            store.dispatch(BlockActions.create(block1)); //[redux antipattern] mutates block1 with id
            const selected1 = BlockSelector.selectSingle(store.getState(), blockId(block1));

            assert.notEqual(selected1, block1, 'unequal reference');
            assert.deepEqual(selected1, block1, 'equal deep values');

            //Test selected unchanged after new block insert
            const block2 = { networkId: '1337', number: 2 };
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

    it('BlockActions.create', async () => {
        store.dispatch(BlockActions.create({ ...block, id: '' }));
        const expected = { ...block };

        //State
        const expectedState = { [expected.id!]: expected };
        assert.deepEqual(
            store.getState().web3Redux['Block'].itemsById,
            expectedState,
            'state.web3Redux.Block.itemsById',
        );

        const selected = BlockSelector.selectSingle(store.getState(), expected.id!);

        //Block.select
        assert.deepEqual(selected, expected, 'Block.select(id)');
        assert.deepEqual(BlockSelector.selectMany(store.getState(), [expected.id!]), [expected], 'Block.select([id])');
        assert.deepEqual(BlockSelector.selectMany(store.getState()), [expected], 'Block.select()');
    });

    it('Block.transactions', async () => {
        store.dispatch(BlockActions.create({ ...block }));
        store.dispatch(TransactionActions.create({ ...transaction }));

        const expectedBlock = { ...block };
        const expectedTransaction = { ...transaction };

        //Block.selectTransactions
        assert.deepEqual(
            BlockSelector.selectSingleTransactions(store.getState(), expectedBlock.id!),
            [expectedTransaction],
            'Block.selectTransactions(id)',
        );
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

        //Block.selectBlockTransaction
        assert.deepEqual(
            BlockSelector.selectSingleBlockTransaction(store.getState(), expectedBlock.id!),
            { ...expectedBlock, transactions: [expectedTransaction] },
            'Block.selectBlockTransaction(id)',
        );
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
