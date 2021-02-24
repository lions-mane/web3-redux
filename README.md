# Web3 Redux

Web3 Redux Library.

## Table of Contents

-   [Installing](#installing)
-   [Getting Started](#getting-started)
    -   [Initialize the Redux Store](#initialize-the-redux-store)
    -   [Initialize Networks](#initialize-networks)
        -   [Automatic](#automatic)
        -   [Manual](#manual)
-   [Displaying React Components](#displaying-react-components)
-   [Syncing](#syncing)
    -   [Block Header Sync](#block-header-sync)
    -   [Event Sync](#event-sync)
    -   [Contract Call Sync](#contract-call-sync)
-   [Selectors](#selectors)
-   [Redux State](#redux-state)
-   [Advanced](#advanced)
    -   [Optimizing Contract Call Sync](#optimizing-contract-call-sync)
    -   [Custom Contract Call Sync](#custom-contract-call-sync)
-   [Additional Documentation](#additional-documentation)
-   [Built with](#built-with)
-   [License](#license)

## Installing

```
npm install @lions-mane/web3-redux
```

## Getting Started

### Initialize the Redux Store

web3-redux can be added to your existing Redux store. The web3Reducer MUST be stored at the `web3Redux` key in your store.

```typescript
import { combineReducers, createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { web3Reducer, web3Saga } from '@lions-mane/web3-redux';

const reducers = combineReducers({
    web3Redux: web3Reducer,
});

const sagaMiddleware = createSagaMiddleware();
const store = createStore(reducers, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(web3Saga);

export default store;
```

### Initialize Networks

To start web3-redux, you can either use the helper `WEB3_REDUX/INITIALIZE` action or manually add networks and block subscriptions.
While a block subscription is optional, it is in most cases necessary to enable syncing the latest on-chain data for your smart contracts.

#### Automatic

You can dispatch a `WEB3_REDUX/INITIALIZE` action to initialize multiple networks.

```typescript
store.dispatch(Web3ReduxActions.initialize());
```

A set of default ethereum networks will be initialized if an environment variable with the rpc endpoint value is set. We strongly recommend using a websocket rpc as otherwise subscriptions will not be possible.
The following default networks are supported:

-   Local: `LOCAL_RPC` (eg. `ws://localhost:8545`)
-   Mainnet: `MAINNET_RPC` (eg. `wss://mainnet.infura.io/ws/v3/<API_KEY>`)
-   Ropsten: `ROPSTEN_RPC`
-   Kovan: `KOVAN_RPC`
-   Rinkeby: `RINKEBY_RPC`
-   Goerli: `GOERLI_RPC`

The environment variables are also supported with the prefixes `REACT_APP_*` and `NEXT_PUBLIC_*`.

Alternatively, you can pass your own set of networks with web3 instances to the initialize action:

```typescript
store.dispatch(Web3ReduxActions.initialize({ networks: [{ networkId: '1', web3 }] }));
```

<b>Block Sync</b>
By default, the initialize action will also start a block sync for each network.
You can disable this with:

```typescript
store.dispatch(Web3ReduxActions.initialize({ blockSubscribe: false }));
```

Or customize it with:

```typescript
store.dispatch(Web3ReduxActions.initialize({ blockSubscribe: [{ networkId: '1' }] }));
```

#### Manual

<b>Add a network</b>
All entities in the web3-redux stored are indexed by networkId. web3-redux let's you sync multiple networks concurrently (eg. sync Mainnet & Ropsten blocks). To enable this however, you must first configure a network by adding it to the store and passing it a web3 instance.

```typescript
store.dispatch(NetworkActions.create({ networkId: '1', web3 }));
```

<b>Start a block subscription</b>
To sync with on-chain events, it's a good idea to start a block subscription as it can be used as a reference point to keep data fresh. This is recommended but not required as some apps might use a different refresh mechanism.

```typescript
store.dispatch(BlockActions.subscribe({ networkId: '1' }));
```

### Add a contract

One you've add a network and started the block sync, add a contract and make a call.

```typescript
store.dispatch(ContractActions.create({ networkId: '1', address: '0x000...', abi: ERC20ABI }));
store.dispatch(ContractActions.call({
    networkId: '1',
    address: '0x000...',
    method: 'balanceOf',
    args: ['0x111...'],
}));

const balance = ContractSelector.selectContractCall(state, '1-0x000...', 'balanceOf', { args: ['0x0111...', from: web3.eth.defaultAccount ]})

//Alternatively, fetch things manually
const contract = ContractSelector.select(state, '1-0x000...')
const balanceOf = contract.methods.balanceOf
const argsHash = callArgsHash({ args: ['0x111...'] }) //([0x111...]).call(latest,web3.eth.defaultAccount)
const value = balanceOf['([0x111...]).call(latest,0x222...)'].value
```

## Displaying React Components

To display web3-redux data in your React components, you can either parse the raw state or use web3-redux's state selectors (recommended). See [Selectors](#selectors) section for a description of all web3-redux selectors.

Below a short example component using the BlockSelector to display all blocks.

```typescript
import React from 'react';
import { useSelector } from 'react-redux';
import { Block, BlockSelector } from '@lions-mane/web3-redux';

export default function Blocks() {
    //@ts-ignore
    const blocks: Block[] = useSelector(BlockSelector.select);
    return (
        <div>
            <h1>Blocks</h1>
            <div>{JSON.stringify(blocks)}</div>
        </div>
    );
}
```

For a more complete example React app checkout [web3-redux-react-example](https://github.com/lions-mane/web3-redux-react-example).

## Syncing

web3-redux comes with a built-in sync features.

### Block Header Sync

This uses [web3.eth.subscribe("newBlockHeaders")](https://web3js.readthedocs.io/en/v1.3.0/web3-eth-subscribe.html#subscribe-newblockheaders). Your web3 provider MUST support websocket subscriptions.

Dispatch a `Block/SUBSCRIBE` action to start a block sync. Only one active block sync per networkId is allowed, and duplicate actions will be ignored. Unsubscribe with a `Block/UNSUBSCRIBE` action.

```typescript
//Subscribe blocks
store.dispatch(BlockActions.subscribe({ networkId }));
//Unsubscribe blocks
store.dispatch(BlockActions.unsubscribe({ networkId }));
```

### Event Sync

This uses [web3.eth.Contract.events.MyEvent()](https://web3js.readthedocs.io/en/v1.3.0/web3-eth-contract.html#contract-events). Your web3 provider MUST support websocket subscriptions.

Before intiating an event sync you must first create a contract with a `Contract/CREATE` action:

```typescript
store.dispatch(ContractActions.create({ networkId, address, abi});
```

Dispatch a `Contract/EVENT_SUBSCRIBE` action to start an event sync. Event syncs are unique by contract address and event name. Duplicate actions will be ignored. Unsubscribe with a `Contract/EVENT_UNSUBSCRIBE` action.

```typescript
store.dispatch(ContractActions.eventSubscribe({ networkId, address, eventName }));
```

### Contract Call Sync

web3-redux offers enhanced customizability of contract call syncing to avoid unecessary rpc calls. Contract call syncing is achieved by refreshing contract calls based on a set of parameters. To initiate contract call syncing, one must first dispatch a ContractCallAction.

There are 3 types of contract call syncing:

-   No sync: Call contract method once
-   Block sync (`Contract/CALL_BLOCK_SYNC`): Call contract and refresh every block.
-   Transaction sync (`Contract/CALL_TRANSACTION_SYNC`): Call contract and refresh every time a block includes a transaction to the contract.

Note: Both block sync and transaction sync require an existing block subscription to be first created.

By default we use Transaction syncing. See [Advanced/Optimising Contract Call Sync](#custom-contract-call-syncing) for more info.

## Selectors

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

## Redux State

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

## Advanced

### Optimizing Contract Call Sync

By default, contracts use Transaction syncing but this can be customized for each specific contract call. This is can be a sub-optimal or even incorrect sync strategy.

Transaction syncing can be sub-optimal if a call's return value never changes. For example, an ERC20 token's name or symbol. In this case simply disable syncing with `sync: false`.

Transaction syncing assumes that the contract call values are only dependent on your contract's state and that this state is only changed by direct transactions to your contract. The basic logic for Transaction syncing is as follows: For each transaction in a new block, update contract call if `tx.to == contract.address`.
Examples of cases where this assumption might be incorrect include:

-   Contract call return value depends on block number
-   Contract state can be changed by a call to some proxy contract

In these cases we recommend switching to Block syncing, which will poll the contract call at every block. For even better optimization, it might be interesting in some cases to use a custom block or transaction sync.

### Custom Contract Call Sync

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

## Additional Documentation

Additional documentation is available at [lions-mane.github.io/web3-redux](https://lions-mane.github.io/web3-redux)

## Built with

-   [reselect](https://github.com/reduxjs/reselect)
-   [redux-orm](https://github.com/redux-orm/redux-orm)
-   [web3.js](https://web3js.readthedocs.io/en/v1.3.0/)

## License

2020 Lionsmane Development
MIT License.
