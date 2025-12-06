import api from './api';

// Tipos
export interface IShowDoMilhaoGame {
  id: string;
  userId: string;
  filterIds: string[];
  subFilterIds: string[];
  institutionIds: string[];
  status: 'playing' | 'won' | 'lost' | 'stopped';
  currentQuestionIndex: number;
  currentPrize: number;
  guaranteedPrize: number;
  questionIds: string[];
  answers: IGameAnswer[];
  cardsUsed: boolean;
  universityUsed: boolean;
  skipsRemaining: number;
  totalCorrect: number;
  totalTimeSeconds: number;
  startedAt: string;
  completedAt?: string;
}

export interface IGameAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  timeSeconds: number;
  helpUsed?: 'cards' | 'university' | 'skip';
}

export interface IQuestion {
  id: string;
  content: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  professorComment?: string | null;
  questionIndex: number;
  totalQuestions: number;
  prizeLevel: {
    level: number;
    prize: number;
    checkpoint: boolean;
  };
  currentPrizeLevel: number; // Nível de prêmio atual (não muda quando pula)
  institution?: string | null;
  year?: string | null;
  subFilterIds?: string[];
}

export interface IAnswerResult {
  isCorrect: boolean;
  correctOptionId: string;
  newPrize: number;
  guaranteedPrize: number;
  gameOver: boolean;
  status: 'playing' | 'won' | 'lost';
  nextQuestionIndex?: number;
}

export interface IUseHelpResult {
  success: boolean;
  helpType: 'cards' | 'university' | 'skip';
  data?: {
    eliminatedOptions?: string[];
    universityAnswers?: IUniversityAnswer[];
    newQuestionIndex?: number;
  };
}

export interface IUniversityAnswer {
  studentId: number;
  studentName: string;
  selectedOptionIndex: number;
  confidence: 'alta' | 'media' | 'baixa';
}

export interface IShowDoMilhaoStats {
  userId: string;
  totalGames: number;
  gamesPlayed: number;
  gamesWon: number;
  wins: number;
  gamesLost: number;
  gamesStopped: number;
  totalPrizeAccumulated: number;
  highestPrize: number;
  timesReachedMillion: number;
  millionWins: number;
  currentStreak: number;
  maxStreak: number;
  totalCardsUsed: number;
  totalUniversityUsed: number;
  totalSkipsUsed: number;
  averageQuestionsCorrect: number;
  bestTimeSeconds?: number;
  lastPlayedAt?: string;
}

export interface IRankingEntry {
  id: string;
  position: number;
  userId: string;
  userName: string;
  displayName: string;
  avatarUrl?: string;
  photoUrl?: string;
  prize: number;
  finalPrize: number;
  correctAnswers: number;
  questionsCorrect: number;
  totalQuestions: number;
  timeSpent: number;
  totalTimeSeconds: number;
  multiplier: number;
  status: string;
  score: number;
  helpsUsed?: number;
  cardsUsed?: boolean;
  universityUsed?: boolean;
  skipsUsed?: number;
}

export interface IMillionaireEntry {
  id: string;
  position: number;
  userId: string;
  userName: string;
  displayName: string;
  avatarUrl?: string;
  photoUrl?: string;
  questionsCorrect: number;
  totalTimeSeconds: number;
  timeSpent: number;
  helpsUsed: number;
  cardsUsed: boolean;
  universityUsed: boolean;
  skipsUsed: number;
  multiplier: number;
  completedAt: string;
  achievedAt: string;
}

export interface IFatalityEntry {
  id: string;
  position: number;
  userId: string;
  userName: string;
  displayName: string;
  avatarUrl?: string;
  photoUrl?: string;
  multiplier: number;
  correctAnswers: number;
  questionsCorrect: number;
  totalQuestions: number;
  timeSpent: number;
  totalTimeSeconds: number;
}

export type UnansweredFilter = 'all' | 'unanswered_game' | 'unanswered_system';

export interface IStartGameParams {
  filterIds?: string[];
  subFilterIds?: string[];
  institutionIds?: string[];
  unansweredFilter?: UnansweredFilter;
}

// API Functions

