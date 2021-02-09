import Web3 from 'web3';
import dotenv from 'dotenv';
dotenv.config();

export function actionCreator<ActionType, ActionInput>(type: ActionType) {
    return (payload: ActionInput) => {
        return {
            type,
            payload,
        };
    };
}

const web3 = new Web3(process.env.ETH_RPC);
export function web3ForNetworkId(networkId: string) {
    console.debug(networkId);
    return web3;
}

export function isNumbers(array: number[] | any[]): array is number[] {
    return array.length > 0 && typeof array[0] === 'number';
}

export function isStrings(array: string[] | any[]): array is string[] {
    return array.length > 0 && typeof array[0] === 'string';
}
