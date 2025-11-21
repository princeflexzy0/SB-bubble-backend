const { supabase } = require('../config/supabase');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Region Filtering Service
 * Handles feature availability based on tenant regions
 */
class RegionService {
  /**
   * Get supported features for a region
   * Uses Redis cache with 5-minute TTL
   */
  async getSupportedFeatures(countryCode, regionCode = null) {
    try {
      // Build cache key
      const cacheKey = regionCode 
        ? `region:features:${countryCode}:${regionCode}`
        : `region:features:${countryCode}`;

      // Try Redis cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Region features from cache', { cacheKey });
        return JSON.parse(cached);
      }

      // Query Supabase
      const query = supabase
        .from('tenant_regions')
        .select('supported_features')
        .eq('country_code', countryCode)
        .eq('is_active', true);

      if (regionCode) {
        // Check for region-specific first, then country-wide
        const { data, error } = await supabase
          .from('tenant_regions')
          .select('supported_features')
          .eq('country_code', countryCode)
          .eq('is_active', true)
          .or(`region_code.eq.${regionCode},region_code.is.null`)
          .order('region_code', { ascending: false }); // region-specific first

        if (error) throw error;

        // Merge features (region-specific overrides country-wide)
        const features = new Set();
        data.forEach(row => {
          row.supported_features.forEach(f => features.add(f));
        });

        const featureArray = Array.from(features);
        
        // Cache for 5 minutes
        await redis.setex(cacheKey, 300, JSON.stringify(featureArray));
        
        logger.info('Region features loaded', { 
          countryCode, 
          regionCode, 
          count: featureArray.length 
        });
        
        return featureArray;
      } else {
        // Country-wide only
        const { data, error } = await query.is('region_code', null);
        
        if (error) throw error;

        const features = data.length > 0 ? data[0].supported_features : [];
        
        // Cache for 5 minutes
        await redis.setex(cacheKey, 300, JSON.stringify(features));
        
        return features;
      }
    } catch (error) {
      logger.error('Failed to get supported features', { 
        countryCode, 
        regionCode, 
        error 
      });
      
      // Return empty array on error (fail-open strategy)
      return [];
    }
  }

  /**
   * Build SQL WHERE clause for region filtering
   * Use this in all list/catalog endpoints
   */
  buildRegionFilter(countryCode, regionCode = null) {
    const params = { countryCode };
    
    let sql = `
      EXISTS (
        SELECT 1 FROM tenant_regions tr
        WHERE tr.country_code = $countryCode
          AND tr.is_active = true
    `;

    if (regionCode) {
      sql += ` AND (tr.region_code IS NULL OR tr.region_code = $regionCode)`;
      params.regionCode = regionCode;
    } else {
      sql += ` AND tr.region_code IS NULL`;
    }

    sql += ` AND items.internal_feature_id = ANY(tr.supported_features)
      )
    `;

    return { sql, params };
  }

  /**
   * Filter items array by region (in-memory filtering)
   */
  async filterItemsByRegion(items, countryCode, regionCode = null) {
    const supportedFeatures = await this.getSupportedFeatures(countryCode, regionCode);
    
    if (supportedFeatures.length === 0) {
      return items; // No restrictions
    }

    return items.filter(item => {
      return supportedFeatures.includes(item.internal_feature_id);
    });
  }

  /**
   * Check if a specific feature is available in region
   */
  async isFeatureAvailable(featureId, countryCode, regionCode = null) {
    const supportedFeatures = await this.getSupportedFeatures(countryCode, regionCode);
    return supportedFeatures.includes(featureId);
  }

  /**
   * Clear region cache
   */
  async clearRegionCache(countryCode, regionCode = null) {
    const cacheKey = regionCode 
      ? `region:features:${countryCode}:${regionCode}`
      : `region:features:${countryCode}`;
    
    await redis.del(cacheKey);
    logger.info('Region cache cleared', { cacheKey });
  }
}

module.exports = new RegionService();
