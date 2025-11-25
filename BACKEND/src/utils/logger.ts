import * as winston from 'winston';

/**
 * Configuração do logger usando winston
 */
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'medforum-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        }),
      ),
    }),
  ],
});

// Adicionar transporte de arquivo no ambiente de produção
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  );
}

// Adicionar função para log de requisições HTTP
export const logRequest = (req: any, next: any): void => {
  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.userId || 'anonymous',
  });
  next();
};

// Adicionar função para log de erros
export const logError = (message: string, error?: unknown): void => {
  if (error instanceof Error) {
    logger.error(`${message}: ${error.message}`, {
      error,
      stack: error.stack,
    });
  } else {
    logger.error(`${message}: ${error ?? 'Erro desconhecido'}`, {
      error,
    });
  }
};

// Exportar logger como default também
export default logger;
