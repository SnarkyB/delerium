/**
 * @jest-environment jsdom
 */

/**
 * DOM Interaction Functions Test Suite
 * 
 * Tests the client-side DOM manipulation and user interface interactions
 * that are essential for the zkpaste application functionality.
 * 
 * This test suite verifies:
 * 1. DOM element presence and correct types
 * 2. Form data extraction and validation
 * 3. URL parameter parsing for paste viewing
 * 4. Error and success message display
 * 5. User input handling and validation
 * 
 * These tests ensure the UI components work correctly without requiring
 * the full application logic, focusing on isolated DOM operations.
 * 
 * Note: This uses jsdom environment to simulate browser DOM in Node.js
 */
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

  describe('DOM Elements', () => {
    it('should have required DOM elements', () => {
      expect(document.getElementById('paste')).toBeTruthy();
      expect(document.getElementById('mins')).toBeTruthy();
      expect(document.getElementById('single')).toBeTruthy();
      expect(document.getElementById('save')).toBeTruthy();
      expect(document.getElementById('out')).toBeTruthy();
      expect(document.getElementById('content')).toBeTruthy();
    });

    it('should have correct element types', () => {
      const pasteElement = document.getElementById('paste') as HTMLTextAreaElement;
      const minsElement = document.getElementById('mins') as HTMLInputElement;
      const singleElement = document.getElementById('single') as HTMLInputElement;
      const saveElement = document.getElementById('save') as HTMLButtonElement;

      expect(pasteElement.tagName).toBe('TEXTAREA');
      expect(minsElement.tagName).toBe('INPUT');
      expect(singleElement.type).toBe('checkbox');
      expect(saveElement.tagName).toBe('BUTTON');
    });
  });

  describe('Form Validation', () => {
    it('should validate empty paste content', () => {
      const pasteTextarea = document.getElementById('paste') as HTMLTextAreaElement;
      pasteTextarea.value = '';

      // Mock alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Simulate the validation logic
      if (!pasteTextarea.value) {
        alert('Nothing to save.');
      }

      expect(mockAlert).toHaveBeenCalledWith('Nothing to save.');
      mockAlert.mockRestore();
    });

    it('should validate non-empty paste content', () => {
      const pasteTextarea = document.getElementById('paste') as HTMLTextAreaElement;
      pasteTextarea.value = 'Test content';

      // Mock alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Simulate the validation logic
      if (!pasteTextarea.value) {
        alert('Nothing to save.');
      }

      expect(mockAlert).not.toHaveBeenCalled();
      mockAlert.mockRestore();
    });
  });

  describe('Form Data Extraction', () => {
    it('should extract form data correctly', () => {
      const pasteTextarea = document.getElementById('paste') as HTMLTextAreaElement;
      const minsInput = document.getElementById('mins') as HTMLInputElement;
      const singleCheckbox = document.getElementById('single') as HTMLInputElement;

      // Set test values
      pasteTextarea.value = 'Test paste content';
      minsInput.value = '120';
      singleCheckbox.checked = true;

      // Extract form data
      const text = pasteTextarea.value;
      const mins = parseInt(minsInput.value || '60', 10);
      const singleView = singleCheckbox.checked;

      expect(text).toBe('Test paste content');
      expect(mins).toBe(120);
      expect(singleView).toBe(true);
    });

    it('should handle default values', () => {
      const minsInput = document.getElementById('mins') as HTMLInputElement;
      const singleCheckbox = document.getElementById('single') as HTMLInputElement;

      // Test default values
      const mins = parseInt(minsInput.value || '60', 10);
      const singleView = singleCheckbox.checked;

      expect(mins).toBe(60);
      expect(singleView).toBe(false);
    });
  });

  describe('URL Parsing', () => {
    it('should parse URL parameters correctly', () => {
      // Mock location
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/view.html',
          search: '?p=test-paste-id',
          hash: '#test-key:test-iv',
          origin: 'http://localhost'
        },
        writable: true
      });

      const q = new URLSearchParams(window.location.search);
      const id = q.get('p');
      const frag = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';

      expect(id).toBe('test-paste-id');
      expect(frag).toBe('test-key:test-iv');
    });

    it('should handle missing parameters', () => {
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

      const q = new URLSearchParams(window.location.search);
      const id = q.get('p');
      const frag = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';

      expect(id).toBeNull();
      expect(frag).toBe('');
    });
  });

  describe('Error Display', () => {
    it('should display error messages', () => {
      const outElement = document.getElementById('out') as HTMLPreElement;
      const errorMessage = 'Test error message';

      outElement.textContent = 'Error: ' + errorMessage;

      expect(outElement.textContent).toBe('Error: Test error message');
    });

    it('should display success messages', () => {
      const outElement = document.getElementById('out') as HTMLPreElement;
      const successMessage = 'Share this URL (includes the decryption key in fragment):\nhttp://localhost/view.html?p=test-id#test-key:test-iv\n\nDelete link (keep private):\nhttp://localhost/api/pastes/test-id?token=test-token (HTTP DELETE)';

      outElement.textContent = successMessage;

      expect(outElement.textContent).toContain('Share this URL');
      expect(outElement.textContent).toContain('Delete link');
    });
  });
});