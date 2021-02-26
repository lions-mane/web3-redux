import { all, fork } from 'redux-saga/effects';

import { saga as blockSaga } from './block/sagas';
import { saga as transactionSaga } from './transaction/sagas';
import { saga as contractSaga } from './contract/sagas';
import { saga as ethCallSaga } from './ethcall/sagas';
import { saga as web3ReduxSaga } from './web3Redux/sagas';

//https://redux-saga.js.org/docs/advanced/RootSaga.html
export function* rootSaga() {
    yield all([fork(blockSaga), fork(transactionSaga), fork(contractSaga), fork(ethCallSaga), fork(web3ReduxSaga)]);
}
