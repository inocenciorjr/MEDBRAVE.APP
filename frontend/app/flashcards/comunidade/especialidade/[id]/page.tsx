'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useToast } from '@/lib/contexts/ToastContext';
import { 
  getPublicCollectionDetails,
  addToLibrary, 
  toggleCollectionLike, 
  checkCollectionLiked, 
  checkCollectionImported 
} from '@/services/flashcardService';
import { EspecialidadeFlashcardsSkeleton } from '@/components/skeletons/EspecialidadeFlashcardsSkeleton';
import { DeckList } from '@/components/flashcards/DeckList';
import { Deck } from '@/types/flashcards';

interface CollectionDetails {
  id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  author_name: string;
  author_id: string;
  author_avatar?: string;
  deck_count: number;
  card_count: number;
  likes: number;
  imports: number;
  is_hot: boolean;
  created_at: string;
  updated_at: string;
  decks: Deck[];
}

export default function EspecialidadePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const collectionId = params.id as string;
  
  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [actionLoading, setActionLoading] = useState<'like' | 'import' | null>(null);

  useEffect(() => {
    loadCollectionDetails();
  }, [collectionId]);

  const loadCollectionDetails = async () => {
    try {
      setLoading(true);
      
      // Decodificar o ID (que agora é o nome original da coleção)
      const collectionName = decodeURIComponent(collectionId);
      
      const response = await getPublicCollectionDetails(collectionName);
      
      if (response.success && response.data) {
        setCollection(response.data);
        // Verificar interações após carregar a coleção
        checkUserInteractions(collectionName);
      } else {
        throw new Error('Coleção não encontrada');
      }
    } catch (error: any) {
      console.error('Erro ao carregar detalhes da coleção:', error);
      toast.error(error.message || 'Erro ao carregar coleção');
      setCollection(null);
    } finally {
      setLoading(false);
    }
  };

  const checkUserInteractions = async (collectionName: string) => {
    try {
      const [likedResult, importedResult] = await Promise.all([
        checkCollectionLiked(collectionName),
        checkCollectionImported(collectionName)
      ]);
      
      setIsLiked(likedResult.liked);
      setIsImported(importedResult.imported);
    } catch (error) {
      console.error('Erro ao verificar interações:', error);
    }
  };

  const handleLike = async () => {
    if (!collection) return;
    
    try {
      setActionLoading('like');
      const result = await toggleCollectionLike(collection.name);
      
      setIsLiked(result.liked);
      
      setCollection({
        ...collection,
        likes: collection.likes + (result.liked ? 1 : -1)
      });
      
      toast.success(result.liked ? 'Coleção curtida!' : 'Curtida removida');
    } catch (error) {
      console.error('Erro ao curtir:', error);
      toast.error('Erro ao curtir coleção');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddToLibrary = async () => {
    if (!collection) return;
    
    try {
      setActionLoading('import');
      await addToLibrary(collection.name);
      
      setIsImported(true);
      
      setCollection({
        ...collection,
        imports: collection.imports + 1
      });
      
      toast.success('Coleção adicionada à sua biblioteca!');
    } catch (error: any) {
      console.error('Erro ao adicionar à biblioteca:', error);
      
      if (error.message?.includes('já está na sua biblioteca')) {
        toast.warning('Esta coleção já está na sua biblioteca');
        setIsImported(true);
      } else {
        toast.error('Erro ao adicionar à biblioteca');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <EspecialidadeFlashcardsSkeleton />
    );
  }

  if (!collection) {
    return (
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Coleção não encontrada
            </h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
              A coleção que você está procurando não existe ou não está mais disponível.
            </p>
            <button
              onClick={() => router.push('/flashcards/comunidade')}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
            >
              Voltar à Comunidade
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Flashcards', icon: 'layers', href: '/flashcards/colecoes' },
            { label: 'Comunidade', icon: 'groups', href: '/flashcards/comunidade' },
            { label: collection.name, icon: 'collections_bookmark' } // Último item sem href (página atual)
          ]}
        />
      </div>

      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Header com navegação */}
          <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="text-sm font-medium">Voltar</span>
          </button>
          
          <div className="h-6 w-px bg-border-light dark:bg-border-dark" />
          
          <nav className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <button 
              onClick={() => router.push('/flashcards/comunidade')}
              className="hover:text-primary transition-colors"
            >
              Comunidade
            </button>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              {collection.name}
            </span>
          </nav>
        </div>

        {/* Cabeçalho da coleção */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-xl dark:shadow-dark-xl border border-border-light dark:border-border-dark mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex gap-6 flex-1">
              {/* Thumbnail da coleção */}
              {collection.thumbnail_url ? (
                <div className="flex-shrink-0">
                  <img
                    src={collection.thumbnail_url}
                    alt={collection.name}
                    className="w-24 h-24 rounded-lg object-cover border border-border-light dark:border-border-dark shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-4xl text-text-light-secondary dark:text-text-dark-secondary">
                    collections_bookmark
                  </span>
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">
                    {collection.name}
                  </h1>
                  {collection.is_hot && (
                    <span className="material-symbols-outlined text-orange-500 text-xl" title="Em alta">
                      local_fire_department
                    </span>
                  )}
                </div>
                
                {collection.description && (
                  <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4 leading-relaxed">
                    {collection.description}
                  </p>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  <div className="flex items-center gap-2">
                    {collection.author_avatar ? (
                      <img
                        src={collection.author_avatar}
                        alt={collection.author_name}
                        className="w-6 h-6 rounded-full object-cover border border-border-light dark:border-border-dark"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-base">person</span>
                    )}
                    <span>Por {collection.author_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    <span>Atualizado em {formatDateTime(collection.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleLike}
                disabled={actionLoading === 'like'}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-w-[140px] justify-center ${
                  isLiked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:bg-background-light dark:hover:bg-background-dark'
                }`}
              >
                <span className={`material-symbols-outlined ${isLiked ? 'filled' : ''}`}>
                  favorite
                </span>
                {actionLoading === 'like' ? 'Curtindo...' : `${collection.likes} Curtidas`}
              </button>
              
              <button
                onClick={handleAddToLibrary}
                disabled={actionLoading === 'import' || isImported}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-w-[180px] justify-center ${
                  isImported
                    ? 'bg-green-500 text-white cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                <span className="material-symbols-outlined">
                  {isImported ? 'check_circle' : 'download'}
                </span>
                {actionLoading === 'import' 
                  ? 'Adicionando...' 
                  : isImported 
                    ? 'Na Biblioteca' 
                    : 'Adicionar à Biblioteca'
                }
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg shadow-lg dark:shadow-dark-lg border border-border-light dark:border-border-dark text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {collection.deck_count}
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Baralhos
            </div>
          </div>
          
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg shadow-lg dark:shadow-dark-lg border border-border-light dark:border-border-dark text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {collection.card_count}
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Flashcards
            </div>
          </div>
          
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg shadow-lg dark:shadow-dark-lg border border-border-light dark:border-border-dark text-center">
            <div className="text-2xl font-bold text-red-500 mb-1">
              {collection.likes}
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Curtidas
            </div>
          </div>
          
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg shadow-lg dark:shadow-dark-lg border border-border-light dark:border-border-dark text-center">
            <div className="text-2xl font-bold text-green-500 mb-1">
              {collection.imports}
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Downloads
            </div>
          </div>
        </div>

        {/* Lista de baralhos */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-xl dark:shadow-dark-xl border border-border-light dark:border-border-dark">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined">view_list</span>
            Baralhos desta Coleção
          </h2>
          
          {collection.decks && collection.decks.length > 0 ? (
            <DeckList decks={collection.decks} showFilters={false} />
          ) : (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
                inbox
              </span>
              <p className="text-text-light-secondary dark:text-text-dark-secondary">
                Esta coleção ainda não possui baralhos.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
