import React from 'react';
import { Trophy, Target, BookOpen, Zap, Award, TrendingUp, RotateCcw, Home } from 'lucide-react';
import { formatDate, formatTime as utilFormatTime } from '../../utils/dateUtils';

/**
 * Componente para exibir o resumo final da sessão de revisão
 * Mostra estatísticas detalhadas e opções para próximas ações
 */
const SessionSummary = ({ 
  statistics = {
    totalAnswered: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    accuracy: 0,
    averageTime: 0,
    totalTime: 0,
    itemsReviewed: []
  },
  onNewSession,
  onBackToDashboard,
  sessionData = null
}) => {
  const { 
    totalAnswered: rawTotalAnswered, 
    correctAnswers: rawCorrectAnswers, 
    incorrectAnswers: rawIncorrectAnswers, 
    accuracy: rawAccuracy, 
    averageTime: rawAverageTime, 
    totalTime: rawTotalTime,
    itemsReviewed 
  } = statistics;

  // Validar e garantir que todos os valores sejam números válidos
  const totalAnswered = isNaN(rawTotalAnswered) ? 0 : rawTotalAnswered;
  const correctAnswers = isNaN(rawCorrectAnswers) ? 0 : rawCorrectAnswers;
  const incorrectAnswers = isNaN(rawIncorrectAnswers) ? 0 : rawIncorrectAnswers;
  const accuracy = isNaN(rawAccuracy) ? 0 : rawAccuracy;
  const averageTime = isNaN(rawAverageTime) ? 0 : rawAverageTime;
  const totalTime = isNaN(rawTotalTime) ? 0 : rawTotalTime;

  // Formatar tempo
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Determinar performance
  const getPerformanceLevel = () => {
    if (accuracy >= 90) return { level: 'Excelente', color: 'green', icon: Trophy };
    if (accuracy >= 80) return { level: 'Muito Bom', color: 'blue', icon: Target };
    if (accuracy >= 70) return { level: 'Bom', color: 'yellow', icon: TrendingUp };
    if (accuracy >= 60) return { level: 'Regular', color: 'orange', icon: Award };
    return { level: 'Precisa Melhorar', color: 'red', icon: Zap };
  };

  const performance = getPerformanceLevel();

  // Calcular pontos ganhos (gamificação)
  const calculatePoints = () => {
    // Validar se os valores são números válidos
    const validCorrectAnswers = isNaN(correctAnswers) ? 0 : correctAnswers;
    const validAccuracy = isNaN(accuracy) ? 0 : accuracy;
    const validAverageTime = isNaN(averageTime) ? 0 : averageTime;
    const validTotalAnswered = isNaN(totalAnswered) ? 0 : totalAnswered;
    
    let points = validCorrectAnswers * 10; // 10 pontos por resposta correta
    
    // Bônus por precisão
    if (validAccuracy >= 90) points += 100;
    else if (validAccuracy >= 80) points += 50;
    else if (validAccuracy >= 70) points += 25;
    
    // Bônus por velocidade (se tempo médio < 30s)
    if (validAverageTime < 30 && validAverageTime > 0) points += 50;
    
    // Bônus por completar sessão
    if (validTotalAnswered >= 10) points += 25;
    
    return isNaN(points) ? 0 : points;
  };

  const pointsEarned = calculatePoints();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className={`inline-flex p-4 rounded-full mb-4 ${
          performance.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
          performance.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
          performance.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
          performance.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
          'bg-red-100 dark:bg-red-900/30'
        }`}>
          <performance.icon className={`w-12 h-12 ${
            performance.color === 'green' ? 'text-green-600 dark:text-green-400' :
            performance.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
            performance.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
            performance.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
            'text-red-600 dark:text-red-400'
          }`} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Sessão Concluída!
        </h2>
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${
          performance.color === 'green' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
          performance.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
          performance.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
          performance.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' :
          'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {performance.level}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
          Concluída em {formatDate(new Date())} às {utilFormatTime(new Date())}
        </p>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {/* Total Respondidas */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {totalAnswered}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Itens Revisados
          </div>
        </div>

        {/* Precisão */}
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            {Math.round(accuracy)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Precisão
          </div>
        </div>

        {/* Tempo Total */}
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            {formatTime(totalTime)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Tempo Total
          </div>
        </div>

        {/* Pontos */}
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
            {pointsEarned}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pontos Ganhos
          </div>
        </div>
      </div>

      {/* Detalhamento */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Distribuição de Respostas */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribuição de Respostas
          </h3>
          
          <div className="space-y-4">
            {/* Corretas */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Corretas</span>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {correctAnswers}
              </span>
            </div>
            
            {/* Incorretas */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Incorretas</span>
              </div>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {incorrectAnswers}
              </span>
            </div>
            
            {/* Barra Visual */}
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div className="flex h-full">
                <div 
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0}%` }}
                ></div>
                <div 
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${totalAnswered > 0 ? (incorrectAnswers / totalAnswered) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas de Tempo */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Métricas de Tempo
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tempo Total:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatTime(totalTime)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tempo Médio:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatTime(averageTime)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Velocidade:</span>
              <span className={`font-semibold ${
                averageTime < 30 ? 'text-green-600 dark:text-green-400' :
                averageTime < 60 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {averageTime < 30 ? 'Rápida' : averageTime < 60 ? 'Moderada' : 'Lenta'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conquistas */}
      {(accuracy >= 80 || correctAnswers >= 10 || averageTime < 30) && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-6 mb-8 border border-yellow-200 dark:border-yellow-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            Conquistas Desbloqueadas
          </h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            {accuracy >= 90 && (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <Target className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Precisão Perfeita</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">90%+ de acertos</div>
                </div>
              </div>
            )}
            
            {correctAnswers >= 10 && (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Estudioso</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">10+ itens revisados</div>
                </div>
              </div>
            )}
            
            {averageTime < 30 && averageTime > 0 && (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <Zap className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Velocidade da Luz</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tempo médio &lt; 30s</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recomendações */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Recomendações
        </h3>
        
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          {accuracy < 70 && (
            <p>• Considere revisar os conceitos fundamentais antes da próxima sessão</p>
          )}
          {averageTime > 60 && (
            <p>• Tente ser mais ágil nas respostas para melhorar o tempo médio</p>
          )}
          {correctAnswers < 5 && (
            <p>• Sessões mais longas podem ajudar a consolidar o aprendizado</p>
          )}
          {accuracy >= 80 && (
            <p>• Excelente desempenho! Continue praticando para manter o nível</p>
          )}
          <p>• Próxima revisão recomendada: {accuracy >= 80 ? '3 dias' : '1 dia'}</p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onNewSession}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Nova Sessão
        </button>
        
        <button
          onClick={onBackToDashboard}
          className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Voltar ao Dashboard
        </button>
      </div>

      {/* Compartilhar Resultado */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Compartilhar resultado:
          </span>
          <div className="flex gap-2">
            <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
              </svg>
            </button>
            <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
              </svg>
            </button>
            <button className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionSummary;