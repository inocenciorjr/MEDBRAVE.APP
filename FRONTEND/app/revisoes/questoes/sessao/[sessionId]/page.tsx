'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionView } from '@/components/resolucao-questoes/QuestionView';
import { Question } from '@/types/resolucao-questoes';
import { QuestionStatsProvider } from '@/contexts/QuestionStatsContext';

export default function QuestoesRevisaoPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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

      // Buscar dados da sessão
      const sessionResponse = await fetch(`/api/review-sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!sessionResponse.ok) {
        throw new Error('Sessão não encontrada');
      }

      const sessionResult = await sessionResponse.json();
      
      if (!sessionResult.success || !sessionResult.data.session) {
        throw new Error('Sessão inválida');
      }
      
      const reviewSession = sessionResult.data.session;

      if (reviewSession.content_type !== 'QUESTION') {
        throw new Error('Sessão inválida para questões');
      }

      // Os review_ids são os IDs dos cards FSRS, precisamos buscar os content_ids
      const reviewIds = reviewSession.review_ids;
      
      if (reviewIds.length === 0) {
        alert('Não há questões para revisar!');
        router.push('/revisoes');
        return;
      }

      console.log('🔍 Review IDs da sessão:', reviewIds);

      // Buscar os cards FSRS diretamente pelos IDs para pegar os content_ids
      const cardsResponse = await fetch(`/api/fsrs/cards?ids=${reviewIds.join(',')}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      console.log('📡 Cards response status:', cardsResponse.status);
      
      if (!cardsResponse.ok) {
        const errorText = await cardsResponse.text();
        console.error('❌ Erro ao buscar cards:', errorText);
        throw new Error('Erro ao buscar cards FSRS');
      }
      
      const cardsResult = await cardsResponse.json();
      console.log('📦 Cards result:', cardsResult);
      
      if (!cardsResult.success || !cardsResult.data?.cards) {
        console.error('❌ Nenhum card encontrado no resultado');
        throw new Error('Nenhum card encontrado');
      }
      
      // Extrair os content_ids dos cards
      const questionIds = cardsResult.data.cards
        .map((card: any) => card.content_id)
        .filter((id: string) => id);
      
      console.log('📋 IDs das questões para buscar:', questionIds);

      // Buscar as questões usando a API
      const { getQuestionsByIds } = await import('@/lib/api/questions');
      const questionsData = await getQuestionsByIds(questionIds);

      console.log('📚 Questões encontradas:', questionsData?.length);

      if (!questionsData || questionsData.length === 0) {
        console.error('❌ Nenhuma questão retornada pela API');
        throw new Error('Nenhuma questão encontrada');
      }

      setQuestions(questionsData);
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

  if (error || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4">
            {error || 'Nenhuma questão para revisar'}
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

  return (
    <QuestionStatsProvider>
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <QuestionView
            question={questions[currentIndex]}
            questionList={questions}
            listId="review-session"
            isActiveReview={true}
            reviewSessionId={sessionId}
            onNavigate={(index) => {
              console.log('Navegando para questão:', index);
              setCurrentIndex(index);
            }}
          />
        </div>
      </div>
    </QuestionStatsProvider>
  );
}
