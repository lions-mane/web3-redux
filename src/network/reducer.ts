import { ZERO_ADDRESS } from '../utils';
import { Action, isCreateAction, isRemoveAction } from './actions';

export function reducer(sess: any, action: Action) {
    const Model = sess.Network;
    if (isCreateAction(action)) {
        const payload = { ...action.payload };
        if (!payload.web3.eth.defaultAccount) {
            payload.web3.eth.defaultAccount = ZERO_ADDRESS;
        }
        if (!payload.web3Sender) payload.web3Sender = payload.web3;
        Model.upsert(payload);
    } else if (isRemoveAction(action)) {
        Model.withId(action.payload).delete();
    }

    return sess;
}
