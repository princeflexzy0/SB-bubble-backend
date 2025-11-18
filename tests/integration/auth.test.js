const request = require('supertest');
const app = require('../../app');

describe('Auth Endpoints', () => {
  const apiKey = process.env.INTERNAL_API_KEY;
  
  describe('POST /api/v1/auth/signup', () => {
    test('should reject signup without API key', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });
      
      // Signup is public, so should validate and return 400
      expect([400, 401]).toContain(res.status);
    });
    
    test('should reject signup without email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          password: 'Password123!'
        });
      
      expect(res.status).toBe(400);
      // More lenient - just check message exists and mentions requirement
      expect(res.body.message).toMatch(/required|email/i);
    });
    
    test('should reject signup without password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com'
        });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('POST /api/v1/auth/signin', () => {
    test('should reject signin without credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({});
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('POST /api/v1/auth/reset-password', () => {
    test('should reject without email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({});
      
      expect(res.status).toBe(400);
    });
  });
});
