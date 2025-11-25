export interface StudySession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  activityType: 'questions' | 'flashcards' | 'review' | 'simulated_exam' | 'reading';
  itemsCompleted: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StartSessionPayload {
  activityType: StudySession['activityType'];
}

export interface EndSessionPayload {
  itemsCompleted?: number;
}

export interface IStudySessionService {
  /**
   * Inicia uma nova sessão de estudo
   */
  startSession(userId: string, payload: StartSessionPayload): Promise<StudySession>;

  /**
   * Finaliza uma sessão de estudo
   */
  endSession(userId: string, sessionId: string, payload: EndSessionPayload): Promise<StudySession>;

  /**
   * Atualiza heartbeat da sessão (mantém ativa)
   */
  heartbeat(userId: string, sessionId: string): Promise<StudySession>;

  /**
   * Busca sessão ativa do usuário
   */
  getActiveSession(userId: string): Promise<StudySession | null>;

  /**
   * Busca sessões do usuário por período
   */
  getUserSessions(userId: string, startDate: Date, endDate: Date): Promise<StudySession[]>;

  /**
   * Calcula tempo total de estudo do usuário
   */
  getTotalStudyTime(userId: string): Promise<number>;

  /**
   * Busca tempo de estudo da semana atual (reseta toda segunda-feira)
   */
  getWeeklyStudyTime(userId: string): Promise<{
    totalMinutes: number;
    totalHours: number;
    sessionsCount: number;
    weekStart: string;
    weekEnd: string;
  }>;

  /**
   * Limpar sessões órfãs (ativas há mais de 2 horas)
   */
  cleanupOrphanedSessions(userId?: string): Promise<{ cleaned: number; sessions: string[] }>;
}
