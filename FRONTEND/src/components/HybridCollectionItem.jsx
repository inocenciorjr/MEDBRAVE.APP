import React, { memo } from 'react';
import CollectionMetadataItem from './CollectionMetadataItem';
import TreeNode from './TreeNode';

/**
 * ✅ COMPONENTE: Item híbrido (metadados ou hierarquia)
 * Baseado na implementação do admin mas adaptado para o dashboard
 */
const HybridCollectionItem = memo(({ 
  item, 
  onTogglePublic, 
  onDeleteDeck, 
  onToggleExpand, 
  isExpanded, 
  expandedItems,
  onLoadCollection,
  isLoading,
  onToggleFavorite,
  onStartStudy,
  onItemClick,
  level = 0
}) => {
  // Verificar se é um item de metadados (não carregado ainda)
  if (item.isMetadata) {
    return (
      <CollectionMetadataItem
        collection={item.metadata}
        onLoadCollection={onLoadCollection}
        isLoading={isLoading}
        isExpanded={isExpanded}
      />
    );
  } else {
    // Renderizar como TreeNode normal (deck carregado)
    const hasChildren = (item.children && item.children.length > 0) || (item.decks && item.decks.length > 0);
    return (
      <TreeNode
        item={item}
        level={level}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onItemClick={onItemClick}
        onTogglePublic={onTogglePublic}
        onDeleteDeck={onDeleteDeck}
        onToggleFavorite={onToggleFavorite}
        onStartStudy={onStartStudy}
        expandedItems={expandedItems}
        hasChildren={hasChildren}
      />
    );
  }
});

HybridCollectionItem.displayName = 'HybridCollectionItem';

export default HybridCollectionItem;