'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Subject } from '@/types/banco-questoes';
import Checkbox from '@/components/ui/Checkbox';
import { SearchInput } from '@/components/flashcards/SearchInput';

interface SubjectSelectorProps {
  subjects: Subject[];
  selectedSubjects: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onToggleSubject: (subjectId: string) => void;
}

interface SearchResult {
  subject: Subject;
  path: Subject[];
  matchType: 'exact' | 'partial';
}

export default function SubjectSelector({
  subjects,
  selectedSubjects,
  searchTerm,
  onSearchChange,
  onToggleSubject,
}: SubjectSelectorProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Função para coletar todos os IDs de um subject e seus descendentes
  const getAllDescendantIds = useCallback((subject: Subject): string[] => {
    const ids = [subject.id];
    if (subject.children) {
      subject.children.forEach(child => {
        ids.push(...getAllDescendantIds(child));
      });
    }
    return ids;
  }, []);

  // Função para coletar todos os IDs ancestrais (pais, avós, etc.)
  const getAllAncestorIds = useCallback((subjectId: string, allSubjects: Subject[]): string[] => {
    const ancestorIds: string[] = [];
    
    const findAncestors = (subjects: Subject[], targetId: string, ancestors: string[] = []): boolean => {
      for (const subject of subjects) {
        if (subject.id === targetId) {
          ancestorIds.push(...ancestors);
          return true;
        }
        if (subject.children) {
          if (findAncestors(subject.children, targetId, [...ancestors, subject.id])) {
            return true;
          }
        }
      }
      return false;
    };
    
    findAncestors(allSubjects, subjectId);
    return ancestorIds;
  }, []);

  // Função para verificar se todos os filhos estão selecionados
  const areAllChildrenSelected = useCallback((subject: Subject): boolean => {
    if (!subject.children || subject.children.length === 0) return false;
    return subject.children.every(child => 
      selectedSubjects.includes(child.id) && 
      (!child.children || areAllChildrenSelected(child))
    );
  }, [selectedSubjects]);

  // Função para verificar se alguns (mas não todos) filhos estão selecionados
  const areSomeChildrenSelected = useCallback((subject: Subject): boolean => {
    if (!subject.children || subject.children.length === 0) return false;
    return subject.children.some(child => 
      selectedSubjects.includes(child.id) || areSomeChildrenSelected(child)
    );
  }, [selectedSubjects]);

  // Handler para toggle com seleção recursiva
  const handleToggleSubject = useCallback((subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const allIds = getAllDescendantIds(subject);
    const isCurrentlySelected = selectedSubjects.includes(subject.id);
    
    allIds.forEach(id => {
      if (isCurrentlySelected) {
        if (selectedSubjects.includes(id)) {
          onToggleSubject(id);
        }
      } else {
        if (!selectedSubjects.includes(id)) {
          onToggleSubject(id);
        }
      }
    });
  }, [selectedSubjects, onToggleSubject, getAllDescendantIds]);

  const toggleExpand = useCallback((subjectId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedSubjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  }, []);

  // Função para normalizar texto (remover acentos)
  const normalizeText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }, []);

  // Busca recursiva em toda a hierarquia
  const searchInHierarchy = useCallback((subjectList: Subject[], path: Subject[] = []): SearchResult[] => {
    const results: SearchResult[] = [];
    const search = normalizeText(searchTerm);
    
    if (!search) return [];

    subjectList.forEach(subject => {
      const currentPath = [...path, subject];
      const subjectNameNormalized = normalizeText(subject.name);
      const subjectNameLower = subject.name.toLowerCase();
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Verifica se corresponde (com ou sem acentos)
      if (subjectNameNormalized.includes(search)) {
        results.push({
          subject,
          path: currentPath,
          matchType: subjectNameNormalized === search || subjectNameLower === searchLower ? 'exact' : 'partial'
        });
      }
      
      if (subject.children && subject.children.length > 0) {
        const childResults = searchInHierarchy(subject.children, currentPath);
        results.push(...childResults);
      }
    });
    
    return results;
  }, [searchTerm, normalizeText]);

  // Resultados da busca
  const searchResults = useMemo(() => {
    const results = searchInHierarchy(subjects);
    // Ordenar: exatos primeiro, depois parciais
    return results.sort((a, b) => {
      if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
      if (a.matchType !== 'exact' && b.matchType === 'exact') return 1;
      return a.subject.name.localeCompare(b.subject.name);
    });
  }, [subjects, searchInHierarchy]);

  // Expandir caminho até um subject (fecha tudo e abre apenas o caminho necessário)
  const expandPathToSubject = useCallback((path: Subject[]) => {
    // ZERAR o estado - criar um novo Set vazio
    const newSet = new Set<string>();
    
    // Expandir todos os pais no caminho
    path.slice(0, -1).forEach(parent => {
      newSet.add(parent.id);
    });
    
    // Se o item clicado tiver filhos, expandir apenas ele (primeiro nível)
    const clickedItem = path[path.length - 1];
    if (clickedItem.children && clickedItem.children.length > 0) {
      newSet.add(clickedItem.id);
    }
    
    setExpandedSubjects(newSet);
    
    // Scroll até o elemento
    setTimeout(() => {
      const element = document.getElementById(`subject-${path[path.length - 1].id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-primary/30', 'rounded-lg');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-primary/30');
        }, 2000);
      }
    }, 100);
  }, []);

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={index} className="bg-primary/30 dark:bg-primary/40 rounded-sm px-1 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const renderSubject = (subject: Subject) => {
    const isExpanded = expandedSubjects.has(subject.id);
    const isSelected = selectedSubjects.includes(subject.id);
    const hasChildren = subject.children && subject.children.length > 0;
    const allChildrenSelected = hasChildren && areAllChildrenSelected(subject);
    const someChildrenSelected = hasChildren && !allChildrenSelected && areSomeChildrenSelected(subject);
    const isIndeterminate = someChildrenSelected && !isSelected;

    return (
      <div
        key={subject.id}
        id={`subject-${subject.id}`}
        className="transition-all duration-200"
      >
        <div 
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer select-none
                    bg-surface-light dark:bg-surface-dark
                    hover:bg-background-light dark:hover:bg-background-dark 
                    border-2 border-border-light dark:border-border-dark hover:border-primary/30
                    transition-all duration-200
                    shadow-sm hover:shadow-lg dark:shadow-dark-sm dark:hover:shadow-dark-lg
                    hover:-translate-y-0.5"
          onClick={(e) => {
            if (hasChildren) {
              toggleExpand(subject.id, e);
            }
          }}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren && (
              <span className={`material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                              transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>
                chevron_right
              </span>
            )}
            <div className="ml-3 flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected || allChildrenSelected}
                indeterminate={isIndeterminate}
                onChange={() => {
                  const allIds = getAllDescendantIds(subject);
                  const isCurrentlySelected = selectedSubjects.includes(subject.id);
                  
                  // Se está desmarcando, remover todos os ancestrais também
                  if (isCurrentlySelected) {
                    const ancestorIds = getAllAncestorIds(subject.id, subjects);
                    ancestorIds.forEach(ancestorId => {
                      if (selectedSubjects.includes(ancestorId)) {
                        onToggleSubject(ancestorId);
                      }
                    });
                  }
                  
                  allIds.forEach(id => {
                    if (isCurrentlySelected) {
                      if (selectedSubjects.includes(id)) {
                        onToggleSubject(id);
                      }
                    } else {
                      if (!selectedSubjects.includes(id)) {
                        onToggleSubject(id);
                      }
                    }
                  });
                }}
              />
              <span
                className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary 
                          select-none cursor-pointer hover:text-primary transition-colors duration-200
                          truncate"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleSubject(subject, e);
                }}
              >
                {highlightText(subject.name, searchTerm)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {subject.categoryColor && subject.categoryIcon && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${subject.categoryColor} 
                            px-2 py-1 rounded-md shadow-sm`}>
                <span className="material-symbols-outlined text-sm">{subject.categoryIcon}</span>
                <span className="hidden sm:inline">{subject.categoryLabel}</span>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="pl-8 pr-2 pt-2 pb-2 space-y-2">
            {subject.children!.map((child) => {
              const isChildSelected = selectedSubjects.includes(child.id);
              const childHasChildren = child.children && child.children.length > 0;
              
              if (childHasChildren) {
                return renderSubject(child);
              }
              
              return (
                <div key={child.id} 
                     id={`subject-${child.id}`}
                     className="flex items-center p-3 rounded-lg 
                               bg-background-light dark:bg-background-dark
                               hover:bg-surface-light dark:hover:bg-surface-dark
                               border-2 border-border-light dark:border-border-dark hover:border-primary/30 
                               transition-all duration-200
                               shadow-sm hover:shadow-md dark:shadow-dark-sm dark:hover:shadow-dark-md
                               hover:-translate-y-0.5" 
                     onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isChildSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      
                      // Remover todos os ancestrais (pai, avô, etc.)
                      const ancestorIds = getAllAncestorIds(child.id, subjects);
                      ancestorIds.forEach(ancestorId => {
                        if (selectedSubjects.includes(ancestorId)) {
                          onToggleSubject(ancestorId);
                        }
                      });
                      
                      // Toggle do filho
                      onToggleSubject(child.id);
                    }}
                  />
                  <span
                    className="ml-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary 
                              cursor-pointer hover:text-primary transition-colors duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Remover todos os ancestrais (pai, avô, etc.)
                      const ancestorIds = getAllAncestorIds(child.id, subjects);
                      ancestorIds.forEach(ancestorId => {
                        if (selectedSubjects.includes(ancestorId)) {
                          onToggleSubject(ancestorId);
                        }
                      });
                      
                      // Toggle do filho
                      onToggleSubject(child.id);
                    }}
                  >
                    {highlightText(child.name, searchTerm)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Buscar assuntos..."
          fullWidth
        />
      </div>

      {/* Resultados da busca */}
      {searchTerm.trim() && searchResults.length > 0 && (
        <div className="mb-6 bg-surface-light dark:bg-surface-dark rounded-xl p-4 
                       border-2 border-primary/10 shadow-lg dark:shadow-dark-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">search</span>
              {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
            </h3>
            <button
              onClick={() => onSearchChange('')}
              className="text-xs font-medium text-primary hover:text-primary/80 
                       px-3 py-1.5 rounded-lg hover:bg-primary/10 
                       transition-all duration-200 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Limpar
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 py-1
                         scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {searchResults.map((result, index) => {
              const isSelected = selectedSubjects.includes(result.subject.id);
              const pathText = result.path.map(s => s.name).join(' > ');
              
              return (
                <div
                  key={`${result.subject.id}-${index}`}
                  className="group bg-background-light dark:bg-background-dark rounded-xl p-4 
                           border-2 border-border-light dark:border-border-dark
                           hover:border-primary/40 
                           shadow-md hover:shadow-xl dark:shadow-dark-md dark:hover:shadow-dark-xl
                           transition-all duration-200 cursor-pointer
                           hover:-translate-y-0.5"
                  onClick={() => {
                    expandPathToSubject(result.path);
                    onSearchChange('');
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {
                              onToggleSubject(result.subject.id);
                            }}
                          />
                        </div>
                        <h4 className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary
                                     group-hover:text-primary transition-colors duration-200">
                          {highlightText(result.subject.name, searchTerm)}
                        </h4>
                        {result.matchType === 'exact' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            Exato
                          </span>
                        )}
                      </div>
                      <div 
                        className="relative"
                        onMouseEnter={(e) => {
                          const element = e.currentTarget.querySelector('p');
                          if (element && element.scrollWidth > element.clientWidth) {
                            setHoveredPath(pathText);
                          }
                        }}
                        onMouseLeave={() => setHoveredPath(null)}
                      >
                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary 
                                    truncate group-hover:text-primary/70 transition-colors duration-200">
                          {pathText}
                        </p>
                        {/* Tooltip customizado - só aparece se estiver truncado */}
                        {hoveredPath === pathText && (
                          <div className="absolute left-0 top-full mt-2 px-4 py-3 
                                        bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-xl 
                                        shadow-2xl border border-gray-700 dark:border-gray-600
                                        whitespace-normal break-words max-w-md z-50 
                                        animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="font-medium">{pathText}</div>
                            {/* Seta apontando para cima */}
                            <div className="absolute left-4 bottom-full w-3 h-3 bg-gray-900 dark:bg-gray-800 
                                          border-l border-t border-gray-700 dark:border-gray-600
                                          transform rotate-45 mb-[-6px]"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 
                                   transition-opacity duration-200 flex-shrink-0">
                      arrow_forward
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensagem quando não há resultados */}
      {searchTerm.trim() && searchResults.length === 0 && (
        <div className="mb-6 p-8 bg-surface-light dark:bg-surface-dark rounded-xl 
                       border-2 border-border-light dark:border-border-dark text-center
                       shadow-lg dark:shadow-dark-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full 
                         bg-gray-100 dark:bg-gray-800 mb-4">
            <span className="material-symbols-outlined text-4xl text-text-light-secondary dark:text-text-dark-secondary">
              search_off
            </span>
          </div>
          <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
            Nenhum resultado encontrado
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Tente buscar por "{searchTerm}" com outra grafia
          </p>
        </div>
      )}

      {/* Hierarquia completa (oculta quando há busca ativa) */}
      {!searchTerm.trim() && (
        <div className="space-y-2">
          {subjects.map((subject) => renderSubject(subject))}
        </div>
      )}
    </div>
  );
}
