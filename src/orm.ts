import { ORM } from 'redux-orm';
import { Model as AuthorModel } from './author/model';
import { Model as BookModel } from './book/model';
import * as AuthorActions from './author/actions';
import * as BookActions from './book/actions';
import { reducer as authorReducer } from './author/reducer';
import { reducer as bookReducer } from './book/reducer';

const orm = new ORM({
    stateSelector: (state: any) => state.orm,
});
orm.register(AuthorModel);
orm.register(BookModel);

export const initializeState = (orm: any) => {
    const state = orm.getEmptyState();
    return state;
};

type Action = {
    type: string;
    payload: any;
    [key: string]: any;
};

export function reducer(state: any, action: Action) {
    const sess = orm.session(state || initializeState(orm));

    switch (action.type) {
        case AuthorActions.CREATE:
        case AuthorActions.UPDATE:
        case AuthorActions.REMOVE:
            authorReducer(sess, action as AuthorActions.Action);
        case BookActions.CREATE:
        case BookActions.UPDATE:
        case BookActions.REMOVE:
            bookReducer(sess, action as BookActions.Action);
    }

    return sess.state;
}

export { orm };
