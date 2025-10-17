import { fetchPow, doPow } from '../src/app';

/**
 * Proof of Work (PoW) Functions Test Suite
 * 
 * Tests the client-side proof-of-work system that prevents spam and abuse:
 * - fetchPow: Retrieves PoW challenges from the server (may return null if not required)
 * - doPow: Performs computationally intensive work to solve the challenge
 * 
 * The PoW system works by:
 * 1. Server provides a challenge string and difficulty level
 * 2. Client must find a nonce that, when combined with the challenge,
 *    produces a hash with a certain number of leading zero bits
 * 3. Higher difficulty = more leading zeros required = more computation
 * 4. This prevents automated spam while allowing legitimate users
 * 
 * The difficulty is measured in bits of leading zeros, so difficulty=4 means
 * the hash must start with at least 4 zero bits (1 in 16 chance per attempt).
 */

// Mock fetch for testing server communication
global.fetch = jest.fn();

describe('Proof of Work Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPow', () => {
    /**
     * Tests PoW challenge fetching when no proof-of-work is required
     * 
     * Server returns 204 (No Content) when PoW is not needed, typically
     * when the system is not under load or the user has good reputation.
     */
    it('should return null when server returns 204', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 204
      });

      const result = await fetchPow();

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith('/api/pow');
    });

    /**
     * Tests PoW challenge fetching when proof-of-work is required
     * 
     * Server returns 200 with challenge data when PoW is needed.
     * The challenge is a unique string that must be combined with a nonce
     * to produce a hash meeting the difficulty requirement.
     */
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
      // Mock crypto.subtle.digest for deterministic testing
      (global.crypto.subtle as any).digest = jest.fn();
    });

    /**
     * Tests the core proof-of-work computation
     * 
     * This function performs the computationally intensive work of finding
     * a nonce that, when combined with the challenge, produces a hash
     * with the required number of leading zero bits.
     * 
     * The algorithm:
     * 1. Start with nonce = 0
     * 2. Create string: "{challenge}:{nonce}"
     * 3. Hash the string with SHA-256
     * 4. Count leading zero bits in the hash
     * 5. If >= difficulty, return nonce; otherwise increment and repeat
     * 
     * This is intentionally CPU-intensive to prevent spam and abuse.
     */
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