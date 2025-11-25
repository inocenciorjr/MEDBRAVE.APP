-- Criar tabela para rankings diários do jogo Termo
CREATE TABLE IF NOT EXISTS termo_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    word VARCHAR NOT NULL,
    word_length INTEGER NOT NULL,
    attempts_used INTEGER NOT NULL,
    total_time INTEGER NOT NULL, -- tempo em segundos
    score INTEGER NOT NULL, -- pontuação calculada baseada em tentativas e tempo
    position INTEGER, -- posição no ranking do dia
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint único para garantir um ranking por usuário por dia
    UNIQUE(user_id, date) -- um usuário só pode ter um ranking por dia
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_termo_rankings_date ON termo_rankings (date);
CREATE INDEX IF NOT EXISTS idx_termo_rankings_score ON termo_rankings (score DESC);
CREATE INDEX IF NOT EXISTS idx_termo_rankings_position ON termo_rankings (position);

-- Habilitar RLS
ALTER TABLE termo_rankings ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados poderem ver todos os rankings
CREATE POLICY "Users can view all rankings" ON termo_rankings
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para usuários só poderem inserir/atualizar seus próprios rankings
CREATE POLICY "Users can insert their own rankings" ON termo_rankings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rankings" ON termo_rankings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Conceder permissões para roles anon e authenticated
GRANT SELECT ON termo_rankings TO anon;
GRANT ALL PRIVILEGES ON termo_rankings TO authenticated;

-- Função para calcular pontuação baseada em tentativas e tempo
CREATE OR REPLACE FUNCTION calculate_termo_score(attempts INTEGER, time_seconds INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Pontuação base: 1000 pontos
    -- Desconta 200 pontos por tentativa adicional (primeira tentativa = 0 desconto)
    -- Desconta 1 ponto por segundo
    RETURN GREATEST(0, 1000 - ((attempts - 1) * 200) - time_seconds);
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar posições no ranking diário
CREATE OR REPLACE FUNCTION update_daily_ranking_positions(ranking_date DATE)
RETURNS VOID AS $$
BEGIN
    WITH ranked_users AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY score DESC, total_time ASC, attempts_used ASC) as new_position
        FROM termo_rankings 
        WHERE date = ranking_date
    )
    UPDATE termo_rankings 
    SET position = ranked_users.new_position,
        updated_at = NOW()
    FROM ranked_users 
    WHERE termo_rankings.id = ranked_users.id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_termo_rankings_updated_at
    BEFORE UPDATE ON termo_rankings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();