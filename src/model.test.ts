import { assert } from 'chai';
import dotenv from 'dotenv';
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
import Web3 from 'web3';
import * as NetworkActions from './network/actions';
import { Network, NetworkSelector } from './index';
import { assertDeepEqual } from './utils';

const networkId = '1337';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
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
    id: `${networkId}-${ZERO_ADDRESS}`,
    networkId,
    address: ZERO_ADDRESS,
    abi: [],
};

describe('redux-orm', () => {
    let web3Default: Web3; //RPC Provider (eg. Metamask)
    let accounts: string[];

    let store: ReturnType<typeof createStore>;

    before(async () => {
        dotenv.config();
        web3Default = new Web3(process.env.LOCAL_RPC!);
        accounts = await web3Default.eth.getAccounts();
        web3Default.eth.defaultAccount = accounts[0];
    });

    beforeEach(() => {
        store = createStore();
        store.dispatch(NetworkActions.create({ networkId, web3: web3Default }));
        //@ts-ignore
        const network: Network = NetworkSelector.select(store.getState(), networkId) as Network;
        if (!network)
            throw new Error(
                `Could not find Network with id ${networkId}. Make sure to dispatch a Network/CREATE action.`,
            );
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
        assertDeepEqual(
            state.web3Redux['Contract'].itemsById[expected.id!],
            expected,
            ['web3Contract'],
            'state.web3Redux.Contract.itemsById',
        );

        //Contract.select
        assertDeepEqual(
            //@ts-ignore
            ContractSelector.select(state, expected.id!),
            expected,
            ['web3Contract'],
            'Contract.select(id)',
        );
        assertDeepEqual(
            //@ts-ignore
            ContractSelector.select(state, [expected.id!]),
            [expected],
            ['web3Contract'],
            'Contract.select([id])',
        );
        assertDeepEqual(ContractSelector.select(state), [expected], ['web3Contract'], 'Contract.select()');
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
