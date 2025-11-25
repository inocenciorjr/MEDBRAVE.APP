-- Função para obter questões do usuário por subespecialidade (primeiro nível de hierarquia)
CREATE OR REPLACE FUNCTION get_user_questions_by_subspecialty(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  sub_filter_id TEXT,
  subspecialty_name TEXT,
  count BIGINT,
  accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_responses AS (
    SELECT 
      qr.question_id,
      qr.is_correct,
      q.sub_filter_ids
    FROM question_responses qr
    INNER JOIN questions q ON q.id = qr.question_id
    WHERE qr.user_id = p_user_id
      AND qr.created_at >= p_start_date
      AND qr.created_at <= p_end_date
      AND qr.is_first_attempt = true
  ),
  subspecialty_stats AS (
    SELECT 
      jsonb_array_elements_text(ur.sub_filter_ids) AS sub_filter_id,
      COUNT(DISTINCT ur.question_id) AS total_questions,
      SUM(CASE WHEN ur.is_correct THEN 1 ELSE 0 END) AS correct_answers
    FROM user_responses ur
    GROUP BY jsonb_array_elements_text(ur.sub_filter_ids)
  )
  SELECT 
    ss.sub_filter_id::TEXT,
    sf.name::TEXT AS subspecialty_name,
    ss.total_questions,
    CASE 
      WHEN ss.total_questions > 0 
      THEN ROUND((ss.correct_answers::NUMERIC / ss.total_questions::NUMERIC) * 100, 2)
      ELSE 0 
    END AS accuracy
  FROM subspecialty_stats ss
  INNER JOIN sub_filters sf ON sf.id = ss.sub_filter_id
  INNER JOIN filters f ON f.id = sf.filter_id
  WHERE f.category = 'MEDICAL_SPECIALTY'
    AND sf.level = 1  -- Apenas primeiro nível (subespecialidades diretas)
    AND ss.total_questions > 0
  ORDER BY ss.total_questions DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para obter média global por subespecialidade
CREATE OR REPLACE FUNCTION get_global_accuracy_by_subspecialty(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  sub_filter_id TEXT,
  subspecialty_name TEXT,
  average_accuracy NUMERIC,
  total_questions BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_responses AS (
    SELECT 
      qr.user_id,
      qr.question_id,
      qr.is_correct,
      q.sub_filter_ids
    FROM question_responses qr
    INNER JOIN questions q ON q.id = qr.question_id
    WHERE qr.is_first_attempt = true
      AND (p_start_date IS NULL OR qr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR qr.created_at <= p_end_date)
  ),
  subspecialty_stats AS (
    SELECT 
      jsonb_array_elements_text(fr.sub_filter_ids) AS sub_filter_id,
      COUNT(DISTINCT fr.user_id) AS user_count,
      COUNT(DISTINCT fr.question_id) AS question_count,
      AVG(CASE WHEN fr.is_correct THEN 100.0 ELSE 0.0 END) AS avg_accuracy
    FROM filtered_responses fr
    GROUP BY jsonb_array_elements_text(fr.sub_filter_ids)
  )
  SELECT 
    ss.sub_filter_id::TEXT,
    sf.name::TEXT AS subspecialty_name,
    ROUND(ss.avg_accuracy, 2) AS average_accuracy,
    ss.question_count,
    ss.user_count
  FROM subspecialty_stats ss
  INNER JOIN sub_filters sf ON sf.id = ss.sub_filter_id
  INNER JOIN filters f ON f.id = sf.filter_id
  WHERE f.category = 'MEDICAL_SPECIALTY'
    AND sf.level = 1
    AND ss.question_count >= 10  -- Mínimo de questões para estatística relevante
    AND ss.user_count >= 3  -- Mínimo de usuários
  ORDER BY ss.question_count DESC;
END;
$$ LANGUAGE plpgsql;
