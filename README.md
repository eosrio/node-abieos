# node-abieos

![CI](https://github.com/eosrio/node-abieos/actions/workflows/build.yml/badge.svg)
![Node-API v9 Badge](https://github.com/nodejs/abi-stable-node/blob/doc/assets/Node-API%20v9%20Badge.svg)
[![NPM version](https://img.shields.io/npm/v/@eosrio/node-abieos.svg?style=flat)](https://www.npmjs.com/package/@eosrio/node-abieos)
[![Coverage Status](https://coveralls.io/repos/github/eosrio/node-abieos/badge.svg?branch=master)](https://coveralls.io/github/eosrio/node-abieos?branch=master)

Node.js native binding for [abieos](https://github.com/AntelopeIO/abieos), with some improvements:

- Internal loaded contract map
- deleteContract: to remove the loaded contract from memory (now in vanilla abieos too)

Made with ♥ by [EOS Rio](https://eosrio.io/)

----
**Linux, Windows and macOS are supported.** The npm package bundles a prebuilt
binary per platform (`abieos-<platform>-<arch>.node`) and the loader picks the
right one at runtime — `npm i` is zero-build on supported platforms. Building
from source is only needed for unsupported platform/arch combinations or local
development (see [Building](#building)).

- Typescript typings included
- Prebuilt binaries bundled: `linux-x64`, `win32-x64`, `darwin-x64`,
  `darwin-arm64` (loaded automatically by platform/arch)
- Windows builds with MinGW-w64 (GCC) — **MSVC is not supported**: the bundled
  abieos C++ requires libstdc++/libc++ semantics MSVC's STL lacks
- macOS builds with the Xcode Command Line Tools (Clang/libc++)
- Now supports NodeJS, Deno, and Bun runtimes.

## Install

```shell script
npm i @eosrio/node-abieos --save
```

## Usage

CommonJS

```js
const nodeAbieos = require('@eosrio/node-abieos');
```

ES Modules (NodeJS, Bun)

```typescript
import {Abieos} from "@eosrio/node-abieos";
const abieos = Abieos.getInstance();
```

Deno

```bash
# examples/basic.cjs can be run with:
deno run --allow-ffi --allow-read examples/basic.cjs

# For an example using the published npm package with Deno:
# Check the examples/deno-abieos-test folder
cd examples/deno-abieos-test
deno run --allow-ffi --allow-read main.ts
```

Bun

```shell script
# examples/basic.mjs can be run with:
bun run examples/basic.mjs
```

Check the [/examples](https://github.com/eosrio/node-abieos/tree/master/examples) folder for implementation examples

## Building

> Most users do **not** need this — the npm package ships prebuilt binaries for
> `linux-x64`, `win32-x64`, `darwin-x64` and `darwin-arm64`. Build from source
> only for an unsupported platform/arch or for local development.

Clone with submodules first (required on every platform):

```shell script
git clone https://github.com/eosrio/node-abieos.git --recursive
cd node-abieos
npm install
```

### Linux

We recommend Clang 18 to build the `abieos` C++ library:

```bash
wget https://apt.llvm.org/llvm.sh
chmod +x llvm.sh
sudo ./llvm.sh 18
```

```shell script
npm run build:linux
npm run build
```

### Windows (MinGW-w64)

`abieos` does **not** build with MSVC — its C++ depends on libstdc++/libc++
standard-library semantics and GCC/Clang extensions that MSVC's STL/compiler do
not provide, and this is not patchable in the vendored submodule. Build with
MinGW-w64 (GCC) instead.

1. Install [MSYS2](https://www.msys2.org/), then from an MSYS2 shell install the
   toolchain (any MinGW-w64 distribution with `g++`, `ninja` and `dlltool`
   works, e.g. WinLibs):

   ```bash
   pacman -S mingw-w64-x86_64-gcc mingw-w64-x86_64-ninja
   ```

2. Put the MinGW-w64 `bin` directory on `PATH` (e.g. `C:\msys64\mingw64\bin`)
   so `g++`, `ninja` and `dlltool` are resolvable.

3. Build:

   ```shell script
   npm run build:win
   npm run build
   ```

`build:win` drives cmake-js with the Ninja generator and synthesizes a GNU
import library for the Node-API symbols, so the resulting `.node` loads in the
standard (MSVC-built) Node.js for Windows.

### macOS

Install the Xcode Command Line Tools (provides Clang and libc++):

```bash
xcode-select --install
```

```shell script
npm run build:mac
npm run build
```

### Documentation

For detailed and user-friendly documentation, including installation, usage, API reference, error handling, debugging, and examples, please refer to the [documentation](docs/README.md).

For contribution guidelines and developer documentation, refer to the [contribution guidelines](docs/CONTRIBUTING.md).
