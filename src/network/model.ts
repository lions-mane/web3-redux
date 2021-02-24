import { attr, Model as ORMModel } from 'redux-orm';
import Web3 from 'web3';

/**
 * EVM Network Id object.
 *
 * @param networkId - A network id.
 */
export interface NetworkId {
    networkId: string;
}

/**
 * EVM Network object.
 * @see {@link https://chainid.network//} for a list of popular EVM Networks.
 *
 * @param networkId - A network id.
 * @param web3 - A web3 object.
 */
export type Network = {
    networkId: string;
    web3: Web3;
};

class Model extends ORMModel {
    static options = {
        idAttribute: 'networkId',
    };

    static modelName = 'Network';

    static fields = {
        networkId: attr(),
        web3: attr(),
    };
}

export { Model };
