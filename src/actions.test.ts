import { assert } from 'chai';
import { CREATE, UPDATE, REMOVE, create, update, remove } from './author/actions';

describe('actions', () => {
    it('create', () => {
        const expected = {
            type: CREATE,
            payload: { name: 'Shakespeare' },
        };
        assert.deepEqual(create({ name: 'Shakespeare' }), expected);
    });

    it('update', () => {
        const expected = {
            type: UPDATE,
            payload: { name: 'Shakespeare' },
        };
        assert.deepEqual(update({ name: 'Shakespeare' }), expected);
    });

    it('remove', () => {
        const expected = {
            type: REMOVE,
            payload: 0,
        };
        assert.deepEqual(remove(0), expected);
    });
});
