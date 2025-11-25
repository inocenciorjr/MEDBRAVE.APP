import { Response } from 'express';
import { AuthenticatedRequest } from '../../../auth/middleware/supabaseAuth.middleware';
import { UnifiedReviewService } from '../types';

export class ReviewManageController {
  constructor(_unifiedReviewService: UnifiedReviewService) {
    // Service não utilizado no momento, mas mantido para compatibilidade futura
  }

  /**
   * GET /api/reviews/manage
   * Listar todas as revisões do usuário para gerenciamento
   */
  getAllReviews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { 
        contentType, 
        state, 
        limit,
        page = 1 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = limit ? parseInt(limit as string) : undefined;
      const offset = limitNum ? (pageNum - 1) * limitNum : 0;

      console.log(`[getAllReviews] Buscando revisões para usuário ${user_id} (página ${pageNum}, limit ${limitNum})`);

      const { supabase } = await import('../../../../config/supabaseAdmin');

      // Primeiro, contar o total
      let countQuery = supabase
        .from('fsrs_cards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id);

      if (contentType) {
        countQuery = countQuery.eq('content_type', (contentType as string).toUpperCase());
      }

      if (state) {
        countQuery = countQuery.eq('state', (state as string).toUpperCase());
      }

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        console.error('[getAllReviews] Erro ao contar cards:', countError);
        throw countError;
      }

      // Buscar cards
      let query = supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', user_id)
        .order('due', { ascending: true });

      // Aplicar paginação apenas se limit foi especificado
      if (limitNum) {
        query = query.range(offset, offset + limitNum - 1);
      }

      if (contentType) {
        query = query.eq('content_type', (contentType as string).toUpperCase());
      }

      if (state) {
        query = query.eq('state', (state as string).toUpperCase());
      }

      const { data: cards, error } = await query;

      if (error) {
        console.error('[getAllReviews] Erro ao buscar cards:', error);
        throw error;
      }

      // Buscar contagem de revisões para cada card
      // Usar a MESMA lógica do getReviewHistory: converter para UUID com uuidv5
      const { v5: uuidv5 } = await import('uuid');
      
      const cardsWithCount = await Promise.all(
        (cards || []).map(async (card: any) => {
          // Converter contentId para UUID se necessário (MESMA lógica do getReviewHistory)
          const contentUuid = card.content_id.length > 36 
            ? uuidv5(card.content_id, uuidv5.DNS) 
            : card.content_id;
          
          const { count } = await supabase
            .from('review_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .eq('content_id', contentUuid);
          
          return {
            ...card,
            review_count: count,
          };
        })
      );

      // Enriquecer com títulos
      const enrichedCards = await Promise.all(
        cardsWithCount.map(async (card: any) => {
          let title = 'Sem título';

          try {
            switch (card.content_type) {
              case 'FLASHCARD': {
                // Para flashcards, buscar o deck.name da tabela decks
                // content_id formato: "userId_collection_deck_cardIndex_hash"
                // Ex: "inocencio-junior-h8sk_flashcards-medspacy_imunizacao_17_818ec5e2"
                // Ex: "inocencio-junior-h8sk_pediatria_otorrino-neoplasias_14_d9b1b02a"
                try {
                  const parts = card.content_id.split('_');
                  
                  // Formato esperado: [userId, collection, deck, cardIndex, hash]
                  // Mínimo 5 partes
                  if (parts.length >= 5) {
                    // userId é sempre a primeira parte
                    // collection é a segunda parte
                    // deck pode ter múltiplas partes (com hífens)
                    // cardIndex é um número
                    // hash é a última parte
                    
                    const collection = parts[1]; // "flashcards-medspacy" ou "pediatria"
                    // const _hash = parts[parts.length - 1]; // última parte
                    
                    // Encontrar o cardIndex (penúltima parte que é um número)
                    let cardIndex = '';
                    let deckEndIndex = parts.length - 2; // Por padrão, deck termina antes do cardIndex
                    
                    // Verificar se a penúltima parte é um número
                    if (!isNaN(parseInt(parts[parts.length - 2]))) {
                      cardIndex = parts[parts.length - 2];
                      deckEndIndex = parts.length - 2;
                    } else {
                      // Se não for número, pode ser parte do deck
                      cardIndex = '0';
                      deckEndIndex = parts.length - 1;
                    }
                    
                    // O deck são todas as partes entre collection e cardIndex
                    const deckParts = parts.slice(2, deckEndIndex);
                    const deckName = deckParts.join('_'); // Juntar com underscore
                    
                    // Buscar o deck pelo ID pattern
                    // O deck.id tem formato: "userId_collection_deckName-hash"
                    const deckIdPattern = `%_${collection}_${deckName}-%`;
                    
                    const { data: decks } = await supabase
                      .from('decks')
                      .select('name')
                      .ilike('id', deckIdPattern)
                      .limit(1);
                    
                    const deck = decks && decks.length > 0 ? decks[0] : null;
                    
                    if (deck && deck.name) {
                      // Retornar no formato: collection / deck.name / cardIndex
                      title = `${collection} / ${deck.name} / ${cardIndex}`;
                    } else {
                      // Fallback: usar o nome sem acentuação
                      title = `${collection} / ${deckName} / ${cardIndex}`;
                    }
                  } else {
                    // Fallback: usar content_id
                    title = card.content_id;
                  }
                } catch (err) {
                  console.warn('[getAllReviews] Erro ao buscar deck:', err);
                  title = card.content_id;
                }
                break;
              }
              case 'QUESTION': {
                const { data: question, error: questionError } = await supabase
                  .from('questions')
                  .select('content, filter_ids, sub_filter_ids')
                  .eq('id', card.content_id)
                  .single();
                
                if (questionError) {
                  console.error(`[getAllReviews] Erro ao buscar questão:`, questionError);
                }
                
                if (question) {
                  // Remover HTML tags
                  title = question.content.replace(/<[^>]*>/g, '').trim();
                  
                  // Buscar nomes dos filtros
                  let university = null;
                  let year = null;
                  
                  if (question.sub_filter_ids && Array.isArray(question.sub_filter_ids)) {
                    // Buscar subfiltros
                    const { data: subFilters } = await supabase
                      .from('sub_filters')
                      .select('id, name, filter_id')
                      .in('id', question.sub_filter_ids);
                    
                    if (subFilters) {
                      // Buscar filtros pai para identificar tipo
                      const filterIds = [...new Set(subFilters.map(sf => sf.filter_id))];
                      const { data: filters } = await supabase
                        .from('filters')
                        .select('id, name')
                        .in('id', filterIds);
                      
                      if (filters) {
                        // Mapear filtros
                        const filterMap = new Map(filters.map(f => [f.id, f.name]));
                        
                        subFilters.forEach(sf => {
                          const filterName = filterMap.get(sf.filter_id);
                          if (filterName?.toLowerCase().includes('ano') || filterName?.toLowerCase().includes('year')) {
                            year = sf.name;
                          } else if (filterName?.toLowerCase().includes('universidade') || filterName?.toLowerCase().includes('university') || filterName?.toLowerCase().includes('instituição')) {
                            university = sf.name;
                          }
                        });
                      }
                    }
                  }
                  
                  return {
                    ...card,
                    title,
                    university,
                    year,
                  };
                } else {
                  console.warn(`[getAllReviews] Questão não encontrada: ${card.content_id}`);
                }
                break;
              }
              case 'ERROR_NOTEBOOK': {
                const { data: entry, error: entryError } = await supabase
                  .from('error_notebook_entries')
                  .select('question_statement, user_note, question_id, question_data')
                  .eq('id', card.content_id)
                  .single();
                
                if (entryError) {
                  console.error(`[getAllReviews] Erro ao buscar entrada:`, entryError);
                }
                
                if (entry) {
                  // Usar question_statement ou user_note
                  title = (entry.question_statement || entry.user_note || 'Entrada do caderno').trim();
                  
                  // Buscar informações da questão original
                  let university = null;
                  let year = null;
                  
                  if (entry.question_id) {
                    const { data: question } = await supabase
                      .from('questions')
                      .select('filter_ids, sub_filter_ids')
                      .eq('id', entry.question_id)
                      .single();
                    
                    if (question && question.sub_filter_ids && Array.isArray(question.sub_filter_ids)) {
                      // Buscar subfiltros
                      const { data: subFilters } = await supabase
                        .from('sub_filters')
                        .select('id, name, filter_id')
                        .in('id', question.sub_filter_ids);
                      
                      if (subFilters) {
                        // Buscar filtros pai
                        const filterIds = [...new Set(subFilters.map(sf => sf.filter_id))];
                        const { data: filters } = await supabase
                          .from('filters')
                          .select('id, name')
                          .in('id', filterIds);
                        
                        if (filters) {
                          const filterMap = new Map(filters.map(f => [f.id, f.name]));
                          
                          subFilters.forEach(sf => {
                            const filterName = filterMap.get(sf.filter_id);
                            if (filterName?.toLowerCase().includes('ano') || filterName?.toLowerCase().includes('year')) {
                              year = sf.name;
                            } else if (filterName?.toLowerCase().includes('universidade') || filterName?.toLowerCase().includes('university') || filterName?.toLowerCase().includes('instituição')) {
                              university = sf.name;
                            }
                          });
                        }
                      }
                    }
                  }
                  
                  return {
                    ...card,
                    title,
                    university,
                    year,
                  };
                } else {
                  console.warn(`[getAllReviews] Entrada não encontrada: ${card.content_id}`);
                }
                break;
              }
            }
          } catch (err) {
            console.warn(`[getAllReviews] Erro ao buscar título para ${card.content_type}/${card.content_id}:`, err);
          }

          return {
            ...card,
            title,
          };
        })
      );

      console.log(`[getAllReviews] ${enrichedCards.length} revisões encontradas`);

      const response: any = {
        success: true,
        message: 'Revisões carregadas com sucesso',
        data: {
          reviews: enrichedCards,
        },
      };

      // Adicionar paginação apenas se limit foi especificado
      if (limitNum) {
        const totalPages = Math.ceil((totalCount || 0) / limitNum);
        const hasMore = pageNum < totalPages;
        
        response.data.pagination = {
          page: pageNum,
          limit: limitNum,
          total: totalCount || 0,
          totalPages,
          hasMore,
        };
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error('[getAllReviews] Erro:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao carregar revisões',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  /**
   * GET /api/reviews/manage/metadata
   * Obter metadados das revisões (contagem por tipo)
   */
  getReviewsMetadata = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      console.log(`[getReviewsMetadata] Buscando metadados para usuário ${user_id}`);

      const { supabase } = await import('../../../../config/supabaseAdmin');

      // Buscar contagem por tipo
      const { data: cards, error } = await supabase
        .from('fsrs_cards')
        .select('content_type')
        .eq('user_id', user_id);

      if (error) {
        console.error('[getReviewsMetadata] Erro ao buscar cards:', error);
        throw error;
      }

      // Contar por tipo
      const metadata = {
        FLASHCARD: 0,
        QUESTION: 0,
        ERROR_NOTEBOOK: 0,
        total: cards.length,
      };

      cards.forEach((card: any) => {
        if (card.content_type in metadata) {
          metadata[card.content_type as keyof typeof metadata]++;
        }
      });

      console.log(`[getReviewsMetadata] Metadados:`, metadata);

      return res.status(200).json({
        success: true,
        message: 'Metadados carregados com sucesso',
        data: metadata,
      });
    } catch (error) {
      console.error('[getReviewsMetadata] Erro:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao carregar metadados',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  /**
   * DELETE /api/reviews/:id
   * Deletar uma revisão específica
   */
  deleteReview = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da revisão é obrigatório',
        });
      }

      console.log(`[deleteReview] Deletando revisão ${id} do usuário ${user_id}`);

      const { supabase } = await import('../../../../config/supabaseAdmin');

      // Buscar o card para obter content_id e content_type
      const { data: card, error: fetchError } = await supabase
        .from('fsrs_cards')
        .select('id, content_id, content_type')
        .eq('id', id)
        .eq('user_id', user_id)
        .single();

      if (fetchError || !card) {
        console.error('[deleteReview] Card não encontrado:', fetchError);
        return res.status(404).json({
          success: false,
          message: 'Revisão não encontrada',
        });
      }

      // 1. Deletar histórico de revisões (review_history)
      // Não há foreign key, então precisa ser manual
      const { error: historyError } = await supabase
        .from('review_history')
        .delete()
        .eq('user_id', user_id)
        .eq('content_id', card.content_id)
        .eq('content_type', card.content_type);

      if (historyError) {
        console.warn('[deleteReview] Erro ao deletar histórico:', historyError);
        // Não falhar a operação
      } else {
        console.log(`[deleteReview] Histórico deletado para content ${card.content_id}`);
      }

      // 2. Deletar eventos do planner relacionados
      // Os eventos podem estar relacionados via metadata.cardId ou metadata.contentId
      const { error: plannerError } = await supabase
        .from('planner_events')
        .delete()
        .eq('user_id', user_id)
        .eq('event_type', 'system_review')
        .eq('content_type', card.content_type)
        .or(`metadata->cardId.eq.${id},metadata->contentId.eq.${card.content_id}`);

      if (plannerError) {
        console.warn('[deleteReview] Erro ao deletar eventos do planner:', plannerError);
        // Não falhar a operação
      } else {
        console.log(`[deleteReview] Eventos do planner deletados para card ${id}`);
      }

      // 3. Deletar o card FSRS
      const { error } = await supabase
        .from('fsrs_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', user_id);

      if (error) {
        console.error('[deleteReview] Erro ao deletar card:', error);
        throw error;
      }

      console.log(`[deleteReview] Revisão ${id} deletada com sucesso`);

      return res.status(200).json({
        success: true,
        message: 'Revisão deletada com sucesso',
      });
    } catch (error) {
      console.error('[deleteReview] Erro:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao deletar revisão',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  /**
   * POST /api/reviews/reschedule
   * Reagendar revisões específicas
   */
  rescheduleSpecificReviews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { reviewIds, mode, specificDate, distributeDays, distributeStartDate } = req.body;

      const { supabase } = await import('../../../../config/supabaseAdmin');

      // Buscar preferências do usuário
      const { ReviewPreferencesService } = await import('../services/ReviewPreferencesService');
      const prefsService = new ReviewPreferencesService(supabase);
      const prefs = await prefsService.getPreferences(user_id);

      if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'reviewIds é obrigatório e deve ser um array não vazio',
        });
      }

