import { RetryConfig } from '../config';
import { logger } from './logger';

/**
 * Executes a function with retry logic and exponential backoff
 * @param fn Function to execute
 * @param config Retry configuration
 * @param errorHandler Optional callback for handling errors on each attempt
 * @returns Promise with the result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  errorHandler?: (error: Error, attempt: number) => void
): Promise<T> {
  let lastError: Error;
  let delay = config.initialDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (errorHandler) {
        errorHandler(lastError, attempt);
      }

      if (attempt === config.maxAttempts) {
        logger.error(`Failed after ${config.maxAttempts} attempts: ${lastError.message}`);
        throw lastError;
      }

      logger.warn(`Attempt ${attempt}/${config.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`);

      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Sleep for a specified duration
 * @param ms Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get a random delay between min and max
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for a random duration between min and max
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 */
export async function randomSleep(min: number, max: number): Promise<void> {
  const delay = randomDelay(min, max);
  await sleep(delay);
}
