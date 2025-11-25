import AppError from '../../../utils/AppError';
import {
  CreateOfficialExamPayload,
  BulkCreateQuestionsWithOfficialExamPayload,
} from '../types';

/**
 * Validates official exam payload
 */
export function validateOfficialExamPayload(
  data: CreateOfficialExamPayload
): void {
  const errors: string[] = [];

  // Exam name validation
  if (!data.examName || typeof data.examName !== 'string') {
    errors.push('Exam name is required');
  } else if (data.examName.length < 2) {
    errors.push('Exam name must be at least 2 characters');
  } else if (data.examName.length > 255) {
    errors.push('Exam name must not exceed 255 characters');
  }

  // Exam year validation
  if (!data.examYear || typeof data.examYear !== 'number') {
    errors.push('Exam year is required');
  } else if (data.examYear < 2000 || data.examYear > 2100) {
    errors.push('Exam year must be between 2000 and 2100');
  }

  // Exam type validation
  if (!data.examType || typeof data.examType !== 'string') {
    errors.push('Exam type is required');
  } else if (data.examType.length < 2) {
    errors.push('Exam type must be at least 2 characters');
  }

  // Title validation
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Title is required');
  } else if (data.title.length < 3) {
    errors.push('Title must be at least 3 characters');
  } else if (data.title.length > 500) {
    errors.push('Title must not exceed 500 characters');
  }

  // Question IDs validation
  if (!data.questionIds || !Array.isArray(data.questionIds)) {
    errors.push('Question IDs must be an array');
  } else if (data.questionIds.length === 0) {
    errors.push('Exam must have at least one question');
  } else if (data.questionIds.length > 500) {
    errors.push('Exam cannot have more than 500 questions');
  }

  // Time limit validation
  if (data.timeLimitMinutes !== undefined) {
    if (typeof data.timeLimitMinutes !== 'number') {
      errors.push('Time limit must be a number');
    } else if (data.timeLimitMinutes < 1) {
      errors.push('Time limit must be greater than 0');
    } else if (data.timeLimitMinutes > 1440) {
      errors.push('Time limit cannot exceed 1440 minutes (24 hours)');
    }
  }

  // Passing score validation
  const passingScore = (data as any).passing_score;
  if (passingScore !== undefined && passingScore !== null) {
    if (typeof passingScore !== 'number') {
      errors.push('Passing score must be a number');
    } else if (passingScore < 0 || passingScore > 100) {
      errors.push('Passing score must be between 0 and 100');
    }
  }

  // Tags validation
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    } else if (data.tags.length > 20) {
      errors.push('Cannot have more than 20 tags');
    } else {
      for (const tag of data.tags) {
        if (typeof tag !== 'string') {
          errors.push('All tags must be strings');
          break;
        }
        if (tag.length > 50) {
          errors.push('Each tag must not exceed 50 characters');
          break;
        }
      }
    }
  }

  // Created by validation
  if (!data.createdBy || typeof data.createdBy !== 'string') {
    errors.push('Created by (user ID) is required');
  }

  if (errors.length > 0) {
    throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
  }
}

/**
 * Validates bulk create payload
 */
export function validateBulkCreatePayload(
  data: BulkCreateQuestionsWithOfficialExamPayload
): void {
  const errors: string[] = [];

  // Questions validation
  if (!data.questions || !Array.isArray(data.questions)) {
    errors.push('Questions must be an array');
  } else if (data.questions.length === 0) {
    errors.push('At least one question is required');
  } else if (data.questions.length > 500) {
    errors.push('Cannot create more than 500 questions at once');
  }

  // Official exam validation
  if (!data.officialExam || typeof data.officialExam !== 'object') {
    errors.push('Official exam data is required');
  } else {
    // Validate required fields in officialExam
    if (!data.officialExam.examName) {
      errors.push('Official exam: exam name is required');
    }
    if (!data.officialExam.examYear) {
      errors.push('Official exam: exam year is required');
    }
    if (!data.officialExam.examType) {
      errors.push('Official exam: exam type is required');
    }
    if (!data.officialExam.title) {
      errors.push('Official exam: title is required');
    }
  }

  if (errors.length > 0) {
    throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
  }
}

/**
 * Validates list options
 */
export function validateListOptions(options: any): void {
  const errors: string[] = [];

  if (options.page !== undefined) {
    if (typeof options.page !== 'number' || options.page < 1) {
      errors.push('Page must be a positive number');
    }
  }

  if (options.limit !== undefined) {
    if (typeof options.limit !== 'number' || options.limit < 1 || options.limit > 100) {
      errors.push('Limit must be between 1 and 100');
    }
  }

  if (options.examYear !== undefined) {
    if (typeof options.examYear !== 'number' || options.examYear < 2000 || options.examYear > 2100) {
      errors.push('Exam year must be between 2000 and 2100');
    }
  }

  if (options.orderDirection !== undefined) {
    if (options.orderDirection !== 'asc' && options.orderDirection !== 'desc') {
      errors.push('Order direction must be "asc" or "desc"');
    }
  }

  if (errors.length > 0) {
    throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
  }
}
