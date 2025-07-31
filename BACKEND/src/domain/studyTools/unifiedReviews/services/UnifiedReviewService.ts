import { firestore } from 'firebase-admin';
import { FSRSGrade, FSRSCard } from '../../../srs/services/FSRSService';
import { IFSRSService } from '../../../srs/interfaces/IFSRSService';
import { 
  UnifiedReviewItem, 
  UnifiedContentType, 
  DailyReviewSummary,
  CreateUnifiedReviewDTO,
  UnifiedReviewFilters,
  PaginatedReviewResult
} from '../types';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';
import { IQuestionService } from '../../../questions/interfaces/IQuestionService';
import { Timestamp } from 'firebase-admin/firestore';
import { performanceMonitor } from './PerformanceMonitoringService';
import { DateUtils } from '../../../../utils/dateUtils';

export class UnifiedReviewService {
  private db: firestore.Firestore;
  private fsrsService: IFSRSService;
  private deckCache = new Map<string, { name: string; timestamp: number }>();
  private filterCache = new Map<string, { name: string; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  
  constructor(
    db: firestore.Firestore,
    fsrsService: IFSRSService,
    _questionService: IQuestionService,
  ) {
    this.db = db;
    this.fsrsService = fsrsService;
  }

  /**
   * Obter revisões pendentes com paginação baseada em cursor
   */
  async getDueReviewsPaginated(userId: string, filters?: UnifiedReviewFilters): Promise<PaginatedReviewResult> {
    const startTime = Date.now();
    let documentsRead = 0;
    
    try {
      const pageSize = filters?.pageSize || 20;
      
      // Construir query base
      let query = this.db.collection('fsrs_cards')
        .where('userId', '==', userId)
        .orderBy('due', 'asc');
      
      // Aplicar filtro de data se dueOnly estiver ativo
      if (filters?.dueOnly) {
        const now = Timestamp.now();
        query = query.where('due', '<=', now);
      }
      
      // Aplicar cursor para paginação
      if (filters?.cursor) {
        const cursorDoc = await this.db.collection('fsrs_cards').doc(filters.cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
        documentsRead += 1; // Cursor lookup
      }
      
      // Buscar uma página extra para verificar se há mais itens
      const snapshot = await query.limit(pageSize + 1).get();
      documentsRead += snapshot.docs.length;
      
      const hasMore = snapshot.docs.length > pageSize;
      const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
      
      // Converter documentos para FSRSCards
      const cards = docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          due: data.due.toDate(),
          last_review: data.last_review ? data.last_review.toDate() : null,
        } as FSRSCard;
      });
      
      // Filtrar por tipo de conteúdo se especificado
      let filteredCards = cards;
      if (filters?.contentType) {
        filteredCards = cards.filter((card: FSRSCard) => {
          const contentType = this.detectContentType(card.deckId);
          return contentType === filters.contentType;
        });
      }
      
      // Filtrar por deckId específico se especificado
      if (filters?.deckId) {
        filteredCards = filteredCards.filter((card: FSRSCard) => card.deckId === filters.deckId);
      }
      
      // Enriquecer com metadados específicos do tipo
      const enrichedItems = await this.enrichReviewItemsBatch(filteredCards);
      const validItems = enrichedItems.filter(item => item !== null) as UnifiedReviewItem[];
      
      // Determinar próximo cursor
      const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : undefined;
      
      // Registrar métrica de performance
      const executionTime = Date.now() - startTime;
      performanceMonitor.recordMetric({
        operationType: 'getDueReviews',
        userId,
        executionTimeMs: executionTime,
        documentsRead,
        queryFilters: {
          pageSize,
          dueOnly: filters?.dueOnly,
          contentType: filters?.contentType,
          deckId: filters?.deckId,
          hasCursor: !!filters?.cursor
        },
        timestamp: new Date()
      });
      
      logger.info(`${validItems.length} revisões encontradas para usuário ${userId} (página)`);
      
      return {
        items: validItems,
        nextCursor,
        hasMore,
        totalCount: undefined // Pode ser implementado com uma query separada se necessário
      };
    } catch (error) {
      // Registrar métrica mesmo em caso de erro
      const executionTime = Date.now() - startTime;
      performanceMonitor.recordMetric({
        operationType: 'getDueReviews',
        userId,
        executionTimeMs: executionTime,
        documentsRead,
        queryFilters: filters,
        timestamp: new Date()
      });
      
      logger.error('Erro ao buscar revisões paginadas:', error);
      throw AppError.internal('Erro ao buscar revisões paginadas');
    }
  }

  /**
   * Obter todas as revisões pendentes do usuário (FSRS unificado) - Método legado
   */
  async getDueReviews(userId: string, filters?: UnifiedReviewFilters): Promise<UnifiedReviewItem[]> {
    const startTime = Date.now();
    let documentsRead = 0;
    
    try {
      const limit = filters?.limit || 200;
      
      // Se dueOnly for false, buscar todas as revisões futuras também
      let allCards: FSRSCard[] = [];
      
      if (filters?.dueOnly === false) {
        // ✅ CORREÇÃO: Buscar todas as revisões sem multiplicar limite
        const querySnapshot = await this.db.collection('fsrs_cards')
          .where('userId', '==', userId)
          .orderBy('due', 'asc')
          .limit(limit) // ✅ MUDANÇA: Removido * 2 para evitar consultas excessivas
          .get();
          
        allCards = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            due: data.due.toDate(),
            last_review: data.last_review ? data.last_review.toDate() : null,
          } as FSRSCard;
        });
      } else {
        // ✅ CORREÇÃO: Buscar apenas as devidas sem multiplicar limite
        allCards = await this.fsrsService.getDueCards(userId, limit); // ✅ MUDANÇA: Removido * 2 para evitar consultas excessivas
      }
      
      // Filtrar por tipo de conteúdo se especificado
      let filteredCards = allCards;
      if (filters?.contentType) {
        filteredCards = allCards.filter((card: FSRSCard) => {
          const contentType = this.detectContentType(card.deckId);
          return contentType === filters.contentType;
        });
      }

      // Filtrar por deckId específico se especificado
      if (filters?.deckId) {
        filteredCards = filteredCards.filter((card: FSRSCard) => card.deckId === filters.deckId);
      }

      // Aplicar filtro de "apenas devidos" se especificado explicitamente como true
      if (filters?.dueOnly === true) {
        const now = new Date();
        filteredCards = filteredCards.filter((card: FSRSCard) => {
          const dueDate = DateUtils.parseDate(card.due);
          return dueDate && dueDate <= now;
        });
      }

      // Limitar resultados
      const limitedCards = filteredCards.slice(0, limit);

      // Enriquecer com metadados específicos do tipo usando cache
      const enrichedItems = await this.enrichReviewItemsBatch(limitedCards);
      documentsRead += limitedCards.length; // Estimativa de documentos lidos no enriquecimento

      // Filtrar itens que falharam no enriquecimento
      const validItems = enrichedItems.filter(item => item !== null) as UnifiedReviewItem[];

      // Registrar métrica de performance apenas para operações lentas (>1s)
      const executionTime = Date.now() - startTime;
      if (executionTime > 1000) {
        performanceMonitor.recordMetric({
          operationType: 'getDueReviews',
          userId,
          executionTimeMs: executionTime,
          documentsRead,
          queryFilters: {
            limit,
            contentType: filters?.contentType,
            deckId: filters?.deckId,
            dueOnly: filters?.dueOnly
          },
          timestamp: new Date()
        });
      }

      // Reduzir logs: usar debug para operações normais
      logger.debug(`${validItems.length} revisões devidas encontradas para usuário ${userId}`);
      return validItems;
    } catch (error) {
      // Registrar métrica mesmo em caso de erro
      const executionTime = Date.now() - startTime;
      performanceMonitor.recordMetric({
        operationType: 'getDueReviews',
        userId,
        executionTimeMs: executionTime,
        documentsRead,
        queryFilters: filters,
        timestamp: new Date()
      });
      
      logger.error('Erro ao buscar revisões devidas:', error);
      throw AppError.internal('Erro ao buscar revisões devidas');
    }
  }

  /**
   * Registrar revisão unificada (FSRS único)
   */
  async recordUnifiedReview(
    contentType: UnifiedContentType,
    contentId: string,
    userId: string,
    grade: FSRSGrade,
    reviewTimeMs?: number
  ): Promise<UnifiedReviewItem> {
    try {
      // Aplicar FSRS diretamente
      const updatedCard = await this.fsrsService.reviewCard(contentId, userId, grade, reviewTimeMs);

      // Se a revisão é de QUESTÃO, registrar em fsrsQuestionReviews
      if (contentType === UnifiedContentType.QUESTION) {
        await this.saveQuestionReview(userId, contentId, grade, reviewTimeMs);
      }

      // Salvar no histórico de revisões completadas
      await this.saveReviewHistory(userId, contentType, contentId, grade, reviewTimeMs, updatedCard);

      // Enriquecer e retornar item atualizado
      const enrichedItem = await this.enrichReviewItem(updatedCard);
      if (!enrichedItem) {
        throw AppError.internal('Erro ao enriquecer item após revisão');
      }

      logger.info(`Revisão unificada registrada: ${contentType} ${contentId}, usuário ${userId}, grade ${grade}`);
      return enrichedItem;
    } catch (error) {
      logger.error('Erro ao registrar revisão unificada:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao registrar revisão unificada');
    }
  }

  /**
   * Grava documento em fsrsQuestionReviews para métricas de retenção.
   */
  private async saveQuestionReview(
    userId: string,
    questionId: string,
    grade: FSRSGrade,
    reviewTimeMs?: number
  ): Promise<void> {
    try {
      // Obter especialidade (primeiro filterId da categoria MEDICAL_SPECIALTY)
      let specialtyId: string | null = null;
      try {
        const qDoc = await this.db.collection('questions').doc(questionId).get();
        if (qDoc.exists) {
          const data = qDoc.data() as any;
          const medSpecId = (data.filterIds || []).find((fid: string) => fid);
          specialtyId = medSpecId || null;
        }
      } catch (err) {
        logger.warn('UnifiedReviewService', 'saveQuestionReview', 'Não foi possível buscar questão para specialty', err);
      }

      const review = {
        userId,
        questionId,
        specialtyId,
        grade,
        reviewTimeMs: reviewTimeMs ?? null,
        reviewedAt: Timestamp.now(),
      };
      await this.db.collection('fsrsQuestionReviews').add(review);
    } catch (error) {
      logger.error('UnifiedReviewService', 'saveQuestionReview', 'Erro ao salvar review', error);
    }
  }

  /**
   * Salva o histórico de revisões completadas na coleção fsrsReviewHistory
   */
  private async saveReviewHistory(
    userId: string,
    contentType: UnifiedContentType,
    contentId: string,
    grade: FSRSGrade,
    reviewTimeMs: number | undefined,
    updatedCard: FSRSCard
  ): Promise<void> {
    try {
      const reviewHistory = {
        userId,
        contentType,
        contentId,
        grade,
        reviewTimeMs: reviewTimeMs ?? null,
        reviewedAt: Timestamp.now(),
        
        // Dados do card FSRS após a revisão
        stability: updatedCard.stability,
        difficulty: updatedCard.difficulty,
        due: updatedCard.due instanceof Date ? Timestamp.fromDate(updatedCard.due) : updatedCard.due,
        reps: updatedCard.reps,
        lapses: updatedCard.lapses,
        state: updatedCard.state,
        
        createdAt: Timestamp.now()
      };
      
      await this.db.collection('fsrsReviewHistory').add(reviewHistory);
      logger.debug(`Histórico de revisão salvo para ${contentType}:${contentId}`);
    } catch (error) {
      logger.error('Erro ao salvar histórico de revisão:', error);
      // Não propagar o erro para não quebrar o fluxo principal
    }
  }

  /**
   * Obter apenas revisões de hoje (otimizado para dashboard)
   */
  async getTodayReviews(userId: string, limit: number = 50): Promise<UnifiedReviewItem[]> {
    try {
      const today = DateUtils.getStartOfDay();
      const tomorrow = DateUtils.addDays(today, 1);
      
      // Buscar apenas revisões que vencem hoje
      const todayCardsSnapshot = await this.db.collection('fsrs_cards')
        .where('userId', '==', userId)
        .where('due', '>=', Timestamp.fromDate(today))
        .where('due', '<', Timestamp.fromDate(tomorrow))
        .orderBy('due', 'asc')
        .limit(limit)
        .get();
      
      const todayCards = todayCardsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          due: data.due.toDate(),
          last_review: data.last_review ? data.last_review.toDate() : null,
        } as FSRSCard;
      });
      
      // Enriquecer com metadados
      const enrichedItems = await this.enrichReviewItemsBatch(todayCards);
      const validItems = enrichedItems.filter(item => item !== null) as UnifiedReviewItem[];
      
      logger.debug(`${validItems.length} revisões de hoje encontradas para usuário ${userId}`);
      return validItems;
    } catch (error) {
      logger.error('Erro ao buscar revisões de hoje:', error);
      throw AppError.internal('Erro ao buscar revisões de hoje');
    }
  }

  /**
   * Obter resumo diário de revisões
   */
  async getDailyReviewSummary(userId: string): Promise<DailyReviewSummary> {
    try {
      // ✅ CORREÇÃO: Buscar todas as revisões pendentes, não apenas as que já venceram
      const dueItems = await this.getDueReviews(userId, { dueOnly: false, limit: 200 });
      
      const flashcards = dueItems.filter(item => item.contentType === UnifiedContentType.FLASHCARD).length;
      const questions = dueItems.filter(item => item.contentType === UnifiedContentType.QUESTION).length;
      const errorNotes = dueItems.filter(item => item.contentType === UnifiedContentType.ERROR_NOTEBOOK).length;

      // Calcular tempo estimado (baseado em médias)
      const estimatedTimeMinutes = Math.round(
        (flashcards * 1.5) + // 1.5 min por flashcard
        (questions * 2.5) +  // 2.5 min por questão
        (errorNotes * 2.0)   // 2.0 min por entrada de erro
      );

      // ✅ CORREÇÃO: Usar DateUtils centralizado para tratamento de datas
      const now = new Date();
      const today = DateUtils.getStartOfDay();
      const tomorrow = DateUtils.addDays(today, 1);
      
      console.log(`🕐 [UnifiedReview] Datas de referência:`);
      console.log(`   - Agora: ${now.toISOString()}`);
      console.log(`   - Hoje (início): ${today.toISOString()}`);
      console.log(`   - Amanhã (início): ${tomorrow.toISOString()}`);
      
      // Debug: examinar as primeiras 5 revisões
      console.log(`🔍 [UnifiedReview] Examinando primeiras 5 revisões:`);
      dueItems.slice(0, 5).forEach((item, index) => {
        const rawDate = item.due || item.dueDate || item.nextReviewDate || item.nextReviewAt;
        console.log(`   ${index + 1}. ${DateUtils.formatForDebug(rawDate, 'Due')}, Tipo: ${item.contentType}, ID: ${item.id}`);
      });
      
      // Revisões de hoje: usar DateUtils para validação e comparação
      const todayReviews = dueItems.filter(item => {
        const rawDate = item.due || item.dueDate || item.nextReviewDate || item.nextReviewAt;
        
        if (!DateUtils.isValidDate(rawDate)) {
          console.log(`⚠️ [UnifiedReview] Data inválida encontrada: ${rawDate} - ${item.contentType} - ID: ${item.id}`);
          return false;
        }
        
        const isToday = DateUtils.isToday(rawDate);
        if (isToday) {
          const parsedDate = DateUtils.parseDate(rawDate);
          console.log(`✅ [UnifiedReview] Revisão de hoje: ${parsedDate?.toISOString()} - ${item.contentType}`);
        }
        return isToday;
      });
      
      // Revisões antigas: apenas as que venceram antes de hoje (dias anteriores)
      const oldReviews = dueItems.filter(item => {
        const rawDate = item.due || item.dueDate || item.nextReviewDate || item.nextReviewAt;
        
        if (!DateUtils.isValidDate(rawDate)) {
          console.log(`⚠️ [UnifiedReview] Data inválida encontrada: ${rawDate} - ${item.contentType} - ID: ${item.id}`);
          return false;
        }
        
        const parsedDate = DateUtils.parseDate(rawDate);
         if (!parsedDate) return false;
         
         const isOld = parsedDate < today;
         if (isOld) {
           console.log(`⏰ [UnifiedReview] Revisão antiga: ${parsedDate.toISOString()} - ${item.contentType}`);
         }
         return isOld;
       });
      
      console.log(`📊 [UnifiedReview] Categorização de revisões:`);
      console.log(`   - Total de itens devidos: ${dueItems.length}`);
      console.log(`   - Revisões para hoje: ${todayReviews.length}`);
      console.log(`   - Revisões antigas: ${oldReviews.length}`);

      // Agrupar por deck
      const deckGroups = new Map<string, { name: string; count: number }>();
      dueItems.forEach(item => {
        if (item.deckId) {
          const existing = deckGroups.get(item.deckId);
          if (existing) {
            existing.count++;
          } else {
            deckGroups.set(item.deckId, { name: item.deckId, count: 1 });
          }
        }
      });

      // Agrupar por tags (assunto)
      const subjectGroups = new Map<string, number>();
      dueItems.forEach(item => {
        if (item.tags && item.tags.length > 0) {
          item.tags.forEach(tag => {
            subjectGroups.set(tag, (subjectGroups.get(tag) || 0) + 1);
          });
        }
      });

      // Agrupar por dificuldade FSRS
      const difficultyGroups = new Map<string, number>();
      dueItems.forEach(item => {
        let difficultyLevel = 'Médio';
        if (item.difficulty < 3) difficultyLevel = 'Fácil';
        else if (item.difficulty > 7) difficultyLevel = 'Difícil';
        
        difficultyGroups.set(difficultyLevel, (difficultyGroups.get(difficultyLevel) || 0) + 1);
      });

      const summary: DailyReviewSummary = {
        totalItems: dueItems.length,
        todayItems: todayReviews.length,
        oldItems: oldReviews.length,
        todayReviews: todayReviews.slice(0, 20), // Incluir até 20 revisões de hoje para o dashboard
        flashcards,
        questions,
        errorNotes,
        estimatedTimeMinutes,
        breakdown: {
          byDeck: Array.from(deckGroups.entries()).map(([deckId, data]) => ({
            deckId,
            name: data.name,
            count: data.count
          })),
          bySubject: Array.from(subjectGroups.entries()).map(([subject, count]) => ({
            subject,
            count
          })),
          byDifficulty: Array.from(difficultyGroups.entries()).map(([difficulty, count]) => ({
            difficulty,
            count
          }))
        }
      };

      logger.info(`Resumo diário gerado para usuário ${userId}: ${dueItems.length} itens devidos (${todayReviews.length} hoje, ${oldReviews.length} antigas)`);
      return summary;
    } catch (error) {
      logger.error('Erro ao gerar resumo diário:', error);
      throw AppError.internal('Erro ao gerar resumo diário');
    }
  }

  /**
   * Obter revisões futuras (agendadas para depois de hoje)
   */
  async getFutureReviews(userId: string, filters?: UnifiedReviewFilters): Promise<UnifiedReviewItem[]> {
    try {
      const limit = filters?.limit || 200;
      
      // Filtrar apenas os que são devidos no futuro com query otimizada
      const tomorrow = DateUtils.addDays(DateUtils.getStartOfDay(), 1);
      
      const futureCardsSnapshot = await this.db.collection('fsrs_cards')
         .where('userId', '==', userId)
         .where('due', '>=', Timestamp.fromDate(tomorrow))
         .orderBy('due', 'asc')
         .limit(limit)
         .get();
      
      let futureCards = futureCardsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          due: data.due.toDate(),
          last_review: data.last_review ? data.last_review.toDate() : null,
        } as FSRSCard;
      });
      
      // Filtrar por tipo de conteúdo se especificado
      if (filters?.contentType) {
        futureCards = futureCards.filter((card: FSRSCard) => {
          const contentType = this.detectContentType(card.deckId);
          return contentType === filters.contentType;
        });
      }
      
      // Enriquecer com metadados específicos do tipo
      const enrichedItems = await this.enrichReviewItemsBatch(futureCards);
      
      // Filtrar itens que falharam no enriquecimento
      const validItems = enrichedItems.filter(item => item !== null) as UnifiedReviewItem[];
      
      logger.info(`${validItems.length} revisões futuras encontradas para usuário ${userId}`);
      return validItems;
    } catch (error) {
      logger.error('Erro ao buscar revisões futuras:', error);
      throw AppError.internal('Erro ao buscar revisões futuras');
    }
  }

  /**
   * Obter histórico de revisões completadas
   */
  async getCompletedReviews(userId: string, filters?: { limit?: number; days?: number; contentType?: UnifiedContentType }): Promise<any[]> {
    try {
      const limit = filters?.limit || 200;
      const days = filters?.days || 7; // Últimos 7 dias por padrão
      
      // Calcular data de início
      const startDate = DateUtils.addDays(DateUtils.getStartOfDay(), -days);
      
      // Buscar revisões completadas na coleção de logs/histórico
      let query = this.db.collection('fsrsReviewHistory')
        .where('userId', '==', userId)
        .where('reviewedAt', '>=', startDate)
        .orderBy('reviewedAt', 'desc')
        .limit(limit);
      
      const snapshot = await query.get();
      const rawReviews = snapshot.docs.map(doc => {
        const data = doc.data();
        let reviewedAt = data.reviewedAt;
        
        // Converter Timestamp do Firestore para Date usando DateUtils
        const parsedDate = DateUtils.parseDate(reviewedAt);
        reviewedAt = parsedDate || new Date(); // Fallback para data atual
        
        return {
          id: doc.id,
          ...data,
          reviewedAt
        };
      });
      
      // Enriquecer cada revisão com dados do conteúdo original
      const enrichedReviews = await Promise.all(
        rawReviews.map(async (review) => {
          try {
            const enrichedData = await this.enrichCompletedReview(review);
            return {
              ...review,
              ...enrichedData,
              // Garantir que a data seja formatada corretamente
              last_review: review.reviewedAt,
              reviewedAt: review.reviewedAt
            };
          } catch (error) {
            logger.warn(`Erro ao enriquecer revisão ${review.id}:`, error);
            // Retornar dados básicos se não conseguir enriquecer
            return {
              ...review,
              title: `${review.contentType || 'Conteúdo'} ${review.contentId || 'sem ID'}`,
              subtitle: 'Dados não disponíveis',
              last_review: review.reviewedAt,
              reviewedAt: review.reviewedAt
            };
          }
        })
      );
      
      // Filtrar por tipo se especificado
      const filteredReviews = filters?.contentType 
        ? enrichedReviews.filter(review => review.contentType === filters.contentType)
        : enrichedReviews;
      
      logger.info(`${filteredReviews.length} revisões completadas encontradas para usuário ${userId}`);
      return filteredReviews;
    } catch (error) {
      logger.error('Erro ao buscar revisões completadas:', error);
      // Se a coleção não existir, retornar array vazio
      return [];
    }
  }

  /**
   * Enriquecer dados de uma revisão completada
   */
  private async enrichCompletedReview(review: any): Promise<any> {
    try {
      const contentType = review.contentType;
      const contentId = review.contentId;
      
      if (!contentType || !contentId) {
        return {
          title: 'Conteúdo sem identificação',
          subtitle: 'Dados incompletos'
        };
      }

      switch (contentType) {
        case 'FLASHCARD':
          return await this.enrichCompletedFlashcard(contentId);
        
        case 'QUESTION':
          return await this.enrichCompletedQuestion(contentId);
        
        case 'ERROR_NOTEBOOK':
          return await this.enrichCompletedErrorNotebook(contentId);
        
        default:
          return {
            title: `${contentType} ${contentId}`,
            subtitle: 'Tipo de conteúdo desconhecido'
          };
      }
    } catch (error) {
      logger.error('Erro ao enriquecer revisão completada:', error);
      return {
        title: 'Erro ao carregar dados',
        subtitle: 'Conteúdo indisponível'
      };
    }
  }

  /**
   * Enriquecer flashcard completado
   */
  private async enrichCompletedFlashcard(contentId: string): Promise<any> {
    try {
      const flashcardDoc = await this.db.collection('flashcards').doc(contentId).get();
      
      if (!flashcardDoc.exists) {
        return {
          title: `Flashcard ${contentId.substring(0, 8)}...`,
          subtitle: 'Flashcard removido do sistema',
          front: 'Flashcard não encontrado',
          back: 'Este flashcard foi removido ou não existe mais',
          frontContent: 'Flashcard não encontrado',
          backContent: 'Este flashcard foi removido ou não existe mais',
          answer: 'Este flashcard foi removido ou não existe mais'
        };
      }
      
      const flashcardData = flashcardDoc.data();
      const frontContent = flashcardData?.frontContent || flashcardData?.front || flashcardData?.question || '';
      const backContent = flashcardData?.backContent || flashcardData?.back || flashcardData?.answer || '';
      
      // Extrair texto limpo do conteúdo
      let cleanTitle = this.extractTextFromContent(frontContent);
      if (!cleanTitle || cleanTitle.trim() === '') {
        cleanTitle = flashcardData?.title || `Flashcard ${contentId.substring(0, 8)}`;
      }
      
      const title = cleanTitle.length > 60 ? cleanTitle.substring(0, 60) + '...' : cleanTitle;
      
      // Buscar nome do deck com fallback
      let deckName = 'Flashcard';
      if (flashcardData?.deckId) {
        try {
          deckName = await this.getDeckNameCached(flashcardData.deckId);
        } catch (error) {
          deckName = `Deck ${flashcardData.deckId.substring(0, 8)}`;
        }
      }
      
      return {
        title: title || `Flashcard ${contentId.substring(0, 8)}`,
        subtitle: deckName,
        // Incluir dados completos do flashcard para exibição
        front: frontContent,
        back: backContent,
        frontContent: frontContent,
        backContent: backContent,
        answer: backContent, // Para compatibilidade com o frontend
        deckId: flashcardData?.deckId,
        tags: flashcardData?.tags || [],
        frontImage: flashcardData?.frontImage || null,
        backImage: flashcardData?.backImage || null,
        explanation: flashcardData?.explanation || flashcardData?.personalNotes || null
      };
    } catch (error) {
      logger.error(`Erro ao enriquecer flashcard completado ${contentId}:`, error);
      return {
        title: `Flashcard ${contentId.substring(0, 8)}`,
        subtitle: 'Erro ao carregar dados',
        front: 'Erro ao carregar flashcard',
        back: 'Ocorreu um erro ao carregar este flashcard',
        frontContent: 'Erro ao carregar flashcard',
        backContent: 'Ocorreu um erro ao carregar este flashcard',
        answer: 'Ocorreu um erro ao carregar este flashcard'
      };
    }
  }

  /**
   * Enriquecer questão completada
   */
  private async enrichCompletedQuestion(contentId: string): Promise<any> {
    try {
      const questionDoc = await this.db.collection('questions').doc(contentId).get();
      
      if (!questionDoc.exists) {
        return {
          title: `Questão ${contentId.substring(0, 8)}...`,
          subtitle: 'Questão removida do sistema',
          questionStatement: 'Questão não encontrada',
          answer: 'Esta questão foi removida ou não existe mais'
        };
      }
      
      const questionData = questionDoc.data();
      const statement = questionData?.statement || questionData?.questionStatement || questionData?.question || questionData?.text || '';
      
      // Extrair texto limpo do enunciado
      let cleanTitle = this.extractTextFromContent(statement);
      if (!cleanTitle || cleanTitle.trim() === '') {
        cleanTitle = questionData?.title || `Questão ${contentId.substring(0, 8)}`;
      }
      
      const title = cleanTitle.length > 60 ? cleanTitle.substring(0, 60) + '...' : cleanTitle;
      
      // Buscar informações adicionais com fallbacks
      const subject = questionData?.subject || questionData?.category || questionData?.specialty || '';
      const difficulty = questionData?.difficulty ? ` (${questionData.difficulty})` : '';
      const subtitle = subject ? `${subject}${difficulty}` : 'Questão de múltipla escolha';
      
      return {
        title: title || `Questão ${contentId.substring(0, 8)}`,
        subtitle: subtitle,
        questionStatement: statement,
        answer: questionData?.correctAnswer || questionData?.explanation || 'Resposta não disponível',
        tags: questionData?.tags || [],
        subject: subject,
        difficulty: questionData?.difficulty
      };
    } catch (error) {
      logger.error(`Erro ao enriquecer questão completada ${contentId}:`, error);
      return {
        title: `Questão ${contentId.substring(0, 8)}`,
        subtitle: 'Erro ao carregar dados',
        questionStatement: 'Erro ao carregar questão',
        answer: 'Ocorreu um erro ao carregar esta questão'
      };
    }
  }

  /**
   * Enriquecer caderno de erros completado
   */
  private async enrichCompletedErrorNotebook(contentId: string): Promise<any> {
    try {
      const notebookDoc = await this.db.collection('errorNotebooks').doc(contentId).get();
      
      if (!notebookDoc.exists) {
        return {
          title: `Anotação ${contentId.substring(0, 8)}...`,
          subtitle: 'Anotação removida do sistema',
          content: 'Anotação não encontrada',
          answer: 'Esta anotação foi removida ou não existe mais'
        };
      }
      
      const notebookData = notebookDoc.data();
      const content = notebookData?.content || notebookData?.note || notebookData?.text || notebookData?.description || '';
      
      // Extrair texto limpo do conteúdo
      let cleanTitle = this.extractTextFromContent(content);
      if (!cleanTitle || cleanTitle.trim() === '') {
        cleanTitle = notebookData?.title || notebookData?.subject || `Anotação ${contentId.substring(0, 8)}`;
      }
      
      const title = cleanTitle.length > 60 ? cleanTitle.substring(0, 60) + '...' : cleanTitle;
      
      // Buscar informações adicionais com fallbacks
      const category = notebookData?.category || notebookData?.subject || notebookData?.specialty || '';
      const createdDate = notebookData?.createdAt ? DateUtils.parseDate(notebookData.createdAt)?.toLocaleDateString('pt-BR') || '' : '';
      
      let subtitle = 'Caderno de Erros';
      if (category && createdDate) {
        subtitle = `${category} • ${createdDate}`;
      } else if (category) {
        subtitle = category;
      } else if (createdDate) {
        subtitle = `Criado em ${createdDate}`;
      }
      
      return {
        title: title || `Anotação ${contentId.substring(0, 8)}`,
        subtitle: subtitle,
        content: content,
        answer: notebookData?.solution || notebookData?.explanation || content || 'Conteúdo não disponível',
        tags: notebookData?.tags || [],
        category: category,
        createdAt: notebookData?.createdAt
      };
    } catch (error) {
      logger.error(`Erro ao enriquecer caderno de erros completado ${contentId}:`, error);
      return {
        title: `Anotação ${contentId.substring(0, 8)}`,
        subtitle: 'Erro ao carregar dados',
        content: 'Erro ao carregar anotação',
        answer: 'Ocorreu um erro ao carregar esta anotação'
      };
    }
  }

  /**
   * Criar item de revisão unificado
   */
  async createReviewItem(data: CreateUnifiedReviewDTO): Promise<UnifiedReviewItem> {
    try {
      // Determinar deckId baseado no tipo de conteúdo
      const deckId = this.getDeckIdForContentType(data.contentType);
      
      // Criar FSRSCard
      const fsrsCard = this.fsrsService.createNewCard(data.contentId, data.userId, deckId);
      await this.fsrsService.saveCard(fsrsCard);
      
      // Enriquecer e retornar
      const enrichedItem = await this.enrichReviewItem(fsrsCard);
      if (!enrichedItem) {
        throw AppError.internal('Erro ao enriquecer item criado');
      }

      logger.info(`Item de revisão criado: ${data.contentType} ${data.contentId}, usuário ${data.userId}`);
      return enrichedItem;
    } catch (error) {
      logger.error('Erro ao criar item de revisão:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao criar item de revisão');
    }
  }

  /**
   * Enriquecer FSRSCard com metadados específicos do tipo
   */
  private async enrichReviewItem(card: FSRSCard): Promise<UnifiedReviewItem | null> {
    try {
      const contentType = this.detectContentType(card.deckId);
      const baseItem: Partial<UnifiedReviewItem> = {
        id: card.id,
        userId: card.userId,
        contentType,
        contentId: card.contentId,
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        last_review: card.last_review,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      };

      // Enriquecer baseado no tipo
      switch (contentType) {
        case UnifiedContentType.FLASHCARD:
          return await this.enrichFlashcardItem(baseItem as UnifiedReviewItem, card);
        
        case UnifiedContentType.QUESTION:
          return await this.enrichQuestionItem(baseItem as UnifiedReviewItem, card);
        
        case UnifiedContentType.ERROR_NOTEBOOK:
          return await this.enrichErrorNotebookItem(baseItem as UnifiedReviewItem, card);
        
        default:
          logger.warn(`Tipo de conteúdo desconhecido: ${card.deckId}`);
          return null;
      }
    } catch (error) {
      logger.error(`Erro ao enriquecer item ${card.id}:`, error);
      return null;
    }
  }

  /**
   * Enriquecer item de flashcard
   */
  private async enrichFlashcardItem(item: UnifiedReviewItem, card: FSRSCard): Promise<UnifiedReviewItem> {
    try {
      // Buscar dados reais do flashcard na coleção 'flashcards'
      const flashcardDoc = await this.db.collection('flashcards').doc(card.contentId).get();
      
      if (!flashcardDoc.exists) {
        logger.warn(`Flashcard ${card.contentId} não encontrado`);
        return {
          ...item,
          title: `Flashcard ${card.contentId} (não encontrado)`,
          subtitle: 'Flashcard removido',
          deckId: card.deckId,
          tags: [],
          front: 'Flashcard não encontrado',
          back: 'Este flashcard foi removido ou não existe mais',
          frontContent: 'Flashcard não encontrado',
          backContent: 'Este flashcard foi removido ou não existe mais'
        };
      }
      
      const flashcardData = flashcardDoc.data();
      
      // Extrair conteúdo completo do flashcard
      const frontContent = flashcardData?.frontContent || flashcardData?.front || '';
      const backContent = flashcardData?.backContent || flashcardData?.back || '';
      
      // Extrair título do conteúdo da frente (limitado a 60 caracteres)
      const title = this.extractTextFromContent(frontContent).substring(0, 60) + (frontContent.length > 60 ? '...' : '');
      
      // Buscar nome do deck usando cache
      let deckName = 'Deck';
      if (flashcardData?.deckId) {
        deckName = await this.getDeckNameCached(flashcardData.deckId);
      }

      
      return {
        ...item,
        title: title || 'Flashcard sem título',
        subtitle: deckName,
        deckId: flashcardData?.deckId || card.deckId,
        tags: flashcardData?.tags || [],
        // Adicionar campos esperados pelo ReviewCard
        front: frontContent,
        back: backContent,
        frontContent: frontContent,
        backContent: backContent,
        frontImage: flashcardData?.frontImage || null,
        backImage: flashcardData?.backImage || null,
        explanation: flashcardData?.explanation || flashcardData?.personalNotes || null
      };
    } catch (error) {
      logger.error(`Erro ao enriquecer flashcard ${card.contentId}:`, error);
      return {
        ...item,
        title: `Flashcard ${card.contentId} (erro)`,
        subtitle: 'Erro ao carregar dados',
        deckId: card.deckId,
        tags: [],
        front: 'Erro ao carregar flashcard',
        back: 'Ocorreu um erro ao carregar este flashcard',
        frontContent: 'Erro ao carregar flashcard',
        backContent: 'Ocorreu um erro ao carregar este flashcard'
      };
    }
  }

  /**
   * Enriquecer item de questão
   */
  private async enrichQuestionItem(item: UnifiedReviewItem, card: FSRSCard): Promise<UnifiedReviewItem> {
    try {
      // Buscar dados reais da questão na coleção 'questions'
      const questionDoc = await this.db.collection('questions').doc(card.contentId).get();
      
      if (!questionDoc.exists) {
        logger.warn(`Questão ${card.contentId} não encontrada`);
        return {
          ...item,
          title: `Questão ${card.contentId} (não encontrada)`,
          subtitle: 'Questão removida',
          questionStatement: 'Questão não encontrada',
          tags: []
        };
      }
      
      const questionData = questionDoc.data();
      
      // Extrair título do enunciado (limitado a 80 caracteres)
      const statement = questionData?.statement || questionData?.enunciado || '';
      const title = this.extractTextFromContent(statement).substring(0, 80) + (statement.length > 80 ? '...' : '');
      
      // Buscar informações de filtros/especialidades usando cache
      let subtitle = 'Questão';
      if (questionData?.filterIds && questionData.filterIds.length > 0) {
        subtitle = await this.getFilterNameCached(questionData.filterIds[0]);
      }
      
      return {
        ...item,
        title: title || 'Questão sem enunciado',
        subtitle: subtitle,
        questionStatement: statement,
        tags: questionData?.tags || []
      };
    } catch (error) {
      logger.error(`Erro ao enriquecer questão ${card.contentId}:`, error);
      return {
        ...item,
        title: `Questão ${card.contentId} (erro)`,
        subtitle: 'Erro ao carregar dados',
        questionStatement: 'Erro ao carregar enunciado',
        tags: []
      };
    }
  }

  /**
   * Enriquecer item de caderno de erros
   */
  private async enrichErrorNotebookItem(item: UnifiedReviewItem, card: FSRSCard): Promise<UnifiedReviewItem> {
    // Buscar dados da entrada através do serviço específico
    // Por enquanto, retornar dados básicos
    return {
      ...item,
      title: `Erro ${card.contentId}`,
      subtitle: 'Entrada do caderno de erros',
      errorDescription: 'Descrição do erro...',
      tags: []
    };
  }

  /**
   * Detectar tipo de conteúdo baseado no deckId
   */
  private detectContentType(deckId: string): UnifiedContentType {
    if (deckId === 'questions') {
      return UnifiedContentType.QUESTION;
    } else if (deckId === 'error-notebook') {
      return UnifiedContentType.ERROR_NOTEBOOK;
    } else {
      return UnifiedContentType.FLASHCARD;
    }
  }

  /**
   * Obter deckId para tipo de conteúdo
   */
  private getDeckIdForContentType(contentType: UnifiedContentType): string {
    switch (contentType) {
      case UnifiedContentType.QUESTION:
        return 'questions';
      case UnifiedContentType.ERROR_NOTEBOOK:
        return 'error-notebook';
      case UnifiedContentType.FLASHCARD:
      default:
        return 'flashcards';
    }
  }

  /**
   * Extrair texto limpo de conteúdo HTML
   */
  private extractTextFromContent(content: string): string {
    if (!content) return '';
    
    // Remover tags HTML básicas
    const cleanText = content
      .replace(/<[^>]*>/g, '') // Remove tags HTML
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; com espaço
      .replace(/&amp;/g, '&') // Replace &amp; com &
      .replace(/&lt;/g, '<') // Replace &lt; com <
      .replace(/&gt;/g, '>') // Replace &gt; com >
      .replace(/&quot;/g, '"') // Replace &quot; com "
      .replace(/&#39;/g, "'") // Replace &#39; com '
      .replace(/\s+/g, ' ') // Múltiplos espaços em um só
      .trim(); // Remove espaços no início e fim
    
    return cleanText;
  }

  /**
   * Obter nome do deck usando cache
   */
  private async getDeckNameCached(deckId: string): Promise<string> {
    const now = Date.now();
    const cached = this.deckCache.get(deckId);
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.name;
    }
    
    try {
      const deckDoc = await this.db.collection('decks').doc(deckId).get();
      const name = deckDoc.exists ? (deckDoc.data()?.name || deckDoc.data()?.title || 'Deck') : 'Deck';
      
      this.deckCache.set(deckId, { name, timestamp: now });
      return name;
    } catch (error) {
      logger.warn(`Erro ao buscar deck ${deckId}:`, error);
      return 'Deck';
    }
  }

  /**
   * Obter nome do filtro usando cache
   */
  private async getFilterNameCached(filterId: string): Promise<string> {
    const now = Date.now();
    const cached = this.filterCache.get(filterId);
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.name;
    }
    
    try {
      const filterDoc = await this.db.collection('filters').doc(filterId).get();
      const name = filterDoc.exists ? (filterDoc.data()?.name || 'Filtro') : 'Filtro';
      
      this.filterCache.set(filterId, { name, timestamp: now });
      return name;
    } catch (error) {
      logger.warn(`Erro ao buscar filtro ${filterId}:`, error);
      return 'Filtro';
    }
  }

  /**
   * Enriquecer múltiplos itens em lote para otimizar consultas
   */
  private async enrichReviewItemsBatch(cards: FSRSCard[]): Promise<UnifiedReviewItem[]> {
    if (cards.length === 0) return [];
    
    // Agrupar cards por tipo de conteúdo
    const flashcardCards = cards.filter(card => this.detectContentType(card.deckId) === UnifiedContentType.FLASHCARD);
    const questionCards = cards.filter(card => this.detectContentType(card.deckId) === UnifiedContentType.QUESTION);
    const errorCards = cards.filter(card => this.detectContentType(card.deckId) === UnifiedContentType.ERROR_NOTEBOOK);
    
    // Buscar dados em lote
    const [flashcardData, questionData] = await Promise.all([
      this.getFlashcardsBatch(flashcardCards.map(c => c.contentId)),
      this.getQuestionsBatch(questionCards.map(c => c.contentId))
    ]);
    
    // Enriquecer todos os cards
    const enrichedItems = await Promise.all([
      ...flashcardCards.map(card => this.enrichFlashcardItemBatch(card, flashcardData.get(card.contentId))),
      ...questionCards.map(card => this.enrichQuestionItemBatch(card, questionData.get(card.contentId))),
      ...errorCards.map(card => this.enrichErrorNotebookItem(this.createBaseItem(card), card))
    ]);
    
    return enrichedItems.filter(item => item !== null) as UnifiedReviewItem[];
  }

  /**
   * Buscar flashcards em lote
   */
  private async getFlashcardsBatch(contentIds: string[]): Promise<Map<string, any>> {
    const result = new Map<string, any>();
    
    if (contentIds.length === 0) return result;
    
    // Firestore limita 'in' a 10 elementos
    for (let i = 0; i < contentIds.length; i += 10) {
      const batch = contentIds.slice(i, i + 10);
      const snapshot = await this.db.collection('flashcards')
        .where(firestore.FieldPath.documentId(), 'in', batch)
        .get();
      
      snapshot.docs.forEach(doc => {
        result.set(doc.id, doc.data());
      });
    }
    
    return result;
  }

  /**
   * Buscar questões em lote
   */
  private async getQuestionsBatch(contentIds: string[]): Promise<Map<string, any>> {
    const result = new Map<string, any>();
    
    if (contentIds.length === 0) return result;
    
    // Firestore limita 'in' a 10 elementos
    for (let i = 0; i < contentIds.length; i += 10) {
      const batch = contentIds.slice(i, i + 10);
      const snapshot = await this.db.collection('questions')
         .where(firestore.FieldPath.documentId(), 'in', batch)
          .get();
      
      snapshot.docs.forEach(doc => {
        result.set(doc.id, doc.data());
      });
    }
    
    return result;
  }

  /**
   * Criar item base para enriquecimento
   */
  private createBaseItem(card: FSRSCard): UnifiedReviewItem {
    const contentType = this.detectContentType(card.deckId);
    return {
      id: card.id,
      userId: card.userId,
      contentType,
      contentId: card.contentId,
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    } as UnifiedReviewItem;
  }

  /**
   * Enriquecer flashcard usando dados em lote
   */
  private async enrichFlashcardItemBatch(card: FSRSCard, flashcardData?: any): Promise<UnifiedReviewItem | null> {
    const baseItem = this.createBaseItem(card);
    
    if (!flashcardData) {
      return {
        ...baseItem,
        title: `Flashcard ${card.contentId} (não encontrado)`,
        subtitle: 'Flashcard removido',
        deckId: card.deckId,
        tags: [],
        front: 'Flashcard não encontrado',
        back: 'Este flashcard foi removido ou não existe mais',
        frontContent: 'Flashcard não encontrado',
        backContent: 'Este flashcard foi removido ou não existe mais'
      };
    }
    
    const frontContent = flashcardData?.frontContent || flashcardData?.front || '';
    const backContent = flashcardData?.backContent || flashcardData?.back || '';
    const title = this.extractTextFromContent(frontContent).substring(0, 60) + (frontContent.length > 60 ? '...' : '');
    
    let deckName = 'Deck';
    if (flashcardData?.deckId) {
      deckName = await this.getDeckNameCached(flashcardData.deckId);
    }
    
    return {
      ...baseItem,
      title: title || 'Flashcard sem título',
      subtitle: deckName,
      deckId: flashcardData?.deckId || card.deckId,
      tags: flashcardData?.tags || [],
      front: frontContent,
      back: backContent,
      frontContent: frontContent,
      backContent: backContent,
      frontImage: flashcardData?.frontImage || null,
      backImage: flashcardData?.backImage || null,
      explanation: flashcardData?.explanation || flashcardData?.personalNotes || null
    };
  }

  /**
   * Enriquecer questão usando dados em lote
   */
  private async enrichQuestionItemBatch(card: FSRSCard, questionData?: any): Promise<UnifiedReviewItem | null> {
    const baseItem = this.createBaseItem(card);
    
    if (!questionData) {
      return {
        ...baseItem,
        title: `Questão ${card.contentId} (não encontrada)`,
        subtitle: 'Questão removida',
        questionStatement: 'Questão não encontrada',
        tags: []
      };
    }
    
    const statement = questionData?.statement || questionData?.enunciado || '';
    const title = this.extractTextFromContent(statement).substring(0, 80) + (statement.length > 80 ? '...' : '');
    
    let subtitle = 'Questão';
    if (questionData?.filterIds && questionData.filterIds.length > 0) {
      subtitle = await this.getFilterNameCached(questionData.filterIds[0]);
    }
    
    return {
      ...baseItem,
      title: title || 'Questão sem enunciado',
      subtitle: subtitle,
      questionStatement: statement,
      tags: questionData?.tags || []
    };
  }
}