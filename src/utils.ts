import { AddressInfo, Server } from 'net';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function actionCreator<ActionType, ActionInput>(type: ActionType) {
    return (payload: ActionInput) => {
        return {
            type,
            payload,
        };
    };
}

export function isNumbers(array: number[] | any[]): array is number[] {
    return array.length > 0 && typeof array[0] === 'number';
}

export function isStrings(array: string[] | any[]): array is string[] {
    return array.length > 0 && typeof array[0] === 'string';
}

export const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const sleepForPort = async (httpServer: Server, ms: number): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
        httpServer.listen(0, async () => {
            try {
                let addr = httpServer.address() as AddressInfo | null;
                while (!(addr && addr.port)) {
                    await sleep(ms);
                    addr = httpServer.address() as AddressInfo | null;
                }
                resolve(addr.port);
            } catch (e) {
                reject(e);
            }
        });
    });
};
