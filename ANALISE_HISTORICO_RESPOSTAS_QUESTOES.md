# Análise: Sistema de Histórico de Respostas de Questões

## 📊 O QUE JÁ EXISTE NO SISTEMA

### 1. Tabelas de Banco de Dados

#### `question_responses` (Principal - Listas de Questões)
- ✅ `id` - ID único da resposta
- ✅ `user_id` - ID do usuário
- ✅ `question_id` - ID da questão
- ✅ `question_list_id` - ID da lista (contexto)
- ✅ `selected_alternative_id` - Alternativa marcada
- ✅ `selected_option_id` - Opção marcada (campo adicional)
- ✅ `is_correct_on_first_attempt` - Acertou na primeira
- ✅ `response_time_seconds` - Tempo de resposta (mas você não quer usar)
- ✅ `answered_at` - Data/hora da resposta (JSONB)
- ✅ `created_at` / `updated_at` - Timestamps (JSONB)
- ⚠️ Campos FSRS (review_quality, ease_factor, interval, repetitions, fail_streak, etc.) - **Legado, não usado mais**
- ⚠️ `programmed_review_id` - Link com revisão programada (legado)

**Uso atual**: 
- ✅ **Listas normais**: Endpoint `POST /question-responses` salva aqui via `QuestionListController.saveQuestionResponse()`
- ❌ **Simulados**: NÃO salva aqui, salva no JSONB do resultado
- ❌ **UnifiedReview**: NÃO salva aqui, usa `fsrs_cards` + `review_history`

#### `user_answers` (Flashcards - NÃO USADO PARA QUESTÕES)
- ✅ `user_id`
- ✅ `question_id` - Para questões (mas não é usado)
- ✅ `flashcard_id` - Para flashcards
- ✅ `deck_id` - Para flashcards
- ✅ `answer` - Resposta (texto genérico)
- ✅ `is_correct` - Se acertou
- ✅ `response_time` - Tempo de resposta
- ✅ `attempt_number` - Número da tentativa
- ✅ `session_id` - ID da sessão
- ✅ `answered_at` - Data/hora
- ✅ `created_at` / `updated_at`

**Uso atual**: Apenas para **flashcards**, não para questões

#### `simulated_exam_results`
- ✅ `id` - ID do resultado
- ✅ `user_id` - ID do usuário
- ✅ `simulated_exam_id` - ID do simulado
- ✅ `answers` (JSONB) - **Array de respostas do simulado**
  - Estrutura: `{ questionId, answerId, isCorrect, points, timeSpent, answered_at }`
- ✅ `status` - 'in_progress' | 'completed' | 'abandoned'
- ✅ `started_at`, `completed_at` - Timestamps
- ✅ `score`, `total_questions`, `correct_count`, `incorrect_count` - Métricas

**Uso atual**: 
- ✅ Respostas de simulados ficam **dentro do JSONB `answers`**, não em tabela separada
- ✅ Método `submitAnswer()` adiciona resposta ao array e atualiza o resultado
- ❌ **Problema**: Não é consultável facilmente, não aparece em histórico geral

