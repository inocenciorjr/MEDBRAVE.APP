'use client';

import { useState, useEffect } from 'react';
import { Deck, Flashcard } from '@/types/flashcards';
import { useRouter } from 'next/navigation';
import { PreviewModal } from './PreviewModal';
import { EditDeckModal } from './EditDeckModal';
import { getFlashcardsByDeck } from '@/lib/api/flashcards';
import { updateFlashcard, createFlashcard, deleteFlashcard } from '@/services/flashcardService';
import { useToast } from '@/lib/contexts/ToastContext';
import { getDeckStats } from '@/lib/services/deckSessionService';

interface DeckCardProps {
  deck: Deck;
  onDeckUpdated?: () => void;
  canEdit?: boolean; // Se o usuário pode editar (validado pelo backend)
  collectionInfo?: {
    isOfficial?: boolean;
    isFromCommunity?: boolean;
    authorName?: string;
  };
}

export function DeckCard({ deck, onDeckUpdated, canEdit = true, collectionInfo }: DeckCardProps) {
  const router = useRouter();
  const toast = useToast();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deckFlashcards, setDeckFlashcards] = useState<Flashcard[]>([]);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);
  const [deckStats, setDeckStats] = useState({
    studiedCards: deck.studiedCards || 0,
    newCards: deck.newCards || deck.totalCards || 0,
    reviewCards: deck.reviewCards || 0,
  });

  // Carregar estatísticas reais do deck
  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await getDeckStats(deck.id);
        
        // Validar se stats existe e tem os campos necessários
        if (stats && typeof stats === 'object') {
          setDeckStats({
            studiedCards: stats.studiedCards ?? 0,
            // Se newCards for 0 mas totalCards existir, usar totalCards
            // Isso acontece quando ainda não há cards FSRS criados
            newCards: stats.newCards > 0 ? stats.newCards : (deck.totalCards || 0),
            reviewCards: stats.reviewCards ?? 0,
          });
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas do deck:', error);
        // Manter valores padrão em caso de erro
      }
    }

    loadStats();
  }, [deck.id, deck.totalCards]);

  const handleStartStudy = () => {
    router.push(`/flashcards/estudo/${deck.id}`);
  };

  const handlePreview = async () => {
    setShowPreviewModal(true);
    await loadFlashcards();
  };

  const handleEdit = async () => {
    setShowEditModal(true);
    await loadFlashcards();
  };

  const loadFlashcards = async () => {
    if (deckFlashcards.length === 0 && !loadingFlashcards) {
      setLoadingFlashcards(true);
      try {
        const flashcards = await getFlashcardsByDeck(deck.id);
        setDeckFlashcards(flashcards);
      } catch (error) {
        console.error('Error loading flashcards:', error);
        toast.error('Erro ao carregar flashcards');
      } finally {
        setLoadingFlashcards(false);
      }
    }
  };

  const handleSaveEdits = async (updatedFlashcards: Flashcard[]) => {
    try {
      // Processar cada flashcard
      for (const card of updatedFlashcards) {
        if (card.id === '' || card.id.startsWith('new-')) {
          // Criar novo flashcard
          await createFlashcard({
            deckId: deck.id,
            frontContent: card.front,
            backContent: card.back,
          });
        } else {
          // Verificar se o card foi modificado comparando com o original
          const originalCard = deckFlashcards.find(c => c.id === card.id);
          if (originalCard) {
            const wasModified =
              originalCard.front !== card.front ||
              originalCard.back !== card.back;

            // Só atualizar se foi modificado
            if (wasModified) {
              await updateFlashcard(card.id, {
                frontContent: card.front,
                backContent: card.back,
              });
            }
          }
        }
      }

      // Deletar flashcards removidos
      const removedCards = deckFlashcards.filter(
        oldCard => !updatedFlashcards.find(newCard => newCard.id === oldCard.id)
      );
      for (const card of removedCards) {
        await deleteFlashcard(card.id);
      }

      // Recarregar flashcards
      setDeckFlashcards([]);
      await loadFlashcards();

      if (onDeckUpdated) {
        onDeckUpdated();
      }
    } catch (error: any) {
      console.error('Error saving edits:', error);
      
      // Tratar erros de permissão
      if (error.message?.includes('403') || error.message?.includes('Unauthorized')) {
        toast.error('Você não tem permissão para editar este deck');
      } else if (error.message?.includes('404')) {
        toast.error('Deck ou flashcard não encontrado');
      } else {
        toast.error('Erro ao salvar alterações');
      }
      
      throw error;
    }
  };

  const handleStartStudyFromModal = () => {
    setShowPreviewModal(false);
    handleStartStudy();
  };

  return (
    <>
      {/* Container com efeito de baralho empilhado */}
      <div className="relative group h-full">
        {/* Carta de fundo 2 (mais atrás) */}
        <div className="absolute inset-0 bg-surface-light dark:bg-gray-800 rounded-xl 
                      border border-border-light dark:border-gray-700 
                      transform translate-y-3 translate-x-3 opacity-30 dark:opacity-40
                      group-hover:translate-y-4 group-hover:translate-x-4 
                      transition-all duration-200 z-0 shadow-md dark:shadow-lg" />
        
        {/* Carta de fundo 1 (meio) */}
        <div className="absolute inset-0 bg-surface-light dark:bg-gray-700 rounded-xl 
                      border border-border-light dark:border-gray-600 
                      transform translate-y-1.5 translate-x-1.5 opacity-50 dark:opacity-60
                      group-hover:translate-y-2 group-hover:translate-x-2 
                      transition-all duration-200 z-0 shadow-md dark:shadow-lg" />
        
        {/* Carta principal (frente) */}
        <div className="relative bg-surface-light dark:bg-surface-dark rounded-xl 
                      shadow-lg dark:shadow-dark-xl flex flex-col justify-between h-full 
                      border border-border-light dark:border-border-dark 
                      hover:shadow-2xl dark:hover:shadow-dark-2xl 
                      transition-all duration-200 hover:-translate-y-2 z-10">
        {/* Header do card */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-6 py-3 rounded-t-xl border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">collections_bookmark</span>
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Deck</span>
          </div>
        </div>

        <div className="p-6 pb-0">
          {/* Título com altura fixa e line-clamp */}
          <div className="min-h-[5rem] mb-4 text-center relative group bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/15 rounded-lg flex items-center justify-center px-4 py-3">
            <h2 
              className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary leading-relaxed"
              style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'normal',
                overflowWrap: 'break-word'
              }}
            >
              {deck.name}
            </h2>
            
            {/* Tooltip - só aparece se o texto for truncado */}
            {deck.name.length > 60 && (
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-2 
                             bg-surface-dark dark:bg-surface-light text-text-dark-primary dark:text-text-light-primary 
                             text-xs font-medium rounded-lg w-[400px] text-center line-clamp-2
                             opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                             pointer-events-none z-[9999] shadow-xl border-2 border-border-dark dark:border-border-light">
                {deck.name}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-[-2px]
                             w-0 h-0 border-l-[6px] border-l-transparent 
                             border-r-[6px] border-r-transparent 
                             border-b-[6px] border-b-surface-dark dark:border-b-surface-light"></span>
              </span>
            )}
          </div>
          
          {/* Institution com altura fixa */}
          <div className="min-h-[1.25rem] mb-4 text-center">
            {deck.institution && deck.institution !== deck.name && (
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary truncate">
                {deck.institution}
              </p>
            )}
          </div>

          {/* Tags com altura fixa */}
          <div className="min-h-[2rem] mb-4 flex items-start gap-2 flex-wrap justify-center">
            {deck.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="bg-primary/10 dark:bg-primary/20 text-primary text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {deck.tags.length > 2 && (
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                +{deck.tags.length - 2}
              </span>
            )}
          </div>

          {/* Stats com espaçamento melhor */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Estudados
              </span>
              <span className="bg-background-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary text-xs font-semibold px-3 py-1 rounded-full min-w-[65px] text-center border border-border-light dark:border-border-dark">
                {deckStats.studiedCards}/{deck.totalCards}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Revisão
              </span>
              <span className="bg-background-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary text-xs font-semibold px-3 py-1 rounded-full min-w-[65px] text-center border border-border-light dark:border-border-dark">
                {deckStats.reviewCards}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Novos
              </span>
              <span className="bg-background-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary text-xs font-semibold px-3 py-1 rounded-full min-w-[65px] text-center border border-border-light dark:border-border-dark">
                {deckStats.newCards}
              </span>
            </div>
          </div>
        </div>

        <div className={`mt-8 pt-6 pb-8 border-t border-border-light dark:border-border-dark flex gap-3 ${canEdit ? 'justify-center' : 'justify-between px-6'}`}>
          <button
            onClick={handlePreview}
            className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:border-primary hover:text-primary rounded-lg h-10 px-4 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-lg">visibility</span>
            <span className="text-sm font-medium">Preview</span>
          </button>

          {canEdit && (
            <button
              onClick={handleEdit}
              className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:border-primary hover:text-primary rounded-lg h-10 px-4 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-lg">edit_note</span>
              <span className="text-sm font-medium">Editar</span>
            </button>
          )}

          <button
            onClick={handleStartStudy}
            className="bg-primary text-white rounded-lg h-10 w-10 border-2 border-transparent flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-opacity-90 transition-all hover:shadow-[0_4px_12px_0_rgba(0,194,168,0.3)] transform hover:-translate-y-0.5"
            aria-label="Estudar"
          >
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        deckName={deck.name}
        deckTags={deck.tags}
        flashcards={deckFlashcards}
        onStartStudy={handleStartStudyFromModal}
        onCreateFlashcard={canEdit ? () => {
          setShowPreviewModal(false);
          setTimeout(() => setShowEditModal(true), 350);
        } : undefined}
        canEdit={canEdit}
      />

      {/* Edit Modal */}
      <EditDeckModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        deckId={deck.id}
        deckName={deck.name}
        flashcards={deckFlashcards}
        onSave={handleSaveEdits}
      />
    </>
  );
}
