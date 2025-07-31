import React, { useState, useEffect } from 'react';
import { BookOpen, Heart, RefreshCw, Trash2, Play, Eye } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';
import { flashcardService } from '../../../../services/flashcardService';
import ErrorBoundary from '../../../../components/ErrorBoundary';
import { useAuth } from '../../../../contexts/AuthContext';

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <Card key={i} className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="h-6 w-3/4 rounded animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
            <div className="h-5 w-16 rounded animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
          </div>
          <div className="h-4 w-full rounded animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
          <div className="h-4 w-2/3 rounded animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
            <div className="h-8 w-20 rounded animate-pulse" style={{backgroundColor: 'var(--bg-interactive)'}} />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

const EmptyState = ({ searchTerm }) => (
  <div className="text-center py-12">
    <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{backgroundColor: 'var(--bg-interactive)'}}>
      <BookOpen className="w-12 h-12" style={{color: 'var(--text-secondary)'}} />
    </div>
    <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
      {searchTerm ? 'Nenhuma coleção encontrada' : 'Sua biblioteca está vazia'}
    </h3>
    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
      {searchTerm 
        ? 'Tente buscar por outros termos.'
        : 'Visite a aba "Comunidade" para adicionar coleções públicas à sua biblioteca!'
      }
    </p>
  </div>
);

const LibraryCard = ({ collection, onView, onRemove, onStudy }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    if (!window.confirm(`Tem certeza que deseja remover "${collection.name}" da sua biblioteca?`)) {
      return;
    }

    setIsRemoving(true);
    try {
      await onRemove(collection.id);
    } finally {
      setIsRemoving(false);
    }
  };

  const isUpdated = collection.lastSyncedAt && collection.updatedAt && 
    new Date(collection.updatedAt) > new Date(collection.lastSyncedAt);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <CardTitle className="text-lg line-clamp-2" style={{color: 'var(--text-primary)'}}>
            {collection.name}
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="default" className="text-xs" style={{backgroundColor: 'var(--accent)', color: 'white'}}>
              Biblioteca
            </Badge>
            {isUpdated && (
              <Badge variant="outline" className="text-xs" style={{borderColor: 'var(--warning)', color: 'var(--warning)'}}>
                Atualizada
              </Badge>
            )}
          </div>
        </div>
        
        {collection.description && (
          <p className="text-sm line-clamp-3" style={{color: 'var(--text-secondary)'}}>
            {collection.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Estatísticas */}
          <div className="flex items-center justify-between text-sm" style={{color: 'var(--text-muted)'}}>
            <div className="flex items-center gap-4">
              <span>{collection.deckCount || 0} decks</span>
              <span>{collection.totalCards || 0} cards</span>
            </div>
          </div>

          {/* Informações de sincronização */}
          <div className="text-xs p-2 rounded" style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)'}}>
            <div>📅 Adicionado: {new Date(collection.subscribedAt?.seconds * 1000 || Date.now()).toLocaleDateString('pt-BR')}</div>
            {collection.updatedAt && (
              <div>🔄 Última atualização: {new Date(collection.updatedAt?.seconds * 1000 || Date.now()).toLocaleDateString('pt-BR')}</div>
            )}
          </div>

          {/* Autor */}
          <div className="text-xs" style={{color: 'var(--text-muted)'}}>
            Por: {collection.originalUserId?.split('@')[0] || collection.authorName || 'Usuário'}
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onStudy(collection)}
              className="flex-1 flex items-center gap-2"
              style={{backgroundColor: 'var(--success)', color: 'white'}}
            >
              <Play className="w-4 h-4" />
              Estudar
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(collection)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Ver
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              disabled={isRemoving}
              className="px-3"
              style={{color: 'var(--error)'}}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Biblioteca = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState([]);
  const [communityCollections, setCommunityCollections] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    const fetchLibraryData = async () => {
      if (!user?.uid) return;
      
      setLoading(true);
      try {
        // ✅ CORRIGIDO: Buscar decks públicos da comunidade
        const communityData = await flashcardService.getCommunityCollections({
          page: 1,
          limit: 200,
          search: searchTerm,
          tags: selectedTags,
          sortBy: sortBy,
          sortOrder: sortOrder
        });
        
        // ✅ CORRIGIDO: Buscar decks salvos na biblioteca do usuário
        const libraryData = await flashcardService.getMyLibrary({
          page: 1,
          limit: 200,
          search: searchTerm,
          tags: selectedTags,
          sortBy: sortBy,
          sortOrder: sortOrder
        });
        
        // Processar dados da comunidade
        const communityCollections = Array.isArray(communityData?.data) ? communityData.data : [];
        setCommunityCollections(communityCollections);
        
        // Processar dados da biblioteca
        const libraryCollections = Array.isArray(libraryData?.data) ? libraryData.data : [];
        setLibrary(libraryCollections);
        
        // ✅ CORRIGIDO: Buscar tags disponíveis
        const tagsData = await flashcardService.getAvailableTags();
        setAvailableTags(Array.isArray(tagsData) ? tagsData : []);
        
      } catch (error) {
        console.error('Erro ao carregar dados da biblioteca:', error);
        setError('Erro ao carregar biblioteca');
      } finally {
        setLoading(false);
      }
    };

    fetchLibraryData();
  }, [user, searchTerm, selectedTags, sortBy, sortOrder]);

  const handleRemove = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover esta coleção da biblioteca?')) return;
    try {
      setLoading(true);
      await flashcardService.removeFromLibrary(id);
      setLibrary(prev => prev.filter(item => item.id !== id));
    } catch {
      // Erro silencioso
    } finally {
      setLoading(false);
    }
  };

  const handleView = (collection) => {
    window.location.href = `/dashboard/flashcards/collection/${collection.id}`;
  };

  const handleStudy = (collection) => {
    window.location.href = `/dashboard/flashcards/deck/${collection.id}`;
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
            Minha Biblioteca
          </h2>
          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
            Coleções públicas que você adicionou para estudar
          </p>
        </div>
        
        {/* Busca */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar na biblioteca..."
              className="w-full"
            />
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Lista de Coleções */}
        {loading ? (
          <LoadingSkeleton />
        ) : library.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {library.map(collection => (
              <LibraryCard
                key={collection.id}
                collection={collection}
                onView={() => handleView(collection)}
                onRemove={() => handleRemove(collection.id)}
                onStudy={() => handleStudy(collection)}
              />
            ))}
          </div>
        ) : (
          <EmptyState searchTerm="" />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Biblioteca;