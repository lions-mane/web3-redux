import { Action, CREATE, UPDATE, REMOVE, CreateAction, UpdateAction, RemoveAction } from './actions';

export function reducer(sess: any, action: Action) {
    const Model = sess.Network;
    switch (action.type) {
        case CREATE:
            Model.create({ ...(action as CreateAction).payload });
            break;
        case UPDATE:
            Model.withId((action as UpdateAction).payload.networkId).update({ ...(action as UpdateAction).payload });
            break;
        case REMOVE:
            Model.withId((action as RemoveAction).payload).delete();
            break;
    }

    return sess;
}
