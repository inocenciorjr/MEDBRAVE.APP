import { firestore } from 'firebase-admin';
import { Timestamp, FieldValue, Query, DocumentData, CollectionReference } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateSimulatedExamPayload,
  FinishSimulatedExamPayload,
  ListSimulatedExamsOptions,
  PaginatedSimulatedExamResultsResult,
  PaginatedSimulatedExamsResult,
  SimulatedExam,
  SimulatedExamAnswer,
  SimulatedExamDifficulty,
  SimulatedExamQuestion,
  SimulatedExamResult,
  SimulatedExamStatus,
  SimulatedExamStatistics,
  StartSimulatedExamPayload,
  SubmitSimulatedExamAnswerPayload,
  UpdateSimulatedExamPayload,
} from '../types';
import { ISimulatedExamService } from '../interfaces/ISimulatedExamService';
import logger from '../../../utils/logger';
import AppError from '../../../utils/AppError';

const SIMULATED_EXAMS_COLLECTION = 'simulatedExams';
const SIMULATED_EXAM_RESULTS_COLLECTION = 'simulatedExamResults';
const QUESTIONS_COLLECTION = 'questions';

/**
 * Implementação do serviço de simulados usando Firebase
 */
export class FirebaseSimulatedExamService implements ISimulatedExamService {
  private db: firestore.Firestore;

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  /**
   * Cria um novo simulado
   * @param data Dados do simulado
   */
  async createSimulatedExam(data: CreateSimulatedExamPayload): Promise<SimulatedExam> {
    try {
      console.log('🔍 [FirebaseSimulatedExamService] Dados recebidos:', JSON.stringify(data, null, 2));
      
      const id = uuidv4();
      const now = Timestamp.now();

      // Debug das questões recebidas
      console.log('🔍 [FirebaseSimulatedExamService] Questões recebidas:');
      console.log('- Tipo:', typeof data.questions);
      console.log('- É array:', Array.isArray(data.questions));
      console.log('- Quantidade:', data.questions?.length || 0);
      console.log('- Primeiras 3 questões:', data.questions?.slice(0, 3));

      // Processar questões e calcular totais - filtrar questões inválidas
      const validQuestions = data.questions.filter(q => {
        console.log('🔍 Validando questão:', q);
        const isValid = q && q.questionId && q.questionId.trim() !== '';
        console.log('- É válida:', isValid);
        return isValid;
      });
      
      console.log('✅ [FirebaseSimulatedExamService] Questões válidas encontradas:', validQuestions.length);
      
      if (validQuestions.length === 0) {
        throw new AppError('Nenhuma questão válida fornecida', 400);
      }

      const questions: SimulatedExamQuestion[] = validQuestions.map(q => ({
        ...q,
        id: uuidv4(),
      }));

      const totalQuestions = questions.length;
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
      const questionIds = questions.map(q => q.questionId).filter(id => id && id.trim() !== '');

      const simulatedExam: SimulatedExam = {
        id,
        title: data.title,
        description: data.description,
        timeLimit: data.timeLimit,
        questionIds,
        questions,
        totalQuestions,
        totalPoints,
        difficulty: data.difficulty,
        filterIds: data.filterIds || [],
        subFilterIds: data.subFilterIds || [],
        status: data.status || SimulatedExamStatus.DRAFT,
        isPublic: data.isPublic !== undefined ? data.isPublic : false,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
        publishedAt: data.status === SimulatedExamStatus.PUBLISHED ? now : undefined,
        tags: data.tags || [],
        randomize: data.randomize !== undefined ? data.randomize : true,
      };

      // Adicionar campos opcionais apenas se não forem undefined
      if (data.instructions !== undefined && data.instructions !== null && data.instructions.trim() !== '') {
        simulatedExam.instructions = data.instructions;
      }
      if (data.startMessage !== undefined && data.startMessage !== null && data.startMessage.trim() !== '') {
        simulatedExam.startMessage = data.startMessage;
      }
      if (data.endMessage !== undefined && data.endMessage !== null && data.endMessage.trim() !== '') {
        simulatedExam.endMessage = data.endMessage;
      }

      // Função para limpar valores undefined de forma profunda
      const cleanUndefinedDeep = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.filter(item => item !== undefined && item !== null).map(cleanUndefinedDeep);
        } else if (obj !== null && typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined && value !== null) {
              if (typeof value === 'string' && value.trim() === '') {
                // Pular strings vazias
                continue;
              }
              cleaned[key] = cleanUndefinedDeep(value);
            }
          }
          return cleaned;
        }
        return obj;
      };

      // Limpar o objeto de forma profunda antes de salvar
      const cleanedSimulatedExam = cleanUndefinedDeep(simulatedExam);

      console.log('🧹 Dados limpos para salvar:', JSON.stringify(cleanedSimulatedExam, null, 2));

      await this.db.collection(SIMULATED_EXAMS_COLLECTION).doc(id).set(cleanedSimulatedExam);
      return simulatedExam;
    } catch (error) {
      logger.error('Erro ao criar simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar simulado', 500);
    }
  }

  /**
   * Obtém um simulado pelo ID
   * @param id ID do simulado
   */
  async getSimulatedExamById(id: string): Promise<SimulatedExam | null> {
    try {
      if (!id) {
        throw new AppError('ID do simulado é obrigatório', 400);
      }

      const docRef = this.db.collection(SIMULATED_EXAMS_COLLECTION).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        logger.warn(`Simulado com ID "${id}" não encontrado`);
        return null;
      }

      const simulatedExamData = docSnap.data() as SimulatedExam;
      return { ...simulatedExamData, id: docSnap.id };
    } catch (error) {
      logger.error('Erro ao buscar simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar simulado', 500);
    }
  }

  /**
   * Atualiza um simulado
   * @param id ID do simulado
   * @param data Dados para atualização
   */
  async updateSimulatedExam(id: string, data: UpdateSimulatedExamPayload): Promise<SimulatedExam> {
    try {
      const docRef = this.db.collection(SIMULATED_EXAMS_COLLECTION).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new AppError(`Simulado com ID "${id}" não encontrado`, 404);
      }

      const currentData = docSnap.data() as SimulatedExam;

      const updateData: Record<string, any> = {
        updatedAt: Timestamp.now(),
      };

      // Atualizar apenas os campos que foram fornecidos
      if (data.title !== undefined) {
        updateData.title = data.title;
      }
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      if (data.instructions !== undefined) {
        updateData.instructions = data.instructions;
      }
      if (data.timeLimit !== undefined) {
        updateData.timeLimit = data.timeLimit;
      }
      if (data.difficulty !== undefined) {
        updateData.difficulty = data.difficulty;
      }
      if (data.filterIds !== undefined) {
        updateData.filterIds = data.filterIds;
      }
      if (data.subFilterIds !== undefined) {
        updateData.subFilterIds = data.subFilterIds;
      }
      if (data.isPublic !== undefined) {
        updateData.isPublic = data.isPublic;
      }
      if (data.tags !== undefined) {
        updateData.tags = data.tags;
      }
      if (data.startMessage !== undefined) {
        updateData.startMessage = data.startMessage;
      }
      if (data.endMessage !== undefined) {
        updateData.endMessage = data.endMessage;
      }
      if (data.randomize !== undefined) {
        updateData.randomize = data.randomize;
      }

      // Tratamento especial para status e publicação
      if (data.status !== undefined && data.status !== currentData.status) {
        updateData.status = data.status;

        // Se estiver sendo publicado pela primeira vez
        if (
          data.status === SimulatedExamStatus.PUBLISHED &&
          currentData.status !== SimulatedExamStatus.PUBLISHED &&
          !currentData.publishedAt
        ) {
          updateData.publishedAt = Timestamp.now();
        }
      }

      // Tratamento especial para questões
      if (data.questions !== undefined) {
        // Gerar IDs para as novas questões
        const questions = data.questions.map(q => ({
          ...q,
          id: uuidv4(),
        }));

        // Extrair IDs das questões para o array questionIds
        const questionIds = questions.map(q => q.questionId);

        updateData.questions = questions;
        updateData.questionIds = questionIds;
        updateData.totalQuestions = questions.length;
        updateData.totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      }

      await docRef.update(updateData);

      // Obter o documento atualizado
      const updatedDocSnap = await docRef.get();
      const updatedData = updatedDocSnap.data() as SimulatedExam;

      logger.info(`Simulado atualizado com sucesso: ${id}`);

      return { ...updatedData, id: updatedDocSnap.id };
    } catch (error) {
      logger.error(`Erro ao atualizar simulado ${id}:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar simulado', 500);
    }
  }

  /**
   * Exclui um simulado
   * @param id ID do simulado
   */
  async deleteSimulatedExam(id: string): Promise<void> {
    try {
      const docRef = this.db.collection(SIMULATED_EXAMS_COLLECTION).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new AppError(`Simulado com ID "${id}" não encontrado`, 404);
      }

      // Excluir o simulado e seus resultados em uma transação
      await this.db.runTransaction(async transaction => {
        // Obter resultados do simulado
        const resultsQuery = await this.db
          .collection(SIMULATED_EXAM_RESULTS_COLLECTION)
          .where('examId', '==', id)
          .get();

        // Excluir resultados
        resultsQuery.docs.forEach(doc => {
          transaction.delete(doc.ref);
        });

        // Excluir o simulado
        transaction.delete(docRef);
      });

      logger.info(`Simulado excluído com sucesso: ${id}`);
    } catch (error) {
      logger.error(`Erro ao excluir simulado ${id}:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao excluir simulado', 500);
    }
  }

  /**
   * Lista simulados com filtros e paginação
   * @param options Opções de listagem e filtros
   */
  async listSimulatedExams(
    options: ListSimulatedExamsOptions = {},
  ): Promise<PaginatedSimulatedExamsResult> {
    try {
      const {
        limit = 10,
        page = 1,
        status,
        difficulty,
        createdBy,
        filterIds,
        subFilterIds,
        tags,
        isPublic,
        query: searchTerm,
        orderBy = 'createdAt',
        orderDirection = 'desc',
        startAfter,
      } = options;

      if (limit < 1 || limit > 100) {
        throw new AppError('Limite deve estar entre 1 e 100', 400);
      }

      if (page < 1) {
        throw new AppError('Página deve ser maior que 0', 400);
      }

      let query: Query<DocumentData> = this.db.collection(SIMULATED_EXAMS_COLLECTION);

      // Aplicar filtros básicos
      if (status) {
        query = query.where('status', '==', status);
      }

      if (difficulty) {
        query = query.where('difficulty', '==', difficulty);
      }

      if (createdBy) {
        query = query.where('createdBy', '==', createdBy);
      }

      if (typeof isPublic === 'boolean') {
        query = query.where('isPublic', '==', isPublic);
      }

      // Aplicar filtros de array
      if (tags && tags.length > 0) {
        // Firestore só permite um único operador array-contains por consulta
        query = query.where('tags', 'array-contains', tags[0]);
        if (tags.length > 1) {
          logger.warn(
            `Multiple tags provided but only using first tag: ${tags[0]} due to Firestore limitations`,
          );
        }
      }

      if (filterIds && filterIds.length > 0) {
        // Usar array-contains-any para filterIds
        query = query.where('filterIds', 'array-contains-any', filterIds);
      }

      // Aplicar ordenação
      const sortField =
        orderBy === 'title' ? 'title' : orderBy === 'updatedAt' ? 'updatedAt' : 'createdAt';
      query = query.orderBy(sortField, orderDirection);

      // Aplicar paginação com startAfter, se fornecido
      if (startAfter) {
        const startAfterDoc = await this.db
          .collection(SIMULATED_EXAMS_COLLECTION)
          .doc(startAfter)
          .get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      // Aplicar limite com um item a mais para verificar se há próxima página
      const queryLimit = limit + 1;
      query = query.limit(queryLimit);

      // Executar consulta
      const snapshot = await query.get();

      // Processar resultados
      let exams = snapshot.docs.map(doc => ({ ...(doc.data() as SimulatedExam), id: doc.id }));

      // Aplicar filtro secundário de subFilterIds, se não pudemos aplicar no Firestore
      if (subFilterIds && subFilterIds.length > 0) {
        exams = exams.filter(exam => exam.subFilterIds.some(id => subFilterIds.includes(id)));
      }

      // Aplicar filtro de texto, se fornecido (fazemos isso no lado do cliente porque Firestore não tem pesquisa de texto completo)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        exams = exams.filter(
          exam =>
            exam.title.toLowerCase().includes(term) ||
            (exam.description && exam.description.toLowerCase().includes(term)),
        );
      }

      // Verificar se há mais resultados
      const hasMore = exams.length > limit;

      // Remover o item extra, se houver
      if (hasMore) {
        exams = exams.slice(0, limit);
      }

      // Contar o total (em produção, poderia ser otimizado)
      let countQuery: Query<DocumentData, DocumentData> | CollectionReference<DocumentData, DocumentData> = this.db.collection(SIMULATED_EXAMS_COLLECTION);

      if (status) {
        countQuery = countQuery.where('status', '==', status);
      }
      if (createdBy) {
        countQuery = countQuery.where('createdBy', '==', createdBy);
      }
      if (typeof isPublic === 'boolean') {
        countQuery = countQuery.where('isPublic', '==', isPublic);
      }

      const countSnapshot = await countQuery.count().get();
      const totalCount = countSnapshot.data().count;

      return {
        exams,
        totalCount,
        hasMore,
        nextStartAfter: hasMore ? exams[exams.length - 1].id : undefined,
      };
    } catch (error) {
      logger.error('Erro ao listar simulados:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar simulados', 500);
    }
  }

  /**
   * Inicia um simulado para um usuário
   * @param data Dados para iniciar o simulado
   */
  async startSimulatedExam(data: StartSimulatedExamPayload): Promise<SimulatedExamResult> {
    try {
      const { examId, userId, ipAddress, device, browser } = data;

      // Verificar se o simulado existe
      const simulatedExam = await this.getSimulatedExamById(examId);
      if (!simulatedExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar se o simulado está publicado
      if (simulatedExam.status !== SimulatedExamStatus.PUBLISHED) {
        throw new AppError('Este simulado não está disponível para realização', 400);
      }

      // Criar um novo resultado de simulado
      const resultId = uuidv4();
      const now = Timestamp.now();

      const newResult: SimulatedExamResult = {
        id: resultId,
        examId,
        userId,
        startedAt: now,
        finishedAt: undefined,
        score: 0,
        totalPoints: simulatedExam.totalPoints,
        correctAnswers: 0,
        totalQuestions: simulatedExam.totalQuestions,
        percentageScore: 0,
        timeSpent: 0,
        answers: [],
        status: 'in_progress',
        ipAddress,
        device,
        browser,
      };

      await this.db.collection(SIMULATED_EXAM_RESULTS_COLLECTION).doc(resultId).set(newResult);

      logger.info(`Simulado iniciado: ${examId} por usuário ${userId}`);

      return newResult;
    } catch (error) {
      logger.error('Erro ao iniciar simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao iniciar simulado', 500);
    }
  }

  /**
   * Submete uma resposta para uma questão do simulado
   * @param data Dados da resposta
   */
  async submitAnswer(data: SubmitSimulatedExamAnswerPayload): Promise<SimulatedExamAnswer> {
    try {
      const { resultId, questionId, answerId, timeSpent } = data;

      // Verificar se o resultado existe
      const resultRef = this.db.collection(SIMULATED_EXAM_RESULTS_COLLECTION).doc(resultId);
      const resultSnap = await resultRef.get();

      if (!resultSnap.exists) {
        throw new AppError('Resultado de simulado não encontrado', 404);
      }

      const result = resultSnap.data() as SimulatedExamResult;

      // Verificar se o simulado ainda está em andamento
      if (result.status !== 'in_progress') {
        throw new AppError('Este simulado já foi finalizado', 400);
      }

      // Verificar se o simulado existe
      const simulatedExam = await this.getSimulatedExamById(result.examId);
      if (!simulatedExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Encontrar a questão no simulado
      const question = simulatedExam.questions.find(q => q.questionId === questionId);
      if (!question) {
        throw new AppError('Questão não encontrada neste simulado', 404);
      }

      // Obter os detalhes da questão original
      const questionSnap = await this.db.collection(QUESTIONS_COLLECTION).doc(questionId).get();
      if (!questionSnap.exists) {
        throw new AppError('Questão original não encontrada', 404);
      }

      const originalQuestion = questionSnap.data();

      if (!originalQuestion) {
        throw new Error('originalQuestion is undefined');
      }
      const isCorrect = originalQuestion.correctAlternativeId === answerId;

      // Calcular pontos
      const points = isCorrect ? question.points : 0;

      // Criar a resposta
      const answer: SimulatedExamAnswer = {
        questionId,
        answerId,
        isCorrect,
        points,
        timeSpent,
        answeredAt: Timestamp.now(),
      };

      // Adicionar a resposta ao resultado
      await resultRef.update({
        answers: FieldValue.arrayUnion(answer),
        updatedAt: Timestamp.now(),
      });

      logger.info(`Resposta submetida para simulado ${resultId}, questão ${questionId}`);

      return answer;
    } catch (error) {
      logger.error('Erro ao submeter resposta:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao submeter resposta', 500);
    }
  }

  /**
   * Finaliza uma tentativa de simulado
   * @param data Dados para finalizar o simulado
   */
  async finishSimulatedExam(data: FinishSimulatedExamPayload): Promise<SimulatedExamResult> {
    try {
      const { resultId } = data;

      // Verificar se o resultado existe
      const resultRef = this.db.collection(SIMULATED_EXAM_RESULTS_COLLECTION).doc(resultId);
      const resultSnap = await resultRef.get();

      if (!resultSnap.exists) {
        throw new AppError('Resultado de simulado não encontrado', 404);
      }

      const result = resultSnap.data() as SimulatedExamResult;

      // Verificar se o simulado ainda está em andamento
      if (result.status !== 'in_progress') {
        throw new AppError('Este simulado já foi finalizado', 400);
      }

      // Calcular estatísticas
      const correctAnswers = result.answers.filter(a => a.isCorrect).length;
      const score = result.answers.reduce((sum, a) => sum + a.points, 0);
      const percentageScore = Math.round((score / result.totalPoints) * 100);
      const timeSpent = Math.floor((Date.now() - result.startedAt.toMillis()) / 1000);

      // Atualizar o resultado
      const updatedResult: Partial<SimulatedExamResult> = {
        finishedAt: Timestamp.now(),
        score,
        correctAnswers,
        percentageScore,
        timeSpent,
        status: 'completed',
      };

      await resultRef.update(updatedResult);

      logger.info(`Simulado finalizado: ${resultId}`);

      // Retornar o resultado completo
      return {
        ...result,
        ...updatedResult,
      } as SimulatedExamResult;
    } catch (error) {
      logger.error('Erro ao finalizar simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao finalizar simulado', 500);
    }
  }

  /**
   * Obtém um resultado de simulado pelo ID
   * @param id ID do resultado
   */
  async getSimulatedExamResultById(id: string): Promise<SimulatedExamResult | null> {
    try {
      if (!id) {
        throw new AppError('ID do resultado é obrigatório', 400);
      }

      const docRef = this.db.collection(SIMULATED_EXAM_RESULTS_COLLECTION).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        logger.warn(`Resultado de simulado com ID "${id}" não encontrado`);
        return null;
      }

      const resultData = docSnap.data() as SimulatedExamResult;
      return { ...resultData, id: docSnap.id };
    } catch (error) {
      logger.error('Erro ao buscar resultado de simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar resultado de simulado', 500);
    }
  }

  /**
   * Lista resultados de simulados de um usuário
   * @param userId ID do usuário
   * @param options Opções de listagem e filtros
   */
  async listUserSimulatedExamResults(
    userId: string,
    options: ListSimulatedExamsOptions = {},
  ): Promise<PaginatedSimulatedExamResultsResult> {
    try {
      const {
        limit = 10,
        page = 1,
        orderBy = 'startedAt',
        orderDirection = 'desc',
        startAfter,
      } = options;

      if (limit < 1 || limit > 100) {
        throw new AppError('Limite deve estar entre 1 e 100', 400);
      }

      if (page < 1) {
        throw new AppError('Página deve ser maior que 0', 400);
      }

      let query: Query<DocumentData> = this.db
        .collection(SIMULATED_EXAM_RESULTS_COLLECTION)
        .where('userId', '==', userId);

      // Aplicar ordenação
      const sortField = orderBy === 'finishedAt' ? 'finishedAt' : 'startedAt';
      query = query.orderBy(sortField, orderDirection);

      // Aplicar paginação com startAfter, se fornecido
      if (startAfter) {
        const startAfterDoc = await this.db
          .collection(SIMULATED_EXAM_RESULTS_COLLECTION)
          .doc(startAfter)
          .get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      // Aplicar limite com um item a mais para verificar se há próxima página
      const queryLimit = limit + 1;
      query = query.limit(queryLimit);

      // Executar consulta
      const snapshot = await query.get();

      // Processar resultados
      let results = snapshot.docs.map(doc => ({
        ...(doc.data() as SimulatedExamResult),
        id: doc.id,
      }));

      // Verificar se há mais resultados
      const hasMore = results.length > limit;

      // Remover o item extra, se houver
      if (hasMore) {
        results = results.slice(0, limit);
      }

      // Contar o total (em produção, poderia ser otimizado)
      const countQuery = this.db
        .collection(SIMULATED_EXAM_RESULTS_COLLECTION)
        .where('userId', '==', userId);
      const countSnapshot = await countQuery.count().get();
      const totalCount = countSnapshot.data().count;

      return {
        results,
        totalCount,
        hasMore,
        nextStartAfter: hasMore ? results[results.length - 1].id : undefined,
      };
    } catch (error) {
      logger.error('Erro ao listar resultados de simulados:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar resultados de simulados', 500);
    }
  }

  /**
   * Obtém estatísticas de simulados de um usuário
   * @param userId ID do usuário
   */
  async getUserSimulatedExamStatistics(userId: string): Promise<SimulatedExamStatistics> {
    try {
      // Buscar todos os resultados de simulados do usuário
      const snapshot = await this.db
        .collection(SIMULATED_EXAM_RESULTS_COLLECTION)
        .where('userId', '==', userId)
        .where('status', '==', 'completed')
        .get();

      const results = snapshot.docs.map(doc => doc.data() as SimulatedExamResult);

      // Calcular estatísticas
      const totalExams = results.length;
      const completedExams = results.length;

      // Se não houver exames concluídos, retornar estatísticas vazias
      if (completedExams === 0) {
        return {
          totalExams: 0,
          completedExams: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 0,
          averageTimeSpent: 0,
          examsByDifficulty: {
            [SimulatedExamDifficulty.EASY]: 0,
            [SimulatedExamDifficulty.MEDIUM]: 0,
            [SimulatedExamDifficulty.HARD]: 0,
            [SimulatedExamDifficulty.MIXED]: 0,
          },
        };
      }

      // Calcular médias e extremos
      const scores = results.map(r => r.percentageScore);
      const timeSpent = results.map(r => r.timeSpent);

      const averageScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
      const bestScore = Math.max(...scores);
      const worstScore = Math.min(...scores);
      const averageTimeSpent = Math.round(
        timeSpent.reduce((sum, t) => sum + t, 0) / timeSpent.length,
      );

      // Contar simulados por dificuldade
      const examsByDifficulty: Record<SimulatedExamDifficulty, number> = {
        [SimulatedExamDifficulty.EASY]: 0,
        [SimulatedExamDifficulty.MEDIUM]: 0,
        [SimulatedExamDifficulty.HARD]: 0,
        [SimulatedExamDifficulty.MIXED]: 0,
      };

      // Obter os simulados correspondentes aos resultados
      const examIds = [...new Set(results.map(r => r.examId))];
      const examsSnapshot = await this.db
        .collection(SIMULATED_EXAMS_COLLECTION)
        .where(firestore.FieldPath.documentId(), 'in', examIds)
        .get();

      const exams = examsSnapshot.docs.map(doc => doc.data() as SimulatedExam);

      // Contar por dificuldade
      exams.forEach(exam => {
        examsByDifficulty[exam.difficulty] = (examsByDifficulty[exam.difficulty] || 0) + 1;
      });

      // Obter o resultado mais recente
      const sortedResults = [...results].sort(
        (a, b) => b.finishedAt!.toMillis() - a.finishedAt!.toMillis(),
      );

      const lastResult = sortedResults[0];
      const lastExamResult = lastResult
        ? {
            examId: lastResult.examId,
            examTitle: exams.find(e => e.id === lastResult.examId)?.title || 'Simulado',
            score: lastResult.percentageScore,
            completedAt: lastResult.finishedAt!,
          }
        : undefined;

      return {
        totalExams,
        completedExams,
        averageScore,
        bestScore,
        worstScore,
        averageTimeSpent,
        examsByDifficulty,
        lastExamResult,
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de simulados:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao obter estatísticas de simulados', 500);
    }
  }
}
