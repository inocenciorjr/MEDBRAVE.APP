import { Request, Response, NextFunction } from 'express';
import { MentorSimuladoService } from '../services/MentorSimuladoService';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';

/**
 * Controller para simulados personalizados do mentor
 */
export class MentorSimuladoController {
  private service: MentorSimuladoService;

  constructor() {
    this.service = new MentorSimuladoService();
  }

  // ============================================================================
  // MENTORIAS E MENTORADOS
  // ============================================================================

  /**
   * Lista mentorias do mentor com dados dos mentorados (legado)
   */
  getMentorships = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      const mentorships = await this.service.getMentorMentorships(userId);

      return res.status(200).json({
        success: true,
        data: mentorships
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar mentorias', error);
      next(error);
    }
  };

  /**
   * Lista programas do mentor com mentorados agrupados
   */
  getMentorPrograms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      const data = await this.service.getMentorProgramsWithMentees(userId);

      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar programas', error);
      next(error);
    }
  };

  // ============================================================================
  // QUESTÕES AUTORAIS
  // ============================================================================

  /**
   * Cria uma questão autoral
   */
  createQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      // Verificar se é mentor
      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Apenas mentores podem criar questões', 403);
      }

      const { content, alternatives, correctAnswer, explanation, subFilterIds, difficulty } = req.body;

      // Validações
      if (!content?.trim()) {
        throw new AppError('Conteúdo da questão é obrigatório', 400);
      }

      if (!alternatives || alternatives.length < 2) {
        throw new AppError('Pelo menos 2 alternativas são obrigatórias', 400);
      }

      if (!correctAnswer) {
        throw new AppError('Resposta correta é obrigatória', 400);
      }

      const question = await this.service.createMentorQuestion(userId, {
        content,
        alternatives,
        correctAnswer,
        explanation,
        subFilterIds,
        difficulty
      });

      return res.status(201).json({
        success: true,
        data: question
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao criar questão autoral', error);
      next(error);
    }
  };

  /**
   * Lista questões do mentor
   */
  getQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.service.getMentorQuestions(userId, page, limit);

      return res.status(200).json({
        success: true,
        data: {
          questions: result.questions,
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar questões', error);
      next(error);
    }
  };

  // ============================================================================
  // SIMULADOS
  // ============================================================================

  /**
   * Cria um simulado personalizado
   */
  createSimulado = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Apenas mentores podem criar simulados', 403);
      }

      const {
        name,
        description,
        visibility,
        selectedMentorshipIds,
        selectedUserIds,
        questions,
        timeLimit,
        shuffleQuestions,
        showResults,
        scheduledAt
      } = req.body;

      // Validações
      if (!name?.trim()) {
        throw new AppError('Nome do simulado é obrigatório', 400);
      }

      if (!questions || questions.length === 0) {
        throw new AppError('Adicione pelo menos uma questão', 400);
      }

      // Validar data de agendamento
      if (scheduledAt) {
        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
          throw new AppError('Data de agendamento inválida', 400);
        }
      }

      const simulado = await this.service.createSimulado(userId, {
        name,
        description,
        visibility: visibility || 'private',
        selectedMentorshipIds: selectedMentorshipIds || [],
        selectedUserIds: selectedUserIds || [],
        questions,
        timeLimitMinutes: timeLimit,
        shuffleQuestions,
        showResults,
        scheduledAt
      });

      return res.status(201).json({
        success: true,
        data: simulado
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao criar simulado', error);
      next(error);
    }
  };

  /**
   * Lista simulados do mentor
   */
  getSimulados = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      const result = await this.service.getSimulados(userId, { page, limit, status });

      return res.status(200).json({
        success: true,
        data: {
          simulados: result.simulados,
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar simulados', error);
      next(error);
    }
  };

  /**
   * Obtém um simulado pelo ID
   */
  getSimuladoById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const simulado = await this.service.getSimuladoById(id);

      if (!simulado) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar acesso
      if (simulado.mentor_id !== userId && simulado.visibility === 'private') {
        throw new AppError('Acesso negado', 403);
      }

      if (simulado.visibility === 'selected' && 
          simulado.mentor_id !== userId && 
          !simulado.allowed_user_ids.includes(userId)) {
        throw new AppError('Acesso negado', 403);
      }

      return res.status(200).json({
        success: true,
        data: simulado
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar simulado', error);
      next(error);
    }
  };

  /**
   * Atualiza um simulado
   */
  updateSimulado = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      const simulado = await this.service.updateSimulado(id, userId, req.body);

      if (!simulado) {
        throw new AppError('Simulado não encontrado ou sem permissão', 404);
      }

      return res.status(200).json({
        success: true,
        data: simulado
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar simulado', error);
      next(error);
    }
  };

  /**
   * Deleta um simulado
   */
  deleteSimulado = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      const deleted = await this.service.deleteSimulado(id, userId);

      if (!deleted) {
        throw new AppError('Simulado não encontrado ou sem permissão', 404);
      }

      return res.status(200).json({
        success: true,
        message: 'Simulado deletado com sucesso'
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao deletar simulado', error);
      next(error);
    }
  };

  /**
   * Altera o status do simulado
   */
  changeStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { status } = req.body;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      if (!['draft', 'active', 'closed'].includes(status)) {
        throw new AppError('Status inválido', 400);
      }

      const simulado = await this.service.changeStatus(id, userId, status);

      if (!simulado) {
        throw new AppError('Simulado não encontrado ou sem permissão', 404);
      }

      return res.status(200).json({
        success: true,
        data: simulado
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao alterar status', error);
      next(error);
    }
  };

  // ============================================================================
  // INSCRIÇÕES E ATRIBUIÇÕES
  // ============================================================================

  /**
   * Inscreve usuário em simulado público
   */
  subscribeToExam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const assignment = await this.service.subscribeToPublicExam(id, userId);

      return res.status(201).json({
        success: true,
        data: assignment
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao inscrever em simulado', error);
      next(error);
    }
  };

  /**
   * Lista atribuições do usuário (simulados que ele precisa fazer)
   */
  getMyAssignments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const assignments = await this.service.getUserAssignments(userId);

      return res.status(200).json({
        success: true,
        data: assignments
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar atribuições', error);
      next(error);
    }
  };

  /**
   * Lista atribuições de um simulado (progresso dos participantes)
   */
  getSimuladoAssignments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      const assignments = await this.service.getSimuladoAssignments(id, userId);

      return res.status(200).json({
        success: true,
        data: assignments
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar atribuições do simulado', error);
      next(error);
    }
  };

  /**
   * Sincroniza atribuições após edição do simulado
   */
  syncAssignments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { userIds, mentorshipIds } = req.body;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      await this.service.syncSimuladoAssignments(id, userId, userIds, mentorshipIds);

      return res.status(200).json({
        success: true,
        message: 'Atribuições sincronizadas com sucesso'
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao sincronizar atribuições', error);
      next(error);
    }
  };

  /**
   * Obtém analytics detalhados do simulado
   */
  getSimuladoAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      const analytics = await this.service.getSimuladoAnalytics(id, userId);

      return res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao obter analytics', error);
      next(error);
    }
  };

  /**
   * Obtém performance detalhada de um usuário no simulado
   */
  getUserPerformance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mentorId = req.user?.id;
      const { id, userId } = req.params;

      if (!mentorId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (req.user?.user_role !== 'MENTOR') {
        throw new AppError('Acesso negado', 403);
      }

      const performance = await this.service.getUserPerformanceInSimulado(id, userId, mentorId);

      return res.status(200).json({
        success: true,
        data: performance
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao obter performance do usuário', error);
      next(error);
    }
  };
}
