'use client';

import { useState, useEffect } from 'react';
import { Collection } from '@/types/flashcards';
import { updateCollectionPublicStatus, deleteCollection, removeFromLibrary } from '@/services/flashcardService';
import { EditCollectionModal } from './EditCollectionModal';
import { DeleteCollectionModal } from './DeleteCollectionModal';
import { RemoveImportModal } from './RemoveImportModal';
import { useToast } from '@/lib/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import Checkbox from '@/components/ui/Checkbox';

interface CollectionHeaderProps {
  collection: Collection & {
    isImported?: boolean;
    thumbnail_url?: string | null;
    isFromCommunity?: boolean; // Indica se foi importada da biblioteca pública
    canEdit?: boolean; // Se o usuário pode editar (validado pelo backend)
  };
  onUpdated?: () => void;
}

export function CollectionHeader({ collection, onUpdated }: CollectionHeaderProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRemoveImportModal, setShowRemoveImportModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const toast = useToast();
  const router = useRouter();

  // Inicializar o estado com o valor da coleção
  useEffect(() => {
    setIsPublic(collection.isPublic || false);
  }, [collection]);

  const handleTogglePublic = async () => {
    try {
      setIsUpdating(true);
      const newPublicStatus = !isPublic;

      // Chamar API para atualizar status
      await updateCollectionPublicStatus(collection.id, newPublicStatus);

      setIsPublic(newPublicStatus);
      toast.success('Status atualizado!', `Coleção agora está ${newPublicStatus ? 'pública' : 'privada'}.`);
    } catch (error) {
      console.error('Erro ao atualizar status público:', error);
      toast.error('Erro ao atualizar status', 'Não foi possível atualizar o status público da coleção.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCollection = async () => {
    try {
      await deleteCollection(collection.id);
      toast.success('Coleção removida!', 'A coleção e todos os seus arquivos foram removidos com sucesso.');
      setShowDeleteModal(false);
      router.push('/flashcards/colecoes');
    } catch (error: any) {
      console.error('Erro ao deletar coleção:', error);
      toast.error('Erro ao remover coleção', error.message || 'Não foi possível remover a coleção. Tente novamente.');
    }
  };

  const handleRemoveFromLibrary = async () => {
    try {
      await removeFromLibrary(collection.id);
      toast.success('Removido da biblioteca!', 'A coleção foi removida da sua biblioteca. Você pode importá-la novamente pela aba Comunidade.');
      setShowRemoveImportModal(false);
      router.push('/flashcards/colecoes');
    } catch (error: any) {
      console.error('Erro ao remover da biblioteca:', error);
      toast.error('Erro ao remover da biblioteca', error.message || 'Não foi possível remover a coleção da biblioteca. Tente novamente.');
    }
  };

  return (
    <>
      <div className="mb-8">
        {/* Title and Actions */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-medium text-slate-700 dark:text-slate-200 mb-2">
              {collection.name}
            </h1>
            
            {/* Chip de tipo de coleção */}
            <div className="flex items-center gap-2 mb-2">
              {collection.is_official && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 dark:bg-primary/20 text-primary text-xs font-medium rounded-full">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Coleção Oficial MedBRAVE
                </span>
              )}
              
              {!collection.is_official && collection.isFromCommunity && collection.author_name && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 dark:bg-primary/20 text-primary text-xs font-medium rounded-full">
                  <span className="material-symbols-outlined text-sm">person</span>
                  Coleção de {collection.author_name}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Só mostrar botão de editar se o usuário pode editar (validado pelo backend) */}
            {collection.canEdit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-text-light-primary dark:text-text-dark-primary bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Editar coleção
              </button>
            )}

            {collection.isFromCommunity ? (
              <button
                onClick={() => setShowRemoveImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors shadow-sm hover:shadow-md"
              >
                <span className="material-symbols-outlined text-base">folder_off</span>
                Remover da biblioteca
              </button>
            ) : collection.canEdit && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-surface-light dark:bg-surface-dark border border-red-500/30 dark:border-red-500/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 transition-colors shadow-sm hover:shadow-md"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Remover coleção
              </button>
            )}
          </div>
        </div>

        {/* Public Toggle - Só mostrar se o usuário pode editar */}
        {collection.canEdit && (
          <div
            onClick={() => !isUpdating && handleTogglePublic()}
            className={`w-full p-5 rounded-xl border-2 transition-all duration-300 group cursor-pointer
                      shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                      hover:scale-[1.01]
                      ${isPublic
                ? 'bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-primary/30'
                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-primary/30'
              }
                      ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Checkbox
                  checked={isPublic}
                  onChange={(e) => e.stopPropagation()}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
                  Tornar coleção pública
                </h3>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Ao tornar pública, outros usuários poderão visualizar e importar esta coleção na aba Comunidade
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Badge para coleções da comunidade */}
        {collection.isFromCommunity && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">info</span>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Coleção da Comunidade
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Esta coleção foi importada da biblioteca pública. Você pode estudar os baralhos, mas não pode editá-los.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditCollectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          if (onUpdated) {
            onUpdated();
          }
        }}
        collectionId={collection.id}
        collectionName={collection.name}
        isImported={collection.isImported || false}
        currentThumbnail={collection.thumbnail_url || null}
        isPublic={collection.isPublic || false}
      />

      {/* Delete Collection Modal */}
      <DeleteCollectionModal
        isOpen={showDeleteModal}
        collectionName={collection.name}
        onConfirm={handleDeleteCollection}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Remove from Library Modal */}
      <RemoveImportModal
        isOpen={showRemoveImportModal}
        collectionName={collection.name}
        onConfirm={handleRemoveFromLibrary}
        onCancel={() => setShowRemoveImportModal(false)}
      />
    </>
  );
}
