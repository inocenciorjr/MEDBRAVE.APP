// Export flashcards services redirected to Supabase implementations
export {
  SupabaseDeckService as DeckService,
  deckService,
} from '../../../../infra/studyTools/supabase/SupabaseDeckService';
export {
  SupabaseFlashcardService as FlashcardService,
  flashcardService,
} from '../../../../infra/studyTools/supabase/SupabaseFlashcardService';
// SupabaseFlashcardFSRSService removed - FSRS logic deprecated

// SearchIndexService removed - now uses GIN index directly on decks table
// export {
//   SupabaseSearchIndexService as SearchIndexService,
//   searchIndexService,
// } from '../../../../infra/studyTools/supabase/SupabaseSearchIndexService';

// Export types
export type * from '../types/deck.types';
export type * from '../types/flashcard.types';
export type * from '../types/searchIndex.types';
export type * from '../types/apkgReader.types';
