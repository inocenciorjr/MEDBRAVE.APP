/**
 * AppError - Classe de erro personalizada para erros de aplicação
 *
 * Usada para erros que devem ser capturados pelo middleware de erro
 * e retornados para o cliente com o código HTTP adequado.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
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
}

/**
 * ErrorCodes - Enumerador com códigos de erro padronizados
 *
 * Facilita a identificação e tratamento de erros específicos
 */
export enum ErrorCodes {
  // Erros de autenticação (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_INVALID = 'MFA_INVALID',

  // Erros de autorização (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',

  // Erros de validação (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELDS = 'MISSING_FIELDS',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Erros de recursos (404)
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Erros de conflito (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  USER_EXISTS = 'USER_EXISTS',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',

  // Erros de servidor (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Erros de limite e throttling (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Erros de pagamento (402)
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',

  // Erros de conteúdo (422)
  UNPROCESSABLE_CONTENT = 'UNPROCESSABLE_CONTENT',
  INVALID_MEDIA_TYPE = 'INVALID_MEDIA_TYPE',
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',

  // Erros de tempo (408)
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',

  // Erros de monitoramento
  MONITORING_ERROR = 'MONITORING_ERROR',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  METRIC_COLLECTION_FAILED = 'METRIC_COLLECTION_FAILED',
  ALERT_TRIGGER = 'ALERT_TRIGGER',
  SERVICE_DEGRADATION = 'SERVICE_DEGRADATION',
}

/**
 * ErrorMessages - Mensagens de erro padrão
 *
 * Padroniza as mensagens de erro para melhor experiência do usuário
 */
export const ErrorMessages: Record<string, string> = {
  // Autenticação
  [ErrorCodes.UNAUTHORIZED]: 'Não autorizado. Faça login para continuar.',
  [ErrorCodes.INVALID_CREDENTIALS]:
    'Credenciais inválidas. Verifique e tente novamente.',
  [ErrorCodes.EXPIRED_TOKEN]: 'Sessão expirada. Faça login novamente.',
  [ErrorCodes.MFA_REQUIRED]: 'Autenticação de dois fatores necessária.',
  [ErrorCodes.MFA_INVALID]: 'Código de autenticação inválido. Tente novamente.',

  // Autorização
  [ErrorCodes.FORBIDDEN]:
    'Acesso negado. Você não tem permissão para acessar este recurso.',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]:
    'Permissões insuficientes para realizar esta ação.',
  [ErrorCodes.SUBSCRIPTION_REQUIRED]:
    'Esta funcionalidade requer uma assinatura ativa.',

  // Validação
  [ErrorCodes.VALIDATION_ERROR]:
    'Erro de validação. Verifique os dados enviados.',
  [ErrorCodes.INVALID_INPUT]:
    'Entrada inválida. Verifique os dados e tente novamente.',
  [ErrorCodes.MISSING_FIELDS]: 'Campos obrigatórios não preenchidos.',
  [ErrorCodes.INVALID_FORMAT]: 'Formato inválido. Verifique a documentação.',

  // Recursos
  [ErrorCodes.NOT_FOUND]: 'Recurso não encontrado.',
  [ErrorCodes.USER_NOT_FOUND]: 'Usuário não encontrado.',
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'O recurso solicitado não existe.',

  // Conflito
  [ErrorCodes.CONFLICT]: 'Conflito. A operação não pode ser concluída.',
  [ErrorCodes.DUPLICATE_ENTRY]: 'Entrada duplicada. Este recurso já existe.',
  [ErrorCodes.USER_EXISTS]: 'Este e-mail já está cadastrado.',
  [ErrorCodes.CONCURRENT_MODIFICATION]:
    'O recurso foi modificado por outra operação. Tente novamente.',

