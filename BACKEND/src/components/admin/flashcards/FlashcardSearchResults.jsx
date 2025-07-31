import React from 'react';
import { Calendar, Users, BookOpen, Clock, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { FSRSStatChip, PriorityChip } from './FSRSChip';

/**
 * 📋 COMPONENTE: Resultados da Busca de Flashcards
 * 
 * Features:
 * - Lista de decks com informações FSRS
 * - Estatísticas visuais por deck
 * - Indicadores de prioridade
 * - Links para navegação
 */
const FlashcardSearchResults = ({ 
  results, 
  isLoading, 
  onDeckClick,
  showFSRSStats = true 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <SearchResultSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum resultado encontrado</p>
        <p className="text-sm">Tente ajustar sua busca ou filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((deck) => (
        <SearchResultCard
          key={deck.id}
          deck={deck}
          onDeckClick={onDeckClick}
          showFSRSStats={showFSRSStats}
        />
      ))}
    </div>
  );
};

/**
 * 🎴 COMPONENTE: Card de Resultado Individual
 */
const SearchResultCard = ({ deck, onDeckClick, showFSRSStats }) => {
  const handleClick = () => {
    onDeckClick && onDeckClick(deck);
  };

  // Calcular prioridade baseada em estatísticas FSRS
  const getPriority = () => {
    if (!deck.fsrsStats) return 'media';
    
    const { overdueCards, lowPerformance, pendingCards } = deck.fsrsStats;
    
    if (overdueCards > 10 && lowPerformance > 5) return 'critica';
    if (overdueCards > 5 || lowPerformance > 3) return 'alta';
    if (pendingCards > 10) return 'media';
    return 'baixa';
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch (error) {
      return 'N/A';
    }
  };

  // Calcular progresso geral
  const getProgress = () => {
    if (!deck.fsrsStats) return 0;
    
    const { totalCards, upToDateCards, pendingCards } = deck.fsrsStats;
    if (totalCards === 0) return 0;
    
    return Math.round(((upToDateCards + (pendingCards * 0.5)) / totalCards) * 100);
  };

  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">
            {deck.name}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{deck.collection}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{deck.totalCards || 0} cards</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(deck.lastModified || deck.created_at)}</span>
            </div>
          </div>
        </div>
        
        {/* Prioridade */}
        <div className="ml-4">
          <PriorityChip priority={getPriority()} />
        </div>
      </div>

      {/* Estatísticas FSRS */}
      {showFSRSStats && deck.fsrsStats && (
        <div className="space-y-3">
          {/* Chips de estatísticas */}
          <div className="flex flex-wrap gap-2">
            {deck.fsrsStats.pendingCards > 0 && (
              <FSRSStatChip
                label="Pendentes"
                value={deck.fsrsStats.pendingCards}
                icon={Clock}
                color="orange"
              />
            )}
            
            {deck.fsrsStats.overdueCards > 0 && (
              <FSRSStatChip
                label="Vencidas"
                value={deck.fsrsStats.overdueCards}
                icon={AlertTriangle}
                color="red"
              />
            )}
            
            {deck.fsrsStats.upToDateCards > 0 && (
              <FSRSStatChip
                label="Em Dia"
                value={deck.fsrsStats.upToDateCards}
                icon={TrendingUp}
                color="green"
              />
            )}
            
            {deck.fsrsStats.neverStudiedCards > 0 && (
              <FSRSStatChip
                label="Nunca Estudadas"
                value={deck.fsrsStats.neverStudiedCards}
                icon={BookOpen}
                color="gray"
              />
            )}
          </div>

          {/* Barra de progresso */}
          <div className="w-full">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Progresso Geral</span>
              <span className="text-sm font-medium text-gray-900">{getProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          {/* Desempenho */}
          {(deck.fsrsStats.lowPerformance > 0 || deck.fsrsStats.highPerformance > 0) && (
            <div className="flex gap-2 text-sm">
              {deck.fsrsStats.lowPerformance > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="w-4 h-4" />
                  <span>{deck.fsrsStats.lowPerformance} baixo desempenho</span>
                </div>
              )}
              {deck.fsrsStats.highPerformance > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>{deck.fsrsStats.highPerformance} alto desempenho</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Descrição do deck (se houver) */}
      {deck.description && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600 line-clamp-2">
            {deck.description}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * 💀 COMPONENTE: Skeleton para loading
 */
const SearchResultSkeleton = () => (
  <div className="border border-gray-200 rounded-lg p-4 bg-white">
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
        </div>
      </div>
      <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse" />
    </div>
    
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
      </div>
      
      <div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-1 animate-pulse" />
        <div className="h-2 bg-gray-200 rounded w-full animate-pulse" />
      </div>
    </div>
  </div>
);

export default FlashcardSearchResults; 