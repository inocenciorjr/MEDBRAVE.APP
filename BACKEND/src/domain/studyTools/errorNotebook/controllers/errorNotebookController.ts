import { Request, Response } from 'express';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';
import { ErrorNotebookService } from '../services/errorNotebookService';
import { 
  CreateErrorNoteDTO,
  UpdateErrorNoteDTO,
  GetUserErrorNotesOptions,
  ErrorNoteDifficulty 
} from '../types';
import { FSRSGrade } from '../../../srs/services/FSRSService';

/**
 * FASE 3: Controller do Sistema de Caderno de Erros
 * Implementação conforme TODO.md
 * 
 * ENDPOINTS:
 * - POST /error-notebook/create - Criar anotação
 * - GET /error-notebook/user - Listar anotações do usuário
 * - GET /error-notebook/:id/review - Preparar para revisão
 * - POST /error-notebook/:id/record-review - Registrar revisão
 * - PUT /error-notebook/:id - Atualizar anotação
 * - GET /error-notebook/stats - Estatísticas do usuário
 */
export class ErrorNotebookController {
  private errorNotebookService: ErrorNotebookService;

  constructor() {
    this.errorNotebookService = new ErrorNotebookService();
  }

  /**
   * Injetar dependências para evitar circular dependency
   */
  setServices(unifiedReviewService: any, questionService: any): void {
    this.errorNotebookService.setUnifiedReviewService(unifiedReviewService);
    this.errorNotebookService.setQuestionService(questionService);
  }

