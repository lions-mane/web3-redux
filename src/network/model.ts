import { attr, Model as ORMModel } from 'redux-orm';
import Web3 from 'web3';

export interface NetworkId {
    networkId: string;
}
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
