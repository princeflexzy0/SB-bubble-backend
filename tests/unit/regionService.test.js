// Mock ALL dependencies before requiring the service
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          is: jest.fn(() => Promise.resolve({ 
            data: [{ supported_features: ['11111111-1111-1111-1111-111111111111'] }], 
            error: null 
          })),
          or: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [
                { supported_features: ['11111111-1111-1111-1111-111111111111'] },
                { supported_features: ['77777777-7777-7777-7777-777777777777'] }
              ],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

jest.mock('../../config/redis', () => ({
  get: jest.fn(() => Promise.resolve(null)),
  setex: jest.fn(() => Promise.resolve('OK')),
  del: jest.fn(() => Promise.resolve(1))
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

// NOW require the service after mocks are set up
const regionService = require('../../services/region.service');

describe('Region Service', () => {
  describe('getSupportedFeatures', () => {
    test('should return array of features', async () => {
      const features = await regionService.getSupportedFeatures('AU');
      expect(Array.isArray(features)).toBe(true);
    });
  });

  describe('isFeatureAvailable', () => {
    test('should return boolean', async () => {
      const available = await regionService.isFeatureAvailable(
        '11111111-1111-1111-1111-111111111111',
        'AU'
      );
      expect(typeof available).toBe('boolean');
    });
  });

  describe('filterItemsByRegion', () => {
    test('should return filtered array', async () => {
      const items = [
        { internal_feature_id: '11111111-1111-1111-1111-111111111111' }
      ];
      const filtered = await regionService.filterItemsByRegion(items, 'AU');
      expect(Array.isArray(filtered)).toBe(true);
    });
  });

  describe('buildRegionFilter', () => {
    test('should return filter object', () => {
      const filter = regionService.buildRegionFilter('AU');
      expect(filter).toHaveProperty('sql');
      expect(filter).toHaveProperty('params');
    });
  });
});
