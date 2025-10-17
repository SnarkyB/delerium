declare function b64u(bytes: ArrayBuffer): string;
declare function ub64u(s: string): ArrayBuffer;
declare function genKey(): Promise<CryptoKey>;
declare function genIV(): Uint8Array;
interface EncryptedData {
    keyB64: string;
    ivB64: string;
    ctB64: string;
}
declare function encryptString(plaintext: string): Promise<EncryptedData>;
declare function decryptParts(keyB64: string, ivB64: string, ctB64: string): Promise<string>;
interface PowChallenge {
    challenge: string;
    difficulty: number;
}
declare function fetchPow(): Promise<PowChallenge | null>;
declare function doPow(challenge: string, difficulty: number): Promise<number>;
//# sourceMappingURL=app.d.ts.map