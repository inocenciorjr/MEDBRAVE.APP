'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { simulatedExamService, SimulatedExam } from '@/services/simulatedExamService';
import api from '@/services/api';
import { useToast } from '@/lib/contexts/ToastContext';
import { SimuladoResolverSkeleton } from '@/components/skeletons/SimuladoResolverSkeleton';
import MainLayout from '@/components/layout/MainLayout';
import SimuladoResolverClient from './SimuladoResolverClient';
import { Question } from '@/types/resolucao-questoes';

interface ResolverSimuladoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ResolverSimuladoPage({ params }: ResolverSimuladoPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const resultId = searchParams.get('resultId');
  
  const [simulado, setSimulado] = useState<SimulatedExam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resultId || resultId === 'undefined') {
      toast.error('ID de resultado inválido');
      router.push(`/simulados/${id}/configurar`);
      return;
    }
    
    loadSimulado();
  }, [id, resultId]);

  const loadSimulado = async () => {
    try {
      setLoading(true);
      
      console.log('[Simulado] Carregando simulado:', id);
      
      // Carregar simulado
      const simuladoData = await simulatedExamService.getSimulatedExamById(id);
      console.log('[Simulado] Dados do simulado:', simuladoData);
      setSimulado(simuladoData);
      
      // Carregar questões usando a MESMA lógica da resolução normal
      const { getSubFiltersMap } = await import('@/lib/services/filterService');
      const subFiltersMap = await getSubFiltersMap();
      
      const questionsData = await Promise.all(
        simuladoData.questions.map(async (qId: string, index: number) => {
          console.log(`[Simulado] Buscando questão ${index + 1}:`, qId);
          const response = await api.get(`/questions/${qId}`);
          console.log(`[Simulado] Resposta do backend para ${qId}:`, response.data);
          const q = response.data.data || response.data;
          
          // Usar a MESMA conversão da resolução normal
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
            alternatives: (q.alternatives || []).map((alt: any, idx: number) => ({
              id: alt.id || `alt-${idx}`,
              letter: String.fromCharCode(65 + idx) as 'A' | 'B' | 'C' | 'D' | 'E',
              text: alt.text || '',
            })),
            correctAlternative: q.correct_alternative_id || q.alternatives?.find((a: any) => a.isCorrect)?.id || '',
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
      
      console.log('[Simulado] Questões carregadas:', questionsData.length);
      setQuestions(questionsData);
    } catch (error: any) {
      console.error('Erro ao carregar simulado:', error);
      toast.error('Erro ao carregar simulado');
      router.push('/lista-questoes/minhas-listas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SimuladoResolverSkeleton />;
  }

  if (!simulado || questions.length === 0) {
    return null;
  }

  return (
    <MainLayout showGreeting={false}>
      {/* Breadcrumb */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Listas de Questões', icon: 'list_alt', href: '/lista-questoes/minhas-listas' },
            { label: simulado.title, icon: 'schedule' } // Último item sem href (página atual)
          ]}
        />
      </div>

      <SimuladoResolverClient
        simuladoId={id}
        resultId={resultId!}
        questions={questions}
        timeLimit={simulado.time_limit_minutes}
      />
    </MainLayout>
  );
}
