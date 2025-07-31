import React, { useEffect } from 'react';
import { useUnifiedReview } from '../../contexts/UnifiedReviewContext';

/**
 * Componente de dashboard otimizado que carrega apenas as revisões de hoje
 * para economizar leituras do banco de dados e melhorar a performance
 */
const OptimizedDashboard = () => {
  const {
    todayReviews,
    dailySummary,
    loading,
    error,
    loadDashboardData,
    loadTodayReviews
  } = useUnifiedReview();

  useEffect(() => {
    // Carregar dados otimizados do dashboard
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando revisões de hoje...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro: {error}</p>
        <button 
          onClick={() => loadDashboardData()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo das revisões de hoje */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Revisões de Hoje</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600">Total de Hoje</h3>
            <p className="text-2xl font-bold text-blue-900">
              {dailySummary?.todayItems || 0}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600">Flashcards</h3>
            <p className="text-2xl font-bold text-green-900">
              {dailySummary?.flashcards || 0}
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600">Questões</h3>
            <p className="text-2xl font-bold text-purple-900">
              {dailySummary?.questions || 0}
            </p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-orange-600">Tempo Estimado</h3>
            <p className="text-2xl font-bold text-orange-900">
              {dailySummary?.estimatedTimeMinutes || 0}min
            </p>
          </div>
        </div>

        {/* Lista das primeiras revisões de hoje */}
        {todayReviews && todayReviews.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-3">Próximas Revisões</h3>
            <div className="space-y-2">
              {todayReviews.slice(0, 5).map((review, index) => (
                <div key={review.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{review.title || 'Sem título'}</p>
                    <p className="text-sm text-gray-600">
                      {review.contentType} • {review.deckName || 'Deck padrão'}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {review.difficulty && (
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                        Dificuldade: {review.difficulty.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {todayReviews.length > 5 && (
              <p className="text-sm text-gray-600 mt-3">
                E mais {todayReviews.length - 5} revisões...
              </p>
            )}
          </div>
        )}

        {todayReviews && todayReviews.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">🎉 Parabéns! Você não tem revisões pendentes para hoje.</p>
          </div>
        )}
      </div>

      {/* Botão para atualizar */}
      <div className="flex justify-center">
        <button
          onClick={() => loadTodayReviews(true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Atualizar Revisões
        </button>
      </div>
    </div>
  );
};

export default OptimizedDashboard;