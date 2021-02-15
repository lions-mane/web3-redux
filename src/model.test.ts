import { assert } from 'chai';
import { createStore } from './store';
import * as BlockActions from './block/actions';
import * as TransactionActions from './transaction/actions';
import * as ContractActions from './contract/actions';
import * as BlockSelector from './block/selector';
import * as TransactionSelector from './transaction/selector';
import * as ContractSelector from './contract/selector';
import { Block } from './block/model';
import { Transaction } from './transaction/model';
import { Contract } from './contract/model';

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

const contract: Contract = {
    id: `${networkId}-0x1111`,
    networkId,
    address: '0x1111',
    abi: [],
};

describe('redux-orm', () => {
    let store: ReturnType<typeof createStore>;
    beforeEach(() => {
        store = createStore();
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

    it('TransactionActions.create', async () => {
        store.dispatch(TransactionActions.create({ ...transaction, id: '' }));
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
        assert.deepEqual(
            //@ts-ignore
            TransactionSelector.select(state, expected.id!),
            expected,
            'Transaction.select(id)',
        );
        assert.deepEqual(
            //@ts-ignore
            TransactionSelector.select(state, [expected.id!]),
            [expected],
            'Transaction.select([id])',
        );
        assert.deepEqual(TransactionSelector.select(state), [expected], 'Transaction.select()');
    });

    it('ContractActions.create', async () => {
        store.dispatch(ContractActions.create({ ...contract, id: '' }));
        const expected = { ...contract, methods: {}, events: {} };
        const state = store.getState();

        //State
        const expectedState = { [expected.id!]: expected };
        assert.deepEqual(state.web3Redux['Contract'].itemsById, expectedState, 'state.web3Redux.Contract.itemsById');

        //Transaction.select
        assert.deepEqual(
            //@ts-ignore
            ContractSelector.select(state, expected.id!),
            expected,
            'Contract.select(id)',
        );
        assert.deepEqual(
            //@ts-ignore
            ContractSelector.select(state, [expected.id!]),
            [expected],
            'Contract.select([id])',
        );
        assert.deepEqual(ContractSelector.select(state), [expected], 'Contract.select()');
    });

    it('Block.transactions', async () => {
        store.dispatch(BlockActions.create({ ...block, id: '' }));
        store.dispatch(TransactionActions.create({ ...transaction, id: '' }));

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
