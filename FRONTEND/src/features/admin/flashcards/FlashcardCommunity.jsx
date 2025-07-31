import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import fetchWithAuth from '../../../services/fetchWithAuth';

const API_URL = 'http://localhost:5000/api';

export const FlashcardCommunity = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Carregar coleções públicas
  useEffect(() => {
    loadCommunityCollections();
  }, []);

  const loadCommunityCollections = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/community/collections`);
      if (response.ok) {
        const data = await response.json();
        setCollections(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar coleções da comunidade:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar coleções com base no termo de busca
  const filteredCollections = collections.filter(collection => 
    collection.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Visualizar detalhes de uma coleção
  const handleViewCollection = async (collectionId) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/collections/${collectionId}/details`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCollection(data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes da coleção:', error);
    }
  };

  // Adicionar coleção à biblioteca
  const handleAddToLibrary = async (collectionId) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/collections/${collectionId}/add-to-library`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Coleção adicionada à sua biblioteca com sucesso!');
      } else {
        const error = await response.json();
        alert(error.message || 'Erro ao adicionar coleção à biblioteca');
      }
    } catch (error) {
      console.error('Erro ao adicionar à biblioteca:', error);
      alert('Erro ao adicionar coleção à biblioteca');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3">Carregando coleções da comunidade...</span>
      </div>
    );
  }

  // Modal de detalhes da coleção
  if (showDetails && selectedCollection) {
    return (
      <div className="space-y-6">
        {/* Header com botão voltar */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowDetails(false)}
            className="flex items-center gap-2"
          >
            ← Voltar para Comunidade
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{selectedCollection.name}</h2>
            <p className="text-gray-600">
              Por: {selectedCollection.userId?.split('@')[0] || 'Usuário'} • 
              {selectedCollection.deckCount} decks • 
              {selectedCollection.totalCards} cards
            </p>
          </div>
        </div>

        {/* Botão adicionar à biblioteca */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800">Adicionar à Minha Biblioteca</h3>
              <p className="text-sm text-blue-600">
                Integre esta coleção aos seus estudos. Você receberá atualizações automáticas, 
                mas não poderá editar o conteúdo (somente leitura).
              </p>
            </div>
            <Button 
              onClick={() => handleAddToLibrary(selectedCollection.id)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              📚 Adicionar à Biblioteca
            </Button>
          </div>
        </div>

        {/* Estrutura hierárquica da coleção */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Estrutura da Coleção</h3>
          <div className="space-y-3">
            {selectedCollection.decks?.map((deck, index) => (
              <div key={deck.id || index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{deck.name}</h4>
                    <p className="text-sm text-gray-600">
                      {deck.flashcardCount || 0} flashcards
                    </p>
                    {deck.hierarchy && (
                      <p className="text-xs text-gray-500">
                        📁 {deck.hierarchy}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {deck.flashcardCount || 0} cards
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Lista principal de coleções
  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-blue-800 mb-2">Nenhuma coleção pública encontrada</h3>
          <p className="text-blue-600">Seja o primeiro a publicar uma coleção para a comunidade!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de busca */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar coleções da comunidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredCollections.length} coleção(ões) na comunidade
        </div>
      </div>

      {/* Lista de coleções */}
      {filteredCollections.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium mb-2">Nenhuma coleção encontrada</h3>
          <p className="text-gray-500">Tente buscar por outros termos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection, index) => (
            <Card key={collection.id || `community-collection-${index}`} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg text-gray-900 truncate">{collection.name}</h3>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Público
                </Badge>
              </div>
              
              {collection.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{collection.description}</p>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{collection.deckCount || 0}</span> decks • 
                  <span className="font-medium"> {collection.totalCards || 0}</span> cards
                </div>
                <div className="text-xs text-gray-400">
                  Por: {collection.userId?.split('@')[0] || 'Usuário'}
                </div>
              </div>
              
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewCollection(collection.id)}
                  className="flex-1"
                >
                  👁️ Visualizar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAddToLibrary(collection.id)}
                  className="flex-1"
                >
                  📚 Adicionar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 