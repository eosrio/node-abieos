import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const MODULE_NAME = "node_abieos.node";
const LIB_DIR = "lib";

// Names consumed by the runtime loader (lib/abieos.ts): one per
// platform/arch, plus the generic name kept as the universal fallback.
// On macOS the binary is a universal2 (arm64 + x86_64) build, so the same
// file is published under both darwin arch names — that's how a single
// Apple-Silicon CI runner produces the x64 prebuilt too.
const destNames =
    process.platform === "darwin"
        ? ["abieos-darwin-arm64.node", "abieos-darwin-x64.node", "abieos.node"]
        : [`abieos-${process.platform}-${process.arch}.node`, "abieos.node"];
const destinations = destNames.map((n) => join(LIB_DIR, n));

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
for (const dest of destinations) {
    await copyFile(source, dest);
}
console.log(`native module copied: ${source} -> ${destinations.join(", ")}`);
