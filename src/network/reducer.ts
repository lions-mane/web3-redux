import { ZERO_ADDRESS } from '../utils';
import { Action, CREATE, UPDATE, REMOVE, CreateAction, UpdateAction, RemoveAction } from './actions';

export function reducer(sess: any, action: Action) {
    const Model = sess.Network;
    switch (action.type) {
        case CREATE:
            const createAction = action as CreateAction;
            if (!createAction.payload.web3.eth.defaultAccount) {
                createAction.payload.web3.eth.defaultAccount = ZERO_ADDRESS;
            }
            Model.upsert({ ...(action as CreateAction).payload });
            break;
        case UPDATE:
            Model.withId((action as UpdateAction).payload.networkId).update({ ...(action as UpdateAction).payload });
            break;
        case REMOVE:
            Model.withId((action as RemoveAction).payload).delete();
            break;
    }

    return sess;
}
