import { assert } from 'chai';
import Web3 from 'web3';

import { createStore } from '../store';
import { Network, Block, Transaction, NetworkActions, TransactionActions, TransactionSelector } from '../index';

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

describe('Transaction', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        store.dispatch(NetworkActions.create(network));
    });

    it('TransactionSelector.selectSingle(state, id) => undefined', async () => {
        const state = store.getState();
        const selected = TransactionSelector.selectSingle(state, '');
        assert.equal(selected, undefined);
    });

    it('TransactionSelector.selectSingle(state, [id]) => []', async () => {
        const state = store.getState();
        const selected = TransactionSelector.selectMany(state, ['']);
        console.debug(selected);
        assert.deepEqual(selected, [null]);
    });

    it('TransactionActions.create', async () => {
        store.dispatch(TransactionActions.create({ ...transaction }));
        const expected = { ...transaction };
        const state = store.getState();

        //State
        const expectedState = { [expected.id!]: expected };
        assert.deepEqual(
            state.web3Redux['Transaction'].itemsById,
            expectedState,
            'state.web3Redux.Transaction.itemsById',
        );

        //Transaction.select
        assert.deepEqual(TransactionSelector.selectSingle(state, expected.id!), expected, 'Transaction.select(id)');
        assert.deepEqual(TransactionSelector.selectMany(state, [expected.id!]), [expected], 'Transaction.select([id])');
        assert.deepEqual(TransactionSelector.selectMany(state), [expected], 'Transaction.select()');
    });
});
