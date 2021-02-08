export function actionCreator<ActionType, ActionInput>(type: ActionType) {
    return (payload: ActionInput) => {
        return {
            type,
            payload,
        };
    };
}
