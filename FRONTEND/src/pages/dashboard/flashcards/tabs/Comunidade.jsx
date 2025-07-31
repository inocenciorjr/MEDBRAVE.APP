import React, { useState, useEffect } from 'react';
import { Search, Heart, Star, Users, Download, Eye, Filter, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Separator } from '../../../../components/ui/separator';
import { flashcardService } from '../../../../services/flashcardService';
import ErrorBoundary from '../../../../components/ErrorBoundary';

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
      <Users className="w-12 h-12" style={{color: 'var(--text-secondary)'}} />
    </div>
    <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
      {searchTerm ? 'Nenhuma coleção encontrada' : 'Nenhuma coleção pública disponível'}
    </h3>
    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
      {searchTerm 
        ? 'Tente buscar por outros termos ou ajustar os filtros.'
        : 'Seja o primeiro a publicar uma coleção para a comunidade!'
      }
    </p>
  </div>
);

const CollectionCard = ({ collection, onView, onAddToLibrary, onToggleLike }) => {
  const [isLiking, setIsLiking] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleLike = async () => {
    setIsLiking(true);
    try {
      await onToggleLike(collection.id);
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddToLibrary = async () => {
    setIsAdding(true);
    try {
      await onAddToLibrary(collection.id);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <CardTitle className="text-lg line-clamp-2" style={{color: 'var(--text-primary)'}}>
            {collection.name}
          </CardTitle>
          <div className="flex items-center gap-1 text-sm" style={{color: 'var(--text-muted)'}}>
            <Star className="w-4 h-4 fill-current" style={{color: 'var(--accent)'}} />
            <span>{collection.rating || '0.0'}</span>
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
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{collection.likes || 0}</span>
            </div>
          </div>

          {/* Tags */}
          {collection.tags && collection.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {collection.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {collection.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{collection.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Autor e data */}
          <div className="text-xs" style={{color: 'var(--text-muted)'}}>
            <div>Por: {collection.authorName || collection.userId?.split('@')[0] || 'Usuário'}</div>
            <div>Atualizado: {new Date(collection.updatedAt?.seconds * 1000 || Date.now()).toLocaleDateString('pt-BR')}</div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(collection)}
              className="flex-1 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Visualizar
            </Button>
            
            <Button
              size="sm"
              onClick={handleAddToLibrary}
              disabled={isAdding}
              className="flex-1 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isAdding ? 'Adicionando...' : 'Biblioteca'}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLike}
              disabled={isLiking}
              className="px-3"
            >
              <Heart 
                className={`w-4 h-4 ${collection.isLiked ? 'fill-current' : ''}`}
                style={{color: collection.isLiked ? 'var(--error)' : 'var(--text-secondary)'}}
              />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Comunidade = () => {
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('recentes');
  const [sortOrder, setSortOrder] = useState('asc');
  const [totalPages, setTotalPages] = useState(1);
  const [availableTags, setAvailableTags] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCommunityData = async () => {
      setLoading(true);
      try {
        // ✅ CORRIGIDO: Buscar coleções da comunidade
        const communityData = await flashcardService.getCommunityCollections({
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
          tags: selectedTags,
          sortBy: sortBy,
          sortOrder: sortOrder
        });
        
        // Processar dados retornados
        const collections = Array.isArray(communityData?.data) ? communityData.data : [];
        setCollections(collections);
        
        // Definir total de páginas
        const total = communityData?.total || collections.length;
        setTotalPages(Math.ceil(total / itemsPerPage));
        
        // ✅ CORRIGIDO: Buscar tags disponíveis
        const tagsData = await flashcardService.getAvailableTags();
        setAvailableTags(Array.isArray(tagsData) ? tagsData : []);
        
      } catch (error) {
        console.error('Erro ao carregar dados da comunidade:', error);
        setError('Erro ao carregar coleções da comunidade');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, [currentPage, searchTerm, selectedTags, sortBy, sortOrder]);

  const handleAddToLibrary = async (id) => {
    try {
      setLoading(true);
      await flashcardService.addToLibrary(id);
      // opcional: atualizar estado local ou refetch
      setCollections(prev => prev.filter(c => c.id !== id));
    } catch {
      // Erro silencioso
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (id) => {
    try {
      setLoading(true);
      await flashcardService.toggleLikeCollection(id);
      setCollections(prev =>
        prev.map(c => c.id === id ? { ...c, isLiked: !c.isLiked } : c)
      );
    } catch {
      // Erro silencioso
    } finally {
      setLoading(false);
    }
  };

  const handleView = (collection) => {
    // navegação para detalhe de coleção
    window.location.href = `/dashboard/flashcards/collection/${collection.id}`;
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
            Comunidade
          </h2>
          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
            Explore coleções públicas criadas pela comunidade
          </p>
        </div>
        
        {/* Busca e Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar coleções..."
              className="w-full"
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex gap-2">
            <Select defaultValue="recentes">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="populares">Mais populares</SelectItem>
                <SelectItem value="rating">Melhor avaliados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Lista de Coleções */}
        {loading ? (
          <LoadingSkeleton />
        ) : collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map(collection => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onView={() => handleView(collection)}
                onAddToLibrary={() => handleAddToLibrary(collection.id)}
                onToggleLike={() => handleToggleLike(collection.id)}
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

export default Comunidade; 