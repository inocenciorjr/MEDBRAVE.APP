import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../utils/logger';
import {
  ErrorNotebookEntry,
  CreateErrorNoteDTO,
  UpdateErrorNoteDTO,
  ErrorNoteReviewData,
  ErrorNoteDifficulty,
  GetUserErrorNotesOptions,
  GetUserErrorNotesResult,
  ErrorNotesStats,
  // Tipos antigos para compatibilidade
  ErrorNotebook,
  CreateErrorNotebookPayload,
  UpdateErrorNotebookPayload,
  ListErrorNotebooksOptions,
  PaginatedErrorNotebooksResult,
  ErrorNotebookStats,
} from '../../../domain/studyTools/errorNotebook/types';
// FSRSGrade import removed - using number for selfAssessment

/**
 * FASE 3: Sistema de Caderno de Erros - Implementação Supabase
 * Implementação completa conforme TODO.md
 *
 * FUNCIONALIDADES PRINCIPAIS:
 * - Criar anotações de erro com integração automática FSRS
 * - Preparar anotações para revisão
 * - Registrar revisões com auto-avaliação
 * - Listar e gerenciar anotações do usuário
 */
export class SupabaseErrorNotebookService {
  private supabase: SupabaseClient;
  private unifiedReviewService: any; // Será injetado para evitar dependência circular

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    // Dependências serão injetadas via setters para evitar circular dependency
  }

  /**
   * Injetar UnifiedReviewService para evitar dependência circular
   */
  setUnifiedReviewService(unifiedReviewService: any): void {
    this.unifiedReviewService = unifiedReviewService;
  }

  /**
   * Criar anotação de erro
   */
  async createErrorNote(data: CreateErrorNoteDTO): Promise<{
    entry: ErrorNotebookEntry;
    addedToReview: boolean;
  }> {
    try {
      // Validações
      if (!data.user_id) {
        throw AppError.badRequest('ID do usuário é obrigatório');
      }

      if (!data.question_id) {
        throw AppError.badRequest('ID da questão é obrigatório');
      }

      if (!data.user_note?.trim()) {
        throw AppError.badRequest('Anotação do usuário é obrigatória');
      }

      if (!data.user_explanation?.trim()) {
        throw AppError.badRequest('Explicação do usuário é obrigatória');
      }

      // Validar se usuário existe
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', data.user_id)
        .single();

      if (userError || !user) {
        throw AppError.notFound('Usuário não encontrado');
      }

      // Buscar dados da questão diretamente do Supabase
      let questionData = null;
      try {
        logger.info('Buscando questão:', { question_id: data.question_id });
        const { data: question, error: questionError } = await this.supabase
          .from('questions')
          .select('*')
          .eq('id', data.question_id)
          .single();

        if (questionError) {
          logger.error('Erro ao buscar questão:', questionError);
        } else if (question) {
          questionData = question;
          logger.info('Questão encontrada:', { 
            id: question.id, 
            hasContent: !!question.content,
            hasOptions: !!question.options,
            filterIds: question.filter_ids,
            subFilterIds: question.sub_filter_ids
          });
        } else {
          logger.warn('Questão não encontrada');
        }
      } catch (error) {
        logger.error('Exceção ao buscar dados da questão:', error);
      }

      // Criar entrada
      const entryId = uuidv4();
      const now = new Date().toISOString();

      logger.info('Criando entry com folder_id:', { folder_id: data.folder_id });

      const entry: any = {
        id: entryId,
        user_id: data.user_id,
        question_id: data.question_id,
        user_note: data.user_note.trim(),
        user_explanation: data.user_explanation.trim(),
        key_points: data.key_points || [],
        tags: data.tags || [],
        question_statement: questionData?.content || questionData?.title || '',
        correct_answer: this.extractCorrectAnswer(questionData),
        user_original_answer: '',
        question_subject: this.extractQuestionSubject(questionData),
        is_in_review_system: false, // Será definido pelo UnifiedReviewService
        difficulty: data.difficulty || ErrorNoteDifficulty.MEDIUM,
        confidence: Math.max(1, Math.min(5, data.confidence || 3)),
        alternative_comments: data.alternative_comments || {},
        highlights: data.highlights || [],
        question_data: questionData ? {
          institution: this.extractInstitution(questionData),
          year: this.extractYear(questionData),
          topic: this.extractTopic(questionData),
          alternatives: questionData.options || [],
          professorComment: questionData.professor_comment || '',
        } : null,
        folder_id: data.folder_id || null,
        created_at: now,
        updated_at: now,
      };

      // Salvar no Supabase
      const { data: savedEntry, error } = await this.supabase
        .from('error_notebook_entries')
        .insert(entry)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao salvar anotação de erro:', error);
        throw AppError.internal('Erro ao salvar anotação de erro');
      }

      // Adicionar ao sistema de revisão unificado
      let addedToReview = false;
      if (this.unifiedReviewService) {
        try {
          await this.unifiedReviewService.addErrorNoteToReview(
            entryId,
            data.user_id,
          );
          addedToReview = true;

          // Atualizar flag is_in_review_system
          await this.supabase
            .from('error_notebook_entries')
            .update({ is_in_review_system: true })
            .eq('id', entryId);

          savedEntry.is_in_review_system = true;
        } catch (error) {
          logger.error(
            '❌ Erro ao adicionar ao sistema de revisão:',
            error,
          );
        }
      } else {
        logger.warn('⚠️ unifiedReviewService não está disponível - card FSRS não será criado');
      }

      logger.info('Anotação de erro criada', {
        entryId,
        userId: data.user_id,
        questionId: data.question_id,
        addedToReview,
      });

      return {
        entry: savedEntry,
        addedToReview,
      };
    } catch (error) {
      logger.error('Erro ao criar anotação de erro:', error);
      throw error;
    }
  }

  /**
   * Listar anotações de erro do usuário
   */
  async getUserErrorNotes(
    userId: string,
    options: GetUserErrorNotesOptions = {},
  ): Promise<GetUserErrorNotesResult> {
    try {
      if (!userId) {
        throw AppError.badRequest('ID do usuário é obrigatório');
      }

      const limit = Math.min(options.limit || 20, 100);
      const page = Math.max(options.page || 1, 1);
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('error_notebook_entries')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Aplicar filtros
      if (options.tags && options.tags.length > 0) {
        query = query.contains('tags', options.tags);
      }

      if (options.difficulty) {
        query = query.eq('difficulty', options.difficulty);
      }

      if (options.is_in_review_system !== undefined) {
        query = query.eq('is_in_review_system', options.is_in_review_system);
      }

      const { data: entries, error, count } = await query;

      if (error) {
        logger.error('Erro ao buscar anotações do usuário:', error);
        throw AppError.internal('Erro ao buscar anotações');
      }

      const total = count || 0;
      const has_more = offset + limit < total;

      return {
        entries: entries || [],
        total,
        has_more,
      };
    } catch (error) {
      logger.error('Erro ao listar anotações do usuário:', error);
      throw error;
    }
  }

  /**
   * Preparar anotação para revisão
   */
  async prepareErrorNoteForReview(
    entryId: string,
    userId: string,
  ): Promise<ErrorNoteReviewData> {
    try {
      const { data: entry, error } = await this.supabase
        .from('error_notebook_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (error || !entry) {
        throw AppError.notFound('Anotação não encontrada');
      }

      if (!entry.isInReviewSystem) {
        throw AppError.badRequest('Anotação não está no sistema de revisão');
      }

      const reviewData: ErrorNoteReviewData = {
        entry_id: entry.id,
        question_context: {
          statement: entry.question_statement,
          correct_answer: entry.correct_answer,
          subject: entry.question_subject,
        },
        user_content: {
          note: entry.user_note,
          explanation: entry.user_explanation,
          key_points: entry.key_points,
        },
        review_prompt: this.generateReviewPrompt(entry),
      };

      return reviewData;
    } catch (error) {
      logger.error('Erro ao preparar anotação para revisão:', error);
      throw error;
    }
  }

  /**
   * Registrar revisão de anotação
   */
  async recordErrorNoteReview(
    entryId: string,
    userId: string,
    selfAssessment: number,
    reviewTimeMs?: number,
  ): Promise<void> {
    try {
      const { data: entry, error } = await this.supabase
        .from('error_notebook_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (error || !entry) {
        throw AppError.notFound('Anotação não encontrada');
      }

      if (!entry.isInReviewSystem) {
        throw AppError.badRequest('Anotação não está no sistema de revisão');
      }

      // Registrar no sistema de revisão unificado
      // isActiveReview = false porque é na página de caderno de erros, não na página de revisões
      if (this.unifiedReviewService) {
        await this.unifiedReviewService.recordErrorNotebookEntryReview(
          entryId,
          userId,
          selfAssessment,
          reviewTimeMs,
          false // isActiveReview = false (página de caderno de erros)
        );
      }

      // Review timestamps are now managed by UnifiedReviewService
      const now = new Date().toISOString();
      await this.supabase
        .from('error_notebook_entries')
        .update({
          updated_at: now,
        })
        .eq('id', entryId);

      logger.info('Revisão de anotação registrada', {
        entryId,
        userId,
        selfAssessment,
        reviewTimeMs,
      });
    } catch (error) {
      logger.error('Erro ao registrar revisão:', error);
      throw error;
    }
  }

  /**
   * Atualizar anotação de erro
   */
  async updateErrorNote(
    entryId: string,
    userId: string,
    data: UpdateErrorNoteDTO,
  ): Promise<ErrorNotebookEntry> {
    try {
      const { data: entry, error: fetchError } = await this.supabase
        .from('error_notebook_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !entry) {
        throw AppError.notFound('Anotação não encontrada');
      }

      const updateData: Partial<ErrorNotebookEntry> = {
        updated_at: new Date().toISOString(),
      };

      if (data.user_note !== undefined) {
        if (!data.user_note.trim()) {
          throw AppError.badRequest('Anotação não pode estar vazia');
        }
        updateData.user_note = data.user_note.trim();
      }

      if (data.user_explanation !== undefined) {
        if (!data.user_explanation.trim()) {
          throw AppError.badRequest('Explicação não pode estar vazia');
        }
        updateData.user_explanation = data.user_explanation.trim();
      }

      if (data.key_points !== undefined) {
        updateData.key_points = data.key_points;
      }

      if (data.tags !== undefined) {
        updateData.tags = data.tags;
      }

      if (data.difficulty !== undefined) {
        updateData.difficulty = data.difficulty;
      }

      if (data.confidence !== undefined) {
        updateData.confidence = Math.max(1, Math.min(5, data.confidence));
      }

      if (data.alternative_comments !== undefined) {
        updateData.alternative_comments = data.alternative_comments;
      }

      if (data.highlights !== undefined) {
        updateData.highlights = data.highlights;
      }

      const { data: updatedEntry, error: updateError } = await this.supabase
        .from('error_notebook_entries')
        .update(updateData)
        .eq('id', entryId)
        .select()
        .single();

      if (updateError) {
        logger.error('Erro ao atualizar anotação:', updateError);
        throw AppError.internal('Erro ao atualizar anotação');
      }

      logger.info('Anotação atualizada', {
        entryId,
        userId,
        updatedFields: Object.keys(updateData),
      });

      return updatedEntry;
    } catch (error) {
      logger.error('Erro ao atualizar anotação:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas das anotações do usuário
   */
  async getUserErrorNotesStats(userId: string): Promise<ErrorNotesStats> {
    try {
      const { data: entries, error } = await this.supabase
        .from('error_notebook_entries')
        .select(
          'difficulty, question_subject, confidence, is_in_review_system, created_at',
        )
        .eq('user_id', userId);

      if (error) {
        logger.error('Erro ao buscar estatísticas:', error);
        throw AppError.internal('Erro ao buscar estatísticas');
      }

      const total_entries = entries?.length || 0;
      const entries_in_review_system =
        entries?.filter((e) => e.is_in_review_system).length || 0;

      // Estatísticas por dificuldade
      const entries_by_difficulty: Record<ErrorNoteDifficulty, number> = {
        [ErrorNoteDifficulty.EASY]: 0,
        [ErrorNoteDifficulty.MEDIUM]: 0,
        [ErrorNoteDifficulty.HARD]: 0,
        [ErrorNoteDifficulty.VERY_HARD]: 0,
      };

      // Estatísticas por matéria
      const entries_by_subject: Record<string, number> = {};

      let total_confidence = 0;
      let last_entry_at: string | undefined;

      entries?.forEach((entry) => {
        // Dificuldade
        if (entry.difficulty) {
          entries_by_difficulty[entry.difficulty as ErrorNoteDifficulty]++;
        }

        // Matéria
        if (entry.question_subject) {
          entries_by_subject[entry.question_subject] =
            (entries_by_subject[entry.question_subject] || 0) + 1;
        }

        // Confiança
        if (entry.confidence) {
          total_confidence += entry.confidence;
        }

        // Última entrada
        if (entry.created_at) {
          if (!last_entry_at || entry.created_at > last_entry_at) {
            last_entry_at = entry.created_at;
          }
        }
      });

      return {
        total_entries,
        entries_in_review_system,
        entries_by_difficulty,
        entries_by_subject,
        last_entry_at,
        average_confidence: total_entries > 0 ? total_confidence / total_entries : 0,
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Extrair resposta correta da questão
   */
  private extractCorrectAnswer(question: any): string {
    if (!question) {
      return "";
    }

    try {
      if (question.correctAnswer) {
        return question.correctAnswer;
      }

      if (question.alternatives && Array.isArray(question.alternatives)) {
        const correct = question.alternatives.find((alt: any) => alt.isCorrect);
        return correct?.text || '';
      }

      return '';
    } catch (error) {
      logger.warn('Erro ao extrair resposta correta:', error);
      return '';
    }
  }

  /**
   * Extrair matéria da questão
   */
  private extractQuestionSubject(question: any): string {
    if (!question) {
      return "";
    }

    try {
      return question.subject || question.category || question.topic || '';
    } catch (error) {
      logger.warn('Erro ao extrair matéria da questão:', error);
      return '';
    }
  }

  /**
   * Extrair instituição dos filtros/subfiltros
   */
  private extractInstitution(question: any): string {
    if (!question) return '';

    try {
      const subFilterIds = question.sub_filter_ids || [];
      
      // Procurar por subfiltros que contenham nomes de universidades
      const universityPatterns = ['UFMG', 'USP', 'UFRJ', 'UNIFESP', 'UNB', 'UFSC', 'UFRGS', 'UFC', 'UFBA', 'UFPE', 'UFPR', 'UNESP', 'UNICAMP', 'PUC', 'UNIP', 'Revalida', 'REVALIDA'];
      
      for (const subFilter of subFilterIds) {
        for (const pattern of universityPatterns) {
          if (subFilter.includes(pattern)) {
            return pattern;
          }
        }
      }

      return '';
    } catch (error) {
      logger.warn('Erro ao extrair instituição:', error);
      return '';
    }
  }

  /**
   * Extrair ano dos filtros/subfiltros
   */
  private extractYear(question: any): number {
    if (!question) return 0;

    try {
      const subFilterIds = question.sub_filter_ids || [];
      
      // Procurar por subfiltros que contenham anos (2023, 2024, 2025, etc)
      const yearPatterns = ['2023', '2024', '2025', '2026', '2027'];
      
      for (const subFilter of subFilterIds) {
        for (const yearStr of yearPatterns) {
          if (subFilter.includes(yearStr)) {
            // Extrair apenas o ano base (ex: "2024.1" -> 2024)
            const year = parseInt(yearStr);
            if (!isNaN(year)) {
              return year;
            }
          }
        }
      }

      return 0;
    } catch (error) {
      logger.warn('Erro ao extrair ano:', error);
      return 0;
    }
  }

  /**
   * Extrair tópico dos filtros/subfiltros
   */
  private extractTopic(question: any): string {
    if (!question) return '';

    try {
      const filterIds = question.filter_ids || [];
      const subFilterIds = question.sub_filter_ids || [];
      
      // Procurar por filtros de especialidade médica
      const specialtyPatterns = ['Clínica Médica', 'ClinicaMedica', 'Cirurgia', 'Pediatria', 'Ginecologia', 'Obstetrícia', 'Psiquiatria', 'Medicina Preventiva', 'MedicinaPreventiva'];
      
      // Primeiro tentar nos subfiltros (mais específico)
      for (const subFilter of subFilterIds) {
        for (const pattern of specialtyPatterns) {
          if (subFilter.includes(pattern)) {
            // Extrair o tópico específico após o underscore
            const parts = subFilter.split('_');
            if (parts.length > 1) {
              return parts[parts.length - 1].replace(/-/g, ' ');
            }
            return pattern;
          }
        }
      }

      // Se não encontrou nos subfiltros, tentar nos filtros principais
      for (const filter of filterIds) {
        for (const pattern of specialtyPatterns) {
          if (filter.includes(pattern)) {
            return pattern;
          }
        }
      }

      return '';
    } catch (error) {
      logger.warn('Erro ao extrair tópico:', error);
      return '';
    }
  }

  /**
   * Gerar prompt de revisão
   */
  private generateReviewPrompt(entry: ErrorNotebookEntry): string {
    return (
        `Revise sua anotação sobre a questão:

` +
        `**Questão:** ${entry.question_statement}

` +
        `**Resposta Correta:** ${entry.correct_answer}

` +
        `**Sua Anotação:** ${entry.user_note}

` +
        `**Sua Explicação:** ${entry.user_explanation}

` +
        `**Pontos-Chave:** ${entry.key_points.join(', ')}

` +
        'Avalie seu entendimento atual sobre este tópico.'
      );
  }

  // ==================== MÉTODOS LEGADOS (COMPATIBILIDADE) ====================

  async createErrorNotebook(
    _payload: CreateErrorNotebookPayload,
  ): Promise<ErrorNotebook> {
    throw AppError.badRequest(
      'Funcionalidade removida na Fase 3. Use createErrorNote.',
    );
  }

  async getErrorNotebookById(
    _id: string,
    _userId: string,
  ): Promise<ErrorNotebook | null> {
    throw AppError.badRequest('Funcionalidade removida na Fase 3.');
  }

  async listErrorNotebooks(
    _userId: string,
    _options: ListErrorNotebooksOptions = {},
  ): Promise<PaginatedErrorNotebooksResult> {
    throw AppError.badRequest(
      'Funcionalidade removida na Fase 3. Use getUserErrorNotes.',
    );
  }

  async updateErrorNotebook(
    _id: string,
    _userId: string,
    _payload: UpdateErrorNotebookPayload,
  ): Promise<ErrorNotebook | null> {
    throw AppError.badRequest(
      'Funcionalidade removida na Fase 3. Use updateErrorNote.',
    );
  }

  async deleteErrorNotebook(_id: string, _userId: string): Promise<boolean> {
    throw AppError.badRequest('Funcionalidade removida na Fase 3.');
  }

  async getErrorNotebookStats(
    _id: string,
    _userId: string,
  ): Promise<ErrorNotebookStats> {
    throw AppError.badRequest(
      'Funcionalidade removida na Fase 3. Use getUserErrorNotesStats.',
    );
  }

  /**
   * Deletar anotação de erro
   */
  async deleteErrorNote(entryId: string, userId: string): Promise<void> {
    try {
      if (!entryId) {
        throw AppError.badRequest('ID da anotação é obrigatório');
      }

      if (!userId) {
        throw AppError.badRequest('ID do usuário é obrigatório');
      }

      // Verificar se a anotação existe e pertence ao usuário
      const { data: entry, error: fetchError } = await this.supabase
        .from('error_notebook_entries')
        .select('id')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !entry) {
        throw AppError.notFound('Anotação não encontrada');
      }

      // Deletar anotação
      const { error: deleteError } = await this.supabase
        .from('error_notebook_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (deleteError) {
        logger.error('Erro ao deletar anotação:', deleteError);
        throw AppError.internal('Erro ao deletar anotação');
      }

      logger.info('Anotação deletada', {
        entryId,
        userId,
      });
    } catch (error) {
      logger.error('Erro ao deletar anotação:', error);
      throw error;
    }
  }
}


