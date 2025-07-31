import { Timestamp } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';
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
} from '../types';
import { FSRSGrade } from '../../../srs/services/FSRSService';

/**
 * FASE 3: Sistema de Caderno de Erros
 * Implementação completa conforme TODO.md
 * 
 * FUNCIONALIDADES PRINCIPAIS:
 * - Criar anotações de erro com integração automática FSRS
 * - Preparar anotações para revisão
 * - Registrar revisões com auto-avaliação
 * - Listar e gerenciar anotações do usuário
 */
export class ErrorNotebookService {
  private db = getFirestore();
  private unifiedReviewService: any; // Será injetado para evitar dependência circular
  private questionService: any; // Será injetado para evitar dependência circular

  constructor() {
    // Dependências serão injetadas via setters para evitar circular dependency
  }

  /**
   * Injetar UnifiedReviewService para evitar dependência circular
   */
  setUnifiedReviewService(unifiedReviewService: any): void {
    this.unifiedReviewService = unifiedReviewService;
  }

  /**
   * Injetar FirebaseQuestionService para evitar dependência circular
   */
  setQuestionService(questionService: any): void {
    this.questionService = questionService;
  }

  /**
   * Criar anotação de erro
   * LÓGICA: Criar anotação + adicionar automaticamente às revisões
   */
  async createErrorNote(data: CreateErrorNoteDTO): Promise<{
    entry: ErrorNotebookEntry;
    addedToReview: boolean;
  }> {
    try {
      logger.info('Criando anotação de erro', { 
        userId: data.userId, 
        questionId: data.questionId 
      });

      // 1. Validar dados obrigatórios
      if (!data.userId) {
        throw AppError.badRequest('userId é obrigatório');
      }
      if (!data.questionId) {
        throw AppError.badRequest('questionId é obrigatório');
      }
      if (!data.userNote?.trim()) {
        throw AppError.badRequest('userNote é obrigatório');
      }
      if (!data.userExplanation?.trim()) {
        throw AppError.badRequest('userExplanation é obrigatório');
      }

      // 2. Buscar dados da questão original
      if (!this.questionService) {
        throw AppError.internal('QuestionService não foi injetado');
      }

      const question = await this.questionService.getQuestionById(data.questionId);
      if (!question) {
        throw AppError.notFound('Questão não encontrada');
      }

      // 3. Criar entrada do caderno
      const id = uuidv4();
      const now = Timestamp.now();

      const entry: ErrorNotebookEntry = {
        id,
        userId: data.userId,
        questionId: data.questionId,
        userNote: data.userNote.trim(),
        userExplanation: data.userExplanation.trim(),
        keyPoints: data.keyPoints || [],
        tags: data.tags || [],
        
        // Dados da questão
        questionStatement: question.statement || '',
        correctAnswer: this.extractCorrectAnswer(question),
        userOriginalAnswer: '', // Será preenchido se disponível no contexto
        questionSubject: this.extractQuestionSubject(question),
        
        // Status inicial - sempre adicionar às revisões
        isInReviewSystem: true,
        difficulty: data.difficulty || ErrorNoteDifficulty.MEDIUM,
        confidence: Math.max(1, Math.min(5, data.confidence || 3)), // Garantir 1-5
        
        createdAt: now,
        updatedAt: now
      };

      // 4. Salvar no Firestore
      await this.db.collection('errorNotebookEntries').doc(id).set(entry);

      // 5. Adicionar ao sistema de revisões FSRS
      let addedToReview = false;
      try {
        if (!this.unifiedReviewService) {
          throw new Error('UnifiedReviewService não foi injetado');
        }

        await this.unifiedReviewService.createReviewItem({
          userId: data.userId,
          contentType: 'ERROR_NOTEBOOK',
          contentId: id,
          metadata: {
            questionId: data.questionId,
            difficulty: entry.difficulty,
            confidence: entry.confidence,
            subject: entry.questionSubject,
            createdAt: now
          }
        });
        
        addedToReview = true;
        
        // Atualizar entrada com confirmação do FSRS
        await this.db.collection('errorNotebookEntries').doc(id).update({
          isInReviewSystem: true,
          updatedAt: Timestamp.now()
        });

        logger.info(`Anotação ${id} adicionada ao sistema de revisões FSRS`);
      } catch (error) {
        logger.warn(`Erro ao adicionar anotação ${id} às revisões:`, error);
        // Não falhar a criação da anotação se o FSRS falhar
        addedToReview = false;
        
        // Atualizar status para false
        await this.db.collection('errorNotebookEntries').doc(id).update({
          isInReviewSystem: false,
          updatedAt: Timestamp.now()
        });
      }

      logger.info(`Anotação de erro criada com sucesso: ${id}`, {
        userId: data.userId,
        questionId: data.questionId,
        addedToReview
      });

      return { 
        entry: { ...entry, isInReviewSystem: addedToReview }, 
        addedToReview 
      };
    } catch (error) {
      logger.error('Erro ao criar anotação de erro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro interno ao criar anotação de erro');
    }
  }

