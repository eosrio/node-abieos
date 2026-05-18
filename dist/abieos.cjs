"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/abieos.ts
var abieos_exports = {};
__export(abieos_exports, {
  Abieos: () => Abieos,
  resolveNative: () => resolveNative
});
module.exports = __toCommonJS(abieos_exports);

// node_modules/tsup/assets/cjs_shims.js
var getImportMetaUrl = () => typeof document === "undefined" ? new URL(`file:${__filename}`).href : document.currentScript && document.currentScript.tagName.toUpperCase() === "SCRIPT" ? document.currentScript.src : new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();

// lib/abieos.ts
var import_node_module = require("module");
var nativeRequire = (0, import_node_module.createRequire)(importMetaUrl);
function resolveNative(req = nativeRequire, platform = process.platform, arch = process.arch) {
  const candidates = [
    `./abieos-${platform}-${arch}.node`,
    "./abieos.node",
    `../lib/abieos-${platform}-${arch}.node`,
    "../lib/abieos.node"
  ];
  let lastError;
  for (const candidate of candidates) {
    try {
      return req(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  const buildScript = platform === "win32" ? "win" : platform === "darwin" ? "mac" : "linux";
  throw new Error(
    `[node-abieos] No native binary for ${platform}-${arch}. Tried: ${candidates.join(", ")}. Build from source (npm run build:${buildScript}) or file an issue. Last error: ${lastError?.message ?? lastError}`
  );
}
var abieos = resolveNative();
var Abieos = class _Abieos {
  static logTag = "[node-abieos]";
  static instance;
  static native;
  static loadedContracts = /* @__PURE__ */ new Map();
  static debug = false;
  /**
   * Private constructor to enforce the Singleton pattern.
   * Throws an error if an attempt is made to create a second instance.
   */
  constructor() {
    if (_Abieos.instance) {
      throw new Error(`${_Abieos.logTag} Abieos is a Singleton class. Use Abieos.getInstance() to get the instance.`);
    }
    _Abieos.native = abieos;
  }
  /**
   * Returns the singleton instance of the Abieos class.
   * If an instance does not already exist, it creates one.
   * @returns {Abieos} The singleton instance of Abieos.
   */
  static getInstance() {
    if (!_Abieos.instance) {
      _Abieos.instance = new _Abieos();
    }
    return _Abieos.instance;
  }
  getLoadedAbis() {
    return Array.from(_Abieos.loadedContracts.keys());
  }
  /**
   * Cleans up all loaded contracts by deleting them from the native context.
   * This is useful for freeing up resources and ensuring a clean state.
   */
  cleanup() {
    const errors = [];
    _Abieos.loadedContracts.forEach((_, contractName) => {
      try {
        if (_Abieos.debug) {
          console.log(`${_Abieos.logTag} Cleaning up contract '${contractName}'...`);
        }
        _Abieos.native.delete_contract(contractName);
        _Abieos.loadedContracts.delete(contractName);
      } catch (e) {
        errors.push({ contractName, error: e.message });
        console.error(`${_Abieos.logTag} Failed to delete contract '${contractName}' during cleanup: ${e.message}`);
      }
    });
    if (errors.length > 0) {
      throw new Error(`${_Abieos.logTag} Errors during cleanup: ${JSON.stringify(errors)}`);
    }
  }
  /**
   * Converts a string name to its corresponding 64-bit unsigned integer representation.
   * @param {string} nameString The string name to convert.
   * @returns {bigint} The bigint representation of the name.
   */
  stringToName(nameString) {
    try {
      return _Abieos.native.string_to_name(nameString);
    } catch (e) {
      throw new Error(`${_Abieos.logTag} Failed to convert string to name '${nameString}': ${e.message}`);
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
  jsonToHex(contractName, type, json) {
    const jsonData = typeof json === "object" ? JSON.stringify(json) : json;
    try {
      return _Abieos.native.json_to_hex(contractName, type, jsonData);
    } catch (e) {
      throw new Error(`${_Abieos.logTag} Failed to convert JSON to hex for contract '${contractName}', type '${type}': ${e.message}`);
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
  hexToJson(contractName, type, hex) {
    try {
      const data = _Abieos.native.hex_to_json(contractName, type, hex);
      try {
        return JSON.parse(data);
      } catch (parseError) {
        throw new Error(`${_Abieos.logTag} Failed to parse JSON string from hex for contract '${contractName}', type '${type}'. Received: ${data}. Parse error: ${parseError.message}`);
      }
    } catch (e) {
      throw new Error(`${_Abieos.logTag} Native error when converting hex to JSON for contract '${contractName}', type '${type}': ${e.message}`);
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
  binToJson(contractName, type, buffer) {
    try {
      const data = _Abieos.native.bin_to_json(contractName, type, buffer);
      try {
        return JSON.parse(data);
      } catch (parseError) {
        throw new Error(`${_Abieos.logTag} Failed to parse JSON string from binary for contract '${contractName}', type '${type}'. Received: ${data}. Parse error: ${parseError.message}`);
      }
    } catch (e) {
      throw new Error(`${_Abieos.logTag} Native error when converting binary to JSON for contract '${contractName}', type '${type}': ${e.message}`);
    }
  }
  /**
   * Loads an ABI for a given contract.
   * @param {string} contractName The name of the contract for which to load the ABI.
   * @param {string | object} abi The ABI as a JSON string or object.
   * @returns {boolean} True if the ABI was loaded successfully, false otherwise.
   * @throws {Error} If the ABI format is invalid or loading fails.
   */
  loadAbi(contractName, abi) {
    if (_Abieos.debug && _Abieos.loadedContracts.has(contractName)) {
      console.info(`${_Abieos.logTag} Contract '${contractName}' is already loaded. Updating ABI...`);
    }
    const abiString = typeof abi === "object" ? JSON.stringify(abi) : abi;
    if (typeof abiString !== "string") {
      throw new Error(`${_Abieos.logTag} ABI must be a String or Object.`);
    }
    try {
      const loaded = _Abieos.native.load_abi(contractName, abiString);
      if (loaded) {
        _Abieos.loadedContracts.set(contractName, Date.now());
        if (_Abieos.debug) {
          console.log(`${_Abieos.logTag} Loaded ABI for contract '${contractName}'.`);
        }
      }
      return loaded;
    } catch (e) {
      throw new Error(`${_Abieos.logTag} Failed to load ABI for contract '${contractName}': ${e.message}`);
    }
  }
  /**
   * Loads an ABI for a given contract from its hexadecimal representation.
   * @param {string} contractName The name of the contract for which to load the ABI.
   * @param {string} abihex The ABI as a hexadecimal string.
   * @returns {boolean} True if the ABI was loaded successfully, false otherwise.
   * @throws {Error} If loading fails.
   */
  loadAbiHex(contractName, abihex) {
    if (typeof abihex !== "string") {
      throw new Error(`${_Abieos.logTag} ABI hex must be a String.`);
    }
    if (_Abieos.debug && _Abieos.loadedContracts.has(contractName)) {
      console.info(`${_Abieos.logTag} Contract '${contractName}' is already loaded. Updating ABI...`);
    }
    try {
      const loaded = _Abieos.native.load_abi_hex(contractName, abihex);
      if (loaded) {
        _Abieos.loadedContracts.set(contractName, Date.now());
        if (_Abieos.debug) {
          console.log(`${_Abieos.logTag} Loaded ABI hex for contract '${contractName}'.`);
        }
      }
      return loaded;
    } catch (e) {
      throw new Error(`${_Abieos.logTag} Failed to load ABI hex for contract '${contractName}': ${e.message}`);
    }
  }
  /**
   * Retrieves the type name for a specific action within a contract's ABI.
   * @param {string} contractName The name of the contract.
   * @param {string} actionName The name of the action.
   * @returns {string} The type name associated with the action.
   * @throws {Error} If the contract or action is not found or another error occurs.
   */
  getTypeForAction(contractName, actionName) {
    try {
      return _Abieos.native.get_type_for_action(contractName, actionName);
    } catch (e) {
      throw new Error(`${_Abieos.logTag} Failed to get type for action '${actionName}' in contract '${contractName}': ${e.message}`);
    }
  }
  /**
   * Retrieves the type name for a specific table within a contract's ABI.
   * @param {string} contractName The name of the contract.
   * @param {string} table_name The name of the table.
   * @returns {string} The type name associated with the table.
   * @throws {Error} If the contract or table is not found or another error occurs.
   */
  getTypeForTable(contractName, table_name) {
    try {
      return _Abieos.native.get_type_for_table(contractName, table_name);
    } catch (e) {
      throw new Error(`${_Abieos.logTag} Failed to get type for table '${table_name}' in contract '${contractName}': ${e.message}`);
    }
  }
  /**
   * Deletes a contract's ABI from the abieos context.
   * @param {string} contractName The name of the contract to delete.
   * @returns {boolean} True if the contract was successfully deleted, false otherwise.
   * @throws {Error} If deletion fails.
   */
  deleteContract(contractName) {
    try {
      const deleted = _Abieos.native.delete_contract(contractName);
      if (deleted) {
        _Abieos.loadedContracts.delete(contractName);
        if (_Abieos.debug) {
          console.log(`${_Abieos.logTag} Deleted contract '${contractName}' from abieos context.`);
        }
      }
      return deleted;
    } catch (e) {
      throw new Error(`${_Abieos.logTag} Failed to delete contract '${contractName}': ${e.message}`);
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Abieos,
  resolveNative
});
