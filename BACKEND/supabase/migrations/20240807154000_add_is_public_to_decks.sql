-- Adicionar coluna is_public à tabela decks
ALTER TABLE decks 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Atualizar registros existentes
UPDATE decks SET is_public = false WHERE is_public IS NULL;

-- Criar índice para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_decks_is_public ON decks(is_public);
CREATE INDEX IF NOT EXISTS idx_decks_user_id_is_public ON decks(user_id, is_public);