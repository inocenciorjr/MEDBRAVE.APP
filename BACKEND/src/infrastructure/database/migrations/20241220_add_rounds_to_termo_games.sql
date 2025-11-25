-- Adicionar colunas para sistema de rodadas no jogo Termo
ALTER TABLE termo_games 
ADD COLUMN current_round INTEGER DEFAULT 1,
ADD COLUMN max_rounds INTEGER DEFAULT 3,
ADD COLUMN rounds_used INTEGER DEFAULT 0;

-- Atualizar registros existentes
UPDATE termo_games 
SET 
  current_round = 1,
  max_rounds = 3,
  rounds_used = CASE 
    WHEN is_completed = true AND is_won = false THEN 3
    WHEN is_completed = true AND is_won = true THEN 1
    ELSE 0
  END,
  max_attempts = 6
WHERE current_round IS NULL;

-- Adicionar constraints
ALTER TABLE termo_games 
ADD CONSTRAINT check_current_round CHECK (current_round >= 1 AND current_round <= max_rounds),
ADD CONSTRAINT check_rounds_used CHECK (rounds_used >= 0 AND rounds_used <= max_rounds);