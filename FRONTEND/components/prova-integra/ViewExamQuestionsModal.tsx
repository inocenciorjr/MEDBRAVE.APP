'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Question {
  id: string;
  title?: string;
  content: string;
  options: any;
  correct_answer: string;
  explanation?: string;
  tags?: string[];
  sub_filter_ids?: string[];
  difficulty?: number;
}

interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
}

interface ViewExamQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  examTitle: string;
  questionIds: string[];
  onCreateList?: () => void;
  onCreateSimulated?: () => void;
}

export default function ViewExamQuestionsModal({
  isOpen,
  onClose,
  examId,
  examTitle,
  questionIds,
  onCreateList,
  onCreateSimulated,
}: ViewExamQuestionsModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubFilters, setLoadingSubFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [subFiltersMap, setSubFiltersMap] = useState<Map<string, SubFilter>>(new Map());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const questionsPerPage = 20;
  
  // Estados para animação
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const toggleQuestionExpanded = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
      initializeModal();
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, questionIds]);

  const initializeModal = async () => {
    setLoadingSubFilters(true);
    const map = await fetchSubFilters();
    setLoadingSubFilters(false);
    fetchQuestions(1, map);
  };

  const fetchSubFilters = async (): Promise<Map<string, SubFilter>> => {
    try {
      // Buscar TODAS as hierarquias disponíveis
      const [filterHierarchyResponse, institutionHierarchyResponse, yearsResponse] = await Promise.all([
        api.get('/banco-questoes/filters/hierarchy'),
        api.get('/banco-questoes/institutions'),
        api.get('/banco-questoes/years'),
      ]);
      
      const filterHierarchy = filterHierarchyResponse.data.data || [];
      const institutionHierarchy = institutionHierarchyResponse.data.data || [];
      const yearsHierarchy = yearsResponse.data.data || [];
      
      const map = new Map<string, SubFilter>();
      
      // Função recursiva para extrair todos os subfiltros
      const extractSubFilters = (node: any) => {
        if (node.id && node.name) {
          map.set(node.id, {
            id: node.id,
            name: node.name,
            filter_id: node.filter_id || node.id.split('_')[0],
          });
        }
        if (node.children) {
          node.children.forEach((child: any) => extractSubFilters(child));
        }
      };
      
      // Extrair de todas as hierarquias
      filterHierarchy.forEach((filter: any) => extractSubFilters(filter));
      institutionHierarchy.forEach((institution: any) => extractSubFilters(institution));
      yearsHierarchy.forEach((year: any) => extractSubFilters(year));
      
      setSubFiltersMap(map);
      
      return map;
    } catch (err) {
      console.error('[ViewExamQuestions] Erro ao buscar subfiltros:', err);
      return new Map();
    }
  };

  const fetchQuestions = async (page: number, subFiltersMapParam?: Map<string, SubFilter>) => {
    setLoading(true);
    setError(null);

    try {
      // Buscar questões por IDs
      const response = await api.post('/banco-questoes/questions/by-ids', {
        questionIds,
      });

      const fetchedQuestions = response.data.data || [];
      
      setAllQuestions(fetchedQuestions);
      
      // Paginar manualmente
      const startIndex = (page - 1) * questionsPerPage;
      const endIndex = startIndex + questionsPerPage;
      const paginatedQuestions = fetchedQuestions.slice(startIndex, endIndex);
      
      setQuestions(paginatedQuestions);
      setTotal(fetchedQuestions.length);
      setTotalPages(Math.ceil(fetchedQuestions.length / questionsPerPage));
      setCurrentPage(page);
    } catch (err: any) {
      console.error('[ViewExamQuestions] Erro ao buscar questões:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao carregar questões');
    } finally {
      setLoading(false);
    }
  };

  const getYearFromQuestion = (question: Question): string => {
    const yearSubFilterId = question.sub_filter_ids?.find(id => 
      id.startsWith('Ano da Prova_')
    );
    
    if (yearSubFilterId) {
      const subFilter = subFiltersMap.get(yearSubFilterId);
      return subFilter?.name || 'N/A';
    }
    
    return 'N/A';
  };

  const getInstitutionFromQuestion = (question: Question): string => {
    const institutionId = question.sub_filter_ids?.find(id => 
      id.startsWith('Universidade_')
    );
    
    if (institutionId) {
      const subFilter = subFiltersMap.get(institutionId);
      return subFilter?.name || 'N/A';
    }
    
    return 'N/A';
  };

  const getFilterPaths = (question: Question): string[][] => {
    if (!question.sub_filter_ids) return [];
    
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
      
      // Reconstruir o caminho completo
      const path: string[] = [];
      const parts = deepestId.split('_');
      
      // Adicionar o filtro raiz primeiro
      const rootFilter = subFiltersMap.get(rootId);
      if (rootFilter) {
        path.push(rootFilter.name);
      }
      
      // Construir IDs incrementalmente e buscar os nomes
      for (let i = 1; i < parts.length; i++) {
        const partialId = parts.slice(0, i + 1).join('_');
        const subFilter = subFiltersMap.get(partialId);
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

  const renderOptions = (options: any) => {
    if (!options) return null;

    if (typeof options === 'object' && !Array.isArray(options)) {
      return (
        <div className="space-y-3">
          {Object.entries(options).map(([key, value]: [string, any]) => (
            <div
              key={key}
              className="flex gap-3 p-3 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark"
            >
              <span className="font-semibold text-primary dark:text-primary min-w-[24px]">
                {key.toUpperCase()})
              </span>
              <div 
                className="flex-1 text-text-light-primary dark:text-text-dark-primary prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(options)) {
      return (
        <div className="space-y-3">
          {options.map((option: any, index: number) => (
            <div
              key={index}
              className="flex gap-3 p-3 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark"
            >
              <span className="font-semibold text-primary dark:text-primary min-w-[24px]">
                {String.fromCharCode(65 + index)})
              </span>
              <div 
                className="flex-1 text-text-light-primary dark:text-text-dark-primary prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: typeof option === 'string' ? option : option.text }}
              />
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const startIndex = (currentPage - 2) * questionsPerPage;
      const endIndex = startIndex + questionsPerPage;
      setQuestions(allQuestions.slice(startIndex, endIndex));
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const startIndex = currentPage * questionsPerPage;
      const endIndex = startIndex + questionsPerPage;
      setQuestions(allQuestions.slice(startIndex, endIndex));
      setCurrentPage(currentPage + 1);
    }
  };

  const handleCloseWithAnimation = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleCreateListWithTransition = () => {
    if (onCreateList) {
      setIsAnimating(false);
      setTimeout(() => {
        onClose();
        setTimeout(() => onCreateList(), 50);
      }, 300);
    }
  };

  const handleCreateSimulatedWithTransition = () => {
    if (onCreateSimulated) {
      setIsAnimating(false);
      setTimeout(() => {
        onClose();
        setTimeout(() => onCreateSimulated(), 50);
      }, 300);
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleCloseWithAnimation}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[90%] lg:w-[80%] xl:w-[70%] bg-surface-light dark:bg-surface-dark shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out flex flex-col ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <div>
            <h2 className="text-2xl font-semibold text-text-light-primary dark:text-text-dark-primary">
              Pré-visualizar Questões
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {total.toLocaleString('pt-BR')} {total === 1 ? 'questão encontrada' : 'questões encontradas'}
            </p>
          </div>
          <button
            onClick={handleCloseWithAnimation}
            className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
              close
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {(loading || loadingSubFilters) ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-5xl text-primary animate-spin">
                  refresh
                </span>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                  Carregando questões...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="material-symbols-outlined text-5xl text-error-light dark:text-error-dark">
                  error
                </span>
                <p className="text-error-light dark:text-error-dark">{error}</p>
                <button
                  onClick={() => fetchQuestions(currentPage)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="material-symbols-outlined text-5xl text-text-light-secondary dark:text-text-dark-secondary">
                  search_off
                </span>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                  Nenhuma questão encontrada
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-background-light dark:bg-background-dark rounded-xl p-6 border border-border-light dark:border-border-dark"
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                          Questão {(currentPage - 1) * questionsPerPage + index + 1}
                        </span>
                        <div className="flex gap-2">
                          <span className="px-2.5 py-1 text-xs font-medium bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary rounded-md border border-border-light dark:border-border-dark">
                            {getInstitutionFromQuestion(question)}
                          </span>
                          <span className="px-2.5 py-1 text-xs font-medium bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary rounded-md border border-border-light dark:border-border-dark">
                            {getYearFromQuestion(question)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Botão para expandir/recolher filtros */}
                      {getFilterPaths(question).length > 0 && (
                        <button
                          onClick={() => toggleQuestionExpanded(question.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark rounded-md transition-colors"
                        >
                          <span>Filtros</span>
                          <span className={`material-symbols-outlined text-base transition-transform ${expandedQuestions.has(question.id) ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </button>
                      )}
                    </div>
                    
                    {/* Caminhos hierárquicos dos filtros (recolhível) */}
                    {expandedQuestions.has(question.id) && getFilterPaths(question).length > 0 && (
                      <div className="flex flex-col gap-1.5 ml-4 mb-3 pb-3 border-b border-border-light dark:border-border-dark">
                        {getFilterPaths(question).map((path, pathIndex) => (
                          <div key={pathIndex} className="flex items-center gap-1.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                            {path.map((name, nameIndex) => (
                              <span key={nameIndex} className="flex items-center gap-1.5">
                                {nameIndex > 0 && (
                                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">→</span>
                                )}
                                <span className="px-2 py-0.5 bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary rounded border border-border-light dark:border-border-dark">
                                  {name}
                                </span>
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Divisória quando os filtros estão recolhidos */}
                    {!expandedQuestions.has(question.id) && (
                      <div className="mb-4 border-b border-border-light dark:border-border-dark"></div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div 
                      className="text-text-light-primary dark:text-text-dark-primary prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: question.content }}
                    />
                  </div>

                  {question.options && (
                    <div className="mt-4">
                      {renderOptions(question.options)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && !error && questions.length > 0 && (
          <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            {/* Navegação de páginas */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Anterior</span>
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Próxima</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Divisória */}
            <div className="border-t border-border-light/30 dark:border-border-dark/30 mb-4"></div>

            {/* Botões de ação */}
            <div className="flex gap-3">
              <button
                onClick={handleCreateListWithTransition}
                className="flex-1 px-6 py-3 bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark rounded-lg font-medium text-slate-700 dark:text-slate-200 hover:border-primary hover:bg-primary/5 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">playlist_add</span>
                Criar Lista
              </button>
              <button
                onClick={handleCreateSimulatedWithTransition}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">schedule</span>
                Criar Simulado
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
