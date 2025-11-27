'use client';

import { useState, useEffect } from 'react';
import { errorNotebookService } from '@/services/errorNotebookService';

interface ActionBarProps {
  onSummary?: () => void;
  onErrorNotebook?: () => void;
  onComments?: () => void;
  isAnswered: boolean;
  questionId: string;
}

export function ActionBar({
  onSummary,
  onErrorNotebook,
  onComments,
  isAnswered,
  questionId,
}: ActionBarProps) {
  const [isInNotebook, setIsInNotebook] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkIfInNotebook = async () => {
      try {
        setLoading(true);
        const data = await errorNotebookService.getUserEntries({});
        const exists = data.entries.some(entry => entry.question_id === questionId);
        setIsInNotebook(exists);
      } catch (error) {
        console.error('Erro ao verificar caderno:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAnswered && questionId) {
      checkIfInNotebook();
    }
  }, [isAnswered, questionId]);

  if (!isAnswered) return null;

  return (
    <div className="flex-shrink-0 bg-primary text-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] rounded-b-lg">
      <div className="flex justify-around items-center h-16">
        <button
          onClick={onSummary}
          className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Ver resumo da questão"
        >
          <span className="material-symbols-outlined">description</span>
          <span className="font-medium">Resumo</span>
        </button>

        <div className="w-px h-8 bg-white/20" />

        <button
          onClick={onErrorNotebook}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors ${
            loading ? 'opacity-50 cursor-wait' : ''
          }`}
          aria-label={isInNotebook ? 'Editar caderno de erros' : 'Adicionar ao caderno de erros'}
        >
          <span className="material-symbols-outlined">
            {isInNotebook ? 'check_circle' : 'note_add'}
          </span>
          <span className="font-medium">
            {isInNotebook ? 'Adicionado ao Caderno ✓' : 'Adicionar ao Caderno de Erros'}
          </span>
        </button>

        <div className="w-px h-8 bg-white/20" />

        <button
          onClick={onComments}
          className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Ver comentários da questão"
        >
          <span className="material-symbols-outlined">comment</span>
          <span className="font-medium">Comentários da questão</span>
        </button>
      </div>
    </div>
  );
}
