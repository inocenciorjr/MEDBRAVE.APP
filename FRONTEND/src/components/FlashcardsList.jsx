import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Folder, FileText, Eye, Heart, Play, Trash2, MoreVertical, AlertTriangle, RefreshCw, BookOpen, Clock, TrendingUp, ChevronRight, AlertCircle } from 'lucide-react';
import { CustomHeartIcon } from './CustomIcons';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import TreeNode from './TreeNode';
import CollectionMetadataItem from './CollectionMetadataItem';
import { flashcardService } from '../services/flashcardService';
import { buildUnifiedHierarchy } from '../utils/hierarchyUtils';
import { useAuth } from '../contexts/AuthContext';


// Função removida - agora usando buildUnifiedHierarchy do hierarchyUtils


const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="dashboard-card">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-16 rounded-full animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
              <div className="h-5 w-20 rounded-full animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
            </div>
            <div className="h-6 w-3/4 rounded animate-pulse mb-2" style={{backgroundColor: 'var(--bg-interactive)'}} />
            <div className="h-4 w-full rounded animate-pulse mb-3" style={{backgroundColor: 'var(--bg-interactive)'}} />
            <div className="flex items-center gap-4">
              <div className="h-4 w-16 rounded animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
              <div className="h-4 w-20 rounded animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
              <div className="h-4 w-18 rounded animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-8 w-8 rounded-full animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
            <div className="h-8 w-8 rounded-full animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
            <div className="h-8 w-8 rounded-full animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
          </div>
        </div>
      </div>
    ))}
  </div>
);


const ErrorState = ({ error, onRefresh }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4" style={{color: 'var(--error)'}}>
      <AlertTriangle className="w-12 h-12 mx-auto" />
    </div>
    <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
      Erro ao carregar flashcards
    </h3>
    <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
      {error || 'Ocorreu um erro inesperado. Tente novamente.'}
    </p>
    <Button
      onClick={onRefresh}
      className="flex items-center gap-2"
      variant="outline"
    >
      <RefreshCw className="w-4 h-4" />
      Tentar Novamente
    </Button>
  </div>
);


const EmptyState = () => (
  <div className="dashboard-card">
    <div className="text-center py-12">
      <div className="rounded-lg p-6" style={{
        backgroundColor: 'var(--bg-interactive)',
        border: '1px solid var(--border)'
      }}>
        <FileText className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--accent)'}} />
        <h3 className="text-lg font-medium mb-2" style={{color: 'var(--text-primary)'}}>
          Nenhum flashcard encontrado
        </h3>
        <p style={{color: 'var(--text-secondary)'}}>
          Crie seu primeiro deck ou importe flashcards para começar!
        </p>
      </div>
    </div>
  </div>
);


