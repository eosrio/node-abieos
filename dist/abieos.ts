import { createRequire } from "node:module";

const nativeRequire = createRequire(import.meta.url);

/**
 * Resolve the native abieos addon for a given platform/arch.
 *
 * The npm package bundles a prebuilt binary per platform
 * (`abieos-<platform>-<arch>.node`); a source build also writes the
 * generic `abieos.node`. Both the published (`dist/`) and the source
 * (`lib/`) layouts are searched, so this works for the prebuilt
 * distribution and a from-source build alike.
 *
 * Exported for testing and to let advanced consumers override binary
 * resolution; normal use never needs to call this directly.
 *
 * @param req - a CommonJS-style `require` (defaults to one bound to this module)
 * @param platform - target platform (defaults to `process.platform`)
 * @param arch - target architecture (defaults to `process.arch`)
 */
export function resolveNative(
    req: (id: string) => any = nativeRequire,
    platform: string = process.platform,
    arch: string = process.arch,
): any {
    const candidates = [
        `./abieos-${platform}-${arch}.node`,
        './abieos.node',
        `../lib/abieos-${platform}-${arch}.node`,
        '../lib/abieos.node',
    ];
    let lastError: unknown;
    for (const candidate of candidates) {
        try {
            return req(candidate);
        } catch (error) {
            lastError = error;
        }
    }
    const buildScript = platform === 'win32' ? 'win' : platform === 'darwin' ? 'mac' : 'linux';
    throw new Error(
        `[node-abieos] No native binary for ${platform}-${arch}. ` +
        `Tried: ${candidates.join(', ')}. ` +
        `Build from source (npm run build:${buildScript}) or file an issue. ` +
        `Last error: ${(lastError as Error)?.message ?? lastError}`
    );
}

const abieos = resolveNative();

/**
 * Abieos class provides a singleton instance for interacting with the native abieos module.
 * This pattern is used to ensure a single global context for the underlying C++ abieos library,
 * which manages internal state and resources.
 */
export class Abieos {

    public static logTag: string = '[node-abieos]';
    private static instance: Abieos;
    public static native: typeof abieos;
    private static loadedContracts: Map<string, number> = new Map();
    public static debug: boolean = false;

    /**
     * Private constructor to enforce the Singleton pattern.
     * Throws an error if an attempt is made to create a second instance.
     */
    private constructor() {
        if (Abieos.instance) {
            throw new Error(`${Abieos.logTag} Abieos is a Singleton class. Use Abieos.getInstance() to get the instance.`);
        }
        Abieos.native = abieos;
    }

    /**
     * Returns the singleton instance of the Abieos class.
     * If an instance does not already exist, it creates one.
     * @returns {Abieos} The singleton instance of Abieos.
     */
    public static getInstance(): Abieos {
        if (!Abieos.instance) {
            Abieos.instance = new Abieos();
        }
        return Abieos.instance;
    }

    public getLoadedAbis(): string[] {
        return Array.from(Abieos.loadedContracts.keys());
    }

    /**
     * Cleans up all loaded contracts by deleting them from the native context.
     * This is useful for freeing up resources and ensuring a clean state.
     */
    public cleanup(): void {
        /* node:coverage disable */
        const errors: any[] = [];
        Abieos.loadedContracts.forEach((_, contractName) => {
            try {
                if (Abieos.debug) {
                    console.log(`${Abieos.logTag} Cleaning up contract '${contractName}'...`);
                }
                Abieos.native.delete_contract(contractName);
                Abieos.loadedContracts.delete(contractName);
            } catch (e: any) {
                errors.push({ contractName, error: e.message });
                console.error(`${Abieos.logTag} Failed to delete contract '${contractName}' during cleanup: ${e.message}`);
            }
        });
        if (errors.length > 0) {
            throw new Error(`${Abieos.logTag} Errors during cleanup: ${JSON.stringify(errors)}`);
        }
        /* node:coverage enable */
    }