#### `fsrs_cards` (Sistema de Revisão Espaçada)
- ✅ `id` - ID do card FSRS (diferente do question_id!)
- ✅ `user_id` - ID do usuário
- ✅ `content_id` - ID da questão original
- ✅ `content_type` - 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK'
- ✅ `deck_id` - ID do deck/lista
- ✅ Campos FSRS: `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `state`, `last_review`
- ✅ `created_at` / `updated_at`

**Uso atual**:
- ✅ UnifiedReview cria um card FSRS para cada questão adicionada ao sistema de revisão
- ✅ `recordQuestionResponse()` atualiza o card FSRS e salva em `review_history`
- ⚠️ **Importante**: O ID do card é diferente do ID da questão! Usa `content_id` para referenciar a questão

#### `review_history` (Histórico de Revisões FSRS)
- Salva histórico de revisões do UnifiedReview
- Linkado aos cards FSRS, não diretamente às questões

### 2. Estatísticas de Alternativas

#### Já Implementado
- ✅ **Endpoint**: `GET /api/question-lists/:listId/questions/:questionId/alternative-stats`
- ✅ **Localização**: `QuestionListController.getAlternativeStats()` (linha ~450)
- ✅ **Funcionalidade**: 
  - Busca todas as respostas de uma questão na tabela `question_responses`
  - Conta quantas vezes cada alternativa foi marcada
  - Calcula porcentagem de cada alternativa
  - Retorna: `{ "alt-id-1": 45, "alt-id-2": 30, "alt-id-3": 15, "alt-id-4": 10 }`
- ⚠️ **Limitação**: Só conta respostas de **listas normais**, não inclui simulados nem revisões

### 3. Como Respostas São Salvas Hoje

#### 3.1 Listas Normais de Questões
**Endpoint**: `POST /question-responses`  
**Controller**: `QuestionListController.saveQuestionResponse()`  
**Tabela**: `question_responses`

```typescript
// Campos salvos:
{
  id: 'response_timestamp_random',
  user_id: userId,
  question_id: questionId,
  question_list_id: listId,
  selected_alternative_id: alternativeId,
  is_correct_on_first_attempt: boolean,
  response_time_seconds: number,
  answered_at: { value: ISO_DATE },
  created_at: { value: ISO_DATE }
}
```

#### 3.2 Simulados
**Endpoint**: `POST /api/simulated-exams/answer`  
**Controller**: `SimulatedExamController.submitAnswer()`  
**Service**: `SupabaseSimulatedExamService.submitAnswer()`  
**Tabela**: `simulated_exam_results` (campo `answers` JSONB)

```typescript
// Adiciona ao array answers:
{
  questionId: string,
  answerId: string,
  isCorrect: boolean,
  points: number,
  timeSpent: number,
  answered_at: ISO_DATE
}
```

⚠️ **Problema**: Respostas ficam isoladas no JSONB, não são consultáveis facilmente

#### 3.3 UnifiedReview (Revisões Espaçadas)
**Endpoint**: `POST /api/unified-reviews/record`  
**Controller**: `UnifiedReviewController.recordReview()`  
**Service**: `SupabaseUnifiedReviewService.recordQuestionResponse()`  
**Tabelas**: `fsrs_cards` + `review_history`

```typescript
// Fluxo:
1. Cria/busca card FSRS (fsrs_cards)
2. Atualiza card com algoritmo FSRS
3. Salva histórico em review_history
4. NÃO salva em question_responses
```

⚠️ **Problema**: Histórico de revisões fica separado, não aparece no histórico geral da questão

---

## 🎯 O QUE VOCÊ QUER IMPLEMENTAR

### Requisitos Confirmados

#### ✅ Dados a Capturar
1. **Alternativa marcada** - JÁ EXISTE (`selected_alternative_id`)
2. **Data/hora** - JÁ EXISTE (`answered_at`)
3. **Acerto/erro** - JÁ EXISTE (`is_correct`)
4. **Modo de estudo** - ❌ NÃO EXISTE
   - Valores: `'normal_list'`, `'simulated_exam'`, `'unified_review'`
5. **Modo foco** - ❌ NÃO EXISTE
   - Boolean: estava em modo foco?
6. **Contexto da resposta** - ⚠️ PARCIAL
   - `question_list_id` existe
   - `simulated_exam_id` não está linkado
   - `unified_review_id` existe como `programmed_review_id`

#### ✅ Estatísticas a Mostrar
1. **Quantidade de tentativas** - Calcular via COUNT
2. **Taxa de acerto** - Calcular via AVG(is_correct)
3. **Histórico de respostas** - Listar todas as tentativas
4. **Padrão de erro** - Analisar sequência de alternativas marcadas
5. **Streak de acertos/erros** - Calcular sequência
6. **Comparação com outros usuários** - Usar estatísticas de alternativas existentes
7. **Evolução temporal** - Ordenar por data

#### ❌ Dados que NÃO quer
- ❌ Tempo de resolução
- ❌ Nível de confiança
- ❌ Categoria do erro
- ❌ Estado mental
- ❌ Ferramentas de anotação
- ❌ Visualização de comentário
- ❌ Dificuldade percebida (existe em unified_reviews mas não usar agora)

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. ❌ Fragmentação Total de Dados
**Problema**: Respostas de questões estão em **3 lugares completamente diferentes**:

| Modo | Onde Salva | Consultável? | Aparece em Histórico? |
|------|-----------|--------------|----------------------|
| Lista Normal | `question_responses` | ✅ Sim | ✅ Sim |
| Simulado | `simulated_exam_results.answers` (JSONB) | ❌ Difícil | ❌ Não |
| Revisão (UnifiedReview) | `fsrs_cards` + `review_history` | ⚠️ Parcial | ❌ Não |

**Impacto**: 
- Impossível ter histórico completo de uma questão
- Estatísticas de alternativas só contam listas normais
- Usuário não vê evolução real (falta dados de simulados e revisões)

### 2. ❌ Falta de Contexto (Modo de Estudo)
**Problema**: Não há campo para identificar o **modo de estudo**

**Situação atual**:
- `question_responses` tem `question_list_id` mas não diferencia:
  - Lista normal de questões
  - Simulado (que também é uma "lista")
  - Revisão espaçada
- Não dá pra filtrar "mostre apenas respostas de simulados"
- Não dá pra analisar "usuário vai melhor em simulados ou em listas?"

### 3. ❌ Simulados Completamente Isolados
**Problema**: Respostas de simulados ficam **presas no JSONB**

```typescript
// Estrutura atual:
simulated_exam_results {
  id: 'result-123',
  answers: [  // ← JSONB array, não consultável
    { questionId: 'q1', answerId: 'a1', isCorrect: true, ... },
    { questionId: 'q2', answerId: 'a2', isCorrect: false, ... }
  ]
}
```

**Impactos**:
- ❌ Não dá pra fazer `SELECT * FROM ... WHERE question_id = 'x'` incluindo simulados
- ❌ Estatísticas de alternativas ignoram simulados
- ❌ Histórico da questão não mostra tentativas em simulados
- ❌ Comparação com outros usuários não inclui dados de simulados

### 4. ❌ Modo Foco Não Capturado
**Problema**: Não existe campo para capturar se estava em modo foco
- Não dá pra analisar "usuário performa melhor em modo foco?"
- Não dá pra mostrar "você acertou 80% em modo foco vs 60% normal"

### 5. ❌ UnifiedReview Desconectado
**Problema**: Sistema de revisão usa estrutura completamente diferente

**Fluxo atual**:
1. Questão original tem ID: `question-abc`
2. Ao adicionar no UnifiedReview, cria card FSRS com ID: `fsrs-xyz`
3. Card tem `content_id = 'question-abc'` (referência)
4. Respostas salvam em `review_history` linkadas ao card FSRS
5. **Histórico da questão não acessa `review_history`**

**Impacto**: Revisões não aparecem no histórico da questão

### 6. ❌ Número de Tentativa Não Calculado
**Problema**: Não há campo `attempt_number` consistente
- `user_answers` tem, mas não é usado para questões
- `question_responses` não tem
- Não dá pra mostrar "esta é sua 5ª tentativa nesta questão"

---

## 🛠️ SOLUÇÃO PROPOSTA

### ✅ Estratégia: Unificar TUDO em `question_responses`

**Objetivo**: Ter um único lugar para consultar histórico completo de respostas de questões

### Opção 1: Unificar em `question_responses` (RECOMENDADO)

#### Vantagens
- ✅ Já tem a maioria dos campos necessários
- ✅ Já é usada para questões
- ✅ Estrutura bem definida
- ✅ Menos mudanças no código

#### Mudanças Necessárias

**1. Adicionar campos novos:**
```sql
ALTER TABLE question_responses
ADD COLUMN study_mode TEXT CHECK (study_mode IN ('normal_list', 'simulated_exam', 'unified_review')),
ADD COLUMN was_focus_mode BOOLEAN DEFAULT false,
ADD COLUMN simulated_exam_id TEXT REFERENCES simulated_exams(id),
ADD COLUMN attempt_number INTEGER DEFAULT 1;
```

**2. Migrar respostas de simulados:**
- Extrair respostas do JSONB `simulated_exam_results.answers`
- Inserir em `question_responses` com `study_mode = 'simulated_exam'`
- Manter JSONB para compatibilidade (por enquanto)

**3. Padronizar salvamento:**
- Lista normal → `study_mode = 'normal_list'`
- Simulado → `study_mode = 'simulated_exam'` + `simulated_exam_id`
- Revisão → `study_mode = 'unified_review'` + `programmed_review_id`

**4. Calcular `attempt_number` automaticamente:**
```sql
-- Trigger ou lógica no backend para incrementar
SELECT COALESCE(MAX(attempt_number), 0) + 1
FROM question_responses
WHERE user_id = ? AND question_id = ?
```

### Opção 2: Criar Nova Tabela `question_attempt_history`

#### Vantagens
- ✅ Não mexe em tabelas existentes
- ✅ Estrutura limpa e focada
- ✅ Fácil de consultar

#### Desvantagens
- ❌ Duplicação de dados
- ❌ Precisa sincronizar com `question_responses`
- ❌ Mais complexidade

---

## 📋 ROTEIRO DE IMPLEMENTAÇÃO

### Fase 1: Preparação do Banco (Backend)

1. **Criar migration para adicionar campos**
   - `study_mode`
   - `was_focus_mode`
   - `simulated_exam_id`
   - `attempt_number`

2. **Criar índices para performance**
   ```sql
   CREATE INDEX idx_question_responses_user_question 
   ON question_responses(user_id, question_id, answered_at DESC);
   
   CREATE INDEX idx_question_responses_study_mode 
   ON question_responses(study_mode);
   ```

3. **Migrar dados de simulados** (script one-time)
   - Extrair de `simulated_exam_results.answers`
   - Inserir em `question_responses`

### Fase 2: Backend - Serviços

4. **Criar `QuestionHistoryService`**
   - `getQuestionHistory(userId, questionId)` - Histórico completo
   - `getQuestionStats(userId, questionId)` - Estatísticas agregadas
   - `recordQuestionAttempt(data)` - Salvar nova tentativa
   - `getStreakAnalysis(userId, questionId)` - Análise de sequências

5. **Atualizar serviços existentes**
   - `SimulatedExamService.submitAnswer()` → Salvar em `question_responses`
   - `UnifiedReviewService.recordQuestionResponse()` → Adicionar `study_mode`
   - `QuestionListController.saveQuestionResponse()` → Adicionar novos campos

6. **Criar endpoints** (seguindo padrão do GUIA_CONFIGURACAO_ENDPOINTS.md)

#### Backend: Controller
**Arquivo**: `BACKEND/src/domain/questions/controllers/QuestionHistoryController.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { QuestionHistoryService } from '../services/QuestionHistoryService';
import AppError from '../../../utils/AppError';

