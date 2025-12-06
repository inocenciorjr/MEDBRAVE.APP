import api from './api';

export interface Filter {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
  order?: number;
}

export interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id: string | null;
  level: number;
  is_active: boolean;
  order?: number;
}

export interface FilterHierarchy extends Filter {
  children?: SubFilter[];
}

export interface Question {
  id: string;
  content: string;
  options: any;
  correct_answer: string;
  explanation?: string;
  filter_ids: string[];
  sub_filter_ids: string[];
  tags?: string[];
  status: string;
  difficulty?: number;
}

export interface SearchQuestionsParams {
  filterIds?: string[];
  subFilterIds?: string[];
  years?: number[];
  institutions?: string[];
  page?: number;
  limit?: number;
  // Filtro de questões não respondidas
  unansweredFilter?: 'all' | 'unanswered_game' | 'unanswered_system';
  gameType?: string; // Ex: 'show_do_milhao', 'banco_questoes', etc.
  // Filtros opcionais
  excludeOutdated?: boolean; // Excluir questões desatualizadas
  excludeAnnulled?: boolean; // Excluir questões anuladas
}

export interface SearchQuestionsResponse {
  questions: Question[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Busca todos os filtros raiz (especialidades principais)
 */
export async function getRootFilters(): Promise<Filter[]> {
  const response = await api.get('/banco-questoes/filters');
  return response.data.data;
}

/**
 * Busca hierarquia completa de filtros com subfiltros de nível 1
 */
export async function getFilterHierarchy(): Promise<FilterHierarchy[]> {
  const response = await api.get('/banco-questoes/filters/hierarchy');
  return response.data.data;
}

/**
 * Busca subfiltros de um filtro específico
 */
export async function getSubfiltersByFilter(
  filterId: string,
  level?: number,
): Promise<SubFilter[]> {
  const params = level !== undefined ? { level } : {};
  const response = await api.get(`/banco-questoes/filters/${filterId}/subfilters`, { params });
  return response.data.data;
}

/**
 * Conta questões por filtro
 */
export async function countQuestionsByFilter(filterId: string): Promise<number> {
  const response = await api.get(`/banco-questoes/filters/${filterId}/questions/count`);
  return response.data.data.count;
}

/**
 * Busca questões com filtros
 */
export async function searchQuestions(
  params: SearchQuestionsParams,
): Promise<SearchQuestionsResponse> {
  const response = await api.post('/banco-questoes/questions/search', params);
  return response.data.data;
}

export interface YearHierarchy {
  id: string;
  name: string;
  children?: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Busca anos disponíveis do banco de dados com hierarquia
 */
export async function getAvailableYears(): Promise<YearHierarchy[]> {
  const response = await api.get('/banco-questoes/years');
  return response.data.data;
}

export interface InstitutionHierarchy {
  id: string;
  name: string;
  type: 'state' | 'institution';
  children?: Array<{
    id: string;
    name: string;
    type: 'institution';
  }>;
}

/**
 * Busca hierarquia de instituições (estados e universidades)
 */
export async function getInstitutionHierarchy(): Promise<InstitutionHierarchy[]> {
  const response = await api.get('/banco-questoes/institutions');
  return response.data.data;
}
