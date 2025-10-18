import { genKey, encryptString, decryptParts } from '../src/app';

/**
 * Encryption Functions Test Suite
 * 
 * Tests the core cryptographic functions that implement the zero-knowledge encryption:
 * - genKey: Generates AES-256-GCM encryption keys for secure data protection
 * - encryptString: Encrypts plaintext using AES-256-GCM with random IV and key
 * - decryptParts: Decrypts ciphertext using provided key, IV, and encrypted data
 * 
 * These functions are the foundation of the zero-knowledge paste system, ensuring:
 * 1. Client-side encryption before data leaves the browser
 * 2. Server never sees unencrypted content
 * 3. Each paste uses unique encryption parameters (key + IV)
 * 4. Strong AES-256-GCM encryption with authentication
 * 
 * Mock Strategy:
 * - We mock the Web Crypto API (crypto.subtle) to test our logic without actual encryption
 * - This allows deterministic testing while verifying correct API usage
 */

// Mock crypto.subtle methods for deterministic testing
const mockGenerateKey = jest.fn();
const mockImportKey = jest.fn();
const mockExportKey = jest.fn();
const mockEncrypt = jest.fn();
const mockDecrypt = jest.fn();

// Mock crypto key object that matches the CryptoKey interface
const mockKey = {
  type: 'secret',
  algorithm: { name: 'AES-GCM', length: 256 },
  usages: ['encrypt', 'decrypt'],
  extractable: true
} as CryptoKey;

beforeEach(() => {
  jest.clearAllMocks();
  
  // Setup default mocks
  (global.crypto.subtle as any).generateKey = mockGenerateKey;
  (global.crypto.subtle as any).importKey = mockImportKey;
  (global.crypto.subtle as any).exportKey = mockExportKey;
  (global.crypto.subtle as any).encrypt = mockEncrypt;
  (global.crypto.subtle as any).decrypt = mockDecrypt;
});

describe('Encryption Functions', () => {
  describe('genKey', () => {
    /**
     * Tests AES-256-GCM key generation
     * 
     * This function creates a new encryption key for each paste, ensuring
     * that even if one key is compromised, other pastes remain secure.
     * The key is generated with extractable=true so it can be exported
     * and transmitted to the server for storage.
     */
    it('should generate a new encryption key', async () => {
      mockGenerateKey.mockResolvedValue(mockKey);

      const key = await genKey();

      expect(mockGenerateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      expect(key).toBe(mockKey);
    });

    it('should handle key generation errors', async () => {
      const error = new Error('Key generation failed');
      mockGenerateKey.mockRejectedValue(error);
      
      await expect(genKey()).rejects.toThrow('Key generation failed');
    });
  });

  describe('encryptString', () => {
    it('should encrypt a string and return encrypted data', async () => {
      const plaintext = 'Hello, World!';
      const mockIV = new Uint8Array(12);
      const mockCiphertext = new ArrayBuffer(32);
      const mockRawKey = new ArrayBuffer(32);
      
      mockGenerateKey.mockResolvedValue(mockKey);
      mockEncrypt.mockResolvedValue(mockCiphertext);
      mockExportKey.mockResolvedValue(mockRawKey);
      
      // Mock genIV to return predictable IV
      const genIVSpy = jest.spyOn(require('../src/app'), 'genIV');
      genIVSpy.mockReturnValue(mockIV);
      
      const result = await encryptString(plaintext);
      
      expect(result).toHaveProperty('keyB64');
      expect(result).toHaveProperty('ivB64');
      expect(result).toHaveProperty('ctB64');
      expect(typeof result.keyB64).toBe('string');
      expect(typeof result.ivB64).toBe('string');
      expect(typeof result.ctB64).toBe('string');
      
      expect(mockEncrypt).toHaveBeenCalled();
      expect(mockExportKey).toHaveBeenCalled();
    });

    it('should handle empty string', async () => {
      const plaintext = '';
      const mockIV = new Uint8Array(12);
      const mockCiphertext = new ArrayBuffer(0);
      const mockRawKey = new ArrayBuffer(32);
      
      mockGenerateKey.mockResolvedValue(mockKey);
      mockEncrypt.mockResolvedValue(mockCiphertext);
      mockExportKey.mockResolvedValue(mockRawKey);
      
      const genIVSpy = jest.spyOn(require('../src/app'), 'genIV');
      genIVSpy.mockReturnValue(mockIV);
      
      const result = await encryptString(plaintext);
      
      expect(result).toHaveProperty('keyB64');
      expect(result).toHaveProperty('ivB64');
      expect(result).toHaveProperty('ctB64');
    });

    it('should handle encryption errors', async () => {
      const plaintext = 'Test';
      const error = new Error('Encryption failed');
      
      mockGenerateKey.mockResolvedValue(mockKey);
      mockEncrypt.mockRejectedValue(error);
      
      await expect(encryptString(plaintext)).rejects.toThrow('Encryption failed');
    });
  });

  describe('decryptParts', () => {
    it('should decrypt encrypted data back to original string', async () => {
      const keyB64 = 'test-key-b64';
      const ivB64 = 'test-iv-b64';
      const ctB64 = 'test-ct-b64';
      const plaintext = 'Hello, World!';
      const mockPlaintextBuffer = new TextEncoder().encode(plaintext);
      
      mockImportKey.mockResolvedValue(mockKey);
      mockDecrypt.mockResolvedValue(mockPlaintextBuffer);
      
      const result = await decryptParts(keyB64, ivB64, ctB64);
      
      expect(result).toBe(plaintext);
      expect(mockImportKey).toHaveBeenCalled();
      expect(mockDecrypt).toHaveBeenCalled();
    });

    it('should handle decryption errors', async () => {
      const keyB64 = 'invalid-key';
      const ivB64 = 'invalid-iv';
      const ctB64 = 'invalid-ct';
      const error = new Error('Decryption failed');
      
      mockImportKey.mockRejectedValue(error);
      
      await expect(decryptParts(keyB64, ivB64, ctB64)).rejects.toThrow('Decryption failed');
    });

    it('should handle empty decrypted content', async () => {
      const keyB64 = 'test-key-b64';
      const ivB64 = 'test-iv-b64';
      const ctB64 = 'test-ct-b64';
      const emptyBuffer = new ArrayBuffer(0);
      
      mockImportKey.mockResolvedValue(mockKey);
      mockDecrypt.mockResolvedValue(emptyBuffer);
      
      const result = await decryptParts(keyB64, ivB64, ctB64);
      
      expect(result).toBe('');
    });
  });
});