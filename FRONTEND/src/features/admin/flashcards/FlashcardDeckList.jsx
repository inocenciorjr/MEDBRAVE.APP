import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/alert';
import { FlashcardImporter } from './FlashcardImporter';
import fetchWithAuth from '../../../services/fetchWithAuth';
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, FileTextIcon } from '@heroicons/react/24/outline';

// URL base da API
const API_URL = 'http://localhost:5000/api';

// Componente para mostrar um item da árvore hierárquica
const TreeItem = ({ item, level = 0, expandedItems, onToggleExpand }) => {
  const isExpanded = expandedItems.has(item.id);
  const hasChildren = item.children && item.children.length > 0;
  const isDeck = item.type === 'deck';
  
  const indentStyle = { paddingLeft: `${level * 20}px` };
  
  return (
    <>
      <div 
        className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer ${
          isDeck ? 'bg-white border border-gray-200' : ''
        }`}
        style={indentStyle}
        onClick={() => hasChildren && onToggleExpand(item.id)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 mr-2 text-gray-500" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 mr-2 text-gray-500" />
          )
        ) : (
          <div className="w-6 mr-2" />
        )}
        
        {isDeck ? (
          <FileTextIcon className="w-4 h-4 mr-2 text-blue-500" />
        ) : (
          <FolderIcon className="w-4 h-4 mr-2 text-yellow-600" />
        )}
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className={`${isDeck ? 'font-medium' : 'font-semibold'} text-sm`}>
              {item.name}
            </span>
            {isDeck && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {item.flashcardCount} cards
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="text-xs px-2 py-1">
                    Ver
                  </Button>
                  <Button size="sm" className="text-xs px-2 py-1">
                    Estudar
                  </Button>
                </div>
              </div>
            )}
          </div>
          {isDeck && item.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              {item.description}
            </p>
          )}
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {item.children.map(child => (
            <TreeItem
              key={child.id}
              item={child}
              level={level + 1}
              expandedItems={expandedItems}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </>
  );
};

// Função para construir árvore hierárquica
const buildHierarchyTree = (decks) => {
  const collections = new Map();
  
  // Agrupar por coleção
  decks.forEach(deck => {
    const collection = deck.collection || 'Sem Coleção';
    
    if (!collections.has(collection)) {
      collections.set(collection, []);
    }
    collections.get(collection).push(deck);
  });
  
  // Construir árvore para cada coleção
  const tree = [];
  
  for (const [collectionName, collectionDecks] of collections) {
    const collectionNode = {
      id: `collection-${collectionName}`,
      name: collectionName,
      type: 'collection',
      children: []
    };
    
    // Mapa para construir hierarquia
    const hierarchyMap = new Map();
    
    collectionDecks.forEach(deck => {
      if (deck.hierarchy && Array.isArray(deck.hierarchy) && deck.hierarchy.length > 1) {
        // Deck com hierarquia - criar estrutura aninhada
        let currentLevel = hierarchyMap;
        
        // Percorrer cada nível da hierarquia (exceto o último que é o deck)
        for (let i = 1; i < deck.hierarchy.length - 1; i++) {
          const levelName = deck.hierarchy[i];
          const levelId = `${collectionName}-${deck.hierarchy.slice(0, i + 1).join('-')}`;
          
          if (!currentLevel.has(levelName)) {
            currentLevel.set(levelName, {
              id: levelId,
              name: levelName,
              type: 'folder',
              children: [],
              childrenMap: new Map()
            });
          }
          
          currentLevel = currentLevel.get(levelName).childrenMap;
        }
        
        // Adicionar o deck final
        const deckNode = {
          id: deck.id,
          name: deck.hierarchy[deck.hierarchy.length - 1],
          type: 'deck',
          flashcardCount: deck.flashcardCount,
          description: deck.description,
          fullDeck: deck
        };
        
        currentLevel.set(deck.id, deckNode);
      } else {
        // Deck sem hierarquia - adicionar diretamente à coleção
        const deckNode = {
          id: deck.id,
          name: deck.name,
          type: 'deck',
          flashcardCount: deck.flashcardCount,
          description: deck.description,
          fullDeck: deck
        };
        
        hierarchyMap.set(deck.id, deckNode);
      }
    });
    
    // Converter mapa para array de filhos
    const convertMapToArray = (map) => {
      const result = [];
      for (const [key, value] of map) {
        if (value.childrenMap) {
          value.children = convertMapToArray(value.childrenMap);
          delete value.childrenMap;
        }
        result.push(value);
      }
      return result.sort((a, b) => {
        // Pastas primeiro, depois decks
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
    };
    
    collectionNode.children = convertMapToArray(hierarchyMap);
    tree.push(collectionNode);
  }
  
  return tree.sort((a, b) => a.name.localeCompare(b.name));
};

export const FlashcardDeckList = () => {
  const [decks, setDecks] = useState([]);
  const [hierarchyTree, setHierarchyTree] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy' ou 'grid'

  const fetchDecks = async () => {
    try {
      setLoading(true);
      
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/decks`);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Corrigir acesso aos decks - API retorna data.data, não data.decks
        const decksArray = data.data || [];
        setDecks(decksArray);
        
        // Construir árvore hierárquica
        const tree = buildHierarchyTree(decksArray);
        setHierarchyTree(tree);
        
        // Expandir coleções por padrão
        const defaultExpanded = new Set(tree.map(collection => collection.id));
        setExpandedItems(defaultExpanded);
      } else {
        throw new Error(data.message || 'Erro ao carregar decks');
      }
    } catch (err) {
      setError(`Erro ao carregar decks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Efeito para carregar decks quando o componente montar
  useEffect(() => {
    fetchDecks();
  }, []);

  // ✅ POLLING OTIMIZADO - Reduzir frequência e implementar backoff
  useEffect(() => {
    let pollingInterval = null;
    let pollCount = 0;
    
    if (isImporting) {
      console.log('🔄 [FlashcardDeckList] Iniciando polling otimizado para importação');
      
      // Estratégia de polling com backoff exponencial
      const startPolling = () => {
        // Primeira verificação imediata
        fetchDecks();
        pollCount++;
        
        pollingInterval = setInterval(() => {
          fetchDecks();
          pollCount++;
          
          // Aumentar intervalo progressivamente para reduzir carga
          if (pollCount > 5) {
            clearInterval(pollingInterval);
            // Após 5 tentativas, verificar apenas a cada 30 segundos
            pollingInterval = setInterval(() => {
              fetchDecks();
            }, 30000); // 30 segundos
          }
        }, 10000); // Começar com 10 segundos (em vez de 5)
      };
      
      startPolling();
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log('🛑 [FlashcardDeckList] Polling interrompido');
      }
    };
  }, [isImporting]);

  const handleImportStart = () => {
    setIsImporting(true);
  };

  const handleImportSuccess = (newDecks) => {
    setIsImporting(false);
    fetchDecks(); // Atualizar a lista de decks
  };
  
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
  
  const handleExpandAll = () => {
    const getAllIds = (items) => {
      const ids = [];
      items.forEach(item => {
        ids.push(item.id);
        if (item.children) {
          ids.push(...getAllIds(item.children));
        }
      });
      return ids;
    };
    
    setExpandedItems(new Set(getAllIds(hierarchyTree)));
  };
  
  const handleCollapseAll = () => {
    // Manter apenas coleções expandidas
    setExpandedItems(new Set(hierarchyTree.map(collection => collection.id)));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'hierarchy' ? 'default' : 'outline'}
            onClick={() => setViewMode('hierarchy')}
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
          <Button onClick={() => setShowImporter(!showImporter)}>
            {showImporter ? 'Fechar Importador' : 'Importar Deck'}
          </Button>
        </div>
      </div>

      {showImporter && (
        <div className="mb-8">
          <FlashcardImporter 
            onImportSuccess={handleImportSuccess}
            onImportStart={handleImportStart}
          />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Meus Decks {decks.length > 0 && `(${decks.length})`}
          </h2>
          
          {viewMode === 'hierarchy' && hierarchyTree.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExpandAll}>
                Expandir Tudo
              </Button>
              <Button variant="outline" size="sm" onClick={handleCollapseAll}>
                Recolher Tudo
              </Button>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : decks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500 mb-4">Você ainda não tem nenhum deck de flashcards.</p>
            {!showImporter && (
              <Button onClick={() => setShowImporter(true)}>
                Importar seu primeiro deck
              </Button>
            )}
          </Card>
        ) : viewMode === 'hierarchy' ? (
          // Vista hierárquica
          <Card className="p-4">
            <div className="space-y-1">
              {hierarchyTree.map(collection => (
                <TreeItem
                  key={collection.id}
                  item={collection}
                  level={0}
                  expandedItems={expandedItems}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </div>
          </Card>
        ) : (
          // Vista em grade
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map(deck => (
              <Card key={deck.id} className="p-4 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{deck.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {deck.flashcardCount} flashcards
                  </p>
                  {deck.collection && (
                    <p className="text-xs text-blue-600 mb-2">
                      📂 {deck.collection}
                    </p>
                  )}
                  <p className="text-sm mb-4 line-clamp-2">
                    {deck.description || 'Sem descrição'}
                  </p>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button variant="outline" size="sm" className="flex-1">
                    Visualizar
                  </Button>
                  <Button size="sm" className="flex-1">
                    Estudar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};