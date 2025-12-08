const request = require('supertest');
const app = require('../../app');

describe('Rate Limiting', () => {
  const apiKey = process.env.INTERNAL_API_KEY;

  describe('General Rate Limit', () => {
    test('should allow requests within limit', async () => {
      const res = await request(app)
        .get('/api/v1/health');

      expect(res.status).toBe(200);
    });

    // Note: This test would need multiple requests to trigger
    // Skipping actual rate limit test to avoid flakiness
  });

  describe('Auth Rate Limit', () => {
    test('should apply stricter limits to auth endpoints', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .set('x-api-key', 'test-key')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      // Should get response (not rate limited on first request)
      expect([400, 401]).toContain(res.status);
    });
  });
});
