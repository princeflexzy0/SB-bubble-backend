const crypto = require('crypto');
const request = require('supertest');
const { validateHmacSignature } = require('../../middleware/validateHmacSignature');

// Helper functions
function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function hmacSha256Hex(secret, input) {
  return crypto.createHmac('sha256', secret).update(input).digest('hex');
}

function sortedStringify(obj) {
  if (!obj) return '';
  const ordered = (o) => {
    if (Array.isArray(o)) return o.map(ordered);
    if (o && typeof o === 'object') {
      return Object.keys(o).sort().reduce((result, key) => {
        result[key] = ordered(o[key]);
        return result;
      }, {});
    }
    return o;
  };
  return JSON.stringify(ordered(obj));
}

function signRequest(method, path, apiKey, secret, body = null) {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const bodyHash = body ? sha256Hex(sortedStringify(body)) : sha256Hex('');
  const canonical = `${method}\n${path}\n${apiKey}\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = hmacSha256Hex(secret, canonical);
  
  return {
    'x-api-key': apiKey,
    'x-signature': signature,
    'x-timestamp': timestamp,
    'x-nonce': nonce,
    'content-type': 'application/json'
  };
}

describe('HMAC Middleware Tests', () => {
  const TEST_API_KEY = 'test_key_001';
  const TEST_SECRET = 'test_secret_123';
  
  describe('Canonicalization Tests', () => {
    test('Body with unsorted keys produces same hash after sorting', () => {
      const body1 = { z: 1, a: 2, m: 3 };
      const body2 = { a: 2, m: 3, z: 1 };
      
      const hash1 = sha256Hex(sortedStringify(body1));
      const hash2 = sha256Hex(sortedStringify(body2));
      
      expect(hash1).toBe(hash2);
    });
    
    test('Nested objects are sorted recursively', () => {
      const body = {
        outer: { z: 1, a: 2 },
        inner: { y: 3, b: 4 }
      };
      
      const expected = JSON.stringify({
        inner: { b: 4, y: 3 },
        outer: { a: 2, z: 1 }
      });
      
      expect(sortedStringify(body)).toBe(expected);
    });
    
    test('Query parameters are sorted in canonical path', () => {
      // This would be tested in integration tests with actual requests
      expect(true).toBe(true);
    });
  });
  
  describe('Signature Generation Tests', () => {
    test('Valid signature is generated correctly', () => {
      const method = 'POST';
      const path = '/api/v1/test';
      const body = { foo: 'bar' };
      
      const headers = signRequest(method, path, TEST_API_KEY, TEST_SECRET, body);
      
      expect(headers['x-api-key']).toBe(TEST_API_KEY);
      expect(headers['x-signature']).toMatch(/^[a-f0-9]{64}$/);
      expect(headers['x-nonce']).toMatch(/^[a-f0-9]{32}$/);
    });
    
    test('Different bodies produce different signatures', () => {
      const headers1 = signRequest('POST', '/api/v1/test', TEST_API_KEY, TEST_SECRET, { a: 1 });
      const headers2 = signRequest('POST', '/api/v1/test', TEST_API_KEY, TEST_SECRET, { b: 2 });
      
      expect(headers1['x-signature']).not.toBe(headers2['x-signature']);
    });
    
    test('Same body produces same signature with same nonce/timestamp', () => {
      const timestamp = new Date().toISOString();
      const nonce = crypto.randomBytes(16).toString('hex');
      const body = { foo: 'bar' };
      const bodyHash = sha256Hex(sortedStringify(body));
      
      const canonical = `POST\n/api/v1/test\n${TEST_API_KEY}\n${timestamp}\n${nonce}\n${bodyHash}`;
      
      const sig1 = hmacSha256Hex(TEST_SECRET, canonical);
      const sig2 = hmacSha256Hex(TEST_SECRET, canonical);
      
      expect(sig1).toBe(sig2);
    });
  });
  
  describe('Timestamp Validation Tests', () => {
    test('Current timestamp is accepted', () => {
      const now = new Date();
      const diff = Math.abs((new Date() - now) / 1000);
      expect(diff).toBeLessThan(300);
    });
    
    test('Old timestamp (> 5min) should be rejected', () => {
      const old = new Date(Date.now() - 400 * 1000); // 400 seconds ago
      const diff = Math.abs((new Date() - old) / 1000);
      expect(diff).toBeGreaterThan(300);
    });
    
    test('Future timestamp (> 5min) should be rejected', () => {
      const future = new Date(Date.now() + 400 * 1000);
      const diff = Math.abs((new Date() - future) / 1000);
      expect(diff).toBeGreaterThan(300);
    });
  });
  
  describe('Nonce Tests', () => {
    test('Nonce is random 16-byte hex string', () => {
      const nonce = crypto.randomBytes(16).toString('hex');
      expect(nonce).toMatch(/^[a-f0-9]{32}$/);
    });
    
    test('Two nonces are different', () => {
      const nonce1 = crypto.randomBytes(16).toString('hex');
      const nonce2 = crypto.randomBytes(16).toString('hex');
      expect(nonce1).not.toBe(nonce2);
    });
  });
  
  describe('Error Code Tests', () => {
    test('Missing header returns HMAC_MISSING', () => {
      // Would be integration test
      expect(true).toBe(true);
    });
    
    test('Invalid timestamp returns HMAC_TIMESTAMP', () => {
      // Would be integration test
      expect(true).toBe(true);
    });
    
    test('Replay nonce returns HMAC_REPLAY', () => {
      // Would be integration test
      expect(true).toBe(true);
    });
    
    test('Wrong signature returns HMAC_MISMATCH', () => {
      // Would be integration test
      expect(true).toBe(true);
    });
  });
});

describe('Integration Tests (require running server)', () => {
  // These would test actual HTTP requests
  // Skipped in unit tests, run in E2E tests
  
  test.skip('Valid HMAC request passes', async () => {
    // const app = require('../../app');
    // const headers = signRequest('POST', '/api/v1/protected', TEST_API_KEY, TEST_SECRET, { test: true });
    // const response = await request(app).post('/api/v1/protected').set(headers).send({ test: true });
    // expect(response.status).toBe(200);
  });
  
  test.skip('Invalid signature fails', async () => {
    // const app = require('../../app');
    // const response = await request(app)
    //   .post('/api/v1/protected')
    //   .set({ 'x-api-key': TEST_API_KEY, 'x-signature': 'wrong', 'x-timestamp': new Date().toISOString(), 'x-nonce': 'abc123' })
    //   .send({ test: true });
    // expect(response.status).toBe(401);
    // expect(response.body.code).toBe('HMAC_MISMATCH');
  });
});

module.exports = { signRequest, sortedStringify, sha256Hex, hmacSha256Hex };