  // Servidor
  [ErrorCodes.INTERNAL_SERVER_ERROR]:
    'Erro interno do servidor. Tente novamente mais tarde.',
  [ErrorCodes.DATABASE_ERROR]:
    'Erro de banco de dados. Tente novamente mais tarde.',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]:
    'Erro em serviço externo. Tente novamente mais tarde.',


  // Limite e throttling
  [ErrorCodes.RATE_LIMIT_EXCEEDED]:
    'Limite de requisições excedido. Tente novamente mais tarde.',
  [ErrorCodes.QUOTA_EXCEEDED]: 'Quota de uso excedida. Contate o suporte.',

  // Pagamento
  [ErrorCodes.PAYMENT_REQUIRED]:
    'Pagamento necessário para acessar este recurso.',
  [ErrorCodes.PAYMENT_FAILED]:
    'Falha no processamento do pagamento. Verifique seus dados.',
  [ErrorCodes.SUBSCRIPTION_EXPIRED]:
    'Sua assinatura expirou. Renove para continuar.',

  // Conteúdo
  [ErrorCodes.UNPROCESSABLE_CONTENT]:
    'Não foi possível processar o conteúdo enviado.',
  [ErrorCodes.INVALID_MEDIA_TYPE]: 'Tipo de mídia não suportado.',
  [ErrorCodes.CONTENT_TOO_LARGE]: 'Conteúdo muito grande. Limite excedido.',

  // Tempo
  [ErrorCodes.REQUEST_TIMEOUT]: 'A requisição excedeu o tempo limite.',
  [ErrorCodes.OPERATION_TIMEOUT]: 'A operação excedeu o tempo limite.',

  // Monitoramento
  [ErrorCodes.MONITORING_ERROR]: 'Erro no sistema de monitoramento.',
  [ErrorCodes.HEALTH_CHECK_FAILED]: 'Verificação de saúde falhou.',
  [ErrorCodes.METRIC_COLLECTION_FAILED]: 'Falha na coleta de métricas.',
  [ErrorCodes.ALERT_TRIGGER]: 'Alerta disparado pelo sistema de monitoramento.',
  [ErrorCodes.SERVICE_DEGRADATION]:
    'Serviço apresentando degradação de performance.',
};

/**
 * Mapeamento de códigos de erro para status HTTP
 */
export const ErrorStatusCodes: Record<string, number> = {
  // Autenticação
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  EXPIRED_TOKEN: 401,
  MFA_REQUIRED: 401,
  MFA_INVALID: 401,

  // Autorização
  FORBIDDEN: 403,
  INSUFFICIENT_PERMISSIONS: 403,
  SUBSCRIPTION_REQUIRED: 403,

  // Validação
  VALIDATION_ERROR: 400,
  INVALID_INPUT: 400,
  MISSING_FIELDS: 400,
  INVALID_FORMAT: 400,

  // Recursos
  NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  RESOURCE_NOT_FOUND: 404,

  // Conflito
  CONFLICT: 409,
  DUPLICATE_ENTRY: 409,
  USER_EXISTS: 409,
  CONCURRENT_MODIFICATION: 409,

  // Servidor
  INTERNAL_SERVER_ERROR: 500,
  DATABASE_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502,

  // Limite e throttling
  RATE_LIMIT_EXCEEDED: 429,
  QUOTA_EXCEEDED: 429,

  // Pagamento
  PAYMENT_REQUIRED: 402,
  PAYMENT_FAILED: 402,
  SUBSCRIPTION_EXPIRED: 402,

  // Conteúdo
  UNPROCESSABLE_CONTENT: 422,
  INVALID_MEDIA_TYPE: 415,
  CONTENT_TOO_LARGE: 413,

  // Tempo
  REQUEST_TIMEOUT: 408,
  OPERATION_TIMEOUT: 408,

  // Monitoramento (erros internos)
  MONITORING_ERROR: 500,
  HEALTH_CHECK_FAILED: 500,
  METRIC_COLLECTION_FAILED: 500,
  ALERT_TRIGGER: 500,
  SERVICE_DEGRADATION: 503,
};

/**
 * Factory de erros - Cria instâncias de AppError com códigos e mensagens padronizadas
 */
export const createError = (
  code: ErrorCodes,
  customMessage?: string,
  context?: Record<string, unknown>,
): AppError => {
  // Obtém o status code do mapeamento ou usa 500 como padrão
  const statusCode = ErrorStatusCodes[code] || 500;

  // Usa a mensagem personalizada ou a mensagem padrão do código
  const message =
    customMessage || ErrorMessages[code] || 'Erro não especificado';

  return new AppError(statusCode, message, code, true, context);
};
