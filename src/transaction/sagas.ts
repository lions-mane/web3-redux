import { put, call, takeEvery, select, all, fork } from 'redux-saga/effects';
import { Transaction } from './model';
import { create, FETCH, FetchAction } from './actions';
import { web3ForNetworkId } from '../utils';
import * as ContractSelector from '../contract/selector';
import * as ContractActions from '../contract/actions';
import { Contract, isContractCallTransactionSync } from '../contract/model';

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

export function* fetch(action: FetchAction) {
    const { payload } = action;
    const web3 = web3ForNetworkId(payload.networkId);
    const transaction: Transaction = yield call(web3.eth.getTransaction, payload.hash);
    const newTransaction = { ...transaction, networkId: payload.networkId };
    yield put(create(newTransaction));
    //@ts-ignore
    yield fork(handleTransactionUpdate, newTransaction);
}

export function* saga() {
    yield takeEvery(FETCH, fetch);
}
