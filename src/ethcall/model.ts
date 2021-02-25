import { Model as ORMModel } from 'redux-orm';
import Web3 from 'web3';
import { NetworkId } from '../network/model';

/**
 * EthCall object. Used to index web3.eth.call() and enable better contract memoization.
 * {@link https://web3js.readthedocs.io/en/v1.3.4/web3-eth.html#call}
 *
 * @param id - Call id. Computed as `${networkId}-${from}-${to}-${data}-${value}-${gas}-${gasPrice}`.
 */
export interface EthCall extends NetworkId {
    id: string;
    from: string;
    to: string;
    defaultBlock: string;
    data: string;
    value?: string; //eth value
    gas?: string;
    gasPrice?: string;
    returnValue?: string; //returned value from smart contract
}

export interface PartialEthCall extends NetworkId {
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

export function validatedEthCall(ethCall: PartialEthCall): EthCall {
    const { networkId, from, to, defaultBlock, data, value, gas, gasPrice } = ethCall;
    const block = defaultBlock ?? 'latest';
    const fromCheckSum = Web3.utils.toChecksumAddress(from);
    const toCheckSum = Web3.utils.toChecksumAddress(to);
    const valueHex = value ? Web3.utils.toHex(value) : value;
    const gasHex = gas ? Web3.utils.toHex(gas) : gas;
    const gasPriceHex = gasPrice ? Web3.utils.toHex(gasPrice) : gasPrice;
    const id = `${networkId}-${fromCheckSum}-${toCheckSum}-${block}-${data}-${valueHex}-${gasHex}-${gasPriceHex}`;

    return {
        ...ethCall,
        id,
        from: fromCheckSum,
        to: toCheckSum,
        defaultBlock: block,
        value: valueHex,
        gas: gasHex,
        gasPrice: gasPriceHex,
    };
}

export { Model };
