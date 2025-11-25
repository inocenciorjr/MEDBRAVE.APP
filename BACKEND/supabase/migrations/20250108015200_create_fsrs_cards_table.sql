-- Criação da tabela fsrs_cards para o sistema FSRS
CREATE TABLE public.fsrs_cards (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id text NOT NULL,
    content_id text NOT NULL, -- flashcard ID
    deck_id text NOT NULL,
    
    -- Desnormalização para otimização
    deck_name text,
    filter_name text,
    
    -- Tipo de conteúdo (FLASHCARD, QUESTION, ERROR_NOTEBOOK)
    content_type text NOT NULL DEFAULT 'FLASHCARD',
    
    -- Parâmetros FSRS
    due timestamptz NOT NULL,
    stability numeric NOT NULL DEFAULT 0,
    difficulty numeric NOT NULL DEFAULT 0,
    elapsed_days integer NOT NULL DEFAULT 0,
    scheduled_days integer NOT NULL DEFAULT 0,
    reps integer NOT NULL DEFAULT 0,
    lapses integer NOT NULL DEFAULT 0,
    state text NOT NULL DEFAULT 'NEW',
    
    -- Timestamps
    last_review timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para otimização
CREATE INDEX idx_fsrs_cards_user_id ON public.fsrs_cards(user_id);
CREATE INDEX idx_fsrs_cards_content_id ON public.fsrs_cards(content_id);
CREATE INDEX idx_fsrs_cards_deck_id ON public.fsrs_cards(deck_id);
CREATE INDEX idx_fsrs_cards_due ON public.fsrs_cards(due);
CREATE INDEX idx_fsrs_cards_state ON public.fsrs_cards(state);
CREATE INDEX idx_fsrs_cards_user_deck ON public.fsrs_cards(user_id, deck_id);
CREATE INDEX idx_fsrs_cards_user_due ON public.fsrs_cards(user_id, due);

-- Índice único para evitar duplicatas
CREATE UNIQUE INDEX idx_fsrs_cards_unique_user_content ON public.fsrs_cards(user_id, content_id);

-- RLS (Row Level Security)
ALTER TABLE public.fsrs_cards ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuários só podem acessar seus próprios cards
CREATE POLICY "Users can only access their own FSRS cards" ON public.fsrs_cards
    FOR ALL USING (auth.uid()::text = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fsrs_cards_updated_at
    BEFORE UPDATE ON public.fsrs_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();