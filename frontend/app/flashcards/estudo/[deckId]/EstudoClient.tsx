'use client';

import { useEffect, useState } from 'react';
import { FlashcardView } from '@/components/flashcards/FlashcardView';
import { getDeck, getFlashcardsByDeck } from '@/lib/api/flashcards';
import { Deck, Flashcard } from '@/types/flashcards';
import { FlashcardStudySessionSkeleton } from '@/components/skeletons/FlashcardStudySessionSkeleton';
import { useStudySession } from '@/hooks/useStudySession';

interface EstudoClientProps {
  deckId: string;
}

export default function EstudoClient({ deckId }: EstudoClientProps) {
  const { startSession, endSession, incrementItems } = useStudySession('flashcards');
  const [deck, setDeck] = useState<Deck | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Iniciar sessão de estudo ao montar
  useEffect(() => {
    startSession();
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [deckData, flashcardsData] = await Promise.all([
          getDeck(deckId),
          getFlashcardsByDeck(deckId),
        ]);

        setDeck(deckData);
        setFlashcards(flashcardsData);
      } catch (err) {
        console.error('Error loading study session:', err);
        setError('Erro ao carregar deck');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [deckId]);

  if (loading) {
    return (
      <FlashcardStudySessionSkeleton />
    );
  }

  if (error || !deck) {
    return (
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-lg dark:shadow-dark-xl">
              <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4">
                Erro ao carregar deck
              </h2>
              <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
                {error || 'Não foi possível carregar o deck. Por favor, tente novamente.'}
              </p>
              <a
                href="/flashcards/colecoes"
                className="inline-block bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Voltar para Coleções
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-lg dark:shadow-dark-xl">
              <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4">
                Deck vazio
              </h2>
              <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
                Este deck não possui flashcards ainda.
              </p>
              <a
                href="/flashcards/colecoes"
                className="inline-block bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Voltar para Coleções
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <FlashcardView deck={deck} flashcards={flashcards} />;
}
