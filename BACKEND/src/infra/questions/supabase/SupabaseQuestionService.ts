import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateQuestionPayload,
  ListQuestionsOptions,
  PaginatedQuestionsResult,
  Question,
  QuestionAlternative,
  QuestionStatus,
  UpdateQuestionPayload,
  QuestionDifficulty,
} from '../../../domain/questions/types';
import { IQuestionService } from '../../../domain/questions/interfaces/IQuestionService';
import logger from '../../../utils/logger';
import AppError from '../../../utils/AppError';
import { generateQuestionId } from '../../../utils/idGenerator';
import { supabase } from '../../../config/supabase';

const QUESTIONS_TABLE = 'questions';

/**
 * Implementação do serviço de questões usando Supabase
 */
export class SupabaseQuestionService implements IQuestionService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  /**
   * Cria uma nova questão
   * @param questionData Dados da questão
   */
  async createQuestion(questionData: CreateQuestionPayload): Promise<Question> {
    try {
      // Gerar ID baseado no enunciado da questão
      const id = generateQuestionId(questionData.statement);
      const now = new Date().toISOString();

      // Garantir que as alternativas tenham IDs
      const alternatives = questionData.alternatives.map((alt) => ({
        ...alt,
        id: alt.id || uuidv4(),
      }));

      // Encontrar a resposta correta
      const correctAlternative = alternatives.find(alt => alt.isCorrect);
      const correctAnswer = correctAlternative ? correctAlternative.text : '';

      // Remover duplicatas dos filtros e subfiltros
      const filterIds = (questionData as any).filterIds || [];
      const subFilterIds = (questionData as any).subFilterIds || [];
      const uniqueFilterIds = [...new Set(filterIds)]; // Remove duplicatas
      const uniqueSubFilterIds = [...new Set(subFilterIds)]; // Remove duplicatas
      
      console.log(`📊 Filtros: ${filterIds.length} → ${uniqueFilterIds.length} (após remover duplicatas)`);
      console.log(`📊 Subfiltros: ${subFilterIds.length} → ${uniqueSubFilterIds.length} (após remover duplicatas)`);

      // Mapear para a estrutura da tabela do Supabase
      const dbQuestion = {
        id,
        title: questionData.title || '',
        content: questionData.statement,
        question_type: 'multiple_choice',
        options: alternatives.map(alt => ({
          id: alt.id,
          text: alt.text,
          order: alt.order
        })),
        correct_answer: correctAnswer,
        explanation: questionData.explanation || '',
        professor_comment: (questionData as any).professorComment || '', // ✅ snake_case para o banco
        difficulty: this.mapDifficultyToNumber(questionData.difficulty),
        tags: questionData.tags || [],
        filter_ids: uniqueFilterIds, // ✅ Salvar filtros SEM duplicatas
        sub_filter_ids: uniqueSubFilterIds, // ✅ Salvar subfiltros SEM duplicatas
        status: this.mapStatusToDb(questionData.status),
        is_public: questionData.status === QuestionStatus.PUBLISHED,
        is_annulled: (questionData as any).isAnnulled || (questionData as any).is_annulled || false, // ✅ Salvar is_annulled
        is_outdated: (questionData as any).isOutdated || (questionData as any).is_outdated || false, // ✅ Salvar is_outdated
        user_id: questionData.created_by,
        created_at: now,
        updated_at: now,
      };

      // Usar upsert para evitar erro se a questão já existir
      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .upsert([dbQuestion], { 
          onConflict: 'id',
          ignoreDuplicates: false // Atualiza se já existir
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar/atualizar questão:', error);
        throw new AppError('Erro ao criar/atualizar questão', 500);
      }

      logger.info(`Questão criada com sucesso: ${id}`);
      return this.mapToQuestion(data);
    } catch (error) {
      logger.error('Erro ao criar questão:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao criar questão', 500);
    }
  }

  /**
   * Busca uma questão por ID
   * @param id ID da questão
   */
  async getQuestionById(id: string): Promise<Question | null> {
    try {
      if (!id) {
        throw new AppError('ID da questão é obrigatório', 400);
      }

      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Erro ao buscar questão:', error);
        throw new AppError('Erro ao buscar questão', 500);
      }

      return this.mapToQuestion(data);
    } catch (error) {
      logger.error('Erro ao buscar questão:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao buscar questão', 500);
    }
  }

  /**
   * Busca múltiplas questões por IDs
   * @param ids Array de IDs das questões
   */
  async getBulkQuestions(ids: string[]): Promise<Question[]> {
    try {
      if (!ids || ids.length === 0) {
        // console.log('[SupabaseQuestionService] getBulkQuestions - Nenhum ID fornecido');
        return [];
      }

      if (ids.length > 1000) {
        throw new AppError('Máximo de 1000 questões por consulta', 400);
      }

      // console.log('[SupabaseQuestionService] Buscando questões com IDs:', ids.length);
      // console.log('[SupabaseQuestionService] Primeiros 3 IDs:', ids.slice(0, 3));

      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .select('*')
        .in('id', ids);

      if (error) {
        logger.error('Erro ao buscar questões em lote:', error);
        throw new AppError('Erro ao buscar questões', 500);
      }

      // console.log('[SupabaseQuestionService] Questões encontradas no DB:', data?.length || 0);
      // if (data && data.length > 0) {
      //   console.log('[SupabaseQuestionService] Primeira questão encontrada:', data[0].id);
      // }

      return data.map((item) => this.mapToQuestion(item));
    } catch (error) {
      logger.error('Erro ao buscar questões em lote:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao buscar questões', 500);
    }
  }

  /**
   * Atualiza uma questão
   * @param id ID da questão
   * @param updateData Dados para atualização
   */
  async updateQuestion(
    id: string,
    updateData: UpdateQuestionPayload,
  ): Promise<Question | null> {
    try {
      if (!id) {
        throw new AppError('ID da questão é obrigatório', 400);
      }

      const now = new Date().toISOString();
      const updatePayload = {
        ...updateData,
        updated_at: now,
      };

      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Erro ao atualizar questão:', error);
        throw new AppError('Erro ao atualizar questão', 500);
      }

      logger.info(`Questão atualizada: ${id}`);
      return this.mapToQuestion(data);
    } catch (error) {
      logger.error('Erro ao atualizar questão:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao atualizar questão', 500);
    }
  }

  /**
   * Remove uma questão
   * @param id ID da questão
   */
  async deleteQuestion(id: string): Promise<Question | null> {
    try {
      if (!id) {
        throw new AppError('ID da questão é obrigatório', 400);
      }

      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Erro ao deletar questão:', error);
        throw new AppError('Erro ao deletar questão', 500);
      }

      logger.info(`Questão deletada: ${id}`);
      return this.mapToQuestion(data);
    } catch (error) {
      logger.error('Erro ao deletar questão:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao deletar questão', 500);
    }
  }

  /**
   * Altera o status de uma questão
   * @param id ID da questão
   * @param status Novo status
   */
  async changeStatus(id: string, status: string): Promise<Question | null> {
    try {
      if (!id) {
        throw new AppError('ID da questão é obrigatório', 400);
      }

      if (!['draft', 'published', 'archived'].includes(status)) {
        throw new AppError('Status inválido', 400);
      }

      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Erro ao alterar status da questão:', error);
        throw new AppError('Erro ao alterar status da questão', 500);
      }

      logger.info(`Status da questão ${id} alterado para: ${status}`);
      return this.mapToQuestion(data);
    } catch (error) {
      logger.error('Erro ao alterar status da questão:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao alterar status da questão', 500);
    }
  }

  /**
   * Lista questões com paginação e filtros
   * @param options Opções de listagem
   */
  async listQuestions(
    options: ListQuestionsOptions = {},
  ): Promise<PaginatedQuestionsResult> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        difficulty,
        tags,
        search,
        sort_by = 'created_at',
        sort_order = 'desc',
        filter_ids,
        sub_filter_ids,
        exclude_anuladas = false,
        exclude_desatualizadas = false,
      } = options;

      if (limit <= 0 || limit > 100) {
        throw new AppError('Limite deve estar entre 1 e 100', 400);
      }

      if (page <= 0) {
        throw new AppError('Página deve ser maior que 0', 400);
      }

      let query = this.client
        .from(QUESTIONS_TABLE)
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (status) {
        query = query.eq('status', status);
      }

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      if (filter_ids && filter_ids.length > 0) {
        query = query.in('filter_id', filter_ids);
      }

      if (sub_filter_ids && sub_filter_ids.length > 0) {
        query = query.in('sub_filter_id', sub_filter_ids);
      }

      if (exclude_anuladas) {
        query = query.neq('status', 'anulada');
      }

      if (exclude_desatualizadas) {
        query = query.neq('status', 'desatualizada');
      }

      if (search) {
        // Usar Full Text Search com GIN index para melhor performance (100k+ questões)
        query = query.textSearch('searchable_text', search, {
          type: 'websearch',
          config: 'portuguese'
        });
      }

      // Ordenação
      const ascending = sort_order === 'asc';
      query = query.order(sort_by, { ascending });

      // Paginação
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Erro ao listar questões:', error);
        throw new AppError('Erro ao listar questões', 500);
      }

      const questions = data.map((item) => this.mapToQuestion(item));
      const total_count = count || 0;
      const total_pages = Math.ceil(total_count / limit);

      return {
        items: questions,
        total: total_count,
        page: page,
        limit: limit,
        totalPages: total_pages,
      };
    } catch (error) {
      logger.error('Erro ao listar questões:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao listar questões', 500);
    }
  }

  /**
   * Pesquisa questões
   * @param options Opções de pesquisa
   */
  async searchQuestions(
    options: ListQuestionsOptions,
  ): Promise<PaginatedQuestionsResult> {
    return this.listQuestions(options);
  }

  /**
   * Avalia uma questão
   * @param id ID da questão
   * @param rating Nota da avaliação
   * @param reviewerId ID do revisor
   * @param reviewNotes Notas da revisão
   */
  async rateQuestion(
    id: string,
    rating: number,
    reviewerId: string,
    _reviewNotes?: string,
  ): Promise<Question | null> {
    try {
      if (!id || !reviewerId) {
        throw new AppError(
          'ID da questão e ID do revisor são obrigatórios',
          400,
        );
      }

      if (rating < 1 || rating > 5) {
        throw new AppError('Avaliação deve estar entre 1 e 5', 400);
      }

      const now = new Date().toISOString();
      const updateData = {
        rating,
        reviewCount: 1, // Simplificado - em produção seria incrementado
        lastReviewedAt: now,
        updatedAt: now,
      };

      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Erro ao avaliar questão:', error);
        throw new AppError('Erro ao avaliar questão', 500);
      }

      return this.mapToQuestion(data);
    } catch (error) {
      logger.error('Erro ao avaliar questão:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao avaliar questão', 500);
    }
  }

  /**
   * Verifica se uma questão existe
   * @param id ID da questão
   */
  async questionExists(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .select('id')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Erro ao verificar existência da questão:', error);
        throw new AppError('Erro ao verificar questão', 500);
      }

      return !!data;
    } catch (error) {
      logger.error('Erro ao verificar existência da questão:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao verificar questão', 500);
    }
  }

  /**
   * Adiciona tags a uma questão
   * @param id ID da questão
   * @param tags Tags para adicionar
   */
  async addTags(id: string, tags: string[]): Promise<Question | null> {
    try {
      if (!id || !tags || tags.length === 0) {
        throw new AppError('ID da questão e tags são obrigatórios', 400);
      }

      // Buscar questão atual
      const question = await this.getQuestionById(id);
      if (!question) {
        return null;
      }

      // Combinar tags existentes com novas
      const existingTags = question.tags || [];
      const newTags = Array.from(new Set([...existingTags, ...tags]));

      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .update({ tags: newTags, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao adicionar tags:', error);
        throw new AppError('Erro ao adicionar tags', 500);
      }

      return this.mapToQuestion(data);
    } catch (error) {
      logger.error('Erro ao adicionar tags:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao adicionar tags', 500);
    }
  }

  /**
   * Remove tags de uma questão
   * @param id ID da questão
   * @param tags Tags para remover
   */
  async removeTags(id: string, tags: string[]): Promise<Question | null> {
    try {
      if (!id || !tags || tags.length === 0) {
        throw new AppError('ID da questão e tags são obrigatórios', 400);
      }

      // Buscar questão atual
      const question = await this.getQuestionById(id);
      if (!question) {
        return null;
      }

      // Remover tags especificadas
      const existingTags = question.tags || [];
      const newTags = existingTags.filter((tag) => !tags.includes(tag));

      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .update({ tags: newTags, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao remover tags:', error);
        throw new AppError('Erro ao remover tags', 500);
      }

      return this.mapToQuestion(data);
    } catch (error) {
      logger.error('Erro ao remover tags:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao remover tags', 500);
    }
  }

  /**
   * Altera o status de uma questão
   * @param id ID da questão
   * @param status Novo status
   */
  

  /**
   * Lista questões por filtros
   * @param filter_ids IDs dos filtros
   * @param sub_filter_ids IDs dos subfiltros
   * @param options Opções de listagem
   */
  async listQuestionsByFilters(
    filter_ids: string[] | null,
    sub_filter_ids: string[] | null,
    options: ListQuestionsOptions = {},
  ): Promise<PaginatedQuestionsResult> {
    return this.listQuestions({
      ...options,
      filter_ids: filter_ids || undefined,
      sub_filter_ids: sub_filter_ids || undefined,
    });
  }

  /**
   * Lista questões relacionadas
   * @param questionId ID da questão
   * @param limit Limite de resultados
   */
  async listRelatedQuestions(
    questionId: string,
    limit: number = 10,
  ): Promise<Question[]> {
    try {
      // Buscar questão original para obter tags e filtros
      const originalQuestion = await this.getQuestionById(questionId);
      if (!originalQuestion) {
        return [];
      }

      let query = this.client
        .from(QUESTIONS_TABLE)
        .select('*')
        .neq('id', questionId)
        .limit(limit);

      // Buscar por tags similares
      if (originalQuestion.tags && originalQuestion.tags.length > 0) {
        query = query.overlaps('tags', originalQuestion.tags);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao buscar questões relacionadas:', error);
        throw new AppError('Erro ao buscar questões relacionadas', 500);
      }

      return data.map((item) => this.mapToQuestion(item));
    } catch (error) {
      logger.error('Erro ao buscar questões relacionadas:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao buscar questões relacionadas', 500);
    }
  }

  /**
   * Obtém questões de uma lista
   * @param listId ID da lista
   */
  async getQuestionsFromList(listId: string): Promise<Question[]> {
    try {
      // console.log('[SupabaseQuestionService] getQuestionsFromList - listId:', listId);
      
      // Buscar a lista
      const { data: list, error: listError } = await this.client
        .from('question_lists')
        .select('questions')
        .eq('id', listId)
        .single();

      if (listError || !list) {
        console.error('[SupabaseQuestionService] Erro ao buscar lista:', listError);
        return [];
      }

      const questionIds = list.questions || [];
      // console.log('[SupabaseQuestionService] IDs das questões na lista:', questionIds.length);

      if (questionIds.length === 0) {
        return [];
      }

      // Buscar as questões
      return this.getBulkQuestions(questionIds);
    } catch (error) {
      logger.error('[SupabaseQuestionService] Erro ao buscar questões da lista:', error);
      return [];
    }
  }

  /**
   * Obtém um batch de questões de uma lista
   * @param listId ID da lista
   * @param offset Índice inicial
   * @param limit Quantidade de questões
   */
  async getQuestionsFromListBatch(listId: string, offset: number, limit: number): Promise<{ questions: Question[], total: number }> {
    try {
      // console.log('[SupabaseQuestionService] getQuestionsFromListBatch:', { listId, offset, limit });
      
      // Buscar a lista
      const { data: list, error: listError } = await this.client
        .from('question_lists')
        .select('questions')
        .eq('id', listId)
        .single();

      if (listError || !list) {
        console.error('[SupabaseQuestionService] Erro ao buscar lista:', listError);
        return { questions: [], total: 0 };
      }

      const allQuestionIds = list.questions || [];
      const total = allQuestionIds.length;
      
      // Pegar apenas o batch solicitado
      const batchIds = allQuestionIds.slice(offset, offset + limit);
      
      if (batchIds.length === 0) {
        return { questions: [], total };
      }

      // Buscar as questões do batch
      const questions = await this.getBulkQuestions(batchIds);
      
      // console.log('[SupabaseQuestionService] Batch retornado:', questions.length, 'de', total);
      return { questions, total };
    } catch (error) {
      logger.error('[SupabaseQuestionService] Erro ao buscar batch:', error);
      return { questions: [], total: 0 };
    }
  }

  /**
   * Conta questões com filtros
   * @param options Opções de contagem
   */
  async countQuestions(options: ListQuestionsOptions = {}): Promise<number> {
    try {
      const {
        status,
        difficulty,
        tags,
        filter_ids,
        sub_filter_ids,
        exclude_anuladas = false,
        exclude_desatualizadas = false,
      } = options;

      let query = this.client
        .from(QUESTIONS_TABLE)
        .select('*', { count: 'exact', head: true });

      // Aplicar filtros
      if (status) {
        query = query.eq('status', status);
      }

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      if (filter_ids && filter_ids.length > 0) {
        query = query.in('filter_id', filter_ids);
      }

      if (sub_filter_ids && sub_filter_ids.length > 0) {
        query = query.in('sub_filter_id', sub_filter_ids);
      }

      if (exclude_anuladas) {
        query = query.neq('status', 'anulada');
      }

      if (exclude_desatualizadas) {
        query = query.neq('status', 'desatualizada');
      }

      const { count, error } = await query;

      if (error) {
        logger.error('Erro ao contar questões:', error);
        throw new AppError('Erro ao contar questões', 500);
      }

      return count || 0;
    } catch (error) {
      logger.error('Erro ao contar questões:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Erro interno ao contar questões', 500);
    }
  }

  /**
   * Obtém performance do usuário por especialidade
   * @param userId ID do usuário
   */
  async getUserPerformanceBySpecialty(userId: string): Promise<any> {
    // Implementação simplificada - em produção seria mais complexa
    return {
      userId,
      specialties: [],
      overall: {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
      },
    };
  }

  /**
   * Conta questões em lote
   * @param requests Array de requisições de contagem
   */
  async batchCountQuestions(
    requests: Array<{
      id: string;
      isSubFilter: boolean;
      exclude_anuladas: boolean;
      exclude_desatualizadas: boolean;
    }>,
  ): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const request of requests) {
      try {
        const options: ListQuestionsOptions = {
          exclude_anuladas: request.exclude_anuladas,
          exclude_desatualizadas: request.exclude_desatualizadas,
        };

        if (request.isSubFilter) {
          options.sub_filter_ids = [request.id];
        } else {
          options.filter_ids = [request.id];
        }

        const count = await this.countQuestions(options);
        results[request.id] = count;
      } catch (error) {
        logger.error(`Erro ao contar questões para ${request.id}:`, error);
        results[request.id] = 0;
      }
    }

    return results;
  }

  /**
   * Cria contagens pré-calculadas
   */
  async createPreCalculatedCounts(): Promise<void> {
    // Implementação simplificada - em produção seria mais complexa
    logger.info('Contagens pré-calculadas criadas');
  }

  /**
   * Mapeia dificuldade para número (usado pela tabela do Supabase)
   */
  private mapDifficultyToNumber(difficulty: QuestionDifficulty): number {
    const map: Record<QuestionDifficulty, number> = {
      [QuestionDifficulty.VERY_EASY]: 0,
      [QuestionDifficulty.EASY]: 1,
      [QuestionDifficulty.MEDIUM]: 2,
      [QuestionDifficulty.HARD]: 3,
      [QuestionDifficulty.VERY_HARD]: 4,
    };
    return map[difficulty] ?? 2;
  }

  /**
   * Mapeia status para o formato do banco
   */
  private mapStatusToDb(status: QuestionStatus): string {
    const map: Record<QuestionStatus, string> = {
      [QuestionStatus.DRAFT]: 'draft',
      [QuestionStatus.PUBLISHED]: 'published',
      [QuestionStatus.ARCHIVED]: 'archived',
    };
    return map[status] || 'draft';
  }

  /**
   * Mapeia dados do banco para a entidade Question
   * @param data Dados do banco
   */
  private mapToQuestion(data: any): Question {
    // Mapear options de volta para alternatives
    const alternatives: QuestionAlternative[] = (data.options || []).map((opt: any, index: number) => ({
      id: opt.id || uuidv4(),
      text: opt.text,
      isCorrect: opt.text === data.correct_answer,
      explanation: null,
      order: opt.order !== undefined ? opt.order : index,
    }));

    return {
      id: data.id,
      title: data.title || '',
      statement: data.content || data.statement || '',
      alternatives,
      correct_alternative_id: alternatives.find(alt => alt.isCorrect)?.id,
      explanation: data.explanation || null,
      professorComment: data.professor_comment || null,
      difficulty: this.mapNumberToDifficulty(data.difficulty),
      difficulty_level: data.difficulty,
      filter_ids: data.filter_ids || [],
      sub_filter_ids: data.sub_filter_ids || [],
      tags: data.tags || [],
      source: data.source || null,
      year: data.year || null,
      status: this.mapDbToStatus(data.status),
      is_annulled: data.is_annulled || false,
      is_outdated: data.is_outdated || false,
      is_active: data.is_active !== false,
      review_count: data.review_count || 0,
      average_rating: data.average_rating || 0,
      rating: data.rating || 0,
      created_by: data.user_id || data.created_by || '',
      updated_by: data.updated_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      comments_allowed: data.comments_allowed,
      last_reviewed_at: data.last_reviewed_at || null,
      review_status: data.review_status,
      reviewer_id: data.reviewer_id,
      review_notes: data.review_notes,
      version: data.version,
      related_question_ids: data.related_question_ids || [],
      image_urls: data.image_urls || [],
      video_urls: data.video_urls || [],
      audio_urls: data.audio_urls || [],
      metadata: data.metadata || {},
    };
  }

  /**
   * Mapeia número para dificuldade
   */
  private mapNumberToDifficulty(difficulty: number): QuestionDifficulty {
    if (difficulty === 1) return QuestionDifficulty.EASY;
    if (difficulty === 3) return QuestionDifficulty.HARD;
    return QuestionDifficulty.MEDIUM;
  }

  /**
   * Mapeia status do banco para enum
   */
  private mapDbToStatus(status: string): QuestionStatus {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'PUBLISHED') return QuestionStatus.PUBLISHED;
    if (statusUpper === 'ARCHIVED') return QuestionStatus.ARCHIVED;
    return QuestionStatus.DRAFT;
  }

  // Cache simples para contagens
  

  

  async getQuestionStats(): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
  }> {
    try {
      const { data, error } = await this.client
        .from(QUESTIONS_TABLE)
        .select('status');

      if (error) {
        console.error('[SupabaseQuestionService] Supabase error:', error);
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      const stats = {
        total: data?.length || 0,
        published: data?.filter((q: any) => q.status === 'PUBLISHED').length || 0,
        draft: data?.filter((q: any) => q.status === 'DRAFT').length || 0,
        archived: data?.filter((q: any) => q.status === 'ARCHIVED').length || 0,
      };

      return stats;
    } catch (error: any) {
      console.error('[SupabaseQuestionService] Error getting stats:', error);
      throw new Error(`Erro ao obter estatísticas de questões: ${error.message}`);
    }
  }
}
