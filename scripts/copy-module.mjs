import { copyFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";

const MODULE_NAME = "node_abieos.node";
const LIB_DIR = "lib";
// Platform-specific name consumed by the runtime loader (lib/abieos.ts),
// plus the generic name kept as the universal fallback.
const PLATFORM_DEST = join(LIB_DIR, `abieos-${process.platform}-${process.arch}.node`);
const GENERIC_DEST = join(LIB_DIR, "abieos.node");

// The output location depends on the CMake generator cmake-js selected:
//   - Ninja / Makefiles (single-config): build/node_abieos.node
//   - Visual Studio / Xcode (multi-config): build/Release/node_abieos.node
// Search the known locations first, then fall back to a recursive scan.
const candidates = [
    join("build", MODULE_NAME),
    join("build", "Release", MODULE_NAME),
    join("build", "Debug", MODULE_NAME),
];

async function findRecursively(dir) {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return null;
    }
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            const found = await findRecursively(full);
            if (found) return found;
        } else if (entry.name === MODULE_NAME) {
            return full;
        }
    }
    return null;
}

let source = candidates.find((p) => existsSync(p));
if (!source) {
    source = await findRecursively("build");
}

if (!source) {
    console.log(`${MODULE_NAME} not found under build/. Skipping copy.`);
    process.exit(0);
}

await mkdir(LIB_DIR, { recursive: true });
await copyFile(source, PLATFORM_DEST);
await copyFile(source, GENERIC_DEST);
console.log(`native module copied: ${source} -> ${PLATFORM_DEST} (+ ${GENERIC_DEST})`);