/**
 * Iniciar novo jogo
 */
export async function startGame(params: IStartGameParams): Promise<IShowDoMilhaoGame> {
  const response = await api.post('/games/show-do-milhao/start', params);
  return response.data.data;
}

/**
 * Obter jogo atual do usuário
 */
export async function getCurrentGame(): Promise<IShowDoMilhaoGame | null> {
  const response = await api.get('/games/show-do-milhao/current');
  return response.data.data;
}

/**
 * Obter questão atual do jogo
 */
export async function getCurrentQuestion(gameId: string): Promise<IQuestion> {
  const response = await api.get(`/games/show-do-milhao/game/${gameId}/question`);
  return response.data.data;
}

/**
 * Responder questão
 */
export async function answerQuestion(
  gameId: string,
  selectedOptionId: string,
  timeSeconds: number
): Promise<IAnswerResult> {
  const response = await api.post(`/games/show-do-milhao/game/${gameId}/answer`, {
    selectedOptionId,
    timeSeconds,
  });
  return response.data.data;
}

/**
 * Parar jogo e levar prêmio atual
 */
export async function stopGame(gameId: string): Promise<{ finalPrize: number }> {
  const response = await api.post(`/games/show-do-milhao/game/${gameId}/stop`);
  return response.data.data;
}

/**
 * Usar ajuda: Cartas (elimina 1, 2 ou 3 alternativas erradas)
 */
export async function useCards(gameId: string): Promise<IUseHelpResult> {
  const response = await api.post(`/games/show-do-milhao/game/${gameId}/help/cards`);
  return response.data.data;
}

/**
 * Usar ajuda: Universitários (3 estudantes respondem)
 */
export async function useUniversity(gameId: string): Promise<IUseHelpResult> {
  const response = await api.post(`/games/show-do-milhao/game/${gameId}/help/university`);
  return response.data.data;
}

/**
 * Usar ajuda: Pular questão
 */
export async function useSkip(gameId: string): Promise<IUseHelpResult> {
  const response = await api.post(`/games/show-do-milhao/game/${gameId}/help/skip`);
  return response.data.data;
}

/**
 * Obter estatísticas do usuário
 */
export async function getStats(): Promise<IShowDoMilhaoStats | null> {
  const response = await api.get('/games/show-do-milhao/stats');
  return response.data.data;
}

/**
 * Obter ranking diário
 */
export async function getDailyRanking(): Promise<{
  ranking: IRankingEntry[];
  stats: {
    totalPlayers: number;
    winners: number;
    millionaires: number;
    date: string;
  };
}> {
  const response = await api.get('/games/show-do-milhao/ranking');
  return response.data.data;
}

/**
 * Obter ranking mensal de milionários
 */
export async function getMonthlyMillionaires(yearMonth?: string): Promise<{
  ranking: IMillionaireEntry[];
  stats: {
    totalMillionaires: number;
    yearMonth: string;
  };
}> {
  const params = yearMonth ? `?yearMonth=${yearMonth}` : '';
  const response = await api.get(`/games/show-do-milhao/ranking/millionaires${params}`);
  return response.data.data;
}

/**
 * Obter ranking do modo Fatality
 */
export async function getFatalityRanking(): Promise<{
  ranking: IFatalityEntry[];
  stats: {
    totalPlayers: number;
    highestMultiplier: number;
    date: string;
  };
}> {
  const response = await api.get('/games/show-do-milhao/ranking/fatality');
  return response.data.data;
}


/**
 * Obter ranking geral (all-time) - melhor de cada usuário
 */
export async function getAllTimeRanking(): Promise<{
  ranking: IRankingEntry[];
  stats: {
    totalPlayers: number;
  };
}> {
  const response = await api.get('/games/show-do-milhao/ranking/alltime');
  return response.data.data;
}

/**
 * Obter histórico de jogos do usuário (todas as tentativas)
 */
export async function getUserGameHistory(): Promise<{
  history: Array<{
    id: string;
    prize: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: number;
    multiplier: number;
    createdAt: string;
  }>;
}> {
  const response = await api.get('/games/show-do-milhao/history');
  return response.data.data;
}
