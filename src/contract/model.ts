import { attr, Model as ORMModel } from 'redux-orm';
import { AbiItem } from 'web3-utils';
import { NetworkId } from '../network/model';

export interface Contract extends NetworkId {
    id?: string;
    address: string;
    abi: AbiItem[];
}
export interface ContractId extends NetworkId {
    address: string;
}

class Model extends ORMModel {
    static options = {
        idAttribute: 'id',
    };

    static modelName = 'Contract';

    static fields = {
        address: attr(),
        abi: attr(),
    };

    static toId({ address, networkId }: ContractId) {
        return `${networkId}-${address}`;
    }
}

export { Model };
