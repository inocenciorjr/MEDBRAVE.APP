'use client';

import { Specialty } from '@/types/flashcards';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { addToLibrary } from '@/services/flashcardService';
import { useToast } from '@/lib/contexts/ToastContext';
import { RemoveImportModal } from './RemoveImportModal';

interface SpecialtyCardProps {
  specialty: Specialty;
  isImported?: boolean;
  onImported?: () => void;
  onRemoved?: () => void;
}

export function SpecialtyCard({ specialty, isImported: importedProp = false, onImported, onRemoved }: SpecialtyCardProps) {
  const router = useRouter();
  const toast = useToast();
  const [isImported, setIsImported] = useState(importedProp);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Buscar ID do usuário atual
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const { supabase } = await import('@/config/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
      }
    }
    getCurrentUser();
  }, []);

  // Atualizar estado quando a prop mudar
  useEffect(() => {
    setIsImported(importedProp);
  }, [importedProp]);

  const handleClick = () => {
    // Navegar para a página da coleção usando ID único
    router.push(`/flashcards/colecoes/${encodeURIComponent(specialty.id)}`);
  };

  const isOwnCollection = !!currentUserId && specialty.user_id === currentUserId;

  const handleToggleLibrary = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isOwnCollection) {
      toast.info('Esta é sua coleção', 'Você não pode adicionar suas próprias coleções à biblioteca');
      return;
    }
    
    // Se já está importado, mostrar modal de confirmação
    if (isImported) {
      setShowRemoveModal(true);
      return;
    }

    // Se não está importado, adicionar
    try {
      setIsLoading(true);
      
      const { addCollectionToLibrary } = await import('@/services/flashcardService');
      await addCollectionToLibrary(specialty.id);
      
      setIsImported(true);
      
      // Notificar o componente pai
      if (onImported) {
        onImported();
      }
      
      // Disparar evento customizado para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('libraryUpdated', { 
        detail: { action: 'added', collectionId: specialty.id, collectionName: specialty.name } 
      }));
      
      toast.success('Coleção adicionada à sua biblioteca!');
    } catch (error: any) {
      console.error('Erro ao adicionar:', error);
      if (error.message?.includes('já está na sua biblioteca')) {
        setIsImported(true);
        if (onImported) {
          onImported();
        }
        toast.warning('Esta coleção já está na sua biblioteca');
      } else {
        toast.error('Erro ao adicionar à biblioteca');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromLibrary = async () => {
    try {
      const { removeCollectionFromLibrary } = await import('@/services/flashcardService');
      await removeCollectionFromLibrary(specialty.id);
      
      setIsImported(false);
      setShowRemoveModal(false);
      
      // Notificar o componente pai
      if (onRemoved) {
        onRemoved();
      }
      
      // Disparar evento customizado para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('libraryUpdated', { 
        detail: { action: 'removed', collectionId: specialty.id } 
      }));
      
      toast.success('Coleção removida da sua biblioteca');
    } catch (error: any) {
      console.error('Erro ao remover:', error);
      toast.error('Erro ao remover da biblioteca');
    }
  };

  return (
    <>
      <RemoveImportModal
        isOpen={showRemoveModal}
        collectionName={specialty.name}
        onConfirm={handleRemoveFromLibrary}
        onCancel={() => setShowRemoveModal(false)}
      />
      
      <div 
        onClick={handleClick}
        className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-lg hover:shadow-2xl dark:shadow-dark-xl dark:hover:shadow-dark-2xl transition-all duration-200 flex flex-col items-center text-center flex-shrink-0 w-[250px] min-h-[380px] border border-border-light dark:border-border-dark relative hover:-translate-y-2 hover:z-20 cursor-pointer"
      >
      {/* Hot Badge - Top Right */}
      {specialty.isHot && (
        <div className="absolute top-3 right-3">
          <span className="material-symbols-outlined text-orange-500 text-xl" title="Em alta">
            local_fire_department
          </span>
        </div>
      )}

      {/* Thumbnail */}
      <img
        src={specialty.thumbnail_url || specialty.image_url || '/medbravethumb.png'}
        alt={specialty.name}
        className="h-32 w-32 rounded-lg mb-4 object-cover flex-shrink-0 border border-border-light dark:border-border-dark"
      />

      {/* Title with fixed height */}
      <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-200 mb-1 w-full min-h-[3.5rem] flex items-center justify-center">
        {specialty.name}
      </h3>

      {/* Author with fixed height */}
      <div className="min-h-[1.5rem] mb-2 flex items-center justify-center">
        {specialty.author && (
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">person</span>
            {specialty.author}
          </p>
        )}
      </div>

      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
        {specialty.deckCount} baralhos disponíveis
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-red-500 text-base">favorite</span>
          <span className="font-medium">{specialty.likes}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-primary text-base">download</span>
          <span className="font-medium">{specialty.imports}</span>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="mt-auto w-full flex flex-col gap-2">
        {/* Botão de adicionar/remover (toggle) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleLibrary(e);
          }}
          disabled={isLoading || isOwnCollection}
          className={`w-full text-center py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            isOwnCollection
              ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed opacity-60'
              : isImported
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
          aria-label={isImported ? 'Remover da biblioteca' : 'Adicionar à biblioteca'}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adicionando...
            </>
          ) : isOwnCollection ? (
            <>
              <span className="material-symbols-outlined text-base">person</span>
              Sua Coleção
            </>
          ) : isImported ? (
            <>
              <span className="material-symbols-outlined text-base">check_circle</span>
              Na Biblioteca
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">download</span>
              Adicionar
            </>
          )}
        </button>

        {/* Botão de visualizar */}
        <button
          onClick={handleClick}
          className="w-full text-center py-2 px-4 border border-border-light dark:border-border-dark rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
          aria-label={`Visualizar baralhos de ${specialty.name}`}
        >
          <span className="material-symbols-outlined text-base">view_list</span>
          Ver Detalhes
        </button>
      </div>
    </div>
    </>
  );
}
