# Web3 Redux

Web3 Redux Library.

## Installing

Save storage with [pnpm](https://pnpm.js.org/). You can also use regular NPM or Yarn.

```
npm install @lions-mane/web3-redux
```

## Getting Started

### Initializing the Redux Store

web3-redux can be added to your existing Redux store. The web3Reducer MUST be stored at the `web3Redux` key in your store.

```typescript
import { combineReducers, createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { web3Reducer, web3Saga } from '@lions-mane/web3-redux';

const reducers = combineReducers({
    web3Redux: web3Reducer,
});

const sagaMiddleware = createSagaMiddleware();
const store = createReduxStore(reducers, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(web3Saga);

export default store;
```

### Configuring Web3 providers

```typescript
//TODO: Add web3 configuration.
```

### Displaying React Components

To display web3-redux data in your React components, you can either parse the raw state or use web3-redux's state selectors (recommended). See [Selectors](#selectors) section for a description of all web3-redux selectors.

```typescript
//TODO: Add example React Component
```

### Syncing

web3-redux comes with a built-in sync features. web3-redux offers enhanced customizability of contract call syncing to avoid unecessary rpc calls.

#### Block Header Sync

This uses [web3.eth.subscribe("newBlockHeaders")](https://web3js.readthedocs.io/en/v1.3.0/web3-eth-subscribe.html#subscribe-newblockheaders). Your web3 provider MUST support websocket subscriptions.

Dispatch a `Block/SUBSCRIBE` action to start a block sync. Only one active block sync per networkId is allowed, and duplicate actions will be ignored. Unsubscribe with a `Block/UNSUBSCRIBE` action.

```typescript
//Subscribe blocks
store.dispatch(BlockActions.subscribe({ networkId }));
//Unsubscribe blocks
store.dispatch(BlockActions.unsubscribe({ networkId }));
```

#### Event Sync

This uses [web3.eth.Contract.events.MyEvent()](https://web3js.readthedocs.io/en/v1.3.0/web3-eth-contract.html#contract-events). Your web3 provider MUST support websocket subscriptions.

Before intiating an event sync your must first create a contract with a `Contract/CREATE` action:

```typescript
store.dispatch(ContractActions.create({ networkId, address, abi});
```

Dispatch a `Contract/EVENT_SUBSCRIBE` action to start an event sync. Event syncs are unique by contract address and event name. Duplicate actions will be ignored. Unsubscribe with a `Contract/EVENT_UNSUBSCRIBE` action.

```typescript
store.dispatch(ContractActions.eventSubscribe({ networkId, address, eventName }));
```

#### Contract Call Sync

Contract call syncing is achieved by refreshing contract calls based on a set of parameters. To intiate contract call syncing, one must first dispatch a ContractCallAction.
There are 3 types of contract call syncing:

-   No sync: Call contract method once
-   Block sync: Call contract and refresh every block
-   Transaction sync: Call contract and refresh every time a block includes a transaction to the contract.

<b>Optimizing contract call syncing</b>
By default, contracts use Transaction syncing but this can be customized for each specific contract call. This is can be a sub-optimal or even incorrect sync strategy.

Transaction syncing can be sub-optimal if a call's return value never changes. For example, an ERC20 token's name or symbol. In this case simply disable syncing with `sync: false`.

Transaction syncing assumes that the contract call values are only dependent on your contract's state and that this state is only changed by direct transactions to your contract. The basic logic for Transaction syncing is as follows: For each transaction in a new block, update contract call if `tx.to == contract.address`.
Examples of cases where this assumption might be incorrect include:

-   Contract call return value depends on block number
-   Contract state can be changed by a call to some proxy contract

In these cases we recommend switching to Block syncing, which will poll the contract call at every block. For even better optimization, it might be interesting in some cases to use a custom block or transaction sync.

<b>Custom Block/Transaction Syncing</b>
The interface of ContractCallBlockSync and ContractCallTransactionSync use a filter function returning whether a contract call should update. Customizing the filter function can help you create more optimized syncing depending on your use case.

```typescript
export interface ContractCallBlockSync {
    type: typeof CALL_BLOCK_SYNC;
    filter: (block: BlockHeader) => boolean;
}

export interface ContractCallTransactionSync {
    type: typeof CALL_TRANSACTION_SYNC;
    filter: (transaction: Transaction) => boolean;
}
```

Example sync strategies:

-   Sync every 5 blocks: `(block) => block.number % 5 == 0`
-   Sync for transactions to contract or proxy: `(tx) => tx.to === contract.address || tx.to === proxy.address`

### Selectors

web3-redux exports a set of [reselect](https://github.com/reduxjs/reselect) selectors to let you easily read data from the store.

```typescript
import { BlockSelector, TransactionSelector, ContractSelector } from '@lions-mane/web3-redux';
import store from './store.ts';

const state = store.getState();

//Default Redux-ORM selectors
//Select full collections
const blocks: BlockHeader[] = BlockSelector.select(state);
const transactions: Transaction[] = TransactionSelector.select(state);
const contracts: Contract[] = ContractSelector.select(state);

//Select single instance by id
const networkId = 1;
const block42: Block = BlockSelector.select(state, [`${networkId}-42`]); //block 42 on networkId 1

//Select multiple instances by id
const networkId = 1;
const [block43, block44]: [BlockHeader, BlockHeader] = BlockSelector.select(state, [
    `${networkId}-43`,
    `${networkId}-44`,
]);

//Custom selectors
//Select blocks with transactions (also works with id/[id] filtering)
const blocksWithTransactions: BlockTransactionObject[] = BlockSelector.selectBlockTransaction(state);
```

### Redux State

```typescript
interface Web3ReduxStore {
    Block: {
        itemsById: {
            [id: string]: BlockHeader; //`${networkId}-${number}`
        };
    };
    Transaction: {
        itemsById: {
            [id: string]: Transaction; //`${networkId}-${hash}`
        };
    };
    Contract: {
        itemsById: {
            [id: string]: Contract; //`${networkId}-${address}`
        };
    };
}
```

## Documentation

Additional documentation is available at [lions-mane.github.io/web3-redux](https://lions-mane.github.io/web3-redux)

## Built with

-   [reselect](https://github.com/reduxjs/reselect)
-   [redux-orm](https://github.com/redux-orm/redux-orm)
-   [web3.js](https://web3js.readthedocs.io/en/v1.3.0/)

## License

2020 Lionsmane Development
MIT License.
