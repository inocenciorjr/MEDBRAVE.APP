import {
  CreateQuestionPayload,
  ListQuestionsOptions,
  PaginatedQuestionsResult,
  Question,
  UpdateQuestionPayload,
  UserPerformanceBySpecialty,
} from '../types';

/**
 * Interface do serviço de banco de questões
 */
export interface IQuestionService {
  /**
   * Cria uma nova questão
   * @param questionData Dados da questão
   */
  createQuestion(questionData: CreateQuestionPayload): Promise<Question>;

  /**
   * Obtém uma questão pelo ID
   * @param id ID da questão
   */
  getQuestionById(id: string): Promise<Question | null>;

  /**
   * Obtém múltiplas questões pelos IDs (otimização para listas)
   * @param ids Array de IDs das questões
   */
  getBulkQuestions(ids: string[]): Promise<Question[]>;

  /**
   * Atualiza uma questão existente
   * @param id ID da questão
   * @param updateData Dados para atualização
   */
  updateQuestion(
    id: string,
    updateData: UpdateQuestionPayload,
  ): Promise<Question | null>;

  /**
   * Exclui uma questão (soft delete - muda status para ARCHIVED e desativa)
   * @param id ID da questão
   */
  deleteQuestion(id: string): Promise<Question | null>;

  /**
   * Lista questões com filtros e paginação
   * @param options Opções de listagem e filtros
   */
  listQuestions(
    options?: ListQuestionsOptions,
  ): Promise<PaginatedQuestionsResult>;

  /**
   * Busca questões por termo de pesquisa
   * @param options Opções de busca e filtros
   */
  searchQuestions(
    options: ListQuestionsOptions,
  ): Promise<PaginatedQuestionsResult>;

  /**
   * Atualiza a classificação da questão
   * @param id ID da questão
   * @param rating Classificação (1-5)
   * @param reviewerId ID do usuário que revisou
   * @param reviewNotes Notas da revisão
   */
  rateQuestion(
    id: string,
    rating: number,
    reviewerId: string,
    reviewNotes?: string,
  ): Promise<Question | null>;

  /**
   * Verifica se uma questão existe
   * @param id ID da questão
   */
  questionExists(id: string): Promise<boolean>;

  /**
   * Adiciona tags a uma questão
   * @param id ID da questão
   * @param tags Tags a serem adicionadas
   */
  addTags(id: string, tags: string[]): Promise<Question | null>;

  /**
   * Remove tags de uma questão
   * @param id ID da questão
   * @param tags Tags a serem removidas
   */
  removeTags(id: string, tags: string[]): Promise<Question | null>;

  /**
   * Altera o status de uma questão
   * @param id ID da questão
   * @param status Novo status
   */
  changeStatus(id: string, status: string): Promise<Question | null>;

  /**
   * Lista questões por filtros ou subfiltros
   * @param filter_ids IDs dos filtros
   * @param sub_filter_ids IDs dos subfiltros
   * @param options Opções adicionais de listagem
   */
  listQuestionsByFilters(
    filter_ids: string[] | null,
    sub_filter_ids: string[] | null,
    options?: ListQuestionsOptions,
  ): Promise<PaginatedQuestionsResult>;

  /**
   * Lista questões relacionadas a uma questão
   * @param questionId ID da questão
   * @param limit Limite de questões a retornar
   */
  listRelatedQuestions(questionId: string, limit?: number): Promise<Question[]>;

  /**
   * Obtém questões de uma lista
   * @param listId ID da lista
   */
  getQuestionsFromList(listId: string): Promise<any[]>;

  /**
   * Obtém um batch de questões de uma lista
   * @param listId ID da lista
   * @param offset Índice inicial
   * @param limit Quantidade de questões
   */
  getQuestionsFromListBatch(listId: string, offset: number, limit: number): Promise<{ questions: any[], total: number }>;

  /**
   * Conta questões com filtros
   * @param options Opções de listagem e filtros
   */
  countQuestions(options?: ListQuestionsOptions): Promise<number>;

  /**
   * Analisa a performance do usuário por especialidade médica
   * Considera apenas filtros com category: MEDICAL_SPECIALTY
   * @param userId ID do usuário
   */
  getUserPerformanceBySpecialty(
    userId: string,
  ): Promise<UserPerformanceBySpecialty>;

  /**
   * Conta questões em lote para múltiplos filtros/subfiltros
   * Otimização para reduzir número de requisições em ambientes multi-usuário
   * @param requests Array de requisições de contagem
   */
  batchCountQuestions(
    requests: Array<{
      id: string;
      isSubFilter: boolean;
      exclude_anuladas: boolean;
      exclude_desatualizadas: boolean;
    }>,
  ): Promise<Record<string, number>>;

  /**
   * Obtém estatísticas gerais das questões
   * @returns Estatísticas com total, publicadas, rascunhos e arquivadas
   */
  getQuestionStats(): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
  }>;
}
