-- Script para habilitar RLS e criar políticas de segurança
-- Execute este script no Supabase SQL Editor ou via CLI

-- ========================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ========================================

-- Tabelas relacionadas a usuários
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userProfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userStatistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userPlans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_performances ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY; -- REMOVIDO (tabela não existe mais)

-- Tabelas de estudo
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studySessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userFlashcardInteractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmedReviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Tabelas de questões
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionResponses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userAnswers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionLists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionListItems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionListFolders ENABLE ROW LEVEL SECURITY;

-- Tabelas de simulados
ALTER TABLE public.simulatedExams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulatedExamResults ENABLE ROW LEVEL SECURITY;

-- Tabelas de conteúdo pessoal
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contentReports ENABLE ROW LEVEL SECURITY;

-- Tabelas de comunicação
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Tabelas de planejamento
ALTER TABLE public.plannerTasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Tabelas de mídia pessoal
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mediaFiles ENABLE ROW LEVEL SECURITY;

-- Tabelas de pagamento e assinatura
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Tabelas de dispositivos
ALTER TABLE public.deviceTokens ENABLE ROW LEVEL SECURITY;

-- Tabelas de API pessoal
ALTER TABLE public.apiKeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apiKeyUsageLogs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLÍTICAS DE SEGURANÇA BÁSICAS
-- ========================================

-- USUÁRIOS - Cada usuário só vê seus próprios dados
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- PERFIS DE USUÁRIO
CREATE POLICY "Users can view own user profile" ON public.userProfiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own user profile" ON public.userProfiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user profile" ON public.userProfiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FLASHCARDS
CREATE POLICY "Users can view own flashcards" ON public.flashcards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flashcards" ON public.flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcards" ON public.flashcards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards" ON public.flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- DECKS
CREATE POLICY "Users can view own decks" ON public.decks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own decks" ON public.decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks" ON public.decks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks" ON public.decks
  FOR DELETE USING (auth.uid() = user_id);

-- SESSÕES DE ESTUDO
CREATE POLICY "Users can view own study sessions" ON public.studySessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study sessions" ON public.studySessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions" ON public.studySessions
  FOR UPDATE USING (auth.uid() = user_id);

-- INTERAÇÕES COM FLASHCARDS
CREATE POLICY "Users can view own flashcard interactions" ON public.userFlashcardInteractions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flashcard interactions" ON public.userFlashcardInteractions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcard interactions" ON public.userFlashcardInteractions
  FOR UPDATE USING (auth.uid() = user_id);

-- MÉTRICAS DE PERFORMANCE
CREATE POLICY "Users can view own performance metrics" ON public.performance_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own performance metrics" ON public.performance_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- REVISÕES PROGRAMADAS
CREATE POLICY "Users can view own programmed reviews" ON public.programmedReviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own programmed reviews" ON public.programmedReviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own programmed reviews" ON public.programmedReviews
  FOR UPDATE USING (auth.uid() = user_id);

-- RESPOSTAS DE QUESTÕES
CREATE POLICY "Users can view own question responses" ON public.questionResponses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own question responses" ON public.questionResponses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RESPOSTAS DE USUÁRIO
CREATE POLICY "Users can view own user answers" ON public.userAnswers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own user answers" ON public.userAnswers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- LISTAS DE QUESTÕES
CREATE POLICY "Users can view own question lists" ON public.questionLists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own question lists" ON public.questionLists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question lists" ON public.questionLists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own question lists" ON public.questionLists
  FOR DELETE USING (auth.uid() = user_id);

-- ITENS DE LISTAS DE QUESTÕES
CREATE POLICY "Users can view own question list items" ON public.questionListItems
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own question list items" ON public.questionListItems
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own question list items" ON public.questionListItems
  FOR DELETE USING (auth.uid() = user_id);

-- PASTAS DE LISTAS DE QUESTÕES
CREATE POLICY "Users can view own question list folders" ON public.questionListFolders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own question list folders" ON public.questionListFolders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question list folders" ON public.questionListFolders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own question list folders" ON public.questionListFolders
  FOR DELETE USING (auth.uid() = user_id);

