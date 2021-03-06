import { put, call, take, takeEvery, select, all } from 'redux-saga/effects';
import { Transaction, transactionId } from './model';
import { Network } from '../network/model';
import { Contract, isContractCallTransactionSync } from '../contract/model';

import * as TransactionActions from './actions';
import * as ContractActions from '../contract/actions';

import * as NetworkSelector from '../network/selector';
import * as ContractSelector from '../contract/selector';

function* fetch(action: TransactionActions.FetchAction) {
    const { payload } = action;
    const network: Network = yield select(NetworkSelector.selectSingle, payload.networkId);
    if (!network)
        throw new Error(
            `Could not find Network with id ${payload.networkId}. Make sure to dispatch a Network/CREATE action.`,
        );
    yield put(TransactionActions.create({ networkId: payload.networkId, hash: payload.hash }));
    const web3 = network.web3;
    const transaction: Transaction = yield call(web3.eth.getTransaction, payload.hash);
    const newTransaction = { ...transaction, networkId: payload.networkId };
    yield put(TransactionActions.create(newTransaction));
}

function* fetchLoop() {
    const cache: { [key: string]: boolean } = {};

    const actionPattern = (action: { type: string }) => {
        if (!TransactionActions.isFetchAction(action)) return false;
        const actionId = `${action.payload.networkId}-${action.payload.hash}`;
        if (cache[actionId]) return false;
        cache[actionId] = true;
        return true;
    };

    yield takeEvery(actionPattern, fetch);
}

function* contractCallTransactionSync(transaction: Transaction) {
    const contracts: Contract[] = yield select(ContractSelector.select);
    const putContractCall: any[] = [];
    contracts
        .filter(contract => contract.networkId === transaction.networkId)
        .map(contract => {
            Object.entries(contract.methods ?? {}).map(([methodName, method]) => {
                Object.values(method).map(contractCall => {
                    if (
                        !!contractCall.sync &&
                        isContractCallTransactionSync(contractCall.sync) &&
                        contractCall.sync.filter(transaction)
                    ) {
                        putContractCall.push(
                            put(
                                ContractActions.call({
                                    address: contract.address,
                                    networkId: contract.networkId,
                                    method: methodName,
                                    ...contractCall,
                                }),
                            ),
                        );
                    }
                });
            });
        });

    yield all(putContractCall);
}

/** Yields for each transaction on creation and blockNumber update */
function* onCreateLoop() {
    const cache: { [key: string]: number } = {};
    while (true) {
        const action: TransactionActions.CreateAction = yield take(TransactionActions.CREATE);
        const transaction = action.payload;
        const id = transactionId(transaction);
        if (transaction.blockNumber && cache[id] != transaction.blockNumber) {
            //Call transaction sync on first confirmed create or block update
            cache[id] = transaction.blockNumber;
            yield contractCallTransactionSync(transaction);
        }
    }
}

export function* saga() {
    yield all([fetchLoop(), onCreateLoop()]);
}
