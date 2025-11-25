export enum GoalType {
  WEEKLY_QUESTIONS = 'WEEKLY_QUESTIONS',
  MONTHLY_QUESTIONS = 'MONTHLY_QUESTIONS',
  SPECIALTY_ACCURACY = 'SPECIALTY_ACCURACY',
  OVERALL_ACCURACY = 'OVERALL_ACCURACY',
}

export enum ExamType {
  REVALIDA = 'REVALIDA',
  RESIDENCIA = 'RESIDENCIA',
  CUSTOM = 'CUSTOM',
}

export interface CutoffScoreConfig {
  id: string;
  userId: string;
  examType: ExamType;
  examName: string;
  cutoffPercentage: number; // 0-100
  totalQuestions: number;
  specialtyWeights?: Record<string, number>; // peso por especialidade (default 1)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserGoal {
  id: string;
  userId: string;
  goalType: GoalType;
  specialtyId?: string; // para metas de especialidade
  targetValue: number;
  currentValue: number;
  timeframe: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  isAchieved: boolean;
  achievedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
