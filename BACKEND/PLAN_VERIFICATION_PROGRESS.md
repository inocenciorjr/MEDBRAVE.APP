# Progresso de Aplicação de Verificação de Planos

## ✅ Arquivos Concluídos

### Rotas Principais (/routes)
- ✅ `r2Routes.ts` - Upload/download requer `canExportData`
- ✅ `scraperRoutes.ts` - Admin routes com verificação de plano
- ✅ `categorizationRoutes.ts` - Categorização IA com verificação de plano
- ✅ `errorNotebookFolderRoutes.ts` - Caderno de erros requer `canUseErrorNotebook`
- ✅ `questionListFolderRoutes.ts` - Criar pastas requer `canCreateCustomLists`
- ✅ `questionListRoutes.ts` - Criar listas requer `canCreateCustomLists`

### Domínios (/domain)
- ⏳ `achievements/routes/` - Pendente
- ⏳ `admin/routes/` - Pendente
- ⏳ `alerts/routes/` - Pendente
- ⏳ `analytics/routes/` - Pendente
- ⏳ `audit/routes/` - Pendente
- ⏳ `auth/routes/` - Pendente
- ⏳ `content/routes/` - Pendente
- ⏳ `filters/routes/` - Pendente
- ⏳ `goals/routes/` - Pendente
- ⏳ `integration/routes/` - Pendente
- ⏳ `medbraveAI/routes/` - Pendente
- ⏳ `media/routes/` - Pendente
- ⏳ `mentorship/routes/` - Pendente
- ⏳ `notifications/routes/` - Pendente
- ⏳ `officialExam/routes/` - Pendente
- ⏳ `payment/routes/` - Pendente
- ✅ `planner/routes/` - Concluído (plannerRoutes)
- ⏳ `profile/routes/` - Pendente
- ✅ `questions/routes/` - Concluído (unifiedQuestionRoutes)
- ⏳ `reviewSessions/routes/` - Pendente
- ✅ `simulatedExam/routes/` - Concluído (simulatedExamRoutes com limite de simulados/mês)
- ⏳ `studySessions/routes/` - Pendente
- ✅ `studyTools/flashcards/routes/` - Concluído (flashcardRoutes, deckRoutes, collectionRoutes)
- ✅ `studyTools/unifiedReviews/routes/` - Concluído (unifiedReviewRoutes)
- ⏳ `studyTools/errorNotebook/routes/` - Pendente
- ⏳ `studyTools/games/` - Pendente
- ⏳ `user/routes/` - Pendente
- ⏳ `userGoals/routes/` - Pendente
- ✅ `userStatistics/routes/` - Concluído (statisticsRoutes com feature de estatísticas avançadas)

## 📋 Próximos Passos

1. Aplicar `enhancedAuthMiddleware` em TODAS as rotas de domínios
2. Adicionar verificação de features específicas onde necessário
3. Adicionar verificação de limites de uso onde aplicável
4. Testar cada rota após aplicação
5. Documentar features necessárias para cada funcionalidade

## 🎯 Regras de Aplicação

### Middlewares Base
- `enhancedAuthMiddleware`: Autenticação + verificação de plano ativo
- `requireFeature(feature)`: Verifica feature específica do plano
- `checkLimit(limitKey, getCurrentUsage)`: Verifica limite de uso

### Features por Funcionalidade
- **Exportar dados**: `canExportData`
- **Listas customizadas**: `canCreateCustomLists`
- **Estatísticas avançadas**: `canAccessAdvancedStatistics`
- **Caderno de erros**: `canUseErrorNotebook`
- **Mentoria**: `canAccessMentorship`
- **Modo offline**: `canUseOfflineMode`
- **Customização**: `canCustomizeInterface`

### Limites por Funcionalidade
- **Questões por dia**: `maxQuestionsPerDay`
- **Listas por dia**: `maxQuestionListsPerDay`
- **Simulados por mês**: `maxSimulatedExamsPerMonth`
- **Flashcards criados**: `maxFlashcardsCreated`
- **Decks de flashcards**: `maxFlashcardDecks`
- **Revisões por dia**: `maxReviewsPerDay`
- **Cards FSRS**: `maxFSRSCards`
- **Consultas AI por dia**: `maxPulseAIQueriesPerDay`
