import React from 'react';

/**
 * Componente para exibir o progresso da sessão de revisão
 * Mostra estatísticas em tempo real e barra de progresso
 */
const ReviewProgress = ({ 
  current = 0, 
  total = 0, 
  statistics = {
    totalAnswered: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    accuracy: 0,
    averageTime: 0
  },
  timeElapsed = 0,
  showDetailedStats = true
}) => {
  // Calcular porcentagem de progresso
  const progressPercentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  // Calcular estatísticas
  const { totalAnswered, correctAnswers, incorrectAnswers, accuracy, averageTime } = statistics;
  
  // Formatar tempo
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      {/* Barra de Progresso Principal */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progresso
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {current} de {total}
            </span>
          </div>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {progressPercentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="h-full bg-white/20 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Estatísticas Detalhadas */}
      {showDetailedStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Respostas Corretas */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-bold text-green-700 dark:text-green-400">
                  {correctAnswers}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500">
                  Corretas
                </div>
              </div>
            </div>
          </div>

          {/* Respostas Incorretas */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-bold text-red-700 dark:text-red-400">
                  {incorrectAnswers}
                </div>
                <div className="text-xs text-red-600 dark:text-red-500">
                  Incorretas
                </div>
              </div>
            </div>
          </div>

          {/* Precisão */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {Math.round(accuracy)}%
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-500">
                  Precisão
                </div>
              </div>
            </div>
          </div>

          {/* Tempo Médio */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                  {formatTime(averageTime)}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-500">
                  Tempo Médio
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Precisão Visual */}
      {totalAnswered > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Distribuição de Respostas
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalAnswered} respondidas
            </span>
          </div>
          
          <div className="flex w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            {/* Barra Verde (Corretas) */}
            <div 
              className="bg-green-500 transition-all duration-300"
              style={{ width: `${(correctAnswers / totalAnswered) * 100}%` }}
            />
            {/* Barra Vermelha (Incorretas) */}
            <div 
              className="bg-red-500 transition-all duration-300"
              style={{ width: `${(incorrectAnswers / totalAnswered) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{correctAnswers} corretas</span>
            <span>{incorrectAnswers} incorretas</span>
          </div>
        </div>
      )}

      {/* Indicadores de Performance */}
      {totalAnswered > 0 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          {/* Indicador de Streak */}
          {correctAnswers >= 3 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Sequência: {correctAnswers}
            </div>
          )}

          {/* Indicador de Velocidade */}
          {averageTime > 0 && (
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              averageTime < 30 
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : averageTime < 60
                ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {averageTime < 30 ? 'Rápido' : averageTime < 60 ? 'Moderado' : 'Devagar'}
            </div>
          )}

          {/* Indicador de Precisão */}
          {accuracy >= 80 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Alta Precisão
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewProgress;