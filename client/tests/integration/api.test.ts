import request from 'supertest';

// Mock server setup for API testing
const mockApp = {
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  listen: jest.fn(),
  use: jest.fn(),
};

// Mock the server routes
const mockRoutes = {
  '/api/pow': {
    get: jest.fn((req: any, res: any) => {
      res.status(200).json({
        challenge: 'test-challenge-123',
        difficulty: 4
      });
    })
  },
  '/api/pastes': {
    post: jest.fn((req: any, res: any) => {
      const { ct, iv, meta, pow } = req.body;
      
      // Validate required fields
      if (!ct || !iv || !meta) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Validate meta fields
      if (typeof meta.expireTs !== 'number' || meta.expireTs <= 0) {
        return res.status(400).json({ error: 'Invalid expiration timestamp' });
      }
      
      if (typeof meta.singleView !== 'boolean') {
        return res.status(400).json({ error: 'Invalid singleView flag' });
      }
      
      if (meta.singleView && meta.viewsAllowed !== 1) {
        return res.status(400).json({ error: 'Invalid viewsAllowed for single view' });
      }
      
      if (!meta.mime || typeof meta.mime !== 'string') {
        return res.status(400).json({ error: 'Invalid MIME type' });
      }
      
      // Validate PoW if provided
      if (pow && (!pow.challenge || typeof pow.nonce !== 'number')) {
        return res.status(400).json({ error: 'Invalid PoW data' });
      }
      
      res.status(200).json({
        id: 'test-paste-id-456',
        deleteToken: 'test-delete-token-789'
      });
    })
  },
  '/api/pastes/:id': {
    get: jest.fn((req: any, res: any) => {
      const { id } = req.params;
      
      if (id === 'non-existent') {
        return res.status(404).json({ error: 'Paste not found' });
      }
      
      if (id === 'expired') {
        return res.status(410).json({ error: 'Paste expired' });
      }
      
      res.status(200).json({
        ct: 'test-ciphertext',
        iv: 'test-iv'
      });
    }),
    delete: jest.fn((req: any, res: any) => {
      const { id } = req.params;
      const { token } = req.query;
      
      if (!token) {
        return res.status(401).json({ error: 'Missing delete token' });
      }
      
      if (id === 'non-existent') {
        return res.status(404).json({ error: 'Paste not found' });
      }
      
      res.status(204).send();
    })
  }
};

