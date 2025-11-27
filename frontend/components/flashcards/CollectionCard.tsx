'use client';

import { CollectionWithStats } from '@/types/flashcards';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EditCollectionModal } from './EditCollectionModal';

interface CollectionCardProps {
  collection: CollectionWithStats;
  onUpdated?: () => void;
}

export function CollectionCard({ collection, onUpdated }: CollectionCardProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleNavigate = () => {
    router.push(`/flashcards/colecoes/${collection.id}`);
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

  const getTagColorClasses = (color: string): string => {
    const colorMap = {
      purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
      teal: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300',
      blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
      pink: 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300',
      red: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.purple;
  };

  const pluralize = (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  };

  return (
    <>
      <div
        onClick={handleNavigate}
        className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-lg hover:shadow-2xl dark:shadow-dark-xl dark:hover:shadow-dark-2xl transition-all duration-200 flex flex-col items-center text-center flex-shrink-0 w-full min-h-[520px] border border-border-light dark:border-border-dark relative hover:-translate-y-2 hover:z-20 cursor-pointer"
      >
        {/* Thumbnail */}
        <div className="aspect-square w-full rounded-lg mb-4 flex-shrink-0 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <img
            src={collection.thumbnail_url || '/medbravethumb.png'}
            alt={collection.name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Title with fixed height */}
        <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-200 mb-2 w-full min-h-[3.5rem] flex items-center justify-center px-2">
          {collection.name}
        </h3>

        {/* Tags/Chips */}
        {collection.tags && collection.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-3 px-2">
            {collection.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${getTagColorClasses(tag.color)}`}
              >
                <span className="material-symbols-outlined text-sm">{tag.icon}</span>
                {tag.label}
              </span>
            ))}
            {collection.tags.length > 3 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                +{collection.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Updated date chip */}
        <div className="mb-3">
          <span className="relative group text-xs bg-background-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium border border-border-light dark:border-border-dark">
            <span className="material-symbols-outlined text-sm">schedule</span>
            {formatDateTime(collection.updatedAt)}
            {/* Tooltip */}
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                           bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                           text-xs font-semibold rounded-lg whitespace-nowrap 
                           opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                           pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300">
              Última atualização
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                           w-0 h-0 border-l-[6px] border-l-transparent 
                           border-r-[6px] border-r-transparent 
                           border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
            </span>
          </span>
        </div>

        {/* Stats chips */}
        <div className="flex gap-2 items-center justify-center mb-6 w-full px-2">
          <span className="relative group text-sm bg-background-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold flex-1 border border-border-light dark:border-border-dark ">
            <span className="material-symbols-outlined text-base">style</span>
            {collection.deckCount}
            {/* Tooltip */}
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                           bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                           text-xs font-semibold rounded-lg whitespace-nowrap 
                           opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                           pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300">
              {collection.deckCount} {pluralize(collection.deckCount, 'baralho', 'baralhos')}
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                           w-0 h-0 border-l-[6px] border-l-transparent 
                           border-r-[6px] border-r-transparent 
                           border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
            </span>
          </span>
          {collection.cardCount !== undefined && (
            <span className="relative group text-sm bg-background-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold flex-1 border border-border-light dark:border-border-dark ">
              <span className="material-symbols-outlined text-base">layers</span>
              {collection.cardCount}
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                             bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                             text-xs font-semibold rounded-lg whitespace-nowrap 
                             opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                             pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300">
                {collection.cardCount} {pluralize(collection.cardCount, 'flashcard', 'flashcards')}
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                             w-0 h-0 border-l-[6px] border-l-transparent 
                             border-r-[6px] border-r-transparent 
                             border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
              </span>
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-auto w-full flex flex-col gap-2.5">
          {/* Visualizar baralhos - roxo preenchido */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate();
            }}
            className="w-full text-center py-2.5 px-4 bg-primary text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">view_list</span>
            Visualizar baralhos
          </button>

          {/* Editar - roxo transparente */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEditModal(true);
            }}
            className="w-full text-center py-2.5 px-4 border-2 border-primary/30 dark:border-primary/40 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Editar coleção
          </button>
        </div>
      </div>

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
    </>
  );
}

