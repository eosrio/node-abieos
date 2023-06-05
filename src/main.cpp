#include "abieos.h"
#include <cstdio>
#include <string>
#include <iostream>
#include <cstring>
#include <cstdlib>

using namespace std;

abieos_context* global_context;

extern "C" const char* json_to_hex(const char *contract_name, const char *type, const char *json)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    bool status = abieos_json_to_bin(global_context, contract, type, json);
    if(!status)
    {
        std::cout << abieos_get_error(global_context) << "\n";
char* result = static_cast<char*>(std::malloc(strlen("PARSING_ERROR") + 1));
std::strcpy(result, "PARSING_ERROR");
return result;
            }
    auto results = abieos_get_bin_hex(global_context);
    if(results == nullptr)
    {
        std::cout << abieos_get_error(global_context) << "\n";
char* result = static_cast<char*>(std::malloc(strlen("ERROR") + 1));
std::strcpy(result, "ERROR");
return result;

            }
    std::string hexValue = &results[0u];
// Replace strdup(hexValue.c_str()) with:
char* result = static_cast<char*>(std::malloc(hexValue.length() + 1));
std::strcpy(result, hexValue.c_str());
return result;
  
}

extern "C" const char* hex_to_json(const char *contract_name, const char *type, const char *hex)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    auto results = abieos_hex_to_json(global_context, contract, type, hex);
    if(results == nullptr)
    {
        return abieos_get_error(global_context);
    }
    return results;
}

extern "C" const char* bin_to_json(const char *contract_name, const char *type, const char *bin, int size)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    auto results = abieos_bin_to_json(global_context, contract, type, bin, size);
    if(results == nullptr)
    {
        return abieos_get_error(global_context);
    }
    return results;    
}

extern "C" uint64_t string_to_name(const char *str)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t result = abieos_string_to_name(global_context, str);
    return result;    
}

extern "C" bool load_abi(const char *contract_name, const char *abi)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    bool abi_status = abieos_set_abi(global_context, contract, abi);
    if(!abi_status) {
        std::cout << "load_abi error on [" << contract_name << "] - " << abieos_get_error(global_context) << "\n";
        return false;
    } else {
        return true;
    }    
}

extern "C" bool load_abi_hex(const char *contract_name, const char *hex)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    bool abi_status = abieos_set_abi_hex(global_context, contract, hex);
    if(!abi_status)
    {
        std::cout << "load_abi_hex error on [" << contract_name << "] - " << abieos_get_error(global_context) << "\n";
        return false;
    } else {
        return true;
    }
}

extern "C" const char* get_type_for_action(const char *contract_name, const char *action_name)
{
    if(global_context != nullptr) {
        uint64_t contract = abieos_string_to_name(global_context, contract_name);
        uint64_t action = abieos_string_to_name(global_context, action_name);
        auto result = abieos_get_type_for_action(global_context, contract, action);
        if(result == nullptr) {
            return "NOT_FOUND";
        } else {
            return result;
        }
    } else {
        return "NO_CONTEXT";
    }
}

extern "C" const char* get_type_for_table(const char *contract_name, const char *table_name)
{
    if(global_context != nullptr) {
        uint64_t contract = abieos_string_to_name(global_context, contract_name);
        uint64_t table = abieos_string_to_name(global_context, table_name);
        auto result = abieos_get_type_for_table(global_context,contract, table);
        if(result == nullptr) {
            return "NOT_FOUND";
        } else {
            return result;
        }
    } else {
        return "NO_CONTEXT";
    }
}

extern "C" bool delete_contract(const char *contract_name)
{
    if(global_context != nullptr) {
            uint64_t contract = abieos_string_to_name(global_context, contract_name);
            return abieos_delete_contract(global_context, contract);
        } else {
            return false;
        }
}
