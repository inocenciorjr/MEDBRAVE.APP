import { Question, QuestionAlternative, QuestionDifficulty, QuestionStatus } from '../../src/domain/questions/types';

// CLI Options
export interface CLIOptions {
  url: string;
  output?: string;
  verbose?: boolean;
  downloadImages?: boolean;
  timeout?: number;
  limit?: number;
}

// Raw data extracted from HTML
export interface RawExamData {
  title?: string;
  institution?: string;
  year?: number;
  questions: RawQuestion[];
}

export interface RawQuestion {
  statement: string;
  alternatives: RawAlternative[];
  correctAlternativeIndex: number;
  imageUrls: string[];
  metadata: Record<string, any>;
}

export interface RawAlternative {
  text: string;
  order: number;
  isCorrect?: boolean; // Marked as correct when answer is revealed
}

export interface ExamMetadata {
  title?: string;
  institution?: string;
  year?: number;
  tags?: string[];
}

// Validation results
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface BatchValidationResult {
  totalQuestions: number;
  validQuestions: number;
  invalidQuestions: number;
  errors: Array<{ questionIndex: number; errors: string[] }>;
}

// Image download results
export interface DownloadResult {
  url: string;
  success: boolean;
  localPath?: string;
  error?: string;
}

// Execution report
export interface ErrorReport {
  timestamp: string;
  message: string;
  stack?: string;
  context?: string;
}

export interface WarningReport {
  timestamp: string;
  message: string;
  context?: string;
}

export interface ScraperReport {
  executionId: string;
  url: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'success' | 'partial' | 'failed';
  statistics: {
    totalQuestions: number;
    validQuestions: number;
    invalidQuestions: number;
    imagesDownloaded: number;
    imagesFailed: number;
  };
  errors: ErrorReport[];
  warnings: WarningReport[];
  outputFile: string;
}

// Re-export Question types for convenience
export type { Question, QuestionAlternative, QuestionDifficulty, QuestionStatus };
