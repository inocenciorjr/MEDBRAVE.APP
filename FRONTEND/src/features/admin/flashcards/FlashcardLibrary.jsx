import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import fetchWithAuth from '../../../services/fetchWithAuth';
import { formatDate } from '../../../utils/dateUtils';

const API_URL = 'http://localhost:5000/api';

export const FlashcardLibrary = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [libraryCollections, setLibraryCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar biblioteca pessoal
  useEffect(() => {
    loadMyLibrary();
  }, []);

  const loadMyLibrary = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/my-library`);
      if (response.ok) {
        const data = await response.json();
        setLibraryCollections(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar biblioteca pessoal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Remover coleção da biblioteca
  const handleRemoveFromLibrary = async (collectionId, collectionName) => {
    if (window.confirm(`Tem certeza que deseja remover "${collectionName}" da sua biblioteca?`)) {
      try {
        const response = await fetchWithAuth(`${API_URL}/admin/flashcards/collections/${collectionId}/remove-from-library`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          alert('Coleção removida da biblioteca com sucesso!');
          // Recarregar biblioteca
          loadMyLibrary();
        } else {
          const error = await response.json();
          alert(error.message || 'Erro ao remover coleção da biblioteca');
        }
      } catch (error) {
        console.error('Erro ao remover da biblioteca:', error);
        alert('Erro ao remover coleção da biblioteca');
      }
    }
  };

  // Iniciar estudos (placeholder - integrar com sistema de revisões)
  const handleStartStudy = (collection) => {
    alert(`Iniciando estudos da coleção "${collection.name}".\n\nEm breve será integrado ao sistema de revisões FSRS!`);
  };

  // Filtrar coleções com base no termo de busca
  const filteredCollections = libraryCollections.filter(collection => 
    collection.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3">Carregando sua biblioteca...</span>
      </div>
    );
  }

  if (libraryCollections.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-medium text-blue-800 mb-2">Sua biblioteca está vazia</h3>
          <p className="text-blue-600 mb-4">
            Visite a aba "Comunidade" para adicionar coleções públicas à sua biblioteca!
          </p>
          <Button 
            onClick={() => window.location.hash = '#community'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            🌍 Explorar Comunidade
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header da biblioteca */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">📚 Minha Biblioteca de Estudos</h2>
        <p className="text-blue-600 text-sm">
          Coleções públicas que você adicionou para estudar. Elas são atualizadas automaticamente 
          quando o criador faz modificações.
        </p>
      </div>

      {/* Barra de busca */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar na sua biblioteca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredCollections.length} coleção(ões) na biblioteca
        </div>
      </div>

      {/* Lista de coleções da biblioteca */}
      {filteredCollections.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">Nenhuma coleção encontrada</h3>
          <p className="text-gray-500">Tente buscar por outros termos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection, index) => {
            const isUpdated = collection.lastSyncedAt && collection.updatedAt && 
              new Date(collection.updatedAt) > new Date(collection.lastSyncedAt);
            
            return (
              <Card key={collection.id || `library-collection-${index}`} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 truncate">{collection.name}</h3>
                  <div className="flex gap-1">
                    <Badge variant="default" className="bg-blue-100 text-blue-800">
                      Biblioteca
                    </Badge>
                    {isUpdated && (
                      <Badge variant="default" className="bg-orange-100 text-orange-800">
                        Atualizada
                      </Badge>
                    )}
                  </div>
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
                    Por: {collection.originalUserId?.split('@')[0] || 'Usuário'}
                  </div>
                </div>

                {/* Informações de sincronização */}
                <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
                  <div>📅 Adicionado: {formatDate(collection.subscribedAt?.seconds * 1000 || Date.now())}</div>
                  {collection.updatedAt && (
                    <div>🔄 Última atualização: {formatDate(collection.updatedAt?.seconds * 1000 || Date.now())}</div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleStartStudy(collection)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    🎯 Estudar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveFromLibrary(collection.collectionId, collection.name)}
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    🗑️ Remover
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};