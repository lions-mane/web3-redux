import { put, call, takeEvery } from 'redux-saga/effects';
import { create, FETCH, FetchAction } from './actions';
import { web3ForNetworkId } from '../utils';
import { Block, BlockTransaction } from './model';

export function* fetch(action: FetchAction) {
    const web3 = web3ForNetworkId(action.payload.networkId);
    const { payload } = action;
    const block: Block | BlockTransaction = yield call(
        web3.eth.getBlock,
        payload.blockHashOrBlockNumber,
        payload.returnTransactionObjects ?? false,
    );
    yield put(create({ ...block, networkId: payload.networkId }));
}

export function* saga() {
    yield takeEvery(FETCH, fetch);
}
