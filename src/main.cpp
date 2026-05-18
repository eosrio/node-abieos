#include <napi.h>
#include <napi-inl.h>

#include <cstdio>
#include <string>
#include <iostream> // Will be removed for proper N-API logging

#include "../abieos/src/abieos.h"
#include "../abieos/src/abieos.hpp"

// Global abieos context, managed across N-API calls.
// It's initialized once and destroyed when the environment cleans up.
abieos_context* global_context = nullptr;

/**
 * Helper function to get the global abieos context.
 * If the context is not yet created, it will create it.
 * This function should ideally be called once during module initialization.
 * @param env Napi::Env environment for error handling.
 * @returns abieos_context* The global abieos context.
 * @throws Napi::Error if context creation fails.
 */
abieos_context* get_or_create_context(Napi::Env env) {
    if (global_context == nullptr) {
        global_context = abieos_create();
        if (global_context == nullptr) {
            Napi::Error::New(env, "Failed to create abieos context.").ThrowAsJavaScriptException();
            return nullptr;
        }
        // Add a cleanup hook to destroy the context when the Node.js environment exits.
        env.AddCleanupHook([]() {
            if (global_context != nullptr) {
                abieos_destroy(global_context);
                global_context = nullptr;
            }
        });
    }
    return global_context;
}

/**
 * Converts a JSON string to its hexadecimal binary representation.
 * Throws Napi::Error on failure.
 * @param env Napi::Env environment.
 * @param contract_name The contract name.
 * @param type The type within the ABI.
 * @param json The JSON string.
 * @returns std::string The hexadecimal binary string.
 */
std::string json_to_hex(Napi::Env env, const char *contract_name, const char *type, const char *json)
{
    abieos_context* context = get_or_create_context(env);
    if (!context) return ""; // Error already thrown by get_or_create_context

    uint64_t contract = abieos_string_to_name(context, contract_name);
    bool status = abieos_json_to_bin(context, contract, type, json);
    if (!status) {
        Napi::Error::New(env, abieos_get_error(context)).ThrowAsJavaScriptException();
        return "";
    }
    const char* results = abieos_get_bin_hex(context);
    if (results == nullptr) {
        Napi::Error::New(env, abieos_get_error(context)).ThrowAsJavaScriptException();
        return "";
    }
    return std::string(results);
}

/**
 * Converts a hexadecimal binary string to its JSON representation.
 * Throws Napi::Error on failure.
 * @param env Napi::Env environment.
 * @param contract_name The contract name.
 * @param type The type within the ABI.
 * @param hex The hexadecimal string.
 * @returns std::string The JSON string.
 */
std::string hex_to_json(Napi::Env env, const char *contract_name, const char *type, const char *hex)
{
    abieos_context* context = get_or_create_context(env);
    if (!context) return ""; // Error already thrown by get_or_create_context

    uint64_t contract = abieos_string_to_name(context, contract_name);
    const char* results = abieos_hex_to_json(context, contract, type, hex);
    if (results == nullptr) {
        Napi::Error::New(env, abieos_get_error(context)).ThrowAsJavaScriptException();
        return "";
    }
    return std::string(results);
}

/**
 * Converts a binary buffer to its JSON representation.
 * Throws Napi::Error on failure.
 * @param env Napi::Env environment.
 * @param contract_name The contract name.
 * @param type The type within the ABI.
 * @param bin The binary data.
 * @param size The size of the binary data.
 * @returns std::string The JSON string.
 */
std::string bin_to_json(Napi::Env env, const char *contract_name, const char *type, const char *bin, int size)
{
    abieos_context* context = get_or_create_context(env);
    if (!context) return ""; // Error already thrown by get_or_create_context

    uint64_t contract = abieos_string_to_name(context, contract_name);
    const char* results = abieos_bin_to_json(context, contract, type, bin, size);
    if (results == nullptr) {
        Napi::Error::New(env, abieos_get_error(context)).ThrowAsJavaScriptException();
        return "";
    }
    return std::string(results);
}

