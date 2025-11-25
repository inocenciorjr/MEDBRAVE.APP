// Configuração do PULSE AI
export interface PulseConfiguration {
  apiKey: string;
  defaultModel?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// Dados do paciente para análise médica
export interface PatientData {
  age?: number;
  gender?: 'M' | 'F' | 'NB' | 'Não informado';
  symptoms?: string[];
  history?: string[];
  urgency?: 'baixa' | 'média' | 'alta' | 'emergência';
  allergies?: string[];
  medications?: string[];
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };
}

// Caso médico para análise
export interface MedicalCase {
  question: string;
  category?: string;
  specialties?: string[];
  patient?: PatientData;
  context?: string;
  attachments?: {
    type: 'image' | 'document' | 'lab_result';
    url: string;
    description?: string;
  }[];
}

// Uso de tokens
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

// Resposta base do PULSE AI
export interface PulseResponse {
  success: boolean;
  content?: string;
  error?: string;
  responseTime: number;
  tokensUsed?: TokenUsage;
  sessionId: string;
  timestamp: string;
  model?: string;
}

// Resposta de diagnóstico médico
export interface PulseDiagnosis extends PulseResponse {
  confidence?: number;
  diagnosis?: {
    differentials: Array<{
      condition: string;
      probability: number;
      reasoning: string;
      icd10?: string;
      specialty?: string;
    }>;
    recommendedTests: string[];
    urgencyLevel: 'baixa' | 'média' | 'alta' | 'emergência';
    specialty: string;
    redFlags: string[];
    disclaimer: string;
    clinicalPearls: string[];
    educationalNote: string;
    followUpRecommendations?: string[];
    prognosis?: string;
  };
}

// Resposta educacional
export interface PulseEducation extends PulseResponse {
  education?: {
    summary: string;
    keyPoints: string[];
    guidelines: string[];
    references: string[];
    complexity: 'básico' | 'intermediário' | 'avançado';
    clinicalPearls: string[];
    redFlags: string[];
    educationalObjectives: string[];
    caseStudies?: string[];
    mnemonics?: string[];
  };
}

// Log de auditoria
export interface PulseAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userRole?: string;
  action:
    | 'medical_analysis'
    | 'medical_education'
    | 'quick_query'
    | 'content_moderation'
    | 'question_explanation'
    | 'question_extraction'
    | 'question_categorization';
  input: {
    query?: string;
    topic?: string;
    specialty?: string;
    complexity?: string;
    hasPatientData?: boolean;
  };
  output: {
    success: boolean;
    responseTime: number;
    tokensUsed?: number;
    confidence?: number;
    error?: string;
  };
  metadata?: {
    model: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId: string;
  };
}

// Estados de loading
export interface PulseLoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

// Estatísticas de uso
export interface PulseUsageStats {
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  successRate: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  errorRate: number;
  lastUsed: string;
}

// Configuração de cache
export interface PulseCacheConfig {
  enabled: boolean;
  ttl: number; // Time to live em segundos
  maxSize: number; // Máximo de itens no cache
}

// Configuração de rate limiting
export interface PulseRateLimit {
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxTokensPerHour: number;
  maxTokensPerDay: number;
}

// Status do sistema
export interface PulseSystemStatus {
  name: string;
  version: string;
  model: string;
  ready: boolean;
  uptime: number;
  configuration: Partial<PulseConfiguration>;
  statistics: PulseUsageStats;
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastHealthCheck: string;
    issues: string[];
  };
}

// Configurações específicas por especialidade
export interface SpecialtyConfiguration {
  name: string;
  prompts: {
    analysis: string;
    education: string;
    moderation: string;
  };
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  requiredFields: string[];
  redFlags: string[];
}

// Filtros e preferências do usuário
export interface UserPulsePreferences {
  userId: string;
  preferredModel: string;
  complexity: 'básico' | 'intermediário' | 'avançado';
  specialties: string[];
  language: string;
  enableNotifications: boolean;
  cacheResponses: boolean;
  maxResponseTime: number;
}

// Resposta de moderação de conteúdo
export interface PulseModerationResponse extends PulseResponse {
  moderation?: {
    isAppropriate: boolean;
    severity: 'baixa' | 'média' | 'alta';
    issues: string[];
    recommendation: string;
    suggestedEdit?: string;
    medicalAccuracy: 'alta' | 'média' | 'baixa';
    ethicalConcerns: string[];
    riskLevel: 'baixo' | 'médio' | 'alto';
    complianceScore: number;
  };
}

// Webhook events
export interface PulseWebhookEvent {
  id: string;
  type:
    | 'analysis_completed'
    | 'education_requested'
    | 'moderation_flagged'
    | 'error_occurred';
  timestamp: string;
  userId: string;
  data: any;
  retry?: number;
}

// Análise de sentimento do feedback
export interface PulseFeedback {
  id: string;
  userId: string;
  sessionId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  category: 'accuracy' | 'helpfulness' | 'speed' | 'clarity' | 'safety';
  timestamp: string;
  resolved?: boolean;
}

// Estrutura de dados para relatórios
export interface PulseAnalyticsReport {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    topSpecialties: Array<{
      name: string;
      usage: number;
    }>;
    userSatisfaction: number;
    errorTypes: Array<{
      type: string;
      count: number;
    }>;
  };
  recommendations: string[];
}

// Tipos para exportação
export type PulseActionType =
  | 'medical_analysis'
  | 'medical_education'
  | 'quick_query'
  | 'content_moderation'
  | 'question_explanation'
  | 'question_extraction'
  | 'question_categorization';
export type PulseComplexityLevel = 'básico' | 'intermediário' | 'avançado';
export type PulseUrgencyLevel = 'baixa' | 'média' | 'alta' | 'emergência';
export type PulseSeverityLevel = 'baixa' | 'média' | 'alta';
export type PulseRiskLevel = 'baixo' | 'médio' | 'alto';
export type PulseAccuracyLevel = 'alta' | 'média' | 'baixa';
export type PulseHealthStatus = 'healthy' | 'degraded' | 'unhealthy';
