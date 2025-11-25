/**
 * Configurações do ambiente
 */
export const env = {
  // Ambiente de execução
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Configuração do servidor
  PORT: parseInt(process.env.PORT || '5000', 10),
  API_URL: process.env.API_URL || 'http://localhost:5000',

  

  // Supabase configuration
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',

  // Configuração de monitoramento
  MONITORING_ENABLED: process.env.MONITORING_ENABLED === 'true',
  HEALTH_CHECK_INTERVAL: parseInt(
    process.env.HEALTH_CHECK_INTERVAL || '60000',
    10,
  ), // 1 minuto
  ALERT_THRESHOLD_CPU: parseInt(process.env.ALERT_THRESHOLD_CPU || '80', 10), // 80%
  ALERT_THRESHOLD_MEMORY: parseInt(
    process.env.ALERT_THRESHOLD_MEMORY || '85',
    10,
  ), // 85%
  ALERT_EMAIL: process.env.ALERT_EMAIL || '',
  METRICS_PORT: parseInt(process.env.METRICS_PORT || '9090', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Limites e configurações de cache
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutos
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),

  // Configurações de segurança
  JWT_SECRET: process.env.JWT_SECRET || 'medforum-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'medforum-refresh-secret-key',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  MFA_ISSUER: process.env.MFA_ISSUER || 'MedPulse Academy',

  // Integração com serviços externos
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',

  // URLs do frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  PASSWORD_RESET_URL:
    process.env.PASSWORD_RESET_URL || 'http://localhost:5173/reset-password',
  EMAIL_VERIFICATION_URL:
    process.env.EMAIL_VERIFICATION_URL || 'http://localhost:5173/verify-email',

  // =========================
  // PULSE AI - GOOGLE GENERATIVE AI
  // =========================
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || '',
  PULSE_AI_MODEL: process.env.PULSE_AI_MODEL || 'gemini-1.5-flash',
  PULSE_AI_TEMPERATURE: parseFloat(process.env.PULSE_AI_TEMPERATURE || '0.3'),
  PULSE_AI_MAX_TOKENS: parseInt(process.env.PULSE_AI_MAX_TOKENS || '8192', 10),
  PULSE_AI_ENABLE_LOGGING: process.env.PULSE_AI_ENABLE_LOGGING === 'true',
  PULSE_AI_LOG_LEVEL: process.env.PULSE_AI_LOG_LEVEL || 'info',

  // Função para verificar ambiente de produção
  isProd(): boolean {
    return this.NODE_ENV === 'production';
  },
};
