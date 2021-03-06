import { combineReducers, createStore as createReduxStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { Network } from './network/model';
import { BlockHeader } from './block/model';
import { Transaction } from './transaction/model';
import { Contract } from './contract/model';
import { EthCall } from './ethcall/model';

import { rootReducer } from './reducer';
import { rootSaga } from './saga';

export interface Web3ReduxStore {
    Network: {
        itemsById: {
            [id: string]: Network; //`${networkId}`
        };
    };
    Block: {
        itemsById: {
            [id: string]: BlockHeader; //`${networkId}-${number}`
        };
    };
    Transaction: {
        itemsById: {
            [id: string]: Transaction; //`${networkId}-${hash}`
        };
    };
    Contract: {
        itemsById: {
            [id: string]: Contract; //`${networkId}-${address}`
        };
    };
    EthCall: {
        itemsById: {
            [id: string]: EthCall; //`${networkId}-${from}-${to}-${data}-${gas}`.
        };
    };
}

const reducers = combineReducers({
    web3Redux: rootReducer,
});

export const createStore = () => {
    const sagaMiddleware = createSagaMiddleware();
    const store = createReduxStore(reducers, applyMiddleware(sagaMiddleware));
    sagaMiddleware.run(rootSaga);
    return store;
};

export default createStore();
