export declare function b64u(bytes: ArrayBuffer): string;
export declare function ub64u(s: string): ArrayBuffer;
export declare function genKey(): Promise<CryptoKey>;
export declare function genIV(): Uint8Array;
interface EncryptedData {
    keyB64: string;
    ivB64: string;
    ctB64: string;
}
export declare function encryptString(plaintext: string): Promise<EncryptedData>;
export declare function decryptParts(keyB64: string, ivB64: string, ctB64: string): Promise<string>;
interface PowChallenge {
    challenge: string;
    difficulty: number;
}
export declare function fetchPow(): Promise<PowChallenge | null>;
export declare function doPow(challenge: string, difficulty: number): Promise<number>;
export {};
//# sourceMappingURL=app.d.ts.map