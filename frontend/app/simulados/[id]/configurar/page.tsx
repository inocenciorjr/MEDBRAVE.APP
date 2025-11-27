'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { simulatedExamService, SimulatedExam } from '@/services/simulatedExamService';
import { useToast } from '@/lib/contexts/ToastContext';
import { SimuladoConfigurarSkeleton } from '@/components/skeletons/SimuladoConfigurarSkeleton';

interface ConfigurarSimuladoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ConfigurarSimuladoPage({ params }: ConfigurarSimuladoPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  
  const [simulado, setSimulado] = useState<SimulatedExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadSimulado();
  }, [id]);

  const loadSimulado = async () => {
    try {
      setLoading(true);
      const data = await simulatedExamService.getSimulatedExamById(id);
      setSimulado(data);
    } catch (error: any) {
      console.error('Erro ao carregar simulado:', error);
      toast.error('Erro ao carregar simulado');
      router.push('/lista-questoes/minhas-listas');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulado = async () => {
    try {
      setStarting(true);
      
      // Iniciar o simulado
      const result = await simulatedExamService.startSimulatedExam(id);
      console.log('[Configurar] Resultado do start:', result);
      
      // O backend retorna o result com campo 'id', não 'resultId'
      const resultId = result.id || result.resultId;
      
      if (!resultId) {
        throw new Error('ID do resultado não retornado pelo backend');
      }
      
      // Redirecionar para a página de resolução
      router.push(`/simulados/${id}/resolver?resultId=${resultId}`);
    } catch (error: any) {
      console.error('Erro ao iniciar simulado:', error);
      toast.error(error.message || 'Erro ao iniciar simulado');
      setStarting(false);
    }
  };

  if (loading) {
    return <SimuladoConfigurarSkeleton />;
  }

  if (!simulado) {
    return null;
  }

  return (
    <PagePlanGuard>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Listas de Questões', icon: 'list_alt', href: '/lista-questoes/minhas-listas' },
            { label: simulado.title, icon: 'schedule' } // Último item sem href (página atual)
          ]}
        />
      </div>

      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <span className="material-symbols-outlined text-primary text-5xl">timer</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-700 dark:text-slate-200 mb-4">
              {simulado.title}
            </h1>
            {simulado.description && (
              <p className="text-lg text-text-light-secondary dark:text-text-dark-secondary">
                {simulado.description}
              </p>
            )}
          </div>

          {/* Informações do Simulado */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl dark:shadow-dark-xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-6">
              Informações do Simulado
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-4 bg-background-light dark:bg-background-dark rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">quiz</span>
                </div>
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Questões
                  </p>
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                    {simulado.question_count}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-background-light dark:bg-background-dark rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                </div>
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Tempo Limite
                  </p>
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                    {Math.floor(simulado.time_limit_minutes / 60)}h {simulado.time_limit_minutes % 60 > 0 ? `${simulado.time_limit_minutes % 60}min` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-background-light dark:bg-background-dark rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">speed</span>
                </div>
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Tempo/Questão
                  </p>
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                    {(simulado.time_limit_minutes / simulado.question_count).toFixed(1)} min
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl dark:shadow-dark-xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              Instruções Importantes
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Modo Foco Ativado
                  </p>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Durante o simulado, você não terá acesso à navegação lateral. Foque apenas nas questões.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Sem Visualização de Respostas
                  </p>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Você não poderá ver se acertou ou errou até finalizar o simulado.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Tempo Cronometrado
                  </p>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    O cronômetro começará assim que você iniciar e não pode ser pausado.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm font-bold">4</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Única Tentativa
                  </p>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Este simulado só pode ser realizado uma vez. Certifique-se de estar pronto.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/lista-questoes/minhas-listas')}
              disabled={starting}
              className="flex-1 px-8 py-4 border-2 border-border-light dark:border-border-dark rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-surface-light dark:hover:bg-surface-dark transition-all disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              onClick={handleStartSimulado}
              disabled={starting}
              className="flex-1 px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {starting ? (
                'Iniciando...'
              ) : (
                <>
                  <span className="material-symbols-outlined text-2xl">play_circle</span>
                  Iniciar Simulado
                </>
              )}
            </button>
          </div>

          {/* Aviso Final */}
          <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl mt-0.5">
                warning
              </span>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Atenção:</strong> Ao clicar em "Iniciar Simulado", o cronômetro começará imediatamente. 
                Certifique-se de estar em um ambiente tranquilo e sem interrupções.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PagePlanGuard>
  );
}
