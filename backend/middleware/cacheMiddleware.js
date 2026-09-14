/**
 * Velora Cache Middleware for Express
 * Caches GET responses automatically to reduce database load and achieve < 5ms response times.
 */

const cache = require('../config/cache');

/**
 * Generate a cache middleware with configurable TTL (default 120s)
 * @param {number} ttlSeconds
 * @param {Function} [keyGenerator] - Custom key generator: (req) => string
 */
function cacheResponse(ttlSeconds = 120, keyGenerator) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const userId = req.user ? req.user.id : 'anon';
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `http:${userId}:${req.originalUrl || req.url}`;

    try {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Provider', cache.getStatus().provider);
        return res.status(200).json(cachedData);
      }

      // Cache MISS: Intercept res.json to capture and store response
      res.setHeader('X-Cache', 'MISS');
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Only cache successful 200 responses
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success) {
          cache.set(cacheKey, body, ttlSeconds).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch {
      next();
    }
  };
}

module.exports = { cacheResponse };
