import { assert } from 'chai';
import { createStore } from './store';
import * as AuthorActions from './author/actions';
import * as BookActions from './book/actions';
import * as AuthorSelector from './author/selector';
import * as BookSelector from './book/selector';

describe('redux-orm', () => {
    let store: ReturnType<typeof createStore>;
    beforeEach(() => {
        store = createStore();
    });
    it('create', async () => {
        store.dispatch(AuthorActions.create({ name: 'Shakespeare' }));
        store.dispatch(BookActions.create({ name: 'Romeo & Juliet', authorId: 0 }));

        const state = store.getState();

        const expectedAuthorState = {
            0: { id: 0, name: 'Shakespeare' },
        };
        const expectedAuthorSelected = [{ id: 0, name: 'Shakespeare' }];
        const expectedAuthorBooksSelected = [[{ id: 0, name: 'Romeo & Juliet', authorId: 0 }]];
        assert.deepEqual(state.orm['Author'].itemsById, expectedAuthorState, 'state.orm.Author.itemsById');
        assert.deepEqual(AuthorSelector.selectWithId(state), expectedAuthorSelected, 'Author.selectWithId');
        assert.deepEqual(AuthorSelector.selectBooks(state), expectedAuthorBooksSelected, 'Author.selectBooks');

        const expectedBookState = {
            0: { id: 0, name: 'Romeo & Juliet', authorId: 0 },
        };
        const expectedBookSelected = [{ id: 0, name: 'Romeo & Juliet', authorId: 0 }];
        assert.deepEqual(state.orm['Book'].itemsById, expectedBookState, 'state.orm.Book.itemsById');
        assert.deepEqual(BookSelector.selectWithId(state), expectedBookSelected, 'Book.selectWithId');
    });
});
