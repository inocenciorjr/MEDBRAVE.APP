import winston from 'winston';

// Mock do Winston
const mockAdd = jest.fn();
const mockError = jest.fn();
const mockWarn = jest.fn();
const mockInfo = jest.fn();
const mockDebug = jest.fn();

// Mock do Winston
jest.mock('winston', () => {
  return {
    format: {
      timestamp: jest.fn().mockReturnValue('timestamp'),
      combine: jest.fn().mockReturnValue('combine'),
      colorize: jest.fn().mockReturnValue('colorize'),
      printf: jest.fn().mockReturnValue('printf'),
      splat: jest.fn().mockReturnValue('splat'),
      json: jest.fn().mockReturnValue('json'),
      errors: jest.fn().mockReturnValue('errors'),
    },
    createLogger: jest.fn().mockReturnValue({
      error: mockError,
      warn: mockWarn,
      info: mockInfo,
      debug: mockDebug,
      add: mockAdd,
    }),
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  };
});

// Mock do módulo env
jest.mock('../../config/env', () => ({
  env: {
    LOG_LEVEL: 'info',
    isDev: jest.fn().mockReturnValue(true),
    isTest: jest.fn().mockReturnValue(false),
  },
}));

// Import depois dos mocks para garantir que os mocks sejam aplicados
// eslint-disable-next-line import/first
import { logError, logRequest } from '../../utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Logger Configuration', () => {
    it('should initialize with correct configuration', () => {
      // Verifica se o createLogger foi chamado
      expect(winston.createLogger).toHaveBeenCalled();

      // Verifica os formatos usados
      expect(winston.format.timestamp).toHaveBeenCalled();
      expect(winston.format.combine).toHaveBeenCalled();
      expect(winston.format.errors).toHaveBeenCalled();
      expect(winston.format.splat).toHaveBeenCalled();
      expect(winston.format.json).toHaveBeenCalled();

      // Verifica as configurações do transporte de arquivo
      expect(winston.transports.File).toHaveBeenCalledTimes(2);

      // Verifica se adicionou o console transport em ambiente de desenvolvimento
      expect(winston.transports.Console).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalled();
    });
  });

  describe('Logging Functions', () => {
    it('should log error messages with error details', () => {
      const errorMessage = 'Test error message';
      const error = new Error('Error details');

      logError(errorMessage, error);

      expect(mockError).toHaveBeenCalledWith(errorMessage, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    });

    it('should handle non-Error objects in logError', () => {
      const errorMessage = 'Test error message';
      const nonErrorObj = { foo: 'bar' };

      logError(errorMessage, nonErrorObj);

      expect(mockError).toHaveBeenCalledWith(errorMessage, {
        error: {
          unknownError: nonErrorObj,
        },
      });
    });

    it('should log HTTP requests based on status code', () => {
      // Mock request
      const req = {
        method: 'GET',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
      };

      // Mock next middleware
      const next = jest.fn();

      // Teste para status 200 (success)
      const res200 = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
      };

      logRequest(req, next);

      // Verifica se o evento 'finish' é registrado
      expect(res200.on).toHaveBeenCalledWith('finish', expect.any(Function));

      // Verifica se next foi chamado
      expect(next).toHaveBeenCalled();

      // Verifica se info foi chamado para status 200
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/test 200'),
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          status: 200,
        }),
      );
    });
  });
});
