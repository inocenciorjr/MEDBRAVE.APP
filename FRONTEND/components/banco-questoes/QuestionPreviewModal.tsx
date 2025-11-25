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

interface QuestionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterIds: string[];
  subFilterIds: string[];
  years: number[];
  institutions: string[];
  onQuestionsLoaded?: (questions: Question[]) => void;
}

export default function QuestionPreviewModal({
  isOpen,
  onClose,
  filterIds,
  subFilterIds,
  years,
  institutions,
  onQuestionsLoaded,
}: QuestionPreviewModalProps) {
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
      initializeModal();
    }
  }, [isOpen]);

  const initializeModal = async () => {
    setLoadingSubFilters(true);
    const map = await fetchSubFilters();
    setLoadingSubFilters(false);
    fetchQuestions(1, map);
  };

  const fetchSubFilters = async (): Promise<Map<string, SubFilter>> => {
    try {
      console.log('[QuestionPreview] Buscando hierarquias completas...');
      
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
      console.log('[QuestionPreview] Total de SubFilters carregados:', map.size);
      console.log('[QuestionPreview] Tem o ID de instituição?', map.has('Universidade_Sp_HospitalIsraelitaAlbertEinstein-Hiae'));
      console.log('[QuestionPreview] Amostra:', Array.from(map.entries()).slice(0, 3));
      
      return map;
    } catch (err) {
      console.error('[QuestionPreview] Erro ao buscar subfiltros:', err);
      return new Map();
    }
  };

  const fetchQuestions = async (page: number, subFiltersMapParam?: Map<string, SubFilter>) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[QuestionPreview] Buscando questões com filtros:', {
        filterIds,
        subFilterIds,
        years,
        institutions,
      });

      // Buscar TODAS as questões para ordenar corretamente usando o mesmo padrão do contador
      const response = await api.post('/banco-questoes/questions/search', {
        filterIds,
        subFilterIds,
        years,
        institutions,
        page: 1,
        limit: 10000, // Buscar todas
      });

      console.log('[QuestionPreview] Resposta da API:', response.data);
      
      // A API retorna { success: true, data: { questions, total, page, limit, totalPages } }
      const result = response.data.data || {};
      const fetchedQuestions = result.questions || [];
      console.log('[QuestionPreview] Total de questões encontradas:', fetchedQuestions.length);
      
      // Usar o mapa passado como parâmetro ou o do estado
      const mapToUse = subFiltersMapParam || subFiltersMap;
      
      // Ordenar: ano desc > universidade > manter ordem original (aleatória)
      const sorted = fetchedQuestions.sort((a: Question, b: Question) => {
        // Extrair ano
        const yearA = getYearFromTags(a.tags);
        const yearB = getYearFromTags(b.tags);
        
        // Primeiro por ano (decrescente)
        if (yearA !== yearB) {
          return yearB - yearA;
        }
        
        // Depois por universidade
        const instA = getInstitutionFromSubFilters(a.sub_filter_ids);
        const instB = getInstitutionFromSubFilters(b.sub_filter_ids);
        
        if (instA !== instB) {
          return instA.localeCompare(instB);
        }
        
        // Dentro da mesma universidade e ano, manter ordem original
        return 0;
      });
      
      setAllQuestions(sorted);
      
      // Paginar manualmente
      const startIndex = (page - 1) * questionsPerPage;
      const endIndex = startIndex + questionsPerPage;
      const paginatedQuestions = sorted.slice(startIndex, endIndex);
      
      setQuestions(paginatedQuestions);
      setTotal(sorted.length);
      setTotalPages(Math.ceil(sorted.length / questionsPerPage));
      setCurrentPage(page);
      
      // Cachear todas as questões ordenadas para uso posterior
      if (page === 1 && onQuestionsLoaded) {
        onQuestionsLoaded(sorted);
      }
    } catch (err: any) {
      console.error('[QuestionPreview] Erro ao buscar questões:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao carregar questões');
    } finally {
      setLoading(false);
    }
  };

  const getYearFromTags = (tags?: string[]): number => {
    const yearTag = tags?.find(t => t.startsWith('Ano da Prova_'));
    if (yearTag) {
      const parts = yearTag.split('_');
      return parseInt(parts[1]) || 0;
    }
    return 0;
  };

  const getInstitutionFromSubFilters = (subFilterIds?: string[]): string => {
    const institutionId = subFilterIds?.find(id => institutions.includes(id));
    return institutionId || '';
  };

  const getYearFromQuestion = (question: Question): string => {
    // Buscar qualquer subfiltro que comece com "Ano da Prova_"
    const yearSubFilterId = question.sub_filter_ids?.find(id => 
      id.startsWith('Ano da Prova_')
    );
    
    if (question.id === questions[0]?.id) {
      console.log('[QuestionPreview] DEBUG Ano - Primeira questão:', {
        'sub_filter_ids da questão': question.sub_filter_ids,
        'yearSubFilterId encontrado': yearSubFilterId,
        'Tamanho do mapa': subFiltersMap.size,
        'Tem no mapa?': yearSubFilterId ? subFiltersMap.has(yearSubFilterId) : false,
      });
    }
    
    if (yearSubFilterId) {
      const subFilter = subFiltersMap.get(yearSubFilterId);
      return subFilter?.name || 'N/A';
    }
    
    return 'N/A';
  };

  const getInstitutionFromQuestion = (question: Question): string => {
    const institutionId = question.sub_filter_ids?.find(id => 
      institutions.includes(id)
    );
    
    if (institutionId) {
      const subFilter = subFiltersMap.get(institutionId);
      return subFilter?.name || institutionId;
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
      // Paginar localmente sem refazer a busca
      const startIndex = (currentPage - 2) * questionsPerPage;
      const endIndex = startIndex + questionsPerPage;
      setQuestions(allQuestions.slice(startIndex, endIndex));
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      // Paginar localmente sem refazer a busca
      const startIndex = currentPage * questionsPerPage;
      const endIndex = startIndex + questionsPerPage;
      setQuestions(allQuestions.slice(startIndex, endIndex));
      setCurrentPage(currentPage + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
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
            onClick={onClose}
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
          <div className="flex items-center justify-between p-6 border-t border-border-light dark:border-border-dark">
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Anterior</span>
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Próxima</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
