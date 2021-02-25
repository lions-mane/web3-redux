import { ORM } from 'redux-orm';
import { Model as NetworkModel } from './network/model';
import { Model as BlockModel } from './block/model';
import { Model as TransactionModel } from './transaction/model';
import { Model as ContractModel } from './contract/model';
import { Model as EthCallModel } from './ethcall/model';
import * as NetworkActions from './network/actions';
import * as BlockActions from './block/actions';
import * as TransactionActions from './transaction/actions';
import * as ContractActions from './contract/actions';
import * as EthCallActions from './ethcall/actions';
import * as Web3ReduxActions from './actions';
import { reducer as networkReducer } from './network/reducer';
import { reducer as blockReducer } from './block/reducer';
import { reducer as transactionReducer } from './transaction/reducer';
import { reducer as contractReducer } from './contract/reducer';
import { reducer as ethCallReducer } from './ethcall/reducer';

const orm = new ORM({
    stateSelector: (state: any) => state.web3Redux,
});
orm.register(NetworkModel);
orm.register(BlockModel);
orm.register(TransactionModel);
orm.register(ContractModel);
orm.register(EthCallModel);

export const initializeState = (orm: any) => {
    const state = orm.getEmptyState();
    return state;
};

type Action =
    | NetworkActions.Action
    | BlockActions.Action
    | TransactionActions.Action
    | ContractActions.Action
    | EthCallActions.Action
    | Web3ReduxActions.Action;

export function reducer(state: any, action: Action) {
    const sess = orm.session(state || initializeState(orm));
    if (NetworkActions.isReducerAction(action)) networkReducer(sess, action);
    else if (BlockActions.isReducerAction(action)) blockReducer(sess, action);
    else if (TransactionActions.isReducerAction(action)) transactionReducer(sess, action);
    else if (ContractActions.isReducerAction(action)) contractReducer(sess, action);
    else if (EthCallActions.isReducerAction(action)) ethCallReducer(sess, action);

    return sess.state;
}

export { orm };
