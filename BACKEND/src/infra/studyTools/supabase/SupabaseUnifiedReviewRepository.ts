import { SupabaseClient } from '@supabase/supabase-js';
import { v5 as uuidv5 } from 'uuid';
import {
  UnifiedReviewItem,
  UnifiedContentType,
  DailyReviewSummary,
  CreateUnifiedReviewDTO,
  UnifiedReviewFilters,
  PaginatedReviewResult,
  FSRSState,
} from '../../../domain/studyTools/unifiedReviews/types';
// FSRS Types and Enums - moved from SupabaseFSRSService
export enum FSRSGrade {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3,
}

export interface FSRSCard {
  id: string;
  user_id: string;
  content_id: string;
  deck_id: string;
  
  // Parâmetros FSRS
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: FSRSState;
  last_review: Date | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface IUnifiedReviewRepository {
  getDueReviewsPaginated(
    userId: string,
    filters?: UnifiedReviewFilters,
  ): Promise<PaginatedReviewResult>;
  getDueReviews(
    userId: string,
    filters?: UnifiedReviewFilters,
  ): Promise<UnifiedReviewItem[]>;
  recordUnifiedReview(
    contentType: UnifiedContentType,
    contentId: string,
    userId: string,
    grade: FSRSGrade,
    reviewTimeMs?: number,
  ): Promise<UnifiedReviewItem>;
  getTodayReviews(userId: string, limit?: number): Promise<UnifiedReviewItem[]>;
  getDailyReviewSummary(userId: string): Promise<DailyReviewSummary>;
  getFutureReviews(
    userId: string,
    filters?: UnifiedReviewFilters,
  ): Promise<UnifiedReviewItem[]>;
  getCompletedReviews(
    userId: string,
    filters?: {
      limit?: number;
      days?: number;
      contentType?: UnifiedContentType;
    },
  ): Promise<any[]>;
  createReviewItem(data: CreateUnifiedReviewDTO): Promise<UnifiedReviewItem>;
}

export class SupabaseUnifiedReviewRepository
implements IUnifiedReviewRepository {
  constructor(private supabase: SupabaseClient) {
    // PlannerService removido - não estava sendo utilizado
  }

  // Funções utilitárias removidas - agora usa UTC puro

  

  async getDueReviewsPaginated(
    userId: string,
    filters?: UnifiedReviewFilters,
  ): Promise<PaginatedReviewResult> {
    const pageSize = filters?.page_size || 20;
    const now = new Date().toISOString();

    let query = this.supabase
      .from('fsrs_cards')
      .select('*')
      .eq('user_id', userId)
      .order('due', { ascending: true });

    // Apply due filter if dueOnly is active
    if (filters?.due_only) {
      query = query.lte('due', now);
    }

    // Apply content type filter
    if (filters?.content_type) {
      const deckId = this.getDeckIdForContentType(filters.content_type);
      query = query.eq('deck_id', deckId);
    }

    // Apply pagination
    if (filters?.cursor) {
      query = query.gt('due', filters.cursor);
    }

    query = query.limit(pageSize + 1); // +1 to check if there are more items

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get due reviews: ${error.message}`);
    }

    const hasMore = data.length > pageSize;
    const items = hasMore ? data.slice(0, pageSize) : data;
    const nextCursor = hasMore ? items[items.length - 1].due : null;

    const enrichedItems = await Promise.all(
      items.map((card) => this.enrichReviewItem(this.mapToFSRSCard(card))),
    );

    const validItems = enrichedItems.filter(
      (item) => item !== null,
    ) as UnifiedReviewItem[];

    return {
      items: validItems,
      has_more: hasMore,
      next_cursor: nextCursor,
      total_count: validItems.length,
    };
  }

  async getDueReviews(
    userId: string,
    filters?: UnifiedReviewFilters,
  ): Promise<UnifiedReviewItem[]> {
    const now = new Date().toISOString();

    let query = this.supabase
      .from('fsrs_cards')
      .select('*')
      .eq('user_id', userId)
      .lte('due', now)
      .order('due', { ascending: true });

    if (filters?.content_type) {
      const deckId = this.getDeckIdForContentType(filters.content_type);
      query = query.eq('deck_id', deckId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get due reviews: ${error.message}`);
    }

    const enrichedItems = await Promise.all(
      data.map((card) => this.enrichReviewItem(this.mapToFSRSCard(card))),
    );

