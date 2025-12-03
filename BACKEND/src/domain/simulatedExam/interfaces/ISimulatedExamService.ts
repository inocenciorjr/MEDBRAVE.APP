import {
  CreateSimulatedExamPayload,
  FinishSimulatedExamPayload,
  ListSimulatedExamsOptions,
  PaginatedSimulatedExamResultsResult,
  PaginatedSimulatedExamsResult,
  SimulatedExam,
  SimulatedExamAnswer,
  SimulatedExamResult,
  SimulatedExamStatistics,
  StartSimulatedExamPayload,
  SubmitSimulatedExamAnswerPayload,
  UpdateSimulatedExamPayload,
} from '../types';

export interface ISimulatedExamService {
  /**
   * Cria um novo simulado
   * @param data Dados do simulado
   */
  createSimulatedExam(data: CreateSimulatedExamPayload): Promise<SimulatedExam>;

  /**
   * Obtém um simulado pelo ID
   * @param id ID do simulado
   */
  getSimulatedExamById(id: string): Promise<SimulatedExam | null>;

  /**
   * Atualiza um simulado
   * @param id ID do simulado
   * @param data Dados para atualização
   */
  updateSimulatedExam(
    id: string,
    data: UpdateSimulatedExamPayload,
  ): Promise<SimulatedExam>;

  /**
   * Exclui um simulado
   * @param id ID do simulado
   */
  deleteSimulatedExam(id: string): Promise<void>;

  /**
   * Lista simulados com filtros e paginação
   * @param options Opções de listagem e filtros
   */
  listSimulatedExams(
    options: ListSimulatedExamsOptions,
  ): Promise<PaginatedSimulatedExamsResult>;

  /**
   * Inicia um simulado para um usuário
   * @param data Dados para iniciar o simulado
   */
  startSimulatedExam(
    data: StartSimulatedExamPayload,
  ): Promise<SimulatedExamResult>;

  /**
   * Submete uma resposta para uma questão do simulado
   * @param data Dados da resposta
   */
  submitAnswer(
    data: SubmitSimulatedExamAnswerPayload,
  ): Promise<SimulatedExamAnswer>;

  /**
   * Atualiza um resultado de simulado
   * @param resultId ID do resultado
   * @param data Dados para atualização
   */
  updateSimulatedExamResult(
    resultId: string,
    data: { answers?: Record<string, string>; time_taken_seconds?: number }
  ): Promise<SimulatedExamResult>;

  /**
   * Finaliza uma tentativa de simulado
   * @param data Dados para finalizar o simulado
   */
  finishSimulatedExam(
    data: FinishSimulatedExamPayload,
  ): Promise<SimulatedExamResult>;

  /**
   * Obtém um resultado de simulado pelo ID
   * @param id ID do resultado
   */
  getSimulatedExamResultById(id: string): Promise<SimulatedExamResult | null>;

  /**
   * Lista resultados de simulados de um usuário
   * @param userId ID do usuário
   * @param options Opções de listagem e filtros
   */
  listUserSimulatedExamResults(
    userId: string,
    options?: ListSimulatedExamsOptions,
  ): Promise<PaginatedSimulatedExamResultsResult>;

  /**
   * Obtém estatísticas de simulados de um usuário
   * @param userId ID do usuário
   */
  getUserSimulatedExamStatistics(
    userId: string,
  ): Promise<SimulatedExamStatistics>;

  /**
   * Atualiza o status de uma atribuição de simulado do mentor
   * @param mentorExamId ID do simulado do mentor
   * @param userId ID do usuário
   * @param data Dados para atualização
   */
  updateMentorExamAssignment(
    mentorExamId: string,
    userId: string,
    data: {
      status: string;
      completed_at?: string;
      started_at?: string;
      score?: number;
      correct_count?: number;
      incorrect_count?: number;
      time_spent_seconds?: number;
    }
  ): Promise<void>;
}
