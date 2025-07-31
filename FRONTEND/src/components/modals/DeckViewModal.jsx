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
  Clock, TrendingUp, Users, Calendar
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

const DeckViewModal = ({ isOpen, deck, onClose, onDeckUpdated }) => {
  const [loading, setLoading] = useState(false);

  if (!deck) return null;

  const formatDateSafe = (date) => {
    if (!date) return 'Nunca';
    return formatDate(date);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': 
        return {
          backgroundColor: 'var(--color-green-light)',
          color: 'var(--color-green-dark)'
        };
      case 'medium': 
        return {
          backgroundColor: 'var(--color-yellow-light)',
          color: 'var(--color-yellow-dark)'
        };
      case 'hard': 
        return {
          backgroundColor: 'var(--color-red-light)',
          color: 'var(--color-red-dark)'
        };
      default: 
        return {
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)'
        };
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Médio';
      case 'hard': return 'Difícil';
      default: return 'Não definido';
    }
  };

  const handleStartStudy = () => {
    // TODO: Implementar navegação para estudo
  };

  const handleEditDeck = () => {
    // TODO: Implementar edição
  };

  const handleDeleteDeck = () => {
    // TODO: Implementar confirmação e deleção
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{
              backgroundColor: 'var(--color-purple-light)'
            }}>
              <BookOpen className="w-6 h-6" style={{color: 'var(--color-purple)'}} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{deck.name}</DialogTitle>
              <DialogDescription>
                Visualizar detalhes e estatísticas do deck
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Badges de status */}
          <div className="flex flex-wrap gap-2">
            <Badge style={getDifficultyColor(deck.difficulty)}>
              {getDifficultyLabel(deck.difficulty)}
            </Badge>
            <Badge variant={deck.isPublic ? 'default' : 'secondary'}>
              {deck.isPublic ? (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Público
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Privado
                </>
              )}
            </Badge>
            {deck.dueCards > 0 && (
              <Badge variant="destructive">
                {deck.dueCards} para revisar
              </Badge>
            )}
          </div>

          {/* Descrição */}
          {deck.description && (
            <div className="space-y-2">
              <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>
                Descrição
              </h3>
              <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                {deck.description}
              </p>
            </div>
          )}

          {/* Estatísticas */}
          <div className="space-y-3">
            <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>
              Estatísticas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg p-4 text-center" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div className="text-2xl font-bold" style={{color: 'var(--color-blue)'}}>
                  {deck.cardCount || 0}
                </div>
                <div className="text-xs" style={{color: 'var(--text-secondary)'}}>
                  Total de Cards
                </div>
              </div>
              <div className="rounded-lg p-4 text-center" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div className="text-2xl font-bold" style={{color: 'var(--color-green)'}}>
                  {deck.studiedCards || 0}
                </div>
                <div className="text-xs" style={{color: 'var(--text-secondary)'}}>
                  Estudados
                </div>
              </div>
              <div className="rounded-lg p-4 text-center" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div className="text-2xl font-bold" style={{color: 'var(--color-orange)'}}>
                  {deck.dueCards || 0}
                </div>
                <div className="text-xs" style={{color: 'var(--text-secondary)'}}>
                  Para Revisar
                </div>
              </div>
              <div className="rounded-lg p-4 text-center" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div className="text-2xl font-bold" style={{color: 'var(--color-purple)'}}>
                  {deck.accuracy ? `${Math.round(deck.accuracy)}%` : '0%'}
                </div>
                <div className="text-xs" style={{color: 'var(--text-secondary)'}}>
                  Precisão
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {deck.tags && deck.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {deck.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Informações adicionais */}
          <div className="space-y-3">
            <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>
              Informações
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                <span style={{color: 'var(--text-secondary)'}}>
                  Criado em: {formatDateSafe(deck.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                <span style={{color: 'var(--text-secondary)'}}>
                  Última revisão: {formatDateSafe(deck.lastReviewed)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                <span style={{color: 'var(--text-secondary)'}}>
                  Progresso: {deck.progress || 0}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                <span style={{color: 'var(--text-secondary)'}}>
                  Autor: {deck.authorName || 'Você'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleStartStudy}
              className="flex items-center gap-2"
              disabled={!deck.cardCount || deck.cardCount === 0}
            >
              <Play className="w-4 h-4" />
              Estudar Agora
            </Button>
            <Button
              variant="outline"
              onClick={handleEditDeck}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteDeck}
              className="flex items-center gap-2"
              style={{color: 'var(--color-red)'}}
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeckViewModal;