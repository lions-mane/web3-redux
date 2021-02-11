import { ReducerAction, isCreateAction, isUpdateAction, isRemoveAction } from './actions';

export function reducer(sess: any, action: ReducerAction) {
    const Model = sess.Contract;
    const id = Model.toId(action.payload);
    if (isCreateAction(action)) {
        const methods = action.payload.abi
            .filter(item => item.type == 'function')
            .map(item => item.name!)
            .reduce((acc, m) => {
                return { ...acc, [m]: {} };
            }, {});
        Model.create({ ...action.payload, methods, id });
    } else if (isUpdateAction(action)) Model.withId(id).update({ ...action.payload, id });
    else if (isRemoveAction(action)) Model.withId(id).delete();

    return sess;
}
