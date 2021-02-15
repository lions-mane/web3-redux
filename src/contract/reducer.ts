import { ReducerAction, isCreateAction, isUpdateAction, isRemoveAction } from './actions';

export function reducer(sess: any, action: ReducerAction) {
    const { Contract, Network } = sess;
    const network = Network.withId(action.payload.networkId);
    if (!network)
        throw new Error(
            `Could not find Network with id ${action.payload.networkId}. Make sure to dispatch a Network/CREATE action.`,
        );

    const id = Contract.toId(action.payload);
    if (isCreateAction(action)) {
        const methods =
            action.payload.methods ??
            action.payload.abi
                .filter(item => item.type == 'function')
                .map(item => item.name!)
                .reduce((acc, m) => {
                    return { ...acc, [m]: {} };
                }, {});
        const events =
            action.payload.events ??
            action.payload.abi
                .filter(item => item.type == 'event')
                .map(item => item.name!)
                .reduce((acc, m) => {
                    return { ...acc, [m]: {} };
                }, {});
        const web3Contract =
            action.payload.web3Contract ?? new network.web3.eth.Contract(action.payload.abi, action.payload.address);
        Contract.create({ ...action.payload, methods, events, web3Contract, id });
    } else if (isUpdateAction(action)) {
        const methods =
            action.payload.methods ??
            action.payload.abi
                .filter(item => item.type == 'function')
                .map(item => item.name!)
                .reduce((acc, m) => {
                    return { ...acc, [m]: {} };
                }, {});
        const events =
            action.payload.events ??
            action.payload.abi
                .filter(item => item.type == 'event')
                .map(item => item.name!)
                .reduce((acc, m) => {
                    return { ...acc, [m]: {} };
                }, {});
        const web3Contract =
            action.payload.web3Contract ?? new network.web3.eth.Contract(action.payload.abi, action.payload.address);
        Contract.withId(id).update({ ...action.payload, methods, events, web3Contract, id });
    } else if (isRemoveAction(action)) {
        Contract.withId(id).delete();
    }
    return sess;
}
