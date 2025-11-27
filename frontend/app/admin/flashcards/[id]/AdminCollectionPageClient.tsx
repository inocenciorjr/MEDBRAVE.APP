'use client';

import { DeckList } from '@/components/flashcards/DeckList';
import { CollectionHeader } from '@/components/flashcards/CollectionHeader';
import { getCollection, getDecksByCollection } from '@/lib/api/flashcards';
import { useEffect, useState } from 'react';
import { Collection, Deck } from '@/types/flashcards';

interface AdminCollectionPageClientProps {
  id: string;
}

export default function AdminCollectionPageClient({ id }: AdminCollectionPageClientProps) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const [collectionData, decksData] = await Promise.all([
          getCollection(id),
          getDecksByCollection(id),
        ]);
        
        setCollection(collectionData);
        setDecks(decksData);
      } catch (err) {
        console.error('Error loading collection:', err);
        setError('Erro ao carregar coleção');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Carregando coleção oficial...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error || 'Coleção não encontrada'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl dark:shadow-dark-xl p-6 sm:p-8 md:p-10">
            <a 
              href="/admin/flashcards"
              className="flex items-center text-text-light-secondary dark:text-text-dark-secondary hover:text-primary mb-6 transition-colors"
            >
              <span className="material-symbols-outlined mr-2">arrow_back</span>
              Voltar para Coleções Oficiais
            </a>

            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">verified</span>
                <p className="text-blue-800 dark:text-blue-200 font-medium">Coleção Oficial MedBrave</p>
              </div>
              <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">
                Esta coleção aparecerá na aba Comunidade quando marcada como pública
              </p>
            </div>

            <CollectionHeader collection={collection} />

            <div className="mt-8">
              <DeckList decks={decks} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
