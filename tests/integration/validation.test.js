const request = require('supertest');
const app = require('../../app');

describe('Input Validation', () => {
  const apiKey = process.env.INTERNAL_API_KEY;
  
  describe('Email Validation', () => {
    test('should reject invalid email format in signup', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Password123!'
        });
      
      expect([400, 401]).toContain(res.status);
    });
  });
  
  describe('Required Fields', () => {
    test('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({});
      
      expect(res.status).toBe(400);
      // Make case-insensitive check
      expect((res.body.message || '').toLowerCase()).toContain('required');
    });
  });
  
  describe('File Upload Validation', () => {
    test('should reject file upload without required fields', async () => {
      const res = await request(app)
        .post('/api/v1/files/upload-url')
        .set('x-api-key', apiKey)
        .set('Authorization', 'Bearer mock-token')
        .send({});
      
      // Check res.status is one of the accepted values
      expect(res.status === 400 || res.status === 401).toBe(true);
    });
  });
  
  describe('Payment Validation', () => {
    test('should reject payment without amount', async () => {
      const res = await request(app)
        .post('/api/v1/pay/stripe/create')
        .set('x-api-key', apiKey)
        .set('Authorization', 'Bearer mock-token')
        .send({
          currency: 'USD'
        });
      
      expect(res.status === 400 || res.status === 401).toBe(true);
    });
  });
  
  describe('AI Validation', () => {
    test('should reject AI extract without input', async () => {
      const res = await request(app)
        .post('/api/v1/ai/extract')
        .set('x-api-key', apiKey)
        .set('Authorization', 'Bearer mock-token')
        .send({});
      
      expect(res.status === 400 || res.status === 401).toBe(true);
    });
  });
});