      if (!mode || !['specific', 'distribute'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: 'mode deve ser "specific" ou "distribute"',
        });
      }

      if (mode === 'specific' && !specificDate) {
        return res.status(400).json({
          success: false,
          message: 'specificDate é obrigatório quando mode é "specific"',
        });
      }

      if (mode === 'distribute' && !distributeDays) {
        return res.status(400).json({
          success: false,
          message: 'distributeDays é obrigatório quando mode é "distribute"',
        });
      }

      if (mode === 'distribute' && !distributeStartDate) {
        return res.status(400).json({
          success: false,
          message: 'distributeStartDate é obrigatório quando mode é "distribute"',
        });
      }

      console.log(`[rescheduleSpecificReviews] Reagendando ${reviewIds.length} revisões para usuário ${user_id}`);

      // Buscar os cards
      const { data: cards, error: fetchError } = await supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', user_id)
        .in('id', reviewIds);

      if (fetchError) {
        console.error('[rescheduleSpecificReviews] Erro ao buscar cards:', fetchError);
        throw fetchError;
      }

      if (!cards || cards.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhuma revisão encontrada',
        });
      }

      // Calcular novas datas
      let updates: Array<{ id: string; due: string }>;

      if (mode === 'specific') {
        // Modo específico: reagendar EXATAMENTE para a data escolhida
        // Criar data no timezone do usuário (America/Sao_Paulo)
        const targetDate = new Date(specificDate + 'T12:00:00-03:00'); // Meio-dia no timezone BR
        
        // Obter hoje no timezone do usuário
        const now = new Date();
        const todayInUserTz = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        todayInUserTz.setHours(0, 0, 0, 0);
        
        const targetDateOnly = new Date(targetDate);
        targetDateOnly.setHours(0, 0, 0, 0);
        
        // Validar: não pode ser hoje
        if (targetDateOnly.getTime() === todayInUserTz.getTime()) {
          return res.status(400).json({
            success: false,
            message: 'Não é possível reagendar para hoje',
          });
        }
        
        // Validar: não pode ser a mesma data original
        const originalDates = new Set(
          cards.map((c: any) => {
            const d = new Date(c.due);
            const dInUserTz = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
            dInUserTz.setHours(0, 0, 0, 0);
            return dInUserTz.getTime();
          })
        );
        
        if (originalDates.has(targetDateOnly.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Não é possível reagendar para a mesma data original das revisões',
          });
        }
        
        // Reagendar EXATAMENTE para a data escolhida (permite passado para antecipar)
        updates = cards.map((card: any) => ({
          id: card.id,
          due: targetDate.toISOString(),
        }));
      } else {
        // Modo distribuir: lógica inteligente baseada em FSRS
        
        // 1. Calcular prioridade de cada card
        const cardsWithPriority = cards.map((card: any) => {
          // Prioridade baseada em:
          // - Estado (RELEARNING = errou, máxima prioridade)
          // - Dificuldade (maior = mais urgente)
          // - Estabilidade (menor = mais urgente)
          // - Número de lapsos (mais erros = mais urgente)
          
          const statePriority: Record<string, number> = {
            'RELEARNING': 1000, // MÁXIMA PRIORIDADE - Usuário errou!
            'LEARNING': 500,    // Alta prioridade - Ainda aprendendo
            'NEW': 300,         // Média prioridade - Nunca visto
            'REVIEW': 100,      // Menor prioridade - Já consolidado
          };
          
          const difficulty = card.difficulty || 5; // 0-10, maior = mais difícil
          const stability = card.stability || 1; // dias, menor = menos consolidado
          const state = card.state || 'REVIEW';
          const lapses = card.lapses || 0; // Número de vezes que errou
          
          // Fórmula de prioridade:
          // 1. Estado (RELEARNING = errou recentemente)
          // 2. Número de lapsos (quantas vezes errou)
          // 3. Dificuldade (quanto mais difícil, mais urgente)
          // 4. Estabilidade (quanto menor, menos consolidado)
          const priority = 
            (statePriority[state] || 100) + // Estado é o mais importante
            (lapses * 50) + // Cada erro adiciona 50 pontos
            (difficulty * 10) + // Dificuldade
            (10 / Math.max(stability, 0.1)); // Inverso da estabilidade
          
          return {
            ...card,
            priority,
            difficulty,
            stability,
            state,
            lapses,
          };
        });
        
        // 2. Ordenar por prioridade (maior primeiro)
        cardsWithPriority.sort((a, b) => b.priority - a.priority);
        
        // 3. Distribuir uniformemente ao longo dos dias de estudo
        // Coletar datas originais para evitar reagendar para o mesmo dia
        const originalDates = new Set(
          cards.map((c: any) => {
            const d = new Date(c.due);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })
        );
        
        // Gerar lista de dias de estudo disponíveis
        const availableDays: Date[] = [];
        let currentDate = new Date(distributeStartDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Validar data inicial
        if (currentDate <= today) {
          return res.status(400).json({
            success: false,
            message: 'Data inicial deve ser a partir de amanhã',
          });
        }
        
        let daysAdded = 0;
        let attempts = 0;
        const maxAttempts = distributeDays * 3; // Buscar até 3x mais dias se necessário
        
        while (daysAdded < distributeDays && attempts < maxAttempts) {
          // Verificar se é dia de estudo
          const dayOfWeek = currentDate.getDay();
          const isStudyDay = prefs.study_days.includes(dayOfWeek);
          
          // Verificar se não é a data original
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          const isOriginalDate = originalDates.has(dateStr);
          
          if (isStudyDay && !isOriginalDate) {
            availableDays.push(new Date(currentDate));
            daysAdded++;
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
          attempts++;
        }
        
        if (availableDays.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Não há dias de estudo disponíveis no período selecionado',
          });
        }
        
        // Distribuir cards pelos dias disponíveis
        const cardsPerDay = Math.ceil(cards.length / availableDays.length);
        
        updates = cardsWithPriority.map((card: any, index: number) => {
          const dayIndex = Math.floor(index / cardsPerDay);
          const actualDayIndex = Math.min(dayIndex, availableDays.length - 1);
          const targetDay = availableDays[actualDayIndex];
          
          // Adicionar horário aleatório
          const randomHours = Math.floor(Math.random() * 12) + 8; // Entre 8h e 20h
          targetDay.setHours(randomHours, 0, 0, 0);
          
          return {
            id: card.id,
            due: targetDay.toISOString(),
          };
        });
        
        // Estatísticas para log
        const relearningCount = cardsWithPriority.filter(c => c.state === 'RELEARNING').length;
        const learningCount = cardsWithPriority.filter(c => c.state === 'LEARNING').length;
        const newCount = cardsWithPriority.filter(c => c.state === 'NEW').length;
        const reviewCount = cardsWithPriority.filter(c => c.state === 'REVIEW').length;
        
        console.log(`[rescheduleSpecificReviews] Distribuição inteligente:`);
        console.log(`- ${cards.length} revisões em ${distributeDays} dias (~${cardsPerDay}/dia)`);
        console.log(`- RELEARNING (errou): ${relearningCount} → Primeiros dias`);
        console.log(`- LEARNING: ${learningCount}`);
        console.log(`- NEW: ${newCount}`);
        console.log(`- REVIEW: ${reviewCount} → Últimos dias`);
        console.log(`- Ordenadas por: Erros > Lapsos > Dificuldade > Estabilidade`);
      }

      // Atualizar em lote
      const updatePromises = updates.map((update: any) =>
        supabase
          .from('fsrs_cards')
          .update({ due: update.due })
          .eq('id', update.id)
          .eq('user_id', user_id)
      );

      await Promise.all(updatePromises);

      console.log(`[rescheduleSpecificReviews] ${updates.length} revisões reagendadas com sucesso`);

      return res.status(200).json({
        success: true,
        message: 'Revisões reagendadas com sucesso',
        data: {
          rescheduled_count: updates.length,
          mode,
          ...(mode === 'specific' && { new_date: specificDate }),
          ...(mode === 'distribute' && { days_distributed: distributeDays }),
        },
      });
    } catch (error) {
      console.error('[rescheduleSpecificReviews] Erro:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao reagendar revisões',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };
}
