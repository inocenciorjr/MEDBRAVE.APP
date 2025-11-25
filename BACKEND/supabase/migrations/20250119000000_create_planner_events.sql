-- Tabela para armazenar eventos customizados do planner
CREATE TABLE IF NOT EXISTS planner_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificação do evento
  event_type TEXT NOT NULL CHECK (event_type IN ('system_review', 'user_task')),
  content_type TEXT, -- FLASHCARD, QUESTION, ERROR_NOTEBOOK, USER_TASK
  
  -- Dados do evento
  title TEXT NOT NULL,
  description TEXT,
  
  -- Horário
  date DATE NOT NULL,
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  start_minute INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute <= 59),
  end_hour INTEGER NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  end_minute INTEGER NOT NULL CHECK (end_minute >= 0 AND end_minute <= 59),
  
  -- Metadados
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT valid_time CHECK (
    (start_hour * 60 + start_minute) < (end_hour * 60 + end_minute)
  )
);

-- Índices para performance
CREATE INDEX idx_planner_events_user_date ON planner_events(user_id, date);
CREATE INDEX idx_planner_events_user_type ON planner_events(user_id, event_type);

-- RLS Policies
ALTER TABLE planner_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own planner events"
  ON planner_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planner events"
  ON planner_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planner events"
  ON planner_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planner events"
  ON planner_events FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_planner_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_planner_events_updated_at
  BEFORE UPDATE ON planner_events
  FOR EACH ROW
  EXECUTE FUNCTION update_planner_events_updated_at();
