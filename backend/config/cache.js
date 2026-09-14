/**
 * Velora Cache Manager
 * Provides unified in-memory and Redis caching with automatic fallback.
 * If Redis is unavailable, it gracefully defaults to an in-memory TTL map.
 */

let redisClient = null;
let isRedisConnected = false;

// Attempt to load ioredis if installed
try {
  const Redis = require('ioredis');
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;

  const client = redisUrl
    ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 })
    : new Redis({
        host: redisHost,
        port: redisPort,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });

  client.connect().then(() => {
    isRedisConnected = true;
    redisClient = client;
    console.log('[Cache] Connected to Redis service successfully.');
  }).catch(() => {
    isRedisConnected = false;
  });

  client.on('error', () => {
    isRedisConnected = false;
  });

  client.on('connect', () => {
    isRedisConnected = true;
  });
} catch {
  isRedisConnected = false;
}

// In-Memory TTL Cache Store
class MemoryCache {
  constructor() {
    this.store = new Map();
    // Sweep expired items every 60s
    setInterval(() => this.sweep(), 60000).unref();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expires && Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 300) {
    const expires = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expires });
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  flush() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }

  sweep() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expires && now > item.expires) {
        this.store.delete(key);
      }
    }
  }
}

const memoryStore = new MemoryCache();

const cache = {
  /**
   * Retrieve cached item
   * @param {string} key
   * @returns {Promise<any>}
   */
  async get(key) {
    if (isRedisConnected && redisClient) {
      try {
        const raw = await redisClient.get(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return memoryStore.get(key);
      }
    }
    return memoryStore.get(key);
  },

  /**
   * Set cached item with TTL in seconds (default: 300s = 5m)
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   */
  async set(key, value, ttlSeconds = 300) {
    memoryStore.set(key, value, ttlSeconds);

    if (isRedisConnected && redisClient) {
      try {
        const payload = JSON.stringify(value);
        if (ttlSeconds > 0) {
          await redisClient.set(key, payload, 'EX', ttlSeconds);
        } else {
          await redisClient.set(key, payload);
        }
      } catch {
        // Fallback already saved in memoryStore
      }
    }
  },

  /**
   * Delete a key from cache
   * @param {string} key
   */
  async del(key) {
    memoryStore.del(key);
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.del(key);
      } catch {
        // ignore
      }
    }
  },

  /**
   * Delete keys matching a wildcard pattern (e.g. 'convo:*')
   * @param {string} pattern
   */
  async delPattern(pattern) {
    memoryStore.delPattern(pattern);
    if (isRedisConnected && redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys && keys.length > 0) {
          await redisClient.del(...keys);
        }
      } catch {
        // ignore
      }
    }
  },

  /**
   * Clear all cache entries
   */
  async flush() {
    memoryStore.flush();
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.flushdb();
      } catch {
        // ignore
      }
    }
  },

  /**
   * Health & diagnostics status
   */
  getStatus() {
    return {
      provider: isRedisConnected ? 'Redis' : 'In-Memory Cache (TTL)',
      connected: isRedisConnected,
      keysInMemory: memoryStore.size(),
    };
  },
};

module.exports = cache;
