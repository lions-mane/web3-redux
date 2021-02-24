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
        const state = store.getState();
        const selected = BlockSelector.selectSingle(state, '');
        assert.equal(selected, undefined);
    });

    it('BlockSelector.selectSingle(state, [id]) => []', async () => {
        const state = store.getState();
        const selected = BlockSelector.selectMany(state, ['']);
        console.debug(selected);
        assert.deepEqual(selected, [null]);
    });

    it('BlockSelector.selectSingleTransactions(state, blockId) => null', async () => {
        const state = store.getState();
        const selected = BlockSelector.selectSingleTransactions(state, '');
        assert.equal(selected, null);
    });

    it('BlockSelector.selectManyTransactions(state, [blockNo]) => [null]', async () => {
        const state = store.getState();
        const selected = BlockSelector.selectManyTransactions(state, ['']);
        assert.deepEqual(selected, [null]);
    });

    it('BlockSelector.selectSingleTransactions(state, blockId) => null', async () => {
        const state = store.getState();
        const selected = BlockSelector.selectSingleBlockTransaction(state, '');
        assert.equal(selected, null);
    });

    it('BlockSelector.selectManyTransactions(state, [blockNo]) => [null]', async () => {
        const state = store.getState();
        const selected = BlockSelector.selectManyBlockTransaction(state, ['']);
        assert.deepEqual(selected, [null]);
    });

    it('BlockActions.create', async () => {
        store.dispatch(BlockActions.create({ ...block, id: '' }));
        const expected = { ...block };
        const state = store.getState();

        //State
        const expectedState = { [expected.id!]: expected };
        assert.deepEqual(state.web3Redux['Block'].itemsById, expectedState, 'state.web3Redux.Block.itemsById');

        const selected = BlockSelector.selectSingle(state, expected.id!);

        //Block.select
        assert.deepEqual(selected, expected, 'Block.select(id)');
        assert.deepEqual(BlockSelector.selectMany(state, [expected.id!]), [expected], 'Block.select([id])');
        assert.deepEqual(BlockSelector.selectMany(state), [expected], 'Block.select()');
    });

    it('Block.transactions', async () => {
        store.dispatch(BlockActions.create({ ...block }));
        store.dispatch(TransactionActions.create({ ...transaction }));

        const expectedBlock = { ...block };
        const expectedTransaction = { ...transaction };
        const state = store.getState();

        //Block.selectTransactions
        assert.deepEqual(
            BlockSelector.selectSingleTransactions(state, expectedBlock.id!),
            [expectedTransaction],
            'Block.selectTransactions(id)',
        );
        assert.deepEqual(
            BlockSelector.selectManyTransactions(state, [expectedBlock.id!]),
            [[expectedTransaction]],
            'Block.selectTransactions([id])',
        );
        assert.deepEqual(
            BlockSelector.selectManyTransactions(state),
            [[expectedTransaction]],
            'Block.selectTransactions()',
        );

        //Block.selectBlockTransaction
        assert.deepEqual(
            BlockSelector.selectSingleBlockTransaction(state, expectedBlock.id!),
            { ...expectedBlock, transactions: [expectedTransaction] },
            'Block.selectBlockTransaction(id)',
        );
        assert.deepEqual(
            BlockSelector.selectManyBlockTransaction(state, [expectedBlock.id!]),
            [{ ...expectedBlock, transactions: [expectedTransaction] }],
            'Block.selectBlockTransaction([id])',
        );
        assert.deepEqual(
            BlockSelector.selectManyBlockTransaction(state),
            [{ ...expectedBlock, transactions: [expectedTransaction] }],
            'Block.selectBlockTransaction()',
        );
    });
});
