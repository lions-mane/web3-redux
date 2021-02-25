import { ReducerAction, isCreateAction, isRemoveAction } from './actions';
import { transactionBlockId, transactionId } from './model';

export function reducer(sess: any, action: ReducerAction) {
    const Model = sess.Transaction;
    const id = transactionId(action.payload);
    if (isCreateAction(action)) {
        const blockId = transactionBlockId(action.payload);
        Model.upsert({ ...action.payload, id, blockId });
    } else if (isRemoveAction(action)) Model.withId(id).delete();

    return sess;
}
