import React, { memo } from 'react';
import { ChevronDown, ChevronRight, Folder, Loader } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatDateTime } from '../utils/dateUtils';

/**
 * ✅ COMPONENTE: Item de metadados da coleção (carregamento lazy)
 * Baseado no admin mas com design do dashboard
 */
const CollectionMetadataItem = memo(({ 
  collection, 
  onLoadCollection, 
  isLoading, 
  isExpanded 
}) => {
  const formatLastUpdated = (dateString) => {
    if (!dateString) return 'Nunca atualizada';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      
      return formatDateTime(dateString);
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Função para obter contagem correta de cards (compatibilidade com admin)
  const getCardCount = () => {
    return collection.cardCount || collection.flashcardCount || 0;
  };

  // Função para obter data de atualização correta
  const getLastUpdated = () => {
    return collection.lastUpdated || collection.lastModified || collection.updatedAt;
  };

  const handleToggleExpand = (e) => {
    e?.stopPropagation();
    if (onLoadCollection && !isLoading) {
      onLoadCollection(collection.name);
    }
  };

  return (
    <div 
      className="dashboard-card mb-2 cursor-pointer transition-colors duration-200 hover:shadow-md"
      onClick={handleToggleExpand}
    >
      <div className="flex items-center justify-between w-full p-4">
        <div className="flex items-center flex-1">
          {/* Botão de expansão */}
          <button
            className="mr-3 p-1 rounded-md transition-colors"
            style={{'&:hover': {backgroundColor: 'var(--bg-interactive)'}}}
            onClick={handleToggleExpand}
            disabled={isLoading}
            title={isExpanded ? 'Recolher coleção' : 'Expandir coleção'}
          >
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin" style={{color: 'var(--accent)'}} />
            ) : isExpanded ? (
              <ChevronDown className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
            )}
          </button>
          
          {/* Ícone da coleção */}
          <div className="mr-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--bg-interactive)'}}>
              <Folder className="w-4 h-4" style={{color: 'var(--accent)'}} />
            </div>
          </div>
          
          {/* Informações da coleção */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold" style={{color: 'var(--text-primary)'}}>
                {collection.name}
              </h3>
            </div>
            
            <p className="text-sm mb-2" style={{color: 'var(--text-secondary)'}}>
              Atualizada: {formatLastUpdated(getLastUpdated())}
            </p>
            
            {/* Estatísticas */}
            <div className="flex items-center gap-3 text-sm" style={{color: 'var(--text-muted)'}}>
              <div className="flex items-center gap-1">
                <span>{collection.deckCount || 0} deck{(collection.deckCount || 0) !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{getCardCount()} card{getCardCount() !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Badges informativos */}
        <div className="flex items-center gap-2 ml-4">
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{
              backgroundColor: 'var(--bg-interactive)',
              color: 'var(--accent)',
              borderColor: 'var(--border)'
            }}
          >
            {collection.deckCount || 0} baralhos
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{
              backgroundColor: 'var(--bg-interactive)',
              color: 'var(--accent)',
              borderColor: 'var(--border)'
            }}
          >
            {getCardCount()} cards
          </Badge>
        </div>
      </div>
    </div>
  );
});

CollectionMetadataItem.displayName = 'CollectionMetadataItem';

export default CollectionMetadataItem;