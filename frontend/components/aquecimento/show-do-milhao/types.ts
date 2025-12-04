'use client';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  hint?: string;
}

export interface GameState {
  currentQuestionIndex: number;
  score: number;
  gameStatus: 'playing' | 'won' | 'lost' | 'stopped';
  usedHelps: {
    skip: boolean;
    eliminate: boolean;
    hint: boolean;
  };
  eliminatedOptions: number[];
  showHint: boolean;
  answeredQuestions: number[];
  correctAnswers: number;
}

export const PRIZE_LEVELS = [
  { level: 1, prize: 1000, checkpoint: false },
  { level: 2, prize: 2000, checkpoint: false },
  { level: 3, prize: 5000, checkpoint: false },
  { level: 4, prize: 10000, checkpoint: true },
  { level: 5, prize: 20000, checkpoint: false },
  { level: 6, prize: 50000, checkpoint: false },
  { level: 7, prize: 100000, checkpoint: true },
  { level: 8, prize: 200000, checkpoint: false },
  { level: 9, prize: 500000, checkpoint: false },
  { level: 10, prize: 1000000, checkpoint: true },
];

export const QUESTIONS: Question[] = [
  // Fáceis (1-3)
  {
    id: '1',
    question: 'Qual órgão é responsável por bombear sangue para todo o corpo?',
    options: ['Pulmão', 'Coração', 'Fígado', 'Rim'],
    correctIndex: 1,
    category: 'Anatomia',
    difficulty: 'easy',
    hint: 'Está localizado no tórax, entre os pulmões',
  },
  {
    id: '2',
    question: 'A insulina é produzida por qual órgão?',
    options: ['Fígado', 'Rim', 'Pâncreas', 'Baço'],
    correctIndex: 2,
    category: 'Endocrinologia',
    difficulty: 'easy',
    hint: 'Órgão que também produz enzimas digestivas',
  },
  {
    id: '3',
    question: 'Qual é o maior osso do corpo humano?',
    options: ['Úmero', 'Tíbia', 'Fêmur', 'Fíbula'],
    correctIndex: 2,
    category: 'Anatomia',
    difficulty: 'easy',
    hint: 'Localizado na coxa',
  },
  // Médias (4-6)
  {
    id: '4',
    question: 'A doença de Parkinson afeta principalmente qual neurotransmissor?',
    options: ['Serotonina', 'Dopamina', 'Acetilcolina', 'Noradrenalina'],
    correctIndex: 1,
    category: 'Neurologia',
    difficulty: 'medium',
    hint: 'Relacionado ao sistema de recompensa',
  },
  {
    id: '5',
    question: 'Qual exame é padrão-ouro para diagnóstico de embolia pulmonar?',
    options: ['Raio-X de tórax', 'Angiotomografia', 'ECG', 'Ecocardiograma'],
    correctIndex: 1,
    category: 'Pneumologia',
    difficulty: 'medium',
    hint: 'Exame de imagem com contraste',
  },
  {
    id: '6',
    question: 'A tríade de Charcot está associada a qual condição?',
    options: ['Apendicite', 'Colangite', 'Pancreatite', 'Colecistite'],
    correctIndex: 1,
    category: 'Gastroenterologia',
    difficulty: 'medium',
    hint: 'Febre, icterícia e dor em hipocôndrio direito',
  },
  // Difíceis (7-8)
  {
    id: '7',
    question: 'Qual anticorpo está mais associado à Miastenia Gravis?',
    options: ['Anti-DNA', 'Anti-AChR', 'Anti-TPO', 'Anti-CCP'],
    correctIndex: 1,
    category: 'Neurologia',
    difficulty: 'hard',
    hint: 'Relacionado à junção neuromuscular',
  },
  {
    id: '8',
    question: 'A síndrome de Cushing é causada pelo excesso de qual hormônio?',
    options: ['Aldosterona', 'Cortisol', 'Adrenalina', 'Tiroxina'],
    correctIndex: 1,
    category: 'Endocrinologia',
    difficulty: 'hard',
    hint: 'Hormônio do estresse',
  },
  // Expert (9-10)
  {
    id: '9',
    question: 'Qual mutação genética está associada à Fibrose Cística?',
    options: ['BRCA1', 'CFTR', 'TP53', 'HFE'],
    correctIndex: 1,
    category: 'Genética',
    difficulty: 'expert',
    hint: 'Canal de cloro',
  },
  {
    id: '10',
    question: 'O sinal de Trousseau é característico de qual distúrbio?',
    options: ['Hipercalcemia', 'Hipocalcemia', 'Hipernatremia', 'Hipocalemia'],
    correctIndex: 1,
    category: 'Clínica Médica',
    difficulty: 'expert',
    hint: 'Espasmo carpopedal',
  },
];

