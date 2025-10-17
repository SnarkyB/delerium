import { fetchPow, doPow } from '../src/app';

// Mock fetch
global.fetch = jest.fn();

describe('Proof of Work Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPow', () => {
    it('should return null when server returns 204', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 204
      });

      const result = await fetchPow();

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith('/api/pow');
    });

    it('should return challenge data when server returns 200', async () => {
      const mockChallenge = {
        challenge: 'test-challenge-123',
        difficulty: 4
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue(mockChallenge)
      });

      const result = await fetchPow();

      expect(result).toEqual(mockChallenge);
      expect(global.fetch).toHaveBeenCalledWith('/api/pow');
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      await expect(fetchPow()).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(fetchPow()).rejects.toThrow('Invalid JSON');
    });
  });

  describe('doPow', () => {
    beforeEach(() => {
      // Mock crypto.subtle.digest
      (global.crypto.subtle as any).digest = jest.fn();
    });

    it('should find a valid nonce for given difficulty', async () => {
      const challenge = 'test-challenge';
      const difficulty = 1; // Low difficulty for testing
      
      // Mock digest to return a hash with enough leading zeros
      const mockHash = new Uint8Array(32);
      mockHash[0] = 0; // First byte is 0, giving us 8 bits
      (global.crypto.subtle.digest as jest.Mock).mockResolvedValue(mockHash.buffer);

      const nonce = await doPow(challenge, difficulty);

      expect(typeof nonce).toBe('number');
      expect(nonce).toBeGreaterThanOrEqual(0);
      expect(global.crypto.subtle.digest).toHaveBeenCalled();
    });

    it('should handle different difficulty levels', async () => {
      const challenge = 'test-challenge';
      const difficulty = 2;
      
      // Mock digest to return a hash with enough leading zeros
      const mockHash = new Uint8Array(32);
      mockHash[0] = 0; // First byte is 0, giving us 8 bits
      (global.crypto.subtle.digest as jest.Mock).mockResolvedValue(mockHash.buffer);

      const nonce = await doPow(challenge, difficulty);

      expect(typeof nonce).toBe('number');
      expect(nonce).toBeGreaterThanOrEqual(0);
    });

    it('should increment nonce until valid solution is found', async () => {
      const challenge = 'test-challenge';
      const difficulty = 1;
      let callCount = 0;
      
      // Mock digest to fail first few times, then succeed
      (global.crypto.subtle.digest as jest.Mock).mockImplementation(() => {
        callCount++;
        const mockHash = new Uint8Array(32);
        if (callCount < 3) {
          mockHash[0] = 255; // No leading zeros
        } else {
          mockHash[0] = 0; // Leading zeros found
        }
        return Promise.resolve(mockHash.buffer);
      });

      const nonce = await doPow(challenge, difficulty);

      expect(nonce).toBe(2); // Should be 2 since we succeed on the 3rd call
      expect(callCount).toBe(3);
    });
  });
});