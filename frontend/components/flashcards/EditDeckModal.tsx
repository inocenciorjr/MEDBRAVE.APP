'use client';

import { useState, useEffect } from 'react';
import { Flashcard } from '@/types/flashcards';
import RichTextEditor from '../admin/ui/RichTextEditor';
import { useToast } from '@/lib/contexts/ToastContext';
import { SearchInput } from './SearchInput';
import { EmptyDeckState } from './EmptyDeckState';

interface EditDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string;
  deckName: string;
  flashcards: Flashcard[];
  onSave: (updatedFlashcards: Flashcard[]) => Promise<void>;
}

interface EditingCard {
  id: string;
  front: string;
  back: string;
  isNew?: boolean;
}

export function EditDeckModal({
  isOpen,
  onClose,
  deckId,
  deckName,
  flashcards,
  onSave,
}: EditDeckModalProps) {
  const toast = useToast();
  const [cards, setCards] = useState<EditingCard[]>([]);
  const [allCards, setAllCards] = useState<EditingCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingField, setEditingField] = useState<{ cardId: string; field: 'front' | 'back' } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Map<string, { front: boolean; back: boolean }>>(new Map());
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [originalCards, setOriginalCards] = useState<EditingCard[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const CARDS_PER_PAGE = 100;

  useEffect(() => {
    if (isOpen) {
      const editableCards = flashcards.map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
      }));
      setAllCards(editableCards);
      setCards(editableCards);
      setOriginalCards(editableCards); // Guardar estado original
      setSearchTerm('');
      setCurrentPage(1);
      setValidationErrors(new Map()); // Limpar validação
      setHasUnsavedChanges(false);
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
        setEditingField(null);
        setValidationErrors(new Map()); // Limpar ao fechar
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, flashcards]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setCards(allCards);
      // Não resetar a página quando não há busca
      return;
    }

    const filtered = allCards.filter(card => {
      const searchLower = searchTerm.toLowerCase();
      const frontText = card.front.replace(/<[^>]*>/g, '').toLowerCase();
      const backText = card.back.replace(/<[^>]*>/g, '').toLowerCase();
      return frontText.includes(searchLower) || backText.includes(searchLower);
    });
    
    setCards(filtered);
    setCurrentPage(1); // Só resetar quando há busca ativa
  }, [searchTerm, allCards]);

  const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);
  const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
  const endIndex = startIndex + CARDS_PER_PAGE;
  const paginatedCards = cards.slice(startIndex, endIndex);

  const handleCloseWithAnimation = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
      return;
    }
    
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };
  
  const handleForceClose = () => {
    // Restaurar estado original
    setAllCards(originalCards);
    setCards(originalCards);
    setHasUnsavedChanges(false);
    setShowUnsavedChangesModal(false);
    
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleAddCard = (cardId: string, position: 'before' | 'after') => {
    const newCard: EditingCard = {
      id: `new-${Date.now()}`,
      front: '',
      back: '',
      isNew: true,
    };
    
    // Encontrar o índice no allCards (não no paginatedCards)
    const actualIndex = allCards.findIndex(c => c.id === cardId);
    const insertIndex = position === 'after' ? actualIndex + 1 : actualIndex;
    
    // Calcular em qual página o novo card vai ficar
    const newCardPage = Math.floor(insertIndex / CARDS_PER_PAGE) + 1;
    
    // Atualizar os cards
    const newCards = [...allCards];
    newCards.splice(insertIndex, 0, newCard);
    setAllCards(newCards);
    
    // Se não houver busca ativa, atualizar cards também
    if (!searchTerm.trim()) {
      setCards(newCards);
    }
    
    // Mudar para a página onde o card foi adicionado
    setCurrentPage(newCardPage);
    
    // Abrir o editor do campo front automaticamente
    setEditingField({ cardId: newCard.id, field: 'front' });
    
    // Scroll para o novo card após um delay maior para garantir que renderizou
    setTimeout(() => {
      const cardElement = document.getElementById(`card-${newCard.id}`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Destacar o card brevemente
        cardElement.classList.add('ring-4', 'ring-primary', 'ring-opacity-50');
        setTimeout(() => {
          cardElement.classList.remove('ring-4', 'ring-primary', 'ring-opacity-50');
        }, 2000);
      }
    }, 300);
  };

  const handleDeleteCard = (cardId: string) => {
    setCardToDelete(cardId);
  };

  const confirmDelete = () => {
    if (cardToDelete) {
      const newAllCards = allCards.filter(c => c.id !== cardToDelete);
      setAllCards(newAllCards);
      setCards(newAllCards);
      setCardToDelete(null);
      setHasUnsavedChanges(true);
      toast.success('Flashcard removido');
    }
  };

  const handleEditField = (cardId: string, field: 'front' | 'back') => {
    setEditingField({ cardId, field });
  };

  const handleUpdateField = (cardId: string, field: 'front' | 'back', value: string) => {
    const updateCards = (cardsList: EditingCard[]) =>
      cardsList.map(card => card.id === cardId ? { ...card, [field]: value } : card);
    
    const updatedAllCards = updateCards(allCards);
    setAllCards(updatedAllCards);
    setCards(updateCards(cards));
    
    // Detectar mudanças
    setHasUnsavedChanges(true);
    
    // Atualizar validação em tempo real
    if (validationErrors.size > 0) {
      const newErrors = new Map(validationErrors);
      const cardError = newErrors.get(cardId);
      
      if (cardError) {
        // Atualizar o campo específico
        cardError[field] = !value.trim();
        
        // Se ambos os campos estão preenchidos, remover o erro
        if (!cardError.front && !cardError.back) {
          newErrors.delete(cardId);
        } else {
          newErrors.set(cardId, cardError);
        }
        
        setValidationErrors(newErrors);
      }
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deckId', deckId);

      const response = await fetch('/api/flashcards/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao fazer upload da imagem');
      throw error;
    }
  };

  const validateCards = () => {
    const errors = new Map<string, { front: boolean; back: boolean }>();
    
    allCards.forEach(card => {
      const frontEmpty = !card.front.trim();
      const backEmpty = !card.back.trim();
      
      if (frontEmpty || backEmpty) {
        errors.set(card.id, { front: frontEmpty, back: backEmpty });
      }
    });
    
    setValidationErrors(errors);
    return errors.size === 0;
  };

  const handleSave = () => {
    if (!validateCards()) {
      setShowValidationModal(true);
      return;
    }
    setShowConfirmSave(true);
  };

  const confirmSave = async () => {
    try {
      setIsSaving(true);
      
      // Converter de volta para Flashcard[]
      const updatedFlashcards: Flashcard[] = cards.map(card => ({
        id: card.isNew ? '' : card.id,
        front: card.front,
        back: card.back,
        deckId: deckId,
        breadcrumb: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isHtml: true,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
      }));

      await onSave(updatedFlashcards);
      toast.success('Alterações salvas com sucesso!');
      handleCloseWithAnimation();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
      setShowConfirmSave(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleCloseWithAnimation}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[90%] lg:w-[80%] xl:w-[70%] 2xl:w-[60%] bg-surface-light dark:bg-surface-dark shadow-2xl dark:shadow-dark-2xl z-[60] transform transition-transform duration-300 ease-out flex flex-col ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-1 truncate">
                Editar Deck: {deckName}
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {cards.length} flashcards {searchTerm && `(filtrados de ${allCards.length} total)`}
              </p>
            </div>

            <button
              onClick={handleCloseWithAnimation}
              className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl 
                       transition-all duration-200 hover:scale-110 group ml-4 flex-shrink-0"
              aria-label="Fechar"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                             group-hover:text-primary transition-colors">
                close
              </span>
            </button>
          </div>

          {/* Validation Indicators - Compact */}
          {validationErrors.size > 0 && (
            <div className="px-6 py-4 bg-red-50/50 dark:bg-red-900/10 border-b-2 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-500/10 dark:bg-red-500/20 rounded-lg 
                              flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-red-500 text-xl">
                    error
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    {validationErrors.size} flashcard{validationErrors.size > 1 ? 's' : ''} com problemas
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    Clique nos números para navegar
                  </p>
                </div>
                
                {/* Only show error cards - compact */}
                <div className="flex flex-wrap gap-2 max-w-md">
                  {Array.from(validationErrors.keys()).slice(0, 10).map(cardId => {
                    const cardIndex = allCards.findIndex(c => c.id === cardId);
                    const error = validationErrors.get(cardId);
                    
                    return (
                      <button
                        key={cardId}
                        onClick={() => {
                          // Calcular em qual página o card está
                          const cardPage = Math.floor(cardIndex / CARDS_PER_PAGE) + 1;
                          
                          // Mudar para a página correta
                          setCurrentPage(cardPage);
                          
                          // Scroll após um delay para garantir que renderizou
                          setTimeout(() => {
                            const cardElement = document.getElementById(`card-${cardId}`);
                            if (cardElement) {
                              cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 100);
                        }}
                        className="relative group px-3 py-2 rounded-lg font-semibold text-sm
                                 bg-red-500 text-white hover:bg-red-600
                                 transition-all duration-200 hover:scale-110 shadow-md hover:shadow-lg"
                      >
                        {cardIndex + 1}
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 
                                      bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg 
                                      opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                                      pointer-events-none whitespace-nowrap shadow-xl z-50">
                          Faltam: {error?.front && error?.back ? 'Pergunta e Resposta' : error?.front ? 'Pergunta' : 'Resposta'}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 
                                        border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                        </div>
                      </button>
                    );
                  })}
                  {validationErrors.size > 10 && (
                    <span className="px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-500">
                      +{validationErrors.size - 10} mais
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search and Pagination */}
          <div className="px-6 py-4 border-b-2 border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="w-full sm:w-96">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar em perguntas e respostas..."
                  fullWidth
                />
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-xl bg-surface-light dark:bg-surface-dark border-2 border-border-light 
                             dark:border-border-dark disabled:opacity-50 disabled:cursor-not-allowed 
                             hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 
                             transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-xl 
                             dark:shadow-dark-lg dark:hover:shadow-dark-xl"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <span className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-xl bg-surface-light dark:bg-surface-dark border-2 border-border-light 
                             dark:border-border-dark disabled:opacity-50 disabled:cursor-not-allowed 
                             hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 
                             transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-xl 
                             dark:shadow-dark-lg dark:hover:shadow-dark-xl"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
            
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-3 pl-1">
              Mostrando {startIndex + 1}-{Math.min(endIndex, cards.length)} de {cards.length} flashcards
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {cards.length === 0 && !searchTerm ? (
              <EmptyDeckState 
                onCreateFlashcard={() => {
                  const newCard: EditingCard = {
                    id: `new-${Date.now()}`,
                    front: '',
                    back: '',
                    isNew: true,
                  };
                  setAllCards([newCard]);
                  setCards([newCard]);
                  setCurrentPage(1);
                  setEditingField({ cardId: newCard.id, field: 'front' });
                  
                  // Scroll para o novo card
                  setTimeout(() => {
                    const cardElement = document.getElementById(`card-${newCard.id}`);
                    if (cardElement) {
                      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
                isPreview={false}
              />
            ) : (
            <div className="space-y-6">
              {paginatedCards.map((card, index) => (
                <div
                  key={card.id}
                  id={`card-${card.id}`}
                  className="border-2 border-border-light dark:border-border-dark rounded-xl p-5 
                           bg-gradient-to-br from-surface-light to-background-light 
                           dark:from-surface-dark dark:to-background-dark
                           shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                           transition-all duration-300 hover:scale-[1.01] hover:border-primary/30"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {startIndex + index + 1}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                        Flashcard
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <button
                          onClick={() => handleAddCard(card.id, 'before')}
                          className="group relative p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 
                                   rounded-xl transition-all duration-200 hover:scale-110 
                                   border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700
                                   shadow-md hover:shadow-lg"
                        >
                          <span className="material-symbols-outlined text-lg">arrow_upward</span>
                          {/* Tooltip */}
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                                       bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                                       text-xs font-semibold rounded-lg whitespace-nowrap 
                                       opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                                       pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300">
                            Adicionar card acima
                            <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                                         w-0 h-0 border-l-[6px] border-l-transparent 
                                         border-r-[6px] border-r-transparent 
                                         border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => handleAddCard(card.id, 'after')}
                        className="group relative p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 
                                 rounded-xl transition-all duration-200 hover:scale-110 
                                 border-2 border-transparent hover:border-green-300 dark:hover:border-green-700
                                 shadow-md hover:shadow-lg"
                      >
                        <span className="material-symbols-outlined text-lg">arrow_downward</span>
                        {/* Tooltip */}
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                                     bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                                     text-xs font-semibold rounded-lg whitespace-nowrap 
                                     opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                                     pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300">
                          Adicionar card abaixo
                          <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                                       w-0 h-0 border-l-[6px] border-l-transparent 
                                       border-r-[6px] border-r-transparent 
                                       border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="group relative p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 
                                 rounded-xl transition-all duration-200 hover:scale-110
                                 border-2 border-transparent hover:border-red-300 dark:hover:border-red-700
                                 shadow-md hover:shadow-lg"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                        {/* Tooltip */}
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                                     bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                                     text-xs font-semibold rounded-lg whitespace-nowrap 
                                     opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                                     pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300">
                          Remover card
                          <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                                       w-0 h-0 border-l-[6px] border-l-transparent 
                                       border-r-[6px] border-r-transparent 
                                       border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Front (Question) */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">help</span>
                        <label className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                          Pergunta
                        </label>
                      </div>
                      <button
                        onClick={() => handleEditField(card.id, 'front')}
                        className="group relative p-2 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 
                                 rounded-xl transition-all duration-200 hover:scale-110 
                                 border-2 border-transparent hover:border-primary/30
                                 shadow-md hover:shadow-lg flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        <span className="text-xs font-semibold">Editar</span>
                        {/* Tooltip */}
                        <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 
                                     bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                                     text-xs font-semibold rounded-lg whitespace-nowrap 
                                     opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                                     pointer-events-none z-[9999] shadow-xl border2 border-slate-700 dark:border-slate-300">
                          Editar pergunta
                          <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                                       w-0 h-0 border-l-[6px] border-l-transparent 
                                       border-r-[6px] border-r-transparent 
                                       border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
                        </span>
                      </button>
                    </div>
                    
                    {editingField?.cardId === card.id && editingField?.field === 'front' ? (
                      <div className="border-2 border-primary/30 rounded-xl overflow-visible shadow-lg">
                        <RichTextEditor
                          value={card.front}
                          onChange={(value: string) => handleUpdateField(card.id, 'front', value)}
                          placeholder="Digite a pergunta..."
                          height="150px"
                          onImageInsert={handleImageUpload}
                        />
                      </div>
                    ) : (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none p-4 
                                 bg-background-light dark:bg-background-dark rounded-xl 
                                 border-2 border-border-light dark:border-border-dark min-h-[80px]
                                 shadow-inner hover:border-primary/20 transition-colors duration-200"
                        dangerouslySetInnerHTML={{ 
                          __html: card.front || '<p class="text-text-light-secondary dark:text-text-dark-secondary italic">Clique em "Editar" para adicionar a pergunta</p>' 
                        }}
                      />
                    )}
                  </div>

                  {/* Back (Answer) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                        <label className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                          Resposta
                        </label>
                      </div>
                      <button
                        onClick={() => handleEditField(card.id, 'back')}
                        className="group relative p-2 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 
                                 rounded-xl transition-all duration-200 hover:scale-110 
                                 border-2 border-transparent hover:border-primary/30
                                 shadow-md hover:shadow-lg flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        <span className="text-xs font-semibold">Editar</span>
                        {/* Tooltip */}
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                                     bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                                     text-xs font-semibold rounded-lg whitespace-nowrap 
                                     opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                                     pointer-events-none z-[100] shadow-xl border-2 border-slate-700 dark:border-slate-300">
                          Editar resposta
                          <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                                       w-0 h-0 border-l-[6px] border-l-transparent 
                                       border-r-[6px] border-r-transparent 
                                       border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
                        </span>
                      </button>
                    </div>
                    
                    {editingField?.cardId === card.id && editingField?.field === 'back' ? (
                      <div className="border-2 border-primary/30 rounded-xl overflow-visible shadow-lg">
                        <RichTextEditor
                          value={card.back}
                          onChange={(value: string) => handleUpdateField(card.id, 'back', value)}
                          placeholder="Digite a resposta..."
                          height="150px"
                          onImageInsert={handleImageUpload}
                        />
                      </div>
                    ) : (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none p-4 
                                 bg-background-light dark:bg-background-dark rounded-xl 
                                 border-2 border-border-light dark:border-border-dark min-h-[80px]
                                 shadow-inner hover:border-primary/20 transition-colors duration-200"
                        dangerouslySetInnerHTML={{ 
                          __html: card.back || '<p class="text-text-light-secondary dark:text-text-dark-secondary italic">Clique em "Editar" para adicionar a resposta</p>' 
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleCloseWithAnimation}
                disabled={isSaving}
                className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                         font-semibold text-text-light-primary dark:text-text-dark-primary 
                         hover:bg-surface-light dark:hover:bg-surface-dark 
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                         hover:scale-105"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl 
                         font-semibold hover:bg-primary/90 transition-all duration-200 
                         shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed 
                         hover:scale-105 disabled:hover:scale-100"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">save</span>
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedChangesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl dark:shadow-dark-2xl 
                        max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-xl 
                            flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-yellow-500 text-2xl">
                  warning
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Alterações Não Salvas
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Você tem alterações que não foram salvas. Se fechar agora, todas as mudanças serão perdidas.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnsavedChangesModal(false)}
                className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                         font-semibold text-text-light-primary dark:text-text-dark-primary 
                         hover:bg-surface-light dark:hover:bg-surface-dark 
                         transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Continuar Editando
              </button>
              <button
                onClick={handleForceClose}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl 
                         font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Descartar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {cardToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl dark:shadow-dark-2xl 
                        max-w-md w-full p-6 border-2 border-border-light dark:border-border-dark
                        animate-zoom-in">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl 
                            flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">
                  warning
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Remover Flashcard?
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Esta ação é irreversível. O flashcard será removido permanentemente do deck.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setCardToDelete(null)}
                className="px-5 py-2.5 border-2 border-border-light dark:border-border-dark rounded-xl 
                         font-semibold text-text-light-primary dark:text-text-dark-primary 
                         hover:bg-surface-light dark:hover:bg-surface-dark 
                         transition-all duration-200 shadow-lg hover:shadow-xl 
                         dark:shadow-dark-lg dark:hover:shadow-dark-xl hover:scale-105"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl 
                         font-semibold transition-all duration-200 shadow-lg hover:shadow-xl
                         hover:scale-105 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                <span>Remover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl dark:shadow-dark-2xl 
                        max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b-2 border-border-light dark:border-border-dark bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/10 dark:bg-red-500/20 rounded-xl 
                              flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-red-500 text-2xl">
                    error
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
                    Problemas Encontrados
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-500">
                    {validationErrors.size} flashcard{validationErrors.size > 1 ? 's estão' : ' está'} com campos vazios
                  </p>
                </div>
              </div>
            </div>

            {/* Content - List of errors */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {Array.from(validationErrors.entries()).map(([cardId, error], idx) => {
                  const cardIndex = allCards.findIndex(c => c.id === cardId);
                  const card = allCards[cardIndex];
                  
                  return (
                    <div
                      key={cardId}
                      className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/10 dark:to-red-900/5 
                               rounded-xl border-2 border-red-200 dark:border-red-800 
                               shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                               transition-all duration-300 hover:scale-[1.01]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-lg 
                                      flex items-center justify-center font-bold text-sm shadow-md">
                          {cardIndex + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-red-700 dark:text-red-400 mb-2">
                            Flashcard #{cardIndex + 1}
                          </p>
                          <div className="space-y-1 text-sm">
                            {error.front && (
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                                <span className="material-symbols-outlined text-base">close</span>
                                <span>Pergunta está vazia</span>
                              </div>
                            )}
                            {error.back && (
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                                <span className="material-symbols-outlined text-base">close</span>
                                <span>Resposta está vazia</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                           font-semibold text-text-light-primary dark:text-text-dark-primary 
                           hover:bg-surface-light dark:hover:bg-surface-dark 
                           transition-all duration-200 shadow-lg hover:shadow-xl 
                           dark:shadow-dark-lg dark:hover:shadow-dark-xl hover:scale-105"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    
                    // Ir para o primeiro card com erro
                    const firstErrorId = Array.from(validationErrors.keys())[0];
                    const firstErrorIndex = allCards.findIndex(c => c.id === firstErrorId);
                    
                    // Calcular em qual página o card está
                    const cardPage = Math.floor(firstErrorIndex / CARDS_PER_PAGE) + 1;
                    
                    // Mudar para a página correta
                    setCurrentPage(cardPage);
                    
                    // Scroll após um delay
                    setTimeout(() => {
                      const cardElement = document.getElementById(`card-${firstErrorId}`);
                      if (cardElement) {
                        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 100);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl 
                           font-semibold hover:bg-primary/90 transition-all duration-200 
                           shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <span className="material-symbols-outlined">edit</span>
                  Revisar Flashcards
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Save Modal */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl dark:shadow-dark-2xl 
                        max-w-md w-full p-6 border-2 border-border-light dark:border-border-dark
                        animate-zoom-in">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl 
                            flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">
                  save
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Salvar Alterações?
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Todas as modificações serão salvas permanentemente. Você poderá editar novamente depois se necessário.
                </p>
              </div>
            </div>
            
            {/* Summary */}
            <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 mb-6 
                          border-2 border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary">
                  Total de flashcards:
                </span>
                <span className="text-lg font-bold text-primary">
                  {allCards.length}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmSave(false)}
                disabled={isSaving}
                className="px-5 py-2.5 border-2 border-border-light dark:border-border-dark rounded-xl 
                         font-semibold text-text-light-primary dark:text-text-dark-primary 
                         hover:bg-surface-light dark:hover:bg-surface-dark 
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                         hover:scale-105"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl 
                         font-semibold transition-all duration-200 disabled:opacity-50 
                         disabled:cursor-not-allowed shadow-lg hover:shadow-xl
                         hover:scale-105 disabled:hover:scale-100 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">check</span>
                    <span>Confirmar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
