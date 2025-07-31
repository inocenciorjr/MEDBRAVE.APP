// Tipos FSRS – frontbrave/src/types/fsrs.js

export const FSRSGrade = Object.freeze({
  AGAIN: 1,    // Errei completamente
  HARD: 2,     // Lembrei com esforço
  GOOD: 3,     // Acertei com confiança
  EASY: 4,     // Muito fácil
});

export const FSRSState = Object.freeze({
  NEW: 'NEW',
  LEARNING: 'LEARNING',
  REVIEW: 'REVIEW',
  RELEARNING: 'RELEARNING',
}); 