import dotenv from 'dotenv';
import { assert } from 'chai';
import { AddressInfo, Server } from 'net';
dotenv.config();

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

export function assertDeepEqual(a: any, b: any, ignore: string[], message?: string) {
    if (Array.isArray(a) && Array.isArray(b)) {
        const a1 = a.map(x => {
            const x1 = { ...x };
            ignore.forEach(f => {
                x1[f] = undefined;
            });
            return { ...x1 };
        });
        const b1 = b.map(x => {
            const x1 = { ...x };
            ignore.forEach(f => {
                x1[f] = undefined;
            });
            return { ...x1 };
        });

        assert.deepEqual(a1, b1, message);
    } else {
        const a1 = { ...a };
        const b1 = { ...b };
        ignore.forEach(f => {
            (a1[f] = undefined), (b1[f] = undefined);
        });
        assert.deepEqual(a1, b1, message);
    }
}

const sleep = (ms: number) => {
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
