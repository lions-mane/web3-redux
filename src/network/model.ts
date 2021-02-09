import { attr, Model as ORMModel } from 'redux-orm';

export interface NetworkId {
    networkId: string;
}
export type Network = {
    networkId: string;
};

class Model extends ORMModel {
    static options = {
        idAttribute: 'hash',
    };

    static modelName = 'Network';

    static fields = {
        networkId: attr(),
    };
}

export { Model };
