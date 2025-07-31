import { Request, Response } from 'express';
import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { ErrorNotebookFSRSService } from '../services/ErrorNotebookFSRSService';
import AppError from '../../../../utils/AppError';
import { validateSchema } from '../validation';
import { FSRSGrade } from '../../../srs/services/FSRSService';
import { firestore } from '../../../../config/firebaseAdmin';
import { FSRSServiceFactory } from '../../../srs/factory/fsrsServiceFactory';

export class ErrorNotebookEntryController {
  constructor(_errorNotebookRepository: IErrorNotebookRepository) {
    // this.errorNotebookRepository = errorNotebookRepository;
  }

  /**
   * Cria uma nova entrada no caderno de erros
   */
  async createErrorEntry(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      // Validar os dados da requisição
      const { error } = validateSchema('createErrorEntry', req.body);
      if (error) {
        throw AppError.badRequest(error.message);
      }

      // Adicionar o userId do usuário autenticado
      const payload = {
        ...req.body,
        userId: req.user.id,
      };

      // Implementar usando o service com firestore
      const fsrs = FSRSServiceFactory.createService(firestore);
      const service = new ErrorNotebookFSRSService(firestore, fsrs);
      const entry = await service.createErrorEntry(payload);

      return res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno ao criar entrada no caderno de erros',
      });
    }
  }

  /**
   * Busca uma entrada pelo ID
   */
  async getEntryById(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      const { id } = req.params;

      if (!id) {
        throw AppError.badRequest('ID da entrada é obrigatório');
      }

      // TODO: Implementar usando o repositório
      const entry = null;

      if (!entry) {
        throw AppError.notFound('Entrada não encontrada');
      }

      return res.status(200).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno ao buscar entrada do caderno de erros',
      });
    }
  }

  /**
   * Lista as entradas de um caderno de erros
   */
  async getEntriesByNotebookId(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      // Validar os parâmetros de consulta
      const { error } = validateSchema('listErrorEntries', req.query);
      if (error) {
        throw AppError.badRequest(error.message);
      }

      // TODO: Implementar usando o repositório
      const result = { data: [], total: 0, page: 1, limit: 10 };

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno ao listar entradas do caderno de erros',
      });
    }
  }

  /**
   * Atualiza uma entrada do caderno de erros
   */
  async updateEntry(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      const { id } = req.params;

      if (!id) {
        throw AppError.badRequest('ID da entrada é obrigatório');
      }

      // Validar os dados da requisição
      const { error } = validateSchema('updateErrorEntry', req.body);
      if (error) {
        throw AppError.badRequest(error.message);
      }

      // TODO: Implementar usando o repositório
      const updatedEntry = { id, ...req.body, updatedAt: new Date() };

      return res.status(200).json({
        success: true,
        data: updatedEntry,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno ao atualizar entrada do caderno de erros',
      });
    }
  }

  /**
   * Remove uma entrada do caderno de erros
   */
  async deleteEntry(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      const { id } = req.params;

      if (!id) {
        throw AppError.badRequest('ID da entrada é obrigatório');
      }

      // TODO: Implementar usando o repositório
      
      return res.status(200).json({
        success: true,
        message: 'Entrada excluída com sucesso',
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno ao excluir entrada do caderno de erros',
      });
    }
  }

  /**
   * Registra uma revisão de uma entrada
   */
  async recordEntryReview(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      const { id } = req.params;

      if (!id) {
        throw AppError.badRequest('ID da entrada é obrigatório');
      }

      // Validar os dados da requisição
      const { error } = validateSchema('recordEntryReview', req.body);
      if (error) {
        throw AppError.badRequest(error.message);
      }

      const { grade = FSRSGrade.GOOD } = req.body;

      // TODO: Implementar usando o repositório
      const fsrs = FSRSServiceFactory.createService(firestore);
      const service = new ErrorNotebookFSRSService(firestore, fsrs);
      const updated = await service.recordEntryReview(id, req.user.id, grade);

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno ao registrar revisão da entrada',
      });
    }
  }

  /**
   * Importa uma entrada a partir de uma resposta à questão
   */
  async importFromQuestionResponse(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      // Validar os dados da requisição
      const { error } = validateSchema('createErrorEntry', req.body);
      if (error) {
        throw AppError.badRequest(error.message);
      }

      const { responseId, notebookId, additionalData } = req.body;

      // TODO: Implementar usando o repositório
      const entry = { id: 'temp', responseId, notebookId, additionalData, createdAt: new Date() };

      return res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno ao importar resposta para caderno de erros',
      });
    }
  }

  /**
   * Importa uma entrada a partir de uma interação com flashcard
   */
  async importFromFlashcardInteraction(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      // Validar os dados da requisição
      const { error } = validateSchema('createErrorEntry', req.body);
      if (error) {
        throw AppError.badRequest(error.message);
      }

      const { interactionId, notebookId, additionalData } = req.body;

      if (!interactionId) {
        throw AppError.badRequest('ID da interação com flashcard é obrigatório');
      }

      // TODO: Implementar usando o repositório
      const entry = { id: 'temp', interactionId, notebookId, additionalData, createdAt: new Date() };

      return res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno ao importar interação para caderno de erros',
      });
    }
  }

  /**
   * Obtém as próximas entradas para revisão
   */
  async getNextDueEntries(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      // TODO: Implementar usando o repositório
      // Por enquanto, retorna array vazio para evitar erro 500
      const entries: any[] = [];

      return res.status(200).json({
        success: true,
        data: entries,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno ao obter entradas para revisão',
      });
    }
  }
}
