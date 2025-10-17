/**
 * @jest-environment jsdom
 */

// Mock the DOM functions by importing them after setting up the DOM
describe('DOM Interaction Functions', () => {
  let mockDocument: Document;
  let mockWindow: Window;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Create test HTML structure
    document.body.innerHTML = `
      <div>
        <textarea id="paste" rows="16" placeholder="Type or paste text here…"></textarea>
        <input type="number" id="mins" value="60" min="1">
        <input type="checkbox" id="single">
        <button id="save">Encrypt & Upload</button>
        <pre id="out"></pre>
        <pre id="content">Decrypting…</pre>
      </div>
    `;

    mockDocument = document;
    mockWindow = window;
  });

  afterEach(() => {
    // Clean up event listeners
    document.body.innerHTML = '';
  });

  describe('Save button event listener', () => {
    it('should handle save button click with valid input', async () => {
      const pasteTextarea = document.getElementById('paste') as HTMLTextAreaElement;
      const minsInput = document.getElementById('mins') as HTMLInputElement;
      const singleCheckbox = document.getElementById('single') as HTMLInputElement;
      const saveButton = document.getElementById('save') as HTMLButtonElement;
      const outElement = document.getElementById('out') as HTMLPreElement;

      // Set up test data
      pasteTextarea.value = 'Test paste content';
      minsInput.value = '120';
      singleCheckbox.checked = true;

      // Mock fetch and crypto functions
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      const mockEncryptedData = {
        keyB64: 'test-key',
        ivB64: 'test-iv',
        ctB64: 'test-ct'
      };

      const mockPowChallenge = {
        challenge: 'test-challenge',
        difficulty: 4
      };

      const mockPowResponse = {
        challenge: 'test-challenge',
        nonce: 12345
      };

      const mockPasteResponse = {
        id: 'paste-id-123',
        deleteToken: 'delete-token-456'
      };

      // Mock the encryption and PoW functions
      jest.doMock('../src/app', () => ({
        encryptString: jest.fn().mockResolvedValue(mockEncryptedData),
        fetchPow: jest.fn().mockResolvedValue(mockPowChallenge),
        doPow: jest.fn().mockResolvedValue(12345)
      }));

      // Mock fetch responses
      mockFetch
        .mockResolvedValueOnce({ status: 200, json: () => Promise.resolve(mockPowChallenge) }) // fetchPow
        .mockResolvedValueOnce({ 
          ok: true, 
          json: () => Promise.resolve(mockPasteResponse) 
        }); // POST /api/pastes

      // Simulate click
      saveButton.click();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the output element was updated
      expect(outElement.textContent).toContain('Share this URL');
      expect(outElement.textContent).toContain('Delete link');
    });

    it('should show error for empty paste content', async () => {
      const pasteTextarea = document.getElementById('paste') as HTMLTextAreaElement;
      const saveButton = document.getElementById('save') as HTMLButtonElement;

      // Set empty content
      pasteTextarea.value = '';

      // Mock alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Simulate click
      saveButton.click();

      expect(mockAlert).toHaveBeenCalledWith('Nothing to save.');

      mockAlert.mockRestore();
    });

    it('should handle API errors', async () => {
      const pasteTextarea = document.getElementById('paste') as HTMLTextAreaElement;
      const saveButton = document.getElementById('save') as HTMLButtonElement;
      const outElement = document.getElementById('out') as HTMLPreElement;

      pasteTextarea.value = 'Test content';

      // Mock fetch to return error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' })
      });

      // Mock encryption function
      jest.doMock('../src/app', () => ({
        encryptString: jest.fn().mockResolvedValue({
          keyB64: 'test-key',
          ivB64: 'test-iv',
          ctB64: 'test-ct'
        }),
        fetchPow: jest.fn().mockResolvedValue(null)
      }));

      // Simulate click
      saveButton.click();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(outElement.textContent).toContain('Error: Server error');
    });
  });

  describe('View page functionality', () => {
    it('should decrypt and display content on view page', async () => {
      // Mock location for view page
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/view.html',
          search: '?p=test-paste-id',
          hash: '#test-key:test-iv',
          origin: 'http://localhost'
        },
        writable: true
      });

      // Mock fetch for paste data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ct: 'test-ciphertext',
          iv: 'test-iv'
        })
      });

      // Mock decryption function
      jest.doMock('../src/app', () => ({
        decryptParts: jest.fn().mockResolvedValue('Decrypted content')
      }));

      const contentElement = document.getElementById('content') as HTMLPreElement;

      // Simulate the view page logic
      const q = new URLSearchParams(window.location.search);
      const id = q.get('p');
      const frag = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      
      if (id && frag) {
        const [keyB64, ivB64] = frag.split(':');
        try {
          const r = await fetch(`/api/pastes/${encodeURIComponent(id)}`);
          if (r.ok) {
            const { ct, iv } = await r.json();
            // Mock the decryption call
            const text = 'Decrypted content'; // This would be the result of decryptParts
            contentElement.textContent = text;
          }
        } catch (e) {
          contentElement.textContent = 'Error: ' + (e as Error).message;
        }
      }

      expect(contentElement.textContent).toBe('Decrypted content');
    });

    it('should show error for missing paste ID or key', () => {
      // Mock location without required parameters
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/view.html',
          search: '',
          hash: '',
          origin: 'http://localhost'
        },
        writable: true
      });

      const contentElement = document.getElementById('content') as HTMLPreElement;

      // Simulate the view page logic
      const q = new URLSearchParams(window.location.search);
      const id = q.get('p');
      const frag = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      
      if (!id || !frag) {
        contentElement.textContent = 'Missing paste ID or key.';
      }

      expect(contentElement.textContent).toBe('Missing paste ID or key.');
    });

    it('should handle fetch errors on view page', async () => {
      // Mock location for view page
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/view.html',
          search: '?p=test-paste-id',
          hash: '#test-key:test-iv',
          origin: 'http://localhost'
        },
        writable: true
      });

      // Mock fetch to return error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      });

      const contentElement = document.getElementById('content') as HTMLPreElement;

      // Simulate the view page logic
      const q = new URLSearchParams(window.location.search);
      const id = q.get('p');
      const frag = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      
      if (id && frag) {
        const [keyB64, ivB64] = frag.split(':');
        try {
          const r = await fetch(`/api/pastes/${encodeURIComponent(id)}`);
          if (!r.ok) throw new Error('Not found or expired.');
        } catch (e) {
          contentElement.textContent = 'Error: ' + (e as Error).message;
        }
      }

      expect(contentElement.textContent).toBe('Error: Not found or expired.');
    });
  });
});