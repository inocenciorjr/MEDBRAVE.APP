import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedReview } from '../../contexts/UnifiedReviewContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, Clock, RefreshCw } from 'lucide-react';

/**
 * Card de Revisões de Hoje para o Dashboard
 * 
 * Funcionalidades:
 * - Exibe revisões agendadas para hoje (flashcards, questões, cadernos de erros)
 * - Cache de 5 minutos para otimizar performance
 * - Indicação discreta de atualização automática
 * - Botão "Revisar agora!" que redireciona para a página de revisões
 * - Suporte a tema claro/escuro via CSS variables
 */
const TodayReviewsCard = () => {
  const navigate = useNavigate();
  const { todayReviews, loadTodayReviews } = useUnifiedReview();
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const cacheTimeoutRef = useRef(null);
  
  // Cache de 5 minutos (300000ms)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
    
    // Configurar atualização automática a cada 5 minutos
    const interval = setInterval(() => {
      loadData();
    }, CACHE_DURATION);

    return () => {
      clearInterval(interval);
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await loadTodayReviews();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar revisões de hoje:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleReviewNow = () => {
    navigate('/dashboard/revisoes');
  };

  // Calcular contadores por tipo
  const getReviewCounts = () => {
    if (!todayReviews || !Array.isArray(todayReviews)) {
      return { flashcards: 0, questoes: 0, cadernos: 0, total: 0 };
    }

    const counts = todayReviews.reduce(
      (acc, item) => {
        switch (item.contentType) {
          case 'FLASHCARD':
            acc.flashcards++;
            break;
          case 'QUESTION':
            acc.questoes++;
            break;
          case 'ERROR_NOTEBOOK':
            acc.cadernos++;
            break;
        }
        acc.total++;
        return acc;
      },
      { flashcards: 0, questoes: 0, cadernos: 0, total: 0 }
    );

    return counts;
  };

  const counts = getReviewCounts();

  // Formatar tempo da última atualização
  const getLastUpdateText = () => {
    if (!lastUpdate) return '';
    
    const now = new Date();
    const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
    
    if (diffMinutes === 0) return 'Atualizado agora';
    if (diffMinutes === 1) return 'Atualizado há 1 minuto';
    return `Atualizado há ${diffMinutes} minutos`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Revisões de Hoje</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Indicação discreta de atualização */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{getLastUpdateText()} • Atualiza a cada 5 min</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !todayReviews ? (
          // Loading state
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        ) : (
          // Exibir sempre todos os tipos
          <>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Flashcards</span>
                </div>
                <Badge variant={counts.flashcards > 0 ? "default" : "secondary"} className="font-semibold">
                  {counts.flashcards}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">Questões</span>
                </div>
                <Badge variant={counts.questoes > 0 ? "default" : "secondary"} className="font-semibold">
                  {counts.questoes}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Cadernos de Erros</span>
                </div>
                <Badge variant={counts.cadernos > 0 ? "default" : "secondary"} className="font-semibold">
                  {counts.cadernos}
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">Total de Revisões</span>
                <Badge variant="default" className="text-base font-bold px-3 py-1">
                  {counts.total}
                </Badge>
              </div>
              
              <Button 
                onClick={handleReviewNow}
                className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={counts.total === 0}
              >
                {counts.total > 0 ? 'Iniciar Revisões' : 'Nenhuma Revisão Pendente'}
              </Button>
            </div>
           </>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayReviewsCard;