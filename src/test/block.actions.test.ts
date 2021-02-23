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

describe('Block', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        store.dispatch(NetworkActions.create(network));
    });

    it('BlockActions.create', async () => {
        store.dispatch(BlockActions.create({ ...block, id: '' }));
        const expected = { ...block };
        const state = store.getState();

        //State
        const expectedState = { [expected.id!]: expected };
        assert.deepEqual(state.web3Redux['Block'].itemsById, expectedState, 'state.web3Redux.Block.itemsById');

        //Block.select
        assert.deepEqual(
            //@ts-ignore
            BlockSelector.select(state, expected.id!),
            expected,
            'Block.select(id)',
        );
        assert.deepEqual(
            //@ts-ignore
            BlockSelector.select(state, [expected.id!]),
            [expected],
            'Block.select([id])',
        );
        assert.deepEqual(BlockSelector.select(state), [expected], 'Block.select()');
    });

    it('Block.transactions', async () => {
        store.dispatch(BlockActions.create({ ...block }));
        store.dispatch(TransactionActions.create({ ...transaction }));

        const expectedBlock = { ...block };
        const expectedTransaction = { ...transaction };
        const state = store.getState();

        //Block.selectTransactions
        assert.deepEqual(
            //@ts-ignore
            BlockSelector.selectTransactions(state, expectedBlock.id!),
            [expectedTransaction],
            'Block.selectTransactions(id)',
        );
        assert.deepEqual(
            //@ts-ignore
            BlockSelector.selectTransactions(state, [expectedBlock.id!]),
            [[expectedTransaction]],
            'Block.selectTransactions([id])',
        );
        assert.deepEqual(
            BlockSelector.selectTransactions(state),
            [[expectedTransaction]],
            'Block.selectTransactions()',
        );

        //Block.selectBlockTransaction
        assert.deepEqual(
            //@ts-ignore
            BlockSelector.selectBlockTransaction(state, expectedBlock.id!),
            { ...expectedBlock, transactions: [expectedTransaction] },
            'Block.selectBlockTransaction(id)',
        );
        assert.deepEqual(
            //@ts-ignore
            BlockSelector.selectBlockTransaction(state, [expectedBlock.id!]),
            [{ ...expectedBlock, transactions: [expectedTransaction] }],
            'Block.selectBlockTransaction([id])',
        );
        assert.deepEqual(
            BlockSelector.selectBlockTransaction(state),
            [{ ...expectedBlock, transactions: [expectedTransaction] }],
            'Block.selectBlockTransaction()',
        );
    });
});
