import api from './api';

export interface SimulatedExam {
  id: string;
  title: string;
  description?: string;
  time_limit_minutes: number;
  question_count: number;
  questions: string[]; // Array de question IDs
  difficulty?: 'easy' | 'medium' | 'hard';
  filter_ids?: string[];
  sub_filter_ids?: string[];
  status: 'draft' | 'published' | 'archived';
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  settings?: {
    showTimer: boolean;
    randomizeQuestions: boolean;
    allowReview: boolean;
  };
}

export interface SimulatedExamResult {
  id: string;
  user_id: string;
  simulated_exam_id: string;
  started_at: string;
  completed_at?: string;
  time_taken_seconds: number;
  score: number;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  answers: Record<string, string>; // questionId -> selectedOptionId
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface CreateSimulatedExamPayload {
  title: string;
  description?: string;
  time_limit_minutes: number;
  questions: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  filter_ids?: string[];
  sub_filter_ids?: string[];
  is_public?: boolean;
  tags?: string[];
  folder_id?: string;
  settings?: {
    showTimer?: boolean;
    randomizeQuestions?: boolean;
    allowReview?: boolean;
  };
}

export interface StartSimulatedExamResponse {
  id?: string;
  resultId: string;
  examId: string;
  startedAt: string;
  timeLimit: number;
}

class SimulatedExamService {
  /**
   * Criar um novo simulado
   */
  async createSimulatedExam(data: CreateSimulatedExamPayload): Promise<SimulatedExam> {
    const response = await api.post('/simulated-exams', data);
    return response.data.data;
  }

  /**
   * Criar simulado a partir de uma lista existente
   */
  async createFromList(
    listId: string, 
    timeLimitMinutes: number,
    customTitle?: string,
    randomizeQuestions?: boolean
  ): Promise<SimulatedExam> {
    // Buscar a lista
    const listResponse = await api.get(`/question-lists/${listId}`);
    const list = listResponse.data.data;

    // Embaralhar questões se solicitado
    let questionsToUse = list.questions || [];
    if (randomizeQuestions) {
      questionsToUse = [...questionsToUse].sort(() => Math.random() - 0.5);
    }

    // Criar simulado com as mesmas questões e na mesma pasta
    return this.createSimulatedExam({
      title: customTitle || `Simulado: ${list.name}`,
      description: list.description || `Simulado criado a partir da lista "${list.name}"`,
      time_limit_minutes: timeLimitMinutes,
      questions: questionsToUse,
      filter_ids: list.filter_ids,
      sub_filter_ids: list.sub_filter_ids,
      tags: [...(list.tags || []), 'simulado'],
      folder_id: list.folder_id, // Manter na mesma pasta da lista original
      settings: {
        showTimer: true,
        randomizeQuestions: randomizeQuestions || false,
        allowReview: false,
      },
    });
  }

  /**
   * Listar simulados do usuário autenticado
   */
  async getUserSimulatedExams(): Promise<SimulatedExam[]> {
    const response = await api.get('/simulated-exams/my');
    return response.data.data?.exams || response.data.data?.items || response.data.items || [];
  }

  /**
   * Buscar simulado por ID
   */
  async getSimulatedExamById(id: string): Promise<SimulatedExam> {
    const response = await api.get(`/simulated-exams/${id}`);
    return response.data.data;
  }

  /**
   * Atualizar simulado
   */
  async updateSimulatedExam(id: string, data: Partial<CreateSimulatedExamPayload>): Promise<SimulatedExam> {
    const response = await api.put(`/simulated-exams/${id}`, data);
    return response.data.data;
  }

  /**
   * Deletar simulado
   */
  async deleteSimulatedExam(id: string): Promise<void> {
    await api.delete(`/simulated-exams/${id}`);
  }

  /**
   * Iniciar um simulado
   */
  async startSimulatedExam(examId: string): Promise<StartSimulatedExamResponse> {
    const response = await api.post(`/simulated-exams/${examId}/start`, {
      device: navigator.userAgent,
      browser: navigator.userAgent,
    });
    return response.data.data;
  }

  /**
   * Submeter resposta de uma questão
   */
  async submitAnswer(resultId: string, questionId: string, answerId: string, timeSpent: number): Promise<void> {
    await api.post('/simulated-exams/answer', {
      resultId,
      questionId,
      answerId,
      timeSpent,
    });
  }

  /**
   * Atualizar uma resposta individual durante o simulado
   */
  async updateSimulatedExamAnswer(
    resultId: string,
    questionId: string,
    answerId: string | null
  ): Promise<void> {
    await api.patch(`/simulated-exams/results/${resultId}/answers`, {
      questionId,
      answerId,
    });
  }

  /**
   * Submeter todas as respostas e finalizar simulado
   */
  async submitSimulatedExamAnswers(
    resultId: string, 
    answers: Record<string, string>,
    timeSpent: number
  ): Promise<SimulatedExamResult> {
    const response = await api.post('/simulated-exams/finish', {
      resultId,
      answers,
      timeSpent,
    });
    return response.data.data;
  }

  /**
   * Finalizar simulado (método legado - use submitSimulatedExamAnswers)
   */
  async finishSimulatedExam(resultId: string): Promise<SimulatedExamResult> {
    const response = await api.post('/simulated-exams/finish', {
      resultId,
    });
    return response.data.data;
  }

  /**
   * Buscar resultado de um simulado
   */
  async getSimulatedExamResult(resultId: string): Promise<SimulatedExamResult> {
    const response = await api.get(`/simulated-exams/results/${resultId}`);
    return response.data.data;
  }

  /**
   * Listar resultados do usuário
   */
  async listUserResults(): Promise<SimulatedExamResult[]> {
    const response = await api.get('/simulated-exams/my/results');
    return response.data.data.results || [];
  }

  /**
   * Buscar estatísticas do usuário
   */
  async getUserStatistics(): Promise<any> {
    const response = await api.get('/simulated-exams/my/statistics');
    return response.data.data;
  }
}

export const simulatedExamService = new SimulatedExamService();
