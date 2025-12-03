-- ============================================
-- SCRIPT DE LIMPEZA DOS DADOS DE TESTE
-- Remove todos os dados criados pelo seed-test-data.sql
-- ============================================

-- Desabilitar triggers temporariamente para performance
SET session_replication_role = replica;

DO $$
DECLARE
    deleted_count INT;
BEGIN
    RAISE NOTICE '🧹 Iniciando limpeza dos dados de teste...';

    -- ============================================
    -- 1. DELETAR RESPOSTAS DE QUESTÕES (question_responses)
    -- ============================================
    DELETE FROM question_responses
    WHERE simulated_exam_id LIKE 'test-usim-%';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deletadas % respostas de questões', deleted_count;

    -- ============================================
    -- 2. DELETAR RESULTADOS DE SIMULADOS
    -- ============================================
    DELETE FROM simulated_exam_results
    WHERE simulated_exam_id LIKE 'test-usim-%';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deletados % resultados de simulados', deleted_count;

    -- ============================================
    -- 3. DELETAR ASSIGNMENTS
    -- ============================================
    DELETE FROM mentor_exam_assignments
    WHERE mentor_exam_id LIKE 'test-sim-%';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deletados % assignments', deleted_count;

    -- ============================================
    -- 4. DELETAR SIMULADOS INDIVIDUAIS
    -- ============================================
    DELETE FROM simulated_exams
    WHERE id LIKE 'test-usim-%';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deletados % simulados individuais', deleted_count;

    -- ============================================
    -- 5. DELETAR SIMULADOS DO MENTOR
    -- ============================================
    DELETE FROM mentor_simulated_exams
    WHERE id LIKE 'test-sim-%';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deletados % simulados do mentor', deleted_count;

    -- ============================================
    -- 6. DELETAR MENTORIAS DE TESTE
    -- ============================================
    DELETE FROM mentorships
    WHERE title LIKE '[TESTE]%';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deletadas % mentorias', deleted_count;

    -- ============================================
    -- 7. DELETAR PROGRAMAS DE TESTE
    -- ============================================
    DELETE FROM mentor_programs
    WHERE title LIKE '[TESTE]%';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deletados % programas', deleted_count;

    -- ============================================
    -- 8. DELETAR USUÁRIOS DE TESTE
    -- ============================================
    DELETE FROM users
    WHERE email LIKE '%@medbrave-test.com';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deletados % usuários de teste', deleted_count;

    RAISE NOTICE '✅ Limpeza completa!';
    
END $$;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;
