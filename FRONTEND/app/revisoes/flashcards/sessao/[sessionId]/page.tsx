'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlashcardView } from '@/components/flashcards/FlashcardView';
import { Flashcard } from '@/types/flashcards';
import { useStudySession } from '@/hooks/useStudySession';

/**
 * Extrai o nome da coleção do ID do flashcard
 * Formato do ID: usuario_colecao_deck_index_hash
 */
function extractCollectionFromId(flashcardId: string): string | null {
  try {
    const parts = flashcardId.split('_');
    if (parts.length >= 3) {
      // parts[0] = usuario
      // parts[1] = colecao
      // Converter de kebab-case para Title Case
      const collectionSlug = parts[1];
      return collectionSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return null;
  } catch {
    return null;
  }
}

export default function FlashcardsRevisaoPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { startSession, endSession } = useStudySession('review');
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Iniciar sessão de revisão ao montar
  useEffect(() => {
    startSession();
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      const { supabase } = await import('@/config/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // Buscar revisões pendentes de flashcards
      const sessionIdParam = sessionId;
      
      let cardIds: string[] = [];

      if (sessionIdParam) {
        // Se tem sessionId, buscar do backend
        const response = await fetch(`/api/review-sessions/${sessionIdParam}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Sessão não encontrada');
        }

        const result = await response.json();
        
        if (!result.success || !result.data.session) {
          throw new Error('Sessão inválida');
        }
        
        const reviewSession = result.data.session;

        if (reviewSession.content_type !== 'FLASHCARD') {
          throw new Error('Sessão inválida para flashcards');
        }

        // Os review_ids são os IDs dos cards FSRS, precisamos buscar os content_ids
        cardIds = reviewSession.review_ids;
        console.log('🔍 Usando sessão do backend:', cardIds.length);
      } else {
        // Comportamento padrão: buscar revisões de hoje
        const today = new Date().toISOString().split('T')[0];
        console.log('🔍 Buscando revisões de hoje:', today);
        
        const response = await fetch(`/api/unified-reviews/future?limit=200&startDate=${today}&endDate=${today}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        const result = await response.json();

        if (result.success) {
          const flashcardReviews = result.data.reviews.filter(
            (r: any) => r.content_type === 'FLASHCARD'
          );

          if (flashcardReviews.length === 0) {
            alert('Não há flashcards para revisar hoje!');
            router.push('/revisoes');
            return;
          }

          cardIds = flashcardReviews.map((r: any) => r.content_id);
        }
      }

      if (cardIds.length === 0) {
        alert('Não há flashcards para revisar!');
        router.push('/revisoes');
        return;
      }

      console.log('📋 IDs dos flashcards para buscar:', cardIds);
      console.log('📋 Primeiro ID:', cardIds[0]);
      console.log('📋 Tipo do primeiro ID:', typeof cardIds[0]);

      // Buscar os flashcards usando a rota bulk
      const cardsResponse = await fetch('/api/flashcards/bulk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: cardIds }),
        });

      const cardsData = await cardsResponse.json();
      console.log('📦 Resposta da API bulk:', cardsData);
      console.log('📦 Quantidade retornada:', cardsData.data?.length || 0);

      if (cardsData.success && cardsData.data) {
        if (cardsData.data.length === 0) {
          console.error('❌ API retornou 0 flashcards para os IDs:', cardIds);
          throw new Error('Nenhum flashcard encontrado');
        }
        
        // Mapear campos do backend para o formato esperado pelo frontend
        const mappedFlashcards = cardsData.data.map((card: any) => {
          // Extrair nome da coleção do ID do flashcard
          const collectionName = extractCollectionFromId(card.id);
          
          // Pegar nome do deck (já vem do backend)
          const deckName = card.deck_name;
          
          // Construir breadcrumb: Nome da Coleção > Nome do Deck
          const breadcrumb = collectionName && deckName ? [collectionName, deckName] : [];
          
          return {
            ...card,
            front: card.front_content,
            back: card.back_content,
            deckId: card.deck_id,
            createdAt: card.created_at,
            updatedAt: card.updated_at,
            isHtml: true, // Sempre true como na página de estudo
            images: [],
            breadcrumb,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
          };
        });
        
        setFlashcards(mappedFlashcards);
      } else {
        throw new Error('Erro ao carregar flashcards');
      }
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      setError('Erro ao iniciar revisão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // O loading.tsx já mostra o skeleton
  }

  if (error || flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4">
            {error || 'Nenhum flashcard para revisar'}
          </h2>
          <button
            onClick={() => router.push('/revisoes')}
            className="bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Voltar para Planner
          </button>
        </div>
      </div>
    );
  }

  // Usar deckId fake para sessões de revisão (não deve carregar sessão de deck)
  return (
    <FlashcardView
      flashcards={flashcards}
      deck={{
        id: 'review-session',
        name: 'Revisão de Flashcards',
        description: 'Sessão de revisão espaçada',
        collectionId: undefined,
        tags: [],
        totalCards: flashcards.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }}
      isReviewSession={true}
      sessionId={sessionId}
    />
  );
}
