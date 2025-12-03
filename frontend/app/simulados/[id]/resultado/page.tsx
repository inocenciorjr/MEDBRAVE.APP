'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { simulatedExamService, SimulatedExamResult } from '@/services/simulatedExamService';
import { useToast } from '@/lib/contexts/ToastContext';
import { SimuladoResultadoSkeleton } from '@/components/skeletons/SimuladoResultadoSkeleton';
import { QuestionView } from '@/components/resolucao-questoes/QuestionView';
import { Question } from '@/types/resolucao-questoes';
import api from '@/services/api';
import { QuestionStatsProvider, useQuestionStats } from '@/contexts/QuestionStatsContext';

interface ResultadoSimuladoPageProps {
  params: Promise<{
    id: string;
  }>;
}

function ResultadoSimuladoContent({ params }: ResultadoSimuladoPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { preloadStats, loadingStats } = useQuestionStats();
  
  const resultId = searchParams.get('resultId');
  
  const [result, setResult] = useState<SimulatedExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [simuladoTitle, setSimuladoTitle] = useState<string>('');

  useEffect(() => {
    if (!resultId) {
      toast.error('ID de resultado inválido');
      router.push('/lista-questoes/minhas-listas');
      return;
    }
    
    loadResult();
  }, [resultId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      
      // Limpar cache de stats para forçar reload (importante após finalizar simulado)
      // Isso garante que as estatísticas mais recentes sejam carregadas
      console.log('[Resultado] Limpando cache de stats...');
      
      const data = await simulatedExamService.getSimulatedExamResult(resultId!);
      setResult(data);
      
      // Buscar as questões do simulado (mesma lógica do resolver)
      const examData = await simulatedExamService.getSimulatedExamById(id);
      setSimuladoTitle(examData?.title || 'Simulado');
      
      if (examData?.questions && examData.questions.length > 0) {
        const { getSubFiltersMap } = await import('@/lib/services/filterService');
        const subFiltersMap = await getSubFiltersMap();
        
        const questionsData = await Promise.all(
          examData.questions.map(async (qId: string, index: number) => {
            const response = await api.get(`/questions/${qId}`);
            const q = response.data.data || response.data;
            
            const { getYearFromQuestion, getInstitutionFromQuestion, getSubjectFromQuestion, getTopicFromQuestion } = await import('@/lib/services/filterService');
            
            return {
              id: q.id,
              questionNumber: index + 1,
              institution: getInstitutionFromQuestion(q.sub_filter_ids || [], subFiltersMap),
              year: getYearFromQuestion(q.sub_filter_ids || [], subFiltersMap),
              subject: getSubjectFromQuestion(q.filter_ids || [], subFiltersMap),
              topic: getTopicFromQuestion(q.sub_filter_ids || [], subFiltersMap),
              text: q.statement || q.content || q.title || '',
              isHtml: true,
              alternatives: (q.alternatives || []).map((alt: { id?: string; text?: string }, idx: number) => ({
                id: alt.id || `alt-${idx}`,
                letter: String.fromCharCode(65 + idx) as 'A' | 'B' | 'C' | 'D' | 'E',
                text: alt.text || '',
              })),
              correctAlternative: q.correct_alternative_id || q.correct_answer || q.alternatives?.find((a: { isCorrect?: boolean }) => a.isCorrect)?.id || '',
              likes: 0,
              dislikes: 0,
              tags: q.tags || [],
              sub_filter_ids: q.sub_filter_ids || [],
              professorComment: q.professorComment || q.professor_comment,
              isAnnulled: q.isAnnulled || q.is_annulled || false,
              isOutdated: q.isOutdated || q.is_outdated || false,
            };
          })
        );
        
        // Popular o localStorage com as respostas do usuário
        const listId = `simulado_review_${id}_${resultId}`;
        const answers = (data as any).answers || {};
        
        // Identificar questões que foram realmente respondidas (não em branco)
        const answeredQuestionIds = Object.keys(answers).filter(qId => answers[qId]);
        
        // Pré-carregar stats APENAS das questões respondidas
        const questionIdsInExam = questionsData.map(q => q.id);
        console.log('[Resultado] Total de questões:', questionIdsInExam.length);
        console.log('[Resultado] Questões respondidas:', answeredQuestionIds.length);
        await preloadStats(questionIdsInExam, answeredQuestionIds);
        console.log('[Resultado] Stats pré-carregadas concluído');
        
        // Agora sim, setar as questões (após stats carregadas)
        setQuestions(questionsData);
        
        questionsData.forEach((question) => {
          const userAnswer = answers[question.id];
          
          if (userAnswer) {
            // Questão respondida
            const questionState = {
              selectedAlternative: userAnswer,
              isAnswered: true,
              isCorrect: userAnswer === question.correctAlternative,
              timestamp: new Date().toISOString(),
            };
            localStorage.setItem(`question_state_${listId}_${question.id}`, JSON.stringify(questionState));
          } else {
            // Questão NÃO respondida - marcar com alternativa especial
            const questionState = {
              selectedAlternative: '__NOT_ANSWERED__', // Flag especial para não respondida
              isAnswered: true, // Marcar como respondida para mostrar a estrutura completa
              isCorrect: false,
              timestamp: new Date().toISOString(),
            };
            localStorage.setItem(`question_state_${listId}_${question.id}`, JSON.stringify(questionState));
          }
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar resultado:', error);
      toast.error('Erro ao carregar resultado');
      router.push('/lista-questoes/minhas-listas');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return <SimuladoResultadoSkeleton />;
  }

  if (!result) {
    return null;
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Listas de Questões', icon: 'list_alt', href: '/lista-questoes/minhas-listas' },
            { label: simuladoTitle || 'Resultado', icon: 'schedule' }
          ]}
        />
      </div>

      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {questions.length > 0 && questions[currentIndex] && (
            <QuestionView
              key={`review-${questions[currentIndex]?.id}-${currentIndex}`}
              question={questions[currentIndex]}
              questionList={questions}
              listId={`simulado_review_${id}_${resultId}`}
              onNavigate={setCurrentIndex}
              isSimulatedMode={false}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function ResultadoSimuladoPage({ params }: ResultadoSimuladoPageProps) {
  return (
    <QuestionStatsProvider>
      <ResultadoSimuladoContent params={params} />
    </QuestionStatsProvider>
  );
}
