-- Tabela de jogos do MED TERMOOOO
CREATE TABLE IF NOT EXISTS med_termooo_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word VARCHAR(10) NOT NULL,
  word_length INTEGER NOT NULL DEFAULT 5,
  guesses TEXT[] DEFAULT '{}',
  is_completed BOOLEAN DEFAULT FALSE,
  is_won BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Garantir apenas um jogo por usuário por dia
  UNIQUE(user_id, date)
);

-- Tabela de estatísticas do MED TERMOOOO
CREATE TABLE IF NOT EXISTS med_termooo_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  guess_distribution JSONB DEFAULT '{}',
  last_played_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_med_termooo_games_user_date ON med_termooo_games(user_id, date);
CREATE INDEX IF NOT EXISTS idx_med_termooo_games_date ON med_termooo_games(date);
CREATE INDEX IF NOT EXISTS idx_med_termooo_stats_user ON med_termooo_stats(user_id);

-- RLS (Row Level Security)
ALTER TABLE med_termooo_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE med_termooo_stats ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para med_termooo_games
CREATE POLICY "Users can view their own games"
  ON med_termooo_games FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own games"
  ON med_termooo_games FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own games"
  ON med_termooo_games FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas de segurança para med_termooo_stats
CREATE POLICY "Users can view their own stats"
  ON med_termooo_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON med_termooo_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON med_termooo_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_med_termooo_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_med_termooo_stats_updated_at
  BEFORE UPDATE ON med_termooo_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_med_termooo_stats_updated_at();