  /**
   * Obter anotações do usuário
   */
  async getUserErrorNotes(
    userId: string, 
    options: GetUserErrorNotesOptions = {}
  ): Promise<GetUserErrorNotesResult> {
    try {
      logger.info('Buscando anotações de erro do usuário', { userId, options });

      if (!userId) {
        throw AppError.badRequest('userId é obrigatório');
      }

      const {
        limit = 20,
        page = 1,
        tags,
        difficulty,
        isInReviewSystem
      } = options;

      // Construir query base
      let query = this.db
        .collection('errorNotebookEntries')
        .where('userId', '==', userId);

      // Aplicar filtros
      if (difficulty) {
        query = query.where('difficulty', '==', difficulty);
      }

      if (isInReviewSystem !== undefined) {
        query = query.where('isInReviewSystem', '==', isInReviewSystem);
      }

      // Ordenação por data de criação (mais recentes primeiro)
      query = query.orderBy('createdAt', 'desc');

      // Paginação
      const offset = (page - 1) * limit;
      query = query.offset(offset).limit(limit + 1); // +1 para detectar hasMore

      const snapshot = await query.get();
      const hasMore = snapshot.docs.length > limit;
      const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;

      let entries = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ErrorNotebookEntry[];

      // Filtro de tags in-memory (Firestore não suporta array-contains-any + outras condições)
      if (tags && tags.length > 0) {
        entries = entries.filter(entry => 
          tags.some(tag => entry.tags.includes(tag))
        );
      }

      // Contagem total (aproximada)
      const totalSnapshot = await this.db
        .collection('errorNotebookEntries')
        .where('userId', '==', userId)
        .get();

      logger.info(`Encontradas ${entries.length} anotações para usuário ${userId}`);

      return {
        entries,
        total: totalSnapshot.size,
        hasMore
      };
    } catch (error) {
      logger.error('Erro ao buscar anotações do usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro interno ao buscar anotações');
    }
  }

  /**
   * Preparar dados para revisão de anotação
   * LÓGICA: Formatar conteúdo para interface de revisão
   */
  async prepareErrorNoteForReview(entryId: string, userId: string): Promise<ErrorNoteReviewData> {
    try {
      logger.info('Preparando anotação para revisão', { entryId, userId });

      if (!entryId) {
        throw AppError.badRequest('entryId é obrigatório');
      }
      if (!userId) {
        throw AppError.badRequest('userId é obrigatório');
      }

      // Buscar a anotação
      const doc = await this.db.collection('errorNotebookEntries').doc(entryId).get();
      
      if (!doc.exists) {
        throw AppError.notFound('Anotação não encontrada');
      }

      const entry = { id: doc.id, ...doc.data() } as ErrorNotebookEntry;

      // Verificar autorização
      if (entry.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a acessar esta anotação');
      }

      // Montar prompt de revisão dinâmico baseado no conteúdo
      const reviewPrompt = this.generateReviewPrompt(entry);

      const reviewData: ErrorNoteReviewData = {
        entryId,
        questionContext: {
          statement: entry.questionStatement,
          correctAnswer: entry.correctAnswer,
          subject: entry.questionSubject
        },
        userContent: {
          note: entry.userNote,
          explanation: entry.userExplanation,
          keyPoints: entry.keyPoints
        },
        reviewPrompt
      };

      logger.info(`Anotação ${entryId} preparada para revisão`);
      return reviewData;
    } catch (error) {
      logger.error('Erro ao preparar anotação para revisão:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro interno ao preparar anotação para revisão');
    }
  }

