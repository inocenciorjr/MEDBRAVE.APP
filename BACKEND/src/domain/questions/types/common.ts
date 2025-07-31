/**
 * Enums e tipos comuns compartilhados entre os módulos de questões
 * para evitar dependências circulares
 */

/**
 * Tendências de performance
 */
export enum PerformanceTrend {
  IMPROVED = 'IMPROVED',
  MAINTAINED = 'MAINTAINED', 
  REGRESSED = 'REGRESSED'
}

/**
 * Níveis de prioridade
 */
export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Padrões de eficiência temporal identificados
 */
export enum TimeEfficiencyPattern {
  OVERTHINKING_INCORRECT = 'OVERTHINKING_INCORRECT', // Muito tempo nas erradas
  RUSHING_CORRECT = 'RUSHING_CORRECT',               // Pouco tempo nas certas
  BALANCED = 'BALANCED'                              // Tempo equilibrado
}

/**
 * Níveis de efeito de fadiga
 */
export enum FatigueEffect {
  NONE = 'NONE',           // Sem fadiga detectada
  MILD = 'MILD',           // Fadiga leve
  MODERATE = 'MODERATE',   // Fadiga moderada
  SEVERE = 'SEVERE'        // Fadiga severa
} 