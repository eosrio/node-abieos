# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where possible.

## [4.2.0-f7d5b45] - 2026-05-17

> The `-f7d5b45` suffix denotes the upstream `AntelopeIO/abieos` commit hash bundled with this release. The abieos submodule is unchanged from `4.1.x`; this release adds Windows and macOS support and multi-platform prebuilt distribution.

### Added
- **Windows support** via MinGW-w64 (GCC). `abieos` cannot be built with MSVC (its C++ depends on libstdc++/libc++ standard-library semantics and GCC/Clang extensions MSVC's STL/compiler does not provide); `CMakeLists.txt` now fails fast with an actionable message if MSVC is detected. cmake-js only emits the MSVC-format `node.lib` and an `#ifdef _MSC_VER`-gated delay-load hook, so the MinGW build instead generates a *delay-import* library with `dlltool` and compiles its own delay-load hook (`src/win_delay_load_hook.cc`) that binds the Node-API symbols to the **host process image**. The single Windows binary therefore works under `node.exe`, `bun.exe`, `electron.exe`, etc. — not just a file literally named `node.exe`. Verified locally on Windows: full test suite **55/55 passing** under Node 24, and end-to-end JSON⇄hex round-trip under Bun (which previously crashed before the delay-load hook).
- **macOS support** as a **universal2** (`arm64` + `x86_64`) binary via Clang/libc++ (Xcode). `CMakeLists.txt` forces `CMAKE_OSX_ARCHITECTURES=arm64;x86_64` (option `ABIEOS_MAC_UNIVERSAL`, default `ON`); the one binary is published under both `darwin-arm64` and `darwin-x64`. Built and arm64-tested in CI; not validated locally (no macOS dev environment).
- **Multi-platform prebuilt distribution.** The package bundles a prebuilt binary per platform — `abieos-<platform>-<arch>.node` (`linux-x64`, `win32-x64`, `darwin-arm64`, `darwin-x64`) — and a platform-aware loader (`lib/abieos.ts`, exported `resolveNative`) selects the correct binary at runtime, searching the `dist/` (published) and `lib/` (source) layouts and falling back to the generic `abieos.node`. `npm i` is zero-build on supported platforms.
- Added CI jobs `build-windows` (`windows-latest`, MinGW-w64 via `msys2/setup-msys2`) and `build-macos` (`macos-14`/Apple-Silicon, universal2). The Linux job also uploads `abieos-linux-x64.node`. Each job builds, tests, and uploads its `.node` artifact.

### Changed
- `package.json`: `build:win` → `cmake-js compile -G Ninja && node scripts/copy-module.mjs`; `build:mac` wired to compile + copy (previously bare `cmake-js` stubs).
- `scripts/copy-module.mjs`: deterministically locates the addon across single-config (`build/`) and multi-config (`build/{Release,Debug}/`) generator layouts (no recursive scan — avoids stale binaries), exits non-zero if none is found, and on macOS writes both `abieos-darwin-arm64.node` and `abieos-darwin-x64.node` from the universal2 build.
- `CMakeLists.txt`: portable `EXISTS` submodule check (replaces Unix-only `git submodule status | grep`); CRLF-robust `node-addon-api` include resolution; strips only the MSVC `/DELAYLOAD:*` token from `CMAKE_SHARED_LINKER_FLAGS` rather than clearing the whole variable.

### Fixed
- **`stringToName` return type** was `BigInt` (the wrapper object type) instead of `bigint` (the primitive it actually returns) — every TypeScript consumer hit `Type 'BigInt' is not assignable to type 'bigint'`. Now `bigint`.
- **Self-contained typings:** `binToJson`'s parameter is now `Uint8Array` instead of the ambient Node `Buffer` global (a `Buffer` is a `Uint8Array`, so existing callers are unaffected). The published `.d.ts` no longer depends on `@types/node` and type-checks cleanly under TypeScript's default `skipLibCheck: false` without extra consumer setup. Verified from a clean `npm install` of the packed tarball across Node + Bun (ESM & CJS) and TypeScript (`nodenext`).

### Notes
- The `darwin-arm64` / `darwin-x64` prebuilts are the same universal2 binary, committed from the `build-macos` CI artifacts (Mach-O cannot be cross-built from the Linux/Windows dev environments). Their CI provenance is the source of truth.
- GCC 13 emits one benign `-Wstringop-overflow` warning in the vendored `abieos/include/eosio/bitset.hpp`; it is not an error and does not affect correctness (Linux CI builds with Clang and does not emit it).

## [4.1.1-f7d5b45] - 2026-05-17

> The `-f7d5b45` suffix denotes the upstream `AntelopeIO/abieos` commit hash bundled with this release. The submodule is unchanged from `4.1.0`, so the published native binary (`dist/abieos.node`) and JavaScript/typings bundle are byte-identical to `4.1.0`. This is a dependency-maintenance release only.

### Changed
- **`typescript`** 5.9.3 → 6.0.3 (major). TypeScript 6.0 changed the default `types` value from "auto-include all `@types`" to `[]`; `tsconfig.json` now sets `"types": ["node"]` (the documented migration) so the `@types/node` globals resolve. Build output validated byte-identical to the previous TypeScript 5.9 build.
- **`@microsoft/api-extractor`** 7.57.2 → 7.58.7 (bundled TypeScript compiler 5.8.2 → 5.9.3, narrowing the parse skew against TypeScript 6.0; `tsup` typings rollup validated identical).
- **`c8`** 10.1.3 → 11.0.0 (major — coverage tool upgrade; exercised by CI's Node 22.x coverage job).
- **`@types/node`** 25.3.0 → 25.8.0.
- **`@wharfkit/antelope`** 1.1.1 → 1.2.0 (test-only dependency).
- **`node-addon-api`** 8.5.0 → 8.7.0 (native build-time headers; the prebuilt binary is unchanged).

### Notes
- `@microsoft/api-extractor` bundles TypeScript 5.9.3 and emits an informational `*** The target project appears to use TypeScript 6.0.3 which is newer than the bundled compiler engine` notice during the typings rollup. This is non-fatal; the generated `dist/_tsup-dts-rollup.d.ts` rollup is byte-identical to the TypeScript 5.9 baseline.
- All updated packages are `devDependencies`; the package ships no runtime dependencies, so consumers are unaffected. Outstanding `npm audit` advisories are confined to dev/build transitive tooling and do not reach the published artifact.

## [4.1.0-f7d5b45] - 2026-02-21

> The `-f7d5b45` suffix denotes the upstream `AntelopeIO/abieos` commit hash bundled with this release.

### Changed
- Switched abieos submodule origin from `igorls/abieos` fork to official [`AntelopeIO/abieos`](https://github.com/AntelopeIO/abieos). The fork's `abieos_delete_contract` was merged upstream in [PR #27](https://github.com/AntelopeIO/abieos/pull/27), so the fork is no longer needed.
- **`cmake-js`** 7.3.1 → 8.0.0 (major — build validated, no CMake changes required).
- **`c8`** 9.1.0 → 10.1.3 (major — coverage tool upgrade).
- **`@microsoft/api-extractor`** 7.52.13 → 7.57.2.
- **`@types/node`** 24.6.0 → 25.3.0.
- **`tsup`** 8.5.0 → 8.5.1.
- **`typescript`** 5.9.2 → 5.9.3.

---

## [4.0.3-f7d5b45] - 2025-09-29

> The `-f7d5b45` suffix denotes the upstream `AntelopeIO/abieos` commit hash bundled with this release.

### Upstream Highlights (`2039717` → `f7d5b45`)
- Added full support for the new `bitset` ABI type, including serialization/deserialization, key conversions, and regression tests.
- Introduced `fixed_array` handling in the ABI serializer, so fixed-length array definitions now round-trip correctly.
- Switched floating-point JSON conversion to `std::to_chars`, improving numeric fidelity and removing legacy `fpconv` sources.
- Tightened validation around ABI parsing (better sanity checks, error messages, and compatibility guards) while keeping compatibility with `eosio::abi/1.x` definitions.
- Streamlined upstream CI and build configurations (consistent CMake/toolchain defaults, GCC 14 coverage) matching the latest Antelope “Spring” tooling.

### Added
- `c8` coverage tooling to produce lcov reports consumed by Coveralls.
- Comprehensive unit tests covering parse error branches to reach 100% coverage.
- Repository `LICENSE` now includes upstream `AntelopeIO/abieos` MIT license details.
- Formal `CHANGELOG.md` to track release history.

### Changed
- Workflow now runs coverage on Node 22.x only while keeping multi-version tests.

### Fixed
- Ensured `loadAbiHex` debug branch is executed within tests, eliminating remaining coverage gaps.
