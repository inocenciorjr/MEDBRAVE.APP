-- Adicionar coluna content_type à tabela fsrs_cards
-- Esta migração corrige a definição original que não incluía content_type

-- Adicionar coluna content_type se não existir
ALTER TABLE public.fsrs_cards 
ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'FLASHCARD';

-- Atualizar registros existentes para ter o valor correto
UPDATE public.fsrs_cards 
SET content_type = 'FLASHCARD' 
WHERE content_type IS NULL OR content_type = '';

-- Criar índice para otimizar consultas por tipo de conteúdo
CREATE INDEX IF NOT EXISTS idx_fsrs_cards_content_type ON public.fsrs_cards(content_type);
CREATE INDEX IF NOT EXISTS idx_fsrs_cards_user_content_type ON public.fsrs_cards(user_id, content_type);

-- Atualizar comentário da tabela
COMMENT ON COLUMN public.fsrs_cards.content_type IS 'Tipo de conteúdo: FLASHCARD, QUESTION, ou ERROR_NOTEBOOK';