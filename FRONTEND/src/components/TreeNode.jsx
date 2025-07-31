import React, { memo } from 'react';
import { ChevronDown, ChevronRight, Folder, FileText, Eye, EyeOff, Heart, Play, MoreVertical, Edit, Copy, Trash2, Settings, BookOpen, Clock, TrendingUp } from 'lucide-react';
import { CustomHeartIcon } from './CustomIcons';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';


const TreeNode = memo(({ 
  item, 
  level = 0, 
  isExpanded, 
  onToggleExpand, 
  onItemClick,
  onToggleFavorite,
  onTogglePublic,
  onStartStudy,
  children,
  hasChildren,
  expandedItems
}) => {
  // Definir ícone de pasta para metadados, coleções, pastas e containers de deck
  const isFolderNode = item.isMetadata || item.type === 'collection' || item.type === 'folder' || item.type === 'deck-container';
  const canExpand = hasChildren || (children && children.length > 0) || (item.children && item.children.length > 0) || (item.decks && item.decks.length > 0);
  const indentLevel = level * 20;

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    if (canExpand && onToggleExpand) {
      onToggleExpand(item.id || item.name);
    }
  };

  const handleItemClick = (e) => {
    e.stopPropagation();
    // Apenas navegar para decks, não expandir
    if (!canExpand && onItemClick) {
      onItemClick(item);
    }
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (onToggleFavorite && !isFolderNode) {
      onToggleFavorite(item);
    }
  };

  const handleTogglePublic = (e) => {
    e.stopPropagation();
    if (onTogglePublic && !isFolderNode) {
      onTogglePublic(item);
    }
  };

  const handleStartStudy = (e) => {
    e.stopPropagation();
    if (onStartStudy && !isFolderNode) {
      onStartStudy(item);
    }
  };

  return (
    <div className="tree-node">
      <div 
        className="tree-node-content dashboard-card mb-2 cursor-pointer transition-colors duration-200 hover:shadow-md"
        style={{ marginLeft: `${indentLevel}px` }}
        onClick={handleItemClick}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center flex-1">
            {/* Botão de expansão */}
            <button
              className="tree-expand-button"
              onClick={handleToggleExpand}
              disabled={!canExpand}
            >
              {canExpand ? (
                isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4" /> // Espaçamento para alinhamento
              )}
            </button>

            {/* Ícone do tipo */}
            <div className="mr-3">
              {isFolderNode ? (
                <Folder className="w-5 h-5" style={{color: 'var(--accent)'}} />
              ) : (
                <FileText className="w-5 h-5" style={{color: 'var(--accent)'}} />
              )}
            </div>

            {/* Conteúdo principal */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                  {item.name || item.title}
                </h3>
                
                {/* Tags e badges para decks */}
                {!isFolderNode && (
                  <>
                    {item.tags?.[0] && (
                      <Badge variant="outline" className="text-xs">
                        {item.tags[0]}
                      </Badge>
                    )}
                    {/* Badge público/privado apenas para coleções */}
                    {(item.type === 'collection' || item.isMetadata) && (
                      <Badge variant={item.isPublic || item.metadata?.isPublic ? "success" : "secondary"} className="text-xs">
                        {item.isPublic || item.metadata?.isPublic ? 'Público' : 'Privado'}
                      </Badge>
                    )}
                    {item.dueCards > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {item.dueCards} para revisar
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {/* Descrição */}
              {item.description && (
                <p className="text-xs mb-2" style={{color: 'var(--text-secondary)'}}>
                  {item.description.substring(0, 80)}...
                </p>
              )}

              {/* Estatísticas */}
              <div className="flex items-center gap-3 text-xs" style={{color: 'var(--text-muted)'}}>
                {isFolderNode ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Folder className="w-3 h-3" />
                      {item.deckCount || 0} decks
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {item.totalCards || 0} cards
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {item.cardCount || 0} cards
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.lastReviewed || 'Nunca'}
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {item.dueCards || 0} devidas
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Botões de ação (apenas para decks) */}
          {!isFolderNode && (
            <div className="flex items-center gap-1 ml-2">
              {/* Botão Estudar */}
              {(item.dueCards > 0 || item.cardCount > 0) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-full"
                  onClick={handleStartStudy}
                  title="Iniciar sessão de estudo"
                >
                  <Play className="w-3 h-3" style={{color: 'var(--accent)'}} />
                </Button>
              )}
              
              {/* Botão Favoritar */}
              <Button
                variant={item.isFavorite ? "destructive" : "ghost"}
                size="icon"
                className="w-7 h-7 rounded-full"
                onClick={handleToggleFavorite}
                title={item.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <CustomHeartIcon className={`w-3 h-3 ${item.isFavorite ? 'fill-current' : ''}`} />
              </Button>
              
              {/* Botão Visibilidade */}
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full"
                onClick={handleTogglePublic}
                title={item.isPublic ? 'Tornar privado' : 'Tornar público'}
              >
                {item.isPublic ? (
                  <Eye className="w-3 h-3" style={{color: 'var(--accent)'}} />
                ) : (
                  <EyeOff className="w-3 h-3" style={{color: 'var(--text-muted)'}} />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filhos (renderizados quando expandido) */}
      {canExpand && isExpanded && (
        <div className="tree-children">
          {/* Renderizar filhos (pastas e decks) */}
          {item.children && item.children.map(child => (
            <TreeNode
              key={child.id || child.name}
              item={child}
              level={level + 1}
              isExpanded={expandedItems ? expandedItems.has(child.id || child.name) : false}
              onToggleExpand={onToggleExpand}
              onToggleFavorite={onToggleFavorite}
              onTogglePublic={onTogglePublic}
              onStartStudy={onStartStudy}
              onItemClick={onItemClick}
              hasChildren={child.children?.length > 0 || child.decks?.length > 0}
              expandedItems={expandedItems}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNode.displayName = 'TreeNode';

export default TreeNode;