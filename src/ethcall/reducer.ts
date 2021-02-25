import { ReducerAction, isCreateAction, isRemoveAction } from './actions';
import { ethCallId } from './model';

export function reducer(sess: any, action: ReducerAction) {
    const Model = sess.EthCall;
    if (isCreateAction(action)) {
        const id = ethCallId(action.payload);
        Model.upsert({ ...action.payload, id });
    } else if (isRemoveAction(action)) {
        if (typeof action.payload === 'string') {
            Model.withId(action.payload).delete();
        } else {
            const id = ethCallId(action.payload);
            Model.withId(id).delete();
        }
    }

    return sess;
}