export class QuestionHistoryController {
  constructor(private historyService: QuestionHistoryService) {}

  // GET /api/questions/:questionId/history
  async getQuestionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { questionId } = req.params;
      const { limit, includeGlobalStats } = req.query;
      
      const history = await this.historyService.getQuestionHistory(
        userId, 
        questionId,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/questions/:questionId/stats
  async getQuestionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { questionId } = req.params;
      const { includeComparison } = req.query;
      
      const stats = await this.historyService.getQuestionStats(
        userId, 
        questionId,
        includeComparison === 'true'
      );
      
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/questions/:questionId/attempt
  async recordAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { questionId } = req.params;
      const attemptData = {
        ...req.body,
        user_id: userId,
        question_id: questionId
      };
      
      const result = await this.historyService.recordQuestionAttempt(attemptData);
      
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
```

#### Backend: Rotas
**Arquivo**: `BACKEND/src/domain/questions/routes/questionHistoryRoutes.ts`

```typescript
import { Router } from 'express';
import { QuestionHistoryController } from '../controllers/QuestionHistoryController';
import { supabaseAuthMiddleware } from '../../../domain/auth/middleware/supabaseAuth.middleware';
import { QuestionHistoryService } from '../services/QuestionHistoryService';
import { supabase } from '../../../config/supabase';

const router = Router();
const service = new QuestionHistoryService(supabase);
const controller = new QuestionHistoryController(service);

// Todas as rotas requerem autenticação
router.get('/:questionId/history', supabaseAuthMiddleware, controller.getQuestionHistory.bind(controller));
router.get('/:questionId/stats', supabaseAuthMiddleware, controller.getQuestionStats.bind(controller));
router.post('/:questionId/attempt', supabaseAuthMiddleware, controller.recordAttempt.bind(controller));

export default router;
```

#### Backend: Registro em routes.ts
**Arquivo**: `BACKEND/src/routes.ts`

```typescript
// Adicionar junto com outras rotas de questions (linha ~50)
try {
  const questionHistoryRoutes = require("./domain/questions/routes/questionHistoryRoutes").default;
  router.use("/questions", questionHistoryRoutes);
  console.log('✅ Rotas de histórico de questões registradas');
} catch (error) {
  console.error("❌ Erro ao carregar rotas de histórico:", error);
}
```

#### Frontend: Proxy
**Não precisa criar novo proxy!** O proxy existente de `/api/questions/[...path]/route.ts` já cobre:
- `GET /api/questions/:id/history` → Backend
- `GET /api/questions/:id/stats` → Backend
- `POST /api/questions/:id/attempt` → Backend

#### Endpoints Finais
```
GET  /api/questions/:questionId/history       - Histórico de tentativas
GET  /api/questions/:questionId/stats         - Estatísticas agregadas
POST /api/questions/:questionId/attempt       - Registrar nova tentativa
```

**Query Params**:
- `history?limit=10` - Limitar número de tentativas
- `stats?includeComparison=true` - Incluir comparação com outros usuários

### Fase 3: Frontend - Componentes

7. **Criar `QuestionHistoryCard` component**
   - Mostrar tentativas
   - Mostrar estatísticas
   - Mostrar comparação com outros usuários (toggle)
   - Mostrar insights automáticos

8. **Integrar em páginas existentes**
   - Página de questão individual
   - Resultado de simulado
   - Revisão unificada

### Fase 4: Insights e Análises

9. **Implementar lógica de insights**
   - Detectar padrão de erro (sempre marca mesma alternativa errada)
   - Detectar evolução (estava errando, agora acerta)
   - Detectar regressão (acertava, agora erra)
   - Comparar com média geral

---

## 🎨 ESTRUTURA DE DADOS FINAL

### Interface TypeScript
```typescript
interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  
  // Resposta
  selected_alternative_id: string;
  is_correct: boolean;
  
  // Contexto
  study_mode: 'normal_list' | 'simulated_exam' | 'unified_review';
  was_focus_mode: boolean;
  question_list_id?: string;
  simulated_exam_id?: string;
  programmed_review_id?: string;
  
  // Metadata
  attempt_number: number;
  answered_at: Date;
  created_at: Date;
}

interface QuestionHistoryStats {
  total_attempts: number;
  correct_attempts: number;
  accuracy_rate: number;
  
