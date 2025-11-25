import { z } from 'zod';
import { QuestionDifficulty, QuestionStatus } from '../../src/domain/questions/types';
import { ValidationResult, BatchValidationResult } from './types';
import { logger } from './utils/logger';

// Zod schema for QuestionAlternative
const AlternativeSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  isCorrect: z.boolean(),
  order: z.number().int().min(0),
  explanation: z.string().nullable().optional(),
});

// Zod schema for Question
const QuestionSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  statement: z.string().min(1),
  alternatives: z.array(AlternativeSchema).min(2).max(10),
  correct_alternative_id: z.string().optional(),
  explanation: z.string().nullable().optional(),
  difficulty: z.nativeEnum(QuestionDifficulty),
  difficulty_level: z.number().int().min(1).max(5).optional(),
  filter_ids: z.array(z.string()),
  sub_filter_ids: z.array(z.string()),
  tags: z.array(z.string()),
  source: z.string().nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  status: z.nativeEnum(QuestionStatus),
  is_annulled: z.boolean(),
  is_active: z.boolean(),
  review_count: z.number().int().min(0),
  average_rating: z.number().min(0).max(5),
  rating: z.number().min(0).max(5),
  created_by: z.string().min(1),
  updated_by: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  comments_allowed: z.boolean().optional(),
  last_reviewed_at: z.string().nullable().optional(),
  review_status: z.string().optional(),
  reviewer_id: z.string().nullable().optional(),
  review_notes: z.string().nullable().optional(),
  version: z.number().int().optional(),
  related_question_ids: z.array(z.string()).optional(),
  image_urls: z.array(z.string()).optional(),
  video_urls: z.array(z.string()).optional(),
  audio_urls: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export class QuestionValidator {
  /**
   * Validate a single question against the schema
   */
  validate(question: unknown): ValidationResult {
    try {
      QuestionSchema.parse(question);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = this.formatZodErrors(error);
        return { valid: false, errors };
      }
      return { valid: false, errors: [(error as Error).message] };
    }
  }

  /**
   * Validate a batch of questions
   */
  validateBatch(questions: unknown[]): BatchValidationResult {
    logger.info(`Validating ${questions.length} questions...`);

    const result: BatchValidationResult = {
      totalQuestions: questions.length,
      validQuestions: 0,
      invalidQuestions: 0,
      errors: [],
    };

    questions.forEach((question, index) => {
      const validation = this.validate(question);
      
      if (validation.valid) {
        result.validQuestions++;
      } else {
        result.invalidQuestions++;
        result.errors.push({
          questionIndex: index,
          errors: validation.errors || [],
        });
        
        logger.warn(`Question ${index + 1} validation failed:`, validation.errors);
      }
    });

    logger.info(`Validation complete: ${result.validQuestions} valid, ${result.invalidQuestions} invalid`);

    return result;
  }

  /**
   * Format Zod errors into readable messages
   */
  private formatZodErrors(error: z.ZodError): string[] {
    return error.errors.map((err) => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
  }

  /**
   * Check if question has required fields
   */
  hasRequiredFields(question: any): boolean {
    return !!(
      question.id &&
      question.statement &&
      question.alternatives &&
      Array.isArray(question.alternatives) &&
      question.alternatives.length >= 2 &&
      question.difficulty &&
      question.status
    );
  }

  /**
   * Check if alternatives are valid
   */
  hasValidAlternatives(question: any): boolean {
    if (!question.alternatives || !Array.isArray(question.alternatives)) {
      return false;
    }

    return question.alternatives.every((alt: any) => {
      return !!(
        alt.id &&
        alt.text &&
        typeof alt.isCorrect === 'boolean' &&
        typeof alt.order === 'number'
      );
    });
  }

  /**
   * Check if at least one alternative is marked as correct
   */
  hasCorrectAlternative(question: any): boolean {
    if (!question.alternatives || !Array.isArray(question.alternatives)) {
      return false;
    }

    return question.alternatives.some((alt: any) => alt.isCorrect === true);
  }
}
