import { all, fork, put, takeEvery } from 'redux-saga/effects';
import Web3 from 'web3';
import dotenv from 'dotenv';

import { Network } from './network/model';
import { SubscribeActionInput } from './block/actions';
import { saga as blockSaga } from './block/sagas';
import { saga as transactionSaga } from './transaction/sagas';
import { saga as contractSaga } from './contract/sagas';
import { InitializeAction, INITIALIZE } from './actions';
import * as NetworkActions from './network/actions';
import * as BlockActions from './block/actions';

dotenv.config();

function* initialize(action: InitializeAction) {
    let blockSubscribe: { [networkId: string]: SubscribeActionInput } | boolean;

    if (typeof action.payload.blockSubscribe === 'boolean') {
        blockSubscribe = action.payload.blockSubscribe;
    } else if (!!action.payload.blockSubscribe) {
        blockSubscribe = action.payload.blockSubscribe?.reduce((acc, action) => {
            return { ...acc, [action.networkId]: action };
        }, {});
    } else {
        blockSubscribe = true; //default
    }

    const networks: Network[] = action.payload.networks ?? [];

    if (!action.payload.networks) {
        const localRpc = process.env.LOCAL_RPC ?? process.env.REACT_APP_LOCAL_RPC ?? process.env.NEXT_PUBLIC_LOCAL_RPC;
        const mainnetRpc =
            process.env.MAINNET_RPC ?? process.env.REACT_APP_MAINNET_RPC ?? process.env.NEXT_PUBLIC_MAINNET_RPC;
        const ropstenRpc =
            process.env.ROPSTEN_RPC ?? process.env.REACT_APP_ROPSTEN_RPC ?? process.env.NEXT_PUBLIC_ROPSTEN_RPC;
        const kovanRpc = process.env.KOVAN_RPC ?? process.env.REACT_APP_KOVAN_RPC ?? process.env.NEXT_PUBLIC_KOVAN_RPC;
        const rinkebyRpc =
            process.env.RINKEBY_RPC ?? process.env.REACT_APP_RINKEBY_RPC ?? process.env.NEXT_PUBLIC_RINKEBY_RPC;
        const goerliRpc =
            process.env.GOERLI_RPC ?? process.env.REACT_APP_GOERLI_RPC ?? process.env.NEXT_PUBLIC_GOERLI_RPC;
        if (localRpc) networks.push({ networkId: '1337', web3: new Web3(localRpc) });
        if (mainnetRpc) networks.push({ networkId: '1', web3: new Web3(mainnetRpc) });
        if (ropstenRpc) networks.push({ networkId: '3', web3: new Web3(ropstenRpc) });
        if (kovanRpc) networks.push({ networkId: '42', web3: new Web3(kovanRpc) });
        if (rinkebyRpc) networks.push({ networkId: '4', web3: new Web3(rinkebyRpc) });
        if (goerliRpc) networks.push({ networkId: '5', web3: new Web3(goerliRpc) });
    }

    const putActions = networks.map(n => put(NetworkActions.create(n)));
    const subscribeActions = networks
        .map(n => {
            if (blockSubscribe === false) {
                return null;
            } else if (blockSubscribe === true) {
                return put(BlockActions.subscribe({ networkId: n.networkId, returnTransactionObjects: true }));
            } else if (blockSubscribe[n.networkId]) {
                return put(BlockActions.subscribe(blockSubscribe[n.networkId]));
            }

            return null;
        })
        .filter(t => !!t);
    yield all([...putActions, ...subscribeActions]);
}

function* web3ReduxSaga() {
    yield all([takeEvery(INITIALIZE, initialize)]);
}

//https://redux-saga.js.org/docs/advanced/RootSaga.html
export default function* rootSaga() {
    yield all([fork(blockSaga), fork(transactionSaga), fork(contractSaga), fork(web3ReduxSaga)]);
}
