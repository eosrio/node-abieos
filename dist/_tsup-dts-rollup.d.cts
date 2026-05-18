/**
 * Abieos class provides a singleton instance for interacting with the native abieos module.
 * This pattern is used to ensure a single global context for the underlying C++ abieos library,
 * which manages internal state and resources.
 */
export declare class Abieos {
    static logTag: string;
    private static instance;
    static native: typeof abieos;
    private static loadedContracts;
    static debug: boolean;
    /**
     * Private constructor to enforce the Singleton pattern.
     * Throws an error if an attempt is made to create a second instance.
     */
    private constructor();
    /**
     * Returns the singleton instance of the Abieos class.
     * If an instance does not already exist, it creates one.
     * @returns {Abieos} The singleton instance of Abieos.
     */
    static getInstance(): Abieos;
    getLoadedAbis(): string[];
    /**
     * Cleans up all loaded contracts by deleting them from the native context.
     * This is useful for freeing up resources and ensuring a clean state.
     */
    cleanup(): void;
    /**
     * Converts a string name to its corresponding 64-bit unsigned integer representation (BigInt).
     * @param {string} nameString The string name to convert.
     * @returns {BigInt} The BigInt representation of the name.
     */
    stringToName(nameString: string): BigInt;
    /**
     * Converts a JSON string or object to its hexadecimal binary representation.
     * @param {string} contractName The name of the contract.
     * @param {string} type The type within the ABI to use for conversion.
     * @param {string | object} json The JSON data as a string or object.
     * @returns {string} The hexadecimal string representation of the binary data.
     * @throws {Error} If parsing fails or an error occurs in the native module.
     */
    jsonToHex(contractName: string, type: string, json: string | object): string;
    /**
     * Converts a hexadecimal binary string to its JSON representation.
     * @param {string} contractName The name of the contract.
     * @param {string} type The type within the ABI to use for conversion.
     * @param {string} hex The hexadecimal string to convert.
     * @returns {any} The parsed JSON object.
     * @throws {Error} If parsing fails or an error occurs in the native module.
     */
    hexToJson(contractName: string, type: string, hex: string): any;
    /**
     * Converts a binary buffer to its JSON representation.
     * @param {string} contractName The name of the contract.
     * @param {string} type The type within the ABI to use for conversion.
     * @param {Buffer} buffer The binary data as a Buffer.
     * @returns {any} The parsed JSON object.
     * @throws {Error} If parsing fails or an error occurs in the native module.
     */
    binToJson(contractName: string, type: string, buffer: Buffer): any;
    /**
     * Loads an ABI for a given contract.
     * @param {string} contractName The name of the contract for which to load the ABI.
     * @param {string | object} abi The ABI as a JSON string or object.
     * @returns {boolean} True if the ABI was loaded successfully, false otherwise.
     * @throws {Error} If the ABI format is invalid or loading fails.
     */
    loadAbi(contractName: string, abi: string | object): boolean;
    /**
     * Loads an ABI for a given contract from its hexadecimal representation.
     * @param {string} contractName The name of the contract for which to load the ABI.
     * @param {string} abihex The ABI as a hexadecimal string.
     * @returns {boolean} True if the ABI was loaded successfully, false otherwise.
     * @throws {Error} If loading fails.
     */
    loadAbiHex(contractName: string, abihex: string): boolean;
    /**
     * Retrieves the type name for a specific action within a contract's ABI.
     * @param {string} contractName The name of the contract.
     * @param {string} actionName The name of the action.
     * @returns {string} The type name associated with the action.
     * @throws {Error} If the contract or action is not found or another error occurs.
     */
    getTypeForAction(contractName: string, actionName: string): string;
    /**
     * Retrieves the type name for a specific table within a contract's ABI.
     * @param {string} contractName The name of the contract.
     * @param {string} table_name The name of the table.
     * @returns {string} The type name associated with the table.
     * @throws {Error} If the contract or table is not found or another error occurs.
     */
    getTypeForTable(contractName: string, table_name: string): string;
    /**
     * Deletes a contract's ABI from the abieos context.
     * @param {string} contractName The name of the contract to delete.
     * @returns {boolean} True if the contract was successfully deleted, false otherwise.
     * @throws {Error} If deletion fails.
     */
    deleteContract(contractName: string): boolean;
}

declare const abieos: any;

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
export declare function resolveNative(req?: (id: string) => any, platform?: string, arch?: string): any;

export { }
