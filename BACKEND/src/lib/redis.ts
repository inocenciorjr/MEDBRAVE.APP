import Redis from 'ioredis';

// Redis connection - use REDIS_URL if available (for Render, Railway, etc)
const redisUrl = process.env.REDIS_URL;

const baseConfig = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: false,
};

const queueConfig = {
  ...baseConfig,
  maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
};

// Create Redis client for general use
export const redis = redisUrl 
  ? new Redis(redisUrl, baseConfig)
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      ...baseConfig,
    });

// Create Redis client for BullMQ (separate connection with null maxRetriesPerRequest)
export const redisForQueue = redisUrl
  ? new Redis(redisUrl, queueConfig)
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      ...queueConfig,
    });

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('ready', () => {
  console.log('✅ Redis ready');
});

redisForQueue.on('connect', () => {
  console.log('✅ Redis (Queue) connected');
});

redisForQueue.on('error', (error) => {
  console.error('❌ Redis (Queue) connection error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing Redis connections...');
  await redis.quit();
  await redisForQueue.quit();
});

export default redis;