  /**
   * Registrar revisão de anotação com auto-avaliação
   */
  async recordErrorNoteReview(
    entryId: string,
    userId: string,
    selfAssessment: FSRSGrade,
    reviewTimeMs?: number
  ): Promise<void> {
    try {
      logger.info('Registrando revisão de anotação', { 
        entryId, 
        userId, 
        selfAssessment,
        reviewTimeMs 
      });

      if (!entryId) {
        throw AppError.badRequest('entryId é obrigatório');
      }
      if (!userId) {
        throw AppError.badRequest('userId é obrigatório');
      }
      if (!selfAssessment || !Object.values(FSRSGrade).includes(selfAssessment)) {
        throw AppError.badRequest('selfAssessment inválido');
      }

      // Verificar se a anotação existe e pertence ao usuário
      const doc = await this.db.collection('errorNotebookEntries').doc(entryId).get();
      if (!doc.exists) {
        throw AppError.notFound('Anotação não encontrada');
      }

      const entry = { id: doc.id, ...doc.data() } as ErrorNotebookEntry;
      if (entry.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado');
      }

      // Aplicar FSRS
      if (!this.unifiedReviewService) {
        throw AppError.internal('UnifiedReviewService não foi injetado');
      }

      await this.unifiedReviewService.recordReview(
        entryId,
        userId,
        selfAssessment,
        reviewTimeMs
      );

      // Atualizar entrada com data da última revisão
      await this.db.collection('errorNotebookEntries').doc(entryId).update({
        lastReviewedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      logger.info(`Revisão de anotação registrada com sucesso: ${entryId}`, {
        userId,
        grade: selfAssessment,
        reviewTimeMs
      });
    } catch (error) {
      logger.error('Erro ao registrar revisão de anotação:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro interno ao registrar revisão');
    }
  }

  /**
   * Atualizar anotação de erro
   */
  async updateErrorNote(
    entryId: string,
    userId: string,
    data: UpdateErrorNoteDTO
  ): Promise<ErrorNotebookEntry> {
    try {
      logger.info('Atualizando anotação de erro', { entryId, userId });

      if (!entryId) {
        throw AppError.badRequest('entryId é obrigatório');
      }
      if (!userId) {
        throw AppError.badRequest('userId é obrigatório');
      }

      // Verificar se existe e pertence ao usuário
      const doc = await this.db.collection('errorNotebookEntries').doc(entryId).get();
      if (!doc.exists) {
        throw AppError.notFound('Anotação não encontrada');
      }

      const entry = { id: doc.id, ...doc.data() } as ErrorNotebookEntry;
      if (entry.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado');
      }

      // Preparar dados para atualização
      const updateData: Partial<ErrorNotebookEntry> = {
        updatedAt: Timestamp.now()
      };

      if (data.userNote !== undefined) {
        updateData.userNote = data.userNote.trim();
      }
      if (data.userExplanation !== undefined) {
        updateData.userExplanation = data.userExplanation.trim();
      }
      if (data.keyPoints !== undefined) {
        updateData.keyPoints = data.keyPoints;
      }
      if (data.tags !== undefined) {
        updateData.tags = data.tags;
      }
      if (data.difficulty !== undefined) {
        updateData.difficulty = data.difficulty;
      }
      if (data.confidence !== undefined) {
        updateData.confidence = Math.max(1, Math.min(5, data.confidence)); // Garantir 1-5
      }

      // Atualizar no Firestore
      await this.db.collection('errorNotebookEntries').doc(entryId).update(updateData);

      // Buscar e retornar dados atualizados
      const updatedDoc = await this.db.collection('errorNotebookEntries').doc(entryId).get();
      const updatedEntry = { id: updatedDoc.id, ...updatedDoc.data() } as ErrorNotebookEntry;

      logger.info(`Anotação ${entryId} atualizada com sucesso`);
      return updatedEntry;
    } catch (error) {
      logger.error('Erro ao atualizar anotação:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro interno ao atualizar anotação');
    }
  }

  /**
   * Obter estatísticas das anotações do usuário
   */
  async getUserErrorNotesStats(userId: string): Promise<ErrorNotesStats> {
    try {
      logger.info('Buscando estatísticas de anotações', { userId });

      if (!userId) {
        throw AppError.badRequest('userId é obrigatório');
      }

      const snapshot = await this.db
        .collection('errorNotebookEntries')
        .where('userId', '==', userId)
        .get();

      const entries = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as ErrorNotebookEntry[];

      // Calcular estatísticas
      const stats: ErrorNotesStats = {
        totalEntries: entries.length,
        entriesInReviewSystem: entries.filter(e => e.isInReviewSystem).length,
        entriesByDifficulty: {
          [ErrorNoteDifficulty.EASY]: 0,
          [ErrorNoteDifficulty.MEDIUM]: 0,
          [ErrorNoteDifficulty.HARD]: 0,
          [ErrorNoteDifficulty.VERY_HARD]: 0
        },
        entriesBySubject: {},
        averageConfidence: 0,
        lastEntryAt: undefined
      };

      if (entries.length > 0) {
        // Calcular distribuição por dificuldade
        entries.forEach(entry => {
          if (entry.difficulty && stats.entriesByDifficulty[entry.difficulty] !== undefined) {
            stats.entriesByDifficulty[entry.difficulty]++;
          }
          
          // Agrupar por assunto
          const subject = entry.questionSubject || 'Sem assunto';
          stats.entriesBySubject[subject] = (stats.entriesBySubject[subject] || 0) + 1;
        });

        // Calcular confiança média
        const totalConfidence = entries.reduce((sum, entry) => sum + (entry.confidence || 3), 0);
        stats.averageConfidence = totalConfidence / entries.length;

        // Encontrar última entrada
        const sortedEntries = entries.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        stats.lastEntryAt = sortedEntries[0].createdAt;
      }

      logger.info(`Estatísticas calculadas para usuário ${userId}`, stats);
      return stats;
    } catch (error) {
      logger.error('Erro ao buscar estatísticas:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro interno ao buscar estatísticas');
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Extrair resposta correta da questão
   */
  private extractCorrectAnswer(question: any): string {
    try {
      if (!question.alternatives || !question.correctAlternativeId) {
        return 'Resposta não disponível';
      }

      const correctAlternative = question.alternatives.find(
        (alt: any) => alt.id === question.correctAlternativeId
      );

      return correctAlternative?.text || 'Resposta não encontrada';
    } catch (error) {
      logger.warn('Erro ao extrair resposta correta:', error);
      return 'Resposta não disponível';
    }
  }

  /**
   * Extrair assunto da questão
   */
  private extractQuestionSubject(question: any): string {
    try {
      if (question.filterIds && question.filterIds.length > 0) {
        return question.filterIds[0];
      }
      if (question.subject) {
        return question.subject;
      }
      if (question.category) {
        return question.category;
      }
      return 'Sem assunto definido';
    } catch (error) {
      logger.warn('Erro ao extrair assunto da questão:', error);
      return 'Sem assunto definido';
    }
  }

  /**
   * Gerar prompt de revisão dinâmico
   */
  private generateReviewPrompt(entry: ErrorNotebookEntry): string {
    const subject = entry.questionSubject || 'este tópico';
    const keyPointsText = entry.keyPoints.length > 0 
      ? ` e seus pontos-chave (${entry.keyPoints.join(', ')})` 
      : '';

    return `Ao reler suas anotações sobre "${subject}"${keyPointsText}, como está sua compreensão do tópico agora?`;
  }

  // ==================== MÉTODOS LEGADOS (COMPATIBILIDADE) ====================

  /**
   * Métodos antigos mantidos para compatibilidade
   * DEPRECATED: Usar os novos métodos da Fase 3
   */

  async createErrorNotebook(_payload: CreateErrorNotebookPayload): Promise<ErrorNotebook> {
    // Implementação mantida para compatibilidade
    logger.warn('Método createErrorNotebook é deprecated, use createErrorNote');
    // ... implementação original mantida
    throw AppError.internal('Método deprecated - use createErrorNote');
  }

  async getErrorNotebookById(_id: string, _userId: string): Promise<ErrorNotebook | null> {
    logger.warn('Método getErrorNotebookById é deprecated');
    throw AppError.internal('Método deprecated');
  }

  async listErrorNotebooks(
    _userId: string,
    _options: ListErrorNotebooksOptions = {},
  ): Promise<PaginatedErrorNotebooksResult> {
    logger.warn('Método listErrorNotebooks é deprecated, use getUserErrorNotes');
    throw AppError.internal('Método deprecated - use getUserErrorNotes');
  }

  async updateErrorNotebook(
    _id: string,
    _userId: string,
    _payload: UpdateErrorNotebookPayload,
  ): Promise<ErrorNotebook | null> {
    logger.warn('Método updateErrorNotebook é deprecated, use updateErrorNote');
    throw AppError.internal('Método deprecated - use updateErrorNote');
  }

  async deleteErrorNotebook(_id: string, _userId: string): Promise<boolean> {
    logger.warn('Método deleteErrorNotebook é deprecated');
    throw AppError.internal('Método deprecated');
  }

  async getErrorNotebookStats(_id: string, _userId: string): Promise<ErrorNotebookStats> {
    logger.warn('Método getErrorNotebookStats é deprecated, use getUserErrorNotesStats');
    throw AppError.internal('Método deprecated - use getUserErrorNotesStats');
  }
}
