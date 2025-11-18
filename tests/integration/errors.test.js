const request = require('supertest');
const app = require('../../app');

describe('Error Handling', () => {
  const apiKey = process.env.INTERNAL_API_KEY;
  
  describe('404 Errors', () => {
    test('should return 404 for non-existent route with valid auth', async () => {
      const res = await request(app)
        .get('/api/v1/non-existent')
        .set('x-api-key', apiKey)
        .set('Authorization', 'Bearer mock-token');
      
      expect(res.status).toBe(404);
    });
    
    test('should return auth error for non-existent nested route', async () => {
      const res = await request(app)
        .get('/api/v1/non/existent/route');
      
      expect([401, 404]).toContain(res.status);
    });
  });
  
  describe('Method Not Allowed', () => {
    test('should handle unsupported HTTP methods', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/signin')
        .set('x-api-key', apiKey);
      
      expect([404, 405]).toContain(res.status);
    });
  });
});
