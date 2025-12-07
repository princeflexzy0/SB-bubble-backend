const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

/**
 * Safe Supabase Wrapper
 * Prevents SQL injection and unsafe RPC calls
 */
class SafeSupabase {
  constructor() {
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Safe SELECT query with parameterization
   */
  async safeSelect(table, filters = {}, options = {}) {
    try {
      // Validate table name (alphanumeric + underscore only)
      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        throw new Error('Invalid table name');
      }

      let query = this.client.from(table).select(options.select || '*');

      // Apply filters safely
      for (const [key, value] of Object.entries(filters)) {
        // Validate column name
        if (!/^[a-zA-Z0-9_]+$/.test(key)) {
          throw new Error(`Invalid column name: ${key}`);
        }
        query = query.eq(key, value);
      }

      // Apply options
      if (options.limit) query = query.limit(options.limit);
      if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending });

      const { data, error } = await query;
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      // console.error('Safe select error:', error);
      return { data: null, error };
    }
  }

  /**
   * Safe INSERT with validation
   */
  async safeInsert(table, data) {
    try {
      // Validate table name
      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        throw new Error('Invalid table name');
      }

      // Sanitize data object (remove any SQL injection attempts)
      const sanitizedData = this.sanitizeData(data);

      const { data: insertedData, error } = await this.client
        .from(table)
        .insert(sanitizedData)
        .select();

      if (error) throw error;
      return { data: insertedData, error: null };
    } catch (error) {
      // console.error('Safe insert error:', error);
      return { data: null, error };
    }
  }

  /**
   * Safe UPDATE with validation
   */
  async safeUpdate(table, id, data) {
    try {
      // Validate table name
      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        throw new Error('Invalid table name');
      }

      const sanitizedData = this.sanitizeData(data);

      const { data: updatedData, error } = await this.client
        .from(table)
        .update(sanitizedData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return { data: updatedData, error: null };
    } catch (error) {
      // console.error('Safe update error:', error);
      return { data: null, error };
    }
  }

  /**
   * Safe RPC call with whitelist
   */
  async safeRpc(functionName, params = {}) {
    try {
      // Whitelist of allowed RPC functions
      const allowedFunctions = [
        'get_user_stats',
        'calculate_totals',
        'process_payment',
        // Add your safe RPC functions here
      ];

      if (!allowedFunctions.includes(functionName)) {
        throw new Error(`RPC function '${functionName}' not in whitelist`);
      }

      const { data, error } = await this.client.rpc(functionName, params);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      // console.error('Safe RPC error:', error);
      return { data: null, error };
    }
  }

  /**
   * Sanitize data to prevent SQL injection
   */
  sanitizeData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Validate key name
      if (!/^[a-zA-Z0-9_]+$/.test(key)) {
        console.warn(`Skipping invalid key: ${key}`);
        continue;
      }

      // Sanitize value
      if (typeof value === 'string') {
        // Remove potential SQL injection patterns
        sanitized[key] = value
          .replace(/;\s*--/g, '') // Remove SQL comments
          .replace(/'\s*OR\s*'1'\s*=\s*'1/gi, '') // Remove OR 1=1
          .replace(/UNION\s+SELECT/gi, '') // Remove UNION
          .replace(/DROP\s+TABLE/gi, '') // Remove DROP
          .replace(/DELETE\s+FROM/gi, ''); // Remove DELETE
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Raw query (RESTRICTED - logs warning)
   */
  // eslint-disable-next-line no-unused-vars
  async rawQuery(sql, params = []) {
    // console.error('⚠️  WARNING: Raw SQL query attempted!');
    // console.error('⚠️  SQL:', sql);
    // console.error('⚠️  Use safe methods instead!');
    
    throw new Error('Raw SQL queries are disabled. Use safe methods instead.');
  }
}

// Export singleton instance
module.exports = new SafeSupabase();
