import { put, call, select, takeEvery } from 'redux-saga/effects';
import { web3ForNetworkId } from '../utils';
import { Contract, Model } from './model';
import { CALL, CallAction, update } from './actions';
import * as ContractSelector from './selector';
import { ContractSendMethod } from 'web3-eth-contract';

function argsHash({ from, defaultBlock, args }: { from: string; defaultBlock: string | number; args?: any[] }) {
    if (!args || args.length == 0) {
        return `().call(${defaultBlock},${JSON.stringify({ from })})`;
    } else {
        return `(${args}).call(${defaultBlock},${JSON.stringify({ from })})`;
    }
}

export function* contractCall(action: CallAction) {
    const { payload } = action;
    const web3 = web3ForNetworkId(payload.networkId);
    const id = Model.toId(payload);
    //@ts-ignore
    const contract: Contract = yield select(ContractSelector.select, id);
    const web3Contract = new web3.eth.Contract(contract.abi, contract.address);
    const defaultBlock = payload.defaultBlock ?? 'latest';
    const from: string = payload.options?.from || web3.eth.defaultAccount!;
    const gasPrice = payload.options?.gasPrice ?? 0;

    if (!payload.args || payload.args.length == 0) {
        const tx: ContractSendMethod = web3Contract.methods[payload.method]();
        //@ts-ignore
        const gas = payload.options?.gas || (yield call(tx.estimateGas, { from }));
        const key = argsHash({ from, defaultBlock });
        //@ts-ignore
        const value = yield call(tx.call, { from, gas, gasPrice }, defaultBlock);
        contract.methods![payload.method][key] = { value, defaultBlock };
    } else {
        const tx: ContractSendMethod = web3Contract.methods[payload.method](payload.args);
        const key = argsHash({ from, defaultBlock, args: payload.args });
        //@ts-ignore
        const value = yield call(tx.call, { from, gas, gasPrice }, defaultBlock);
        contract.methods![payload.method][key] = { value, defaultBlock, args: payload.args };
    }

    yield put(update({ ...contract }));
}

export function* saga() {
    yield takeEvery(CALL, contractCall);
}
