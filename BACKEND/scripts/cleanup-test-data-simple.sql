-- ============================================
-- SCRIPT DE LIMPEZA SIMPLIFICADO DOS DADOS DE TESTE
-- Execute cada bloco separadamente via MCP Supabase
-- ============================================

-- PASSO 1: Deletar respostas de questões de teste
DELETE FROM question_responses WHERE id LIKE 'test-qr-%';

-- PASSO 2: Deletar histórico de pagamentos de teste
DELETE FROM payment_history WHERE id LIKE 'test-pay-%';

-- PASSO 3: Deletar lembretes de cobrança de teste
DELETE FROM billing_reminders WHERE id LIKE 'test-bill-%';

-- PASSO 4: Deletar informações financeiras de teste
DELETE FROM mentee_financial_info WHERE id LIKE 'test-fin-%';

-- PASSO 5: Deletar atribuições de simulados de teste
DELETE FROM mentor_exam_assignments WHERE id LIKE 'test-assign-%';

-- PASSO 6: Deletar resultados de simulados de teste
DELETE FROM simulated_exam_results WHERE simulated_exam_id LIKE 'test-usim-%';

-- PASSO 7: Deletar simulados individuais de teste
DELETE FROM simulated_exams WHERE id LIKE 'test-usim-%';

-- PASSO 8: Deletar simulados do mentor de teste
DELETE FROM mentor_simulated_exams WHERE id LIKE 'test-exam-%';

-- PASSO 9: Deletar mentorias de teste
DELETE FROM mentorships WHERE id LIKE 'test-ment-%';

-- PASSO 10: Deletar programas de teste
DELETE FROM mentor_programs WHERE title LIKE 'TEST_%';

-- PASSO 11: Deletar usuários de teste
DELETE FROM users WHERE email LIKE '%@medbrave-test.com';

-- ============================================
-- COMANDO ÚNICO PARA LIMPAR TUDO (executar via MCP):
-- ============================================
/*
DELETE FROM payment_history WHERE id LIKE 'test-pay-%';
DELETE FROM billing_reminders WHERE id LIKE 'test-bill-%';
DELETE FROM mentee_financial_info WHERE id LIKE 'test-fin-%';
DELETE FROM mentor_exam_assignments WHERE id LIKE 'test-assign-%';
DELETE FROM simulated_exam_results WHERE simulated_exam_id LIKE 'test-usim-%';
DELETE FROM simulated_exams WHERE id LIKE 'test-usim-%';
DELETE FROM mentor_simulated_exams WHERE id LIKE 'test-exam-%';
DELETE FROM mentorships WHERE id LIKE 'test-ment-%';
DELETE FROM mentor_programs WHERE title LIKE 'TEST_%';
DELETE FROM users WHERE email LIKE '%@medbrave-test.com';
*/
