import { Model as ORMModel } from 'redux-orm';
import { NetworkId } from '../network/model';

/**
 * EthCall object. Used to index web3.eth.call() and enable better contract memoization.
 * {@link https://web3js.readthedocs.io/en/v1.3.4/web3-eth.html#call}
 *
 * @param id - Call id. Computed as `${networkId}-${from}-${to}-${data}-${value}-${gas}-${gasPrice}`.
 */
export interface EthCall extends NetworkId {
    id?: string;
    from: string;
    to: string;
    defaultBlock?: string;
    data: string;
    value?: string; //eth value
    gas?: string;
    gasPrice?: string;
    returnValue?: string; //returned value from smart contract
}

export type EthCallId = string | EthCall;

class Model extends ORMModel {
    static options = {
        idAttribute: 'id',
    };

    static modelName = 'EthCall';

    static fields = {};
}

export function ethCallId(ethcall: EthCall) {
    const { networkId, from, to, defaultBlock, data, value, gas, gasPrice } = ethcall;
    return `${networkId}-${from}-${to}-${defaultBlock ?? 'latest'}-${data}-${value}-${gas}-${gasPrice}`;
}

export { Model };
