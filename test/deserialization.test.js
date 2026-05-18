import assert from 'node:assert/strict';
import test from 'node:test';
import { Abieos } from '../dist/abieos.js';

test.describe('Deserialization (hexTojson)', () => {
    const abieos = Abieos.getInstance();

    const contractAccount = "test.token";
    const transferABI = {
        version: "eosio::abi/1.1",
        types: [],
        structs: [{
            name: "transfer",
            base: "",
            fields: [
                { name: "from", type: "name" },
                { name: "to", type: "name" },
                { name: "quantity", type: "asset" },
                { name: "memo", type: "string" }
            ]
        }],
        actions: [{ name: "transfer", type: "transfer", ricardian_contract: "" }],
    };
    const transferActionData = {
        from: "alice",
        to: "bob",
        quantity: "1.0000 EOS",
        memo: "test transfer"
    };
    let validHex;

    Abieos.debug = true;
    abieos.cleanup();
    abieos.loadAbi(contractAccount, transferABI);

    validHex = abieos.jsonToHex(contractAccount, "transfer", transferActionData);

    test('should deserialize valid hex data for transfer action', () => {
        const jsonData = abieos.hexToJson(contractAccount, "transfer", validHex);
        assert.deepStrictEqual(jsonData, transferActionData, 'Deserialized data should match original');
    });

    test('should throw if ABI for contract is not loaded during deserialization', () => {
        assert.throws(
            () => abieos.hexToJson("unknown.contract", "transfer", validHex),
            (err) => err.message.includes('binary decode error'),
            'Should throw if ABI is not loaded for deserialization'
        );
    });

    test('should throw if type is not found in ABI during deserialization', () => {
        assert.throws(
            () => abieos.hexToJson(contractAccount, "unknown_type", validHex),
            (err) => err.message.includes('Unknown type'),
            'Should throw if type is not found for deserialization'
        );
    });

    test('should throw for invalid hex string', () => {
        const invalidHex = "thisisnothex";
        assert.throws(
            () => abieos.hexToJson(contractAccount, "transfer", invalidHex),
            (err) => err.message.includes('expected hex string'),
            'Should throw for invalid hex string'
        );
    });

    test('should throw for hex string that does not conform to ABI type', () => {
        const shortHex = "1234";
        assert.throws(
            () => abieos.hexToJson(contractAccount, "transfer", shortHex),
            (err) => err.message.includes('Stream overrun'),
            'Should throw for malformed hex data'
        );
    });

    test('binToJson should throw when given a string instead of bytes', () => {
        const invalidHex = "thisisnothex";
        assert.throws(
            () => abieos.binToJson(contractAccount, "transfer", invalidHex),
            (err) => err.message.includes('Uint8Array|Buffer data'),
            'Should throw when the data argument is not a Uint8Array/Buffer'
        );
    });

    test('binToJson should throw for valid Buffer that does not conform to the type', () => {
        const shortHex = "1234";
        assert.throws(
            () => abieos.binToJson(contractAccount, "transfer", Buffer.from(shortHex, 'hex')),
            (err) => err.message.includes('Stream overrun'),
            'Should throw for malformed hex data'
        );
    });

    test('hexToJson should wrap parse errors from native response', () => {
        const originalHexToJson = Abieos.native.hex_to_json;
        Abieos.native.hex_to_json = () => '{invalid json';
        try {
            assert.throws(
                () => abieos.hexToJson(contractAccount, "transfer", validHex),
                (err) => err.message.includes('Failed to parse JSON string from hex'),
                'Should wrap JSON.parse errors when native returns invalid JSON'
            );
        } finally {
            Abieos.native.hex_to_json = originalHexToJson;
        }
    });

    test('binToJson should wrap parse errors from native response', () => {
        const originalBinToJson = Abieos.native.bin_to_json;
        Abieos.native.bin_to_json = () => '{invalid json';
        try {
            assert.throws(
                () => abieos.binToJson(contractAccount, "transfer", Buffer.from(validHex, 'hex')),
                (err) => err.message.includes('Failed to parse JSON string from binary'),
                'Should wrap JSON.parse errors when native returns invalid JSON'
            );
        } finally {
            Abieos.native.bin_to_json = originalBinToJson;
        }
    });

    test('binToJson should accept a plain Uint8Array, not only a Buffer', () => {
        // The TS signature is `Uint8Array`; the native side must accept a
        // plain Uint8Array too (regression: it previously required a Buffer).
        const bytes = Uint8Array.from(Buffer.from(validHex, 'hex'));
        assert.equal(bytes instanceof Uint8Array, true);
        assert.equal(Buffer.isBuffer(bytes), false, 'must be a plain Uint8Array');
        const json = abieos.binToJson(contractAccount, "transfer", bytes);
        assert.deepStrictEqual(json, transferActionData);
    });

    test('binToJson should honour a Uint8Array view byte offset', () => {
        const raw = Buffer.from(validHex, 'hex');
        // Place the payload at a non-zero offset inside a larger ArrayBuffer.
        const backing = new Uint8Array(raw.length + 8);
        backing.set(raw, 5);
        const view = new Uint8Array(backing.buffer, 5, raw.length);
        const json = abieos.binToJson(contractAccount, "transfer", view);
        assert.deepStrictEqual(json, transferActionData);
    });

});
