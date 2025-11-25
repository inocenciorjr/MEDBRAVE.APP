-- Migração para corrigir a chave primária da tabela user_flashcard_interactions
-- Remove firestore_id como chave primária e usa id como chave primária

BEGIN;

-- 1. Remover a constraint de chave primária atual
ALTER TABLE public.user_flashcard_interactions DROP CONSTRAINT user_flashcard_interactions_pkey;

-- 2. Adicionar nova chave primária usando o campo id
ALTER TABLE public.user_flashcard_interactions ADD CONSTRAINT user_flashcard_interactions_pkey PRIMARY KEY (id);

-- 3. Remover a coluna firestore_id já que não é mais necessária
ALTER TABLE public.user_flashcard_interactions DROP COLUMN firestore_id;

-- 4. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_flashcard_interactions_user_id ON public.user_flashcard_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_interactions_flashcard_id ON public.user_flashcard_interactions(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_interactions_deck_id ON public.user_flashcard_interactions(deck_id);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_interactions_reviewed_at ON public.user_flashcard_interactions(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_interactions_next_review_at ON public.user_flashcard_interactions(next_review_at);

COMMIT;