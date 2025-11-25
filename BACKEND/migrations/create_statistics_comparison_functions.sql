-- =====================================================
-- FUNÇÕES PARA COMPARAÇÕES GLOBAIS DE ESTATÍSTICAS
-- =====================================================

-- 1. Média global de acertos por mês
CREATE OR REPLACE FUNCTION get_global_accuracy_by_month()
RETURNS TABLE (
  month TEXT,
  average_accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(answered_at, 'YYYY-MM') as month,
    ROUND(AVG(CASE WHEN is_correct_on_first_attempt THEN 100 ELSE 0 END), 2) as average_accuracy
  FROM question_responses
  WHERE answered_at IS NOT NULL
  GROUP BY TO_CHAR(answered_at, 'YYYY-MM')
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Média global de acertos por especialidade (filtros MEDICAL_SPECIALTY)
CREATE OR REPLACE FUNCTION get_global_accuracy_by_specialty()
RETURNS TABLE (
  filter_id TEXT,
  filter_name TEXT,
  average_accuracy NUMERIC,
  total_questions BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH specialty_responses AS (
    SELECT 
      UNNEST(q.filter_ids::text[]) as filter_id,
      qr.is_correct_on_first_attempt,
      qr.user_id
    FROM question_responses qr
    JOIN questions q ON q.id = qr.question_id
    WHERE q.filter_ids IS NOT NULL
  )
  SELECT 
    sr.filter_id,
    COALESCE(f.name, 'Desconhecido') as filter_name,
    ROUND(AVG(CASE WHEN sr.is_correct_on_first_attempt THEN 100 ELSE 0 END), 2) as average_accuracy,
    COUNT(*)::BIGINT as total_questions,
    COUNT(DISTINCT sr.user_id)::BIGINT as total_users
  FROM specialty_responses sr
  LEFT JOIN filters f ON f.id = sr.filter_id
  GROUP BY sr.filter_id, f.name
  HAVING COUNT(*) >= 10 -- Mínimo de 10 questões para aparecer
  ORDER BY total_questions DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Média global de acertos por universidade (subfiltros de Universidade)
CREATE OR REPLACE FUNCTION get_global_accuracy_by_university()
RETURNS TABLE (
  sub_filter_id TEXT,
  university_name TEXT,
  average_accuracy NUMERIC,
  total_questions BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH university_responses AS (
    SELECT 
      UNNEST(q.sub_filter_ids::text[]) as sub_filter_id,
      qr.is_correct_on_first_attempt,
      qr.user_id
    FROM question_responses qr
    JOIN questions q ON q.id = qr.question_id
    WHERE q.sub_filter_ids IS NOT NULL
  )
  SELECT 
    ur.sub_filter_id,
    COALESCE(sf.name, 'Desconhecido') as university_name,
    ROUND(AVG(CASE WHEN ur.is_correct_on_first_attempt THEN 100 ELSE 0 END), 2) as average_accuracy,
    COUNT(*)::BIGINT as total_questions,
    COUNT(DISTINCT ur.user_id)::BIGINT as total_users
  FROM university_responses ur
  LEFT JOIN sub_filters sf ON sf.id = ur.sub_filter_id
  WHERE sf.filter_id IN (
    SELECT id FROM filters WHERE category = 'UNIVERSITY' OR name ILIKE '%universidade%'
  )
  GROUP BY ur.sub_filter_id, sf.name
  HAVING COUNT(*) >= 10 -- Mínimo de 10 questões para aparecer
  ORDER BY total_questions DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Média global de questões respondidas por mês
CREATE OR REPLACE FUNCTION get_global_questions_per_month()
RETURNS TABLE (
  month TEXT,
  average_questions NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_counts AS (
    SELECT 
      user_id,
      TO_CHAR(answered_at, 'YYYY-MM') as month,
      COUNT(*) as questions_count
    FROM question_responses
    WHERE answered_at IS NOT NULL
    GROUP BY user_id, TO_CHAR(answered_at, 'YYYY-MM')
  )
  SELECT 
    month,
    ROUND(AVG(questions_count), 2) as average_questions
  FROM monthly_counts
  GROUP BY month
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Questões do usuário por especialidade (com período)
CREATE OR REPLACE FUNCTION get_user_questions_by_specialty(
  p_user_id TEXT,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  filter_id TEXT,
  filter_name TEXT,
  count BIGINT,
  accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_specialty_responses AS (
    SELECT 
      UNNEST(q.filter_ids::text[]) as filter_id,
      qr.is_correct_on_first_attempt
    FROM question_responses qr
    JOIN questions q ON q.id = qr.question_id
    WHERE qr.user_id = p_user_id
      AND qr.answered_at >= p_start_date
      AND qr.answered_at <= p_end_date
      AND q.filter_ids IS NOT NULL
  )
  SELECT 
    usr.filter_id,
    COALESCE(f.name, 'Desconhecido') as filter_name,
    COUNT(*)::BIGINT as count,
    ROUND(AVG(CASE WHEN usr.is_correct_on_first_attempt THEN 100 ELSE 0 END), 2) as accuracy
  FROM user_specialty_responses usr
  LEFT JOIN filters f ON f.id = usr.filter_id
  GROUP BY usr.filter_id, f.name
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION get_global_accuracy_by_month() IS 
'Retorna a média global de acertos por mês de todos os usuários';

COMMENT ON FUNCTION get_global_accuracy_by_specialty() IS 
'Retorna a média global de acertos por especialidade médica (filtros)';

COMMENT ON FUNCTION get_global_accuracy_by_university() IS 
'Retorna a média global de acertos por universidade (subfiltros)';

COMMENT ON FUNCTION get_global_questions_per_month() IS 
'Retorna a média global de questões respondidas por mês';

COMMENT ON FUNCTION get_user_questions_by_specialty(TEXT, TIMESTAMP, TIMESTAMP) IS 
'Retorna a quantidade de questões por especialidade de um usuário específico em um período';
