import { ReducerAction, isCreateAction, isRemoveAction } from './actions';
import { validatedContract, contractId } from './model';

export function reducer(sess: any, action: ReducerAction) {
    const { Contract, Network } = sess;

    if (isCreateAction(action)) {
        const network = Network.withId(action.payload.networkId);
        if (!network)
            throw new Error(
                `Could not find Network with id ${action.payload.networkId}. Make sure to dispatch a Network/CREATE action.`,
            );

        const validated = validatedContract(action.payload);
        validated.web3Contract =
            validated.web3Contract ?? new network.web3.eth.Contract(validated.abi, validated.address);
        validated.web3SenderContract =
            validated.web3SenderContract ?? new network.web3Sender.eth.Contract(validated.abi, validated.address);
        Contract.upsert(validated);
    } else if (isRemoveAction(action)) {
        if (typeof action.payload === 'string') {
            Contract.withId(action.payload).delete();
        } else {
            Contract.withId(contractId(action.payload)).delete();
        }
    }
    return sess;
}