    /**
     * Converts a string name to its corresponding 64-bit unsigned integer representation.
     * @param {string} nameString The string name to convert.
     * @returns {bigint} The bigint representation of the name.
     */
    public stringToName(nameString: string): bigint {
        // The native C++ function returns a JavaScript bigint primitive.
        try {
            return Abieos.native.string_to_name(nameString) as bigint;
        } catch (e: any) {
            throw new Error(`${Abieos.logTag} Failed to convert string to name '${nameString}': ${e.message}`);
        }
    }

    /**
     * Converts a JSON string or object to its hexadecimal binary representation.
     * @param {string} contractName The name of the contract.
     * @param {string} type The type within the ABI to use for conversion.
     * @param {string | object} json The JSON data as a string or object.
     * @returns {string} The hexadecimal string representation of the binary data.
     * @throws {Error} If parsing fails or an error occurs in the native module.
     */
    public jsonToHex(contractName: string, type: string, json: string | object): string {
        const jsonData = typeof json === 'object' ? JSON.stringify(json) : json;
        try {
            return Abieos.native.json_to_hex(contractName, type, jsonData) as string;
        } catch (e: any) {
            throw new Error(`${Abieos.logTag} Failed to convert JSON to hex for contract '${contractName}', type '${type}': ${e.message}`);
        }
    }

    /**
     * Converts a hexadecimal binary string to its JSON representation.
     * @param {string} contractName The name of the contract.
     * @param {string} type The type within the ABI to use for conversion.
     * @param {string} hex The hexadecimal string to convert.
     * @returns {any} The parsed JSON object.
     * @throws {Error} If parsing fails or an error occurs in the native module.
     */
    public hexToJson(contractName: string, type: string, hex: string): any {
        try {
            const data = Abieos.native.hex_to_json(contractName, type, hex) as string;
            // Attempt to parse the string data as JSON.
            // This is still necessary as the native module returns a string.
            /* node:coverage disable */
            try {
                return JSON.parse(data);
            } catch (parseError: any) {
                // If JSON.parse fails, it means the string returned by native module was not valid JSON.
                // This could be an error message string from C++ if it didn't throw an N-API error,
                // or just malformed JSON.
                throw new Error(`${Abieos.logTag} Failed to parse JSON string from hex for contract '${contractName}', type '${type}'. Received: ${data}. Parse error: ${parseError.message}`);
            }
            /* node:coverage enable */
        } catch (e: any) {
            // This catches errors thrown by the N-API layer itself.
            throw new Error(`${Abieos.logTag} Native error when converting hex to JSON for contract '${contractName}', type '${type}': ${e.message}`);
        }
    }

    /**
     * Converts a binary buffer to its JSON representation.
     * @param {string} contractName The name of the contract.
     * @param {string} type The type within the ABI to use for conversion.
     * @param {Uint8Array} buffer The binary data (a Node `Buffer` is accepted — it is a `Uint8Array`).
     * @returns {any} The parsed JSON object.
     * @throws {Error} If parsing fails or an error occurs in the native module.
     */
    public binToJson(contractName: string, type: string, buffer: Uint8Array): any {
        try {
            const data = Abieos.native.bin_to_json(contractName, type, buffer) as string;
            // Attempt to parse the string data as JSON.
            /* node:coverage disable */
            try {
                return JSON.parse(data);
            } catch (parseError: any) {
                throw new Error(`${Abieos.logTag} Failed to parse JSON string from binary for contract '${contractName}', type '${type}'. Received: ${data}. Parse error: ${parseError.message}`);
            }
            /* node:coverage enable */
        } catch (e: any) {
            // This catches errors thrown by the N-API layer itself.
            throw new Error(`${Abieos.logTag} Native error when converting binary to JSON for contract '${contractName}', type '${type}': ${e.message}`);
        }
    }

