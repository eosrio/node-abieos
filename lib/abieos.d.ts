/// <reference types="node" />
declare let abieos: any | null;
export declare class Abieos {
    private static instance;
    static native: typeof abieos;
    private constructor();
    static getInstance(): Abieos;
    stringToName(nameString: string): BigInteger;
    jsonToHex(contractName: string, type: string, json: string | object): string;
    hexToJson(contractName: string, type: string, hex: string): string;
    binToJson(contractName: string, type: string, buffer: Buffer): string;
    loadAbi(contractName: string, abi: string | object): boolean;
    loadAbiHex(contractName: string, abihex: string): boolean;
    getTypeForAction(contractName: string, actionName: string): string;
    getTypeForTable(contractName: string, table_name: string): string;
    deleteContract(contractName: string): boolean;
}
export {};
//# sourceMappingURL=abieos.d.ts.map