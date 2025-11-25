'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { fetchWithAuth } from '@/lib/utils/fetchWithAuth'; // Descomentar quando backend estiver pronto

interface OverdueCount {
  total: number;
  flashcards: number;
  questions: number;
  errorNotebook: number;
}

export function OverdueReviewsAlert() {
  const router = useRouter();
  const [overdueCount, setOverdueCount] = useState<OverdueCount | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Verificar se o usuário já dispensou o alerta
    const dismissed = localStorage.getItem('overdueReviewsAlertDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
    loadOverdueCount();
  }, []);

  const loadOverdueCount = async () => {
    try {
      setLoading(true);
      
      // Importar o serviço
      const { unifiedReviewService } = await import('@/services/unifiedReviewService');
      const result = await unifiedReviewService.getOverdueStats();
      
      if (result.success && result.data) {
        // Mapear os dados para o formato esperado
        setOverdueCount({
          total: result.data.total_overdue || 0,
          flashcards: result.data.by_type?.FLASHCARD || 0,
          questions: result.data.by_type?.QUESTION || 0,
          errorNotebook: result.data.by_type?.ERROR_NOTEBOOK || 0,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar revisões atrasadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('overdueReviewsAlertDismissed', 'true');
    setIsDismissed(true);
  };

  // Não mostrar durante loading ou se não houver dados
  if (loading || !overdueCount || isDismissed) {
    return null;
  }

  // Não mostrar se não houver revisões atrasadas
  if (overdueCount.total === 0) {
    return null;
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark 
                    rounded-xl border-2 border-red-200 dark:border-red-800/50
                    shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                    transition-all duration-300 overflow-hidden">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 
                      px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-white text-4xl">
              warning
            </span>
            <div>
              <h2 className="text-xl font-display font-semibold text-white">
                Você tem {overdueCount.total} {overdueCount.total === 1 ? 'revisão' : 'revisões'} em atraso!
              </h2>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            title="Ocultar alerta"
          >
            <span className="material-symbols-outlined text-white text-2xl">
              close
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Breakdown por tipo - Grid adaptativo baseado na quantidade de cards */}
        {(() => {
          const visibleCards = [
            overdueCount.flashcards > 0,
            overdueCount.questions > 0,
            overdueCount.errorNotebook > 0
          ].filter(Boolean).length;

          // Define o grid baseado na quantidade de cards visíveis
          const gridClass = visibleCards === 1 
            ? 'flex justify-center' 
            : visibleCards === 2 
            ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
            : 'grid grid-cols-1 md:grid-cols-3 gap-6';

          return (
            <div className={gridClass}>
              {overdueCount.flashcards > 0 && (
                <div className={`bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden
                              shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                              transition-all duration-300 border border-border-light dark:border-border-dark
                              ${visibleCards === 1 ? 'w-full max-w-sm' : ''}`}>
                  {/* Header */}
                  <div className="bg-background-light dark:bg-background-dark px-6 py-4 border-b border-border-light dark:border-border-dark">
                    <h3 className="text-base font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                      Flashcards
                    </h3>
                  </div>
                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                        {overdueCount.flashcards}
                      </span>
                      <span className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary">
                        em atraso
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {overdueCount.questions > 0 && (
                <div className={`bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden
                              shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                              transition-all duration-300 border border-border-light dark:border-border-dark
                              ${visibleCards === 1 ? 'w-full max-w-sm' : ''}`}>
                  {/* Header */}
                  <div className="bg-background-light dark:bg-background-dark px-6 py-4 border-b border-border-light dark:border-border-dark">
                    <h3 className="text-base font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                      Questões
                    </h3>
                  </div>
                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                        {overdueCount.questions}
                      </span>
                      <span className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary">
                        em atraso
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {overdueCount.errorNotebook > 0 && (
                <div className={`bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden
                              shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                              transition-all duration-300 border border-border-light dark:border-border-dark
                              ${visibleCards === 1 ? 'w-full max-w-sm' : ''}`}>
                  {/* Header */}
                  <div className="bg-background-light dark:bg-background-dark px-6 py-4 border-b border-border-light dark:border-border-dark">
                    <h3 className="text-base font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                      Caderno de Erros
                    </h3>
                  </div>
                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                        {overdueCount.errorNotebook}
                      </span>
                      <span className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary">
                        em atraso
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/revisoes/gerenciar?filter=overdue')}
            className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90
                     text-white rounded-xl font-display font-semibold 
                     transition-all duration-200 
                     shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                     flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">tune</span>
            <span>Gerenciar Revisões</span>
          </button>
          
          <button
            onClick={() => setShowTips(!showTips)}
            className="px-6 py-3 bg-background-light dark:bg-background-dark 
                     text-text-light-primary dark:text-text-dark-primary rounded-xl font-display font-semibold 
                     border-2 border-border-light dark:border-border-dark
                     hover:bg-surface-light dark:hover:bg-surface-dark hover:border-primary
                     transition-all duration-200 
                     shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                     flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">
              {showTips ? 'expand_less' : 'expand_more'}
            </span>
            <span>Como evitar Acúmulos</span>
          </button>
        </div>

        {/* Dicas expansíveis */}
        <div 
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showTips ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="pt-4 border-t-2 border-border-light dark:border-border-dark space-y-4">
            <p className="text-sm font-inter text-text-light-primary dark:text-text-dark-primary font-medium">
              Atente-se a algumas estratégias e dicas para manter tudo em dia:
            </p>
            
            <div className="space-y-3">
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark
                            shadow-md hover:shadow-lg dark:shadow-dark-lg transition-all duration-200">
                <h4 className="font-display font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">1</span>
                  Ajuste seu modo de agendamento
                </h4>
                <p className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary ml-8">
                  Se você usa o modo Smart Reviews e estiver acumulando revisões frequentemente, considere trocar para o modo tradicional, 
                  que é mais flexível ao não ter um limite fixo de revisões diárias.
                </p>
              </div>

              <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark
                            shadow-md hover:shadow-lg dark:shadow-dark-lg transition-all duration-200">
                <h4 className="font-display font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">2</span>
                  Reduza seu limite diário de revisões
                </h4>
                <p className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary ml-8">
                  Outra opção é reduzir o seu limite máximo de revisões diárias. Nas preferências de revisão, ajuste para um número mais realista 
                  e o sistema MedBRAVE as realocará para dias disponíveis na sua agenda. (OBS: válido para novas revisões)
                </p>
              </div>

              <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark
                            shadow-md hover:shadow-lg dark:shadow-dark-lg transition-all duration-200">
                <h4 className="font-display font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">3</span>
                  Configure seus dias de estudo
                </h4>
                <p className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary ml-8">
                  Quanto mais dias disponíveis, melhor são distribuídas as revisões. Habilite corretamente os seus dias de estudo 
                  conforme seu cronograma, e deixe o resto com a gente!
                </p>
              </div>

              <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark
                            shadow-md hover:shadow-lg dark:shadow-dark-lg transition-all duration-200">
                <h4 className="font-display font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">4</span>
                  Ajuste a intensidade das revisões
                </h4>
                <p className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary ml-8">
                  Nas preferências, você pode escolher entre os modos Pré-Prova, Intensivo, Balanceado ou Sem compromisso. 
                  Considere utilizar um modo com menos intensidade e intervalo maior de aprendizado.
                </p>
              </div>

              <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark
                            shadow-md hover:shadow-lg dark:shadow-dark-lg transition-all duration-200">
                <h4 className="font-display font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">5</span>
                  Foque em um tipo de conteúdo
                </h4>
                <p className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary ml-8">
                  Se estiver sobrecarregado, desative temporariamente alguns tipos de conteúdo nas preferências. 
                  Por exemplo, foque apenas em questões e desative flashcards até colocar tudo em dia.
                </p>
              </div>

              <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark
                            shadow-md hover:shadow-lg dark:shadow-dark-lg transition-all duration-200">
                <h4 className="font-display font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">6</span>
                  Remova revisões desnecessárias
                </h4>
                <p className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary ml-8">
                  No gerenciador de revisões, você pode excluir manualmente revisões de conteúdos que não são mais relevantes 
                  para seus estudos. Tire um tempinho para revisar esses itens. Lá você consegue acompanhar o seu desenvolvimento 
                  em cada revisão ao longo do tempo e filtrar as que merecem maior atenção!
                </p>
              </div>
            </div>

            <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-4 border border-primary/30
                          shadow-md hover:shadow-lg dark:shadow-dark-lg transition-all duration-200">
              <p className="text-sm font-inter text-text-light-primary dark:text-text-dark-primary">
                <span className="font-semibold">Dica:</span> Use o gerenciador de revisões para reagendar em lote. 
                Você pode selecionar várias revisões e distribuí-las ao longo dos próximos dias de forma equilibrada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
