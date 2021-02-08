import { combineReducers, createStore as createReduxStore } from 'redux';
import { reducer as ormReducer } from './orm';

const reducers = combineReducers({
    orm: ormReducer,
});

export const createStore = () => createReduxStore(reducers, {});

export default createStore();