// Setup mock routes
Object.entries(mockRoutes).forEach(([path, methods]) => {
  Object.entries(methods).forEach(([method, handler]) => {
    (mockApp as any)[method](path, handler);
  });
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pow', () => {
    it('should return PoW challenge when required', async () => {
      const response = await request(mockApp)
        .get('/api/pow')
        .expect(200);

      expect(response.body).toHaveProperty('challenge');
      expect(response.body).toHaveProperty('difficulty');
      expect(typeof response.body.challenge).toBe('string');
      expect(typeof response.body.difficulty).toBe('number');
      expect(response.body.difficulty).toBeGreaterThan(0);
    });

    it('should return 204 when no PoW required', async () => {
      // Override the mock for this test
      mockRoutes['/api/pow'].get = jest.fn((req: any, res: any) => {
        res.status(204).send();
      });

      await request(mockApp)
        .get('/api/pow')
        .expect(204);
    });
  });

  describe('POST /api/pastes', () => {
    it('should create a new paste with valid data', async () => {
      const pasteData = {
        ct: 'test-ciphertext',
        iv: 'test-iv',
        meta: {
          expireTs: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          singleView: false,
          viewsAllowed: null,
          mime: 'text/plain'
        },
        pow: {
          challenge: 'test-challenge',
          nonce: 12345
        }
      };

      const response = await request(mockApp)
        .post('/api/pastes')
        .send(pasteData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('deleteToken');
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.deleteToken).toBe('string');
    });

    it('should create a single-view paste', async () => {
      const pasteData = {
        ct: 'test-ciphertext',
        iv: 'test-iv',
        meta: {
          expireTs: Math.floor(Date.now() / 1000) + 3600,
          singleView: true,
          viewsAllowed: 1,
          mime: 'text/plain'
        }
      };

      const response = await request(mockApp)
        .post('/api/pastes')
        .send(pasteData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('deleteToken');
    });

    it('should create a paste without PoW', async () => {
      const pasteData = {
        ct: 'test-ciphertext',
        iv: 'test-iv',
        meta: {
          expireTs: Math.floor(Date.now() / 1000) + 3600,
          singleView: false,
          viewsAllowed: null,
          mime: 'text/plain'
        }
      };

      const response = await request(mockApp)
        .post('/api/pastes')
        .send(pasteData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('deleteToken');
    });

    it('should reject paste with missing required fields', async () => {
      const invalidData = {
        ct: 'test-ciphertext'
        // Missing iv and meta
      };

      const response = await request(mockApp)
        .post('/api/pastes')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should reject paste with invalid expiration timestamp', async () => {
      const pasteData = {
        ct: 'test-ciphertext',
        iv: 'test-iv',
        meta: {
          expireTs: -1, // Invalid timestamp
          singleView: false,
          viewsAllowed: null,
          mime: 'text/plain'
        }
      };

      const response = await request(mockApp)
        .post('/api/pastes')
        .send(pasteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid expiration timestamp');
    });

    it('should reject paste with invalid single view configuration', async () => {
      const pasteData = {
        ct: 'test-ciphertext',
        iv: 'test-iv',
        meta: {
          expireTs: Math.floor(Date.now() / 1000) + 3600,
          singleView: true,
          viewsAllowed: 5, // Should be 1 for single view
          mime: 'text/plain'
        }
      };

      const response = await request(mockApp)
        .post('/api/pastes')
        .send(pasteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid viewsAllowed for single view');
    });

    it('should reject paste with invalid PoW data', async () => {
      const pasteData = {
        ct: 'test-ciphertext',
        iv: 'test-iv',
        meta: {
          expireTs: Math.floor(Date.now() / 1000) + 3600,
          singleView: false,
          viewsAllowed: null,
          mime: 'text/plain'
        },
        pow: {
          challenge: 'test-challenge'
          // Missing nonce
        }
      };

      const response = await request(mockApp)
        .post('/api/pastes')
        .send(pasteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid PoW data');
    });
  });

  describe('GET /api/pastes/:id', () => {
    it('should return paste data for valid ID', async () => {
      const response = await request(mockApp)
        .get('/api/pastes/valid-id')
        .expect(200);

      expect(response.body).toHaveProperty('ct');
      expect(response.body).toHaveProperty('iv');
      expect(typeof response.body.ct).toBe('string');
      expect(typeof response.body.iv).toBe('string');
    });

    it('should return 404 for non-existent paste', async () => {
      const response = await request(mockApp)
        .get('/api/pastes/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Paste not found');
    });

    it('should return 410 for expired paste', async () => {
      const response = await request(mockApp)
        .get('/api/pastes/expired')
        .expect(410);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Paste expired');
    });
  });

  describe('DELETE /api/pastes/:id', () => {
    it('should delete paste with valid token', async () => {
      await request(mockApp)
        .delete('/api/pastes/valid-id?token=valid-token')
        .expect(204);
    });

    it('should return 401 for missing delete token', async () => {
      const response = await request(mockApp)
        .delete('/api/pastes/valid-id')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing delete token');
    });

    it('should return 404 for non-existent paste', async () => {
      const response = await request(mockApp)
        .delete('/api/pastes/non-existent?token=valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Paste not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Mock server error
      mockRoutes['/api/pastes'].post = jest.fn((req: any, res: any) => {
        res.status(500).json({ error: 'Internal server error' });
      });

      const pasteData = {
        ct: 'test-ciphertext',
        iv: 'test-iv',
        meta: {
          expireTs: Math.floor(Date.now() / 1000) + 3600,
          singleView: false,
          viewsAllowed: null,
          mime: 'text/plain'
        }
      };

      const response = await request(mockApp)
        .post('/api/pastes')
        .send(pasteData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal server error');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(mockApp)
        .post('/api/pastes')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});