  first_attempt_date: Date;
  last_attempt_date: Date;
  
  attempts_by_mode: {
    normal_list: number;
    simulated_exam: number;
    unified_review: number;
  };
  
  attempts_in_focus_mode: number;
  
  current_streak: {
    type: 'correct' | 'incorrect';
    count: number;
  };
  
  most_selected_wrong_alternative?: {
    alternative_id: string;
    count: number;
  };
  
  evolution: 'improving' | 'stable' | 'declining';
}

interface QuestionHistoryWithComparison extends QuestionHistoryStats {
  global_stats?: {
    total_attempts_all_users: number;
    global_accuracy_rate: number;
    user_percentile: number;
    alternative_distribution: Record<string, number>; // % de cada alternativa
  };
}
```

---

## ⚠️ PONTOS DE ATENÇÃO

1. **Performance**: Histórico pode crescer muito
   - Implementar paginação
   - Limitar a últimas N tentativas no card
   - Usar índices adequados

2. **Privacidade**: Comparação com outros usuários
   - Dados agregados apenas
   - Não mostrar dados individuais de outros
   - Toggle opt-in/opt-out

3. **Migração**: Dados de simulados antigos
   - Script de migração pode demorar
   - Rodar em background
   - Manter JSONB original por segurança

4. **UnifiedReview**: Sincronização
   - Garantir que respostas em revisão também salvam em `question_responses`
   - Manter `programmed_review_id` para rastreabilidade

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ **Você aprovar esta análise**
2. Criar migration do banco
3. Implementar `QuestionHistoryService`
4. Criar endpoints
5. Desenvolver componente frontend
6. Testar integração
7. Migrar dados antigos de simulados

**Estimativa**: 2-3 dias de desenvolvimento
