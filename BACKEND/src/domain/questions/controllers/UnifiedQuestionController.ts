import { Request, Response, NextFunction } from 'express';
import { SupabaseQuestionService } from '../../../infra/questions/supabase/SupabaseQuestionService';
import AppError from '../../../utils/AppError';

export class UnifiedQuestionController {
  constructor(private questionService: SupabaseQuestionService) {}

  // CRUD básico
  async createQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Usuário não autenticado");
      }
      const question = await this.questionService.createQuestion({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json({ message: 'Questão criada', data: question });
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Usuário não autenticado");
      }
      
      const { questions } = req.body;
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw AppError.badRequest("É necessário fornecer um array de questões");
      }
      
      console.log(`📦 Criando ${questions.length} questões em lote...`);
      
      const createdQuestions = [];
      const errors = [];
      
      for (let i = 0; i < questions.length; i++) {
        try {
          const question = await this.questionService.createQuestion({
            ...questions[i],
            createdBy: userId,
          });
          createdQuestions.push(question);
        } catch (error) {
          console.error(`❌ Erro ao criar questão ${i + 1}:`, error);
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          });
        }
      }
      
      console.log(`✅ ${createdQuestions.length}/${questions.length} questões criadas com sucesso`);
      
      res.status(201).json({
        message: `${createdQuestions.length} questões criadas com sucesso`,
        created: createdQuestions.length,
        failed: errors.length,
        data: createdQuestions,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  async getQuestionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const question = await this.questionService.getQuestionById(id);
      if (!question) {
        throw AppError.notFound("Questão não encontrada");
      }
      res.status(200).json({ data: question });
    } catch (error) {
      next(error);
    }
  }

  async updateQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Usuário não autenticado");
      }
      const updated = await this.questionService.updateQuestion(id, {
        ...req.body,
        updatedBy: userId,
      });
      res.status(200).json({ message: 'Questão atualizada', data: updated });
    } catch (error) {
      next(error);
    }
  }

  async deleteQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Usuário não autenticado");
      }
      const deleted = await this.questionService.deleteQuestion(id);
      res.status(200).json({ message: 'Questão excluída', data: deleted });
    } catch (error) {
      next(error);
    }
  }

  // Busca/listagem
  async listQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.method === 'POST' ? req.body : req.query;
      const result = await this.questionService.listQuestions(params);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async searchQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.method === 'POST' ? req.body : req.query;
      const result = await this.questionService.searchQuestions(params);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async countQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.method === 'POST' ? req.body : req.query;
      const count = await this.questionService.countQuestions(params);
      res.status(200).json({ count });
    } catch (error) {
      next(error);
    }
  }

  // Tags, status, rating, etc.
  async rateQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { rating, reviewNotes } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Usuário não autenticado");
      }
      const rated = await this.questionService.rateQuestion(
        id,
        rating,
        userId,
        reviewNotes,
      );
      res.status(200).json({ data: rated });
    } catch (error) {
      next(error);
    }
  }

  async addTags(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { tags } = req.body;
      const updated = await this.questionService.addTags(id, tags);
      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  }

  async removeTags(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { tags } = req.body;
      const updated = await this.questionService.removeTags(id, tags);
      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await this.questionService.changeStatus(id, status);
      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  }

  // Filtros, relacionados, bulk, etc.
  async listQuestionsByFilters(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { filterIds, subFilterIds } = req.query;
      const result = await this.questionService.listQuestionsByFilters(
        filterIds as string[],
        subFilterIds as string[],
        req.query,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listRelatedQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.questionService.listRelatedQuestions(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getQuestionsFromList(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      console.log('[UnifiedQuestionController] getQuestionsFromList - listId:', id);
      const result = await this.questionService.getQuestionsFromList(id);
      console.log('[UnifiedQuestionController] Questões retornadas:', result?.length || 0);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  async getQuestionsFromListBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      
      console.log('[UnifiedQuestionController] getQuestionsFromListBatch:', { id, offset, limit });
      const result = await this.questionService.getQuestionsFromListBatch(id, offset, limit);
      res.status(200).json({ data: result.questions, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  async getBulkQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      console.log('[UnifiedQuestionController] getBulkQuestions - IDs recebidos:', ids?.length || 0);
      console.log('[UnifiedQuestionController] Primeiros 3 IDs:', ids?.slice(0, 3));
      const result = await this.questionService.getBulkQuestions(ids);
      console.log('[UnifiedQuestionController] Questões encontradas:', result?.length || 0);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  async batchCountQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { requests } = req.body;
      const result = await this.questionService.batchCountQuestions(requests);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Performance por especialidade
  async getUserPerformanceBySpecialty(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Usuário não autenticado");
      }
      const result =
        await this.questionService.getUserPerformanceBySpecialty(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getQuestionStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.questionService.getQuestionStats();
      res.status(200).json(stats);
    } catch (error) {
      console.error('[UnifiedQuestionController] Error getting stats:', error);
      next(error);
    }
  }
}
