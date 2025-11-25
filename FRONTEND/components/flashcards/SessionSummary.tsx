'use client';

import { Flashcard, CardReview } from '@/types/flashcards';
import { useRouter } from 'next/navigation';

interface SessionSummaryProps {
  deck: {
    id: string;
    name: string;
    institution?: string;
  };
  reviews: CardReview[];
  flashcards: Flashcard[];
  totalCards: number;
  answeredCards: number;
}

export function SessionSummary({ deck, reviews, flashcards, totalCards, answeredCards }: SessionSummaryProps) {
  const router = useRouter();

  // Calcular estatísticas
  const againCount = reviews.filter(r => r.difficulty === 'again').length;
  const hardCount = reviews.filter(r => r.difficulty === 'hard').length;
  const goodCount = reviews.filter(r => r.difficulty === 'good').length;
  const easyCount = reviews.filter(r => r.difficulty === 'easy').length;

  // Agrupar cards por próxima data de revisão
  const cardsByNextReview = flashcards
    .filter(card => reviews.some(r => r.cardId === card.id))
    .sort((a, b) => {
      const dateA = a.nextReview ? new Date(a.nextReview).getTime() : 0;
      const dateB = b.nextReview ? new Date(b.nextReview).getTime() : 0;
      return dateA - dateB;
    });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não agendado';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Resetar horas para comparação de datas
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Hoje';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Amanhã';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  };

  const handleFinish = () => {
    router.push(`/flashcards/colecoes`);
  };

  const handleStudyAgain = () => {
    router.push(`/flashcards/estudo/${deck.id}`);
  };

  return (
    <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl dark:shadow-dark-xl p-8">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-border-light dark:border-border-dark">
            <h1 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Resumo da Sessão
            </h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              {deck.name} • {deck.institution}
            </p>
          </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 text-center border-2 border-primary dark:border-primary">
            <div className="text-3xl font-bold text-primary mb-1">
              {answeredCards}/{totalCards}
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Respondidos
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 text-center border border-red-200 dark:border-red-800">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
              {againCount}
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Não Lembrei
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 text-center border border-yellow-200 dark:border-yellow-800">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
              {hardCount}
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Difícil
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 text-center border border-green-200 dark:border-green-800">
            <div className="text-3xl font-bold text-green-700 dark:text-green-500 mb-1">
              {goodCount}
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Bom
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 text-center border border-green-200 dark:border-green-800">
            <div className="text-3xl font-bold text-green-400 dark:text-green-300 mb-1">
              {easyCount}
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Fácil
            </div>
          </div>
        </div>

        {/* Next Reviews */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 border border-border-light dark:border-border-dark mb-8">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">schedule</span>
            Próximas Revisões
          </h2>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {cardsByNextReview.map((card) => {
              const review = reviews.find(r => r.cardId === card.id);
              const difficultyColors = {
                again: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                hard: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
                good: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                easy: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
              };

              return (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-light-primary dark:text-text-dark-primary truncate">
                      {card.front.replace(/<[^>]*>/g, '').substring(0, 60)}...
                    </p>
                    {review && (
                      <span className={`inline-block mt-1 text-xs font-semibold px-2 py-1 rounded-full ${difficultyColors[review.difficulty]}`}>
                        {review.difficulty === 'again' && 'Não lembrei'}
                        {review.difficulty === 'hard' && 'Difícil'}
                        {review.difficulty === 'good' && 'Bom'}
                        {review.difficulty === 'easy' && 'Fácil'}
                      </span>
                    )}
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-primary">
                      {formatDate(card.nextReview)}
                    </div>
                    <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      {card.interval === 1 ? '1 dia' : `${card.interval} dias`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              onClick={handleStudyAgain}
              className="flex-1 bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary font-semibold py-4 px-6 rounded-lg border-2 border-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span>
              Estudar Novamente
            </button>
            
            <button
              onClick={handleFinish}
              className="flex-1 bg-primary text-white font-semibold py-4 px-6 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <span className="material-symbols-outlined">check</span>
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
