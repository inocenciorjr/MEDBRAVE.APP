'use client';

import { CollectionWithStats } from '@/types/flashcards';
import { CollectionCard } from './CollectionCard';
import { ImportAnkiButton } from './ImportAnkiButton';

interface CollectionListProps {
  collections: CollectionWithStats[];
}

export function CollectionList({ collections }: CollectionListProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">
          Suas Coleções
        </h2>
        <ImportAnkiButton />
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map(collection => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </section>

      {collections.length === 0 && (
        <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-lg">
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            Você ainda não tem coleções.
          </p>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
            Importe um arquivo Anki para começar!
          </p>
          <ImportAnkiButton />
        </div>
      )}
    </div>
  );
}
