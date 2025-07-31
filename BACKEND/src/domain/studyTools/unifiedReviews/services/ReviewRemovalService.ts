import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { UnifiedContentType } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

const REMOVED_REVIEW_ITEMS_COLLECTION = 'removedReviewItems';
const UNIFIED_REVIEWS_COLLECTION = 'unifiedReviews';
const FSRS_CARDS_COLLECTION = 'fsrsCards';

export enum RemovalReason {
  USER_REQUEST = 'USER_REQUEST', // Usuário solicitou remoção
  CONTENT_DELETED = 'CONTENT_DELETED', // Conteúdo original foi deletado
  DUPLICATE = 'DUPLICATE', // Item duplicado
  MASTERED = 'MASTERED', // Item dominado pelo usuário
  INAPPROPRIATE = 'INAPPROPRIATE', // Conteúdo inapropriado
  SYSTEM_CLEANUP = 'SYSTEM_CLEANUP' // Limpeza automática do sistema
}

export interface RemovedReviewItem {
  id: string;
  userId: string;
  contentType: UnifiedContentType;
  contentId: string;
  originalReviewId: string; // ID original do UnifiedReviewItem
  
  // Dados do item removido (para histórico)
  title: string;
  subtitle?: string;
  lastDue: Date;
  lastStability: number;
  lastDifficulty: number;
  totalReps: number;
  totalLapses: number;
  
  // Dados da remoção
  removalReason: RemovalReason;
  removalNotes?: string;
  removedAt: Timestamp;
  removedBy: string; // userId ou 'SYSTEM'
  
  // Opções de restauração
  canRestore: boolean;
  restoredAt?: Timestamp;
  restoredBy?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RemovalStats {
  totalRemoved: number;
  byReason: Record<RemovalReason, number>;
  byContentType: Record<UnifiedContentType, number>;
  recentRemovals: RemovedReviewItem[];
  canRestoreCount: number;
}

export interface BulkRemovalResult {
  totalRequested: number;
  successfullyRemoved: number;
  failed: number;
  errors: Array<{ contentId: string; error: string }>;
  removedItems: RemovedReviewItem[];
}

/**
 * Service para gerenciar remoção de itens do sistema de revisões
 */
export class ReviewRemovalService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Remover um item do sistema de revisões
   */
  async removeFromReviewSystem(
    userId: string,
    contentType: UnifiedContentType,
    contentId: string,
    reason: RemovalReason,
    notes?: string
  ): Promise<RemovedReviewItem> {
    try {
      // Buscar o item de revisão
      const reviewItem = await this.findUnifiedReviewItem(userId, contentType, contentId);
      if (!reviewItem) {
        throw new AppError('Item de revisão não encontrado', 404);
      }

      // Buscar o card FSRS correspondente
      const fsrsCard = await this.findFSRSCard(reviewItem.id);

      const now = Timestamp.now();
      const removalDocRef = this.db.collection(REMOVED_REVIEW_ITEMS_COLLECTION).doc();
      
      // Criar registro de remoção
      const removedItem: RemovedReviewItem = {
        id: removalDocRef.id,
        userId,
        contentType,
        contentId,
        originalReviewId: reviewItem.id,
        
        title: reviewItem.title,
        subtitle: reviewItem.subtitle,
        lastDue: reviewItem.due,
        lastStability: reviewItem.stability,
        lastDifficulty: reviewItem.difficulty,
        totalReps: reviewItem.reps,
        totalLapses: reviewItem.lapses,
        
        removalReason: reason,
        removalNotes: notes,
        removedAt: now,
        removedBy: userId,
        
        canRestore: reason !== RemovalReason.CONTENT_DELETED,
        
        createdAt: now,
        updatedAt: now,
      };

      // Executar remoção em batch
      const batch = this.db.batch();
      
      // 1. Salvar registro de remoção
      batch.set(removalDocRef, removedItem);
      
      // 2. Remover do unified reviews
      batch.delete(this.db.collection(UNIFIED_REVIEWS_COLLECTION).doc(reviewItem.id));
      
      // 3. Remover card FSRS se existir
      if (fsrsCard) {
        batch.delete(this.db.collection(FSRS_CARDS_COLLECTION).doc(fsrsCard.id));
      }

      // 4. Atualizar o conteúdo original para marcar como removido do sistema
      await this.updateOriginalContent(contentType, contentId, false);

      await batch.commit();

      console.log(`Item removido do sistema de revisões: ${contentType}:${contentId}`, {
        userId,
        reason,
        reviewId: reviewItem.id
      });

      return removedItem;
    } catch (error) {
      console.error('Erro ao remover item do sistema de revisões:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao remover item do sistema de revisões', 500);
    }
  }

