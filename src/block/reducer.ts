import { ReducerAction, isCreateAction, isUpdateAction, isRemoveAction } from './actions';
import { blockId } from './model';

export function reducer(sess: any, action: ReducerAction) {
    const { Block } = sess;
    const id = blockId(action.payload);
    if (isCreateAction(action)) {
        const { payload } = action;
        payload.id = id;
        //transactions created in middleware
        const insertData = { ...payload, transactions: undefined };
        //@ts-ignore
        delete insertData.transactions;
        Block.upsert(insertData);
    } else if (isUpdateAction(action)) {
        const { payload } = action;
        payload.id = id;
        //transactions created in middleware
        const insertData = { ...payload, transactions: undefined };
        //@ts-ignore
        delete insertData.transactions;
        Block.withId(id).update(insertData);
    } else if (isRemoveAction(action)) Block.withId(id).delete();

    return sess;
}
