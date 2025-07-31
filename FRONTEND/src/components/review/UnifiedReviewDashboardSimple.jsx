import React from 'react';

/**
 * Componente simples para testar se o problema está no UnifiedReviewDashboard
 */
const UnifiedReviewDashboardSimple = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Central de Revisões - Teste
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Este é um componente de teste para verificar se a rota está funcionando corretamente.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Revisões Hoje
              </h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">25</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Meta: 50</p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                Tempo Estudado
              </h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">2h 30m</p>
              <p className="text-sm text-green-700 dark:text-green-300">Meta: 4h</p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                Precisão
              </h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">87%</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">Respostas corretas</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ações Rápidas
            </h2>
            <div className="flex gap-4">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Nova Sessão
              </button>
              <button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                Ver Histórico
              </button>
              <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                Estatísticas
              </button>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">
              <strong>Nota:</strong> Este é um componente de teste. Se você está vendo esta mensagem, 
              significa que a rota está funcionando corretamente e o problema estava no componente original.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedReviewDashboardSimple;