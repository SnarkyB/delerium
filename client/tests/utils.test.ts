import { b64u, ub64u, genIV } from '../src/app';

// We need to export these functions from app.ts to test them
// Let me create a separate utils file for testable functions

describe('Utility Functions', () => {
  describe('b64u', () => {
    it('should encode ArrayBuffer to base64url string', () => {
      const testData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = b64u(testData.buffer);
      
      expect(result).toBe('SGVsbG8');
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('should handle empty ArrayBuffer', () => {
      const emptyBuffer = new ArrayBuffer(0);
      const result = b64u(emptyBuffer);
      
      expect(result).toBe('');
    });

    it('should handle single byte', () => {
      const singleByte = new Uint8Array([65]); // 'A'
      const result = b64u(singleByte.buffer);
      
      expect(result).toBe('QQ');
    });
  });

  describe('ub64u', () => {
    it('should decode base64url string to ArrayBuffer', () => {
      const encoded = 'SGVsbG8';
      const result = ub64u(encoded);
      const decoded = new Uint8Array(result);
      
      expect(decoded).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle empty string', () => {
      const result = ub64u('');
      expect(result.byteLength).toBe(0);
    });

    it('should round-trip correctly', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const encoded = b64u(original.buffer);
      const decoded = ub64u(encoded);
      const result = new Uint8Array(decoded);
      
      expect(result).toEqual(original);
    });

    it('should handle padding correctly', () => {
      const testData = new Uint8Array([1, 2, 3]); // 3 bytes, needs padding
      const encoded = b64u(testData.buffer);
      const decoded = ub64u(encoded);
      const result = new Uint8Array(decoded);
      
      expect(result).toEqual(testData);
    });
  });

  describe('genIV', () => {
    it('should generate 12-byte IV', () => {
      const iv = genIV();
      
      expect(iv).toBeInstanceOf(Uint8Array);
      expect(iv.length).toBe(12);
    });

    it('should generate different IVs on subsequent calls', () => {
      const iv1 = genIV();
      const iv2 = genIV();
      
      // While it's theoretically possible they could be the same,
      // it's extremely unlikely with 12 random bytes
      expect(iv1).not.toEqual(iv2);
    });

    it('should call crypto.getRandomValues', () => {
      const mockGetRandomValues = jest.fn();
      (global.crypto as any).getRandomValues = mockGetRandomValues;
      
      genIV();
      
      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    });
  });
});