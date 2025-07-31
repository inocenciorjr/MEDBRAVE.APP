import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Badge } from '../../../components/ui/badge';
import { Alert } from '../../../components/ui/alert';
import { useAuth } from '../../../contexts/AuthContext';
import { FlashcardImporter } from './FlashcardImporter';
import { FlashcardsList } from './FlashcardsList';
import { FlashcardCommunity } from './FlashcardCommunity';
import { FlashcardLibrary } from './FlashcardLibrary';
import { FlashcardStats } from './FlashcardStats';
import FlashcardGlobalSearch from '../../../components/admin/flashcards/FlashcardGlobalSearch';
import FlashcardSearchResults from '../../../components/admin/flashcards/FlashcardSearchResults';
import fetchWithAuth from '../../../services/fetchWithAuth';
import flashcardsCache from '../../../services/cacheService';

// URL base da API
const API_URL = 'http://localhost:5000/api';

// Hook simples para toast
const useToast = () => {
  return {
    toast: ({ title, description, status }) => {
      // Toast removido para melhor performance
    }
  };
};

// Componente simples de loading
const Spinner = ({ size = 'md' }) => {
  const sizeClass = size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClass}`}></div>
  );
};

const AdminFlashcardsPage = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [isLoading, setIsLoading] = useState(false);
  const [decks, setDecks] = useState([]);
  const [communityDecks, setCommunityDecks] = useState([]);
  const [stats, setStats] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const { user, token } = useAuth();
  const logRef = useRef(null);

  // 🚀 NOVOS ESTADOS PARA CARREGAMENTO OTIMIZADO
  const [collectionsMetadata, setCollectionsMetadata] = useState([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  // 🔍 NOVOS ESTADOS PARA BUSCA INTELIGENTE
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 🚀 NOVA FUNÇÃO: Carregar apenas metadados das coleções (SUPER RÁPIDO COM CACHE)
  const loadCollectionsMetadata = async () => {
    try {
      setIsLoadingMetadata(true);
      
      // Verificar cache primeiro
      const cachedMetadata = flashcardsCache.get('metadata', { userId: user?.id });
      if (cachedMetadata) {
        setCollectionsMetadata(cachedMetadata.collections || []);
        setMetadataLoaded(true);
        setIsLoadingMetadata(false);
        return;
      }
      
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/collections/metadata`);
      
      if (response.ok) {
        const metadataData = await response.json();
        const collections = metadataData.data?.collections || [];
        
        // Armazenar no cache
        flashcardsCache.set('metadata', { collections }, { userId: user?.id });
        
        setCollectionsMetadata(collections);
        setMetadataLoaded(true);
      }
    } catch (error) {
      console.error('Erro ao carregar metadados das coleções:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // 🚀 NOVA FUNÇÃO: Carregar decks de uma coleção específica (LAZY LOADING COM CACHE)
  const loadCollectionDecks = async (collectionName) => {
    try {
      // Verificar cache primeiro
      const cachedCollection = flashcardsCache.get('collections', { 
        userId: user?.id, 
        collection: collectionName 
      });
      
      if (cachedCollection) {
        const newDecks = cachedCollection.decks || [];
        
        // Adicionar novos decks aos existentes, evitando duplicatas
        setDecks(prevDecks => {
          const existingIds = new Set(prevDecks.map(deck => deck.id));
          const uniqueNewDecks = newDecks.filter(deck => !existingIds.has(deck.id));
          return [...prevDecks, ...uniqueNewDecks];
        });
        return;
      }
      
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/collections/${encodeURIComponent(collectionName)}/decks`);
      
      if (response.ok) {
        const collectionData = await response.json();
        const newDecks = collectionData.data?.decks || [];
        
        // Armazenar no cache
        flashcardsCache.set('collections', { decks: newDecks }, { 
          userId: user?.id, 
          collection: collectionName 
        });
        
        // Adicionar novos decks aos existentes, evitando duplicatas
        setDecks(prevDecks => {
          const existingIds = new Set(prevDecks.map(deck => deck.id));
          const uniqueNewDecks = newDecks.filter(deck => !existingIds.has(deck.id));
          return [...prevDecks, ...uniqueNewDecks];
        });
      }
    } catch (error) {
      console.error('Erro ao carregar decks da coleção:', error);
      throw error;
    }
  };

  // Função otimizada para logs - removida para melhor performance
      
  // Função para carregar dados iniciais
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // OTIMIZAÇÃO: Carregar com limit menor primeiro (200 decks iniciais)
      const [decksResponse, communityResponse, statsResponse] = await Promise.all([
        fetchWithAuth(`${API_URL}/admin/flashcards/decks?limit=200`), // Reduzido de 10.000
        fetchWithAuth(`${API_URL}/admin/flashcards/community`),
        fetchWithAuth(`${API_URL}/admin/flashcards/stats`)
      ]);
      
      if (decksResponse.ok) {
        const decksData = await decksResponse.json();
        setDecks(decksData.data || []);
      }

      if (communityResponse.ok) {
        const communityData = await communityResponse.json();
        setCommunityDecks(communityData.data || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data || {});
      }
      } catch (error) {
        console.error('Erro ao carregar dados de flashcards:', error);
      } finally {
        setIsLoading(false);
      }
    };

  // Função para recarregar apenas os decks
  const reloadDecks = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/decks?limit=200`); // Reduzido
      if (response.ok) {
        const decksData = await response.json();
        setDecks(decksData.data || []);
      }
    } catch (error) {
      console.error('Erro ao recarregar decks:', error);
    }
  };

  // Função para atualizar a lista de decks após importação
  const handleImportSuccess = (newDecks) => {
    // Recarregar todos os decks do servidor
    const fetchDecks = async () => {
      setIsLoading(true);
      try {
        // Carregar com limit otimizado
        const decksResponse = await fetchWithAuth(`${API_URL}/admin/flashcards/decks?limit=200`);
        const decksData = await decksResponse.json();
        
        if (decksData.success && decksData.data) {
          setDecks(decksData.data || []);

        }
        
        // Atualizar estatísticas também
        const statsResponse = await fetchWithAuth(`${API_URL}/admin/flashcards/stats`);
        const statsData = await statsResponse.json();
        setStats(statsData.data);
        
      } catch (error) {
        console.error('Erro ao recarregar decks:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // 🚀 INVALIDAR CACHE após importação
    flashcardsCache.invalidatePattern(user?.id);
    
    // Se temos novos decks específicos, adicioná-los à lista atual
    if (newDecks && newDecks.length > 0) {
      setDecks((prevDecks) => {
        // Verificar se algum deck já existe para evitar duplicatas
        const newDeckIds = new Set(newDecks.map(deck => deck.id));
        const filteredPrevDecks = prevDecks.filter(deck => !newDeckIds.has(deck.id));
        return [...newDecks, ...filteredPrevDecks];
      });
      

    } else {
      // Caso contrário, recarregar todos os decks
      fetchDecks();
    }
    
    // Mudar para a aba de listagem
    setActiveTab('list');
    
    // Desativar o modo de importação
    setIsImporting(false);
  };
  
  // Notificar o componente FlashcardImporter quando iniciar uma importação
  const handleImportStart = () => {
    setIsImporting(true);
  };

  // 🚀 CARREGAMENTO OTIMIZADO: Carregar apenas metadados inicialmente
  useEffect(() => {
    if (token) {
      // Carregar metadados das coleções imediatamente (super rápido)
      loadCollectionsMetadata();
      
      // Carregar dados completos apenas se não estivermos na aba import, list ou search
      if (activeTab !== 'import' && activeTab !== 'list' && activeTab !== 'search') {
        loadData();
      }
    }
  }, [token]);

  // 🚀 CARREGAMENTO LAZY: Carregar dados quando mudar de aba (EXCETO abas otimizadas)
  useEffect(() => {
    if (token && metadataLoaded && activeTab !== 'import' && activeTab !== 'list' && activeTab !== 'search') {
      // Só carregar se ainda não temos dados e não estivermos nas abas otimizadas
      if (decks.length === 0 || communityDecks.length === 0 || !stats) {
        loadData();
      }
    }
  }, [activeTab, metadataLoaded, token]);

  // Função para alternar visibilidade pública de um deck
  const handleTogglePublic = async (deckId, isPublic) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/decks/${deckId}/public-status`, {
        method: 'PUT',
        body: JSON.stringify({ isPublic })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao alterar visibilidade');
      }
      
      // Atualizar estado local
      setDecks(decks.map(deck => 
        deck.id === deckId ? { ...deck, isPublic } : deck
      ));
      
      // Se o deck foi tornado público, adicioná-lo à lista de comunidade
      if (isPublic) {
        const deck = decks.find(d => d.id === deckId);
        if (deck) {
          setCommunityDecks([...communityDecks, deck]);
        }
      } else {
        // Se o deck foi tornado privado, removê-lo da lista de comunidade
        setCommunityDecks(communityDecks.filter(deck => deck.id !== deckId));
      }
    } catch (error) {
      console.error('Erro ao alterar visibilidade do deck:', error);
    }
  };

  // Função para excluir um deck (individual) ou múltiplos decks (lote)
  const handleDeleteDeck = async (deckIdOrIds, skipConfirmation = false) => {
    // Detectar se é chamada em lote (array) ou individual (string)
    const isBatch = Array.isArray(deckIdOrIds);
    
    if (isBatch) {
      // Exclusão em lote
      const deckIds = deckIdOrIds;
      console.log(`🗑️ Tentando excluir ${deckIds.length} decks em lote:`, deckIds);
      
      try {
        console.log('📡 Fazendo chamada POST para exclusão em lote:', `${API_URL}/admin/flashcards/decks/batch-delete`);
        
        const response = await fetchWithAuth(`${API_URL}/admin/flashcards/decks/batch-delete`, {
          method: 'POST',
          body: JSON.stringify({ deckIds })
        });
        
        console.log('📥 Resposta da API:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('❌ Erro na resposta:', errorData);
          throw new Error(`Falha ao excluir decks em lote: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Lote processado:', result);
        
        // Atualizar estado local removendo os decks excluídos com sucesso
        if (result.data?.details?.success) {
          const successfulIds = result.data.details.success.map(item => item.id);
          
          // 🚀 INVALIDAR CACHE após exclusão
          flashcardsCache.invalidatePattern(user?.id);
          
          setDecks(prevDecks => prevDecks.filter(deck => !successfulIds.includes(deck.id)));
          setCommunityDecks(prevCommunityDecks => prevCommunityDecks.filter(deck => !successfulIds.includes(deck.id)));
        }
        
        return result;
        
      } catch (error) {
        console.error('💥 Erro ao excluir decks em lote:', error);
        return { success: false, error: error.message, deckIds };
      }
    } else {
      // Exclusão individual
      const deckId = deckIdOrIds;
      console.log('🗑️ Tentando excluir deck individual:', deckId);
      
      // Pular confirmação quando é chamado em lote
      if (!skipConfirmation && !window.confirm('Tem certeza que deseja excluir este deck? Esta ação não pode ser desfeita.')) {
        console.log('❌ Exclusão cancelada pelo usuário');
        return { success: false, reason: 'cancelled' };
    }
    
    try {
        console.log('📡 Fazendo chamada DELETE para:', `${API_URL}/admin/flashcards/decks/${deckId}`);
        
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/decks/${deckId}`, {
        method: 'DELETE'
      });
        
        console.log('📥 Resposta da API:', response.status, response.statusText);
      
      if (!response.ok) {
          const errorData = await response.text();
          console.error('❌ Erro na resposta:', errorData);
          throw new Error(`Falha ao excluir deck: ${response.status} ${response.statusText}`);
      }
        
        const result = await response.json();
        console.log('✅ Deck excluído com sucesso:', result);
      
        // 🚀 INVALIDAR CACHE após exclusão individual
        flashcardsCache.invalidatePattern(user?.id);
        
        // Atualizar estado local (sem recarregar dados para não travar os lotes)
        setDecks(prevDecks => prevDecks.filter(deck => deck.id !== deckId));
        setCommunityDecks(prevCommunityDecks => prevCommunityDecks.filter(deck => deck.id !== deckId));
        
        return { success: true, deckId };
        
    } catch (error) {
        console.error('💥 Erro ao excluir deck:', error);
        if (!skipConfirmation) {
          alert(`Erro ao excluir deck: ${error.message}`);
        }
        return { success: false, error: error.message, deckId };
      }
    }
  };

  // 🔍 FUNÇÕES PARA BUSCA INTELIGENTE
  const handleSearchResults = (results) => {
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleSearchLoading = (loading) => {
    setIsSearching(loading);
  };

  const handleDeckClick = (deck) => {
    // Navegar para visualização do deck ou abrir modal
    console.log('Clicou no deck:', deck);
    // TODO: Implementar navegação
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Flashcards</h1>
        {stats && (
          <div className="flex gap-3">
            <Badge variant="outline" className="text-sm py-1">
              Total: {stats.totalDecks} decks
            </Badge>
            <Badge variant="outline" className="text-sm py-1 bg-green-500/10">
              Públicos: {stats.publicDecks}
            </Badge>
            <Badge variant="outline" className="text-sm py-1 bg-blue-500/10">
              Cards: {stats.totalCards}
            </Badge>
            <Badge variant="outline" className="text-sm py-1 bg-purple-500/10">
              Usuários: {stats.usersWithDecks}
            </Badge>
          </div>
        )}
      </div>

      <Card className="mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="search" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Busca Inteligente
              {hasSearched && (
                <Badge className="ml-1 text-xs bg-blue-500">
                  {(searchResults.directResults?.length || 0) + (searchResults.folderResults?.reduce((sum, group) => sum + group.deckCount, 0) || 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="import" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importar APKG
            </TabsTrigger>
            <TabsTrigger value="list" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Minhas Coleções
              <Badge className="ml-1 text-xs">
                {metadataLoaded ? collectionsMetadata.length : decks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="library" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="community" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Comunidade
            </TabsTrigger>
            <TabsTrigger value="stats" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            <div className="p-4">
              <div className="space-y-6">
                {/* Header da busca */}
                <div className="border-b pb-4">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    🔍 Busca Inteligente com Filtros FSRS
                  </h2>
                  <p className="text-gray-600">
                    Encontre decks específicos usando busca global e filtros avançados baseados no algoritmo FSRS
                  </p>
                </div>

                {/* Componente de busca */}
                <FlashcardGlobalSearch
                  onResultsChange={handleSearchResults}
                  onLoadingChange={handleSearchLoading}
                />

                {/* Resultados da busca */}
                {hasSearched && (
                  <div className="border-t pt-6">
                    <FlashcardSearchResults
                      directResults={searchResults.directResults}
                      folderResults={searchResults.folderResults}
                      isLoading={isSearching}
                      onDeckClick={handleDeckClick}
                      showFSRSStats={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <div className="p-4">
              {isLoading ? (
                <div className="flex justify-center items-center p-12">
                  <Spinner size="lg" />
                  <span className="ml-3">Carregando...</span>
                </div>
              ) : (
                <FlashcardImporter 
                  onImportSuccess={handleImportSuccess} 
                  onImportStart={handleImportStart}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="list">
            <div className="p-4">
              {isLoading ? (
                <div className="flex justify-center items-center p-12">
                  <Spinner size="lg" />
                  <span className="ml-3">Carregando...</span>
                </div>
              ) : (
                <FlashcardsList 
                  decks={decks} 
                  onTogglePublic={handleTogglePublic} 
                  onDeleteDeck={handleDeleteDeck} 
                  isLoading={isLoadingMetadata}
                  collectionsMetadata={collectionsMetadata}
                  isLoadingMetadata={isLoadingMetadata}
                  metadataLoaded={metadataLoaded}
                  onLoadCollection={loadCollectionDecks}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="library">
            <div className="p-4">
              <FlashcardLibrary />
            </div>
          </TabsContent>

          <TabsContent value="community">
            <div className="p-4">
              <FlashcardCommunity />
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="p-4">
              {(isLoading && (activeTab === 'stats' || !stats)) ? (
                <div className="flex justify-center items-center p-12">
                  <Spinner size="lg" />
                  <span className="ml-3">Carregando estatísticas...</span>
                </div>
              ) : (
                <FlashcardStats stats={stats} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminFlashcardsPage; 