  /**
   * Remover múltiplos itens em lote
   */
  async bulkRemoveFromReviewSystem(
    userId: string,
    items: Array<{
      contentType: UnifiedContentType;
      contentId: string;
      reason: RemovalReason;
      notes?: string;
    }>
  ): Promise<BulkRemovalResult> {
    const result: BulkRemovalResult = {
      totalRequested: items.length,
      successfullyRemoved: 0,
      failed: 0,
      errors: [],
      removedItems: []
    };

    for (const item of items) {
      try {
        const removedItem = await this.removeFromReviewSystem(
          userId,
          item.contentType,
          item.contentId,
          item.reason,
          item.notes
        );
        
        result.successfullyRemoved++;
        result.removedItems.push(removedItem);
      } catch (error) {
        result.failed++;
        result.errors.push({
          contentId: item.contentId,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    return result;
  }

  /**
   * Restaurar item removido para o sistema de revisões
   */
  async restoreToReviewSystem(
    userId: string,
    removedItemId: string
  ): Promise<void> {
    try {
      // Buscar item removido
      const removedDoc = await this.db
        .collection(REMOVED_REVIEW_ITEMS_COLLECTION)
        .doc(removedItemId)
        .get();

      if (!removedDoc.exists) {
        throw new AppError('Item removido não encontrado', 404);
      }

      const removedItem = removedDoc.data() as RemovedReviewItem;

      // Verificar se o usuário tem permissão
      if (removedItem.userId !== userId) {
        throw new AppError('Sem permissão para restaurar este item', 403);
      }

      // Verificar se pode ser restaurado
      if (!removedItem.canRestore) {
        throw new AppError('Este item não pode ser restaurado', 400);
      }

      // Verificar se o conteúdo original ainda existe
      const contentExists = await this.checkContentExists(
        removedItem.contentType,
        removedItem.contentId
      );

      if (!contentExists) {
        throw new AppError('Conteúdo original não existe mais', 400);
      }

      // Recriar o item de revisão
      const now = Timestamp.now();
      const reviewDocRef = this.db.collection(UNIFIED_REVIEWS_COLLECTION).doc();
      
      const restoredReviewItem = {
        id: reviewDocRef.id,
        userId,
        contentType: removedItem.contentType,
        contentId: removedItem.contentId,
        
        // Restaurar dados FSRS
        due: removedItem.lastDue,
        stability: removedItem.lastStability,
        difficulty: removedItem.lastDifficulty,
        elapsed_days: 0,
        scheduled_days: 1,
        reps: removedItem.totalReps,
        lapses: removedItem.totalLapses,
        state: 'Review', // Estado padrão
        
        // Metadados
        title: removedItem.title,
        subtitle: removedItem.subtitle,
        
        createdAt: now,
        updatedAt: now,
      };

      // Executar restauração em batch
      const batch = this.db.batch();
      
      // 1. Recriar item de revisão
      batch.set(reviewDocRef, restoredReviewItem);
      
      // 2. Marcar como restaurado
      batch.update(removedDoc.ref, {
        restoredAt: now,
        restoredBy: userId,
        updatedAt: now
      });

      // 3. Atualizar conteúdo original
      await this.updateOriginalContent(removedItem.contentType, removedItem.contentId, true);

      await batch.commit();

      console.log(`Item restaurado para o sistema de revisões: ${removedItem.contentType}:${removedItem.contentId}`, {
        userId,
        removedItemId
      });

    } catch (error) {
      console.error('Erro ao restaurar item:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao restaurar item', 500);
    }
  }

  /**
   * Obter itens removidos do usuário
   */
  async getRemovedItems(
    userId: string,
    options: {
      contentType?: UnifiedContentType;
      reason?: RemovalReason;
      canRestoreOnly?: boolean;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{
    items: RemovedReviewItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      let query = this.db
        .collection(REMOVED_REVIEW_ITEMS_COLLECTION)
        .where('userId', '==', userId);

      // Aplicar filtros
      if (options.contentType) {
        query = query.where('contentType', '==', options.contentType);
      }
      if (options.reason) {
        query = query.where('removalReason', '==', options.reason);
      }
      if (options.canRestoreOnly) {
        query = query.where('canRestore', '==', true);
      }

      // Contar total
      const totalQuery = await query.get();
      const total = totalQuery.size;

      // Aplicar paginação
      const limit = options.limit || 20;
      const page = options.page || 1;
      const offset = (page - 1) * limit;

      const itemsQuery = await query
        .orderBy('removedAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const items = itemsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RemovedReviewItem));

      return {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Erro ao buscar itens removidos:', error);
      throw new AppError('Erro ao buscar itens removidos', 500);
    }
  }

  /**
   * Obter estatísticas de remoção
   */
  async getRemovalStats(userId: string): Promise<RemovalStats> {
    try {
      const removedQuery = await this.db
        .collection(REMOVED_REVIEW_ITEMS_COLLECTION)
        .where('userId', '==', userId)
        .get();

      const removedItems = removedQuery.docs.map(doc => doc.data() as RemovedReviewItem);

      // Contar por razão
      const byReason: Record<RemovalReason, number> = {
        [RemovalReason.USER_REQUEST]: 0,
        [RemovalReason.CONTENT_DELETED]: 0,
        [RemovalReason.DUPLICATE]: 0,
        [RemovalReason.MASTERED]: 0,
        [RemovalReason.INAPPROPRIATE]: 0,
        [RemovalReason.SYSTEM_CLEANUP]: 0,
      };

      // Contar por tipo de conteúdo
      const byContentType: Record<UnifiedContentType, number> = {
        [UnifiedContentType.FLASHCARD]: 0,
        [UnifiedContentType.QUESTION]: 0,
        [UnifiedContentType.ERROR_NOTEBOOK]: 0,
      };

      removedItems.forEach(item => {
        byReason[item.removalReason]++;
        byContentType[item.contentType]++;
      });

      // Itens recentes (últimos 10)
      const recentRemovals = removedItems
        .sort((a, b) => b.removedAt.toMillis() - a.removedAt.toMillis())
        .slice(0, 10);

      // Contagem de itens que podem ser restaurados
      const canRestoreCount = removedItems.filter(item => item.canRestore).length;

      return {
        totalRemoved: removedItems.length,
        byReason,
        byContentType,
        recentRemovals,
        canRestoreCount
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de remoção:', error);
      throw new AppError('Erro ao obter estatísticas de remoção', 500);
    }
  }

  /**
   * Limpeza automática de itens antigos
   */
  async cleanupOldRemovedItems(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      const oldItemsQuery = await this.db
        .collection(REMOVED_REVIEW_ITEMS_COLLECTION)
        .where('removedAt', '<', cutoffTimestamp)
        .where('canRestore', '==', false)
        .get();

      const batch = this.db.batch();
      let deletedCount = 0;

      oldItemsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();
        console.log(`Limpeza automática: ${deletedCount} itens removidos permanentemente`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Erro na limpeza automática:', error);
      throw new AppError('Erro na limpeza automática', 500);
    }
  }

  // Métodos privados auxiliares

  private async findUnifiedReviewItem(
    userId: string,
    contentType: UnifiedContentType,
    contentId: string
  ): Promise<any> {
    const reviewQuery = await this.db
      .collection(UNIFIED_REVIEWS_COLLECTION)
      .where('userId', '==', userId)
      .where('contentType', '==', contentType)
      .where('contentId', '==', contentId)
      .limit(1)
      .get();

    if (reviewQuery.empty) {
      return null;
    }

    const doc = reviewQuery.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  private async findFSRSCard(reviewId: string): Promise<any> {
    const cardQuery = await this.db
      .collection(FSRS_CARDS_COLLECTION)
      .where('unifiedReviewId', '==', reviewId)
      .limit(1)
      .get();

    if (cardQuery.empty) {
      return null;
    }

    const doc = cardQuery.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  private async updateOriginalContent(
    contentType: UnifiedContentType,
    contentId: string,
    isInReviewSystem: boolean
  ): Promise<void> {
    try {
      let collection: string;
      switch (contentType) {
        case UnifiedContentType.QUESTION:
          collection = 'questionResponses';
          break;
        case UnifiedContentType.FLASHCARD:
          collection = 'flashcards';
          break;
        case UnifiedContentType.ERROR_NOTEBOOK:
          collection = 'errorNotebookEntries';
          break;
        default:
          return;
      }

      await this.db
        .collection(collection)
        .doc(contentId)
        .update({
          isInReviewSystem,
          updatedAt: Timestamp.now()
        });
    } catch (error) {
      console.error('Erro ao atualizar conteúdo original:', error);
      // Não lançar erro para não interromper o processo principal
    }
  }

  private async checkContentExists(
    contentType: UnifiedContentType,
    contentId: string
  ): Promise<boolean> {
    try {
      let collection: string;
      switch (contentType) {
        case UnifiedContentType.QUESTION:
          collection = 'questions';
          break;
        case UnifiedContentType.FLASHCARD:
          collection = 'flashcards';
          break;
        case UnifiedContentType.ERROR_NOTEBOOK:
          collection = 'errorNotebookEntries';
          break;
        default:
          return false;
      }

      const doc = await this.db.collection(collection).doc(contentId).get();
      return doc.exists;
    } catch (error) {
      console.error('Erro ao verificar existência do conteúdo:', error);
      return false;
    }
  }
}