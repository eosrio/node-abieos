import { createRequire } from "https://deno.land/std@0.107.0/node/module.ts"
let modulePath = '';
let metaUrl = '';
if (import.meta.url.startsWith('file://')) {
    metaUrl = `${import.meta.url}`;
    modulePath = `../dist/abieos.node`;
} else {
    metaUrl = `${Deno.mainModule}`;
    modulePath = `../../bin/abieos.node`;

const paths = ['abieos.node', '../abieos.node', '../../abieos.node', '../../bin/abieos.node', '../bin/abieos.node', './bin/abieos.node'];
for (const maybePath of paths) {
    try {
        require(maybePath);
        modulePath = maybePath;
        console.log('gotcha', maybePath)
        break;
    } catch (e) {
        console.log('wrong', e);
    }
}
}
const require = createRequire(metaUrl);
let abieos = require(modulePath);
export class Abieos {
    constructor() {
        Abieos.native = abieos;
    }
    static getInstance() {
        if (!Abieos.instance) {
            Abieos.instance = new Abieos();
        }
        return Abieos.instance;
    }
    stringToName(nameString) {
        return Abieos.native.string_to_name(nameString);
    }
    jsonToHex(contractName, type, json) {
        const jsonData = typeof json === 'object' ? JSON.stringify(json) : json;
        const data = Abieos.native.json_to_hex(contractName, type, jsonData);
        if (data === 'PARSING_ERROR') {
            throw new Error('failed to parse data');
        }
        else {
            return data;
        }
    }
    hexToJson(contractName, type, hex) {
        const data = Abieos.native.hex_to_json(contractName, type, hex);
        if (data) {
            try {
                return JSON.parse(data);
            }
            catch (e) {
                throw new Error('failed to parse json string: ' + data);
            }
        }
        else {
            throw new Error('failed to parse hex data');
        }
    }
    binToJson(contractName, type, buffer) {
        const data = Abieos.native.bin_to_json(contractName, type, buffer);
        if (data[0] === '{' || data[0] === '[') {
            try {
                return JSON.parse(data);
            }
            catch (e) {
                throw new Error('json parse error');
            }
        }
        else {
            throw new Error(data);
        }
    }
    loadAbi(contractName, abi) {
        if (typeof abi === 'string') {
            return Abieos.native.load_abi(contractName, abi);
        }
        else {
            if (typeof abi === 'object') {
                return Abieos.native.load_abi(contractName, JSON.stringify(abi));
            }
            else {
                throw new Error('ABI must be a String or Object');
            }
        }
    }
    loadAbiHex(contractName, abihex) {
        return Abieos.native.load_abi_hex(contractName, abihex);
    }
    getTypeForAction(contractName, actionName) {
        const result = Abieos.native.get_type_for_action(contractName, actionName);
        if (result === 'NOT_FOUND') {
            throw new Error('action ' + actionName + ' not found on contract ' + contractName);
        }
        else {
            return result;
        }
    }
    getTypeForTable(contractName, table_name) {
        const result = Abieos.native.get_type_for_table(contractName, table_name);
        if (result === 'NOT_FOUND') {
            throw new Error('table ' + table_name + ' not found on contract ' + contractName);
        }
        else {
            return result;
        }
    }
    deleteContract(contractName) {
        return Abieos.native.delete_contract(contractName);
    }
}
