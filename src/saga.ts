import { all, fork } from 'redux-saga/effects';
import { saga as blockSaga } from './block/sagas';
import { saga as transactionSaga } from './transaction/sagas';
import { saga as contractSaga } from './contract/sagas';

//https://redux-saga.js.org/docs/advanced/RootSaga.html
export default function* rootSaga() {
    yield all([fork(blockSaga), fork(transactionSaga), fork(contractSaga)]);
}
