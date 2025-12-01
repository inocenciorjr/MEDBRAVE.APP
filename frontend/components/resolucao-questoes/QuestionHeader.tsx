'use client';

import { useState, useEffect } from 'react';
import { Question } from '@/types/resolucao-questoes';
import { getSubFiltersMap } from '@/lib/services/filterService';
import { useToast } from '@/lib/contexts/ToastContext';

interface QuestionHeaderProps {
  question: Question;
  likes: number;
  dislikes: number;
  onLike?: () => void;
  onDislike?: () => void;
  hideFilters?: boolean;
}

interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id?: string | null;
  level: number;
}

export function QuestionHeader({
  question,
  likes,
  dislikes,
  onLike,
  onDislike,
  hideFilters = false,
}: QuestionHeaderProps) {
  const toast = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterPaths, setFilterPaths] = useState<string[][]>([]);
  const [subFiltersMap, setSubFiltersMap] = useState<Map<string, SubFilter>>(new Map());

  useEffect(() => {
    async function loadFilters() {
      try {
        if (!question.sub_filter_ids || question.sub_filter_ids.length === 0) {
          setFilterPaths([]);
          return;
        }
        
        const map = await getSubFiltersMap();
        setSubFiltersMap(map);
        
        // Filtrar apenas subfiltros de especialidades (não incluir Ano e Universidade)
        const specialtyIds = question.sub_filter_ids.filter(id => 
          !id.startsWith('Ano da Prova_') && 
          !id.startsWith('Universidade_')
        );
        
        // Agrupar IDs por filtro raiz (primeira parte antes do primeiro _)
        const pathsByRoot = new Map<string, string[]>();
        
        specialtyIds.forEach(id => {
          const rootId = id.split('_')[0];
          if (!pathsByRoot.has(rootId)) {
            pathsByRoot.set(rootId, []);
          }
          pathsByRoot.get(rootId)!.push(id);
        });
        
        // Construir caminhos hierárquicos para cada grupo
        const paths: string[][] = [];
        
        pathsByRoot.forEach((ids, rootId) => {
          // Ordenar IDs por profundidade (mais profundo primeiro)
          const sortedIds = ids.sort((a, b) => {
            const depthA = (a.match(/_/g) || []).length;
            const depthB = (b.match(/_/g) || []).length;
            return depthB - depthA;
          });
          
          // Pegar o ID mais profundo (que contém todo o caminho)
          const deepestId = sortedIds[0];
          
          // Verificar se deepestId é válido
          if (!deepestId || typeof deepestId !== 'string') {
            console.warn('[QuestionHeader] deepestId inválido:', deepestId);
            return;
          }
          
          // Reconstruir o caminho completo
          const path: string[] = [];
          const parts = deepestId.split('_');
          
          // Verificar se parts é válido
          if (!parts || !Array.isArray(parts) || parts.length === 0) {
            console.warn('[QuestionHeader] parts inválido:', parts);
            return;
          }
          
          // Adicionar o filtro raiz primeiro
          const rootFilter = map.get(rootId);
          if (rootFilter) {
            path.push(rootFilter.name);
          }
          
          // Construir IDs incrementalmente e buscar os nomes
          for (let i = 1; i < parts.length; i++) {
            const partialId = parts.slice(0, i + 1).join('_');
            const subFilter = map.get(partialId);
            if (subFilter) {
              path.push(subFilter.name);
            }
          }
          
          if (path.length > 0) {
            paths.push(path);
          }
        });
        
        setFilterPaths(paths);
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
      }
    }
    
    loadFilters();
  }, [question.sub_filter_ids]);

  // Extrair instituição e ano dos sub_filter_ids
  const getInstitution = () => {
    const institutionId = question.sub_filter_ids?.find((id: string) => 
      id.startsWith('Universidade_') || id.startsWith('Residencia_')
    );
    if (institutionId) {
      const subFilter = subFiltersMap.get(institutionId);
      return subFilter?.name || question.institution;
    }
    return question.institution;
  };

  const getYear = () => {
    const yearId = question.sub_filter_ids?.find((id: string) => /^\d{4}$/.test(id.split('_').pop() || ''));
    if (yearId) {
      const parts = yearId.split('_');
      return parts[parts.length - 1];
    }
    return question.year?.toString() || '';
  };

  return (
    <div className="mb-4 md:mb-6">
      {/* Mobile + Tablet: Single Row - Question + Institution + Year */}
      <div className="xl:hidden flex items-center justify-between mb-3 gap-1.5">
        <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary whitespace-nowrap">
          Questão {question.questionNumber}
        </span>
        
        <div className="flex items-center gap-1.5 flex-shrink min-w-0">
          <button
            className="group relative flex items-center gap-1 px-2 py-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-secondary dark:text-text-dark-secondary transition-colors shadow-sm text-xs min-w-0"
            aria-label={`Instituição: ${getInstitution()}`}
          >
            <span className="material-symbols-outlined text-sm flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            <span className="font-medium truncate max-w-[120px]">{getInstitution()}</span>
            
            {/* Tooltip customizado */}
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                         bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                         text-xs font-semibold rounded-lg whitespace-nowrap 
                         opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200 
                         pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300">
              {getInstitution()}
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                           w-0 h-0 border-l-[6px] border-l-transparent 
                           border-r-[6px] border-r-transparent 
                           border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
            </span>
          </button>
          
          <button
            className="flex items-center gap-1 px-2 py-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-secondary dark:text-text-dark-secondary transition-colors shadow-sm text-xs flex-shrink-0"
            aria-label={`Ano: ${getYear()}`}
            title={`Ano: ${getYear()}`}
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
            <span className="font-medium">{getYear()}</span>
          </button>
        </div>
      </div>

      {/* Desktop: Two Rows */}
      <div className="hidden xl:block">
        {/* First Row: Question Number + ID + Institution + Year */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-base font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Questão {question.questionNumber}
            </span>
            
            {/* ID da Questão - Desktop only */}
            {question.id && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(question.id);
                  toast.success('ID completo copiado!');
                }}
                className="group flex items-center gap-1 px-2 py-0.5 text-xs text-text-light-tertiary dark:text-text-dark-tertiary hover:text-text-light-secondary dark:hover:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark rounded transition-all"
                title={`ID: ${question.id}\nClique para copiar`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>tag</span>
                <span className="font-mono">{question.id.slice(-6)}</span>
                <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: '12px' }}>content_copy</span>
              </button>
            )}
          </div>
            
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors shadow-sm"
              aria-label={`Instituição: ${getInstitution()}`}
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              <span className="text-xs font-medium">{getInstitution()}</span>
            </button>
            
            <button
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors shadow-sm"
              aria-label={`Ano: ${getYear()}`}
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
              <span className="text-xs font-medium">{getYear()}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters Button - Separate Row (Both Mobile and Desktop) */}
      {!hideFilters && (
        <div className="flex items-center justify-start mb-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark rounded-md transition-colors"
            disabled={filterPaths.length === 0}
          >
            <span>Filtros {filterPaths.length > 0 ? `(${filterPaths.reduce((total, path) => total + path.length, 0)})` : '(0)'}</span>
            <span className={`material-symbols-outlined text-base transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        </div>
      )}
      
      {/* Caminhos hierárquicos dos filtros (recolhível) com scroll horizontal */}
      {!hideFilters && (
        <>
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'
            }`}
          >
            {filterPaths.length > 0 && (
              <div className="flex flex-col gap-2 mb-3 pb-3 border-b border-border-light dark:border-border-dark">
                {filterPaths.map((path, pathIndex) => (
                  <div 
                    key={pathIndex} 
                    className={`flex items-center gap-1.5 text-xs text-text-light-secondary dark:text-text-dark-secondary transition-all duration-300 ease-out ${
                      isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
                    }`}
                    style={{ 
                      transitionDelay: isExpanded ? `${pathIndex * 50}ms` : '0ms'
                    }}
                  >
                    {/* Scroll horizontal container */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 w-full">
                      {path.map((name, nameIndex) => (
                        <div key={nameIndex} className="flex items-center gap-1.5 flex-shrink-0">
                          {nameIndex > 0 && (
                            <span className="text-text-light-tertiary dark:text-text-dark-tertiary flex-shrink-0">→</span>
                          )}
                          <span className="px-2 py-1 bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary rounded-md border border-border-light dark:border-border-dark whitespace-nowrap flex-shrink-0 text-xs">
                            {name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Divisória quando os filtros estão recolhidos */}
          {!isExpanded && (
            <div className="mb-4 border-b border-border-light dark:border-border-dark"></div>
          )}
        </>
      )}
      
      {/* Divisória quando os filtros estão ocultos */}
      {hideFilters && (
        <div className="mb-4 border-b border-border-light dark:border-border-dark"></div>
      )}
    </div>
  );
}
