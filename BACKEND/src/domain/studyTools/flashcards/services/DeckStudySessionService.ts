import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../../../utils/logger';
import { AppError } from '../../../../shared/errors/AppError';

export interface DeckStudySession {
    id: string;
    user_id: string;
    deck_id: string;
    current_index: number;
    total_cards: number;
    studied_cards: number;
    reviewed_card_ids: string[];
    last_activity_at: string;
    created_at: string;
    updated_at: string;
}

export class DeckStudySessionService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Buscar ou criar sessão de estudo para um deck
     */
    async getOrCreateSession(userId: string, deckId: string, totalCards: number): Promise<DeckStudySession> {
        try {
            logger.info(`[getOrCreateSession] Buscando sessão para deck ${deckId}, user ${userId}`);

            // Tentar buscar sessão existente
            const { data: existingSession, error: fetchError } = await this.supabase
                .from('deck_study_sessions')
                .select('*')
                .eq('user_id', userId)
                .eq('deck_id', deckId)
                .single();

            logger.info(`[getOrCreateSession] Resultado da busca:`, {
                found: !!existingSession,
                error: fetchError?.message,
                session: existingSession ? {
                    id: existingSession.id,
                    current_index: existingSession.current_index,
                    studied_cards: existingSession.studied_cards,
                } : null
            });

            if (existingSession && !fetchError) {
                logger.info(`✅ Sessão existente encontrada para deck ${deckId} - índice: ${existingSession.current_index}`);
                return existingSession;
            }

            // Criar nova sessão
            logger.info(`🆕 Criando nova sessão para deck ${deckId}`);
            const { data: newSession, error: createError } = await this.supabase
                .from('deck_study_sessions')
                .insert({
                    user_id: userId,
                    deck_id: deckId,
                    current_index: 0,
                    total_cards: totalCards,
                    studied_cards: 0,
                    reviewed_card_ids: [],
                    last_activity_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (createError || !newSession) {
                logger.error('❌ Erro ao criar sessão de estudo:', createError);
                throw new AppError('Erro ao criar sessão de estudo', 500);
            }

            logger.info(`✅ Nova sessão criada para deck ${deckId}`);
            return newSession;
        } catch (error) {
            logger.error('❌ Erro em getOrCreateSession:', error);
            throw error;
        }
    }

    /**
     * Atualizar progresso da sessão
     */
    async updateSession(
        userId: string,
        deckId: string,
        updates: {
            current_index?: number;
            studied_cards?: number;
            reviewed_card_ids?: string[];
        }
    ): Promise<DeckStudySession> {
        try {
            const { data, error } = await this.supabase
                .from('deck_study_sessions')
                .update({
                    ...updates,
                    last_activity_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('deck_id', deckId)
                .select()
                .single();

            if (error || !data) {
                logger.error('Erro ao atualizar sessão:', error);
                throw new AppError('Erro ao atualizar sessão de estudo', 500);
            }

            return data;
        } catch (error) {
            logger.error('Erro em updateSession:', error);
            throw error;
        }
    }

    /**
     * Finalizar sessão (resetar progresso)
     */
    async finishSession(userId: string, deckId: string): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('deck_study_sessions')
                .delete()
                .eq('user_id', userId)
                .eq('deck_id', deckId);

            if (error) {
                logger.error('Erro ao finalizar sessão:', error);
                throw new AppError('Erro ao finalizar sessão de estudo', 500);
            }

            logger.info(`Sessão finalizada para deck ${deckId}`);
        } catch (error) {
            logger.error('Erro em finishSession:', error);
            throw error;
        }
    }

    /**
     * Buscar estatísticas do deck (cards estudados, novos, para revisão)
     */
    async getDeckStats(userId: string, deckId: string): Promise<{
        totalCards: number;
        studiedCards: number;
        newCards: number;
        reviewCards: number;
    }> {
        try {
            // Buscar total de cards do deck
            const { data: deck, error: deckError } = await this.supabase
                .from('decks')
                .select('flashcard_count')
                .eq('id', deckId)
                .single();

            if (deckError || !deck) {
                throw new AppError('Deck não encontrado', 404);
            }

            const totalCards = deck.flashcard_count || 0;

            // Buscar cards FSRS do usuário para este deck
            const { data: fsrsCards, error: fsrsError } = await this.supabase
                .from('fsrs_cards')
                .select('id, state, due, reps')
                .eq('user_id', userId)
                .eq('deck_id', deckId)
                .eq('content_type', 'FLASHCARD');

            if (fsrsError) {
                logger.error('Erro ao buscar cards FSRS:', fsrsError);
                // Não é erro crítico, retornar valores padrão
                return {
                    totalCards,
                    studiedCards: 0,
                    newCards: totalCards,
                    reviewCards: 0,
                };
            }

            const now = new Date();
            let studiedCards = 0;
            let reviewCards = 0;

            (fsrsCards || []).forEach((card) => {
                // Card estudado = tem pelo menos 1 repetição
                if (card.reps > 0) {
                    studiedCards++;
                }

                // Card para revisão = due <= now
                if (card.due && new Date(card.due) <= now) {
                    reviewCards++;
                }
            });

            // Se não há cards FSRS, todos são novos
            // Se há cards FSRS, calcular novos = total - estudados
            const newCards = fsrsCards && fsrsCards.length > 0
                ? Math.max(0, totalCards - studiedCards)
                : totalCards;

            return {
                totalCards,
                studiedCards,
                newCards,
                reviewCards,
            };
        } catch (error) {
            logger.error('Erro em getDeckStats:', error);
            throw error;
        }
    }
}
