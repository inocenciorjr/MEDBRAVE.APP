import { SupabaseClient } from '@supabase/supabase-js';
import { IOfficialExamService } from '../../../domain/officialExam/interfaces/IOfficialExamService';
import {
  OfficialExam,
  CreateOfficialExamPayload,
  BulkCreateQuestionsWithOfficialExamPayload,
  ListOfficialExamsOptions,
  PaginatedOfficialExamsResult,
  UpdateOfficialExamPayload,
} from '../../../domain/officialExam/types';
import { Question, CreateQuestionPayload } from '../../../domain/questions/types';
import { SimulatedExam } from '../../../domain/simulatedExam/types';
import { IQuestionService } from '../../../domain/questions/interfaces/IQuestionService';
import { ISimulatedExamService } from '../../../domain/simulatedExam/interfaces/ISimulatedExamService';
import logger from '../../../utils/logger';
import AppError from '../../../utils/AppError';
import { generateOfficialExamId } from '../../../utils/idGenerator';

const OFFICIAL_EXAMS_TABLE = 'official_exams';

/**
 * Supabase implementation of Official Exam Service
 */
export class SupabaseOfficialExamService implements IOfficialExamService {
  private client: SupabaseClient;
  private questionService: IQuestionService;
  private simulatedExamService: ISimulatedExamService;

  constructor(
    client: SupabaseClient,
    questionService: IQuestionService,
    simulatedExamService: ISimulatedExamService
  ) {
    this.client = client;
    this.questionService = questionService;
    this.simulatedExamService = simulatedExamService;
  }

  /**
   * Creates an official exam
   */
  async createOfficialExam(
    data: CreateOfficialExamPayload
  ): Promise<OfficialExam> {
    try {
      this.validateOfficialExamPayload(data);

      const now = new Date().toISOString();
      const id = generateOfficialExamId(data.title);

      // Calculate total questions
      

      const examData = {
        id,
        title: data.title,
        university_id: data.universityId || null,
        exam_type_filter_id: data.examTypeFilterId || null,
        question_ids: data.questionIds,
        created_by: data.createdBy,
        created_at: now,
        updated_at: now,
        tags: data.tags || [],
        // Novos campos
        is_published: data.isPublished ?? false,
        exam_type: data.examType || null,
        exam_year: data.examYear || null,
        exam_name: data.examName || data.title,
        description: data.description || null,
        instructions: data.instructions || null,
        time_limit_minutes: data.timeLimitMinutes || 0,
      };

      const { data: exam, error } = await this.client
        .from(OFFICIAL_EXAMS_TABLE)
        .insert([examData])
        .select()
        .single();

      if (error) {
        logger.error('Error creating official exam:', error);
        throw new AppError('Failed to create official exam', 500);
      }

      logger.info(`Official exam created successfully: ${id}`);
      return this.mapToOfficialExam(exam);
    } catch (error) {
      logger.error('Error in createOfficialExam:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Internal error creating official exam', 500);
    }
  }

  /**
   * Gets an official exam by ID
   */
  async getOfficialExamById(id: string): Promise<OfficialExam | null> {
    try {
      if (!id) {
        throw new AppError('Official exam ID is required', 400);
      }

      const { data, error } = await this.client
        .from(OFFICIAL_EXAMS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching official exam:', error);
        throw new AppError('Failed to fetch official exam', 500);
      }

      return this.mapToOfficialExam(data);
    } catch (error) {
      logger.error('Error in getOfficialExamById:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Internal error fetching official exam', 500);
    }
  }

