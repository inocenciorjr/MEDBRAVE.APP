import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { 
  BookOpen, Play, Edit, Trash2, Eye, EyeOff, 
  Clock, TrendingUp, Users, Calendar, Heart, Tag, X
} from 'lucide-react';
import { flashcardService } from '../../services/flashcardService';
import CardEditor from '../CardEditor';
import { formatDate } from '../../utils/dateUtils';

/**
 * 🔍 COMPONENTE: Modal de Visualização de Card
 * 
 * Features:
 * - Visualização detalhada do card
 * - Estatísticas FSRS
 * - Ações rápidas (editar, duplicar, excluir)
 * - Gestão de tags inline
 * - Histórico de revisões
 * - Modo de estudo
 */
const CardViewModal = ({ 
  isOpen, 
  onClose, 
  cardId, 
  onCardUpdated, 
  onCardDeleted,
  deckId 
}) => {
  // Estados principais
  const [card, setCard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState(null);

  // Estados para edição inline de tags
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tagsLoading, setTagsLoading] = useState(false);

  // Carregar card quando modal abrir
  useEffect(() => {
    if (isOpen && cardId) {
      loadCard();
    } else {
      resetState();
    }
  }, [isOpen, cardId]);

  /**
   * 📖 Carregar dados do card
   */
  const loadCard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await flashcardService.getFlashcardById(cardId);
      
      if (response && response.id) {
        setCard(response);
      } else {
        setError('Card não encontrado');
      }
    } catch (error) {
      // Erro silencioso - exibe mensagem amigável
      setError('Erro ao carregar card');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🔄 Reset do estado
   */
  const resetState = () => {
    setCard(null);
    setShowBack(false);
    setShowEditor(false);
    setIsDeleting(false);
    setIsDuplicating(false);
    setShowDeleteConfirm(false);
    setError(null);
    setIsEditingTags(false);
    setNewTag('');
    setTagsLoading(false);
  };

  /**
   * ✏️ Abrir editor
   */
  const handleEdit = () => {
    setShowEditor(true);
  };

  /**
   * 💾 Card atualizado
   */
  const handleCardSaved = (updatedCard) => {
    setCard(updatedCard);
    setShowEditor(false);
    onCardUpdated && onCardUpdated(updatedCard);
  };

  /**
   * 🔄 Duplicar card
   */
  const handleDuplicate = async () => {
    try {
      setIsDuplicating(true);
      const response = await flashcardService.duplicateFlashcard(cardId, {
        newDeckId: deckId
      });
      
      if (response.success) {
        onCardUpdated && onCardUpdated(response.data);
        onClose();
      }
    } catch (error) {
      // Erro silencioso - exibe mensagem amigável
      setError('Erro ao duplicar card');
    } finally {
      setIsDuplicating(false);
    }
  };

  /**
   * 🗑️ Excluir card
   */
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await flashcardService.deleteFlashcard(cardId);
      
      onCardDeleted && onCardDeleted(cardId);
      onClose();
    } catch (error) {
      // Erro silencioso - exibe mensagem amigável
      setError('Erro ao excluir card');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  /**
   * 🏷️ Adicionar tag
   */
  const handleAddTag = async () => {
    if (!newTag.trim() || card.tags?.includes(newTag.trim().toLowerCase())) {
      return;
    }

    try {
      setTagsLoading(true);
      const updatedTags = [...(card.tags || []), newTag.trim().toLowerCase()];
      
      const response = await flashcardService.updateFlashcardTags(cardId, updatedTags);
      
      if (response.success) {
        setCard(prev => ({ ...prev, tags: updatedTags }));
        setNewTag('');
        onCardUpdated && onCardUpdated({ ...card, tags: updatedTags });
      }
    } catch (error) {
      // Erro silencioso - exibe mensagem amigável
      setError('Erro ao adicionar tag');
    } finally {
      setTagsLoading(false);
    }
  };

  /**
   * 🏷️ Remover tag
   */
  const handleRemoveTag = async (tagToRemove) => {
    try {
      setTagsLoading(true);
      const updatedTags = card.tags.filter(tag => tag !== tagToRemove);
      
      const response = await flashcardService.updateFlashcardTags(cardId, updatedTags);
      
      if (response.success) {
        setCard(prev => ({ ...prev, tags: updatedTags }));
        onCardUpdated && onCardUpdated({ ...card, tags: updatedTags });
      }
    } catch (error) {
      // Erro silencioso - exibe mensagem amigável
      setError('Erro ao remover tag');
    } finally {
      setTagsLoading(false);
    }
  };

  /**
   * 📊 Calcular estatísticas do card
   */
  const getCardStats = () => {
    if (!card) return null;

    const difficulty = card.difficulty || 0;
      const stability = card.stability || 0;
    const reviews = card.reviewCount || 0;
    const lastReviewed = card.lastReviewedAt;

    return {
      difficulty: {
        value: Math.round(difficulty * 100),
        label: difficulty < 0.3 ? 'Fácil' : difficulty < 0.7 ? 'Médio' : 'Difícil',
        color: difficulty < 0.3 ? 'green' : difficulty < 0.7 ? 'yellow' : 'red'
      },
      stability: {
        value: Math.round(stability),
        label: stability > 30 ? 'Alta' : stability > 7 ? 'Média' : 'Baixa',
        color: stability > 30 ? 'green' : stability > 7 ? 'yellow' : 'red'
      },
      stability: {
        value: Math.round(stability),
        label: stability > 30 ? 'Alta' : stability > 10 ? 'Média' : 'Baixa',
        color: stability > 30 ? 'green' : stability > 10 ? 'yellow' : 'red'
      },
      reviews,
      lastReviewed: lastReviewed ? formatDate(lastReviewed) : 'Nunca'
    };
  };

  /**
   * ⌨️ Atalhos de teclado
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          if (!showEditor && !showDeleteConfirm) {
            onClose();
          }
          break;
        case ' ':
          if (!showEditor && !isEditingTags) {
            e.preventDefault();
            setShowBack(!showBack);
          }
          break;
        case 'e':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleEdit();
          }
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleDuplicate();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showBack, showEditor, showDeleteConfirm, isEditingTags]);

  const stats = getCardStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Visualizar Card</DialogTitle>
              {card && (
                <DialogDescription>
                  ID: {card.id} • Criado em {formatDate(card.createdAt)}
                </DialogDescription>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Ações rápidas */}
              {card && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    title="Editar (Ctrl+E)"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                    title="Duplicar (Ctrl+D)"
                  >
                    {isDuplicating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{borderColor: 'var(--color-primary)'}}></div>
                    ) : (
                      <Edit className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[70vh]">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: 'var(--color-primary)'}}></div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="rounded-lg p-4" style={{
                backgroundColor: 'var(--color-red-light)',
                borderColor: 'var(--color-red-border)',
                color: 'var(--color-red-dark)'
              }}>
                <p>{error}</p>
              </div>
            </div>
          ) : card ? (
            <div className="p-6 space-y-6">
              {/* Card Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Frente e Verso */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Frente */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                        Frente
                      </h3>
                    </div>
                    <div className="p-4 rounded-lg min-h-[120px]" style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      border: '1px solid'
                    }}>
                      <div className="prose max-w-none" style={{color: 'var(--text-primary)'}}>
                        <div dangerouslySetInnerHTML={{ 
                          __html: card.front?.replace(/\n/g, '<br>') || 'Sem conteúdo'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Verso */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                        Verso
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBack(!showBack)}
                        title="Alternar verso (Espaço)"
                      >
                        {showBack ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showBack ? 'Ocultar' : 'Mostrar'}
                      </Button>
                    </div>
                    
                    <div className={`p-4 rounded-lg min-h-[160px] transition-all duration-300 ${
                      showBack ? 'opacity-100' : 'opacity-50 blur-sm'
                    }`} style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      border: '1px solid'
                    }}>
                      <div className="prose max-w-none" style={{color: 'var(--text-primary)'}}>
                        <div dangerouslySetInnerHTML={{ 
                          __html: card.back?.replace(/\n/g, '<br>') || 'Sem conteúdo'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                        Tags
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingTags(!isEditingTags)}
                      >
                        {isEditingTags ? 'Concluir' : 'Editar'}
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {card.tags && card.tags.length > 0 ? (
                        card.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="inline-flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                            {isEditingTags && (
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                disabled={tagsLoading}
                                className="ml-1 hover:opacity-70 disabled:opacity-50"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        ))
                      ) : (
                        <span style={{color: 'var(--text-muted)'}} className="italic">Nenhuma tag</span>
                      )}
                    </div>

                    {/* Adicionar nova tag */}
                    {isEditingTags && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Nova tag..."
                          className="flex-1 px-3 py-2 text-sm border rounded-md"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)'
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={handleAddTag}
                          disabled={!newTag.trim() || tagsLoading}
                        >
                          Adicionar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estatísticas FSRS */}
                {stats && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                      Estatísticas FSRS
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                        <div className="text-sm" style={{color: 'var(--text-secondary)'}}>Dificuldade</div>
                        <div className="text-xl font-bold" style={{color: `var(--color-${stats.difficulty.color})`}}>
                          {stats.difficulty.value}%
                        </div>
                        <div className="text-xs" style={{color: 'var(--text-muted)'}}>
                          {stats.difficulty.label}
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                        <div className="text-sm" style={{color: 'var(--text-secondary)'}}>Estabilidade</div>
                        <div className="text-xl font-bold" style={{color: `var(--color-${stats.stability.color})`}}>
                          {stats.stability.value} dias
                        </div>
                        <div className="text-xs" style={{color: 'var(--text-muted)'}}>
                          {stats.stability.label}
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                        <div className="text-sm" style={{color: 'var(--text-secondary)'}}>Estabilidade</div>
                        <div className="text-xl font-bold" style={{color: `var(--color-${stats.stability.color})`}}>
                          {stats.stability.value} dias
                        </div>
                        <div className="text-xs" style={{color: 'var(--text-muted)'}}>
                          {stats.stability.label}
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                        <div className="text-sm" style={{color: 'var(--text-secondary)'}}>Revisões</div>
                        <div className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>
                          {stats.reviews}
                        </div>
                        <div className="text-xs" style={{color: 'var(--text-muted)'}}>
                          Última: {stats.lastReviewed}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </ScrollArea>

        {/* Modal de confirmação de exclusão */}
        {showDeleteConfirm && (
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir este card? Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Editor de card */}
        {showEditor && (
          <Dialog open={showEditor} onOpenChange={() => setShowEditor(false)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
              <CardEditor
                cardId={cardId}
                deckId={deckId}
                onSave={handleCardSaved}
                onCancel={() => setShowEditor(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CardViewModal;