import { ReducerAction, isCreateAction, isUpdateAction, isRemoveAction } from './actions';

export function reducer(sess: any, action: ReducerAction) {
    const Model = sess.Transaction;
    const id = Model.toId(action.payload);
    const blockId = Model.toBlockId(action.payload);
    if (isCreateAction(action)) Model.create({ ...action.payload });
    else if (isUpdateAction(action)) Model.withId(id).update({ ...action.payload, id, blockId });
    else if (isRemoveAction(action)) Model.withId(id).delete();

    return sess;
}
