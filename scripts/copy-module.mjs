import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const MODULE_NAME = "node_abieos.node";
const LIB_DIR = "lib";
// Platform-specific name consumed by the runtime loader (lib/abieos.ts),
// plus the generic name kept as the universal fallback.
const PLATFORM_DEST = join(LIB_DIR, `abieos-${process.platform}-${process.arch}.node`);
const GENERIC_DEST = join(LIB_DIR, "abieos.node");

// The output location depends on the CMake generator cmake-js selected.
// These cover every generator cmake-js drives:
//   - Ninja / Makefiles (single-config): build/node_abieos.node
//   - Visual Studio / Xcode (multi-config): build/{Release,Debug}/node_abieos.node
// An explicit list (no recursive scan) keeps this deterministic and avoids
// ever picking up a stale binary from build/_deps/** or a prior generator.
const candidates = [
    join("build", MODULE_NAME),
    join("build", "Release", MODULE_NAME),
    join("build", "Debug", MODULE_NAME),
];

const source = candidates.find((p) => existsSync(p));

if (!source) {
    console.error(
        `${MODULE_NAME} not found in any of: ${candidates.join(", ")}. ` +
        `Did 'cmake-js compile' run and succeed?`
    );
    process.exit(1);
}

await mkdir(LIB_DIR, { recursive: true });
await copyFile(source, PLATFORM_DEST);
await copyFile(source, GENERIC_DEST);
console.log(`native module copied: ${source} -> ${PLATFORM_DEST} (+ ${GENERIC_DEST})`);
