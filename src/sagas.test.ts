import { assert } from 'chai';
import { put } from 'redux-saga/effects';
import { create, fetch as fetchAction } from './author/actions';
import { fetch as fetchSaga } from './author/sagas';

describe('sagas', () => {
    it('fetch', () => {
        const gen = fetchSaga(fetchAction(0));
        assert.deepEqual(gen.next().value, put(create({ name: 'Shakespeare', nationality: 'English' })));
    });
});
