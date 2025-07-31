/* eslint-disable no-unused-vars */

/**
 * Utilitários para construção e gerenciamento da hierarquia de flashcards
 * Adaptado para o dashboard do estudante com design system consistente
 */

// Função para construir uma árvore hierárquica a partir de uma lista plana de itens
// Cada item deve ter um 'id', 'parentId' (opcional, para itens raiz), e 'level' (opcional)
export const buildHierarchy = (items) => {
  const map = new Map();
  const tree = [];

  // Primeiro, mapeia todos os itens por ID e inicializa a propriedade 'children'
  items.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  // Em seguida, itera sobre os itens mapeados para construir a hierarquia
  map.forEach(item => {
    if (item.parentId && map.has(item.parentId)) {
      // Se o item tem um parentId e o pai existe no mapa, adiciona como filho
      map.get(item.parentId).children.push(item);
    } else {
      // Se não tem parentId ou o pai não existe (é um item raiz), adiciona à raiz da árvore
      tree.push(item);
    }
  });

  // Opcional: Ordenar os filhos se houver uma propriedade 'order'
  const sortChildren = (nodes) => {
    nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(tree);

  return tree;
};

/**
 * Constrói uma árvore hierárquica a partir de uma lista de decks
 * @param {Array} decks - Lista de decks
 * @returns {Array} Árvore hierárquica
 */
export function buildHierarchyTree(decks) {
  if (!decks || !Array.isArray(decks)) {
    return [];
  }

  const tree = [];
  const collections = new Map();

  // Agrupa decks por coleção
  decks.forEach(deck => {
    const collectionName = deck.collection || 'Sem Coleção';
    
    if (!collections.has(collectionName)) {
      collections.set(collectionName, {
        id: `collection-${collectionName}`,
        name: collectionName,
        type: 'collection',
        children: [],
        deckCount: 0,
        totalCards: 0,
        lastModified: null
      });
    }

    const collection = collections.get(collectionName);
    collection.children.push(deck);
    collection.deckCount++;
    collection.totalCards += deck.cardCount || 0;
    
    // Atualiza data de modificação
    const deckDateValue = deck.lastModified || deck.updatedAt || Date.now();
    const deckDate = new Date(deckDateValue);
    
    // Verifica se a data é válida antes de usar toISOString()
    if (!isNaN(deckDate.getTime())) {
      if (!collection.lastModified || deckDate > new Date(collection.lastModified)) {
        collection.lastModified = deckDate.toISOString();
      }
    }
  });

  // Converte para array e ordena
  const sortedCollections = Array.from(collections.values())
    .sort((a, b) => {
      // Ordena coleções por data de atualização (mais recente primeiro)
      const dateA = new Date(a.lastModified || 0);
      const dateB = new Date(b.lastModified || 0);
      
      // Se alguma data for inválida, trata como 0
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      
      return timeB - timeA;
    });

  // Ordena decks dentro de cada coleção alfabeticamente
  sortedCollections.forEach(collection => {
    collection.children.sort((a, b) => {
      const nameA = (a.name || a.title || '').toLowerCase();
      const nameB = (b.name || b.title || '').toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
    });
  });

  return sortedCollections;
}

/**
 * NOVA FUNÇÃO UNIFICADA: Constrói hierarquia simplificada mantendo funcionalidade completa
 * @param {Array} collectionsMetadata - Metadados das coleções
 * @param {Array} loadedDecks - Decks já carregados (opcional)
 * @returns {Array} Hierarquia unificada
 */
export function buildUnifiedHierarchy(collectionsMetadata, loadedDecks = []) {
  console.log('🏗️ [buildUnifiedHierarchy] Iniciando com:', {
    collectionsMetadata: collectionsMetadata,
    loadedDecks: loadedDecks
  });
  
  if (!collectionsMetadata || !Array.isArray(collectionsMetadata)) {
    return [];
  }

  const unifiedItems = [];
  const loadedDecksMap = new Map();

  // Mapeia decks carregados por coleção para merge posterior
  if (loadedDecks && Array.isArray(loadedDecks)) {
    loadedDecks.forEach(deck => {
      const collectionName = deck.collection || 'Sem Coleção';
      if (!loadedDecksMap.has(collectionName)) {
        loadedDecksMap.set(collectionName, []);
      }
      loadedDecksMap.get(collectionName).push(deck);
    });
  }

  // Processa cada coleção de metadados
  collectionsMetadata.forEach(metadata => {
    const collectionId = metadata.id || metadata.name;
    const loadedDecksForCollection = loadedDecksMap.get(metadata.name) || [];
    
    // Estrutura unificada: sempre inclui metadados corretos
    const unifiedCollection = {
      id: collectionId,
      name: metadata.name,
      description: metadata.description || '',
      type: 'collection',
      
      // Contagens sempre corretas (dos metadados)
      deckCount: metadata.deckCount || 0,
      cardCount: metadata.cardCount || 0,
      
      // Estado de carregamento
      loaded: metadata.loaded || loadedDecksForCollection.length > 0,
      
      // Dados hierárquicos
      hierarchy: null, // Será construído quando carregado
      decks: [], // Vazio se não carregado
      
      // Metadados
      lastModified: metadata.lastModified || metadata.updatedAt,
      isPublic: metadata.isPublic || false,
      isFavorite: metadata.isFavorite || false,
      
      // Estado de UI
      isExpanded: false // Será definido após a criação do objeto
    };

    // Definir isExpanded após a criação do objeto
    unifiedCollection.isExpanded = unifiedCollection.loaded;

    // Se a coleção foi carregada, construir hierarquia
    console.log('🏗️ [buildUnifiedHierarchy] Verificando condições:', {
      loaded: unifiedCollection.loaded,
      decksLength: loadedDecksForCollection.length,
      decks: loadedDecksForCollection
    });
    if (unifiedCollection.loaded) { // Removida a condição loadedDecksForCollection.length > 0
      console.log('🏗️ [buildUnifiedHierarchy] Processando coleção carregada:', metadata.name);
      console.log('🏗️ [buildUnifiedHierarchy] Decks para hierarquia:', loadedDecksForCollection);
      
      // Construir hierarquia
      if (loadedDecksForCollection.length > 0) {
        unifiedCollection.hierarchy = buildCollectionHierarchy(loadedDecksForCollection);
        unifiedCollection.decks = loadedDecksForCollection;
        
        // Calcular contagens totais da coleção
        const totalDeckCount = loadedDecksForCollection.length;
        const totalCardCount = loadedDecksForCollection.reduce((sum, deck) => sum + (deck.cardCount || deck.flashcardCount || 0), 0);
        
        // Atualizar contagens
        unifiedCollection.deckCount = totalDeckCount;
        unifiedCollection.cardCount = totalCardCount;
      } else {
        // Inicializar com valores vazios quando não há decks
        unifiedCollection.hierarchy = [];
        unifiedCollection.decks = [];
        
        // Manter as contagens dos metadados
        console.log('🏗️ [buildUnifiedHierarchy] Coleção sem decks:', metadata.name);
      }
      
      // Exibir contagens
      console.log('🏗️ [buildUnifiedHierarchy] Contagens calculadas:', {
        decks: unifiedCollection.deckCount,
        cards: unifiedCollection.cardCount
      });
      
      // Propagar contagens para a hierarquia
      if (unifiedCollection.hierarchy && unifiedCollection.hierarchy.length > 0) {
        unifiedCollection.hierarchy.forEach(folder => {
          folder.deckCount = folder.decks.length + 
            folder.children.reduce((sum, child) => sum + (child.deckCount || 0), 0);
          
          folder.cardCount = folder.decks.reduce((sum, deck) => sum + (deck.cardCount || deck.flashcardCount || 0), 0) + 
            folder.children.reduce((sum, child) => sum + (child.cardCount || 0), 0);
        });
      }
    }

    unifiedItems.push(unifiedCollection);
  });

  // Ordena por data de atualização (mais recente primeiro)
  unifiedItems.sort((a, b) => {
    const dateA = new Date(a.lastModified || 0);
    const dateB = new Date(b.lastModified || 0);
    const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
    const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
    return timeB - timeA;
  });

  return unifiedItems;
}

/**
 * Constrói hierarquia interna de uma coleção (pastas e decks)
 * @param {Array} decks - Decks da coleção
 * @returns {Array} Hierarquia da coleção
 */
function buildCollectionHierarchy(decks) {
  console.log('🌳 [buildCollectionHierarchy] Construindo hierarquia para', decks.length, 'decks');
  console.log('🌳 [buildCollectionHierarchy] Lista completa de decks:', decks.map(d => ({ id: d.id, name: d.name, collection: d.collection })));
  
  if (!decks || !Array.isArray(decks) || decks.length === 0) {
    return [];
  }

  const hierarchyMap = new Map();

  decks.forEach(deck => {
    console.log('🌳 [buildCollectionHierarchy] Processando deck:', deck.name, 'hierarchy:', deck.hierarchy);
    
    // Interpretar hierarchy que pode ser array ou string
    const rawHierarchy = deck.hierarchy;
    let hierarchyPath = Array.isArray(rawHierarchy)
      ? rawHierarchy
      : typeof rawHierarchy === 'string'
        ? rawHierarchy.split('::')
        : ['Root'];

    console.log('🌳 [buildCollectionHierarchy] hierarchyPath antes:', hierarchyPath);

    // Filtrar o primeiro nível se for igual ao nome da coleção para evitar duplicação
     if (hierarchyPath.length > 1 && hierarchyPath[0] && deck.collection && 
         hierarchyPath[0].toLowerCase().trim() === deck.collection.toLowerCase().trim()) {
       hierarchyPath = hierarchyPath.slice(1);
     }
     
    console.log('🌳 [buildCollectionHierarchy] hierarchyPath depois:', hierarchyPath);

    let currentLevel = hierarchyMap;
    let fullPath = '';

    hierarchyPath.forEach((part, index) => {
      const cleanPart = part?.trim() || 'Sem Nome';
      fullPath = fullPath ? `${fullPath}::${cleanPart}` : cleanPart;
      
      const isLastPart = index === hierarchyPath.length - 1;
      
      if (isLastPart) {
        // É o último nível - adicionar o deck diretamente no nível atual
        // Usar o nome do deck real, não o da hierarquia
        const deckKey = deck.name || cleanPart;
        // PRESERVAR o ID original do deck - não sobrescrever!
        const deckId = deck.id; // Usar sempre o ID original
        
        // Verificar se já existe um deck com o mesmo ID para evitar duplicatas
        let existingDeck = null;
        for (const [key, value] of currentLevel.entries()) {
          if (value.type === 'deck' && value.id === deck.id) {
            existingDeck = key;
            break;
          }
        }
        
        if (!existingDeck) {
          console.log('🌳 [buildCollectionHierarchy] Adicionando deck:', deckKey, 'ID original preservado:', deckId);
          currentLevel.set(deckKey, {
            ...deck,
            // NÃO sobrescrever o ID - manter o original
            name: deck.name || cleanPart,
            fullPath: fullPath,
            type: 'deck',
            hierarchy: hierarchyPath,
            children: new Map(),
            decks: [],
            level: index,
            isExpanded: false
          });
        } else {
          console.log('🌳 [buildCollectionHierarchy] Deck duplicado detectado e ignorado:', deckKey, 'ID:', deck.id);
        }
      } else {
        // É um nível intermediário - criar pasta se não existir
        if (!currentLevel.has(cleanPart)) {
          currentLevel.set(cleanPart, {
            id: fullPath,
            name: cleanPart,
            fullPath: fullPath,
            type: 'folder',
            children: new Map(),
            decks: [],
            level: index,
            isExpanded: true // Expandir nós da hierarquia por padrão
          });
        }
        
        // Navegar para o próximo nível
        currentLevel = currentLevel.get(cleanPart).children;
      }
    });
  });

  // Converter Maps para arrays recursivamente e calcular contagens
  const convertMapToArray = (map) => {
    const items = Array.from(map.values());
    
    return items.map(item => {
      if (item.type === 'deck') {
        // É um deck - retornar diretamente com as informações corretas
        return {
          ...item,
          children: [],
          decks: [],
          deckCount: 1,
          cardCount: item.cardCount || item.flashcardCount || 0,
          totalCards: item.cardCount || item.flashcardCount || 0
        };
      } else {
        // É uma pasta - converter filhos recursivamente
        const children = item.children.size > 0 ? convertMapToArray(item.children) : [];
        
        // Separar decks e pastas dos filhos
        const childDecks = children.filter(child => child.type === 'deck');
        const childFolders = children.filter(child => child.type === 'folder');
        
        // Calcular contagens
        const deckCount = childDecks.length + childFolders.reduce((sum, child) => sum + (child.deckCount || 0), 0);
        const cardCount = childDecks.reduce((sum, deck) => sum + (deck.cardCount || deck.flashcardCount || 0), 0) + 
                         childFolders.reduce((sum, child) => sum + (child.cardCount || child.totalCards || 0), 0);
        const totalCards = cardCount;
        
        return {
          ...item,
          children,
          decks: childDecks, // Manter decks separados para compatibilidade
          deckCount,
          cardCount,
          totalCards
        };
      }
    }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  };

  const result = convertMapToArray(hierarchyMap);
  console.log('🌳 [buildCollectionHierarchy] Hierarquia final:', result);
  return result;
}

/**
 * MANTIDA PARA COMPATIBILIDADE: Cria visualização híbrida (DEPRECATED)
 * @deprecated Use buildUnifiedHierarchy instead
 */
export function createHybridView(collectionsMetadata, loadedDecks, loadedCollections) {
  console.warn('createHybridView is deprecated. Use buildUnifiedHierarchy instead.');
  return buildUnifiedHierarchy(collectionsMetadata, loadedDecks);
}

/**
 * Calcula estatísticas da hierarquia
 * @param {Array} items - Itens da hierarquia
 * @returns {Object} Estatísticas calculadas
 */
export function calculateHierarchyStats(items) {
  if (!items || !Array.isArray(items)) {
    return {
      totalCollections: 0,
      totalDecks: 0,
      totalCards: 0,
      totalDueCards: 0,
      publicDecks: 0,
      privateDecks: 0
    };
  }

  let totalCollections = 0;
  let totalDecks = 0;
  let totalCards = 0;
  let totalDueCards = 0;
  let publicDecks = 0;
  let privateDecks = 0;

  items.forEach(item => {
    if (item.type === 'collection') {
      totalCollections++;
      
      if (item.children && Array.isArray(item.children)) {
        item.children.forEach(deck => {
          totalDecks++;
          totalCards += deck.cardCount || 0;
          totalDueCards += deck.dueCards || 0;
          
          if (deck.isPublic) {
            publicDecks++;
          } else {
            privateDecks++;
          }
        });
      }
    } else {
      // Item individual (deck)
      totalDecks++;
      totalCards += item.cardCount || 0;
      totalDueCards += item.dueCards || 0;
      
      if (item.isPublic) {
        publicDecks++;
      } else {
        privateDecks++;
      }
    }
  });

  return {
    totalCollections,
    totalDecks,
    totalCards,
    totalDueCards,
    publicDecks,
    privateDecks
  };
}

/**
 * Expande/recolhe todos os itens da hierarquia
 * @param {Array} items - Itens da hierarquia
 * @param {boolean} expand - Se deve expandir (true) ou recolher (false)
 * @returns {Set} Set com IDs dos itens expandidos
 */
export function toggleExpandAll(items, expand) {
  const expandedItems = new Set();
  
  if (!expand) {
    return expandedItems;
  }

  function addToExpanded(itemList) {
    itemList.forEach(item => {
      if (item.type === 'collection' && item.children && item.children.length > 0) {
        expandedItems.add(item.id || item.name);
        addToExpanded(item.children);
      }
    });
  }

  addToExpanded(items);
  return expandedItems;
}


