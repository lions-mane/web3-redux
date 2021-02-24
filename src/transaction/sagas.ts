import { put, call, takeEvery, select, all, fork } from 'redux-saga/effects';
import { Transaction } from './model';
import { Contract, isContractCallTransactionSync } from '../contract/model';

import * as TransactionActions from './actions';
import * as ContractActions from '../contract/actions';

import * as NetworkSelector from '../network/selector';
import * as ContractSelector from '../contract/selector';

function* handleTransactionUpdate(transaction: Transaction) {
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

export function* fetch(action: TransactionActions.FetchAction) {
    const { payload } = action;
    //@ts-ignore
    const network: Network = yield select(NetworkSelector.select, payload.networkId);
    if (!network)
        throw new Error(
            `Could not find Network with id ${payload.networkId}. Make sure to dispatch a Network/CREATE action.`,
        );
    const web3 = network.web3;
    const transaction: Transaction = yield call(web3.eth.getTransaction, payload.hash);
    const newTransaction = { ...transaction, networkId: payload.networkId };
    yield put(TransactionActions.create(newTransaction));
    //@ts-ignore
    yield fork(handleTransactionUpdate, newTransaction);
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

export function* saga() {
    yield all([fetchLoop()]);
}
