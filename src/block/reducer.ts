import { ReducerAction, isCreateAction, isUpdateAction, isRemoveAction } from './actions';
import { Model, isBlockTransactionObject, isBlockTransactionString } from './model';

export function reducer(sess: any, action: ReducerAction) {
    const { Block, Transaction } = sess;
    const id = Model.toId(action.payload);
    if (isCreateAction(action)) {
        Block.create({ ...action.payload, id });
        if (isBlockTransactionString(action.payload)) {
            action.payload.transactions.forEach((hash: string) => {
                Transaction.create({ hash, networkId: action.payload.networkId, blockNumber: action.payload.number });
            });
        } else if (isBlockTransactionObject(action.payload)) {
            action.payload.transactions.forEach(tx => {
                Transaction.create({ ...tx, networkId: action.payload.networkId });
            });
        }
    } else if (isUpdateAction(action)) Block.withId(id).update({ ...action.payload, id });
    else if (isRemoveAction(action)) Block.withId(id).delete();

    return sess;
}
