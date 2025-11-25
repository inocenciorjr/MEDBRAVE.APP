import { Question } from '../../questions/types';
import { SimulatedExam } from '../../simulatedExam/types';
import {
  OfficialExam,
  CreateOfficialExamPayload,
  BulkCreateQuestionsWithOfficialExamPayload,
  ListOfficialExamsOptions,
  PaginatedOfficialExamsResult,
  UpdateOfficialExamPayload,
} from '../types';

/**
 * Interface for Official Exam Service
 * Manages official exam templates that can be used to create multiple user attempts
 */
export interface IOfficialExamService {
  /**
   * Creates questions in bulk and an official exam template
   * @param data Payload containing questions and official exam data
   * @param userId ID of the user creating the exam (admin)
   * @returns Created questions and official exam
   */
  bulkCreateQuestionsWithOfficialExam(
    data: BulkCreateQuestionsWithOfficialExamPayload,
    userId: string
  ): Promise<{
    questions: Question[];
    officialExam: OfficialExam;
  }>;

  /**
   * Creates an official exam (without creating questions)
   * @param data Official exam data
   * @returns Created official exam
   */
  createOfficialExam(data: CreateOfficialExamPayload): Promise<OfficialExam>;

  /**
   * Gets an official exam by ID
   * @param id Official exam ID
   * @returns Official exam or null if not found
   */
  getOfficialExamById(id: string): Promise<OfficialExam | null>;

  /**
   * Lists official exams with filters and pagination
   * @param options Listing options and filters
   * @returns Paginated list of official exams
   */
  listOfficialExams(
    options: ListOfficialExamsOptions
  ): Promise<PaginatedOfficialExamsResult>;

  /**
   * Updates an official exam
   * @param id Official exam ID
   * @param data Update payload
   * @returns Updated official exam
   */
  updateOfficialExam(
    id: string,
    data: UpdateOfficialExamPayload
  ): Promise<OfficialExam>;

  /**
   * Publishes an official exam (makes it available to users)
   * @param id Official exam ID
   * @returns Published official exam
   */
  publishOfficialExam(id: string): Promise<OfficialExam>;

  /**
   * Creates a personal SimulatedExam from an OfficialExam
   * This allows users to take the official exam multiple times
   * @param officialExamId Official exam ID
   * @param userId User ID
   * @returns Created simulated exam
   */
  startOfficialExamAttempt(
    officialExamId: string,
    userId: string
  ): Promise<SimulatedExam>;

  /**
   * Gets all attempts by a user for a specific official exam
   * @param officialExamId Official exam ID
   * @param userId User ID
   * @returns List of simulated exams (attempts)
   */
  getUserOfficialExamAttempts(
    officialExamId: string,
    userId: string
  ): Promise<SimulatedExam[]>;

  /**
   * Deletes an official exam
   * @param id Official exam ID
   */
  deleteOfficialExam(id: string): Promise<void>;
}