  /**
   * Updates an official exam
   */
  async updateOfficialExam(
    id: string,
    data: UpdateOfficialExamPayload
  ): Promise<OfficialExam> {
    try {
      if (!id) {
        throw new AppError('Official exam ID is required', 400);
      }

      const now = new Date().toISOString();
      const updateData: any = {
        updated_at: now,
      };

      if (data.title) updateData.title = data.title;
      if (data.universityId !== undefined) updateData.university_id = data.universityId;
      if (data.examTypeFilterId !== undefined) updateData.exam_type_filter_id = data.examTypeFilterId;
      if (data.tags) updateData.tags = data.tags;
      if (data.questionIds) updateData.question_ids = data.questionIds;
      // Novos campos
      if (data.isPublished !== undefined) updateData.is_published = data.isPublished;
      if (data.examType !== undefined) updateData.exam_type = data.examType;
      if (data.examYear !== undefined) updateData.exam_year = data.examYear;
      if (data.examName !== undefined) updateData.exam_name = data.examName;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.instructions !== undefined) updateData.instructions = data.instructions;
      if (data.timeLimitMinutes !== undefined) updateData.time_limit_minutes = data.timeLimitMinutes;

      const { data: exam, error } = await this.client
        .from(OFFICIAL_EXAMS_TABLE)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Official exam not found', 404);
        }
        logger.error('Error updating official exam:', error);
        throw new AppError('Failed to update official exam', 500);
      }

      logger.info(`Official exam updated: ${id}`);
      return this.mapToOfficialExam(exam);
    } catch (error) {
      logger.error('Error in updateOfficialExam:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Internal error updating official exam', 500);
    }
  }

  /**
   * Publishes an official exam
   */
  async publishOfficialExam(id: string): Promise<OfficialExam> {
    try {
      const now = new Date().toISOString();

      const { data: exam, error } = await this.client
        .from(OFFICIAL_EXAMS_TABLE)
        .update({
          is_published: true,
          published_at: now,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Official exam not found', 404);
        }
        logger.error('Error publishing official exam:', error);
        throw new AppError('Failed to publish official exam', 500);
      }

      logger.info(`Official exam published: ${id}`);
      return this.mapToOfficialExam(exam);
    } catch (error) {
      logger.error('Error in publishOfficialExam:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Internal error publishing official exam', 500);
    }
  }

  /**
   * Deletes an official exam
   */
  async deleteOfficialExam(id: string): Promise<void> {
    try {
      if (!id) {
        throw new AppError('Official exam ID is required', 400);
      }

      const { error } = await this.client
        .from(OFFICIAL_EXAMS_TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting official exam:', error);
        throw new AppError('Failed to delete official exam', 500);
      }

      logger.info(`Official exam deleted: ${id}`);
    } catch (error) {
      logger.error('Error in deleteOfficialExam:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Internal error deleting official exam', 500);
    }
  }

  /**
   * Validates official exam payload
   */
  private validateOfficialExamPayload(data: CreateOfficialExamPayload): void {
    if (!data.title || data.title.length < 3) {
      throw new AppError('Title must be at least 3 characters', 400);
    }

    if (!data.questionIds || data.questionIds.length === 0) {
      throw new AppError('Exam must have at least one question', 400);
    }
  }

  /**
   * Maps database row to OfficialExam
   */
  private mapToOfficialExam(data: any): OfficialExam {
    return {
      id: data.id,
      title: data.title,
      universityId: data.university_id,
      examTypeFilterId: data.exam_type_filter_id,
      questionIds: data.question_ids || [],
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      tags: data.tags || [],
      // Novos campos
      isPublished: data.is_published,
      examType: data.exam_type,
      examYear: data.exam_year,
      examName: data.exam_name,
      description: data.description,
      instructions: data.instructions,
      timeLimitMinutes: data.time_limit_minutes,
    };
  }

  /**
   * Creates questions in bulk and an official exam
   */
  async bulkCreateQuestionsWithOfficialExam(
    data: BulkCreateQuestionsWithOfficialExamPayload,
    userId: string
  ): Promise<{ questions: Question[]; officialExam: OfficialExam }> {
    try {
      logger.info(`Starting bulk creation of ${data.questions.length} questions with official exam`);

      // Validate payload
      if (!data.questions || data.questions.length === 0) {
        throw new AppError('At least one question is required', 400);
      }

      if (!data.officialExam) {
        throw new AppError('Official exam data is required', 400);
      }

      // Step 1: Create all questions
      const createdQuestions: Question[] = [];
      const questionIds: string[] = [];

      for (let i = 0; i < data.questions.length; i++) {
        try {
          const questionPayload = data.questions[i] as CreateQuestionPayload;
          const question = await this.questionService.createQuestion(questionPayload);
          createdQuestions.push(question);
          questionIds.push(question.id);
          
          logger.info(`Created question ${i + 1}/${data.questions.length}: ${question.id}`);
        } catch (error) {
          logger.error(`Error creating question ${i + 1}:`, error);
          throw new AppError(
            `Failed to create question ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            500
          );
        }
      }

      logger.info(`Successfully created ${createdQuestions.length} questions`);

      // Step 2: Create official exam with the question IDs
      const officialExamPayload: CreateOfficialExamPayload = {
        ...data.officialExam,
        questionIds,
        createdBy: userId,
      };

      const officialExam = await this.createOfficialExam(officialExamPayload);

      logger.info(`Successfully created official exam: ${officialExam.id}`);

      return {
        questions: createdQuestions,
        officialExam,
      };
    } catch (error) {
      logger.error('Error in bulkCreateQuestionsWithOfficialExam:', error);
      
      // If error occurs after questions are created, provide the question IDs
      // so admin can manually create the official exam if needed
      if (error instanceof AppError && error.message.includes('Failed to create question')) {
        throw error;
      }
      
      throw error instanceof AppError
        ? error
        : new AppError('Internal error in bulk creation', 500);
    }
  }

  /**
   * Lists official exams with filters and pagination
   */
  async listOfficialExams(
    options: ListOfficialExamsOptions = {}
  ): Promise<PaginatedOfficialExamsResult> {
    try {
      const {
        page = 1,
        limit = 20,
        examType,
        examYear,
        isPublished,
        tags,
        query,
        orderBy = 'created_at',
        orderDirection = 'desc',
      } = options;

      if (limit <= 0 || limit > 100) {
        throw new AppError('Limit must be between 1 and 100', 400);
      }

      if (page <= 0) {
        throw new AppError('Page must be greater than 0', 400);
      }

      let queryBuilder = this.client
        .from(OFFICIAL_EXAMS_TABLE)
        .select('*', { count: 'exact' });

      // Apply filters
      if (examType) {
        queryBuilder = queryBuilder.eq('exam_type', examType);
      }

      if (examYear) {
        queryBuilder = queryBuilder.eq('exam_year', examYear);
      }

      if (isPublished !== undefined) {
        queryBuilder = queryBuilder.eq('is_published', isPublished);
      }

      if (tags && tags.length > 0) {
        queryBuilder = queryBuilder.contains('tags', tags);
      }

      if (query) {
        queryBuilder = queryBuilder.or(
          `title.ilike.%${query}%,exam_name.ilike.%${query}%,description.ilike.%${query}%`
        );
      }

      // Ordering
      const ascending = orderDirection === 'asc';
      queryBuilder = queryBuilder.order(orderBy, { ascending });

      // Pagination
      const offset = (page - 1) * limit;
      queryBuilder = queryBuilder.range(offset, offset + limit - 1);

      const { data, error, count } = await queryBuilder;

      if (error) {
        logger.error('Error listing official exams:', error);
        throw new AppError('Failed to list official exams', 500);
      }

      const exams = (data || []).map((item) => this.mapToOfficialExam(item));
      const totalCount = count || 0;
      const hasMore = offset + limit < totalCount;

      return {
        exams,
        totalCount,
        hasMore,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error in listOfficialExams:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Internal error listing official exams', 500);
    }
  }

  /**
   * Creates a personal SimulatedExam from an OfficialExam
   */
  async startOfficialExamAttempt(
    officialExamId: string,
    userId: string
  ): Promise<SimulatedExam> {
    try {
      if (!officialExamId) {
        throw new AppError('Official exam ID is required', 400);
      }

      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      // Get the official exam
      const officialExam = await this.getOfficialExamById(officialExamId);

      if (!officialExam) {
        throw new AppError('Official exam not found', 404);
      }

      if (!officialExam.isPublished) {
        throw new AppError('This exam is not published yet', 403);
      }

      // Create a SimulatedExam from the OfficialExam
      const simulatedExamPayload: any = {
        title: officialExam.title,
        description: officialExam.description || '',
        instructions: officialExam.instructions,
        timeLimit: officialExam.timeLimitMinutes,
        questions: officialExam.questionIds.map((questionId, index) => ({
          questionId,
          order: index + 1,
          points: 1, // Default 1 point per question
        })),
        difficulty: 'mixed', // Official exams typically have mixed difficulty
        filterIds: [],
        subFilterIds: [],
        status: 'published',
        isPublic: false, // Personal exam
        tags: [...(officialExam.tags || []), 'official-exam-attempt'],
        randomize: false, // Official exams should maintain order
        createdBy: userId,
      };

      const simulatedExam = await this.simulatedExamService.createSimulatedExam(
        simulatedExamPayload
      );

      // Update the simulated exam to link it to the official exam
      // This requires direct database access since the service might not expose this field
      await this.client
        .from('simulated_exams')
        .update({ source_official_exam_id: officialExamId })
        .eq('id', simulatedExam.id);

      logger.info(
        `Created simulated exam ${simulatedExam.id} from official exam ${officialExamId} for user ${userId}`
      );

      return simulatedExam;
    } catch (error) {
      logger.error('Error in startOfficialExamAttempt:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Internal error starting official exam attempt', 500);
    }
  }

  /**
   * Gets all attempts by a user for a specific official exam
   */
  async getUserOfficialExamAttempts(
    officialExamId: string,
    userId: string
  ): Promise<SimulatedExam[]> {
    try {
      if (!officialExamId) {
        throw new AppError('Official exam ID is required', 400);
      }

      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      // Query simulated_exams where source_official_exam_id matches and user matches
      const { data, error } = await this.client
        .from('simulated_exams')
        .select('*')
        .eq('source_official_exam_id', officialExamId)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching user official exam attempts:', error);
        throw new AppError('Failed to fetch exam attempts', 500);
      }

      // Map to SimulatedExam type (simplified mapping)
      const attempts: SimulatedExam[] = (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        instructions: item.instructions,
        timeLimit: item.time_limit_minutes,
        questionIds: item.question_ids || [],
        questions: item.questions || [],
        totalQuestions: item.total_questions,
        totalPoints: item.total_points,
        difficulty: item.difficulty,
        filterIds: item.filter_ids || [],
        subFilterIds: item.sub_filter_ids || [],
        status: item.status,
        isPublic: item.is_public,
        createdBy: item.created_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        publishedAt: item.last_published_at,
        tags: item.tags || [],
        randomize: item.randomize,
      }));

      logger.info(
        `Found ${attempts.length} attempts for official exam ${officialExamId} by user ${userId}`
      );

      return attempts;
    } catch (error) {
      logger.error('Error in getUserOfficialExamAttempts:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Internal error fetching exam attempts', 500);
    }
  }
}
