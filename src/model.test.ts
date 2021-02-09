import { assert } from 'chai';
import { createStore } from './store';
import * as BlockActions from './block/actions';
import * as TransactionActions from './transaction/actions';
import * as BlockSelector from './block/selector';
import * as TransactionSelector from './transaction/selector';
import { Block } from './block/model';
import { Transaction } from './transaction/model';

const block: Block = {
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
    hash: '0x4242',
    nonce: 0,
    blockHash: '',
    blockNumber: 42,
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

        const expectedBlockState = {
            [expectedBlock.number]: expectedBlock,
        };
        const expectedBlockSelected = [expectedBlock];
        const expectedBlockTransactionsSelected = [[expectedTransaction]];
        assert.deepEqual(state.orm['Block'].itemsById, expectedBlockState, 'state.orm.Block.itemsById');
        assert.deepEqual(BlockSelector.selectWithId(state), expectedBlockSelected, 'Block.selectWithId');
        assert.deepEqual(
            BlockSelector.selectTransactions(state),
            expectedBlockTransactionsSelected,
            'Block.selectTransactions',
        );

        const expectedTransactionState = {
            [transaction.hash]: expectedTransaction,
        };
        const expectedTransactionSelected = [expectedTransaction];
        assert.deepEqual(
            state.orm['Transaction'].itemsById,
            expectedTransactionState,
            'state.orm.Transaction.itemsById',
        );
        assert.deepEqual(
            TransactionSelector.selectWithId(state),
            expectedTransactionSelected,
            'Transaction.selectWithId',
        );
    });
});
