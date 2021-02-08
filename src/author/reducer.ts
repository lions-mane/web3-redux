import { Action, CREATE, UPDATE, REMOVE, FETCH, CreateAction, UpdateAction, RemoveAction } from './actions';

export function reducer(sess: any, action: Action) {
    const Model = sess.Author;
    switch (action.type) {
        case CREATE:
            Model.create({ ...(action as CreateAction).payload });
            break;
        case UPDATE:
            Model.withId((action as UpdateAction).payload.name).update({ ...(action as UpdateAction).payload });
            break;
        case REMOVE:
            Model.withId((action as RemoveAction).payload).delete();
            break;
        case FETCH:
            break;
    }

    return sess;
}
