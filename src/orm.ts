import { ORM } from 'redux-orm';
import { Model as BlockModel } from './block/model';
import { Model as TransactionModel } from './transaction/model';
import { Model as ContractModel } from './contract/model';
import * as BlockActions from './block/actions';
import * as TransactionActions from './transaction/actions';
import * as ContractActions from './contract/actions';
import { reducer as blockReducer } from './block/reducer';
import { reducer as transactionReducer } from './transaction/reducer';
import { reducer as contractReducer } from './contract/reducer';

const orm = new ORM({
    stateSelector: (state: any) => state.orm,
});
orm.register(BlockModel);
orm.register(TransactionModel);
orm.register(ContractModel);

export const initializeState = (orm: any) => {
    const state = orm.getEmptyState();
    return state;
};

type Action = BlockActions.Action | TransactionActions.Action | ContractActions.Action;

export function reducer(state: any, action: Action) {
    const sess = orm.session(state || initializeState(orm));
    if (BlockActions.isReducerAction(action)) blockReducer(sess, action);
    else if (TransactionActions.isReducerAction(action)) transactionReducer(sess, action);
    else if (ContractActions.isReducerAction(action)) contractReducer(sess, action);

    return sess.state;
}

export { orm };
