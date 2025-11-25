-- Adicionar suporte a tarefas recorrentes na tabela planner_events

-- Adicionar campos de recorrência
ALTER TABLE planner_events
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_event_id UUID DEFAULT NULL REFERENCES planner_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE DEFAULT NULL;

-- Comentários explicativos
COMMENT ON COLUMN planner_events.is_recurring IS 'Indica se o evento é recorrente';
COMMENT ON COLUMN planner_events.recurrence_pattern IS 'Padrão de recorrência: {days: [0,1,2,3,4,5,6]} onde 0=Domingo, 6=Sábado';
COMMENT ON COLUMN planner_events.parent_event_id IS 'ID do evento pai (para instâncias geradas de eventos recorrentes)';
COMMENT ON COLUMN planner_events.recurrence_end_date IS 'Data final da recorrência';

-- Índice para buscar eventos recorrentes
CREATE INDEX IF NOT EXISTS idx_planner_events_recurring ON planner_events(user_id, is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_planner_events_parent ON planner_events(parent_event_id) WHERE parent_event_id IS NOT NULL;

-- Função para expandir eventos recorrentes em um intervalo de datas
CREATE OR REPLACE FUNCTION expand_recurring_events(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  event_type TEXT,
  content_type TEXT,
  title TEXT,
  description TEXT,
  date DATE,
  start_hour INTEGER,
  start_minute INTEGER,
  end_hour INTEGER,
  end_minute INTEGER,
  color TEXT,
  icon TEXT,
  status TEXT,
  completed_count INTEGER,
  total_count INTEGER,
  completed_at TIMESTAMPTZ,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_recurring BOOLEAN,
  recurrence_pattern JSONB,
  parent_event_id UUID,
  recurrence_end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE date_series AS (
    -- Gerar série de datas no intervalo
    SELECT p_start_date::DATE AS series_date
    UNION ALL
    SELECT (series_date + INTERVAL '1 day')::DATE
    FROM date_series
    WHERE series_date < p_end_date
  ),
  recurring_events AS (
    -- Buscar eventos recorrentes do usuário
    SELECT 
      re.id,
      re.user_id,
      re.event_type,
      re.content_type,
      re.title,
      re.description,
      re.date AS event_date,
      re.start_hour,
      re.start_minute,
      re.end_hour,
      re.end_minute,
      re.color,
      re.icon,
      re.status,
      re.completed_count,
      re.total_count,
      re.completed_at,
      re.session_id,
      re.metadata,
      re.created_at,
      re.updated_at,
      re.is_recurring,
      re.recurrence_pattern,
      re.parent_event_id,
      re.recurrence_end_date
    FROM planner_events re
    WHERE re.user_id = p_user_id
      AND re.is_recurring = TRUE
      AND re.parent_event_id IS NULL
      AND (re.recurrence_end_date IS NULL OR re.recurrence_end_date >= p_start_date)
      AND re.date <= p_end_date
  ),
  expanded_events AS (
    -- Expandir eventos recorrentes para cada data da série
    SELECT 
      gen_random_uuid() AS id,
      re.user_id,
      re.event_type,
      re.content_type,
      re.title,
      re.description,
      ds.series_date AS date,
      re.start_hour,
      re.start_minute,
      re.end_hour,
      re.end_minute,
      re.color,
      re.icon,
      COALESCE(pe_instance.status, 'pending'::TEXT) AS status,
      COALESCE(pe_instance.completed_count, 0) AS completed_count,
      COALESCE(pe_instance.total_count, 0) AS total_count,
      pe_instance.completed_at,
      pe_instance.session_id,
      re.metadata,
      re.created_at,
      re.updated_at,
      re.is_recurring,
      re.recurrence_pattern,
      re.id AS parent_event_id,
      re.recurrence_end_date
    FROM recurring_events re
    CROSS JOIN date_series ds
    LEFT JOIN planner_events pe_instance ON (
      pe_instance.parent_event_id = re.id 
      AND pe_instance.date = ds.series_date
    )
    WHERE 
      -- Verificar se o dia da semana está no array days
      (re.recurrence_pattern->'days') @> to_jsonb(EXTRACT(DOW FROM ds.series_date)::INTEGER)
      -- Verificar se está dentro do período de recorrência
      AND ds.series_date >= re.event_date
      AND (re.recurrence_end_date IS NULL OR ds.series_date <= re.recurrence_end_date)
  )
  -- Retornar eventos não-recorrentes + eventos recorrentes expandidos
  SELECT 
    pe.id,
    pe.user_id,
    pe.event_type,
    pe.content_type,
    pe.title,
    pe.description,
    pe.date,
    pe.start_hour,
    pe.start_minute,
    pe.end_hour,
    pe.end_minute,
    pe.color,
    pe.icon,
    pe.status,
    pe.completed_count,
    pe.total_count,
    pe.completed_at,
    pe.session_id,
    pe.metadata,
    pe.created_at,
    pe.updated_at,
    pe.is_recurring,
    pe.recurrence_pattern,
    pe.parent_event_id,
    pe.recurrence_end_date
  FROM planner_events pe
  WHERE pe.user_id = p_user_id
    AND pe.date BETWEEN p_start_date AND p_end_date
    AND (pe.is_recurring = FALSE OR pe.parent_event_id IS NOT NULL)
  
  UNION ALL
  
  SELECT * FROM expanded_events;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION expand_recurring_events IS 'Expande eventos recorrentes em instâncias individuais para um intervalo de datas';