/**
 * N-API wrapper for json_to_hex.
 * @param info Napi::CallbackInfo object.
 * @returns Napi::String The hexadecimal binary string.
 */
Napi::String JsonToHexWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 3 || !info[0].IsString() || !info[1].IsString() || !info[2].IsString()) {
        Napi::TypeError::New(env, "Expected three string arguments: contractName, type, json").ThrowAsJavaScriptException();
        return env.Null().As<Napi::String>();
    }
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string type = info[1].As<Napi::String>().Utf8Value();
    std::string json = info[2].As<Napi::String>().Utf8Value();
    return Napi::String::New(env, json_to_hex(env, contract_name.c_str(), type.c_str(), json.c_str()));
}

/**
 * N-API wrapper for hex_to_json.
 * @param info Napi::CallbackInfo object.
 * @returns Napi::String The JSON string.
 */
Napi::String HexToJsonWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 3 || !info[0].IsString() || !info[1].IsString() || !info[2].IsString()) {
        Napi::TypeError::New(env, "Expected three string arguments: contractName, type, hex").ThrowAsJavaScriptException();
        return env.Null().As<Napi::String>();
    }
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string type = info[1].As<Napi::String>().Utf8Value();
    std::string hex = info[2].As<Napi::String>().Utf8Value();
    return Napi::String::New(env, hex_to_json(env, contract_name.c_str(), type.c_str(), hex.c_str()));
}

/**
 * N-API wrapper for bin_to_json.
 * @param info Napi::CallbackInfo object.
 * @returns Napi::String The JSON string.
 */
Napi::String BinToJsonWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    // Accept any Uint8Array (a Node Buffer is a Uint8Array). The TypeScript
    // signature is `Uint8Array`, so the native side must accept a plain
    // Uint8Array too — not only a Buffer — otherwise the type would lie.
    if (info.Length() < 3 || !info[0].IsString() || !info[1].IsString() ||
        !(info[2].IsBuffer() || info[2].IsTypedArray())) {
        Napi::TypeError::New(env, "Expected (string contractName, string type, Uint8Array|Buffer data)").ThrowAsJavaScriptException();
        return env.Null().As<Napi::String>();
    }
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string type = info[1].As<Napi::String>().Utf8Value();

    const char *bin_data;
    size_t bin_length;
    if (info[2].IsBuffer()) {
        Napi::Buffer<char> buf = info[2].As<Napi::Buffer<char>>();
        bin_data = buf.Data();
        bin_length = buf.Length();
    } else {
        // Generic typed array: resolve the underlying bytes honouring the
        // view's byte offset (Node Buffers/Uint8Arrays are often slices of
        // a shared, pooled ArrayBuffer).
        Napi::TypedArray ta = info[2].As<Napi::TypedArray>();
        Napi::ArrayBuffer ab = ta.ArrayBuffer();
        bin_data = static_cast<const char *>(ab.Data()) + ta.ByteOffset();
        bin_length = ta.ByteLength();
    }
    return Napi::String::New(env, bin_to_json(env, contract_name.c_str(), type.c_str(), bin_data, bin_length));
}

/**
 * Converts a string to an abieos name (uint64_t).
 * Throws Napi::Error on context creation failure.
 * @param env Napi::Env environment.
 * @param str The string to convert.
 * @returns uint64_t The name as a uint64_t.
 */
uint64_t string_to_name(Napi::Env env, const char *str)
{
    abieos_context* context = get_or_create_context(env);
    if (!context) return 0; // Error already thrown by get_or_create_context
    return abieos_string_to_name(context, str);
}

/**
 * N-API wrapper for string_to_name.
 * @param info Napi::CallbackInfo object.
 * @returns Napi::BigInt The name as a BigInt.
 */
