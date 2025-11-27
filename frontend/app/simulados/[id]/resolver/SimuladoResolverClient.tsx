'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionView } from '@/components/resolucao-questoes/QuestionView';
import { Question } from '@/types/resolucao-questoes';
import { useToast } from '@/lib/contexts/ToastContext';
import { useStudySession } from '@/hooks/useStudySession';

interface SimuladoResolverClientProps {
  simuladoId: string;
  resultId: string;
  questions: Question[];
  timeLimit: number;
}

export default function SimuladoResolverClient({ 
  simuladoId, 
  resultId,
  questions,
  timeLimit 
}: SimuladoResolverClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { startSession, endSession, incrementItems } = useStudySession('simulated_exam');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Iniciar sessão de simulado ao montar
  useEffect(() => {
    startSession();
    return () => {
      endSession();
    };
  }, []);
  
  // Usar um listId único para o simulado para não pegar estado de outras listas
  const listId = `simulado_${simuladoId}_${resultId}`;
  
  // Chaves do localStorage
  const timerKey = `simulado_timer_${resultId}`;
  const startTimeKey = `simulado_start_time_${resultId}`;
  
  // Inicializar ou recuperar o timer
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const savedTime = localStorage.getItem(timerKey);
    const savedStartTime = localStorage.getItem(startTimeKey);
    
    if (savedTime && savedStartTime) {
      // Calcular tempo decorrido desde o último salvamento
      const now = Date.now();
      const lastSaved = parseInt(savedStartTime);
      const elapsedSeconds = Math.floor((now - lastSaved) / 1000);
      const remainingTime = parseInt(savedTime) - elapsedSeconds;
      
      console.log('[Simulado] Recuperando timer:', {
        savedTime: parseInt(savedTime),
        elapsedSeconds,
        remainingTime: Math.max(0, remainingTime)
      });
      
      return Math.max(0, remainingTime);
    }
    
    // Primeira vez - iniciar com o tempo limite
    const initialTime = timeLimit * 60;
    localStorage.setItem(timerKey, initialTime.toString());
    localStorage.setItem(startTimeKey, Date.now().toString());
    console.log('[Simulado] Iniciando novo timer:', initialTime);
    return initialTime;
  });
  
  // Limpar localStorage do simulado quando iniciar (apenas uma vez)
  useEffect(() => {
    console.log('[Simulado] Verificando localStorage para:', listId);
    console.log('[Simulado] Questões:', questions.length);
    
    // Verificar se já existe estado salvo
    const hasExistingState = questions.some(q => {
      const key = `question_state_${listId}_${q.id}`;
      return localStorage.getItem(key) !== null;
    });
    
    if (!hasExistingState) {
      console.log('[Simulado] Nenhum estado anterior encontrado, iniciando novo simulado');
    } else {
      console.log('[Simulado] Estado anterior encontrado, continuando simulado');
    }
    
    // Marcar como pronto
    setIsReady(true);
  }, [simuladoId, resultId, questions.length, listId]); // Dependências fixas
  
  const currentQuestion = questions[currentIndex] || null;

  // Criar lista para navegação (MESMA lógica da resolução normal)
  const navigationList = useMemo(() => {
    return questions.map((q, idx) => {
      if (!q) {
        return { 
          id: `placeholder-${idx}`, 
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
  }, [questions]);

  // Timer do simulado com persistência
  useEffect(() => {
    if (timeRemaining <= 0) {
      console.log('[Simulado] Tempo esgotado, finalizando automaticamente');
      handleFinishSimulado();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        
        // Salvar no localStorage a cada segundo
        localStorage.setItem(timerKey, newTime.toString());
        localStorage.setItem(startTimeKey, Date.now().toString());
        
        if (newTime <= 0) {
          clearInterval(timer);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, timerKey, startTimeKey]);

  const handleFinishSimulado = async () => {
    if (isFinishing) return; // Evitar cliques duplos
    
    try {
      setIsFinishing(true);
      console.log('[Simulado] Finalizando simulado...');
      
      // Coletar todas as respostas do localStorage
      const answers: Record<string, string> = {};
      questions.forEach(q => {
        const key = `question_state_${listId}_${q.id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.selectedAlternative) {
              answers[q.id] = parsed.selectedAlternative;
            }
          } catch (error) {
            console.error('[Simulado] Erro ao parsear resposta:', error);
          }
        }
      });
      
      console.log('[Simulado] Respostas coletadas:', Object.keys(answers).length);
      
      // Calcular tempo gasto
      const timeSpent = (timeLimit * 60) - timeRemaining;
      
      // Enviar respostas e finalizar simulado no backend
      const { simulatedExamService } = await import('@/services/simulatedExamService');
      await simulatedExamService.submitSimulatedExamAnswers(resultId, answers, timeSpent);
      
      // Limpar dados do timer do localStorage
      localStorage.removeItem(timerKey);
      localStorage.removeItem(startTimeKey);
      
      console.log('[Simulado] Simulado finalizado com sucesso');
      
      // Aguardar um pouco para garantir que o backend processou todas as tentativas
      // (as tentativas são registradas em paralelo no backend)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Redirecionar para resultados com timestamp para forçar reload
      router.push(`/simulados/${simuladoId}/resultado?resultId=${resultId}&t=${Date.now()}`);
    } catch (error: any) {
      console.error('Erro ao finalizar simulado:', error);
      toast.error(error.message || 'Erro ao finalizar simulado');
      setIsFinishing(false); // Permitir tentar novamente em caso de erro
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Aguardar limpeza do localStorage antes de renderizar
  if (!isReady) {
    const { SimuladoResolverSkeleton } = require('@/components/skeletons/SimuladoResolverSkeleton');
    return <SimuladoResolverSkeleton />;
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">
            Questão não encontrada
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
            A questão que você está procurando não existe ou foi removida.
          </p>
          <button
            onClick={() => router.push('/lista-questoes/minhas-listas')}
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Voltar para Minhas Listas
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Timer fixo no topo - z-index menor que sidebar (40) */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-primary shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja sair do simulado? Seu progresso será salvo.')) {
                    router.push('/lista-questoes/minhas-listas');
                  }
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <h1 className="text-lg font-semibold">
                  Simulado em Andamento
                </h1>
                <p className="text-sm opacity-90">
                  Questão {currentIndex + 1} de {questions.length}
                </p>
              </div>
            </div>
            
            {/* Timer */}
            <div className={`flex items-center gap-3 px-6 py-3 rounded-xl shadow-xl ${
              timeRemaining < 300 
                ? 'bg-red-500 animate-pulse' 
                : 'bg-white/20 backdrop-blur-sm'
            }`}>
              <span className="material-symbols-outlined text-2xl">timer</span>
              <span className="text-2xl font-mono font-bold">
                {formatTime(timeRemaining)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Botão de alternar tema */}
              <button
                onClick={() => {
                  const html = document.documentElement;
                  const isDark = html.classList.contains('dark');
                  if (isDark) {
                    html.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                  } else {
                    html.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                  }
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Alternar tema"
              >
                <span className="material-symbols-outlined">dark_mode</span>
              </button>

              <button
                onClick={() => setShowFinishModal(true)}
                className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                Finalizar Simulado
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Espaçamento para o header fixo */}
      <div className="h-20"></div>

      {/* Conteúdo da questão - MESMA estrutura da resolução normal */}
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <QuestionView 
            key={`${listId}-${currentQuestion.id}-${questions.length}`}
            question={currentQuestion} 
            questionList={navigationList}
            listId={listId}
            onNavigate={setCurrentIndex}
            isSimulatedMode={true}
          />
        </div>
      </div>

      {/* Modal de confirmação para finalizar */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0"
            onClick={() => setShowFinishModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-surface-light dark:bg-surface-dark rounded-lg shadow-2xl max-w-lg w-full transform transition-all">
            {/* Header */}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-red-600">
                  Tem certeza que deseja finalizar o simulado?
                </h2>
                <button
                  onClick={() => setShowFinishModal(false)}
                  className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="mt-2 text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-2">
                <p>Lembre-se: cada simulado pode ser realizado apenas uma vez.</p>
                <p>Questões não respondidas serão contabilizadas como incorretas no resultado final.</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center px-6 py-8 border-y border-border-light dark:border-border-dark">
              <div>
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 inline-flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                    schedule
                  </span>
                </div>
                <div className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                  {formatTime(timeLimit * 60 - timeRemaining)}
                </div>
                <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  tempo do simulado
                </div>
              </div>

              <div>
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 inline-flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                    description
                  </span>
                </div>
                <div className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                  {questions.length}
                </div>
                <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  questões disponíveis
                </div>
              </div>

              <div>
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 inline-flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                    check_circle_outline
                  </span>
                </div>
                <div className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                  {(() => {
                    const answeredCount = questions.filter(q => {
                      const stored = localStorage.getItem(`question_state_${listId}_${q.id}`);
                      if (!stored) return false;
                      try {
                        const parsed = JSON.parse(stored);
                        return !!parsed.selectedAlternative;
                      } catch {
                        return false;
                      }
                    }).length;
                    return answeredCount;
                  })()}
                </div>
                <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  questões respondidas
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="p-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowFinishModal(false)}
                disabled={isFinishing}
                className="px-6 py-2.5 rounded-md font-semibold text-sm border border-gray-300 dark:border-gray-600 text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar simulado
              </button>
              <button
                onClick={() => {
                  setShowFinishModal(false);
                  handleFinishSimulado();
                }}
                disabled={isFinishing}
                className="px-6 py-2.5 rounded-md font-semibold text-sm bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isFinishing ? 'Finalizando...' : 'Finalizar simulado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
