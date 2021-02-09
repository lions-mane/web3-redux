import { ReducerAction, isCreateAction, isUpdateAction, isRemoveAction } from './actions';

export function reducer(sess: any, action: ReducerAction) {
    const Model = sess.Contract;
    const id = Model.toId(action.payload);
    if (isCreateAction(action)) Model.create({ ...action.payload, id });
    else if (isUpdateAction(action)) Model.withId(id).update({ ...action.payload, id });
    else if (isRemoveAction(action)) Model.withId(id).delete();

    return sess;
}