Napi::BigInt StringToNameWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected one string argument: nameString").ThrowAsJavaScriptException();
        return env.Null().As<Napi::BigInt>();
    }
    std::string str_input = info[0].As<Napi::String>().Utf8Value();
    uint64_t returnValue = string_to_name(env, str_input.c_str());
    return Napi::BigInt::New(env, returnValue);
}

/**
 * Loads an ABI for a given contract.
 * Throws Napi::Error on failure.
 * @param env Napi::Env environment.
 * @param contract_name The contract name.
 * @param abi The ABI JSON string.
 * @returns bool True if successful, false otherwise.
 */
bool load_abi(Napi::Env env, const char *contract_name, const char *abi)
{
    abieos_context* context = get_or_create_context(env);
    if (!context) return false; // Error already thrown by get_or_create_context

    uint64_t contract = abieos_string_to_name(context, contract_name);
    // Delete existing contract ABI before setting a new one to ensure clean state
    abieos_delete_contract(context, contract);
    bool abi_status = abieos_set_abi(context, contract, abi);
    if (!abi_status) {
        Napi::Error::New(env, abieos_get_error(context)).ThrowAsJavaScriptException();
        return false;
    }
    return true;
}

/**
 * N-API wrapper for load_abi.
 * @param info Napi::CallbackInfo object.
 * @returns Napi::Boolean True if successful, false otherwise.
 */
Napi::Boolean LoadAbiWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected two string arguments: contractName, abiJson").ThrowAsJavaScriptException();
        return env.Null().As<Napi::Boolean>();
    }
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string abi = info[1].As<Napi::String>().Utf8Value();
    return Napi::Boolean::New(env, load_abi(env, contract_name.c_str(), abi.c_str()));
}

/**
 * Loads an ABI for a given contract from its hexadecimal representation.
 * Throws Napi::Error on failure.
 * @param env Napi::Env environment.
 * @param contract_name The contract name.
 * @param hex The ABI hexadecimal string.
 * @returns bool True if successful, false otherwise.
 */
bool load_abi_hex(Napi::Env env, const char *contract_name, const char *hex)
{
    abieos_context* context = get_or_create_context(env);
    if (!context) return false; // Error already thrown by get_or_create_context

    uint64_t contract = abieos_string_to_name(context, contract_name);
    // Delete existing contract ABI before setting a new one to ensure clean state
    abieos_delete_contract(context, contract);
    bool abi_status = abieos_set_abi_hex(context, contract, hex);
    if (!abi_status) {
        Napi::Error::New(env, abieos_get_error(context)).ThrowAsJavaScriptException();
        return false;
    }
    return true;
}

/**
 * N-API wrapper for load_abi_hex.
 * @param info Napi::CallbackInfo object.
 * @returns Napi::Boolean True if successful, false otherwise.
 */
Napi::Boolean LoadAbiHexWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected two string arguments: contractName, abiHex").ThrowAsJavaScriptException();
        return env.Null().As<Napi::Boolean>();
    }
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string abi_hex = info[1].As<Napi::String>().Utf8Value();
    return Napi::Boolean::New(env, load_abi_hex(env, contract_name.c_str(), abi_hex.c_str()));
}

/**
 * Retrieves the type name for a specific action within a contract's ABI.
 * Throws Napi::Error on failure.
 * @param env Napi::Env environment.
 * @param contract_name The contract name.
 * @param action_name The action name.
 * @returns std::string The type name.
 */
std::string get_type_for_action(Napi::Env env, const char *contract_name, const char *action_name)
{
    abieos_context* context = get_or_create_context(env);
    if (!context) return ""; // Error already thrown by get_or_create_context

    uint64_t contract = abieos_string_to_name(context, contract_name);
    uint64_t action = abieos_string_to_name(context, action_name);
    const char* result = abieos_get_type_for_action(context, contract, action);
    if (result == nullptr) {
        Napi::Error::New(env, abieos_get_error(context)).ThrowAsJavaScriptException();
        return "";
    }
    return std::string(result);
}

