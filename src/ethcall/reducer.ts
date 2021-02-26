import { ReducerAction, isCreateAction, isRemoveAction } from './actions';
import { validatedEthCall } from './model';

export function reducer(sess: any, action: ReducerAction) {
    const Model = sess.EthCall;
    if (isCreateAction(action)) {
        const validated = validatedEthCall(action.payload);
        Model.upsert({ ...validated });
    } else if (isRemoveAction(action)) {
        if (typeof action.payload === 'string') {
            Model.withId(action.payload).delete();
        } else {
            const validated = validatedEthCall(action.payload);
            Model.withId(validated.id).delete();
        }
    }

    return sess;
}
