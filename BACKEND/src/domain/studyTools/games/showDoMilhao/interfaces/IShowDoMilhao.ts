// Interfaces do Show do Milhão

export interface IShowDoMilhaoGame {
  id: string;
  userId: string;
  
  // Configuração
  filterIds: string[];
  subFilterIds: string[];
  institutionIds: string[];
  
  // Estado
  status: 'playing' | 'won' | 'lost' | 'stopped';
  currentQuestionIndex: number;
  currentPrize: number;
  guaranteedPrize: number;
  
  // Questões
  questionIds: string[];
  answers: IGameAnswer[];
  
  // Ajudas
  cardsUsed: boolean;
  universityUsed: boolean;
  skipsRemaining: number;
  
  // Estatísticas
  totalCorrect: number;
  totalTimeSeconds: number;
  
  // Timestamps
  startedAt: Date;
  completedAt?: Date;
}

export interface IGameAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  timeSeconds: number;
  helpUsed?: 'cards' | 'university' | 'skip';
}

export interface IShowDoMilhaoStats {
  userId: string;
  totalGames: number;
  gamesPlayed: number; // Alias para totalGames
  gamesWon: number;
  wins: number; // Alias para gamesWon
  gamesLost: number;
  gamesStopped: number;
  totalPrizeAccumulated: number;
  highestPrize: number;
  timesReachedMillion: number;
  millionWins: number; // Alias para timesReachedMillion
  currentStreak: number;
  maxStreak: number;
  totalCardsUsed: number;
  totalUniversityUsed: number;
  totalSkipsUsed: number;
  averageQuestionsCorrect: number;
  bestTimeSeconds?: number;
  lastPlayedAt?: Date;
}

export type UnansweredFilter = 'all' | 'unanswered_game' | 'unanswered_system';

export interface IStartGameParams {
  filterIds?: string[];
  subFilterIds?: string[];
  institutionIds?: string[];
  unansweredFilter?: UnansweredFilter; // 'all' = todas, 'unanswered_game' = nunca respondidas no Show do Milhão, 'unanswered_system' = nunca respondidas no sistema
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

export interface IRankingEntry {
  position: number;
  userId: string;
  displayName: string;
  photoUrl?: string;
  finalPrize: number;
  questionsCorrect: number;
  totalTimeSeconds: number;
  status: string;
  score: number;
}

// Níveis de prêmio
export const PRIZE_LEVELS = [
  { level: 1, prize: 1000, checkpoint: false },
  { level: 2, prize: 2000, checkpoint: false },
  { level: 3, prize: 3000, checkpoint: false },
  { level: 4, prize: 4000, checkpoint: false },
  { level: 5, prize: 5000, checkpoint: true },
  { level: 6, prize: 10000, checkpoint: false },
  { level: 7, prize: 20000, checkpoint: false },
  { level: 8, prize: 30000, checkpoint: false },
  { level: 9, prize: 40000, checkpoint: false },
  { level: 10, prize: 50000, checkpoint: true },
  { level: 11, prize: 100000, checkpoint: false },
  { level: 12, prize: 200000, checkpoint: false },
  { level: 13, prize: 300000, checkpoint: false },
  { level: 14, prize: 400000, checkpoint: false },
  { level: 15, prize: 500000, checkpoint: true },
  { level: 16, prize: 1000000, checkpoint: true },
] as const;

export const MAX_SKIPS = 3;
export const QUESTION_TIME_LIMIT = 85; // segundos
