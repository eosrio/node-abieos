# node-abieos

Node.js native binding for [abieos](https://github.com/EOSIO/abieos), with some improvements:

- Contracts can be directly updated on the map
- Added `abieos_delete_contract`

Made with ♥ by [EOS Rio](https://eosrio.io/)

----
**Only Linux is supported for now, import will be null on others**

- Typescript typings included
- Prebuilt binary included (Clang 9.0.0 required to build)

### Install

```shell script
npm i @eosrio/node-abieos --save
```

### Usage

CommonJS
```js
const nodeAbieos = require('@eosrio/node-abieos');
```

ES Modules
```typescript
import * as nodeAbieos from "@eosrio/node-abieos";
```

Check the [/examples](https://github.com/eosrio/node-abieos/tree/master/examples) folder for implementation examples

### Building

env setup instructions soon
```shell script
git clone https://github.com/eosrio/node-abieos.git
cd node-abieos
# linux
npm run build:linux
# windows
npm run build:win
```
