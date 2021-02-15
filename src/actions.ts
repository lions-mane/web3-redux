import { Network } from './network/model';

const name = 'WEB3_REDUX';
export const INITIALIZE = `${name}/INITIALIZE`;

export interface InitializeActionInput {
    networks?: Network[];
}
export const initialize = (payload?: InitializeActionInput) => {
    return {
        type: INITIALIZE,
        payload: payload ?? {},
    };
};
export type InitializeAction = ReturnType<typeof initialize>;

export type Action = InitializeAction;
