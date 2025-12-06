// ============================================================================
// SHOW DO MILHÃO MEDBRAVE - TIPOS E CONSTANTES
// ============================================================================

export interface Question {
  id: string;
  content: string;
  options: QuestionOption[];
  correctIndex: number;
  explanation?: string;
  category?: string;
  subFilterIds?: string[];
  filterIds?: string[];
}

export interface QuestionOption {
  id: string;
  text: string;
  letter: 'A' | 'B' | 'C' | 'D';
}

export type UnansweredFilter = 'all' | 'unanswered_game' | 'unanswered_system';

export interface GameConfig {
  selectedSubjects: string[];
  selectedInstitutions: string[];
  questionCount: number;
  unansweredFilter: UnansweredFilter;
}

export interface UniversityAnswer {
  id: number;
  name: string;
  avatar: string;
  selectedOption: number;
  confidence: 'alta' | 'media' | 'baixa';
}

export interface GameState {
  status: 'config' | 'playing' | 'paused' | 'won' | 'lost' | 'stopped' | 'fatality';
  currentQuestionIndex: number;
  currentPrizeLevel: number; // Nível de prêmio atual (não muda quando pula)
  currentPrize: number;
  guaranteedPrize: number;
  questions: Question[];
  usedHelps: {
    cards: boolean;
    university: boolean;
    skipsRemaining: number;
    medbrave: boolean; // Opinião MedBrave - mostra comentário antes de responder
  };
  eliminatedOptions: number[];
  universityAnswers: UniversityAnswer[] | null;
  showHint: boolean;
  selectedOption: number | null;
  isRevealing: boolean;
  isCorrect: boolean | null;
  totalCorrect: number;
  startTime: number | null;
  endTime: number | null;
  // Modo Fatality
  fatalityMode: boolean;
  fatalityMultiplier: number; // 1x, 2x, 3x...
  fatalityCorrect: number; // Quantas acertou no fatality
}

// Níveis de prêmio do Show do Milhão (baseado nos áudios disponíveis)
export const PRIZE_LEVELS = [
  { level: 1, prize: 1000, checkpoint: false, label: 'R$ 1.000' },
  { level: 2, prize: 2000, checkpoint: false, label: 'R$ 2.000' },
  { level: 3, prize: 3000, checkpoint: false, label: 'R$ 3.000' },
  { level: 4, prize: 4000, checkpoint: false, label: 'R$ 4.000' },
  { level: 5, prize: 5000, checkpoint: true, label: 'R$ 5.000' },
  { level: 6, prize: 10000, checkpoint: false, label: 'R$ 10.000' },
  { level: 7, prize: 20000, checkpoint: false, label: 'R$ 20.000' },
  { level: 8, prize: 30000, checkpoint: false, label: 'R$ 30.000' },
  { level: 9, prize: 40000, checkpoint: false, label: 'R$ 40.000' },
  { level: 10, prize: 50000, checkpoint: true, label: 'R$ 50.000' },
  { level: 11, prize: 100000, checkpoint: false, label: 'R$ 100.000' },
  { level: 12, prize: 200000, checkpoint: false, label: 'R$ 200.000' },
  { level: 13, prize: 300000, checkpoint: false, label: 'R$ 300.000' },
  { level: 14, prize: 400000, checkpoint: false, label: 'R$ 400.000' },
  { level: 15, prize: 500000, checkpoint: true, label: 'R$ 500.000' },
  { level: 16, prize: 1000000, checkpoint: true, label: 'R$ 1 MILHÃO' },
] as const;

// Nomes dos universitários
export const UNIVERSITY_STUDENTS = [
  { id: 1, name: 'Ana', avatar: '👩‍🎓' },
  { id: 2, name: 'Carlos', avatar: '👨‍🎓' },
  { id: 3, name: 'Marina', avatar: '👩‍⚕️' },
] as const;

// Configuração das cartas (elimina 1, 2 ou 3 alternativas)
export const CARD_ELIMINATIONS = [1, 2, 3] as const;

// Número máximo de pulos
export const MAX_SKIPS = 3;