  /**
   * POST /error-notebook/create
   * Criar anotação de erro
   */
  async createErrorNote(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Controller: Criar anotação de erro', { 
        userId: req.user?.id,
        body: req.body 
      });

      // Validar autenticação
      if (!req.user?.id) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      // Validar dados obrigatórios
      const { 
        questionId, 
        userNote, 
        userExplanation, 
        keyPoints, 
        tags, 
        difficulty, 
        confidence 
      } = req.body;

      if (!questionId) {
        throw AppError.badRequest('questionId é obrigatório');
      }
      if (!userNote?.trim()) {
        throw AppError.badRequest('userNote é obrigatório');
      }
      if (!userExplanation?.trim()) {
        throw AppError.badRequest('userExplanation é obrigatório');
      }

      // Validar difficulty se fornecida
      if (difficulty && !Object.values(ErrorNoteDifficulty).includes(difficulty)) {
        throw AppError.badRequest('difficulty inválida');
      }

      // Validar confidence se fornecida
      if (confidence !== undefined && (confidence < 1 || confidence > 5)) {
        throw AppError.badRequest('confidence deve estar entre 1 e 5');
      }

      // Preparar DTO
      const createDTO: CreateErrorNoteDTO = {
        userId: req.user.id,
        questionId,
        userNote: userNote.trim(),
        userExplanation: userExplanation.trim(),
        keyPoints: keyPoints || [],
        tags: tags || [],
        difficulty: difficulty || ErrorNoteDifficulty.MEDIUM,
        confidence: confidence || 3
      };

      // Criar anotação
      const result = await this.errorNotebookService.createErrorNote(createDTO);

      logger.info('Anotação de erro criada com sucesso', {
        entryId: result.entry.id,
        userId: req.user.id,
        addedToReview: result.addedToReview
      });

      res.status(201).json({
        success: true,
        message: result.addedToReview 
          ? 'Anotação criada e adicionada às revisões com sucesso'
          : 'Anotação criada com sucesso (não foi possível adicionar às revisões)',
        data: {
          entry: result.entry,
          addedToReview: result.addedToReview
        }
      });
    } catch (error) {
      logger.error('Erro no controller ao criar anotação:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  }

  /**
   * GET /error-notebook/user
   * Listar anotações do usuário
   */
  async getUserErrorNotes(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Controller: Listar anotações do usuário', { 
        userId: req.user?.id,
        query: req.query 
      });

      // Validar autenticação
      if (!req.user?.id) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      // Extrair parâmetros de query
      const {
        limit,
        page,
        tags,
        difficulty,
        isInReviewSystem
      } = req.query;

      // Preparar opções
      const options: GetUserErrorNotesOptions = {};

      if (limit) {
        const limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          throw AppError.badRequest('limit deve ser um número entre 1 e 100');
        }
        options.limit = limitNum;
      }

      if (page) {
        const pageNum = parseInt(page as string, 10);
        if (isNaN(pageNum) || pageNum < 1) {
          throw AppError.badRequest('page deve ser um número maior que 0');
        }
        options.page = pageNum;
      }

      if (tags) {
        if (typeof tags === 'string') {
          options.tags = tags.split(',').map(tag => tag.trim());
        } else if (Array.isArray(tags)) {
          options.tags = tags.map(tag => String(tag).trim());
        }
      }

      if (difficulty && Object.values(ErrorNoteDifficulty).includes(difficulty as ErrorNoteDifficulty)) {
        options.difficulty = difficulty as ErrorNoteDifficulty;
      }

      if (isInReviewSystem !== undefined) {
        options.isInReviewSystem = isInReviewSystem === 'true';
      }

      // Buscar anotações
      const result = await this.errorNotebookService.getUserErrorNotes(req.user.id, options);

      logger.info('Anotações listadas com sucesso', {
        userId: req.user.id,
        totalFound: result.entries.length,
        total: result.total
      });

      res.json({
        success: true,
        message: 'Anotações listadas com sucesso',
        data: result
      });
    } catch (error) {
      logger.error('Erro no controller ao listar anotações:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  }

  /**
   * GET /error-notebook/:id/review
   * Preparar anotação para revisão
   */
  async prepareErrorNoteForReview(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Controller: Preparar anotação para revisão', { 
        userId: req.user?.id,
        entryId: req.params.id 
      });

      // Validar autenticação
      if (!req.user?.id) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      const entryId = req.params.id;
      if (!entryId) {
        throw AppError.badRequest('ID da anotação é obrigatório');
      }

      // Preparar para revisão
      const reviewData = await this.errorNotebookService.prepareErrorNoteForReview(
        entryId, 
        req.user.id
      );

      logger.info('Anotação preparada para revisão', {
        entryId,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Anotação preparada para revisão',
        data: reviewData
      });
    } catch (error) {
      logger.error('Erro no controller ao preparar anotação para revisão:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  }

  /**
   * POST /error-notebook/:id/record-review
   * Registrar revisão de anotação
   */
  async recordErrorNoteReview(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Controller: Registrar revisão de anotação', { 
        userId: req.user?.id,
        entryId: req.params.id,
        body: req.body
      });

      // Validar autenticação
      if (!req.user?.id) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      const entryId = req.params.id;
      if (!entryId) {
        throw AppError.badRequest('ID da anotação é obrigatório');
      }

      const { selfAssessment, reviewTimeMs } = req.body;

      // Validar self assessment
      if (!selfAssessment || !Object.values(FSRSGrade).includes(selfAssessment)) {
        throw AppError.badRequest(
          'selfAssessment é obrigatório e deve ser um valor válido (1-4)'
        );
      }

      // Validar reviewTimeMs se fornecido
      if (reviewTimeMs !== undefined && (typeof reviewTimeMs !== 'number' || reviewTimeMs < 0)) {
        throw AppError.badRequest('reviewTimeMs deve ser um número positivo');
      }

      // Registrar revisão
      await this.errorNotebookService.recordErrorNoteReview(
        entryId,
        req.user.id,
        selfAssessment,
        reviewTimeMs
      );

      logger.info('Revisão de anotação registrada com sucesso', {
        entryId,
        userId: req.user.id,
        selfAssessment
      });

      res.json({
        success: true,
        message: 'Revisão registrada com sucesso',
        data: {
          entryId,
          grade: selfAssessment,
          reviewTimeMs
        }
      });
    } catch (error) {
      logger.error('Erro no controller ao registrar revisão:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  }

  /**
   * PUT /error-notebook/:id
   * Atualizar anotação de erro
   */
  async updateErrorNote(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Controller: Atualizar anotação de erro', { 
        userId: req.user?.id,
        entryId: req.params.id,
        body: req.body
      });

      // Validar autenticação
      if (!req.user?.id) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      const entryId = req.params.id;
      if (!entryId) {
        throw AppError.badRequest('ID da anotação é obrigatório');
      }

      const { 
        userNote, 
        userExplanation, 
        keyPoints, 
        tags, 
        difficulty, 
        confidence 
      } = req.body;

      // Validar difficulty se fornecida
      if (difficulty && !Object.values(ErrorNoteDifficulty).includes(difficulty)) {
        throw AppError.badRequest('difficulty inválida');
      }

      // Validar confidence se fornecida
      if (confidence !== undefined && (confidence < 1 || confidence > 5)) {
        throw AppError.badRequest('confidence deve estar entre 1 e 5');
      }

      // Preparar DTO de atualização
      const updateDTO: UpdateErrorNoteDTO = {};

      if (userNote !== undefined) {
        updateDTO.userNote = userNote.trim();
      }
      if (userExplanation !== undefined) {
        updateDTO.userExplanation = userExplanation.trim();
      }
      if (keyPoints !== undefined) {
        updateDTO.keyPoints = keyPoints;
      }
      if (tags !== undefined) {
        updateDTO.tags = tags;
      }
      if (difficulty !== undefined) {
        updateDTO.difficulty = difficulty;
      }
      if (confidence !== undefined) {
        updateDTO.confidence = confidence;
      }

      // Atualizar anotação
      const updatedEntry = await this.errorNotebookService.updateErrorNote(
        entryId,
        req.user.id,
        updateDTO
      );

      logger.info('Anotação atualizada com sucesso', {
        entryId,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Anotação atualizada com sucesso',
        data: updatedEntry
      });
    } catch (error) {
      logger.error('Erro no controller ao atualizar anotação:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  }

  /**
   * GET /error-notebook/stats
   * Obter estatísticas das anotações do usuário
   */
  async getUserErrorNotesStats(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Controller: Obter estatísticas de anotações', { 
        userId: req.user?.id 
      });

      // Validar autenticação
      if (!req.user?.id) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      // Buscar estatísticas
      const stats = await this.errorNotebookService.getUserErrorNotesStats(req.user.id);

      logger.info('Estatísticas obtidas com sucesso', {
        userId: req.user.id,
        totalEntries: stats.totalEntries
      });

      res.json({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats
      });
    } catch (error) {
      logger.error('Erro no controller ao obter estatísticas:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  }
}
