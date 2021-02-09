import { ORM } from 'redux-orm';
import { Model as BlockModel } from './block/model';
import { Model as TransactionModel } from './transaction/model';
import * as BlockActions from './block/actions';
import * as TransactionActions from './transaction/actions';
import { reducer as blockReducer } from './block/reducer';
import { reducer as transactionReducer } from './transaction/reducer';

const orm = new ORM({
    stateSelector: (state: any) => state.orm,
});
orm.register(BlockModel);
orm.register(TransactionModel);

export const initializeState = (orm: any) => {
    const state = orm.getEmptyState();
    return state;
};

type Action = {
    type: string;
    payload: any;
    [key: string]: any;
};

export function reducer(state: any, action: Action) {
    const sess = orm.session(state || initializeState(orm));

    switch (action.type) {
        case BlockActions.CREATE:
        case BlockActions.UPDATE:
        case BlockActions.REMOVE:
            blockReducer(sess, action as BlockActions.Action);
        case TransactionActions.CREATE:
        case TransactionActions.UPDATE:
        case TransactionActions.REMOVE:
            transactionReducer(sess, action as TransactionActions.Action);
    }

    return sess.state;
}

export { orm };
