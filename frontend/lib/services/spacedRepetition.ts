import { Flashcard, Difficulty } from '@/types/flashcards';

/**
 * SM-2 Algorithm for Spaced Repetition
 * Based on SuperMemo 2 algorithm
 * 
 * @param card - The flashcard being reviewed
 * @param difficulty - User's assessment of difficulty (again, hard, good, easy)
 * @returns Updated card data with new interval, ease factor, and repetitions
 */
export function calculateNextReview(card: Flashcard, difficulty: Difficulty): {
  nextReview: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
} {
  let { interval, easeFactor, repetitions } = card;

  // Map difficulty to quality (0-5 scale used in SM-2)
  const qualityMap: Record<Difficulty, number> = {
    again: 0,    // Complete blackout
    hard: 3,     // Correct response recalled with serious difficulty
    good: 4,     // Correct response after a hesitation
    easy: 5,     // Perfect response
  };

  const quality = qualityMap[difficulty];

  // If quality < 3, reset repetitions and start over
  if (quality < 3) {
    repetitions = 0;
    interval = 1; // Review again tomorrow
  } else {
    // Calculate new interval based on repetition number
    if (repetitions === 0) {
      interval = 1; // First successful review: 1 day
    } else if (repetitions === 1) {
      interval = 6; // Second successful review: 6 days
    } else {
      // Subsequent reviews: multiply previous interval by ease factor
      interval = Math.round(interval * easeFactor);
    }
    
    repetitions += 1;
  }

  // Calculate new ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ease factor should not be less than 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    nextReview,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)), // Round to 2 decimal places
    repetitions,
  };
}

/**
 * Check if a card is due for review
 */
export function isCardDue(card: Flashcard): boolean {
  if (!card.nextReview) {
    return true; // New card, always due
  }
  
  const now = new Date();
  const reviewDate = new Date(card.nextReview);
  return now >= reviewDate;
}

/**
 * Get cards that are due for review
 */
export function getDueCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter(isCardDue);
}

/**
 * Sort cards by priority (due cards first, then by interval)
 */
export function sortCardsByPriority(cards: Flashcard[]): Flashcard[] {
  return [...cards].sort((a, b) => {
    const aDue = isCardDue(a);
    const bDue = isCardDue(b);
    
    // Due cards come first
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    
    // Among due cards, sort by interval (shorter intervals first)
    if (aDue && bDue) {
      return a.interval - b.interval;
    }
    
    // Among non-due cards, sort by next review date
    const aNext = a.nextReview ? new Date(a.nextReview).getTime() : Infinity;
    const bNext = b.nextReview ? new Date(b.nextReview).getTime() : Infinity;
    return aNext - bNext;
  });
}
