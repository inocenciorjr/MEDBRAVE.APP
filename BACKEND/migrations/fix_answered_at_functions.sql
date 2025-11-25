-- Fix functions that use answered_at->>'value' to handle both JSONB and timestamp

-- 1. get_today_question_stats
CREATE OR REPLACE FUNCTION get_today_question_stats(p_user_id UUID, p_today TEXT)
RETURNS TABLE (
  questions_answered BIGINT,
  correct_answers BIGINT,
  accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as questions_answered,
    SUM(CASE WHEN is_correct_on_first_attempt = true THEN 1 ELSE 0 END)::BIGINT as correct_answers,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((SUM(CASE WHEN is_correct_on_first_attempt = true THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
      ELSE 0
    END as accuracy
  FROM question_responses
  WHERE user_id = p_user_id
    AND answered_at::text LIKE p_today || '%';
END;
$$ LANGUAGE plpgsql;

-- 2. get_user_questions_by_specialty
CREATE OR REPLACE FUNCTION get_user_questions_by_specialty(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  filter_id TEXT,
  filter_name TEXT,
  count BIGINT,
  accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id AS filter_id,
    f.name AS filter_name,
    COUNT(DISTINCT qr.id) AS count,
    ROUND(
      (COUNT(DISTINCT CASE WHEN qr.is_correct_on_first_attempt = true AND qr.attempt_number = 1 THEN qr.id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT qr.id), 0)) * 100, 
      2
    ) AS accuracy
  FROM question_responses qr
  JOIN questions q ON q.id = qr.question_id
  CROSS JOIN LATERAL jsonb_array_elements_text(q.filter_ids) AS filter_id_elem
  JOIN filters f ON f.id = filter_id_elem::TEXT
  WHERE qr.user_id::UUID = p_user_id
    AND f.category = 'MEDICAL_SPECIALTY'
    AND (p_start_date IS NULL OR qr.answered_at >= p_start_date)
    AND (p_end_date IS NULL OR qr.answered_at <= p_end_date)
  GROUP BY f.id, f.name
  HAVING COUNT(DISTINCT qr.id) > 0
  ORDER BY count DESC, accuracy DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. get_user_questions_by_subspecialty
CREATE OR REPLACE FUNCTION get_user_questions_by_subspecialty(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  sub_filter_id TEXT,
  subspecialty_name TEXT,
  count BIGINT,
  accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sf.id AS sub_filter_id,
    sf.name AS subspecialty_name,
    COUNT(DISTINCT qr.id) AS count,
    ROUND(
      (COUNT(DISTINCT CASE WHEN qr.is_correct_on_first_attempt = true AND qr.attempt_number = 1 THEN qr.id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT qr.id), 0)) * 100, 
      2
    ) AS accuracy
  FROM question_responses qr
  JOIN questions q ON q.id = qr.question_id
  CROSS JOIN LATERAL jsonb_array_elements_text(q.sub_filter_ids) AS sub_filter_id_elem
  JOIN sub_filters sf ON sf.id = sub_filter_id_elem::TEXT
  WHERE qr.user_id::UUID = p_user_id
    AND sf.level = 1
    AND (
      sf.parent_id = sf.filter_id
      OR sf.filter_id = 'Outros'
    )
    AND (p_start_date IS NULL OR qr.answered_at >= p_start_date)
    AND (p_end_date IS NULL OR qr.answered_at <= p_end_date)
  GROUP BY sf.id, sf.name
  HAVING COUNT(DISTINCT qr.id) > 0
  ORDER BY count DESC, accuracy DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. get_global_accuracy_by_month
CREATE OR REPLACE FUNCTION get_global_accuracy_by_month(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
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
    AND (p_start_date IS NULL OR answered_at >= p_start_date)
    AND (p_end_date IS NULL OR answered_at <= p_end_date)
  GROUP BY TO_CHAR(answered_at, 'YYYY-MM')
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. get_global_questions_per_month
CREATE OR REPLACE FUNCTION get_global_questions_per_month(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
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
      AND (p_start_date IS NULL OR answered_at >= p_start_date)
      AND (p_end_date IS NULL OR answered_at <= p_end_date)
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

-- 6. get_global_accuracy_by_specialty
CREATE OR REPLACE FUNCTION get_global_accuracy_by_specialty(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
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
      jsonb_array_elements_text(q.filter_ids) as filter_id,
      qr.is_correct_on_first_attempt,
      qr.user_id
    FROM question_responses qr
    JOIN questions q ON q.id = qr.question_id
    WHERE q.filter_ids IS NOT NULL
      AND qr.answered_at IS NOT NULL
      AND (p_start_date IS NULL OR qr.answered_at >= p_start_date)
      AND (p_end_date IS NULL OR qr.answered_at <= p_end_date)
  )
  SELECT 
    sr.filter_id,
    COALESCE(f.name, 'Desconhecido') as filter_name,
    ROUND(AVG(CASE WHEN sr.is_correct_on_first_attempt THEN 100 ELSE 0 END), 2) as average_accuracy,
    COUNT(*)::BIGINT as total_questions,
    COUNT(DISTINCT sr.user_id)::BIGINT as total_users
  FROM specialty_responses sr
  LEFT JOIN filters f ON f.id = sr.filter_id
  WHERE f.category = 'MEDICAL_SPECIALTY'
  GROUP BY sr.filter_id, f.name
  HAVING COUNT(*) >= 10
  ORDER BY total_questions DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. get_global_accuracy_by_subspecialty
CREATE OR REPLACE FUNCTION get_global_accuracy_by_subspecialty(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
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
  SELECT 
    sf.id AS sub_filter_id,
    sf.name AS subspecialty_name,
    ROUND(AVG(CASE WHEN qr.is_correct_on_first_attempt = true AND qr.attempt_number = 1 THEN 100.0 ELSE 0.0 END), 2) AS average_accuracy,
    COUNT(DISTINCT qr.id) AS total_questions,
    COUNT(DISTINCT qr.user_id) AS total_users
  FROM question_responses qr
  JOIN questions q ON q.id = qr.question_id
  CROSS JOIN LATERAL jsonb_array_elements_text(q.sub_filter_ids) AS sub_filter_id_elem
  JOIN sub_filters sf ON sf.id = sub_filter_id_elem::TEXT
  WHERE sf.level = 1
    AND (
      sf.parent_id = sf.filter_id
      OR sf.filter_id = 'Outros'
    )
    AND (p_start_date IS NULL OR qr.answered_at >= p_start_date)
    AND (p_end_date IS NULL OR qr.answered_at <= p_end_date)
  GROUP BY sf.id, sf.name
  HAVING COUNT(DISTINCT qr.id) >= 10 AND COUNT(DISTINCT qr.user_id) >= 3
  ORDER BY total_questions DESC;
END;
$$ LANGUAGE plpgsql;

-- 8. get_global_accuracy_by_university
CREATE OR REPLACE FUNCTION get_global_accuracy_by_university(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
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
      jsonb_array_elements_text(q.sub_filter_ids) as sub_filter_id,
      qr.is_correct_on_first_attempt,
      qr.user_id
    FROM question_responses qr
    JOIN questions q ON q.id = qr.question_id
    WHERE q.sub_filter_ids IS NOT NULL
      AND qr.answered_at IS NOT NULL
      AND (p_start_date IS NULL OR qr.answered_at >= p_start_date)
      AND (p_end_date IS NULL OR qr.answered_at <= p_end_date)
  )
  SELECT 
    ur.sub_filter_id,
    COALESCE(sf.name, 'Desconhecido') as university_name,
    ROUND(AVG(CASE WHEN ur.is_correct_on_first_attempt THEN 100 ELSE 0 END), 2) as average_accuracy,
    COUNT(*)::BIGINT as total_questions,
    COUNT(DISTINCT ur.user_id)::BIGINT as total_users
  FROM university_responses ur
  LEFT JOIN sub_filters sf ON sf.id = ur.sub_filter_id
  WHERE sf.filter_id = 'Universidade' 
    AND sf.parent_id IS NOT NULL
    AND sf.parent_id LIKE 'Universidade_%'
  GROUP BY ur.sub_filter_id, sf.name
  HAVING COUNT(*) >= 10
  ORDER BY total_questions DESC;
END;
$$ LANGUAGE plpgsql;