// Mais perguntas para variedade
export const EXTRA_QUESTIONS: Question[] = [
  // Fáceis
  {
    id: '11',
    question: 'Qual vitamina é produzida pela exposição ao sol?',
    options: ['Vitamina A', 'Vitamina C', 'Vitamina D', 'Vitamina E'],
    correctIndex: 2,
    category: 'Nutrição',
    difficulty: 'easy',
  },
  {
    id: '12',
    question: 'Quantos pares de costelas o ser humano possui?',
    options: ['10 pares', '11 pares', '12 pares', '13 pares'],
    correctIndex: 2,
    category: 'Anatomia',
    difficulty: 'easy',
  },
  {
    id: '13',
    question: 'A hemoglobina transporta principalmente qual gás?',
    options: ['Nitrogênio', 'Oxigênio', 'Dióxido de carbono', 'Hélio'],
    correctIndex: 1,
    category: 'Fisiologia',
    difficulty: 'easy',
  },
  // Médias
  {
    id: '14',
    question: 'Qual é o principal agente etiológico da pneumonia comunitária?',
    options: ['Staphylococcus aureus', 'Streptococcus pneumoniae', 'Klebsiella', 'Pseudomonas'],
    correctIndex: 1,
    category: 'Infectologia',
    difficulty: 'medium',
  },
  {
    id: '15',
    question: 'A escala de Glasgow avalia qual parâmetro?',
    options: ['Dor', 'Nível de consciência', 'Força muscular', 'Reflexos'],
    correctIndex: 1,
    category: 'Neurologia',
    difficulty: 'medium',
  },
  {
    id: '16',
    question: 'Qual é o tratamento de primeira linha para anafilaxia?',
    options: ['Corticoide', 'Anti-histamínico', 'Adrenalina', 'Broncodilatador'],
    correctIndex: 2,
    category: 'Emergência',
    difficulty: 'medium',
  },
  // Difíceis
  {
    id: '17',
    question: 'A tríade de Beck está associada a qual condição?',
    options: ['IAM', 'Tamponamento cardíaco', 'TEP', 'Dissecção de aorta'],
    correctIndex: 1,
    category: 'Cardiologia',
    difficulty: 'hard',
  },
  {
    id: '18',
    question: 'Qual é o marcador tumoral mais específico para câncer de próstata?',
    options: ['CEA', 'CA-125', 'PSA', 'AFP'],
    correctIndex: 2,
    category: 'Oncologia',
    difficulty: 'hard',
  },
  // Expert
  {
    id: '19',
    question: 'A síndrome de Guillain-Barré é caracterizada por qual padrão no LCR?',
    options: ['Pleocitose', 'Dissociação albumino-citológica', 'Hipoglicorraquia', 'Xantocromia'],
    correctIndex: 1,
    category: 'Neurologia',
    difficulty: 'expert',
  },
  {
    id: '20',
    question: 'Qual é o mecanismo de ação da Metformina?',
    options: ['Estimula secreção de insulina', 'Inibe gliconeogênese hepática', 'Bloqueia absorção de glicose', 'Aumenta sensibilidade periférica'],
    correctIndex: 1,
    category: 'Farmacologia',
    difficulty: 'expert',
  },
];

export function getRandomQuestions(): Question[] {
  const allQuestions = [...QUESTIONS, ...EXTRA_QUESTIONS];
  
  const easy = allQuestions.filter(q => q.difficulty === 'easy');
  const medium = allQuestions.filter(q => q.difficulty === 'medium');
  const hard = allQuestions.filter(q => q.difficulty === 'hard');
  const expert = allQuestions.filter(q => q.difficulty === 'expert');
  
  const shuffle = <T,>(arr: T[]): T[] => arr.sort(() => Math.random() - 0.5);
  
  return [
    ...shuffle(easy).slice(0, 3),
    ...shuffle(medium).slice(0, 3),
    ...shuffle(hard).slice(0, 2),
    ...shuffle(expert).slice(0, 2),
  ];
}

export function formatPrize(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getCheckpointPrize(currentLevel: number): number {
  const checkpoints = PRIZE_LEVELS.filter(p => p.checkpoint && p.level < currentLevel);
  if (checkpoints.length === 0) return 0;
  return checkpoints[checkpoints.length - 1].prize;
}
