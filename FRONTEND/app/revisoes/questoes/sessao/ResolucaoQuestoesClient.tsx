'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { QuestionView } from '@/components/resolucao-questoes/QuestionView';
import { getQuestionsFromListBatch } from '@/lib/api/questions';
import { Question } from '@/types/resolucao-questoes';
import api from '@/services/api';
import { QuestionStatsProvider, useQuestionStats } from '@/contexts/QuestionStatsContext';
import { useStudySession } from '@/hooks/useStudySession';

interface ResolucaoQuestoesClientProps {
  id: string;
}

const QUESTIONS_PER_BATCH = 20;
const MAX_CACHED_BATCHES = 3; // Manter no máximo 3 batches em cache (60 questões)

function ResolucaoQuestoesContent({ id }: ResolucaoQuestoesClientProps) {
  const { preloadStats, loadingStats } = useQuestionStats();
  const { startSession, endSession, incrementItems } = useStudySession('review');
  const [allQuestions, setAllQuestions] = useState<(Question | null)[]>([]);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [listId, setListId] = useState<string>('');
  const [listName, setListName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());

  // Iniciar sessão de revisão ao montar
  useEffect(() => {
    startSession();
    return () => {
      endSession();
    };
  }, []);

  const currentQuestion = allQuestions[currentIndex] || null;

  // Criar lista para navegação (com placeholders usando IDs reais)
  // IMPORTANTE: useMemo deve estar ANTES de qualquer return condicional
  const navigationList = useMemo(() => {
    return allQuestions.map((q, idx) => {
      const questionId = questionIds[idx] || `placeholder-${idx}`;

      if (!q) {
        return {
          id: questionId,
          questionNumber: idx + 1,
          text: '',
          alternatives: [],
          correctAlternative: '',
          institution: '',
          year: 0,
          subject: '',
          topic: '',
          isHtml: false,
          likes: 0,
          dislikes: 0,
          tags: []
        };
      }

      return q;
    });
  }, [allQuestions, questionIds]);

  // Carregar batch de questões do backend
  const loadBatch = useCallback(async (extractedListId: string, batchIndex: number) => {
    if (loadedBatches.has(batchIndex)) {
      return;
    }

    try {
      const offset = batchIndex * QUESTIONS_PER_BATCH;
      const response = await getQuestionsFromListBatch(extractedListId, offset, QUESTIONS_PER_BATCH);

      if (!response || !response.questions) {
        console.error('[Client] Erro ao carregar batch');
        return;
      }

      const { questions: batchQuestions, total } = response;

      // Atualizar total se necessário
      if (total && total !== totalQuestions) {
        setTotalQuestions(total);
      }

      // Atualizar questões
      setAllQuestions(prev => {
        const newList = [...prev];
        batchQuestions.forEach((q, idx) => {
          newList[offset + idx] = q;
        });
        return newList;
      });

      // Pré-carregar stats das questões do batch
      const questionIdsInBatch = batchQuestions.map(q => q.id);
      await preloadStats(questionIdsInBatch);

      // Atualizar batches carregados e gerenciar cache
      setLoadedBatches(prev => {
        const newSet = new Set(prev);
        newSet.add(batchIndex);

        // Se excedeu o limite, remover batches mais distantes
        if (newSet.size > MAX_CACHED_BATCHES) {
          const currentBatch = batchIndex;
          const batches = Array.from(newSet);

          // Ordenar por distância do batch atual
          batches.sort((a, b) => {
            const distA = Math.abs(a - currentBatch);
            const distB = Math.abs(b - currentBatch);
            return distB - distA;
          });

          // Remover o mais distante
          const toRemove = batches[0];
          newSet.delete(toRemove);

          // Limpar questões do batch removido
          setAllQuestions(prev => {
            const newList = [...prev];
            const removeStart = toRemove * QUESTIONS_PER_BATCH;
            const removeEnd = Math.min(removeStart + QUESTIONS_PER_BATCH, prev.length);
            for (let i = removeStart; i < removeEnd; i++) {
              newList[i] = undefined as any;
            }
            return newList;
          });

          console.log('[Client] Cache cheio, removendo batch:', toRemove);
        }

        return newSet;
      });
    } catch (err) {
      console.error('[Client] Erro ao carregar batch:', err);
    }
  }, [loadedBatches, totalQuestions, preloadStats]);

  // Carregar inicial
  useEffect(() => {
    async function init() {
      const parts = id.split('-');
      const extractedListId = parts[0];
      const initialIndex = parts.length > 1 ? parseInt(parts[parts.length - 1]) : 0;

      setLoading(true);
      setListId(extractedListId);
      setCurrentIndex(initialIndex);

      try {
        // Carregar primeiro batch, IDs, respostas E nome da lista EM PARALELO
        const batchIndex = Math.floor(initialIndex / QUESTIONS_PER_BATCH);
        const offset = batchIndex * QUESTIONS_PER_BATCH;

        // Importar funções
        const { getQuestionResponses, getQuestionIds } = await import('@/lib/api/questions');

        // Executar em paralelo
        const [response, responsesMap, ids, listResponse] = await Promise.all([
          getQuestionsFromListBatch(extractedListId, offset, QUESTIONS_PER_BATCH),
          getQuestionResponses(extractedListId),
          getQuestionIds(extractedListId),
          api.get(`/question-lists/${extractedListId}`).catch(() => ({ data: { data: { name: 'Lista de Questões' } } }))
        ]);

        // Salvar nome da lista
        setListName(listResponse.data?.data?.name || 'Lista de Questões');

        // Salvar IDs
        setQuestionIds(ids);

        // Primeiro: sincronizar respostas com localStorage
        const storageKeyPrefix = `question_state_${extractedListId}_`;
        responsesMap.forEach((response, questionId) => {
          const state = {
            selectedAlternative: response.selectedAlternative,
            isAnswered: true,
            isCorrect: response.isCorrect,
            highlights: [],
            userTags: [],
          };
          localStorage.setItem(`${storageKeyPrefix}${questionId}`, JSON.stringify(state));
        });

        // Depois: processar questões
        if (!response || !response.questions || response.questions.length === 0) {
          setError('Nenhuma questão encontrada.');
          return;
        }

        const { questions: firstBatch, total } = response;
        setTotalQuestions(total);

        // Pré-carregar stats das questões do primeiro batch
        const questionIdsInBatch = firstBatch.map(q => q.id);
        await preloadStats(questionIdsInBatch);

        // Inicializar array com tamanho correto (preencher com null para evitar array esparso)
        const emptyArray: (Question | null)[] = Array.from({ length: total }, () => null);

        // Adicionar primeiro batch
        firstBatch.forEach((q, idx) => {
          emptyArray[offset + idx] = q;
        });

        setAllQuestions(emptyArray);
        setLoadedBatches(new Set([batchIndex]));
      } catch (err) {
        console.error('[Client] Erro ao carregar questões:', err);
        setError('Erro ao carregar questões.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [id]);

  // Carregar batch quando necessário
  useEffect(() => {
    if (!listId || totalQuestions === 0) return;

    const currentBatch = Math.floor(currentIndex / QUESTIONS_PER_BATCH);

    // Se o batch atual não está carregado, mostrar loading e carregar
    if (!loadedBatches.has(currentBatch)) {
      setLoading(true);
      loadBatch(listId, currentBatch).then(() => {
        setLoading(false);
      });
    }
  }, [currentIndex, listId, totalQuestions, loadedBatches, loadBatch]);

  // Esperar tanto as questões quanto os stats carregarem
  const isLoadingStats = loadingStats.size > 0;

  if (loading || isLoadingStats) {
    return null;
  }

  if (error || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">
            Questão não encontrada
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
            {error || 'A questão que você está procurando não existe ou foi removida.'}
          </p>
          <a
            href="/lista-questoes/minhas-listas"
            className="inline-block px-6 py-3 bg-primary-light dark:bg-primary-dark text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Voltar para Minhas Listas
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Listas de Questões', icon: 'list_alt', href: '/lista-questoes/minhas-listas' },
            { label: listName || 'Carregando...', icon: 'article' } // Último item sem href (página atual)
          ]}
        />
      </div>

      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <QuestionView
            key={`${listId}-${currentQuestion.id}-${questionIds.length}`}
            question={currentQuestion}
            questionList={navigationList}
            listId={listId}
            onNavigate={setCurrentIndex}
          />
        </div>
      </div>
    </>
  );
}

export default function ResolucaoQuestoesClient({ id }: ResolucaoQuestoesClientProps) {
  return (
    <QuestionStatsProvider>
      <ResolucaoQuestoesContent id={id} />
    </QuestionStatsProvider>
  );
}
