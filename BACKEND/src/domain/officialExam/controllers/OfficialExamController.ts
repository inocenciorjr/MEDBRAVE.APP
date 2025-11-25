import { Request, Response, NextFunction } from 'express';
import { IOfficialExamService } from '../interfaces/IOfficialExamService';
import AppError from '../../../utils/AppError';
import logger from '../../../utils/logger';

/**
 * Controller for Official Exam operations
 */
export class OfficialExamController {
  private officialExamService: IOfficialExamService;

  constructor(officialExamService: IOfficialExamService) {
    this.officialExamService = officialExamService;
  }

  /**
   * POST /api/official-exams/bulk-create
   * Creates questions in bulk and an official exam
   */
  async bulkCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw AppError.unauthorized('User not authenticated');
      }

      const payload = req.body;

      if (!payload.questions || !payload.officialExam) {
        throw new AppError('Invalid payload: questions and officialExam are required', 400);
      }

      const result = await this.officialExamService.bulkCreateQuestionsWithOfficialExam(
        payload,
        userId
      );

      logger.info(`Bulk creation completed: ${result.questions.length} questions, 1 official exam`);

      res.status(201).json({
        success: true,
        data: result,
        message: `Successfully created ${result.questions.length} questions and official exam "${result.officialExam.title}"`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/official-exams
   * Lists official exams with filters
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const options = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        examType: req.query.examType as string,
        examYear: req.query.examYear ? parseInt(req.query.examYear as string) : undefined,
        isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        query: req.query.query as string,
        orderBy: req.query.orderBy as string,
        orderDirection: req.query.orderDirection as 'asc' | 'desc',
      };

      const result = await this.officialExamService.listOfficialExams(options);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/official-exams/:id
   * Gets an official exam by ID
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const exam = await this.officialExamService.getOfficialExamById(id);

      if (!exam) {
        throw new AppError('Official exam not found', 404);
      }

      res.status(200).json({
        success: true,
        data: exam,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/official-exams/:id
   * Updates an official exam
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const exam = await this.officialExamService.updateOfficialExam(id, updateData);

      res.status(200).json({
        success: true,
        data: exam,
        message: 'Official exam updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/official-exams/:id/publish
   * Publishes an official exam
   */
  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const exam = await this.officialExamService.publishOfficialExam(id);

      res.status(200).json({
        success: true,
        data: exam,
        message: 'Official exam published successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/official-exams/:id
   * Deletes an official exam
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await this.officialExamService.deleteOfficialExam(id);

      res.status(200).json({
        success: true,
        message: 'Official exam deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/official-exams/:id/start
   * Starts an official exam attempt (creates a personal SimulatedExam)
   */
  async startAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw AppError.unauthorized('User not authenticated');
      }

      const simulatedExam = await this.officialExamService.startOfficialExamAttempt(id, userId);

      res.status(201).json({
        success: true,
        data: simulatedExam,
        message: 'Official exam attempt started successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/official-exams/:id/attempts
   * Gets user's attempts for an official exam
   */
  async getUserAttempts(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw AppError.unauthorized('User not authenticated');
      }

      const attempts = await this.officialExamService.getUserOfficialExamAttempts(id, userId);

      res.status(200).json({
        success: true,
        data: attempts,
        count: attempts.length,
      });
    } catch (error) {
      next(error);
    }
  }
}