    /**
     * Loads an ABI for a given contract.
     * @param {string} contractName The name of the contract for which to load the ABI.
     * @param {string | object} abi The ABI as a JSON string or object.
     * @returns {boolean} True if the ABI was loaded successfully, false otherwise.
     * @throws {Error} If the ABI format is invalid or loading fails.
     */
    public loadAbi(contractName: string, abi: string | object): boolean {

        if (Abieos.debug && Abieos.loadedContracts.has(contractName)) {
            console.info(`${Abieos.logTag} Contract '${contractName}' is already loaded. Updating ABI...`);
        }

        const abiString = typeof abi === 'object' ? JSON.stringify(abi) : abi;
        if (typeof abiString !== 'string') { // Should be caught by TS but good runtime check
            throw new Error(`${Abieos.logTag} ABI must be a String or Object.`);
        }
        try {
            const loaded = Abieos.native.load_abi(contractName, abiString) as boolean;
            if (loaded) {
                Abieos.loadedContracts.set(contractName, Date.now());
                if (Abieos.debug) {
                    console.log(`${Abieos.logTag} Loaded ABI for contract '${contractName}'.`);
                }
            }
            return loaded;
        } catch (e: any) {
            throw new Error(`${Abieos.logTag} Failed to load ABI for contract '${contractName}': ${e.message}`);
        }
    }

    /**
     * Loads an ABI for a given contract from its hexadecimal representation.
     * @param {string} contractName The name of the contract for which to load the ABI.
     * @param {string} abihex The ABI as a hexadecimal string.
     * @returns {boolean} True if the ABI was loaded successfully, false otherwise.
     * @throws {Error} If loading fails.
     */
    public loadAbiHex(contractName: string, abihex: string): boolean {

        if (typeof abihex !== 'string') {
            throw new Error(`${Abieos.logTag} ABI hex must be a String.`);
        }

        /* node:coverage disable */
        if (Abieos.debug && Abieos.loadedContracts.has(contractName)) {
            console.info(`${Abieos.logTag} Contract '${contractName}' is already loaded. Updating ABI...`);
        }
        /* node:coverage enable */

        try {
            const loaded = Abieos.native.load_abi_hex(contractName, abihex);
            if (loaded) {
                Abieos.loadedContracts.set(contractName, Date.now());
                if (Abieos.debug) {
                    console.log(`${Abieos.logTag} Loaded ABI hex for contract '${contractName}'.`);
                }
            }
            return loaded;
        } catch (e: any) {
            throw new Error(`${Abieos.logTag} Failed to load ABI hex for contract '${contractName}': ${e.message}`);
        }
    }

    /**
     * Retrieves the type name for a specific action within a contract's ABI.
     * @param {string} contractName The name of the contract.
     * @param {string} actionName The name of the action.
     * @returns {string} The type name associated with the action.
     * @throws {Error} If the contract or action is not found or another error occurs.
     */
    public getTypeForAction(contractName: string, actionName: string): string {
        try {
            return Abieos.native.get_type_for_action(contractName, actionName) as string;
        } catch (e: any) {
            throw new Error(`${Abieos.logTag} Failed to get type for action '${actionName}' in contract '${contractName}': ${e.message}`);
        }
    }

    /**
     * Retrieves the type name for a specific table within a contract's ABI.
     * @param {string} contractName The name of the contract.
     * @param {string} table_name The name of the table.
     * @returns {string} The type name associated with the table.
     * @throws {Error} If the contract or table is not found or another error occurs.
     */
    public getTypeForTable(contractName: string, table_name: string): string {
        try {
            return Abieos.native.get_type_for_table(contractName, table_name) as string;
        } catch (e: any) {
            throw new Error(`${Abieos.logTag} Failed to get type for table '${table_name}' in contract '${contractName}': ${e.message}`);
        }
    }

    /**
     * Deletes a contract's ABI from the abieos context.
     * @param {string} contractName The name of the contract to delete.
     * @returns {boolean} True if the contract was successfully deleted, false otherwise.
     * @throws {Error} If deletion fails.
     */
    public deleteContract(contractName: string): boolean {
        try {
            const deleted = Abieos.native.delete_contract(contractName);
            if (deleted) {
                Abieos.loadedContracts.delete(contractName);
                if (Abieos.debug) {
                    console.log(`${Abieos.logTag} Deleted contract '${contractName}' from abieos context.`);
                }
            }
            return deleted;
        } catch (e: any) {
            throw new Error(`${Abieos.logTag} Failed to delete contract '${contractName}': ${e.message}`);
        }
    }
}
