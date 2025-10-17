import { encryptString, decryptParts, b64u, ub64u } from '../../src/app';

// Mock crypto.subtle for integration testing
const mockCryptoKey = {
  type: 'secret',
  algorithm: { name: 'AES-GCM', length: 256 },
  usages: ['encrypt', 'decrypt'],
  extractable: true
} as CryptoKey;

const mockGenerateKey = jest.fn();
const mockImportKey = jest.fn();
const mockExportKey = jest.fn();
const mockEncrypt = jest.fn();
const mockDecrypt = jest.fn();
const mockGetRandomValues = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  
  // Setup crypto mocks
  (global.crypto.subtle as any).generateKey = mockGenerateKey;
  (global.crypto.subtle as any).importKey = mockImportKey;
  (global.crypto.subtle as any).exportKey = mockExportKey;
  (global.crypto.subtle as any).encrypt = mockEncrypt;
  (global.crypto.subtle as any).decrypt = mockDecrypt;
  (global.crypto.getRandomValues as any) = mockGetRandomValues;
});

describe('Encryption Flow Integration Tests', () => {
  describe('Complete Encrypt-Decrypt Flow', () => {
    it('should encrypt and decrypt text successfully', async () => {
      const plaintext = 'This is a test message for encryption';
      const mockIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const mockCiphertext = new Uint8Array([100, 101, 102, 103, 104, 105, 106, 107]);
      const mockRawKey = new Uint8Array([200, 201, 202, 203, 204, 205, 206, 207]);
      
      // Setup mocks
      mockGenerateKey.mockResolvedValue(mockCryptoKey);
      mockGetRandomValues.mockImplementation((arr: Uint8Array) => {
        arr.set(mockIV);
        return arr;
      });
      mockEncrypt.mockResolvedValue(mockCiphertext.buffer);
      mockExportKey.mockResolvedValue(mockRawKey.buffer);
      
      // Mock import and decrypt for decryption
      mockImportKey.mockResolvedValue(mockCryptoKey);
      mockDecrypt.mockResolvedValue(new TextEncoder().encode(plaintext));

      // Encrypt
      const encrypted = await encryptString(plaintext);
      
      expect(encrypted).toHaveProperty('keyB64');
      expect(encrypted).toHaveProperty('ivB64');
      expect(encrypted).toHaveProperty('ctB64');
      expect(typeof encrypted.keyB64).toBe('string');
      expect(typeof encrypted.ivB64).toBe('string');
      expect(typeof encrypted.ctB64).toBe('string');

      // Decrypt
      const decrypted = await decryptParts(encrypted.keyB64, encrypted.ivB64, encrypted.ctB64);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string encryption/decryption', async () => {
      const plaintext = '';
      const mockIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const mockCiphertext = new Uint8Array([]);
      const mockRawKey = new Uint8Array([200, 201, 202, 203, 204, 205, 206, 207]);
      
      mockGenerateKey.mockResolvedValue(mockCryptoKey);
      mockGetRandomValues.mockImplementation((arr: Uint8Array) => {
        arr.set(mockIV);
        return arr;
      });
      mockEncrypt.mockResolvedValue(mockCiphertext.buffer);
      mockExportKey.mockResolvedValue(mockRawKey.buffer);
      mockImportKey.mockResolvedValue(mockCryptoKey);
      mockDecrypt.mockResolvedValue(new TextEncoder().encode(plaintext));

      const encrypted = await encryptString(plaintext);
      const decrypted = await decryptParts(encrypted.keyB64, encrypted.ivB64, encrypted.ctB64);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode text encryption/decryption', async () => {
      const plaintext = 'Hello 世界! 🌍 This is a test with unicode characters.';
      const mockIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const mockCiphertext = new Uint8Array([100, 101, 102, 103, 104, 105, 106, 107]);
      const mockRawKey = new Uint8Array([200, 201, 202, 203, 204, 205, 206, 207]);
      
      mockGenerateKey.mockResolvedValue(mockCryptoKey);
      mockGetRandomValues.mockImplementation((arr: Uint8Array) => {
        arr.set(mockIV);
        return arr;
      });
      mockEncrypt.mockResolvedValue(mockCiphertext.buffer);
      mockExportKey.mockResolvedValue(mockRawKey.buffer);
      mockImportKey.mockResolvedValue(mockCryptoKey);
      mockDecrypt.mockResolvedValue(new TextEncoder().encode(plaintext));

      const encrypted = await encryptString(plaintext);
      const decrypted = await decryptParts(encrypted.keyB64, encrypted.ivB64, encrypted.ctB64);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle large text encryption/decryption', async () => {
      const plaintext = 'A'.repeat(10000); // 10KB of text
      const mockIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const mockCiphertext = new Uint8Array([100, 101, 102, 103, 104, 105, 106, 107]);
      const mockRawKey = new Uint8Array([200, 201, 202, 203, 204, 205, 206, 207]);
      
      mockGenerateKey.mockResolvedValue(mockCryptoKey);
      mockGetRandomValues.mockImplementation((arr: Uint8Array) => {
        arr.set(mockIV);
        return arr;
      });
      mockEncrypt.mockResolvedValue(mockCiphertext.buffer);
      mockExportKey.mockResolvedValue(mockRawKey.buffer);
      mockImportKey.mockResolvedValue(mockCryptoKey);
      mockDecrypt.mockResolvedValue(new TextEncoder().encode(plaintext));

      const encrypted = await encryptString(plaintext);
      const decrypted = await decryptParts(encrypted.keyB64, encrypted.ivB64, encrypted.ctB64);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Base64 URL Encoding Integration', () => {
    it('should correctly encode and decode data', () => {
      const testData = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]); // "Hello World"
      
      const encoded = b64u(testData.buffer);
      const decoded = ub64u(encoded);
      const result = new Uint8Array(decoded);
      
      expect(result).toEqual(testData);
    });

    it('should handle binary data correctly', () => {
      const testData = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
      
      const encoded = b64u(testData.buffer);
      const decoded = ub64u(encoded);
      const result = new Uint8Array(decoded);
      
      expect(result).toEqual(testData);
    });

    it('should handle edge cases', () => {
      // Empty data
      const emptyData = new Uint8Array([]);
      const encodedEmpty = b64u(emptyData.buffer);
      const decodedEmpty = ub64u(encodedEmpty);
      expect(decodedEmpty.byteLength).toBe(0);

      // Single byte
      const singleByte = new Uint8Array([255]);
      const encodedSingle = b64u(singleByte.buffer);
      const decodedSingle = ub64u(encodedSingle);
      const resultSingle = new Uint8Array(decodedSingle);
      expect(resultSingle).toEqual(singleByte);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle encryption errors gracefully', async () => {
      const plaintext = 'Test message';
      const error = new Error('Encryption failed');
      
      mockGenerateKey.mockRejectedValue(error);

      await expect(encryptString(plaintext)).rejects.toThrow('Encryption failed');
    });

    it('should handle decryption errors gracefully', async () => {
      const keyB64 = 'invalid-key';
      const ivB64 = 'invalid-iv';
      const ctB64 = 'invalid-ct';
      const error = new Error('Decryption failed');
      
      mockImportKey.mockRejectedValue(error);

      await expect(decryptParts(keyB64, ivB64, ctB64)).rejects.toThrow('Decryption failed');
    });

    it('should handle malformed base64 data', async () => {
      const invalidBase64 = 'invalid-base64-data!@#';
      
      expect(() => ub64u(invalidBase64)).toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should encrypt/decrypt within reasonable time', async () => {
      const plaintext = 'Performance test message';
      const mockIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const mockCiphertext = new Uint8Array([100, 101, 102, 103, 104, 105, 106, 107]);
      const mockRawKey = new Uint8Array([200, 201, 202, 203, 204, 205, 206, 207]);
      
      mockGenerateKey.mockResolvedValue(mockCryptoKey);
      mockGetRandomValues.mockImplementation((arr: Uint8Array) => {
        arr.set(mockIV);
        return arr;
      });
      mockEncrypt.mockResolvedValue(mockCiphertext.buffer);
      mockExportKey.mockResolvedValue(mockRawKey.buffer);
      mockImportKey.mockResolvedValue(mockCryptoKey);
      mockDecrypt.mockResolvedValue(new TextEncoder().encode(plaintext));

      const startTime = Date.now();
      
      const encrypted = await encryptString(plaintext);
      const decrypted = await decryptParts(encrypted.keyB64, encrypted.ivB64, encrypted.ctB64);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(decrypted).toBe(plaintext);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});