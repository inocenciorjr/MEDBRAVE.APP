import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import FlashcardStats from '../../../../components/FlashcardStats';
import { flashcardService } from '../../../../services/flashcardService';
import ErrorBoundary from '../../../../components/ErrorBoundary';

const Estatisticas = () => {
  const [stats, setStats] = useState({
    totalDecks: 0,
    totalCards: 0,
    dueCards: 0,
    studiedToday: 0
  });
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await flashcardService.getUserFlashcardStats();
      
      if (response.success) {
        setStats(response.data || {});
      }
    } catch {
      // Erro silencioso
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
              Estatísticas
            </h2>
            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
              Dashboard com métricas de estudo e performance
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="w-9 h-9 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <FlashcardStats
          stats={stats}
          loading={loading}
          onRefresh={handleRefresh}
        />
        
        <div className="text-center py-8">
          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
            Mais métricas e gráficos serão adicionados em breve...
          </p>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Estatisticas; 