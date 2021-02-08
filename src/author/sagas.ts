import { put, takeEvery } from 'redux-saga/effects';
import { create, FETCH, FetchAction } from './actions';

export function* fetch(action: FetchAction) {
    //Fetch here
    if (action.payload == 0) {
        yield put(create({ name: 'Shakespeare', nationality: 'English' }));
    }
}

export function* saga() {
    yield takeEvery(FETCH, fetch);
}
