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

export function isNumbers(array: number[] | any[]): array is number[] {
    return array.length > 0 && typeof array[0] === 'number';
}

export function isStrings(array: string[] | any[]): array is string[] {
    return array.length > 0 && typeof array[0] === 'string';
}
