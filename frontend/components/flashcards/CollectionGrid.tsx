'use client';

import { CollectionWithStats } from '@/types/flashcards';
import { CollectionCard } from './CollectionCard';

interface CollectionGridProps {
  collections: CollectionWithStats[];
  onDeleted?: () => void;
  onUpdated?: () => void;
}

export function CollectionGrid({ collections, onDeleted, onUpdated }: CollectionGridProps) {
  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Nenhuma coleção encontrada
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {collections.map((collection, index) => (
        <CollectionCard 
          key={collection.id || `collection-${index}`} 
          collection={collection}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}
