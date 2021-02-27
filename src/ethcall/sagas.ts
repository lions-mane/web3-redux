import { put, call, select, takeEvery, all } from 'redux-saga/effects';
import { validatedEthCall } from './model';
import * as EthCallActions from './actions';
import { ZERO_ADDRESS } from '../utils';

import { Network } from '../network/model';
import * as NetworkSelector from '../network/selector';

function* fetchSaga(action: EthCallActions.FetchAction) {
    const { payload } = action;
    const network: Network = yield select(NetworkSelector.selectSingle, payload.networkId);
    if (!network)
        throw new Error(
            `Could not find Network with id ${payload.networkId}. Make sure to dispatch a Network/CREATE action.`,
        );
    const web3 = network.web3;

    const from: string = payload.from ?? web3.eth.defaultAccount ?? ZERO_ADDRESS;
    const validated = validatedEthCall({ ...payload, from });
    yield put(EthCallActions.create(validated));

    const gas = validated.gas ?? (yield call(web3.eth.estimateGas, { ...validated })); //default gas

    //@ts-ignore
    const returnValue = yield call(web3.eth.call, { ...validated, gas }, validated.defaultBlock);
    yield put(EthCallActions.create({ ...validated, returnValue }));
}

export function* saga() {
    yield all([takeEvery(EthCallActions.FETCH, fetchSaga)]);
}