// Fases de animação
export type AnimationPhase = 
  | 'idle'
  | 'question-entering'
  | 'options-entering'
  | 'waiting-answer'
  | 'option-selected'
  | 'suspense'
  | 'revealing'
  | 'result-correct'
  | 'result-wrong'
  | 'transitioning'
  | 'game-over';

// Sons do jogo (preparação para implementação futura)
export const SOUND_EVENTS = {
  GAME_START: 'game_start',
  QUESTION_APPEAR: 'question_appear',
  OPTION_HOVER: 'option_hover',
  OPTION_SELECT: 'option_select',
  SUSPENSE: 'suspense',
  CORRECT_ANSWER: 'correct_answer',
  WRONG_ANSWER: 'wrong_answer',
  HELP_CARDS: 'help_cards',
  HELP_UNIVERSITY: 'help_university',
  HELP_SKIP: 'help_skip',
  PRIZE_UP: 'prize_up',
  GAME_WON: 'game_won',
  GAME_LOST: 'game_lost',
} as const;

export type SoundEvent = typeof SOUND_EVENTS[keyof typeof SOUND_EVENTS];

// Utilitários
export function formatPrize(value: number): string {
  if (value >= 1000000) {
    return 'R$ 1 MILHÃO';
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

export function getCheckpointPrize(currentLevel: number): number {
  const checkpoints = PRIZE_LEVELS.filter(p => p.checkpoint && p.level < currentLevel);
  if (checkpoints.length === 0) return 0;
  return checkpoints[checkpoints.length - 1].prize;
}

export function getPrizeByLevel(level: number): number {
  const prizeLevel = PRIZE_LEVELS.find(p => p.level === level);
  return prizeLevel?.prize || 0;
}

// Gerar respostas dos universitários com probabilidades realistas
export function generateUniversityAnswers(correctIndex: number): UniversityAnswer[] {
  const random = Math.random();
  
  // Probabilidades:
  // 50% - 2 acertam, 1 erra
  // 25% - 3 acertam
  // 15% - 1 acerta, 2 erram
  // 10% - 3 erram
  
  let correctCount: number;
  if (random < 0.50) {
    correctCount = 2;
  } else if (random < 0.75) {
    correctCount = 3;
  } else if (random < 0.90) {
    correctCount = 1;
  } else {
    correctCount = 0;
  }
  
  const wrongOptions = [0, 1, 2, 3].filter(i => i !== correctIndex);
  const shuffledWrong = wrongOptions.sort(() => Math.random() - 0.5);
  
  return UNIVERSITY_STUDENTS.map((student, index) => {
    const isCorrect = index < correctCount;
    const selectedOption = isCorrect ? correctIndex : shuffledWrong[index % shuffledWrong.length];
    
    // Confiança baseada se acertou ou não
    const confidenceRandom = Math.random();
    let confidence: 'alta' | 'media' | 'baixa';
    if (isCorrect) {
      confidence = confidenceRandom < 0.6 ? 'alta' : confidenceRandom < 0.9 ? 'media' : 'baixa';
    } else {
      confidence = confidenceRandom < 0.3 ? 'alta' : confidenceRandom < 0.7 ? 'media' : 'baixa';
    }
    
    return {
      ...student,
      selectedOption,
      confidence,
    };
  });
}

// Determinar quantas alternativas eliminar com as cartas
export function drawCard(): number {
  const random = Math.random();
  // 50% chance de eliminar 1, 35% de eliminar 2, 15% de eliminar 3
  if (random < 0.50) return 1;
  if (random < 0.85) return 2;
  return 3;
}

// Estado inicial do jogo
export const INITIAL_GAME_STATE: GameState = {
  status: 'config',
  currentQuestionIndex: 0,
  currentPrizeLevel: 0,
  currentPrize: 0,
  guaranteedPrize: 0,
  questions: [],
  usedHelps: {
    cards: false,
    university: false,
    skipsRemaining: MAX_SKIPS,
    medbrave: false,
  },
  eliminatedOptions: [],
  universityAnswers: null,
  showHint: false,
  selectedOption: null,
  isRevealing: false,
  isCorrect: null,
  totalCorrect: 0,
  startTime: null,
  endTime: null,
  fatalityMode: false,
  fatalityMultiplier: 1,
  fatalityCorrect: 0,
};