    return enrichedItems.filter((item) => item !== null) as UnifiedReviewItem[];
  }

  async recordUnifiedReview(
    contentType: UnifiedContentType,
    contentId: string,
    userId: string,
    grade: FSRSGrade,
    reviewTimeMs?: number,
  ): Promise<UnifiedReviewItem> {
    const now = new Date().toISOString();

    // Get the FSRS card
    const { data: cardData, error: cardError } = await this.supabase
      .from('fsrs_cards')
      .select('*')
      .eq('content_id', contentId)
      .eq('user_id', userId)
      .single();

    if (cardError) {
      throw new Error(`Failed to find FSRS card: ${cardError.message}`);
    }

    const card = this.mapToFSRSCard(cardData);

    // Update the card with new review data (this would typically involve FSRS algorithm)
    // For now, we'll update basic fields
    const updatedCard = {
      ...card,
      last_review: new Date(),
      reps: card.reps + 1,
      // Additional FSRS calculations would go here
    };

    // Update the card in database
    const { error: updateError } = await this.supabase
      .from('fsrs_cards')
      .update({
        last_review: now,
        reps: updatedCard.reps,
        updated_at: now,
      })
      .eq('content_id', contentId)
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to update FSRS card: ${updateError.message}`);
    }

    // Save review history
    await this.saveReviewHistory(
      userId,
      contentType,
      contentId,
      grade,
      reviewTimeMs,
      updatedCard,
    );

    // Return enriched review item
    const enrichedItem = await this.enrichReviewItem(updatedCard);
    if (!enrichedItem) {
      throw new Error('Failed to enrich review item');
    }

    return enrichedItem;
  }

  async getTodayReviews(
    userId: string,
    limit: number = 50,
  ): Promise<UnifiedReviewItem[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await this.supabase
      .from('review_history')
      .select('*')
      .eq('user_id', userId)
      .gte('reviewed_at', today.toISOString())
      .lt('reviewed_at', tomorrow.toISOString())
      .order('reviewed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get today reviews: ${error.message}`);
    }

    // Convert review history to unified review items
    const items: UnifiedReviewItem[] = [];
    for (const review of data) {
      const item = await this.convertReviewHistoryToUnifiedItem(review);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  async getDailyReviewSummary(userId: string): Promise<DailyReviewSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get due items count
    const { count: dueCount, error: dueError } = await this.supabase
      .from('fsrs_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due', new Date().toISOString());

    if (dueError) {
      throw new Error(`Failed to get due count: ${dueError.message}`);
    }

    // Get today's completed reviews
    const { count: todayCount, error: todayError } = await this.supabase
      .from('review_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('reviewed_at', today.toISOString())
      .lt('reviewed_at', tomorrow.toISOString());

    if (todayError) {
      throw new Error(`Failed to get today count: ${todayError.message}`);
    }

    // Get breakdown by content type
    const { data: breakdownData, error: breakdownError } = await this.supabase
      .from('fsrs_cards')
      .select('deck_id')
      .eq('user_id', userId)
      .lte('due', new Date().toISOString());

    if (breakdownError) {
      throw new Error(`Failed to get breakdown: ${breakdownError.message}`);
    }

    let flashcards = 0;
    let questions = 0;
    let errorNotes = 0;

    breakdownData.forEach((item) => {
      const contentType = this.detectContentType(item.deck_id);
      switch (contentType) {
        case UnifiedContentType.FLASHCARD:
          flashcards++;
          break;
        case UnifiedContentType.QUESTION:
          questions++;
          break;
        case UnifiedContentType.ERROR_NOTEBOOK:
          errorNotes++;
          break;
      }
    });

    return {
      total_items: dueCount || 0,
      today_items: todayCount || 0,
      old_items: Math.max(0, (dueCount || 0) - (todayCount || 0)),
      flashcards,
      questions,
      error_notes: errorNotes,
      estimated_time_minutes: Math.ceil((dueCount || 0) * 1.5), // Estimate 1.5 min per item
      breakdown: {
        by_deck: [], // Would need additional queries to populate
        by_subject: [],
        by_difficulty: [],
      },
    };
  }

  async getFutureReviews(
    userId: string,
    filters?: UnifiedReviewFilters,
  ): Promise<UnifiedReviewItem[]> {
    const now = new Date().toISOString();

    let query = this.supabase
      .from('fsrs_cards')
      .select('*')
      .eq('user_id', userId)
      .gt('due', now)
      .order('due', { ascending: true });

    if (filters?.content_type) {
      const deckId = this.getDeckIdForContentType(filters.content_type);
      query = query.eq('deck_id', deckId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get future reviews: ${error.message}`);
    }

    const enrichedItems = await Promise.all(
      data.map((card) => this.enrichReviewItem(this.mapToFSRSCard(card))),
    );

    return enrichedItems.filter((item) => item !== null) as UnifiedReviewItem[];
  }

  async getCompletedReviews(
    userId: string,
    filters?: {
      limit?: number;
      days?: number;
      content_type?: UnifiedContentType;
    },
  ): Promise<any[]> {
    const limit = filters?.limit || 50;
    const days = filters?.days || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = this.supabase
      .from('review_history')
      .select('*')
      .eq('user_id', userId)
      .gte('reviewed_at', startDate.toISOString())
      .order('reviewed_at', { ascending: false })
      .limit(limit);

    if (filters?.content_type) {
      query = query.eq('content_type', filters.content_type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get completed reviews: ${error.message}`);
    }

    return data || [];
  }

  async createReviewItem(
    data: CreateUnifiedReviewDTO,
  ): Promise<UnifiedReviewItem> {
    const now = new Date().toISOString();
    const deckId = this.getDeckIdForContentType(data.content_type);

    // Create FSRS card
    const cardData = {
      user_id: data.user_id,
      content_id: data.content_id,
      content_type: data.content_type, // Usar content_type diretamente
      deck_id: deckId, // Será null para questões e cadernos de erros
      due: now,
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 0,
      lapses: 0,
      state: FSRSState.NEW,
      last_review: null,
      created_at: now,
      updated_at: now,
    };

    const { data: result, error } = await this.supabase
      .from('fsrs_cards')
      .insert(cardData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create review item: ${error.message}`);
    }

    const enrichedItem = await this.enrichReviewItem(
      this.mapToFSRSCard(result),
    );
    if (!enrichedItem) {
      throw new Error('Failed to enrich created review item');
    }

    return enrichedItem;
  }

  private async saveReviewHistory(
    userId: string,
    contentType: UnifiedContentType,
    contentId: string,
    grade: FSRSGrade,
    reviewTimeMs: number | undefined,
    updatedCard: FSRSCard,
    isActiveReview: boolean = true
  ): Promise<void> {
    const { v5: uuidv5 } = await import('uuid');
    
    // Converter content_id string para UUID se necessário
    let contentUuid: string;
    if (typeof contentId === 'string' && contentId.length > 36) {
      // Usar UUID v5 para gerar UUID determinístico a partir da string
      // Namespace DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      contentUuid = uuidv5(contentId, '6ba7b810-9dad-11d1-80b4-00c04fd430c8');
    } else {
      contentUuid = contentId;
    }
    
    const historyData = {
      user_id: userId,
      content_type: contentType,
      content_id: contentUuid,
      grade: grade,
      review_time_ms: reviewTimeMs,
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      state: updatedCard.state,
      due: updatedCard.due.toISOString(),
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
      elapsed_days: updatedCard.elapsed_days,
      scheduled_days: updatedCard.scheduled_days,
      last_review: updatedCard.last_review?.toISOString() || null,
      reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      is_active_review: isActiveReview,
    };

    const { error } = await this.supabase
      .from('review_history')
      .insert(historyData);

    if (error) {
      throw new Error(`Failed to save review history: ${error.message}`);
    }
  }

  private async enrichReviewItem(
    card: FSRSCard,
  ): Promise<UnifiedReviewItem | null> {
    const contentType = this.detectContentType(card.deck_id);

    const baseItem: UnifiedReviewItem = {
      id: card.content_id,
      user_id: card.user_id,
      content_type: contentType,
      content_id: card.content_id,
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review,
      title: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Enrich based on content type
    switch (contentType) {
      case UnifiedContentType.FLASHCARD:
        return this.enrichFlashcardItem(baseItem, card);
      case UnifiedContentType.QUESTION:
        return this.enrichQuestionItem(baseItem, card);
      case UnifiedContentType.ERROR_NOTEBOOK:
        return this.enrichErrorNotebookItem(baseItem, card);
      default:
        return null;
    }
  }

  private async enrichFlashcardItem(
    item: UnifiedReviewItem,
    card: FSRSCard,
  ): Promise<UnifiedReviewItem> {
    const { data: flashcard, error } = await this.supabase
      .from('flashcards')
      .select('front, back, deck_id, tags')
      .eq('id', card.content_id)
      .single();

    if (error) {
      return { ...item, title: 'Flashcard não encontrado' };
    }

    // Get deck name
    await this.supabase
      .from('decks')
      .select('name')
      .eq('id', flashcard.deck_id)
      .single();

    return {
      ...item,
      title: this.extractTextFromContent(flashcard.front),
      subtitle: this.extractPlainTextFromContent(flashcard.back),
      tags: flashcard.tags || [],
      deck_id: flashcard.deck_id,
    };
  }

  private async enrichQuestionItem(
    item: UnifiedReviewItem,
    card: FSRSCard,
  ): Promise<UnifiedReviewItem> {
    const { data: question, error } = await this.supabase
      .from('questions')
      .select('title, content')
      .eq('id', card.content_id)
      .single();

    if (error) {
      console.warn(`Questão ${card.content_id} não encontrada no enrich:`, error);
      return { ...item, title: 'Questão não encontrada' };
    }

    return {
      ...item,
      title: this.extractTextFromContent(question.title || question.content),
      question_statement: question.content,
    };
  }

  private async enrichErrorNotebookItem(
    item: UnifiedReviewItem,
    card: FSRSCard,
  ): Promise<UnifiedReviewItem> {
    const { data: entry, error } = await this.supabase
      .from('error_notebook_entries')
      .select('user_note, user_explanation, notebook_id')
      .eq('id', card.content_id)
      .single();

    if (error) {
      return { ...item, title: 'Entrada do caderno não encontrada' };
    }

    return {
      ...item,
      title: this.extractTextFromContent(entry.user_note),
      error_description: entry.user_explanation,
      error_notebook_id: entry.notebook_id,
    };
  }

  private async convertReviewHistoryToUnifiedItem(
    _review: any,
  ): Promise<UnifiedReviewItem | null> {
    // This would convert a review history record back to a UnifiedReviewItem
    // Implementation depends on the specific structure needed
    return null;
  }

  private detectContentType(deck_id: string, content_type?: string): UnifiedContentType {
    // Se content_type está disponível, use-o diretamente
    if (content_type) {
      switch (content_type.toUpperCase()) {
        case 'FLASHCARD':
          return UnifiedContentType.FLASHCARD;
        case 'QUESTION':
          return UnifiedContentType.QUESTION;
        case 'ERROR_NOTEBOOK':
          return UnifiedContentType.ERROR_NOTEBOOK;
        default:
          return UnifiedContentType.FLASHCARD;
      }
    }
    
    // Fallback para compatibilidade com dados antigos que usam deck_id
    if (deck_id.startsWith('flashcard_')) {
      return UnifiedContentType.FLASHCARD;
    } else if (deck_id.startsWith('question_')) {
      return UnifiedContentType.QUESTION;
    } else if (deck_id.startsWith('error_')) {
      return UnifiedContentType.ERROR_NOTEBOOK;
    }
    return UnifiedContentType.FLASHCARD; // default
  }

  private getDeckIdForContentType(contentType: UnifiedContentType): string | null {
    // Para questões e cadernos de erros, não usamos deck_id
    switch (contentType) {
      case UnifiedContentType.FLASHCARD:
        return 'flashcard_deck'; // Apenas flashcards usam deck_id
      case UnifiedContentType.QUESTION:
        return null; // Questões não precisam de deck_id
      case UnifiedContentType.ERROR_NOTEBOOK:
        return null; // Cadernos de erros não precisam de deck_id
      default:
        return null;
    }
  }

  private extractTextFromContent(content: string): string {
    if (!content) {
      return "";
    }

    // Preserve HTML content for titles
    // Limit to first 200 characters to accommodate HTML tags
    return content.length > 200
      ? content.substring(0, 200) + '...'
      : content;
  }

  private extractPlainTextFromContent(content: string): string {
    if (!content) {
      return "";
    }

    // Remove HTML tags for plain text extraction
    const withoutHtml = content.replace(/<[^>]*>/g, '');

    // Limit to first 100 characters
    return withoutHtml.length > 100
      ? withoutHtml.substring(0, 100) + '...'
      : withoutHtml;
  }

  async getReviewHistory(userId: string, contentId: string): Promise<any[]> {
    // Convert contentId to UUID if it's a long string
    let searchContentId = contentId;
    if (contentId.length > 36) {
      searchContentId = uuidv5(contentId, uuidv5.DNS);
    }

    const { data, error } = await this.supabase
      .from('review_history')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', searchContentId)
      .order('reviewed_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to get review history: ${error instanceof Error ? error.message : String(error)}`);
    }

    return data || [];
  }

  private mapToFSRSCard(data: any): FSRSCard {
    return {
      id: data.id,
      user_id: data.user_id,
      content_id: data.content_id,
      deck_id: data.deck_id,
      due: new Date(data.due),
      stability: data.stability,
      difficulty: data.difficulty,
      elapsed_days: data.elapsed_days,
      scheduled_days: data.scheduled_days,
      reps: data.reps,
      lapses: data.lapses,
      state: data.state,
      last_review: data.last_review ? new Date(data.last_review) : null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}


