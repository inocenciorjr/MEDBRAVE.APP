import { Request, Response, NextFunction } from 'express';
import { ISimulatedExamService } from '../interfaces/ISimulatedExamService';
import {
  SimulatedExamStatus,
  SimulatedExamDifficulty,
  CreateSimulatedExamPayload,
  UpdateSimulatedExamPayload,
  StartSimulatedExamPayload,
  SubmitSimulatedExamAnswerPayload,
} from '../types';
import AppError from '../../../utils/AppError';

/**
 * Controlador para operações relacionadas a simulados
 */
export class SimulatedExamController {
  private simulatedExamService: ISimulatedExamService;
  private questionService: any; // IQuestionService
  private questionHistoryService: any; // IQuestionHistoryService

  constructor(
    simulatedExamService: ISimulatedExamService,
    questionService?: any,
    questionHistoryService?: any
  ) {
    this.simulatedExamService = simulatedExamService;
    this.questionService = questionService;
    this.questionHistoryService = questionHistoryService;
  }

  /**
   * Verifica se o usuário está autenticado
   * @private
   */
  private getAuthenticatedUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Usuário não autenticado', 401);
    }
    return userId;
  }

  /**
   * Cria um novo simulado
   */
  createSimulatedExam = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const {
        title,
        description,
        instructions,
        timeLimit,
        time_limit_minutes,
        questions,
        difficulty,
        filterIds,
        filter_ids,
        subFilterIds,
        sub_filter_ids,
        status,
        isPublic,
        is_public,
        tags,
        startMessage,
        endMessage,
        randomize,
        settings,
      } = req.body;

      console.log('[SimulatedExamController] Dados recebidos:', {
        timeLimit,
        time_limit_minutes,
        title,
        questionsCount: questions?.length
      });

      const simulatedExamData: CreateSimulatedExamPayload = {
        title,
        description,
        instructions,
        timeLimit: time_limit_minutes ?? timeLimit ?? 0,
        questions,
        difficulty: difficulty || SimulatedExamDifficulty.MEDIUM,
        filterIds: filter_ids ?? filterIds,
        subFilterIds: sub_filter_ids ?? subFilterIds,
        status,
        isPublic: is_public ?? isPublic,
        tags,
        startMessage,
        endMessage,
        randomize: settings?.randomizeQuestions ?? randomize,
        createdBy: userId,
      };

      const simulatedExam =
        await this.simulatedExamService.createSimulatedExam(simulatedExamData);

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
  getSimulatedExamById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { id } = req.params;

      const simulatedExam =
        await this.simulatedExamService.getSimulatedExamById(id);

      if (!simulatedExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar permissão de acesso
      // Supabase retorna em snake_case, então verificamos ambos os campos
      const examCreator = (simulatedExam as any).created_by || simulatedExam.createdBy;
      const examUserId = (simulatedExam as any).user_id;
      const isPublic = (simulatedExam as any).is_public !== undefined ? (simulatedExam as any).is_public : simulatedExam.isPublic;
      const isAssignedByMentor = (simulatedExam as any).assigned_by_mentor === true;

      // Usuário tem acesso se:
      // 1. É o criador do simulado
      // 2. O simulado é público
      // 3. É admin
      // 4. O simulado foi atribuído a ele por um mentor (user_id = userId e assigned_by_mentor = true)
      const isCreator = examCreator === userId;
      const isAssignedToUser = examUserId === userId && isAssignedByMentor;

      if (!isCreator && !isPublic && !isAssignedToUser && req.user?.user_role !== 'ADMIN') {
        throw new AppError(
          'Você não tem permissão para acessar este simulado',
          403,
        );
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
  updateSimulatedExam = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
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
      const existingExam =
        await this.simulatedExamService.getSimulatedExamById(id);
      if (!existingExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar permissão de edição
      const examCreator = (existingExam as any).created_by || (existingExam as any).user_id || existingExam.createdBy;
      if (examCreator !== userId && req.user?.user_role !== 'ADMIN') {
        throw new AppError(
          'Você não tem permissão para editar este simulado',
          403,
        );
      }

      // Verificar se o status pode ser alterado
      if (
        status === SimulatedExamStatus.PUBLISHED &&
        existingExam.status !== SimulatedExamStatus.PUBLISHED &&
        (!questions || questions.length === 0)
      ) {
        throw new AppError(
          'Não é possível publicar um simulado sem questões',
          400,
        );
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

      const updatedExam = await this.simulatedExamService.updateSimulatedExam(
        id,
        updateData,
      );

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
  deleteSimulatedExam = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { id } = req.params;

      // Verificar se o simulado existe
      const simulatedExam =
        await this.simulatedExamService.getSimulatedExamById(id);
      if (!simulatedExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar permissão de exclusão
      const examCreator = (simulatedExam as any).created_by || (simulatedExam as any).user_id || simulatedExam.createdBy;
      if (examCreator !== userId && req.user?.user_role !== 'ADMIN') {
        throw new AppError(
          'Você não tem permissão para excluir este simulado',
          403,
        );
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
      console.log(
        '🚀 Received request for listUserSimulatedExams - LATEST VERSION',
      );
      const userId = this.getAuthenticatedUserId(req);
      console.log('👤 User ID:', userId);
      const {
        limit,
        page,
        status,
        difficulty,
        orderBy,
        orderDirection,
        startAfter,
      } = req.query;

      // Buscar simulados do usuário e públicos
      console.log('🔍 Buscando simulados do usuário e públicos...');
      const result = await this.simulatedExamService.listSimulatedExams({
        createdBy: userId,
        limit: limit ? parseInt(limit as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        status: status as SimulatedExamStatus,
        difficulty: difficulty as SimulatedExamDifficulty,
        orderBy: orderBy as string,
        orderDirection: orderDirection as 'asc' | 'desc',
        startAfter: startAfter as string,
      });

      console.log('📊 Simulados encontrados:', {
        total: result.exams.length,
      });

      console.log('🔧 Preparando resultado para resposta...');

      // Adicionar informações de classificação para o frontend
      const simuladosWithType = result.exams.map((simulado: any) => ({
        ...simulado,
        isMedPulse: simulado.is_public || simulado.created_by !== userId,
        userStatus: 'nao-iniciado', // TODO: Implementar lógica de status do usuário
      }));

      const response = {
        exams: simuladosWithType,
        total: result.totalCount,
        page: 1,
        totalPages: 1,
      };

      console.log('✅ Enviando resposta com', response.exams.length, 'simulados');

      res.status(200).json({
        data: response,
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
        status:
          (status as SimulatedExamStatus) || SimulatedExamStatus.PUBLISHED,
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
  startSimulatedExam = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { id: examId } = req.params;
      const { ipAddress, device, browser, customTimeLimitMinutes } = req.body;

      // Verificar se o simulado existe
      const simulatedExam =
        await this.simulatedExamService.getSimulatedExamById(examId);
      if (!simulatedExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar se o usuário tem permissão para acessar o simulado
      const examCreator = (simulatedExam as any).created_by || simulatedExam.createdBy;
      const examUserId = (simulatedExam as any).user_id;
      const isPublic = (simulatedExam as any).is_public !== undefined ? (simulatedExam as any).is_public : simulatedExam.isPublic;
      const isAssignedByMentor = (simulatedExam as any).assigned_by_mentor === true;

      // Usuário tem acesso se:
      // 1. É o criador do simulado
      // 2. O simulado é público
      // 3. O simulado foi atribuído a ele por um mentor
      const isCreator = examCreator === userId;
      const isAssignedToUser = examUserId === userId && isAssignedByMentor;

      if (!isCreator && !isPublic && !isAssignedToUser) {
        throw new AppError(
          'Você não tem permissão para acessar este simulado',
          403,
        );
      }

      // Verificar se o simulado está publicado
      if (simulatedExam.status !== SimulatedExamStatus.PUBLISHED) {
        throw new AppError(
          'Este simulado não está disponível para realização',
          400,
        );
      }

      // Verificar se o simulado está disponível (agendamento)
      const availableAt = (simulatedExam as any).available_at;
      if (availableAt) {
        const availableDate = new Date(availableAt);
        const now = new Date();
        if (availableDate > now) {
          const formattedDate = availableDate.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          throw new AppError(
            `Este simulado estará disponível a partir de ${formattedDate}`,
            400,
          );
        }
      }

      // Se o simulado não tem tempo definido e o usuário passou um tempo customizado, atualizar
      const currentTimeLimit = (simulatedExam as any).time_limit_minutes;
      if ((!currentTimeLimit || currentTimeLimit === 0) && customTimeLimitMinutes && customTimeLimitMinutes > 0) {
        // Validar tempo máximo de 10 horas (600 minutos)
        const validTimeLimit = Math.min(customTimeLimitMinutes, 600);
        await this.simulatedExamService.updateSimulatedExam(examId, {
          time_limit_minutes: validTimeLimit
        } as any);
        console.log(`⏱️ Tempo customizado aplicado: ${validTimeLimit} minutos`);
      }

      const startData: StartSimulatedExamPayload = {
        examId,
        userId,
        ipAddress,
        device,
        browser,
      };

      const result =
        await this.simulatedExamService.startSimulatedExam(startData);

      console.log('✅ Resultado do startSimulatedExam:', result);
      console.log('✅ ID do resultado:', result?.id);

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
  submitAnswer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { resultId, questionId, answerId, timeSpent } = req.body;

      // Verificar se o resultado existe
      const result =
        await this.simulatedExamService.getSimulatedExamResultById(resultId);
      if (!result) {
        throw new AppError('Resultado de simulado não encontrado', 404);
      }

      // Verificar se o usuário é o dono do resultado
      // O banco retorna user_id em snake_case
      const resultUserId = (result as any).user_id || result.userId;
      if (resultUserId !== userId) {
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
   * Atualiza uma resposta individual durante o simulado
   */
  updateSimulatedExamAnswer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { id: resultId } = req.params;
      const { questionId, answerId } = req.body;

      console.log('[UpdateAnswer] Atualizando resposta:', {
        resultId,
        questionId,
        answerId
      });

      // Verificar se o resultado existe
      const result =
        await this.simulatedExamService.getSimulatedExamResultById(resultId);
      if (!result) {
        throw new AppError('Resultado de simulado não encontrado', 404);
      }

      // Verificar se o usuário é o dono do resultado
      const resultUserId = (result as any).user_id || result.userId;
      if (resultUserId !== userId) {
        throw new AppError(
          'Você não tem permissão para atualizar este simulado',
          403,
        );
      }

      // Verificar se o simulado ainda está em andamento
      if ((result as any).status === 'completed') {
        throw new AppError(
          'Não é possível atualizar respostas de um simulado já finalizado',
          400,
        );
      }

      // Atualizar a resposta no objeto answers
      const currentAnswers = (result as any).answers || {};

      if (answerId === null || answerId === undefined) {
        // Remover resposta
        delete currentAnswers[questionId];
      } else {
        // Adicionar/atualizar resposta
        currentAnswers[questionId] = answerId;
      }

      // Atualizar no banco
      await this.simulatedExamService.updateSimulatedExamResult(resultId, {
        answers: currentAnswers
      });

      res.status(200).json({
        message: 'Resposta atualizada com sucesso',
        data: { questionId, answerId }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Finaliza um simulado
   */
  finishSimulatedExam = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { resultId, answers, timeSpent } = req.body;

      console.log('[FinishSimulatedExam] Recebendo dados:', {
        resultId,
        answersCount: answers ? Object.keys(answers).length : 0,
        timeSpent
      });

      // Verificar se o resultado existe
      const result =
        await this.simulatedExamService.getSimulatedExamResultById(resultId);
      if (!result) {
        throw new AppError('Resultado de simulado não encontrado', 404);
      }

      // Verificar se o usuário é o dono do resultado
      // O banco retorna user_id em snake_case
      const resultUserId = (result as any).user_id || result.userId;
      if (resultUserId !== userId) {
        throw new AppError(
          'Você não tem permissão para finalizar este simulado',
          403,
        );
      }

      // Verificar se o simulado já foi finalizado (evitar duplicação)
      if ((result as any).status === 'completed') {
        console.log('[FinishSimulatedExam] Simulado já finalizado, retornando resultado existente');
        res.status(200).json({
          message: 'Simulado já finalizado',
          data: result,
        });
        return;
      }

      // Buscar o simulado para saber o total de questões
      const examId = (result as any).simulated_exam_id;
      const exam = await this.simulatedExamService.getSimulatedExamById(examId);
      const totalQuestions = exam?.questions?.length || 0;

      // Se respostas foram enviadas, usar elas; senão usar as já salvas
      const answersData = (answers && Object.keys(answers).length > 0)
        ? answers
        : ((result as any).answers || {});

      // Calcular score baseado nas respostas
      let correctCount = 0;
      let incorrectCount = 0;

      // Buscar todas as questões do simulado EM PARALELO para verificar respostas corretas
      if (this.questionService) {
        const questionIds = (exam?.questions || []).map((q: any) => 
          (typeof q === 'string') ? q : (q.questionId || q.id)
        );

        // Buscar todas as questões em paralelo
        const questionsPromises = questionIds.map((qId: string) => 
          this.questionService!.getQuestionById(qId).catch(() => null)
        );
        const questions = await Promise.all(questionsPromises);

        // Criar mapa de questões para acesso rápido
        const questionsMap = new Map<string, any>();
        questions.forEach((q, idx) => {
          if (q) questionsMap.set(questionIds[idx], q);
        });

        // Calcular score
        for (const questionId of questionIds) {
          const userAnswer = (answersData as Record<string, string>)[questionId];
          const question = questionsMap.get(questionId);

          if (userAnswer && question) {
            if (userAnswer === question.correct_alternative_id) {
              correctCount++;
            } else {
              incorrectCount++;
            }
          } else {
            // Se não respondeu ou questão não encontrada, conta como erro
            incorrectCount++;
          }
        }
      }

      // Score como porcentagem (0-100)
      const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

      console.log('[FinishSimulatedExam] Resultado calculado:', {
        correctCount,
        incorrectCount,
        totalQuestions,
        score: `${score.toFixed(1)}%`
      });

      // Registrar tentativas no histórico de questões EM PARALELO
      if (this.questionHistoryService && exam?.questions) {
        console.log('[FinishSimulatedExam] Registrando tentativas no histórico...');

        // Criar array de promises para processar em paralelo
        const attemptPromises = exam.questions.map(async (q) => {
          const questionId = (typeof q === 'string') ? (q as string) : ((q as any).questionId || (q as any).id);
          const userAnswer = (answersData as Record<string, string>)[questionId];

          try {
            if (userAnswer) {
              // Questão respondida - verificar se está correta
              const question = await this.questionService?.getQuestionById(questionId);
              const isCorrect = question && userAnswer === question.correct_alternative_id;

              console.log(`[FinishSimulatedExam] Questão ${questionId}:`, {
                userAnswer,
                correctAnswer: question?.correct_alternative_id,
                isCorrect
              });

              // Registrar tentativa
              await this.questionHistoryService.recordQuestionAttempt({
                user_id: userId,
                question_id: questionId,
                selected_alternative_id: userAnswer,
                is_correct: isCorrect || false,
                study_mode: 'simulated_exam',
                was_focus_mode: false,
                simulated_exam_id: examId,
              });

              return { questionId, success: true, isCorrect, answered: true };
            } else {
              // Questão NÃO respondida - registrar no histórico com selected_alternative_id = null
              // Isso permite mostrar "Não respondida" no histórico
              console.log(`[FinishSimulatedExam] Questão ${questionId} não respondida - registrando como não respondida`);

              await this.questionHistoryService.recordQuestionAttempt({
                user_id: userId,
                question_id: questionId,
                selected_alternative_id: '', // String vazia indica não respondida
                is_correct: false,
                study_mode: 'simulated_exam',
                was_focus_mode: false,
                simulated_exam_id: examId,
              });

              return { questionId, success: true, isCorrect: false, answered: false };
            }
          } catch (error) {
            console.error(`[FinishSimulatedExam] Erro ao registrar tentativa da questão ${questionId}:`, error);
            return { questionId, success: false, error, answered: !!userAnswer };
          }
        });

        // Aguardar todas as tentativas serem registradas em paralelo
        const results = await Promise.all(attemptPromises);
        const successCount = results.filter(r => r?.success).length;
        const answeredCount = results.filter(r => r?.answered).length;
        const unansweredCount = results.filter(r => r?.success && !r?.answered).length;
        console.log(`[FinishSimulatedExam] ${successCount}/${results.length} tentativas registradas com sucesso`);
        console.log(`[FinishSimulatedExam] ${answeredCount} respondidas, ${unansweredCount} não respondidas (marcadas como erro)`);
      }

      const finalResult =
        await this.simulatedExamService.finishSimulatedExam({
          resultId,
          answers: answersData,
          correctCount,
          incorrectCount,
          score,
          timeSpent,
        });

      // Atualizar mentor_exam_assignments se o simulado foi atribuído por um mentor
      if (exam && (exam as any).mentor_exam_id && (exam as any).assigned_by_mentor) {
        try {
          console.log('[FinishSimulatedExam] Atualizando mentor_exam_assignments...');
          await this.simulatedExamService.updateMentorExamAssignment(
            (exam as any).mentor_exam_id,
            userId,
            {
              status: 'completed',
              completed_at: new Date().toISOString(),
              score: score,
              correct_count: correctCount,
              incorrect_count: incorrectCount,
              time_spent_seconds: timeSpent || 0,
            }
          );
          console.log('[FinishSimulatedExam] mentor_exam_assignments atualizado com sucesso');
        } catch (error) {
          console.error('[FinishSimulatedExam] Erro ao atualizar mentor_exam_assignments:', error);
          // Não falhar a operação principal
        }
      }

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

      const result =
        await this.simulatedExamService.getSimulatedExamResultById(id);
      if (!result) {
        throw new AppError('Resultado de simulado não encontrado', 404);
      }

      // Verificar se o usuário é o dono do resultado ou um administrador
      // O banco retorna user_id em snake_case
      const resultUserId = (result as any).user_id || result.userId;
      if (resultUserId !== userId && req.user?.user_role !== 'ADMIN') {
        throw new AppError(
          'Você não tem permissão para acessar este resultado',
          403,
        );
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

      const results =
        await this.simulatedExamService.listUserSimulatedExamResults(userId, {
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

      const statistics =
        await this.simulatedExamService.getUserSimulatedExamStatistics(userId);

      res.status(200).json({
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };
}
