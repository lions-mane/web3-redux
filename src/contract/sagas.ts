import { put, call, select, takeEvery } from 'redux-saga/effects';
import { web3ForNetworkId } from '../utils';
import { Contract, Model } from './model';
import { CALL, CallAction, update } from './actions';
import * as ContractSelector from './selector';
import { ContractSendMethod } from 'web3-eth-contract';

export function* contractCall(action: CallAction) {
    const { payload } = action;
    const web3 = web3ForNetworkId(payload.networkId);
    const id = Model.toId(payload);
    //@ts-ignore
    const contract: Contract = yield select(ContractSelector.select, id);
    const web3Contract = new web3.eth.Contract(contract.abi, contract.address);
    const defaultBlock = payload.defaultBlock ?? 'latest';
    const options = payload.options ?? {};

    let tx: ContractSendMethod;
    let key: string;
    if (!payload.args || payload.args.length == 0) {
        key = `${payload.method}().call(${defaultBlock},${JSON.stringify(options)})`;
        tx = web3Contract.methods[payload.method]();
    } else {
        key = `${payload.method}(${payload.args}).call(${defaultBlock},${JSON.stringify(options)})`;
        tx = web3Contract.methods[payload.method](payload.args);
    }

    const data = yield call(tx.call);
    console.debug(data);
    console.debug(key);

    yield put(update({ ...contract }));

    //Add to call cache
}

export function* saga() {
    yield takeEvery(CALL, contractCall);
}
