import { put, call, takeEvery } from 'redux-saga/effects';
import { Transaction } from './model';
import { create, FETCH, FetchAction } from './actions';
import { web3ForNetworkId } from '../utils';

export function* fetch(action: FetchAction) {
    const { payload } = action;
    const web3 = web3ForNetworkId(payload.networkId);
    const transaction: Transaction = yield call(web3.eth.getTransaction, payload.hash);
    yield put(create({ ...transaction, networkId: payload.networkId }));
}

export function* saga() {
    yield takeEvery(FETCH, fetch);
}
