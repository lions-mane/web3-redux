import { Action, CREATE, UPDATE, REMOVE, FETCH, CreateAction, UpdateAction, RemoveAction } from './actions';
import { isBlockTransactionObject, isBlockTransactionString } from './model';

export function reducer(sess: any, action: Action) {
    const { Block, Transaction } = sess;
    switch (action.type) {
        case CREATE:
            const createPayload = (action as CreateAction).payload;
            Block.create(createPayload);
            if (isBlockTransactionString(createPayload)) {
                createPayload.transactions.forEach((hash: string) => {
                    Transaction.create({ hash });
                });
            } else if (isBlockTransactionObject(createPayload)) {
                createPayload.transactions.forEach(tx => {
                    Transaction.create({ ...tx });
                });
            }
            break;
        case UPDATE:
            Block.withId((action as UpdateAction).payload).update((action as UpdateAction).payload);
            break;
        case REMOVE:
            Block.withId((action as RemoveAction).payload).delete();
            break;
        case FETCH:
            break;
    }

    return sess;
}
