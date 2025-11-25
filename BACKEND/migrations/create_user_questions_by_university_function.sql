-- Função para obter questões do usuário por universidade com filtro de período
CREATE OR REPLACE FUNCTION get_user_questions_by_university(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  sub_filter_id TEXT,
  university_name TEXT,
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
  university_stats AS (
    SELECT 
      jsonb_array_elements_text(ur.sub_filter_ids) AS sub_filter_id,
      COUNT(DISTINCT ur.question_id) AS total_questions,
      SUM(CASE WHEN ur.is_correct THEN 1 ELSE 0 END) AS correct_answers
    FROM user_responses ur
    GROUP BY jsonb_array_elements_text(ur.sub_filter_ids)
  )
  SELECT 
    us.sub_filter_id::TEXT,
    sf.name::TEXT AS university_name,
    us.total_questions,
    CASE 
      WHEN us.total_questions > 0 
      THEN ROUND((us.correct_answers::NUMERIC / us.total_questions::NUMERIC) * 100, 2)
      ELSE 0 
    END AS accuracy
  FROM university_stats us
  INNER JOIN sub_filters sf ON sf.id = us.sub_filter_id
  WHERE sf.filter_id = 'Universidade'
    AND sf.parent_id != 'Universidade' -- Apenas universidades, não estados
    AND us.total_questions > 0
  ORDER BY us.total_questions DESC;
END;
$$ LANGUAGE plpgsql;
