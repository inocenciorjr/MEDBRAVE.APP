import winston from 'winston';
import path from 'path';
import { SCRAPER_CONFIG } from '../config';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(SCRAPER_CONFIG.output.logsDir, 'error.log'),
      level: 'error',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      ),
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(SCRAPER_CONFIG.output.logsDir, 'combined.log'),
      format: combine(
        timestamp(),
        json()
      ),
    }),
  ],
});

// Helper functions for common log patterns
export const logProgress = (current: number, total: number, message: string) => {
  logger.info(`${message} (${current}/${total})`);
};

export const logError = (error: Error, context?: string) => {
  logger.error({
    message: context || error.message,
    error: error.message,
    stack: error.stack,
  });
};

export const logDebug = (message: string, data?: any) => {
  logger.debug(message, data);
};

export const logWarning = (message: string, data?: any) => {
  logger.warn(message, data);
};

export const logSuccess = (message: string, data?: any) => {
  logger.info(`✓ ${message}`, data);
};
