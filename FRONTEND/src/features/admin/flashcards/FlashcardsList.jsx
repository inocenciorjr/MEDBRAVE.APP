import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, FileTextIcon, MoreVerticalIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import fetchWithAuth from '../../../services/fetchWithAuth';
import { formatDate, formatTime } from '../../../utils/dateUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// 🚀 NOVO COMPONENTE: Item de metadados da coleção (carregamento lazy)
const CollectionMetadataItem = ({ collection, onLoadCollection, isLoading, isExpanded }) => {
  const formatLastUpdated = (dateString) => {
    if (!dateString) return 'Nunca atualizada';
    return formatDate(dateString) + ' às ' + formatTime(dateString);
  };

  return (
    <div className="flex items-center justify-between p-3 border-b hover:bg-gray-50">
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLoadCollection(collection.name)}
          disabled={isLoading}
          className="p-1 h-6 w-6"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
          ) : isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
        </Button>
        
        <FolderIcon className="h-5 w-5 text-blue-600" />
        
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{collection.name}</h3>
          <p className="text-sm text-gray-500">
            Atualizada: {formatLastUpdated(collection.lastUpdated)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-xs">
          {collection.deckCount} baralhos
        </Badge>
        <Badge variant="outline" className="text-xs bg-blue-50">
          {collection.cardCount} cards
        </Badge>
      </div>
    </div>
  );
};

// 🚀 NOVO COMPONENTE: Item híbrido (metadados ou hierarquia)
const HybridCollectionItem = ({ 
  item, 
  onTogglePublic, 
  onDeleteDeck, 
  onToggleExpand, 
  isExpanded, 
  expandedItems,
  onLoadCollection,
  isLoading 
}) => {
  if (item.isMetadata) {
    // Renderizar como metadados
    return (
      <CollectionMetadataItem
        collection={item.metadata}
        onLoadCollection={onLoadCollection}
        isLoading={isLoading}
        isExpanded={isExpanded}
      />
    );
  } else {
    // Renderizar como hierarquia normal
    return (
      <TreeNode
        node={item}
        level={0}
        onTogglePublic={onTogglePublic}
        onDeleteDeck={onDeleteDeck}
        onToggleExpand={onToggleExpand}
        isExpanded={isExpanded}
        expandedItems={expandedItems}
      />
    );
  }
};