const FlashcardsListNew = ({ 
  decks = [],
  onTogglePublic,
  onDeleteDeck,
  loading = false,
  error = null,
  onRefresh,
  collectionsMetadata = [],
  isLoadingMetadata = false,
  metadataLoaded = false,
  onLoadCollection,
  onToggleFavorite,
  onDeckClick,
  onStartStudy,
  showActions = true,
  emptyMessage,
  onError,
  title = 'Flashcards'
}) => {
    const { user } = useAuth();
    const [expandedItems, setExpandedItems] = useState(new Set());
    const [loadingCollections, setLoadingCollections] = useState(new Set());

  // 🚀 NOVA FUNÇÃO: Carregar coleção específica
  const handleLoadCollection = useCallback(async (collectionName) => {
    if (loadingCollections.has(collectionName)) {
      return; // Já está carregando
    }

    try {
      setLoadingCollections(prev => new Set([...prev, collectionName]));
      
      console.log('🔄 [handleLoadCollection] Carregando coleção:', collectionName);
      
      // Chamar serviço para carregar decks da coleção
      if (onLoadCollection) {
        await onLoadCollection(collectionName);
      }
      
      // Expandir apenas o primeiro nível (nó raiz da coleção)
      setExpandedItems(prev => new Set([...prev, collectionName]));
      
    } catch (error) {
      console.error('❌ [handleLoadCollection] Erro ao carregar coleção:', error);
    } finally {
      setLoadingCollections(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectionName);
        return newSet;
      });
    }
  }, [loadingCollections, onLoadCollection]);


  // 🚀 NOVA FUNÇÃO UNIFICADA: Criar visualização simplificada
  const createUnifiedView = useCallback(() => {
    console.log('🎨 [createUnifiedView] collectionsMetadata:', collectionsMetadata);
    
    // Extrair todos os decks carregados
    const allLoadedDecks = collectionsMetadata
      .filter(c => c.loaded && c.decks)
      .flatMap(c => c.decks || []);
    
    console.log('🎨 [createUnifiedView] allLoadedDecks:', allLoadedDecks);
    
    // Usar função unificada
    const unifiedItems = buildUnifiedHierarchy(collectionsMetadata, allLoadedDecks);
    
    console.log('🎨 [createUnifiedView] unifiedItems:', unifiedItems);
    
    // Adicionar estado de expansão local
    return unifiedItems.map(collection => ({
      ...collection,
      isExpanded: expandedItems.has(collection.id || collection.name),
      
      // Processar hierarquia interna se carregada
      hierarchy: collection.hierarchy ? 
        addExpansionStateToHierarchy(collection.hierarchy, expandedItems) : null
    }));
  }, [collectionsMetadata, expandedItems]);
  
  // Função auxiliar para adicionar estado de expansão à hierarquia
  const addExpansionStateToHierarchy = useCallback((hierarchy, expandedSet) => {
    return hierarchy.map(item => ({
      ...item,
      isExpanded: expandedSet.has(item.id || item.fullPath || item.name),
      children: item.children ? 
        addExpansionStateToHierarchy(item.children, expandedSet) : []
    }));
  }, []);


  // 🚀 FUNÇÃO SIMPLIFICADA: Carregar dados da coleção
  const loadCollectionData = useCallback(async (collectionName) => {
    if (loadingCollections.has(collectionName)) {
      return; // Já está carregando
    }

    try {
      setLoadingCollections(prev => new Set(prev).add(collectionName));
      
      console.log('🔄 [loadCollectionData] Carregando coleção:', collectionName);
      
      // Delegar para o componente pai (MeusFlashcards)
      if (onLoadCollection) {
        await onLoadCollection(collectionName);
      }
      
      // Auto-expandir após carregar
      setExpandedItems(prev => new Set(prev).add(collectionName));
      
    } catch (error) {
      console.error('❌ [loadCollectionData] Erro ao carregar coleção:', error);
      onError?.(`Erro ao carregar coleção: ${error.message}`);
    } finally {
      setLoadingCollections(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectionName);
        return newSet;
      });
    }
  }, [loadingCollections, onLoadCollection, onError]);


  // 🚀 FUNÇÃO SIMPLIFICADA: Lidar com cliques em itens (apenas navegação para decks)
  const handleItemClick = useCallback(async (item, event) => {
    event?.stopPropagation();
    
    // Se é deck individual, navegar para edição
    if (item.type === 'deck') {
      console.log('🎯 [handleItemClick] Navegando para deck:', item.name);
      onDeckClick?.(item);
    }
  }, [onDeckClick]);

  // 🚀 FUNÇÃO SIMPLIFICADA: Toggle expansão de item (baseada no admin)
  const handleToggleExpand = useCallback((itemId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // 🚀 FUNÇÃO SIMPLIFICADA: Expandir/recolher todos (baseada no admin)
  const toggleExpandAll = useCallback(() => {
    if (expandedItems.size > 0) {
      setExpandedItems(new Set());
    } else {
      const getAllIds = (items) => {
        const ids = [];
        items.forEach(item => {
          const itemId = item.id || item.fullPath || item.name;
          ids.push(itemId);
          
          // Adicionar IDs da hierarquia interna se existir
          if (item.hierarchy) {
            const getHierarchyIds = (hierarchy) => {
              hierarchy.forEach(child => {
                const childId = child.id || child.fullPath || child.name;
                ids.push(childId);
                if (child.children) {
                  getHierarchyIds(child.children);
                }
              });
            };
            getHierarchyIds(item.hierarchy);
          }
        });
        return ids;
      };
      
      setExpandedItems(new Set(getAllIds(createUnifiedView())));
    }
  }, [expandedItems.size, createUnifiedView]);


  const renderTreeItem = useCallback((item, level) => {
    if (!item) return null;

    const itemId = item.id || item.fullPath || item.name;
    const isExpanded = expandedItems.has(itemId);
    const isLoading = loadingCollections.has(itemId);

    // 🚀 RENDERIZAR COLEÇÃO (carregada ou não)
    if (item.type === 'collection') {
      // Se não está carregada, usar CollectionMetadataItem
      if (!item.loaded) {
        return (
          <CollectionMetadataItem
            key={itemId}
            collection={item}
            onLoadCollection={loadCollectionData}
            isLoading={isLoading}
          />
        );
      }
      
      // Se está carregada, renderizar coleção completa
      return (
        <div key={itemId} className="space-y-2">
          <div 
            className="dashboard-card group cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand(itemId);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>
                      {item.name}
                    </h3>
                    {item.isPublic && (
                      <Badge variant="secondary" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        Público
                      </Badge>
                    )}
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{
                        borderColor: 'var(--accent)',
                        borderTopColor: 'transparent'
                      }} />
                    )}
                  </div>
                  
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    {item.description || 'Sem descrição'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                    <span>{item.deckCount || 0} decks</span>
                    <span>{item.cardCount || 0} cards</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" style={{color: 'var(--text-muted)'}} />
                ) : (
                  <ChevronRight className="w-5 h-5" style={{color: 'var(--text-muted)'}} />
                )}
              </div>
            </div>
          </div>
          
          {/* Renderizar hierarquia se expandido */}
          {isExpanded && item.hierarchy && (
            <div className="ml-4 space-y-1">
              {item.hierarchy.map(child => renderTreeItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // 🚀 RENDERIZAR PASTA OU DECK (usando TreeNode)
    return (
      <TreeNode
        key={itemId}
        item={item}
        level={level}
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
        onItemClick={handleItemClick}
        onDeckClick={onDeckClick}
        onStartStudy={onStartStudy}
        onToggleFavorite={onToggleFavorite}
        onDeleteDeck={onDeleteDeck}
        showActions={showActions}
        expandedItems={expandedItems}
      />
    );
  }, [expandedItems, loadingCollections, handleItemClick, onDeckClick, onToggleFavorite, onDeleteDeck, showActions, onStartStudy]);

  // ✅ NAVEGAR PARA DECK (edição de cards)
  const handleDeckClick = useCallback((deck) => {
    if (onDeckClick) onDeckClick(deck);
  }, [onDeckClick]);

  // Indica carregamento inicial de metadados (antes de ter qualquer dado carregado)
  const isInitialLoading = isLoadingMetadata && !metadataLoaded;



  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
            {title}
          </h2>
          
          {isInitialLoading && (
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{
              borderColor: 'var(--accent)',
              borderTopColor: 'transparent'
            }} />
          )}
          
          {!isInitialLoading && (
            <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
              {createUnifiedView().length} item{createUnifiedView().length !== 1 ? 'ns' : ''}
            </span>
          )}
          
          {/* Botão expandir/recolher todos */}
          {createUnifiedView().length > 0 && (
              <Button
                variant="ghost"
                size="sm"
              onClick={toggleExpandAll}
              className="text-xs"
            >
              {expandedItems.size === 0 ? (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Expandir Todos
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Recolher Todos
                </>
              )}
              </Button>
          )}
        </div>

        {/* Ações do header */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isInitialLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isInitialLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        )}
      </div>


      <div className="space-y-3">
        {/* Loading inicial para metadados */}
        {isInitialLoading && (
          <div className="dashboard-card">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{
                  borderColor: 'var(--accent)',
                  borderTopColor: 'transparent'
                }} />
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Carregando flashcards...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Erro com opção de recarregar */}
        {error && (
          <div className="dashboard-card border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Se não houver coleções após carregar metadados */}
        {!isInitialLoading && !error && createUnifiedView().length === 0 && (
          <EmptyState />
        )}

        {/* Árvores de coleções/decks */}
        {!isInitialLoading && !error && createUnifiedView().length > 0 && (
          <div className="space-y-2">
            {createUnifiedView().map(item => renderTreeItem(item, 0))}
          </div>
        )}
      </div>
    </div>
  );
};



export default FlashcardsListNew;