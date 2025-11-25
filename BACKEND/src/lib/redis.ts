import Redis from 'ioredis';

// Redis connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: false,
};

// Redis configuration for BullMQ (requires maxRetriesPerRequest: null)
const REDIS_QUEUE_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: false,
};

// Create Redis client for general use
export const redis = new Redis(REDIS_CONFIG);

// Create Redis client for BullMQ (separate connection with null maxRetriesPerRequest)
export const redisForQueue = new Redis(REDIS_QUEUE_CONFIG);

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