// Componente para um nó da árvore hierárquica
const TreeNode = ({ node, level = 0, onTogglePublic, onDeleteDeck, onToggleExpand, isExpanded, expandedItems }) => {
  const hasChildren = node.children && node.children.length > 0;
  const hasDecks = node.decks && node.decks.length > 0;
  const totalCards = node.totalCards || 0;
  const isCollection = level === 0; // Coleções são nível 0
  const isFolder = hasChildren && !hasDecks; // Pastas têm filhos mas não decks diretos
  const isDeck = !hasChildren && hasDecks; // Baralhos não têm filhos mas têm decks
  const isOnlyDecks = hasDecks && !hasChildren; // Só tem baralhos, sem subpastas
  
  const indentStyle = { paddingLeft: `${level * 20}px` };

  // Para coleções, determinar status baseado nos decks
  let collectionStatus = null;
  if (isCollection && hasDecks) {
    const publicDecks = node.decks.filter(deck => deck.isPublic).length;
    if (publicDecks === node.decks.length) {
      collectionStatus = 'public';
    } else if (publicDecks === 0) {
      collectionStatus = 'private';
    } else {
      collectionStatus = 'mixed';
    }
  }

  const handleToggleCollectionPublic = async (makePublic) => {
    if (node.decks && node.decks.length > 0) {
      try {
        // Assumir que todos os decks da coleção têm a mesma coleção
        const collectionName = node.name;
        
        // Buscar a coleção pelo nome para obter o ID
        const response = await fetch(`http://localhost:5000/api/admin/flashcards/collections/search?name=${encodeURIComponent(collectionName)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const collection = data.data;
          
          if (collection) {
            // Tornar coleção pública/privada
            const toggleResponse = await fetch(`http://localhost:5000/api/admin/flashcards/collections/${collection.id}/public-status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ isPublic: makePublic })
            });
            
            if (toggleResponse.ok) {
              alert(`Coleção "${collectionName}" ${makePublic ? 'publicada' : 'despublicada'} com sucesso!`);
              // Recarregar a página para atualizar os dados
              window.location.reload();
            } else {
              throw new Error('Falha ao alterar status da coleção');
            }
          }
        }
      } catch (error) {
        console.error('Erro ao alterar status da coleção:', error);
        alert('Erro ao alterar status da coleção');
      }
    }
  };

  const handleDeleteCollection = async () => {
    console.log('🗂️ Tentando excluir coleção:', node.name);
    console.log('📊 Estrutura do nó:', node);
    
    // Função recursiva para coletar todos os decks da árvore
    const collectAllDecks = (currentNode) => {
      let allDecks = [];
      
      // Adicionar decks diretos deste nó
      if (currentNode.decks && currentNode.decks.length > 0) {
        allDecks.push(...currentNode.decks);
      }
      
      // Recursivamente coletar decks dos filhos
      if (currentNode.children && currentNode.children.length > 0) {
        currentNode.children.forEach(child => {
          allDecks.push(...collectAllDecks(child));
        });
      }
      
      return allDecks;
    };
    
    const allDecks = collectAllDecks(node);
    console.log('📊 Total de decks encontrados:', allDecks.length);
    console.log('📋 Lista de decks:', allDecks.map(d => ({ id: d.id, name: d.name })));
    
    if (window.confirm(`Tem certeza que deseja excluir a coleção "${node.name}" e todos os seus ${allDecks.length} decks?`)) {
      console.log('✅ Confirmação da coleção aceita');
      
      if (allDecks.length > 0) {
        console.log('🔄 Excluindo', allDecks.length, 'decks da coleção...');
        
        // Exclusão otimizada em lotes grandes
        const batchSize = 50; // Processar 50 decks por vez (muito mais eficiente)
        const batches = [];
        
        // Dividir em lotes
        for (let i = 0; i < allDecks.length; i += batchSize) {
          batches.push(allDecks.slice(i, i + batchSize));
        }
        
        console.log(`📦 Processando ${batches.length} lotes de até ${batchSize} decks cada`);
        
        // Processar todos os lotes
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const deckIds = batch.map(deck => deck.id);
          
          console.log(`🗑️ Excluindo lote ${batchIndex + 1}/${batches.length} (${batch.length} decks)`);
          
          try {
            const result = await onDeleteDeck(deckIds, true); // Chamada em lote
            
            if (result.success) {
              console.log(`✅ Lote ${batchIndex + 1} processado com sucesso:`, result.data?.summary);
            } else {
              console.error(`❌ Erro no lote ${batchIndex + 1}:`, result.error);
            }
          } catch (error) {
            console.error(`❌ Erro no lote ${batchIndex + 1}:`, error);
          }
        }
        
        console.log('🎉 Todos os lotes foram processados!');
      } else {
        console.log('⚠️ Nenhum deck encontrado na coleção para excluir');
      }
    } else {
      console.log('❌ Confirmação da coleção cancelada');
    }
  };

  const handleFolderAction = async (action) => {
    switch (action) {
      case 'delete':
        handleDeleteFolder();
        break;
      case 'rename':
        // TODO: Implementar renomear pasta
        console.log('Renomear pasta:', node.name);
        break;
      case 'new-subfolder':
        // TODO: Implementar nova subpasta
        console.log('Nova subpasta em:', node.name);
        break;
      case 'new-deck':
        // TODO: Implementar novo baralho
        console.log('Novo baralho em:', node.name);
        break;
      case 'review':
        // TODO: Implementar revisar pasta
        console.log('Revisar pasta:', node.name);
        break;
    }
  };

  const handleDeleteFolder = async () => {
    // Coletar todos os decks da pasta e suas subpastas
    const collectAllDecks = (currentNode) => {
      let allDecks = [...(currentNode.decks || [])];
      
      // Recursivamente coletar decks das subpastas
      if (currentNode.children && currentNode.children.length > 0) {
        currentNode.children.forEach(child => {
          allDecks = allDecks.concat(collectAllDecks(child));
        });
      }
      
      return allDecks;
    };

    const allDecks = collectAllDecks(node);
    const deckCount = allDecks.length;
    
    if (deckCount === 0) {
      alert('Esta pasta não contém decks para excluir.');
      return;
    }

    const confirmMessage = `Tem certeza que deseja excluir a pasta "${node.name}"?\n\n` +
      `Isso irá excluir ${deckCount} deck(s):\n` +
      allDecks.map(deck => `• ${deck.name}`).join('\n') +
      '\n\nEsta ação não pode ser desfeita.';

    if (window.confirm(confirmMessage)) {
      try {
        console.log(`Excluindo pasta "${node.name}" com ${deckCount} deck(s)...`);
        
        // Excluir todos os decks em lote otimizado
        const processBatch = async () => {
          const batchSize = 50; // Processar 50 decks por vez
          const batches = [];
          
          // Dividir em lotes
          for (let i = 0; i < allDecks.length; i += batchSize) {
            batches.push(allDecks.slice(i, i + batchSize));
          }
          
          // Processar todos os lotes
          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const deckIds = batch.map(deck => deck.id);
            
            console.log(`Excluindo lote ${batchIndex + 1}/${batches.length} (${batch.length} decks)`);
            
            try {
              const result = await onDeleteDeck(deckIds, true); // Chamada em lote
              
              if (result.success) {
                console.log(`✅ Lote ${batchIndex + 1} processado:`, result.data?.summary);
              } else {
                console.error(`❌ Erro no lote ${batchIndex + 1}:`, result.error);
              }
            } catch (error) {
              console.error(`❌ Erro no lote ${batchIndex + 1}:`, error);
            }
          }
        };

        processBatch().then(() => {
          console.log(`✅ Pasta "${node.name}" excluída com sucesso!`);
        }).catch((error) => {
          console.error('Erro no processBatch:', error);
        });
        
      } catch (error) {
        console.error('Erro ao excluir pasta:', error);
        alert(`Erro ao excluir a pasta "${node.name}". Verifique o console para mais detalhes.`);
      }
    }
  };

  const handleDeckAction = (deck, action) => {
    switch (action) {
      case 'view':
        // Navegar para página de visualização do baralho
        window.location.href = `/admin/flashcards/deck/${deck.id}`;
        break;
      case 'review':
        // Navegar para página de revisão (será implementada depois)
        console.log('Revisar baralho:', deck.name);
        // window.location.href = `/study/deck/${deck.id}`;
        break;
      case 'edit':
        // Navegar para página de edição do baralho
        window.location.href = `/admin/flashcards/deck/${deck.id}/edit`;
        break;
      case 'delete':
        if (window.confirm(`Tem certeza que deseja excluir o baralho "${deck.name}"?\n\nEsta ação irá excluir todos os ${deck.flashcardCount || 0} cards deste baralho e não pode ser desfeita.`)) {
          onDeleteDeck(deck.id);
        }
        break;
    }
  };
  
  return (
    <div className="select-none">
      {/* Se o nó tem apenas baralhos (sem subpastas), renderizar cada baralho como item individual */}
      {isOnlyDecks ? (
        <>
          {node.decks.map(deck => (
            <div key={deck.id} className="flex items-center py-2 px-3 hover:bg-gray-50 border-b border-gray-100" style={indentStyle}>
              <div className="mr-3">
                <FileTextIcon className="w-4 h-4 text-green-500" />
              </div>
              
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span 
                    className="text-sm text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                    onClick={() => handleDeckAction(deck, 'view')}
                    title="Clique para visualizar o baralho"
                  >
                    {deck.name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {deck.flashcardCount || 0} cards
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVerticalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeckAction(deck, 'view')}>
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeckAction(deck, 'review')}>
                        Revisar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeckAction(deck, 'edit')}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeckAction(deck, 'delete')}
                        className="text-red-600"
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {/* Nó atual (coleção, pasta ou baralho) - apenas se não for só baralhos */}
          <div className="flex items-center py-2 px-3 hover:bg-gray-50 border-b border-gray-100" style={indentStyle}>
            {/* Ícone de expansão para nós com filhos */}
            {hasChildren && (
              <button
                onClick={() => onToggleExpand(node.id)}
                className="mr-2 p-1 rounded hover:bg-gray-200 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
            
            {/* Ícone do tipo */}
            <div className="mr-3">
              {isCollection ? (
                <FolderIcon className="w-5 h-5 text-blue-600" />
              ) : isFolder ? (
                <FolderIcon className="w-5 h-5 text-blue-500" />
              ) : (
                <FileTextIcon className="w-5 h-5 text-green-500" />
              )}
            </div>
            
            {/* Nome e informações */}
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-900">{node.name}</span>
                {totalCards > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalCards} cards
                  </Badge>
                )}
                {/* Data de atualização apenas para coleções */}
                {isCollection && node.lastUpdated && node.lastUpdated !== '1970-01-01' && (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    Atualizado: {formatDate(node.lastUpdated)}
                  </Badge>
                )}
              </div>
              
              {/* Ações específicas por tipo */}
              <div className="flex items-center space-x-2">
                {/* Coleções: status e botões de ação */}
                {isCollection && (
                  <>
                    {collectionStatus && (
                      <Badge 
                        variant={collectionStatus === 'public' ? "default" : "secondary"}
                        className={`text-xs ${
                          collectionStatus === 'public' ? 'bg-green-500 text-white' : 
                          collectionStatus === 'mixed' ? 'bg-yellow-500 text-white' : 
                          'bg-gray-500 text-white'
                        }`}
                      >
                        {collectionStatus === 'public' ? 'Público' : 
                         collectionStatus === 'mixed' ? 'Misto' : 'Privado'}
                      </Badge>
                    )}
                    
                    {collectionStatus === 'public' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleCollectionPublic(false)}
                        className="text-xs"
                      >
                        Tornar Privado
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleCollectionPublic(true)}
                        className="text-xs"
                      >
                        Tornar Público
                      </Button>
                    )}
                  
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteCollection}
                      className="text-xs"
                    >
                      Excluir
                    </Button>
                  </>
                )}

                {/* Pastas: menu de 3 pontinhos */}
                {isFolder && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVerticalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleFolderAction('review')}>
                        Revisar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleFolderAction('rename')}>
                        Renomear Pasta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleFolderAction('new-subfolder')}>
                        Nova Subpasta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleFolderAction('new-deck')}>
                        Novo Baralho
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleFolderAction('delete')}
                        className="text-red-600"
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Renderizar baralhos diretos desta pasta/coleção (apenas se não for só baralhos) */}
          {hasDecks && isExpanded && hasChildren && (
            <div style={{ paddingLeft: `${(level + 1) * 20}px` }}>
              {node.decks.map(deck => (
                <div key={deck.id} className="flex items-center py-2 px-3 hover:bg-gray-50 border-b border-gray-100">
                  <div className="mr-3">
                    <FileTextIcon className="w-4 h-4 text-green-500" />
                  </div>
                  
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span 
                        className="text-sm text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => handleDeckAction(deck, 'view')}
                        title="Clique para visualizar o baralho"
                      >
                        {deck.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {deck.flashcardCount || 0} cards
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDeckAction(deck, 'view')}>
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeckAction(deck, 'review')}>
                            Revisar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeckAction(deck, 'edit')}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeckAction(deck, 'delete')}
                            className="text-red-600"
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Renderizar filhos se expandido */}
          {isExpanded && hasChildren && (
            <div>
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  level={level + 1}
                  onTogglePublic={onTogglePublic}
                  onDeleteDeck={onDeleteDeck}
                  onToggleExpand={onToggleExpand}
                  isExpanded={expandedItems.has(child.id)}
                  expandedItems={expandedItems}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Função para construir árvore hierárquica (otimizada)
const buildHierarchyTree = (decks) => {
  if (!decks || decks.length === 0) return [];
  
  const tree = {};
  const collectionMetadata = {}; // Para rastrear datas de atualização das coleções
  
  // Processar decks em lote para melhor performance
  decks.forEach(deck => {
    let currentLevel = tree;
    const hierarchy = deck.hierarchy || deck.hierarchyPath?.split('::') || [deck.collection || 'Sem Coleção', deck.name];
    const collection = hierarchy[0];
    
    // Rastrear a data mais recente de atualização da coleção
    // Converter objetos Firebase Timestamp para string (otimizado)
    const getDateString = (firebaseDate) => {
      if (!firebaseDate) return new Date().toISOString();
      if (typeof firebaseDate === 'string') return firebaseDate;
      if (firebaseDate.toDate) return firebaseDate.toDate().toISOString();
      if (firebaseDate.seconds) return new Date(firebaseDate.seconds * 1000).toISOString();
      return new Date().toISOString();
    };
    
    const deckUpdatedAt = getDateString(deck.updatedAt || deck.createdAt);
    
    if (!collectionMetadata[collection] || deckUpdatedAt > collectionMetadata[collection]) {
      collectionMetadata[collection] = deckUpdatedAt;
    }
    
    // Navegar/criar estrutura hierárquica
    hierarchy.forEach((part, index) => {
      const isLast = index === hierarchy.length - 1;
      
      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          children: {},
          decks: [],
          totalCards: 0,
          lastUpdated: index === 0 ? collectionMetadata[collection] : undefined,
          isExpanded: false // Começar fechado por padrão
        };
      }
      
      // Atualizar data da coleção raiz
      if (index === 0) {
        currentLevel[part].lastUpdated = collectionMetadata[collection];
      }
      
      // Se é o último nível, adicionar o deck
      if (isLast) {
        currentLevel[part].decks.push(deck);
        currentLevel[part].totalCards += deck.flashcardCount || 0;
      } else {
        // Propagar contagem de cards para níveis superiores
        currentLevel[part].totalCards += deck.flashcardCount || 0;
      }
      
      currentLevel = currentLevel[part].children;
    });
  });
  
  // Converter para array e ordenar por data de atualização (coleções primeiro)
  const convertMapToArray = (map) => {
    const entries = Object.entries(map);
    
    // Separar por tipo: coleções (com children) vs decks individuais
    const collections = entries.filter(([_, node]) => Object.keys(node.children).length > 0);
    const decks = entries.filter(([_, node]) => Object.keys(node.children).length === 0);
    
    // Ordenar coleções por data de atualização (mais recente primeiro)
    collections.sort(([, nodeA], [, nodeB]) => {
      const dateA = nodeA.lastUpdated || '1970-01-01';
      const dateB = nodeB.lastUpdated || '1970-01-01';
      return dateB.localeCompare(dateA);
    });
    
    // Ordenar decks alfabeticamente
    decks.sort(([nameA], [nameB]) => nameA.localeCompare(nameB, 'pt', { sensitivity: 'base' }));
    
    // Processar filhos recursivamente
    const result = [...collections, ...decks].map(([name, node]) => ({
      id: name,
      name,
      children: Object.keys(node.children).length > 0 ? convertMapToArray(node.children) : [],
      decks: node.decks || [],
      totalCards: node.totalCards || 0,
      lastUpdated: node.lastUpdated,
      isExpanded: false // Começar fechado por padrão
    }));
    
    return result;
  };

  return convertMapToArray(tree);
};

export const FlashcardsList = ({ 
  decks, 
  onTogglePublic, 
  onDeleteDeck, 
  isLoading, 
  // 🚀 NOVOS PROPS PARA METADADOS
  collectionsMetadata = [], 
  isLoadingMetadata = false, 
  metadataLoaded = false, 
  onLoadCollection 
}) => {
  const [viewMode, setViewMode] = useState('hierarchical'); // 'hierarchical' ou 'grid'
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [loadingCollections, setLoadingCollections] = useState(new Set());
  
  // 🚀 FUNÇÃO PARA CARREGAR DECKS DE UMA COLEÇÃO (LAZY LOADING)
  const handleLoadCollection = async (collectionName) => {
    setLoadingCollections(prev => new Set([...prev, collectionName]));
    
    try {
      await onLoadCollection(collectionName);
      
      // Expandir automaticamente a coleção quando carregada
      setExpandedItems(prev => new Set([...prev, collectionName]));
    } catch (error) {
      console.error('Erro ao carregar coleção:', error);
    } finally {
      setLoadingCollections(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectionName);
        return newSet;
      });
    }
  };

  // 🚀 NOVA FUNÇÃO: Criar interface híbrida (metadados + decks carregados)
  const createHybridView = () => {
    const loadedCollections = new Set();
    const hierarchyTree = buildHierarchyTree(decks);
    
    // Identificar quais coleções já foram carregadas
    hierarchyTree.forEach(collection => {
      loadedCollections.add(collection.name);
    });
    
    // Combinar metadados + hierarquia
    const hybridItems = [];
    
    collectionsMetadata.forEach(metadata => {
      if (loadedCollections.has(metadata.name)) {
        // Coleção carregada: buscar da hierarquia
        const loadedCollection = hierarchyTree.find(h => h.name === metadata.name);
        if (loadedCollection) {
          hybridItems.push(loadedCollection);
        }
      } else {
        // Coleção não carregada: usar metadados
        hybridItems.push({
          id: metadata.name,
          name: metadata.name,
          isMetadata: true, // Flag para identificar
          metadata: metadata,
          children: [],
          decks: [],
          totalCards: metadata.cardCount,
          lastUpdated: metadata.lastUpdated
        });
      }
    });
    
    return hybridItems;
  };
  
  // 🚀 MEMOIZAR INTERFACE HÍBRIDA
  const hybridItems = useMemo(() => {
    if (!metadataLoaded) return [];
    
    if (decks.length === 0) {
      // Só metadados
      return collectionsMetadata.map(metadata => ({
        id: metadata.name,
        name: metadata.name,
        isMetadata: true,
        metadata: metadata,
        children: [],
        decks: [],
        totalCards: metadata.cardCount,
        lastUpdated: metadata.lastUpdated
      }));
    } else {
      // Interface híbrida
      return createHybridView();
    }
  }, [decks, collectionsMetadata, metadataLoaded]);

  // Memoizar hierarquia tradicional para fallback
  const hierarchyTree = useMemo(() => {
    if (!decks || decks.length === 0) return [];
    return buildHierarchyTree(decks);
  }, [decks]);

  // Função para expandir/recolher um item
  const handleToggleExpand = (itemId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  // Função para expandir/recolher todos
  const toggleExpandAll = () => {
    if (expandedItems.size > 0) {
      // Se há itens expandidos, recolher todos
      setExpandedItems(new Set());
    } else {
      // Se não há itens expandidos, expandir todos
      const getAllIds = (items) => {
        const ids = [];
        items.forEach(item => {
          ids.push(item.id);
          if (item.children && item.children.length > 0) {
            ids.push(...getAllIds(item.children));
          }
        });
        return ids;
      };
      setExpandedItems(new Set(getAllIds(hybridItems)));
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold">
            Meus Flashcards {hybridItems.length > 0 && decks.length > 0 && `(${decks.length} decks carregados)`}
          </h2>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'hierarchical' ? 'default' : 'outline'}
            onClick={() => setViewMode('hierarchical')}
            size="sm"
          >
            🌳 Hierárquico
          </Button>
            <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
              size="sm"
            >
            🔲 Grade
          </Button>
          <Button variant="outline" size="sm" onClick={toggleExpandAll}>
            {expandedItems.size > 0 ? 'Recolher Tudo' : 'Expandir Tudo'}
            </Button>
          </div>
      </div>
      
      {/* 🚀 NOVA LÓGICA DE RENDERIZAÇÃO HÍBRIDA */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : !metadataLoaded ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Carregando suas coleções...</p>
        </Card>
      ) : hybridItems.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Você ainda não tem nenhum deck de flashcards.</p>
          <p className="text-sm text-gray-400">Importe um arquivo APKG para começar!</p>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              📂 Suas Coleções ({hybridItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {hybridItems.map((item) => (
                <HybridCollectionItem
                  key={item.id}
                  item={item}
                  onTogglePublic={onTogglePublic}
                  onDeleteDeck={onDeleteDeck}
                  onToggleExpand={handleToggleExpand}
                  isExpanded={expandedItems.has(item.id)}
                  expandedItems={expandedItems}
                  onLoadCollection={handleLoadCollection}
                  isLoading={loadingCollections.has(item.name)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};