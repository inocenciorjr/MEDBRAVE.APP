import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Upload, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Dialog, DialogTrigger } from '../../../../components/ui/dialog';
import FlashcardsList from '../../../../components/FlashcardsList';
import FlashcardGlobalSearch from '../../../../components/FlashcardGlobalSearch';
import CreateDeckModal from '../../../../components/modals/CreateDeckModal';
import ImportApkgModal from '../../../../components/modals/ImportApkgModal';
import { useAuth } from '../../../../contexts/AuthContext';
import flashcardsCache from '../../../../services/cacheService';
import { flashcardService } from '../../../../services/flashcardService';
import ErrorBoundary from '../../../../components/ErrorBoundary';
import FlashcardFilters from '../../../../components/FlashcardFilters';
import CardEditor from '../../../../components/CardEditor';
import { useNavigate } from 'react-router-dom';
import useSelectiveRefresh from '../../../../hooks/useSelectiveRefresh';


const MeusFlashcards = () => {
  const { user } = useAuth();

  // FSRS status
  const [fsrsStatus, setFSRSStatus] = useState(null);
  const [loadingFSRSStatus, setLoadingFSRSStatus] = useState(false);

  // Estados principais
  const [collectionsMetadata, setCollectionsMetadata] = useState([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    tags: [],
    status: 'all',
    difficulty: 'all'
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  // Estados dos modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Estados para edição de cards
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [cardEditorMode, setCardEditorMode] = useState('create');
  
  // Estados adicionais necessários
  const [collections, setCollections] = useState({});
  const [stats, setStats] = useState({
    totalDecks: 0,
    totalCards: 0,
    studiedToday: 0,
    averageRetention: 0
  });
  const [loading, setLoading] = useState(false);

  // Load FSRS status on mount
  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoadingFSRSStatus(true);
        const response = await flashcardService.getFSRSStatus();
        if (response.success) setFSRSStatus(response.data);
      } catch {
        // ignore errors
      } finally {
        setLoadingFSRSStatus(false);
      }
    };
    loadStatus();
  }, []);

  /**
   * 📊 Carregar metadados das coleções (otimizado)
   */
  const loadCollectionsMetadata = useCallback(async () => {
    try {
      setMetadataLoading(true);
      setError(null);
      
      console.log('🔄 [MeusFlashcards] Carregando metadados das coleções...');
      
      // Tentar carregar do cache primeiro
      const cached = flashcardsCache.get('metadata', { userId: user?.id });
      console.log('💾 [MeusFlashcards] Cache verificado:', cached ? 'encontrado' : 'vazio');
      
      if (cached && cached.collections && Array.isArray(cached.collections)) {
        console.log('✅ [MeusFlashcards] Usando dados do cache');
        setCollectionsMetadata(
          cached.collections.map(meta => ({
            ...meta,
            lastUpdated: meta.lastUpdated || meta.updatedAt || meta.lastModified
          }))
        );
        setMetadataLoaded(true);
        
        // Extrair tags disponíveis dos metadados
        const allTags = new Set();
        cached.collections.forEach(collection => {
          if (collection.decks && Array.isArray(collection.decks)) {
            collection.decks.forEach(deck => {
              if (deck.tags && Array.isArray(deck.tags)) {
                deck.tags.forEach(tag => allTags.add(tag));
              }
            });
          }
        });
        setAvailableTags(Array.from(allTags));
        return;
      }
      
      // Se não há cache válido, buscar da API
      console.log('🌐 [MeusFlashcards] Buscando da API...');
      const response = await flashcardService.getCollectionsMetadata();
      
      if (response.success && response.data && Array.isArray(response.data)) {
        console.log('✅ [MeusFlashcards] Metadados carregados da API');
        setCollectionsMetadata(
          response.data.map(meta => ({
            ...meta,
            lastUpdated: meta.lastUpdated || meta.updatedAt || meta.lastModified
          }))
        );
        setMetadataLoaded(true);
        
        // Salvar no cache para próximas consultas
        flashcardsCache.set('metadata', {
          collections: response.data.map(meta => ({
            ...meta,
            lastUpdated: meta.lastUpdated || meta.updatedAt || meta.lastModified
          })),
          timestamp: Date.now()
        }, { userId: user?.id });
        
        // Extrair tags disponíveis dos metadados
        const allTags = new Set();
        response.data.forEach(collection => {
          if (collection.decks && Array.isArray(collection.decks)) {
            collection.decks.forEach(deck => {
              if (deck.tags && Array.isArray(deck.tags)) {
                deck.tags.forEach(tag => allTags.add(tag));
              }
            });
          }
        });
        setAvailableTags(Array.from(allTags));
      } else {
        throw new Error(response.error || 'Erro ao carregar metadados');
      }
    } catch (error) {
      console.error('❌ [MeusFlashcards] Erro ao carregar metadados:', error);
      setError(`Erro ao carregar coleções: ${error.message}`);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  // Carregar metadados apenas na primeira montagem (evitar chamadas duplicadas em Strict Mode)
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      loadCollectionsMetadata();
    }
  }, [loadCollectionsMetadata]);
  
  // Refresh seletivo - só atualiza quando navegar para esta página
  useSelectiveRefresh(() => {
    loadCollectionsMetadata();
  }, 'flashcards');
  
  /**
   * 🗂️ Carregar coleção específica
   */
  const handleLoadCollection = useCallback(async (collectionName) => {
    try {
      const userId = user?.id;
      // Verificar cache primeiro
      const cached = await flashcardsCache.get('collections', { userId, collection: collectionName });
      if (cached) {
        const decks = cached.decks || [];
        setCollectionsMetadata(prev => 
          prev.map(col => {
            if (col.name === collectionName) {
              const totalCards = decks.reduce((sum, deck) => sum + (deck.cardCount || deck.flashcardCount || 0), 0);
              return { ...col, decks, loaded: true, cardCount: totalCards };
            }
            return col;
          })
        );
        return;
      }
      // Buscar via API
      const response = await flashcardService.getCollectionDecks(collectionName);
      if (!response.success) {
        throw new Error(response.error || 'Erro ao carregar coleção');
      }
      const decks = response.data.decks || [];
      
      console.log('📊 [handleLoadCollection] Decks carregados para', collectionName + ':', decks);
      console.log('📊 [handleLoadCollection] Primeiro deck:', decks[0]);
      
      // Armazenar no cache
      await flashcardsCache.set('collections', { decks }, { userId, collection: collectionName });
      // Atualizar estado com decks e contagem de cards
      setCollectionsMetadata(prev => 
        prev.map(col => {
          if (col.name === collectionName) {
            const totalCards = decks.reduce((sum, deck) => sum + (deck.cardCount || deck.flashcardCount || 0), 0);
            return { ...col, decks, loaded: true, cardCount: totalCards };
          }
          return col;
        })
      );
    } catch (error) {
      console.error('❌ [MeusFlashcards] Erro ao carregar coleção:', collectionName, error);
      setError(`Erro ao carregar coleção ${collectionName}: ${error.message}`);
    }
  }, [user, collectionsMetadata]);

  /**
   * 🔄 Atualização automática após mudanças (otimizada)
   */
  const refreshData = useCallback(async () => {
    console.log('🔄 [MeusFlashcards] Atualizando dados após mudança...');
    
    try {
      // Limpar cache para forçar nova busca
      flashcardsCache.invalidate('metadata', { userId: user?.id });
      
      // Recarregar metadados de forma otimizada
      await loadCollectionsMetadata();
      
      console.log('✅ [MeusFlashcards] Dados atualizados com sucesso');
    } catch (error) {
      console.error('❌ [MeusFlashcards] Erro ao atualizar dados:', error);
      setError(`Erro ao atualizar dados: ${error.message}`);
    }
  }, [loadCollectionsMetadata]);

  /**
   * ❤️ Toggle favorito
   */
  const handleToggleFavorite = useCallback(async (deck) => {
    try {
      await flashcardService.toggleDeckFavorite(deck.id);
      // Atualização automática após mudança
      await refreshData();
    } catch (error) {
      console.error('Erro ao favoritar deck:', error);
      setError(`Erro ao favoritar deck: ${error.message}`);
    }
  }, [refreshData]);

  /**
   * 🌐 Toggle público
   */
  const handleTogglePublic = useCallback(async (deck) => {
    try {
      await flashcardService.toggleDeckPublic(deck.id);
      // Atualização automática após mudança
      await refreshData();
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      setError(`Erro ao alterar visibilidade: ${error.message}`);
    }
  }, [refreshData]);

  /**
   * 🗑️ Deletar deck
   */
  const handleDeleteDeck = useCallback(async (deck) => {
    if (!confirm(`Tem certeza que deseja excluir o deck "${deck.name}"?`)) return;
    
    try {
      await flashcardService.deleteDeck(deck.id);
      // Atualização automática após mudança
      await refreshData();
    } catch (error) {
      console.error('Erro ao excluir deck:', error);
      setError(`Erro ao excluir deck: ${error.message}`);
    }
  }, [refreshData]);

  /**
   * 👁️ Visualizar deck (otimizado)
   */
  const handleDeckClick = useCallback(async (deck) => {
    try {
      // Evitar recarregar se já está selecionado
      if (selectedDeck && selectedDeck.id === deck.id) {
        console.log('🎯 [MeusFlashcards] Deck já selecionado:', deck.name);
        return;
      }
      
      console.log('🎯 [MeusFlashcards] Carregando cards do deck:', deck.name);
      console.log('🎯 [MeusFlashcards] Deck completo:', deck);
      console.log('🎯 [MeusFlashcards] Deck ID:', deck.id);
      setError(null); // Limpar erros anteriores
      
      const response = await flashcardService.getDeckCards(deck.id);
      if (response.success && response.data) {
        setSelectedDeck(deck);
        setDeckCards(response.data.items || []);
        console.log('✅ [MeusFlashcards] Cards carregados:', response.data.items?.length || 0);
        console.log('🔍 [MeusFlashcards] Estrutura do primeiro card:', response.data.items?.[0]);
      } else {
        throw new Error(response.error || 'Erro ao carregar cards');
      }
    } catch (error) {
      console.error('❌ [MeusFlashcards] Erro ao carregar cards:', error);
      setError(`Erro ao carregar cards: ${error.message}`);
    }
  }, [selectedDeck]);

  /**
   * ✅ Sucesso na criação/importação (otimizado)
   */
  const handleSuccess = useCallback(async () => {
    try {
      setShowCreateModal(false);
      setShowImportModal(false);
      setError(null);
      
      console.log('✅ [MeusFlashcards] Operação concluída com sucesso, atualizando dados...');
      
      // Recarregar metadados de forma otimizada
      await refreshData();
    } catch (error) {
      console.error('❌ [MeusFlashcards] Erro ao atualizar após sucesso:', error);
      setError(`Erro ao atualizar dados: ${error.message}`);
    }
  }, [refreshData]);

  /**
   * 🔍 Handler de busca global (otimizado)
   */
  const handleSearch = useCallback(async (query, filters = {}) => {
    const trimmedQuery = query?.trim();
    
    if (!trimmedQuery) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      console.log('🔍 [MeusFlashcards] Iniciando busca:', trimmedQuery);
      
      // Busca eficiente via API - não carrega todos os dados
      const response = await flashcardService.globalFlashcardSearch({
        q: trimmedQuery,
        ...filters,
        ...selectedFilters
      });
      
      if (response.success) {
        setSearchResults(response.data);
        console.log('✅ [MeusFlashcards] Busca concluída:', response.data?.length || 0, 'resultados');
      } else {
        throw new Error(response.error || 'Erro na busca');
      }
    } catch (error) {
      console.error('❌ [MeusFlashcards] Erro na busca:', error);
      setError(`Erro na busca: ${error.message}`);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [selectedFilters]);

  // ✅ HANDLER DE FILTROS
  const handleFiltersChange = useCallback((newFilters) => {
    setSelectedFilters(newFilters);
  }, []);

  // ✅ HANDLERS PARA EDIÇÃO DE CARDS
  const handleCreateCard = useCallback(() => {
    if (!selectedDeck) return;
    
    setEditingCard(null);
    setCardEditorMode('create');
    setShowCardEditor(true);
  }, [selectedDeck]);

  const handleEditCard = useCallback((card) => {
    setEditingCard(card);
    setCardEditorMode('edit');
    setShowCardEditor(true);
  }, []);

  const handleDuplicateCard = useCallback((card) => {
    setEditingCard(card);
    setCardEditorMode('duplicate');
    setShowCardEditor(true);
  }, []);

  // ▶️ Handler para iniciar revisão de flashcards
  const navigate = useNavigate();
  const handleStartStudy = useCallback((deck) => {
    navigate(`/dashboard/flashcards/review/${deck.id}`);
  }, [navigate]);

  /**
   * 💾 Handler para card salvo (otimizado)
   */
  const handleCardSaved = useCallback(async () => {
    try {
      // Recarregar cards do deck após salvar
      if (selectedDeck) {
        console.log('💾 [MeusFlashcards] Recarregando cards após salvar');
        
        // Forçar recarregamento dos cards do deck atual
        const response = await flashcardService.getDeckCards(selectedDeck.id);
        if (response.success && response.data) {
          setDeckCards(response.data.items || []);
          console.log('✅ [MeusFlashcards] Cards atualizados:', response.data.items?.length || 0);
        } else {
          throw new Error(response.error || 'Erro ao recarregar cards');
        }
      }
    } catch (error) {
      console.error('❌ [MeusFlashcards] Erro ao recarregar cards:', error);
      setError(`Erro ao atualizar cards: ${error.message}`);
    }
  }, [selectedDeck]);

  /**
   * ⬅️ Voltar para lista de decks (otimizado)
   */
  const handleBackToDecks = useCallback(() => {
    console.log('⬅️ [MeusFlashcards] Voltando para lista de decks');
    
    // Limpar estados relacionados ao deck selecionado
    setSelectedDeck(null);
    setDeckCards([]);
    setError(null);
    
    // Limpar estados do editor de cards se estiver aberto
    setShowCardEditor(false);
    setEditingCard(null);
    setCardEditorMode('create');
  }, []);

  // REMOVIDO: fetchUserDecks duplicado - loadCollectionsMetadata já faz tudo

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
              {selectedDeck ? `${selectedDeck.name} - Cards` : 'Meus Flashcards'}
            </h2>
            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
              {selectedDeck 
                ? `${deckCards.length} cards neste deck`
                : 'Gerencie suas coleções e decks de flashcards'
              }
            </p>
          </div>
          
          {/* Botões de ação */}
          <div className="flex items-center gap-2">
            {selectedDeck ? (
              /* Botões quando visualizando cards */
              <>
                <Button
                  onClick={handleBackToDecks}
                  variant="outline"
                  size="sm"
                >
                  ← Voltar
                </Button>
                <Button
                  onClick={handleCreateCard}
                  variant="primary"
                  size="sm"
                >
                  + Novo Card
                </Button>
              </>
            ) : (
              /* Botões quando visualizando decks */
              <>
                <Button
                  onClick={() => setShowImportModal(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  Importar APKG
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Novo Deck
                </Button>
              </>
            )}
          </div>
        </div>

        {/* FSRS Status Summary */}
        {!selectedDeck && fsrsStatus && (
          <div className="flex gap-4 mb-6 text-sm" style={{color: 'var(--text-secondary)'}}>
            <div>{fsrsStatus.pendingCards} pendentes</div>
            <div>{fsrsStatus.overdueCards} vencidas</div>
            <div>{fsrsStatus.upToDateCards} em dia</div>
          </div>
        )}

        {/* Busca Global (apenas quando não está visualizando cards) */}
        {!selectedDeck && (
          <div className="mb-6">
            <FlashcardGlobalSearch
              onSearch={handleSearch}
              isSearching={isSearching}
              searchResults={searchResults}
              selectedFilters={selectedFilters}
            />
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="flex-1 flex gap-6">
          {/* Sidebar com filtros (apenas quando não está visualizando cards) */}
          {!selectedDeck && (
            <div className="w-80 flex-shrink-0">
              <FlashcardFilters
                selectedFilters={selectedFilters}
                onFiltersChange={handleFiltersChange}
                availableTags={availableTags}
              />
            </div>
          )}

          {/* Conteúdo principal */}
          <div className="flex-1">
            {selectedDeck ? (
              /* Visualização de cards do deck */
              <div className="space-y-4">
                {deckCards.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Este deck ainda não tem cards
                    </p>
                    <Button onClick={handleCreateCard} variant="primary">
                      Criar Primeiro Card
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {deckCards.map((card) => (
                      <div key={card.id} className="dashboard-card p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground mb-2">
                              Frente
                            </h4>
                            <div className="text-sm text-muted-foreground mb-3 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: card.frontContent || card.front || 'Sem conteúdo' }} />
                            <h4 className="font-medium text-foreground mb-2">
                              Verso
                            </h4>
                            <div className="text-sm text-muted-foreground prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: card.backContent || card.back || 'Sem conteúdo' }} />
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              onClick={() => handleEditCard(card)}
                              variant="outline"
                              size="sm"
                            >
                              Editar
                            </Button>
                            <Button
                              onClick={() => handleDuplicateCard(card)}
                              variant="outline"
                              size="sm"
                            >
                              Duplicar
                            </Button>
                          </div>
                        </div>
                        {card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {card.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Lista de coleções e decks */
              <FlashcardsList
                collectionsMetadata={collectionsMetadata}
                isLoadingMetadata={metadataLoading}
                metadataLoaded={metadataLoaded}
                error={error}
                onRefresh={loadCollectionsMetadata}
                onLoadCollection={handleLoadCollection}
                onToggleFavorite={handleToggleFavorite}
                onTogglePublic={handleTogglePublic}
                onDeleteDeck={handleDeleteDeck}
                onDeckClick={handleDeckClick}
                onStartStudy={handleStartStudy}
                showActions={true}
                title="Meus Flashcards"
                searchResults={searchResults}
                selectedFilters={selectedFilters}
                decks={collectionsMetadata} // Passar os dados diretamente
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de edição de cards */}
      <CardEditor
        isOpen={showCardEditor}
        onClose={() => setShowCardEditor(false)}
        onSave={handleCardSaved}
        deckId={selectedDeck?.id}
        cardId={editingCard?.id}
        mode={cardEditorMode}
      />

      {/* Modal de criação de deck */}
      {showCreateModal && (
        <CreateDeckModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Modal de importação APKG */}
      {showImportModal && (
        <ImportApkgModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </ErrorBoundary>
  );
};

export default MeusFlashcards;