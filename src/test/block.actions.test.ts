import { assert } from 'chai';
import Web3 from 'web3';

import { createStore } from '../store';
import { Network, Block, Transaction, NetworkActions, BlockActions, TransactionActions, BlockSelector } from '../index';

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
