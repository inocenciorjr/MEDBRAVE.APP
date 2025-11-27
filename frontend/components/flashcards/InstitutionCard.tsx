'use client';

import { Institution } from '@/types/flashcards';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { addToLibrary } from '@/services/flashcardService';
import { useToast } from '@/lib/contexts/ToastContext';
import { RemoveImportModal } from './RemoveImportModal';

interface InstitutionCardProps {
  institution: Institution;
  isImported?: boolean;
  onImported?: () => void;
}

export function InstitutionCard({ institution, isImported: importedProp = false, onImported }: InstitutionCardProps) {
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
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
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
    router.push(`/flashcards/colecoes/${encodeURIComponent(institution.id)}`);
  };

  const isOwnCollection = !!currentUserId && institution.user_id === currentUserId;

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
      await addCollectionToLibrary(institution.id);
      
      setIsImported(true);
      
      // Notificar o componente pai
      if (onImported) {
        onImported();
      }
      
      // Disparar evento customizado para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('libraryUpdated', { 
        detail: { action: 'added', collectionId: institution.id } 
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
      await removeCollectionFromLibrary(institution.id);
      
      setIsImported(false);
      setShowRemoveModal(false);
      
      // Disparar evento customizado para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('libraryUpdated', { 
        detail: { action: 'removed', collectionId: institution.id } 
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
        collectionName={institution.name}
        onConfirm={handleRemoveFromLibrary}
        onCancel={() => setShowRemoveModal(false)}
      />
      
      <div 
        onClick={handleClick}
        className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-lg hover:shadow-2xl dark:shadow-dark-xl dark:hover:shadow-dark-2xl transition-all duration-200 flex flex-col items-center text-center flex-shrink-0 w-[250px] min-h-[380px] border border-border-light dark:border-border-dark relative hover:-translate-y-2 hover:z-20 cursor-pointer"
      >
      {/* Badge Oficial - Top Right */}
      <div className="absolute top-3 right-3">
        <span className="material-symbols-outlined text-blue-500 text-xl" title="Oficial MedBrave">
          verified
        </span>
      </div>

      {/* Thumbnail */}
      <div className="h-32 w-32 rounded-lg mb-4 overflow-hidden bg-background-light dark:bg-background-dark flex items-center justify-center">
        <img
          src={institution.logo || institution.thumbnail_url || institution.image_url || '/medbravethumb.png'}
          alt={`Logo ${institution.name}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title with fixed height */}
      <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-200 mb-1 w-full min-h-[3.5rem] flex items-center justify-center">
        {institution.name}
      </h3>

      {/* Author with fixed height */}
      <div className="min-h-[1.5rem] mb-2 flex items-center justify-center">
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">verified</span>
          MedBrave Oficial
        </p>
      </div>

      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
        {institution.deckCount} baralhos disponíveis
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-red-500 text-base">favorite</span>
          <span className="font-medium">{institution.likes}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-primary text-base">download</span>
          <span className="font-medium">{institution.imports || 0}</span>
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
          aria-label={`Visualizar baralhos de ${institution.name}`}
        >
          <span className="material-symbols-outlined text-base">view_list</span>
          Visualizar baralhos
        </button>
      </div>
    </div>
    </>
  );
}
