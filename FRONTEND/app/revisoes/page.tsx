'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReviewConfigurationWizard } from '@/components/revisoes/ReviewConfigurationWizard';
import { OverdueReviewsAlert } from '@/components/revisoes/OverdueReviewsAlert';
import { DevTestingPanel } from '@/components/revisoes/DevTestingPanel';
import Checkbox from '@/components/ui/Checkbox';
import ReviewProgressCard from '@/components/revisoes/ReviewProgressCard';
import ReviewGoalCard from '@/components/revisoes/ReviewGoalCard';
import { GoalsConfigModal } from '@/components/revisoes/GoalsConfigModal';
import { useReviewPreferences, useReviewDashboard } from '@/hooks/queries';
import { useUserGoals } from '@/hooks/useUserGoals';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useQueryClient } from '@tanstack/react-query';
import { RevisoesPageSkeleton } from '@/components/skeletons';

export default function RevisoesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Usar React Query
  const { data: preferences, isLoading: preferencesLoading } = useReviewPreferences();
  const { data: dashboard, isLoading: dashboardLoading } = useReviewDashboard();
  const { goals, todayStats, saveGoals, refetch: refetchGoals } = useUserGoals();
  
  const [showWizard, setShowWizard] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Listener para recarregar quando revisões forem reagendadas
  useEffect(() => {
    const handleReviewsUpdated = () => {
      console.log('📊 Revisões atualizadas, recarregando dashboard...');
      queryClient.invalidateQueries({ queryKey: ['reviews', 'dashboard'] });
    };

    window.addEventListener('reviews-updated', handleReviewsUpdated);
    return () => window.removeEventListener('reviews-updated', handleReviewsUpdated);
  }, [queryClient]);

  useEffect(() => {
    if (!preferencesLoading && preferences) {
      const configured = preferences.scheduling_mode !== null &&
        preferences.scheduling_mode !== undefined;
      setIsConfigured(configured);
    } else if (!preferencesLoading && !preferences) {
      setIsConfigured(false);
    }
  }, [preferences, preferencesLoading]);

  if (preferencesLoading) {
    return <RevisoesPageSkeleton />;
  }

  // VERSÃO ROBUSTA - ARQUIVO ATUALIZADO
  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Revisões', icon: 'history', href: '/revisoes' }
          ]}
        />
      </div>

      {/* Content */}
      <div className="w-full py-8">
          <div className="space-y-8">
            {/* Header com botão de configuração */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-display font-semibold text-slate-700 dark:text-slate-200 mb-2 capitalize">
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric'
                  })}
                </h1>
                <p className="text-sm font-display text-text-light-secondary dark:text-text-dark-secondary">
                  Confira suas revisões agendadas para hoje
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowWizard(true)}
                  className="px-6 py-3 bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary 
                           rounded-xl font-semibold border-2 border-border-light dark:border-border-dark
                           hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10
                           transition-all duration-200 shadow-lg hover:shadow-xl
                           hover:scale-105 active:scale-[0.98]
                           flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">tune</span>
                  <span>Preferências</span>
                </button>
                <button
                  onClick={() => router.push('/revisoes/gerenciar')}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                           hover:bg-primary/90 transition-all duration-200 
                           shadow-lg hover:shadow-xl
                           hover:scale-105 active:scale-[0.98]
                           flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">settings</span>
                  <span>Gerenciar Revisões</span>
                </button>
              </div>
            </div>

            {/* Cards de Progresso Detalhado */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {!preferencesLoading && (
                <>
                  <ReviewProgressCard contentType="FLASHCARD" />
                  <ReviewProgressCard contentType="QUESTION" />
                  <ReviewProgressCard contentType="ERROR_NOTEBOOK" />
                </>
              )}
            </div>

            {/* Cards de Metas */}
            <div className="space-y-4">
              <h2 className="text-2xl font-display font-semibold text-text-light-primary dark:text-text-dark-primary">
                Metas diárias
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReviewGoalCard
                title="Meta de Questões"
                current={todayStats?.questions_answered || 0}
                goal={goals?.daily_questions_goal || 100}
                unit="questões"
                color="text-cyan-600 dark:text-cyan-400"
                bgColor="bg-cyan-100/50 dark:bg-cyan-900/20"
                chartFill="progress-bar-cyan"
                chartBgPattern="border-light"
                onConfigClick={() => setShowGoalsModal(true)}
              />
              <ReviewGoalCard
                title="Porcentagem de acertos"
                current={Math.round(todayStats?.accuracy || 0)}
                goal={100}
                unit="%"
                color="text-purple-600 dark:text-purple-400"
                bgColor="bg-purple-100/50 dark:bg-purple-900/20"
                chartFill="progress-bar-purple"
                chartBgPattern="border-light"
                onConfigClick={() => setShowGoalsModal(true)}
                subtitle={`${todayStats?.correct_answers || 0}/${todayStats?.questions_answered || 0} acertos`}
                goalMarker={goals?.daily_accuracy_goal || 70}
              />
              </div>
            </div>

            {!isConfigured ? (
              /* Estado não configurado - Card de boas-vindas */
              <div className="bg-surface-light dark:bg-surface-dark 
                            rounded-xl p-8 border border-border-light dark:border-border-dark
                            shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                            transition-all duration-300 hover:scale-[1.01]">
                <div className="flex flex-col items-center text-center gap-6">
                  {/* Ícone com efeito de profundidade */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                    <div className="relative p-6 bg-primary/10 rounded-2xl shadow-lg">
                      <span className="material-symbols-outlined text-primary text-6xl">
                        psychology
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                      Configure seu Sistema de Revisões
                    </h2>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      O sistema de revisões utiliza o algoritmo FSRS para otimizar seu aprendizado.
                      Configure suas preferências para começar.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowWizard(true)}
                    className="px-8 py-4 bg-primary text-white rounded-xl font-semibold 
                             hover:bg-primary/90 transition-all duration-200 
                             shadow-xl hover:shadow-2xl hover:scale-105 active:scale-[0.98]
                             flex items-center gap-3 text-lg"
                  >
                    <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                    <span>Começar Configuração</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Estado configurado - Dashboard de revisões */
              <div className="space-y-6">
                {/* Alerta de Revisões Atrasadas */}
                <OverdueReviewsAlert />

                {/* Título: Preferências de Revisões */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-display font-semibold text-text-light-primary dark:text-text-dark-primary">
                    Preferências de Revisões
                  </h2>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="px-4 py-2 border-2 border-border-light dark:border-border-dark 
                             rounded-xl text-sm font-display font-semibold text-text-light-primary dark:text-text-dark-primary 
                             hover:bg-surface-light dark:hover:bg-surface-dark hover:border-primary 
                             transition-all duration-200 flex items-center gap-2 
                             active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    Editar
                  </button>
                </div>

                {/* Cards de Preferências */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Modo e Intervalo de Agendamento */}
                  <div className="bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden
                                shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                transition-all duration-300 border border-border-light dark:border-border-dark">
                    <div className="bg-background-light dark:bg-background-dark px-6 py-4 border-b border-border-light dark:border-border-dark">
                      <h3 className="text-base font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                        Modo e Intervalo de Agendamento
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Modo de Agendamento */}
                      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent 
                                    rounded-xl p-4 border border-primary/20 
                                    shadow-md hover:shadow-lg dark:shadow-dark-lg hover:scale-[1.01]
                                    transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-inter font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                              Modo de Agendamento
                            </p>
                            <p className="text-lg font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                              {preferences?.scheduling_mode === 'smart' ? 'Smart Scheduling' : 'Tradicional'}
                            </p>
                            {preferences?.scheduling_mode === 'smart' && (
                              <p className="text-xs font-inter text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                Limite: {preferences.daily_reviews_limit} revisões/dia
                              </p>
                            )}
                          </div>
                          <div className="p-3 bg-primary/10 rounded-xl">
                            <span className="material-symbols-outlined text-primary text-2xl">
                              schedule
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Intervalo de Agendamento */}
                      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent 
                                    rounded-xl p-4 border border-primary/20 
                                    shadow-md hover:shadow-lg dark:shadow-dark-lg hover:scale-[1.01]
                                    transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-inter font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                              Intervalo de Agendamento
                            </p>
                            <p className="text-lg font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                              {(() => {
                                const intensityMap: Record<string, string> = {
                                  'intensive': 'Intensivo',
                                  'balanced': 'Balanceado',
                                  'relaxed': 'Sem Compromisso'
                                };
                                return intensityMap[preferences?.study_mode || 'balanced'] || 'Balanceado';
                              })()}
                            </p>
                          </div>
                          <div className="p-3 bg-primary/10 rounded-xl">
                            <span className="material-symbols-outlined text-primary text-2xl">
                              timer
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tipos de Conteúdo e Distribuição */}
                  <div className="bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden
                                shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                transition-all duration-300 border border-border-light dark:border-border-dark">
                    <div className="bg-background-light dark:bg-background-dark px-6 py-4 border-b border-border-light dark:border-border-dark">
                      <h3 className="text-base font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                        Tipos de Conteúdo e Distribuição
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Tipos de Conteúdo com Checkboxes */}
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { key: 'enable_questions', label: 'Questões', percentage: preferences?.content_distribution?.questions || 0 },
                          { key: 'enable_flashcards', label: 'Flashcards', percentage: preferences?.content_distribution?.flashcards || 0 },
                          { key: 'enable_error_notebook', label: 'Caderno de Erros', percentage: preferences?.content_distribution?.error_notebook || 0 },
                        ].map((type) => {
                          const isEnabled = preferences?.[type.key as keyof typeof preferences] as boolean || false;
                          const dailyLimit = preferences?.daily_reviews_limit || 0;
                          const calculatedAmount = Math.round((dailyLimit * type.percentage) / 100);
                          const isSmartMode = preferences?.scheduling_mode === 'smart';
                          
                          return (
                            <div
                              key={type.key}
                              className={`
                                relative rounded-lg p-4 border-2 transition-all duration-200
                                hover:shadow-md dark:hover:shadow-dark-lg hover:scale-[1.01]
                                ${isEnabled 
                                  ? 'bg-primary/5 border-primary/30 shadow-sm hover:bg-primary/10 hover:border-primary/40' 
                                  : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark hover:border-primary/20 opacity-60'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <div className="pointer-events-none flex-shrink-0">
                                  <Checkbox
                                    checked={isEnabled}
                                    label={type.label}
                                    readOnly
                                  />
                                </div>
                                {isEnabled && isSmartMode && (
                                  <div className="text-right">
                                    <div className="text-sm font-display font-semibold text-text-light-primary dark:text-text-dark-primary">
                                      {type.percentage}%
                                    </div>
                                    <div className="text-xs font-inter text-text-light-secondary dark:text-text-dark-secondary">
                                      ~{calculatedAmount} revisões/dia
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>



                  {/* Dias de Estudo */}
                  <div className="bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden
                                shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                transition-all duration-300 border border-border-light dark:border-border-dark">
                    <div className="bg-background-light dark:bg-background-dark px-6 py-4 border-b border-border-light dark:border-border-dark">
                      <h3 className="text-base font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                        Dias de Estudo
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { value: 0, label: 'Domingo' },
                          { value: 1, label: 'Segunda-feira' },
                          { value: 2, label: 'Terça-feira' },
                          { value: 3, label: 'Quarta-feira' },
                          { value: 4, label: 'Quinta-feira' },
                          { value: 5, label: 'Sexta-feira' },
                          { value: 6, label: 'Sábado' },
                        ].map((day) => {
                          const isEnabled = preferences?.study_days?.includes(day.value) || false;
                          return (
                            <div
                              key={day.value}
                              className={`
                                relative rounded-lg p-3 border-2 transition-all duration-200
                                hover:shadow-md dark:hover:shadow-dark-lg hover:scale-[1.02]
                                ${isEnabled 
                                  ? 'bg-primary/5 border-primary/30 shadow-sm hover:bg-primary/10 hover:border-primary/40' 
                                  : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark hover:border-primary/20'
                                }
                              `}
                            >
                              <div className="pointer-events-none">
                                <Checkbox
                                  checked={isEnabled}
                                  label={day.label}
                                  readOnly
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>


                </div>
              </div>
            )}
          </div>
        </div>

      {showWizard && (
        <ReviewConfigurationWizard
          isOpen={showWizard}
          onClose={() => {
            setShowWizard(false);
            window.location.reload();
          }}
        />
      )}

      {/* Modal de Configuração de Metas */}
      <GoalsConfigModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        onSave={async (newGoals) => {
          await saveGoals(newGoals);
          refetchGoals();
        }}
        currentGoals={goals}
      />

      {/* Painel de Testes - Apenas em Desenvolvimento */}
      <DevTestingPanel />
    </>
  );
}
