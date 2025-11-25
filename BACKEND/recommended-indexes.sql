-- Script de Criação de Índices PostgreSQL
-- Gerado automaticamente baseado na análise do código backend

-- ÍNDICES DE ALTA PRIORIDADE (Criar primeiro)

-- Coluna isCompleted usada em 8 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_isCompleted
ON unknown USING btree (isCompleted);

-- Coluna userId usada em 24 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_userId
ON unknown USING btree (userId);

-- Coluna status usada em 23 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_status
ON unknown USING btree (status);

-- Coluna type usada em 9 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_type
ON unknown USING btree (type);

-- Coluna createdAt usada em 21 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_createdAt
ON unknown USING btree (createdAt);

-- Coluna id usada em 60 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_id
ON unknown USING btree (id);

-- Coluna timestamp usada em 5 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_timestamp
ON unknown USING btree (timestamp);

-- Coluna created_at usada em 18 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_created_at
ON unknown USING btree (created_at);

-- Coluna mentorshipId usada em 15 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_mentorshipId
ON unknown USING btree (mentorshipId);

-- Coluna mentorId usada em 6 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_mentorId
ON unknown USING btree (mentorId);

-- Coluna menteeId usada em 11 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_menteeId
ON unknown USING btree (menteeId);

-- Coluna scheduledDate usada em 5 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_scheduledDate
ON unknown USING btree (scheduledDate);

-- Coluna is_active usada em 6 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_is_active
ON unknown USING btree (is_active);

-- Coluna user_id usada em 66 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_user_id
ON unknown USING btree (user_id);

-- Coluna payment_id usada em 5 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_payment_id
ON unknown USING btree (payment_id);

-- Coluna due usada em 5 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_due
ON unknown USING btree (due);

-- Coluna date usada em 8 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_date
ON unknown USING btree (date);

-- Coluna deck_id usada em 7 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_deck_id
ON unknown USING btree (deck_id);

-- Índice composto para query com createdAt, mentorshipId
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_createdAt_mentorshipId
ON unknown USING btree (createdAt, mentorshipId);

-- Índice composto para query com created_at, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_created_at_user_id
ON unknown USING btree (created_at, user_id);

-- Índice composto para query com date, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_date_user_id
ON unknown USING btree (date, user_id);

-- Índice composto para query com id, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_id_user_id
ON unknown USING btree (id, user_id);

-- Índice composto para query com deck_id, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_deck_id_user_id
ON unknown USING btree (deck_id, user_id);

-- Índice composto para query com id, userId
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_id_userId
ON unknown USING btree (id, userId);

-- Coluna user_id usada em 5 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_errornotebookentrys_user_id
ON errornotebookentrys USING btree (user_id);

-- Índice composto para query com id, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_errornotebookentrys_id_user_id
ON errornotebookentrys USING btree (id, user_id);

-- Coluna user_id usada em 5 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_user_id
ON search_index USING btree (user_id);

-- Índice composto para query com deck_id, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_deck_id_user_id
ON search_index USING btree (deck_id, user_id);

-- Índice composto para query com id, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_sessions_id_user_id
ON study_sessions USING btree (id, user_id);

-- Coluna user_id usada em 7 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_reviews_user_id
ON unified_reviews USING btree (user_id);

-- Índice composto para query com due, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_reviews_due_user_id
ON unified_reviews USING btree (due, user_id);

-- Queries de revisão por usuário e data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_reviews_due_date_user_id
ON unified_reviews USING btree (due_date, user_id);

-- Flashcards por usuário e deck
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flashcards_deck_id_user_id
ON flashcards USING btree (deck_id, user_id);

-- Cards FSRS por usuário e vencimento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fsrs_cards_user_id_due_date
ON fsrs_cards USING btree (user_id, due_date);

-- Sessões de estudo por usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_sessions_created_at_user_id
ON study_sessions USING btree (created_at, user_id);

-- Notificações por usuário e status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_is_read_user_id
ON notifications USING btree (is_read, user_id);

-- Busca por filtros (array)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_filter_ids
ON questions USING gin (filter_ids);

-- Busca por tags (array)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flashcards_tags
ON flashcards USING gin (tags);

-- Ordenação temporal de métricas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_created_at
ON performance_metrics USING btree (created_at);

-- Logs de auditoria por data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at
ON audit_logs USING btree (created_at);

-- ÍNDICES DE MÉDIA PRIORIDADE

-- Coluna updatedAt usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_updatedAt
ON unknown USING btree (updatedAt);

-- Coluna priority usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_priority
ON unknown USING btree (priority);

-- Coluna createdBy usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_createdBy
ON unknown USING btree (createdBy);

-- Coluna assignedDate usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_assignedDate
ON unknown USING btree (assignedDate);

-- Coluna dueDate usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_dueDate
ON unknown USING btree (dueDate);

-- Coluna completedDate usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_completedDate
ON unknown USING btree (completedDate);

-- Coluna read usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_read
ON unknown USING btree (read);

-- Coluna plan_id usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_plan_id
ON unknown USING btree (plan_id);

-- Coluna is_public usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_is_public
ON unknown USING btree (is_public);

