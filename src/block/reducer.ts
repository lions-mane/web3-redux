import { ReducerAction, isCreateAction, isUpdateAction, isRemoveAction } from './actions';
import { Model, isBlockTransactionObject, isBlockTransactionString } from './model';
import { Model as TransactionModel } from '../transaction/model';

export function reducer(sess: any, action: ReducerAction) {
    const { Block, Transaction } = sess;
    const id = Model.toId(action.payload);
    if (isCreateAction(action)) {
        const { payload } = action;

        if (isBlockTransactionString(payload)) {
            const transactions = payload.transactions;
            //@ts-ignore
            delete payload.transactions;
            Block.create({ ...payload, id });
            transactions.forEach((hash: string) => {
                Transaction.create({
                    hash,
                    networkId: payload.networkId,
                    blockNumber: payload.number,
                    blockId: id,
                    id: TransactionModel.toId({ hash, networkId: payload.networkId }),
                });
            });
        } else if (isBlockTransactionObject(payload)) {
            const transactions = payload.transactions;
            //@ts-ignore
            delete payload.transactions;
            Block.create({ ...payload, id });
            transactions.forEach(tx => {
                Transaction.create({
                    ...tx,
                    networkId: payload.networkId,
                    blockId: id,
                    id: TransactionModel.toId({ hash: tx.hash, networkId: payload.networkId }),
                });
            });
        } else {
            Block.create({ ...action.payload, id });
        }
    } else if (isUpdateAction(action)) Block.withId(id).update({ ...action.payload, id });
    else if (isRemoveAction(action)) Block.withId(id).delete();

    return sess;
}
