import { assert } from 'chai';
import Web3 from 'web3';

import { createStore } from '../store';
import { NetworkActions, TransactionActions, TransactionSelector } from '../index';
import { Network } from '../network/model';
import { validatedTransaction } from '../transaction/model';

const networkId = '1337';
const web3 = new Web3('http://locahost:8545');
const network: Network = {
    networkId,
    web3,
};

const addressList = [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000003',
    '0x0000000000000000000000000000000000000004',
    '0x0000000000000000000000000000000000000005',
    '0x0000000000000000000000000000000000000006',
];

describe('Transaction', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        store.dispatch(NetworkActions.create(network));
    });

    describe('selectors:empty', () => {
        it('TransactionSelector.selectSingle(state, id) => undefined', async () => {
            const selected = TransactionSelector.selectSingle(store.getState(), '');
            assert.equal(selected, undefined);
        });

        it('TransactionSelector.selectSingle(state, [id]) => []', async () => {
            const selected = TransactionSelector.selectMany(store.getState(), ['']);
            assert.deepEqual(selected, [null]);
        });
    });

    describe('selectors:memoization', () => {
        it('TransactionSelector.selectSingle(state, id)', async () => {
            //Test payload != selected reference
            const transaction1 = { networkId, hash: '0x1', from: addressList[0], to: addressList[1] };
            const validated1 = validatedTransaction(transaction1);
            store.dispatch(TransactionActions.create(transaction1));
            const selected1 = TransactionSelector.selectSingle(store.getState(), validated1.id!);

            assert.notEqual(selected1, validated1, 'unequal reference');
            assert.deepEqual(selected1, validated1, 'equal deep values');

            //Test selected unchanged after new insert
            const transaction2 = validatedTransaction({
                networkId,
                hash: '0x2',
                from: addressList[0],
                to: addressList[1],
            });
            store.dispatch(TransactionActions.create(transaction2));

            const selected2 = TransactionSelector.selectSingle(store.getState(), validated1.id!);
            assert.equal(selected2, selected1, 'memoized selector');
        });
    });

    describe('selectors:many', () => {
        it('TransactionSelector.selectMany(state)', async () => {
            const transaction1 = { networkId, hash: '0x1', from: addressList[0], to: addressList[1] };
            const validated1 = validatedTransaction(transaction1);
            store.dispatch(TransactionActions.create(transaction1));

            //State
            const expectedState = { [validated1.id!]: validated1 };
            assert.deepEqual(
                store.getState().web3Redux['Transaction'].itemsById,
                expectedState,
                'state.web3Redux.Transaction.itemsById',
            );

            //Transaction.selectMany
            assert.deepEqual(
                TransactionSelector.selectMany(store.getState(), [validated1.id!]),
                [validated1],
                'Transaction.select([id])',
            );
            assert.deepEqual(TransactionSelector.selectMany(store.getState()), [validated1], 'Transaction.select()');
        });
    });
});
