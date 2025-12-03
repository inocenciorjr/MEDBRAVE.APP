'use client';

import { useState, useEffect } from 'react';
import { SelectedQuestion } from '@/app/mentor/simulados/criar/page';
import EmptyState from '@/components/ui/EmptyState';
import { getSubFiltersMap } from '@/lib/services/filterService';

interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id?: string | null;
  level: number;
}

interface SelectedQuestionsPanelProps {
  questions: SelectedQuestion[];
  onRemove: (questionId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  subFiltersMap?: Map<string, string>; // Mantido para compatibilidade
}

export default function SelectedQuestionsPanel({
  questions,
  onRemove,
  onReorder,
}: SelectedQuestionsPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [filtersMap, setFiltersMap] = useState<Map<string, SubFilter>>(new Map());

  // Carregar mapa de subfiltros
  useEffect(() => {
    async function loadFilters() {
      try {
        const map = await getSubFiltersMap();
        setFiltersMap(map);
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
      }
    }
    loadFilters();
  }, []);

  // Função para construir caminhos hierárquicos dos filtros
  const buildFilterPaths = (subFilterIds: string[] | undefined): string[][] => {
    if (!subFilterIds || subFilterIds.length === 0 || filtersMap.size === 0) {
      return [];
    }

    // Filtrar apenas subfiltros de especialidades
    const specialtyIds = subFilterIds.filter(
      (id) => !id.startsWith('Ano da Prova_') && !id.startsWith('Universidade_')
    );

    // Agrupar IDs por filtro raiz
    const pathsByRoot = new Map<string, string[]>();

    specialtyIds.forEach((id) => {
      const rootId = id.split('_')[0];
      if (!pathsByRoot.has(rootId)) {
        pathsByRoot.set(rootId, []);
      }
      pathsByRoot.get(rootId)!.push(id);
    });

    // Construir caminhos hierárquicos
    const paths: string[][] = [];

    pathsByRoot.forEach((ids) => {
      // Ordenar IDs por profundidade (mais profundo primeiro)
      const sortedIds = ids.sort((a, b) => {
        const depthA = (a.match(/_/g) || []).length;
        const depthB = (b.match(/_/g) || []).length;
        return depthB - depthA;
      });

      const deepestId = sortedIds[0];
      if (!deepestId) return;

      const path: string[] = [];
      const parts = deepestId.split('_');
      const rootId = parts[0];

      // Adicionar o filtro raiz primeiro
      const rootFilter = filtersMap.get(rootId);
      if (rootFilter) {
        path.push(rootFilter.name);
      }

      // Construir IDs incrementalmente e buscar os nomes
      for (let i = 1; i < parts.length; i++) {
        const partialId = parts.slice(0, i + 1).join('_');
        const subFilter = filtersMap.get(partialId);
        if (subFilter) {
          path.push(subFilter.name);
        }
      }

      if (path.length > 0) {
        paths.push(path);
      }
    });

    return paths;
  };

  // Função para obter instituição
  const getInstitution = (subFilterIds: string[] | undefined): string | null => {
    if (!subFilterIds) return null;
    const institutionId = subFilterIds.find((id) => id.startsWith('Universidade_'));
    if (institutionId) {
      const subFilter = filtersMap.get(institutionId);
      return subFilter?.name || null;
    }
    return null;
  };

  // Função para obter ano
  const getYear = (subFilterIds: string[] | undefined): string | null => {
    if (!subFilterIds) return null;
    const yearId = subFilterIds.find((id) => id.startsWith('Ano da Prova_'));
    if (yearId) {
      const parts = yearId.split('_');
      return parts[parts.length - 1];
    }
    return null;
  };

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

  const bankCount = questions.filter((q) => q.type === 'bank').length;
  const customCount = questions.filter((q) => q.type === 'custom').length;

  return (
    <div
      className="bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
      dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
      rounded-2xl overflow-hidden border border-border-light dark:border-border-dark
      shadow-xl dark:shadow-dark-xl"
    >
      {/* Header */}
      <div className="p-6 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-1">
              Questões Selecionadas
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {questions.length} questão(ões) adicionada(s)
            </p>
          </div>
          {questions.length > 0 && (
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-lg font-bold">
              {questions.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {questions.length === 0 ? (
          <EmptyState
            icon="playlist_add"
            title="Nenhuma questão adicionada"
            description="Busque questões no banco ou crie questões autorais para adicionar ao simulado"
          />
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {questions.map((question, index) => (
              <div
                key={question.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-start gap-3 p-4 rounded-xl cursor-move
                  transition-all duration-300 group
                  shadow-md hover:shadow-lg dark:shadow-dark-md dark:hover:shadow-dark-lg
                  ${
                    draggedIndex === index
                      ? 'opacity-50 scale-95'
                      : dragOverIndex === index
                        ? 'bg-primary/10 border-2 border-primary border-dashed'
                        : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/30'
                  }`}
              >
                {/* Drag handle */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  <span
                    className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg
                    group-hover:text-primary transition-colors cursor-grab active:cursor-grabbing"
                  >
                    drag_indicator
                  </span>
                  <span
                    className="w-7 h-7 flex items-center justify-center bg-primary text-white
                    rounded-lg font-bold text-xs shadow-md"
                  >
                    {index + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div 
                    className="text-sm text-text-light-primary dark:text-text-dark-primary line-clamp-2 mb-2
                      prose prose-sm dark:prose-invert max-w-none
                      [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:inline [&_img]:max-h-16"
                    dangerouslySetInnerHTML={{ __html: question.enunciado }}
                  />

                  {/* Badge Banco/Autoral + Instituição + Ano */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold
                      ${
                        question.type === 'bank'
                          ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                          : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      }`}
                    >
                      {question.type === 'bank' ? 'Banco' : 'Autoral'}
                    </span>

                    {getInstitution(question.subFilterIds) && (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                        bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      >
                        <span
                          className="material-symbols-outlined text-xs"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          school
                        </span>
                        {getInstitution(question.subFilterIds)}
                      </span>
                    )}

                    {getYear(question.subFilterIds) && (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                        bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                      >
                        <span
                          className="material-symbols-outlined text-xs"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          calendar_month
                        </span>
                        {getYear(question.subFilterIds)}
                      </span>
                    )}
                  </div>

                  {/* Caminhos hierárquicos dos filtros */}
                  {buildFilterPaths(question.subFilterIds).length > 0 && (
                    <div className="flex flex-col gap-1">
                      {buildFilterPaths(question.subFilterIds).map((path, pathIndex) => (
                        <div
                          key={pathIndex}
                          className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-hide"
                        >
                          {path.map((name, nameIndex) => (
                            <div key={nameIndex} className="flex items-center gap-1 flex-shrink-0">
                              {nameIndex > 0 && (
                                <span className="text-text-light-tertiary dark:text-text-dark-tertiary">
                                  →
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-text-light-secondary dark:text-text-dark-secondary rounded border border-border-light dark:border-border-dark whitespace-nowrap text-[11px]">
                                {name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fallback para specialty antigo se não tiver subFilterIds */}
                  {!question.subFilterIds && question.specialty && (
                    <span
                      className="text-xs text-text-light-secondary dark:text-text-dark-secondary 
                      bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg"
                    >
                      {question.specialty}
                    </span>
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => onRemove(question.id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl
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

      {/* Footer */}
      {questions.length > 0 && (
        <div
          className="p-4 border-t border-border-light dark:border-border-dark
          bg-background-light dark:bg-background-dark"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                <span className="material-symbols-outlined text-base text-cyan-500">database</span>
                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {bankCount}
                </span>{' '}
                do banco
              </span>
              <span className="flex items-center gap-1.5 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                <span className="material-symbols-outlined text-base text-violet-500">edit</span>
                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {customCount}
                </span>{' '}
                autorais
              </span>
            </div>
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">drag_indicator</span>
              Arraste para reordenar
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
