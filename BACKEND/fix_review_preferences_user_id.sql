-- Corrigir tipo de user_id na tabela review_preferences de TEXT para UUID
-- E garantir que as policies funcionem corretamente

-- 1. Remover policies antigas
DROP POLICY IF EXISTS "Users can view their own review preferences" ON review_preferences;
DROP POLICY IF EXISTS "Users can insert their own review preferences" ON review_preferences;
DROP POLICY IF EXISTS "Users can update their own review preferences" ON review_preferences;

-- 2. Alterar tipo da coluna user_id de TEXT para UUID
ALTER TABLE review_preferences 
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- 3. Alterar tipo da coluna id de TEXT para UUID (se necessário)
ALTER TABLE review_preferences 
  ALTER COLUMN id TYPE uuid USING id::uuid;

-- 4. Recriar policies com UUID
CREATE POLICY "Users can view their own review preferences"
  ON review_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review preferences"
  ON review_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review preferences"
  ON review_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Garantir que RLS está habilitado
ALTER TABLE review_preferences ENABLE ROW LEVEL SECURITY;
