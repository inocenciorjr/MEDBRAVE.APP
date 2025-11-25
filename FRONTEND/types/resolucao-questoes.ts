// Types for Question Resolution Feature

export interface Question {
  id: string;
  institution: string;
  year: number;
  subject: string;
  topic: string;
  questionNumber: number;
  text: string;
  isHtml?: boolean; // Se true, o texto será renderizado como HTML
  images?: string[]; // URLs das imagens da questão
  alternatives: Alternative[];
  correctAlternative: string;
  likes: number;
  dislikes: number;
  tags: string[];
  sub_filter_ids?: string[]; // IDs dos subfiltros para montar hierarquia
  professorComment?: string; // Comentário/explicação do professor (suporta HTML)
  isAnnulled?: boolean; // Se true, a questão foi anulada
  isOutdated?: boolean; // Se true, a questão está desatualizada
}

export interface Alternative {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
  percentage?: number;
}

export interface QuestionState {
  selectedAlternative: string | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  highlights: TextHighlight[];
  userTags: string[];
}

export interface TextHighlight {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  type: 'highlight';
  color: HighlightColor;
}

export interface NavigationState {
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStates: Map<string, QuestionState>;
}

export type ToolMode = 'none' | 'highlight' | 'edit';
export type ViewMode = 'normal' | 'focus';
export type HighlightColor = 'yellow' | 'pink' | 'green' | 'blue' | 'orange';

export interface QuestionListItem {
  id: string;
  questionNumber: number;
  state: 'correct' | 'incorrect' | 'unanswered' | 'answered';
}
