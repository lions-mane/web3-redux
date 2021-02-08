import { combineReducers, createStore as createReduxStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { BlockHeader } from './block/model';
import { Transaction } from './transaction/model';
import { Contract } from './contract/model';

import { reducer as ormReducer } from './orm';
import rootSaga from './saga';

export interface Web3ReduxStore {
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
}

const reducers = combineReducers({
    web3Redux: ormReducer,
});

export const createStore = () => {
    const sagaMiddleware = createSagaMiddleware();
    const store = createReduxStore(reducers, applyMiddleware(sagaMiddleware));
    sagaMiddleware.run(rootSaga);
    return store;
};

export default createStore();