-- Coluna questionId usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_questionId
ON unknown USING btree (questionId);

-- Coluna difficulty usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_difficulty
ON unknown USING btree (difficulty);

-- Coluna question_id usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_question_id
ON unknown USING btree (question_id);

-- Coluna isInReviewSystem usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_isInReviewSystem
ON unknown USING btree (isInReviewSystem);

-- Coluna next_review_at usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_next_review_at
ON unknown USING btree (next_review_at);

-- Coluna review_id usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_review_id
ON unknown USING btree (review_id);

-- Coluna content_type usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_content_type
ON unknown USING btree (content_type);

-- Coluna removed_at usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_removed_at
ON unknown USING btree (removed_at);

-- Índice composto para query com createdAt, userId
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_createdAt_userId
ON unknown USING btree (createdAt, userId);

-- Índice composto para query com completedDate, isCompleted, menteeId
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_completedDate_isCompleted_menteeId
ON unknown USING btree (completedDate, isCompleted, menteeId);

-- Índice composto para query com dueDate, isCompleted
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_dueDate_isCompleted
ON unknown USING btree (dueDate, isCompleted);

-- Índice composto para query com questionId, userId
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_questionId_userId
ON unknown USING btree (questionId, userId);

-- Índice composto para query com question_id, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_question_id_user_id
ON unknown USING btree (question_id, user_id);

-- Índice composto para query com status, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_status_user_id
ON unknown USING btree (status, user_id);

-- Índice composto para query com isInReviewSystem, userId
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_isInReviewSystem_userId
ON unknown USING btree (isInReviewSystem, userId);

-- Índice composto para query com removed_at, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_removed_at_user_id
ON unknown USING btree (removed_at, user_id);

-- Índice composto para query com due, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_due_user_id
ON unknown USING btree (due, user_id);

-- Coluna created_at usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at
ON notifications USING btree (created_at);

-- Coluna user_id usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
ON notifications USING btree (user_id);

-- Coluna read usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read
ON notifications USING btree (read);

-- Coluna id usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_errornotebookentrys_id
ON errornotebookentrys USING btree (id);

-- Coluna id usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_notebook_entries_id
ON error_notebook_entries USING btree (id);

-- Coluna user_id usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_notebook_entries_user_id
ON error_notebook_entries USING btree (user_id);

-- Índice composto para query com id, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_notebook_entries_id_user_id
ON error_notebook_entries USING btree (id, user_id);

-- Coluna deck_id usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_deck_id
ON search_index USING btree (deck_id);

-- Coluna id usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_sessions_id
ON study_sessions USING btree (id);

-- Coluna user_id usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_sessions_user_id
ON study_sessions USING btree (user_id);

-- Coluna due usada em 4 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_reviews_due
ON unified_reviews USING btree (due);

-- Coluna reviewed_at usada em 3 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_reviews_reviewed_at
ON unified_reviews USING btree (reviewed_at);

-- Índice composto para query com reviewed_at, user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_reviews_reviewed_at_user_id
ON unified_reviews USING btree (reviewed_at, user_id);

-- ÍNDICES DE BAIXA PRIORIDADE (Opcional)

-- Coluna category usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_category
ON unknown USING btree (category);

-- Coluna achievementId usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_achievementId
ON unknown USING btree (achievementId);

-- Coluna expires_at usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_expires_at
ON unknown USING btree (expires_at);

-- Coluna isPublic usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_isPublic
ON unknown USING btree (isPublic);

-- Coluna accessCount usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_accessCount
ON unknown USING btree (accessCount);

-- Coluna assignedBy usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_assignedBy
ON unknown USING btree (assignedBy);

-- Coluna last_active_at usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_last_active_at
ON unknown USING btree (last_active_at);

-- Coluna user_plan_id usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_user_plan_id
ON unknown USING btree (user_plan_id);

-- Coluna price usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_price
ON unknown USING btree (price);

-- Coluna question_list_id usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_question_list_id
ON unknown USING btree (question_list_id);

-- Coluna last_attempted_at usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_last_attempted_at
ON unknown USING btree (last_attempted_at);

-- Coluna contentId usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_contentId
ON unknown USING btree (contentId);

-- Coluna content_id usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unknown_content_id
ON unknown USING btree (content_id);

-- Coluna priority usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_priority
ON notifications USING btree (priority);

-- Coluna type usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type
ON notifications USING btree (type);

-- Coluna notebook_id usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_errornotebookentrys_notebook_id
ON errornotebookentrys USING btree (notebook_id);

-- Coluna question_id usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_errornotebookentrys_question_id
ON errornotebookentrys USING btree (question_id);

-- Coluna updated_at usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_updated_at
ON search_index USING btree (updated_at);

-- Coluna content_id usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_reviews_content_id
ON unified_reviews USING btree (content_id);

-- Coluna nextReviewAt usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_userflashcardinteractions_nextReviewAt
ON userflashcardinteractions USING btree (nextReviewAt);

-- Coluna userId usada em 2 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_userflashcardinteractions_userId
ON userflashcardinteractions USING btree (userId);
