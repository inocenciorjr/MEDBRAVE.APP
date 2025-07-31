/**
 * AppError - Classe de erro personalizada para erros de aplicação
 *
 * Usada para erros que devem ser capturados pelo middleware de erro
 * e retornados para o cliente com o código HTTP adequado.
 */
export default class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational = true,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code || this.constructor.name;
    this.name = this.constructor.name;
    this.context = context;

    // Captura a stack trace para debugar melhor
    Error.captureStackTrace(this, this.constructor);
  }

  // Método para serializar o erro
  toJSON() {
    return {
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      isOperational: this.isOperational,
      context: this.context,
    };
  }

  // Método estático para criar erros de validação (400)
  static badRequest(message: string, code?: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, 400, code || 'BAD_REQUEST', true, context);
  }

  // Método estático para criar erros de autenticação (401)
  static unauthorized(message: string, code?: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, 401, code || 'UNAUTHORIZED', true, context);
  }

  // Método estático para criar erros de permissão (403)
  static forbidden(message: string, code?: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, 403, code || 'FORBIDDEN', true, context);
  }

  // Método estático para criar erros de recurso não encontrado (404)
  static notFound(message: string, code?: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, 404, code || 'NOT_FOUND', true, context);
  }

  // Método estático para criar erros de conflito (409)
  static conflict(message: string, code?: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, 409, code || 'CONFLICT', true, context);
  }

  // Método estático para criar erros internos (500)
  static internal(message: string, code?: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, 500, code || 'INTERNAL_SERVER_ERROR', true, context);
  }
}
