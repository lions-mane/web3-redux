import * as NetworkActions from './network/actions';
import * as BlockActions from './block/actions';
import * as TransactionActions from './transaction/actions';
import * as ContractActions from './contract/actions';
import * as EthCallActions from './ethcall/actions';
import * as Web3ReduxActions from './web3Redux/actions';
import { reducer as networkReducer } from './network/reducer';
import { reducer as blockReducer } from './block/reducer';
import { reducer as transactionReducer } from './transaction/reducer';
import { reducer as contractReducer } from './contract/reducer';
import { reducer as ethCallReducer } from './ethcall/reducer';

import { orm, initializeState } from './orm';

export type Action =
    | NetworkActions.Action
    | BlockActions.Action
    | TransactionActions.Action
    | ContractActions.Action
    | EthCallActions.Action
    | Web3ReduxActions.Action;

export function rootReducer(state: any, action: Action) {
    const sess = orm.session(state || initializeState(orm));
    if (NetworkActions.isReducerAction(action)) networkReducer(sess, action);
    else if (BlockActions.isReducerAction(action)) blockReducer(sess, action);
    else if (TransactionActions.isReducerAction(action)) transactionReducer(sess, action);
    else if (ContractActions.isReducerAction(action)) contractReducer(sess, action);
    else if (EthCallActions.isReducerAction(action)) ethCallReducer(sess, action);

    return sess.state;
}
