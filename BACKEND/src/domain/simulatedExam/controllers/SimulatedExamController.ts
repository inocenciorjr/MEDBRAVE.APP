import { Request, Response, NextFunction } from 'express';
import { ISimulatedExamService } from '../interfaces/ISimulatedExamService';
import {
  SimulatedExamStatus,
  SimulatedExamDifficulty,
  CreateSimulatedExamPayload,
  UpdateSimulatedExamPayload,
  StartSimulatedExamPayload,
  SubmitSimulatedExamAnswerPayload,
  FinishSimulatedExamPayload,
} from '../types';
import AppError from '../../../utils/AppError';

/**
 * Controlador para operações relacionadas a simulados
 */
export class SimulatedExamController {
  private simulatedExamService: ISimulatedExamService;

  constructor(simulatedExamService: ISimulatedExamService) {
    this.simulatedExamService = simulatedExamService;
  }

  /**
   * Verifica se o usuário está autenticado
   * @private
   */
  private getAuthenticatedUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'Usuário não autenticado');
    }
    return userId;
  }

  /**
   * Cria um novo simulado
   */
  createSimulatedExam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const {
        title,
        description,
        instructions,
        timeLimit,
        questions,
        difficulty,
        filterIds,
        subFilterIds,
        status,
        isPublic,
        tags,
        startMessage,
        endMessage,
        randomize,
      } = req.body;

      const simulatedExamData: CreateSimulatedExamPayload = {
        title,
        description,
        instructions,
        timeLimit,
        questions,
        difficulty: difficulty || SimulatedExamDifficulty.MEDIUM,
        filterIds,
        subFilterIds,
        status,
        isPublic,
        tags,
        startMessage,
        endMessage,
        randomize,
        createdBy: userId,
      };

      const simulatedExam = await this.simulatedExamService.createSimulatedExam(simulatedExamData);

      res.status(201).json({
        message: 'Simulado criado com sucesso',
        data: simulatedExam,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtém um simulado pelo ID
   */
  getSimulatedExamById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { id } = req.params;

      const simulatedExam = await this.simulatedExamService.getSimulatedExamById(id);

      if (!simulatedExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar permissão de acesso
      if (
        simulatedExam.createdBy !== userId &&
        !simulatedExam.isPublic &&
        req.user?.role !== 'ADMIN'
      ) {
        throw new AppError(403, 'Você não tem permissão para acessar este simulado');
      }

      res.status(200).json({
        data: simulatedExam,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Atualiza um simulado
   */
  updateSimulatedExam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { id } = req.params;
      const {
        title,
        description,
        instructions,
        timeLimit,
        questions,
        difficulty,
        filterIds,
        subFilterIds,
        status,
        isPublic,
        tags,
        startMessage,
        endMessage,
        randomize,
      } = req.body;

      // Verificar se o simulado existe
      const existingExam = await this.simulatedExamService.getSimulatedExamById(id);
      if (!existingExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar permissão de edição
      if (existingExam.createdBy !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError(403, 'Você não tem permissão para editar este simulado');
      }

      // Verificar se o status pode ser alterado
      if (
        status === SimulatedExamStatus.PUBLISHED &&
        existingExam.status !== SimulatedExamStatus.PUBLISHED &&
        (!questions || questions.length === 0)
      ) {
        throw new AppError('Não é possível publicar um simulado sem questões', 400);
      }

      const updateData: UpdateSimulatedExamPayload = {
        title,
        description,
        instructions,
        timeLimit,
        questions,
        difficulty,
        filterIds,
        subFilterIds,
        status,
        isPublic,
        tags,
        startMessage,
        endMessage,
        randomize,
      };

      const updatedExam = await this.simulatedExamService.updateSimulatedExam(id, updateData);

      res.status(200).json({
        message: 'Simulado atualizado com sucesso',
        data: updatedExam,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Exclui um simulado
   */
  deleteSimulatedExam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { id } = req.params;

      // Verificar se o simulado existe
      const simulatedExam = await this.simulatedExamService.getSimulatedExamById(id);
      if (!simulatedExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar permissão de exclusão
      if (simulatedExam.createdBy !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError(403, 'Você não tem permissão para excluir este simulado');
      }

      await this.simulatedExamService.deleteSimulatedExam(id);

      res.status(200).json({
        message: 'Simulado excluído com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista simulados do usuário
   */
  listUserSimulatedExams = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      console.log('🚀 Received request for listUserSimulatedExams - LATEST VERSION');
      const userId = this.getAuthenticatedUserId(req);
      console.log('👤 User ID:', userId);
      const { limit, page, status, difficulty, orderBy, orderDirection, startAfter } = req.query;

      // Buscar tanto simulados criados pelo usuário quanto simulados públicos
      console.log('🔍 Buscando simulados do usuário e públicos...');
      const [userSimulados, publicSimulados] = await Promise.all([
        // Simulados criados pelo usuário
        this.simulatedExamService.listSimulatedExams({
          limit: limit ? parseInt(limit as string) : undefined,
          page: page ? parseInt(page as string) : undefined,
          status: status as SimulatedExamStatus,
          difficulty: difficulty as SimulatedExamDifficulty,
          createdBy: userId,
          orderBy: orderBy as string,
          orderDirection: orderDirection as 'asc' | 'desc',
          startAfter: startAfter as string,
        }),
        // Simulados públicos ou MedPulse
        this.simulatedExamService.listSimulatedExams({
          limit: limit ? parseInt(limit as string) : undefined,
          page: page ? parseInt(page as string) : undefined,
          status: status as SimulatedExamStatus,
          difficulty: difficulty as SimulatedExamDifficulty,
          isPublic: true,
          orderBy: orderBy as string,
          orderDirection: orderDirection as 'asc' | 'desc',
          startAfter: startAfter as string,
        })
      ]);

      // Combinar os resultados
      const allSimulados = [...(userSimulados.exams || []), ...(publicSimulados.exams || [])];
      
      console.log('📊 Simulados encontrados:', {
        user: userSimulados.exams?.length || 0,
        public: publicSimulados.exams?.length || 0,
        total: allSimulados.length
      });
      
      console.log('🔧 Preparando resultado para resposta...');

      // Adicionar informações de classificação para o frontend
      const simuladosWithType = allSimulados.map((simulado: any) => ({
        ...simulado,
        isMedPulse: simulado.isPublic || simulado.createdBy !== userId,
        userStatus: 'nao-iniciado' // TODO: Implementar lógica de status do usuário
      }));

      const result = {
        items: simuladosWithType,
        total: allSimulados.length,
        page: 1,
        totalPages: 1
      };

      console.log('✅ Enviando resposta com', result.items.length, 'simulados');

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      console.error('❌ Erro no listUserSimulatedExams:', error);
      next(error);
    }
  };

  /**
   * Lista simulados públicos
   */
  listPublicSimulatedExams = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        limit,
        page,
        status,
        difficulty,
        filterIds,
        tags,
        query,
        orderBy,
        orderDirection,
        startAfter,
      } = req.query;

      // Converter arrays em strings
      const parsedFilterIds = filterIds
        ? Array.isArray(filterIds)
          ? (filterIds as string[])
          : [filterIds as string]
        : undefined;

      const parsedTags = tags
        ? Array.isArray(tags)
          ? (tags as string[])
          : [tags as string]
        : undefined;

      const result = await this.simulatedExamService.listSimulatedExams({
        limit: limit ? parseInt(limit as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        status: (status as SimulatedExamStatus) || SimulatedExamStatus.PUBLISHED,
        difficulty: difficulty as SimulatedExamDifficulty,
        isPublic: true,
        filterIds: parsedFilterIds,
        tags: parsedTags,
        query: query as string,
        orderBy: orderBy as string,
        orderDirection: orderDirection as 'asc' | 'desc',
        startAfter: startAfter as string,
      });

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Inicia um simulado
   */
  startSimulatedExam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { id: examId } = req.params;
      const { ipAddress, device, browser } = req.body;

      // Verificar se o simulado existe
      const simulatedExam = await this.simulatedExamService.getSimulatedExamById(examId);
      if (!simulatedExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar se o usuário tem permissão para acessar o simulado
      if (simulatedExam.createdBy !== userId && !simulatedExam.isPublic) {
        throw new AppError('Você não tem permissão para acessar este simulado', 403);
      }

      // Verificar se o simulado está publicado
      if (simulatedExam.status !== SimulatedExamStatus.PUBLISHED) {
        throw new AppError('Este simulado não está disponível para realização', 400);
      }

      const startData: StartSimulatedExamPayload = {
        examId,
        userId,
        ipAddress,
        device,
        browser,
      };

      const result = await this.simulatedExamService.startSimulatedExam(startData);

      res.status(200).json({
        message: 'Simulado iniciado com sucesso',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Submete uma resposta para uma questão do simulado
   */
  submitAnswer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { resultId, questionId, answerId, timeSpent } = req.body;

      // Verificar se o resultado existe
      const result = await this.simulatedExamService.getSimulatedExamResultById(resultId);
      if (!result) {
        throw new AppError('Resultado de simulado não encontrado', 404);
      }

      // Verificar se o usuário é o dono do resultado
      if (result.userId !== userId) {
        throw new AppError(
          'Você não tem permissão para submeter respostas para este simulado',
          403,
        );
      }

      const answerData: SubmitSimulatedExamAnswerPayload = {
        resultId,
        questionId,
        answerId,
        timeSpent,
      };

      const answer = await this.simulatedExamService.submitAnswer(answerData);

      res.status(200).json({
        message: 'Resposta submetida com sucesso',
        data: answer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Finaliza um simulado
   */
  finishSimulatedExam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { resultId } = req.body;

      // Verificar se o resultado existe
      const result = await this.simulatedExamService.getSimulatedExamResultById(resultId);
      if (!result) {
        throw new AppError('Resultado de simulado não encontrado', 404);
      }

      // Verificar se o usuário é o dono do resultado
      if (result.userId !== userId) {
        throw new AppError('Você não tem permissão para finalizar este simulado', 403);
      }

      const finishData: FinishSimulatedExamPayload = {
        resultId,
      };

      const finalResult = await this.simulatedExamService.finishSimulatedExam(finishData);

      res.status(200).json({
        message: 'Simulado finalizado com sucesso',
        data: finalResult,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtém o resultado de um simulado
   */
  getSimulatedExamResult = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { id } = req.params;

      const result = await this.simulatedExamService.getSimulatedExamResultById(id);
      if (!result) {
        throw new AppError('Resultado de simulado não encontrado', 404);
      }

      // Verificar se o usuário é o dono do resultado ou um administrador
      if (result.userId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Você não tem permissão para acessar este resultado', 403);
      }

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista resultados de simulados de um usuário
   */
  listUserSimulatedExamResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { limit, page, orderBy, orderDirection, startAfter } = req.query;

      const results = await this.simulatedExamService.listUserSimulatedExamResults(userId, {
        limit: limit ? parseInt(limit as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        orderBy: orderBy as string,
        orderDirection: orderDirection as 'asc' | 'desc',
        startAfter: startAfter as string,
      });

      res.status(200).json({
        data: results,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtém estatísticas de simulados de um usuário
   */
  getUserSimulatedExamStatistics = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);

      const statistics = await this.simulatedExamService.getUserSimulatedExamStatistics(userId);

      res.status(200).json({
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };
}
