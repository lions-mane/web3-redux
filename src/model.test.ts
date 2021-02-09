import { assert } from 'chai';
import { createStore } from './store';
import * as BlockActions from './block/actions';
import * as TransactionActions from './transaction/actions';
import * as BlockSelector from './block/selector';
import * as TransactionSelector from './transaction/selector';
import { Block } from './block/model';
import { Transaction } from './transaction/model';

const networkId = '1337';
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

describe('redux-orm', () => {
    let store: ReturnType<typeof createStore>;
    beforeEach(() => {
        store = createStore();
    });
    it('create', async () => {
        store.dispatch(BlockActions.create(block));
        store.dispatch(TransactionActions.create(transaction));

        const expectedBlock = { ...block };
        const expectedTransaction = { ...transaction };
        const state = store.getState();

        const expectedBlockState = { [expectedBlock.id!]: expectedBlock };
        assert.deepEqual(state.orm['Block'].itemsById, expectedBlockState, 'state.orm.Block.itemsById');

        const expectedTransactionState = { [transaction.id!]: expectedTransaction };
        assert.deepEqual(
            state.orm['Transaction'].itemsById,
            expectedTransactionState,
            'state.orm.Transaction.itemsById',
        );

        //Polymorphic selectors
        //Block.select
        //@ts-ignore
        assert.deepEqual(BlockSelector.select(state, expectedBlock.id!), expectedBlock, 'Block.select(id)');
        //@ts-ignore
        assert.deepEqual(BlockSelector.select(state, [expectedBlock.id!]), [expectedBlock], 'Block.select([id])');
        assert.deepEqual(BlockSelector.select(state), [expectedBlock], 'Block.select()');

        //Block.selectTransactions
        //@ts-ignore
        assert.deepEqual(
            BlockSelector.selectTransactions(state, expectedBlock.id!),
            [expectedTransaction],
            'Block.selectTransactions(id)',
        );
        //@ts-ignore
        assert.deepEqual(
            BlockSelector.selectTransactions(state, [expectedBlock.id!]),
            [[expectedTransaction]],
            'Block.selectTransactions([id])',
        );
        assert.deepEqual(
            BlockSelector.selectTransactions(state),
            [[expectedTransaction]],
            'Block.selectTransactions()',
        );

        //Block.selectTransactions
        //@ts-ignore
        assert.deepEqual(
            BlockSelector.selectBlockTransaction(state, expectedBlock.id!),
            { ...expectedBlock, transactions: [expectedTransaction] },
            'Block.selectBlockTransaction(id)',
        );
        //@ts-ignore
        assert.deepEqual(
            BlockSelector.selectBlockTransaction(state, [expectedBlock.id!]),
            [{ ...expectedBlock, transactions: [expectedTransaction] }],
            'Block.selectBlockTransaction([id])',
        );
        assert.deepEqual(
            BlockSelector.selectBlockTransaction(state),
            [{ ...expectedBlock, transactions: [expectedTransaction] }],
            'Block.selectBlockTransaction()',
        );

        //Transaction.select
        //@ts-ignore
        assert.deepEqual(
            TransactionSelector.select(state, expectedTransaction.id!),
            expectedTransaction,
            'Transaction.select(id)',
        );
        //@ts-ignore
        assert.deepEqual(
            TransactionSelector.select(state, [expectedTransaction.id!]),
            [expectedTransaction],
            'Transaction.select([id])',
        );
        assert.deepEqual(TransactionSelector.select(state), [expectedTransaction], 'Transaction.select()');
    });
});
