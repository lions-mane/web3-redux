import { put, call, select, takeEvery } from 'redux-saga/effects';
import { web3ForNetworkId } from '../utils';
import {
    Contract,
    Model,
    CALL_BLOCK_SYNC,
    ContractCallSync,
    ContractCallBlockSync,
    ContractCallTransactionSync,
    CALL_TRANSACTION_SYNC,
} from './model';
import { CALL, CallAction, update } from './actions';
import * as ContractSelector from './selector';
import { Transaction } from '../transaction/model';

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
    //No sync if block isn't set to "latest"
    let sync: ContractCallSync | undefined;
    if (defaultBlock === 'latest') {
        if (payload.sync != false) {
            const defaultBlockSync: ContractCallBlockSync = {
                type: CALL_BLOCK_SYNC,
                filter: () => true,
            };
            const defaultTransactionSync: ContractCallTransactionSync = {
                type: CALL_TRANSACTION_SYNC,
                filter: (transaction: Transaction) => transaction.to === contract.address,
            };

            if (payload.sync === undefined || payload.sync === true || payload.sync === CALL_TRANSACTION_SYNC) {
                sync = defaultTransactionSync;
            } else if (payload.sync === CALL_BLOCK_SYNC) {
                sync = defaultBlockSync;
            } else {
                sync = payload.sync as ContractCallSync;
            }
        }
    }

    const from: string = payload.options?.from ?? web3.eth.defaultAccount!;
    const gasPrice = payload.options?.gasPrice ?? 0;

    if (!payload.args || payload.args.length == 0) {
        const tx = web3Contract.methods[payload.method]();
        //@ts-ignore
        const gas = payload.options?.gas ?? (yield call(tx.estimateGas, { from }));
        const key = argsHash({ from, defaultBlock });
        //@ts-ignore
        const value = yield call(tx.call, { from, gas, gasPrice }, defaultBlock);
        contract.methods![payload.method][key] = { value, sync, defaultBlock };
    } else {
        const tx = web3Contract.methods[payload.method](payload.args);
        const key = argsHash({ from, defaultBlock, args: payload.args });
        //@ts-ignore
        const value = yield call(tx.call, { from, gas, gasPrice }, defaultBlock);
        contract.methods![payload.method][key] = { value, defaultBlock, sync, args: payload.args };
    }

    yield put(update({ ...contract }));
}

export function* saga() {
    yield takeEvery(CALL, contractCall);
}
