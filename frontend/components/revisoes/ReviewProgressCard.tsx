import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRouter } from 'next/navigation';

interface ReviewProgressCardProps {
  contentType: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK';
}

const ReviewProgressCard: React.FC<ReviewProgressCardProps> = ({ contentType }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [showCheckIcon, setShowCheckIcon] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const loadTodayData = useCallback(async () => {
    try {
      setLoading(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      // Usar o MESMO endpoint que o planner usa
      const today = new Date();
      // IMPORTANTE: Usar data LOCAL, não UTC!
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const response = await fetch(`/api/unified-reviews/planner?limit=200&startDate=${todayStr}&endDate=${todayStr}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      const result = await response.json();

      if (result.success && result.data.grouped[todayStr]) {
        const todayData = result.data.grouped[todayStr][contentType];
        
        if (todayData) {
          const pendingReviews = todayData.reviews || [];
          const completedReviews = todayData.completed_reviews || [];
          const completedCount = todayData.completed_count || 0;
          // IMPORTANTE: Calcular total somando pendentes + completados (igual ao DailyPlanner)
          // Não usar todayData.count porque pode estar desatualizado no banco
          const totalCount = pendingReviews.length + completedCount;
          const pendingCount = pendingReviews.length;
          
          // Combinar IDs de pendentes e respondidos
          const allReviewIds = [
            ...pendingReviews.map((r: any) => r.id),
            ...completedReviews.map((r: any) => r.id)
          ];
          
          setCompleted(completedCount);
          setTotal(totalCount);
          setReviewed(completedCount);
          setRemaining(pendingCount);
          setReviewIds(allReviewIds);
        } else {
          // Sem dados para hoje
          setCompleted(0);
          setTotal(0);
          setReviewed(0);
          setRemaining(0);
          setReviewIds([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [contentType]);

  useEffect(() => {
    // Garantir que o componente está montado e o DOM está pronto antes de renderizar o gráfico
    setIsMounted(true);
    loadTodayData();
  }, [loadTodayData]);

  useEffect(() => {
    // Mostrar ícone de check após a animação do gráfico (800ms)
    if (remaining === 0 && total > 0 && !loading) {
      const timer = setTimeout(() => {
        setShowCheckIcon(true);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setShowCheckIcon(false);
    }
  }, [remaining, total, loading]);

  // Configurações por tipo de conteúdo - Padronizado com roxo
  const config = {
    FLASHCARD: {
      title: 'Flashcards',
    },
    QUESTION: {
      title: 'Questões',
    },
    ERROR_NOTEBOOK: {
      title: 'Caderno de Erros',
    }
  };

  const currentConfig = config[contentType];
  
  // Cores do design system - roxo primary
  const chartFill = '#7C3AED'; // primary
  const chartBg = '#E9D5FF'; // primary claro para contraste
  const percentCompleted = total > 0 ? Math.round((completed / total) * 100) : 0;
  const percentRemaining = 100 - percentCompleted;

  const data = [
    { value: percentCompleted },
    { value: percentRemaining },
  ];

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 md:p-8 
                      shadow-lg border border-border-light dark:border-border-dark animate-pulse">
        <div className="h-64 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const handleStartReview = async () => {
    if (remaining === 0 || reviewIds.length === 0) return;
    
    try {
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      
      // Usar data LOCAL (não UTC) para garantir consistência
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log(`[ReviewProgressCard] Iniciando revisão de ${contentType} para ${dateStr}`);
      
      // O backend agora verifica automaticamente se já existe sessão
      // e retorna a existente ou cria uma nova
      const response = await fetchWithAuth('/api/review-sessions', {
        method: 'POST',
        body: JSON.stringify({
          content_type: contentType,
          review_ids: reviewIds,
          date: dateStr,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar sessão');
      }

      const result = await response.json();
      const sessionId = result.data.session.id;
      
      console.log(`[ReviewProgressCard] Sessão obtida: ${sessionId}`);
      
      // Navegar para a página da sessão
      let url = '';
      if (contentType === 'FLASHCARD') {
        url = `/revisoes/flashcards/sessao/${sessionId}`;
      } else if (contentType === 'QUESTION') {
        url = `/revisoes/questoes/sessao/${sessionId}`;
      } else if (contentType === 'ERROR_NOTEBOOK') {
        url = `/revisoes/caderno-erros/sessao/${sessionId}`;
      }
      
      if (url) {
        router.push(url);
      }
    } catch (error) {
      console.error('Erro ao iniciar revisão:', error);
      alert('Erro ao iniciar revisão. Tente novamente.');
    }
  };

  return (
    <div 
      className="bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden
                 shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                 transition-all duration-300 border border-border-light dark:border-border-dark
                 cursor-pointer hover:scale-[1.02]"
      style={{ minHeight: '350px' }}
      onClick={handleStartReview}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartReview();
        }
      }}
      aria-label={`Iniciar revisão de ${config[contentType].title} - ${remaining} pendentes`}
    >
      {/* Header */}
      <div className="bg-background-light dark:bg-background-dark px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            {currentConfig.title}
          </h2>
          {remaining > 0 ? (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/10 text-primary rounded-md text-xs sm:text-sm font-display font-semibold whitespace-nowrap">
              {remaining} pendentes
            </span>
          ) : total > 0 && (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/10 text-primary rounded-md text-xs sm:text-sm font-display font-semibold">
              Concluído
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 md:p-6 lg:p-8" style={{ minHeight: '280px' }}>

        {/* Circular Chart Centralizado */}
        <div className="flex justify-center mb-4 sm:mb-6" style={{ height: '160px', minHeight: '160px' }} aria-hidden="true">
          <div className="relative w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48" style={{ minWidth: '160px', minHeight: '160px' }}>
            {remaining === 0 && total > 0 && showCheckIcon ? (
              // Apenas ícone grande quando completado
              <div className="absolute inset-0 flex items-center justify-center animate-zoom-in">
                <CheckCircleIcon 
                  className="text-green-500 dark:text-green-400"
                  sx={{ fontSize: 120 }}
                />
              </div>
            ) : (
              <>
                {/* Background Circle Ring */}
                <div className="absolute inset-0 rounded-full border-[6px] border-primary/20 scale-90"></div>
              
                {isMounted && (
                  <ResponsiveContainer width={192} height={192} minWidth={192} minHeight={192}>
                    <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={82}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={10}
                      paddingAngle={0}
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      <Cell key="cell-0" fill={chartFill} />
                      <Cell key="cell-1" fill={chartBg} />
                    </Pie>
                  </PieChart>
                  </ResponsiveContainer>
                )}

                {/* Center Content - Progresso numérico */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                      {completed}/{total}
                    </div>
                    <div className="text-xs sm:text-sm font-display font-semibold text-text-light-secondary dark:text-text-dark-secondary mt-0.5 sm:mt-1">
                      {percentCompleted}%
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer com botão de ação */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border-light dark:border-border-dark">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleStartReview();
          }}
          disabled={remaining === 0}
          className={`w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-display font-semibold text-sm sm:text-base transition-all duration-200
                     ${remaining > 0 
                       ? 'bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]' 
                       : 'bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary cursor-not-allowed'
                     }`}
        >
          {remaining > 0 ? 'Iniciar Revisão' : 'Nenhuma revisão pendente'}
        </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewProgressCard;