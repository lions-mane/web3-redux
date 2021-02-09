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

        const expectedBlockState = {
            [expectedBlock.id!]: expectedBlock,
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
            [transaction.id!]: expectedTransaction,
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
