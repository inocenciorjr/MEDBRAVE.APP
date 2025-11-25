-- Tabela para palavras diárias do jogo Termo
CREATE TABLE IF NOT EXISTS termo_daily_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word VARCHAR(8) NOT NULL,
  length INTEGER NOT NULL CHECK (length >= 4 AND length <= 8),
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para jogos do Termo
CREATE TABLE IF NOT EXISTS termo_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_word_id UUID NOT NULL REFERENCES termo_daily_words(id) ON DELETE CASCADE,
  guesses TEXT[] DEFAULT '{}',
  attempts_used INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  is_completed BOOLEAN DEFAULT FALSE,
  is_won BOOLEAN DEFAULT FALSE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, daily_word_id)
);

-- Tabela para estatísticas dos usuários no Termo
CREATE TABLE IF NOT EXISTS termo_user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  total_guesses INTEGER DEFAULT 0,
  average_guesses DECIMAL(3,2) DEFAULT 0,
  win_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_termo_daily_words_date ON termo_daily_words(date);
CREATE INDEX IF NOT EXISTS idx_termo_games_user_id ON termo_games(user_id);
CREATE INDEX IF NOT EXISTS idx_termo_games_daily_word_id ON termo_games(daily_word_id);
CREATE INDEX IF NOT EXISTS idx_termo_games_created_at ON termo_games(created_at);
CREATE INDEX IF NOT EXISTS idx_termo_user_stats_user_id ON termo_user_stats(user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_termo_games_updated_at
    BEFORE UPDATE ON termo_games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_termo_user_stats_updated_at
    BEFORE UPDATE ON termo_user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE termo_daily_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE termo_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE termo_user_stats ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para termo_daily_words (leitura pública)
CREATE POLICY "Palavras diárias são públicas para leitura" ON termo_daily_words
    FOR SELECT USING (true);

-- Políticas RLS para termo_games (usuários só veem seus próprios jogos)
CREATE POLICY "Usuários só veem seus próprios jogos" ON termo_games
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários só podem criar seus próprios jogos" ON termo_games
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários só podem atualizar seus próprios jogos" ON termo_games
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas RLS para termo_user_stats (usuários só veem suas próprias estatísticas)
CREATE POLICY "Usuários só veem suas próprias estatísticas" ON termo_user_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários só podem criar suas próprias estatísticas" ON termo_user_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários só podem atualizar suas próprias estatísticas" ON termo_user_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Conceder permissões para roles anon e authenticated
GRANT SELECT ON termo_daily_words TO anon, authenticated;
GRANT ALL ON termo_games TO authenticated;
GRANT ALL ON termo_user_stats TO authenticated;

-- Conceder permissões para sequências
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;