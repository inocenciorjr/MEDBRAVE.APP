# Plano de Correção de Timezone

## Problema
O sistema está usando timezone hardcoded (America/Sao_Paulo) e a função `getUTCMinus3Date()` que subtrai 3 horas, causando inconsistências nos horários.

## Solução Implementada

### 1. TimezoneService ✅
- Criado serviço para gerenciar timezone dos usuários
- Armazena timezone no banco de dados (coluna `users.timezone`)
- Fornece métodos para conversão de datas considerando timezone

### 2. Migration ✅
- Adicionada coluna `timezone` na tabela `users`
- Default: 'America/Sao_Paulo'

### 3. Frontend ✅
- Hook `useTimezone` para detectar timezone do navegador
- `fetchWithAuth` envia header `X-User-Timezone` em todas as requisições

### 4. Backend - Pendente
Substituir todas as ocorrências de:
- `getUTCMinus3Date()` → `new Date()` (UTC puro)
- `addDays(date, days)` → `await addDays(date, days, userId)` (assíncrono com timezone)
- Hardcoded 'America/Sao_Paulo' → `await timezoneService.getUserTimezone(userId)`

## Arquivos que Precisam ser Atualizados

### SupabaseUnifiedReviewService.ts
- [x] Adicionar TimezoneService
- [x] Remover getUTCMinus3Date()
- [x] Atualizar addDays() para ser assíncrono
- [ ] Atualizar scheduleHard()
- [ ] Atualizar scheduleGood()
- [ ] Atualizar scheduleEasy()
- [ ] Atualizar processReview()
- [ ] Atualizar createNewCard()
- [ ] Atualizar getDueReviews()
- [ ] Atualizar getFutureReviews()
- [ ] Atualizar getDailySummary()
- [ ] Atualizar todos os métodos de revisão

### Outros arquivos com getUTCMinus3Date()
- SupabaseUserService.ts
- SupabaseDeckRepository.ts
- SupabaseDeckService.ts
- SupabaseErrorNotebookService.ts
- SupabaseFlashcardRepository.ts

## Regras
1. **Backend sempre trabalha em UTC**: `new Date()` retorna UTC
2. **Supabase armazena em UTC**: `timestamptz` automaticamente
3. **Conversões apenas quando necessário**: Início/fim do dia, agendamento
4. **Frontend envia timezone**: Header `X-User-Timezone`
5. **Fallback**: Se não tiver timezone, usar 'America/Sao_Paulo'

## Próximos Passos
1. Atualizar todos os métodos de agendamento (scheduleHard, scheduleGood, scheduleEasy)
2. Atualizar processReview para passar userId
3. Atualizar getFutureReviews para usar TimezoneService
4. Atualizar getDailySummary para usar TimezoneService
5. Atualizar outros arquivos que usam getUTCMinus3Date()
6. Testar com usuários em diferentes timezones