/**
 * Retrieves the type name for a specific table within a contract's ABI.
 * Throws Napi::Error on failure.
 * @param env Napi::Env environment.
 * @param contract_name The contract name.
 * @param table_name The table name.
 * @returns std::string The type name.
 */
std::string get_type_for_table(Napi::Env env, const char *contract_name, const char *table_name)
{
    abieos_context* context = get_or_create_context(env);
    if (!context) return ""; // Error already thrown by get_or_create_context

    uint64_t contract = abieos_string_to_name(context, contract_name);
    uint64_t table = abieos_string_to_name(context, table_name);
    const char* result = abieos_get_type_for_table(context, contract, table);
    if (result == nullptr) {
        Napi::Error::New(env, abieos_get_error(context)).ThrowAsJavaScriptException();
        return "";
    }
    return std::string(result);
}

/**
 * N-API wrapper for get_type_for_action.
 * @param info Napi::CallbackInfo object.
 * @returns Napi::String The type name.
 */
Napi::String GetTypeWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected two string arguments: contractName, actionName").ThrowAsJavaScriptException();
        return env.Null().As<Napi::String>();
    }
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string action_name = info[1].As<Napi::String>().Utf8Value();
    return Napi::String::New(env, get_type_for_action(env, contract_name.c_str(), action_name.c_str()));
}

/**
 * N-API wrapper for get_type_for_table.
 * @param info Napi::CallbackInfo object.
 * @returns Napi::String The type name.
 */
Napi::String GetTableTypeWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected two string arguments: contractName, tableName").ThrowAsJavaScriptException();
        return env.Null().As<Napi::String>();
    }
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string table_name = info[1].As<Napi::String>().Utf8Value();
    return Napi::String::New(env, get_type_for_table(env, contract_name.c_str(), table_name.c_str()));
}

/**
 * Deletes a contract's ABI from the abieos context.
 * Throws Napi::Error on context creation failure.
 * @param env Napi::Env environment.
 * @param contract_name The contract name.
 * @returns bool True if successful, false otherwise.
 */
bool delete_contract(Napi::Env env, const char *contract_name) {
    abieos_context* context = get_or_create_context(env);
    if (!context) return false; // Error already thrown by get_or_create_context

    uint64_t contract = abieos_string_to_name(context, contract_name);
    return abieos_delete_contract(context, contract);
}

/**
 * N-API wrapper for delete_contract.
 * @param info Napi::CallbackInfo object.
 * @returns Napi::Boolean True if successful, false otherwise.
 */
Napi::Boolean DeleteContractWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected one string argument: contractName").ThrowAsJavaScriptException();
        return env.Null().As<Napi::Boolean>();
    }
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    return Napi::Boolean::New(env, delete_contract(env, contract_name.c_str()));
}

/**
 * Initializes the Node.js module.
 * @param env The N-API environment.
 * @param exports The exports object for the module.
 * @returns Napi::Object The exports object.
 */
Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    // Initialize global_context once during module load
    get_or_create_context(env);

    exports.Set("string_to_name", Napi::Function::New(env, StringToNameWrapped));
    exports.Set("json_to_hex", Napi::Function::New(env, JsonToHexWrapped));
    exports.Set("hex_to_json", Napi::Function::New(env, HexToJsonWrapped));
    exports.Set("bin_to_json", Napi::Function::New(env, BinToJsonWrapped));
    exports.Set("load_abi", Napi::Function::New(env, LoadAbiWrapped));
    exports.Set("load_abi_hex", Napi::Function::New(env, LoadAbiHexWrapped));
    exports.Set("get_type_for_action", Napi::Function::New(env, GetTypeWrapped));
    exports.Set("get_type_for_table", Napi::Function::New(env, GetTableTypeWrapped));
    exports.Set("delete_contract", Napi::Function::New(env, DeleteContractWrapped));
    return exports;
}

NODE_API_MODULE(abieos, Init);
