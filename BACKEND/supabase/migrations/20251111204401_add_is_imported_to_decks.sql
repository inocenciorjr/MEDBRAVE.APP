-- Adicionar coluna is_imported para identificar coleções importadas via .apkg
ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_imported BOOLEAN DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN decks.is_imported IS 'Indica se o deck foi importado via arquivo .apkg (true) ou criado diretamente na plataforma (false)';

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_decks_is_imported ON decks(is_imported);