-- SIMULADOS
CREATE POLICY "Users can view own simulated exams" ON public.simulatedExams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own simulated exams" ON public.simulatedExams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RESULTADOS DE SIMULADOS
CREATE POLICY "Users can view own simulated exam results" ON public.simulatedExamResults
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own simulated exam results" ON public.simulatedExamResults
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- COLEÇÕES
CREATE POLICY "Users can view own collections" ON public.collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collections" ON public.collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections" ON public.collections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections" ON public.collections
  FOR DELETE USING (auth.uid() = user_id);

-- COMENTÁRIOS
CREATE POLICY "Users can view own comments" ON public.comments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- LIKES
CREATE POLICY "Users can view own likes" ON public.likes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own likes" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- NOTIFICAÇÕES
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- FEEDBACKS
CREATE POLICY "Users can view own feedbacks" ON public.feedbacks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own feedbacks" ON public.feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TAREFAS DO PLANEJADOR
CREATE POLICY "Users can view own planner tasks" ON public.plannerTasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own planner tasks" ON public.plannerTasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planner tasks" ON public.plannerTasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own planner tasks" ON public.plannerTasks
  FOR DELETE USING (auth.uid() = user_id);

-- SESSÕES
CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- MÍDIA
CREATE POLICY "Users can view own media" ON public.media
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own media" ON public.media
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media" ON public.media
  FOR DELETE USING (auth.uid() = user_id);

-- ARQUIVOS DE MÍDIA
CREATE POLICY "Users can view own media files" ON public.mediaFiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own media files" ON public.mediaFiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media files" ON public.mediaFiles
  FOR DELETE USING (auth.uid() = user_id);

-- PAGAMENTOS
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- ASSINATURAS
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- TOKENS DE DISPOSITIVO
CREATE POLICY "Users can view own device tokens" ON public.deviceTokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own device tokens" ON public.deviceTokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens" ON public.deviceTokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens" ON public.deviceTokens
  FOR DELETE USING (auth.uid() = user_id);

-- CHAVES DE API
CREATE POLICY "Users can view own api keys" ON public.apiKeys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own api keys" ON public.apiKeys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys" ON public.apiKeys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys" ON public.apiKeys
  FOR DELETE USING (auth.uid() = user_id);

-- LOGS DE USO DE API
CREATE POLICY "Users can view own api key usage logs" ON public.apiKeyUsageLogs
  FOR SELECT USING (auth.uid() = user_id);

-- ESTATÍSTICAS DE USUÁRIO
CREATE POLICY "Users can view own user statistics" ON public.userStatistics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own user statistics" ON public.userStatistics
  FOR UPDATE USING (auth.uid() = user_id);

-- PERFORMANCE POR TÓPICO
CREATE POLICY "Users can view own topic performances" ON public.user_topic_performances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own topic performances" ON public.user_topic_performances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic performances" ON public.user_topic_performances
  FOR UPDATE USING (auth.uid() = user_id);

-- NOMES DE USUÁRIO - REMOVIDO (tabela usernames não existe mais)

-- ========================================
-- POLÍTICAS PARA TABELAS PÚBLICAS/COMPARTILHADAS
-- ========================================

-- Algumas tabelas podem precisar de acesso público ou compartilhado
-- Ajuste conforme necessário:

-- CATEGORIAS (público para leitura)
-- CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);

-- FILTROS (público para leitura)
-- CREATE POLICY "Anyone can view filters" ON public.filters FOR SELECT USING (true);

-- SUBFILTROS (público para leitura)
-- CREATE POLICY "Anyone can view subfilters" ON public.subFilters FOR SELECT USING (true);

-- TAGS (público para leitura)
-- CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT USING (true);

-- ARTIGOS (público para leitura)
-- CREATE POLICY "Anyone can view articles" ON public.articles FOR SELECT USING (true);

-- QUESTÕES (público para leitura, mas pode precisar de filtros)
-- CREATE POLICY "Anyone can view questions" ON public.questions FOR SELECT USING (true);

-- TEMPLATES (público para leitura)
-- CREATE POLICY "Anyone can view templates" ON public.templates FOR SELECT USING (true);

-- PLANOS (público para leitura)
-- CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT USING (true);

-- CONQUISTAS (público para leitura)
-- CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);

-- LEADERBOARDS (público para leitura)
-- CREATE POLICY "Anyone can view leaderboards" ON public.leaderboards FOR SELECT USING (true);

COMMIT;