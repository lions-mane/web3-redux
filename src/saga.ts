import { all, fork, put, takeEvery } from 'redux-saga/effects';
import Web3 from 'web3';

import { saga as blockSaga } from './block/sagas';
import { saga as transactionSaga } from './transaction/sagas';
import { saga as contractSaga } from './contract/sagas';
import { InitializeAction, INITIALIZE } from './actions';
import { NetworkActions } from '.';

function* initialize(action: InitializeAction) {
    if (action.payload.networks) {
        const putActions = action.payload.networks.map(n => put(NetworkActions.create(n)));
        yield all(putActions);
    } else {
        const localRpc = process.env.REACT_APP_LOCAL_RPC ?? process.env.LOCAL_RPC;
        const mainnetRpc = process.env.REACT_APP_MAINNET_RPC ?? process.env.MAINNET_RPC;
        const ropstenRpc = process.env.REACT_APP_ROPSTEN_RPC ?? process.env.ROPSTEN_RPC;
        const kovanRpc = process.env.REACT_APP_KOVAN_RPC ?? process.env.KOVAN_RPC;
        const rinkebyRpc = process.env.REACT_APP_RINKEBY_RPC ?? process.env.RINKEBY_RPC;
        const goerliRpc = process.env.REACT_APP_GOERLI_RPC ?? process.env.GOERLI_RPC;
        if (localRpc) yield put(NetworkActions.create({ networkId: '1337', web3: new Web3(localRpc) }));
        if (mainnetRpc) yield put(NetworkActions.create({ networkId: '1', web3: new Web3(mainnetRpc) }));
        if (ropstenRpc) yield put(NetworkActions.create({ networkId: '3', web3: new Web3(ropstenRpc) }));
        if (kovanRpc) yield put(NetworkActions.create({ networkId: '42', web3: new Web3(kovanRpc) }));
        if (rinkebyRpc) yield put(NetworkActions.create({ networkId: '4', web3: new Web3(rinkebyRpc) }));
        if (goerliRpc) yield put(NetworkActions.create({ networkId: '5', web3: new Web3(goerliRpc) }));
    }
}

function* web3ReduxSaga() {
    yield all([takeEvery(INITIALIZE, initialize)]);
}

//https://redux-saga.js.org/docs/advanced/RootSaga.html
export default function* rootSaga() {
    yield all([fork(blockSaga), fork(transactionSaga), fork(contractSaga), fork(web3ReduxSaga)]);
}
