require('@testing-library/jest-dom');

// Use Node's util.TextEncoder instead of our simple polyfill
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add other browser globals that might be needed
global.URL = global.URL || require('url').URL;

// Mock Request/Response for Next.js
class MockRequest {
  constructor() {
    this.headers = new Map();
  }
}

class MockResponse {
  constructor() {
    this.headers = new Map();
  }
}

global.Request = global.Request || MockRequest;
global.Response = global.Response || MockResponse;

// Mock fetch if it doesn't exist
if (!global.fetch) {
  global.fetch = jest.fn().mockImplementation(() => 
    Promise.resolve({
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      ok: true,
    })
  );
} 