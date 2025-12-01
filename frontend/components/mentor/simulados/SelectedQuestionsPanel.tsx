'use client';

import { useState } from 'react';
import { SelectedQuestion } from '@/app/mentor/simulados/criar/page';

interface SelectedQuestionsPanelProps {
  questions: SelectedQuestion[];
  onRemove: (questionId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function SelectedQuestionsPanel({
  questions,
  onRemove,
  onReorder,
}: SelectedQuestionsPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden
      border border-border-light dark:border-border-dark
      shadow-lg dark:shadow-dark-lg h-fit">
      {/* Header */}
      <div className="p-5 border-b border-border-light dark:border-border-dark
        bg-gradient-to-r from-background-light to-transparent dark:from-background-dark">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              Questões Selecionadas
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
              {questions.length} questão(ões) adicionada(s)
            </p>
          </div>
          {questions.length > 0 && (
            <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold">
              {questions.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {questions.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded-2xl blur-lg opacity-50" />
              <div className="relative p-5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-5xl">
                  playlist_add
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
              Nenhuma questão adicionada
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary max-w-xs mx-auto">
              Busque questões no banco ou crie questões autorais para adicionar ao simulado
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {questions.map((question, index) => (
              <div
                key={question.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-start gap-3 p-4 rounded-xl cursor-move
                  transition-all duration-200 group
                  ${draggedIndex === index 
                    ? 'opacity-50 scale-95' 
                    : dragOverIndex === index 
                      ? 'bg-primary/10 border-2 border-primary border-dashed'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/30'
                  }`}
              >
                {/* Drag handle */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg
                    group-hover:text-primary transition-colors cursor-grab active:cursor-grabbing">
                    drag_indicator
                  </span>
                  <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary
                    rounded-lg font-semibold text-xs">
                    {index + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-light-primary dark:text-text-dark-primary line-clamp-2">
                    {question.enunciado}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium
                      ${question.type === 'bank' 
                        ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
                        : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                      }`}>
                      {question.type === 'bank' ? 'Banco' : 'Autoral'}
                    </span>
                    {question.specialty && (
                      <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {question.specialty}
                      </span>
                    )}
                    {question.university && (
                      <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        • {question.university}
                      </span>
                    )}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => onRemove(question.id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg
                    text-slate-400 hover:text-red-500 transition-all duration-200
                    opacity-0 group-hover:opacity-100"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      {questions.length > 0 && (
        <div className="p-4 border-t border-border-light dark:border-border-dark
          bg-background-light dark:bg-background-dark">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-text-light-secondary dark:text-text-dark-secondary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-cyan-500">database</span>
                {questions.filter(q => q.type === 'bank').length} do banco
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-violet-500">edit</span>
                {questions.filter(q => q.type === 'custom').length} autorais
              </span>
            </div>
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              Arraste para reordenar
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
