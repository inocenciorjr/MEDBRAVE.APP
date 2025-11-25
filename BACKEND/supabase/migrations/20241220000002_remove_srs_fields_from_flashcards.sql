-- Remove campos SRS duplicados da tabela flashcards
-- O unifiedreview já gerencia esses dados através das tabelas fsrs_cards e review_history

ALTER TABLE public.flashcards 
  DROP COLUMN IF EXISTS srs_data,
  DROP COLUMN IF EXISTS srs_interval,
  DROP COLUMN IF EXISTS srs_ease_factor,
  DROP COLUMN IF EXISTS srs_repetitions,
  DROP COLUMN IF EXISTS srs_lapses,
  DROP COLUMN IF EXISTS next_review_at,
  DROP COLUMN IF EXISTS last_reviewed_at;

-- Comentário: Os dados SRS agora são gerenciados exclusivamente pelo unifiedreview
-- através das tabelas fsrs_cards e review_history para evitar duplicação