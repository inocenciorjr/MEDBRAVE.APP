-- ============================================
-- SCRIPT DE SEED PARA DADOS DE TESTE
-- Mentor ID: 508b166b-7969-444a-98ca-ea960f26f1d0
-- ============================================
-- IMPORTANTE: Execute o script de limpeza (cleanup-test-data.sql) para remover tudo

-- Configurações
DO $$
DECLARE
    mentor_id UUID := '508b166b-7969-444a-98ca-ea960f26f1d0';
    program1_id UUID := gen_random_uuid();
    program2_id UUID := gen_random_uuid();
    user_ids UUID[];
    simulado_ids TEXT[];
    question_ids TEXT[];
    i INT;
    j INT;
    user_id UUID;
    simulado_id TEXT;
    user_simulado_id TEXT;
    assignment_id UUID;
    question_id TEXT;
    correct_count INT;
    incorrect_count INT;
    total_time INT;
    is_correct BOOLEAN;
    selected_alt TEXT;
    question_options JSONB;
    correct_answer TEXT;
BEGIN
    -- ============================================
    -- 1. CRIAR 60 USUÁRIOS DE TESTE
    -- ============================================
    RAISE NOTICE 'Criando 60 usuários de teste...';
    
    FOR i IN 1..60 LOOP
        user_id := gen_random_uuid();
        user_ids := array_append(user_ids, user_id);
        
        INSERT INTO users (id, email, display_name, role, photo_url, created_at, updated_at)
        VALUES (
            user_id,
            'test_user_' || i || '@medbrave-test.com',
            'Usuário Teste ' || i,
            'USER',
            NULL,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Criados % usuários', array_length(user_ids, 1);

    -- ============================================
    -- 2. CRIAR 2 PROGRAMAS DE TESTE
    -- ============================================
    RAISE NOTICE 'Criando 2 programas de teste...';
    
    INSERT INTO mentor_programs (id, mentor_id, title, description, status, participants_count, created_at, updated_at)
    VALUES 
        (program1_id, mentor_id, '[TESTE] Programa Alpha', 'Programa de teste para validação do sistema', 'active', 30, NOW(), NOW()),
        (program2_id, mentor_id, '[TESTE] Programa Beta', 'Segundo programa de teste', 'active', 30, NOW(), NOW());

    -- ============================================
    -- 3. CRIAR 60 MENTORIAS (30 em cada programa)
    -- ============================================
    RAISE NOTICE 'Criando 60 mentorias...';
    
    FOR i IN 1..60 LOOP
        INSERT INTO mentorships (
            id, "mentorId", "menteeId", program_id, status, title,
            "startDate", "endDate", objectives, "createdAt", "updatedAt"
        )
        VALUES (
            gen_random_uuid(),
            mentor_id,
            user_ids[i],
            CASE WHEN i <= 30 THEN program1_id ELSE program2_id END,
            'active',
            '[TESTE] Mentoria ' || i,
            NOW(),
            NOW() + INTERVAL '90 days',
            '[]'::jsonb,
            NOW(),
            NOW()
        );
    END LOOP;

    -- ============================================
    -- 4. BUSCAR 250 QUESTÕES EXISTENTES
    -- ============================================
    RAISE NOTICE 'Buscando questões existentes...';
    
    SELECT array_agg(id) INTO question_ids
    FROM (
        SELECT id FROM questions 
        WHERE status = 'published' 
        LIMIT 250
    ) q;
    
    RAISE NOTICE 'Encontradas % questões', array_length(question_ids, 1);

    -- ============================================
    -- 5. CRIAR 5 SIMULADOS COM 50 QUESTÕES CADA
    -- ============================================
    RAISE NOTICE 'Criando 5 simulados...';
    
    FOR i IN 1..5 LOOP
        simulado_id := 'test-sim-' || i || '-' || extract(epoch from now())::text;
        simulado_ids := array_append(simulado_ids, simulado_id);
        
        INSERT INTO mentor_simulated_exams (
            id, mentor_id, name, description, questions, question_count,
            visibility, allowed_user_ids, selected_mentorship_ids, status,
            time_limit_minutes, shuffle_questions, show_results, is_public,
            respondents_count, average_score, created_at, updated_at
        )
        VALUES (
            simulado_id,
            mentor_id,
            '[TESTE] Simulado ' || i || ' - ' || 
                CASE i 
                    WHEN 1 THEN 'Clínica Médica'
                    WHEN 2 THEN 'Cirurgia'
                    WHEN 3 THEN 'Pediatria'
                    WHEN 4 THEN 'Ginecologia'
                    WHEN 5 THEN 'Medicina Preventiva'
                END,
            'Simulado de teste para validação do sistema de analytics',
            (
                SELECT jsonb_agg(jsonb_build_object('questionId', q, 'type', 'bank', 'order', row_number))
                FROM (
                    SELECT q, row_number() OVER () as row_number
                    FROM unnest(question_ids[(i-1)*50 + 1 : i*50]) as q
                ) sub
            ),
            50,
            'selected',
            user_ids,
            ARRAY[]::UUID[],
            'active',
            120,
            true,
            true,
            false,
            60,
            NULL,
            NOW() - INTERVAL '1 day' * (5 - i), -- Datas escalonadas
            NOW()
        );
    END LOOP;

    -- ============================================
    -- 6. CRIAR SIMULADOS INDIVIDUAIS E ASSIGNMENTS
    -- ============================================
    RAISE NOTICE 'Criando simulados individuais e assignments...';
    
    FOREACH simulado_id IN ARRAY simulado_ids LOOP
        FOR i IN 1..60 LOOP
            user_id := user_ids[i];
            user_simulado_id := 'test-usim-' || i || '-' || simulado_id;
            assignment_id := gen_random_uuid();
            
            -- Gerar performance com EVOLUÇÃO PROGRESSIVA
            -- Cada simulado subsequente tem score ligeiramente maior (simulando melhora)
            -- Base de performance por grupo de usuários:
            -- Usuários 1-20: começam com 45-55%, terminam com 75-85%
            -- Usuários 21-40: começam com 50-60%, terminam com 70-80%
            -- Usuários 41-60: começam com 55-65%, terminam com 75-85%
            
            DECLARE
                simulado_index INT := array_position(simulado_ids, simulado_id);
                base_score FLOAT;
                improvement_per_exam FLOAT := 0.08; -- 8% de melhora por simulado
                final_score FLOAT;
            BEGIN
                IF i <= 20 THEN
                    base_score := 0.45 + (random() * 0.10); -- 45-55%
                ELSIF i <= 40 THEN
                    base_score := 0.50 + (random() * 0.10); -- 50-60%
                ELSE
                    base_score := 0.55 + (random() * 0.10); -- 55-65%
                END IF;
                
                -- Adicionar melhora progressiva baseada no índice do simulado
                final_score := base_score + (improvement_per_exam * (simulado_index - 1));
                
                -- Garantir que não ultrapasse 90%
                final_score := LEAST(final_score, 0.90);
                
                -- Converter para número de questões corretas
                correct_count := GREATEST(floor(final_score * 50)::int, 1);
            END;
            
            incorrect_count := 50 - correct_count;
            total_time := 1800 + floor(random() * 3600)::int; -- 30-90 minutos
            
            -- Criar simulado individual
            INSERT INTO simulated_exams (
                id, title, description, question_ids, questions, total_questions,
                question_count, time_limit_minutes, randomize, status, is_public,
                user_id, created_by, creator_name, tags, mentor_exam_id,
                assigned_by_mentor, created_at, updated_at
            )
            SELECT 
                user_simulado_id,
                name,
                description,
                (SELECT array_agg(q->>'questionId') FROM jsonb_array_elements(questions) q),
                (SELECT array_agg(q->>'questionId') FROM jsonb_array_elements(questions) q),
                50,
                50,
                120,
                true,
                'published',
                false,
                user_id,
                mentor_id,
                'Inocêncio Júnior',
                ARRAY['test_data', 'mentor_assigned'],
                simulado_id,
                true,
                NOW(),
                NOW()
            FROM mentor_simulated_exams
            WHERE id = simulado_id;
            
            -- Criar assignment com datas progressivas
            -- Cada simulado é completado em uma data diferente (espaçamento de 5 dias)
            -- Simulado 1: 08/11, Simulado 2: 13/11, Simulado 3: 18/11, etc.
            INSERT INTO mentor_exam_assignments (
                id, mentor_exam_id, user_id, mentorship_id, status,
                assigned_at, available_at, started_at, completed_at,
                score, correct_count, incorrect_count, time_spent_seconds,
                answers, is_public_subscription
            )
            VALUES (
                assignment_id,
                simulado_id,
                user_id,
                NULL,
                'completed',
                NOW() - INTERVAL '30 days' - INTERVAL '5 days' * (array_position(simulado_ids, simulado_id) - 1),
                NOW() - INTERVAL '30 days' - INTERVAL '5 days' * (array_position(simulado_ids, simulado_id) - 1),
                NOW() - INTERVAL '30 days' - INTERVAL '5 days' * (array_position(simulado_ids, simulado_id) - 1) + INTERVAL '1 hour',
                NOW() - INTERVAL '30 days' - INTERVAL '5 days' * (array_position(simulado_ids, simulado_id) - 1) + INTERVAL '2 hours',
                (correct_count::float / 50 * 100),
                correct_count,
                incorrect_count,
                total_time,
                '[]'::jsonb,
                false
            );
            
            -- Criar resultado do simulado com mesmas datas do assignment
            INSERT INTO simulated_exam_results (
                id, simulated_exam_id, user_id, user_name, status,
                score, correct_count, incorrect_count, total_questions,
                total_time_spent_seconds, answers, started_at, completed_at,
                created_at, updated_at
            )
            VALUES (
                gen_random_uuid(),
                user_simulado_id,
                user_id,
                'Usuário Teste ' || i,
                'completed',
                (correct_count::float / 50 * 100),
                correct_count,
                incorrect_count,
                50,
                total_time,
                '{}'::jsonb,
                NOW() - INTERVAL '30 days' - INTERVAL '5 days' * (array_position(simulado_ids, simulado_id) - 1) + INTERVAL '1 hour',
                NOW() - INTERVAL '30 days' - INTERVAL '5 days' * (array_position(simulado_ids, simulado_id) - 1) + INTERVAL '2 hours',
                NOW(),
                NOW()
            );
        END LOOP;
    END LOOP;

    -- ============================================
    -- 7. CRIAR RESPOSTAS INDIVIDUAIS (question_responses)
    -- ============================================
    RAISE NOTICE 'Criando respostas individuais...';
    
    FOREACH simulado_id IN ARRAY simulado_ids LOOP
        FOR i IN 1..60 LOOP
            user_id := user_ids[i];
            user_simulado_id := 'test-usim-' || i || '-' || simulado_id;
            
            -- Determinar taxa de acerto baseada no grupo
            IF i <= 20 THEN
                -- 60-90% de acerto
                FOR j IN 1..50 LOOP
                    is_correct := random() < 0.75;
                    
                    -- Buscar questão e suas opções
                    SELECT q.options, q.correct_answer INTO question_options, correct_answer
                    FROM questions q
                    WHERE q.id = question_ids[(((simulado_id::text)::int - 1) % 5) * 50 + j];
                    
                    -- Selecionar alternativa
                    IF is_correct AND question_options IS NOT NULL THEN
                        SELECT opt->>'id' INTO selected_alt
                        FROM jsonb_array_elements(question_options) opt
                        WHERE opt->>'text' = correct_answer
                        LIMIT 1;
                    ELSE
                        SELECT opt->>'id' INTO selected_alt
                        FROM jsonb_array_elements(question_options) opt
                        WHERE opt->>'text' != correct_answer
                        LIMIT 1;
                    END IF;
                    
                    INSERT INTO question_responses (
                        id, user_id, question_id, simulated_exam_id,
                        selected_alternative_id, is_correct_on_first_attempt,
                        response_time_seconds, answered_at, created_at
                    )
                    VALUES (
                        gen_random_uuid(),
                        user_id,
                        question_ids[(((simulado_id::text)::int - 1) % 5) * 50 + j],
                        user_simulado_id,
                        COALESCE(selected_alt, 'A'),
                        is_correct,
                        30 + floor(random() * 90)::int,
                        NOW() - INTERVAL '30 days' - INTERVAL '5 days' * (array_position(simulado_ids, simulado_id) - 1) + INTERVAL '2 hours',
                        NOW()
                    );
                END LOOP;
            ELSIF i <= 40 THEN
                -- 40-60% de acerto
                FOR j IN 1..50 LOOP
                    is_correct := random() < 0.50;
                    
                    INSERT INTO question_responses (
                        id, user_id, question_id, simulated_exam_id,
                        selected_alternative_id, is_correct_on_first_attempt,
                        response_time_seconds, answered_at, created_at
                    )
                    VALUES (
                        gen_random_uuid(),
                        user_id,
                        question_ids[(((simulado_id::text)::int - 1) % 5) * 50 + j],
                        user_simulado_id,
                        CASE WHEN random() < 0.25 THEN 'A' WHEN random() < 0.5 THEN 'B' WHEN random() < 0.75 THEN 'C' ELSE 'D' END,
                        is_correct,
                        30 + floor(random() * 90)::int,
                        NOW() - INTERVAL '30 days' - INTERVAL '5 days' * (array_position(simulado_ids, simulado_id) - 1) + INTERVAL '2 hours',
                        NOW()
                    );
                END LOOP;
            ELSE
                -- 20-50% de acerto
                FOR j IN 1..50 LOOP
                    is_correct := random() < 0.35;
                    
                    INSERT INTO question_responses (
                        id, user_id, question_id, simulated_exam_id,
                        selected_alternative_id, is_correct_on_first_attempt,
                        response_time_seconds, answered_at, created_at
                    )
                    VALUES (
                        gen_random_uuid(),
                        user_id,
                        question_ids[(((simulado_id::text)::int - 1) % 5) * 50 + j],
                        user_simulado_id,
                        CASE WHEN random() < 0.25 THEN 'A' WHEN random() < 0.5 THEN 'B' WHEN random() < 0.75 THEN 'C' ELSE 'D' END,
                        is_correct,
                        30 + floor(random() * 90)::int,
                        NOW() - INTERVAL '30 days' - INTERVAL '5 days' * (array_position(simulado_ids, simulado_id) - 1) + INTERVAL '2 hours',
                        NOW()
                    );
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✅ Seed completo!';
    RAISE NOTICE 'Criados: 60 usuários, 2 programas, 60 mentorias, 5 simulados, 300 assignments, 15000 respostas';
    RAISE NOTICE 'Para limpar, execute: cleanup-test-data.sql';
    
END $$;
