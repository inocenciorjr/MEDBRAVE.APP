# 🔄 Análise Completa: Sistema UnifiedReview (FSRS)

## 📊 SITUAÇÃO ATUAL

### 1. Estrutura de Dados

#### Tabelas Existentes
- ✅ `fsrs_cards` - Cards FSRS para revisão espaçada
- ✅ `review_history` - Histórico de revisões
- ❌ `user_preferences` - NÃO EXISTE (precisa criar)
- ✅ `app_settings` - Configurações gerais

#### Tabela `fsrs_cards`
```sql
- id (text)
- user_id (text)
- content_id (text)          -- ID do conteúdo original
- content_type (text)         -- 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK'
- deck_id (text)
- deck_name (text)
- filter_name (text)
- due (timestamp)             -- Data da próxima revisão
- stability (numeric)         -- Estabilidade da memória
- difficulty (numeric)        -- Dificuldade (1-10)
- elapsed_days (integer)      -- Dias desde última revisão
- scheduled_days (integer)    -- Dias agendados para próxima
- reps (integer)              -- Número de repetições
- lapses (integer)            -- Número de falhas
- state (text)                -- 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING'
- last_review (timestamp)     -- Data da última revisão
- created_at (timestamp)
- updated_at (timestamp)
```

### 2. Parâmetros FSRS Atuais

#### ❌ PROBLEMA CRÍTICO: Intervalos Muito Longos

**Flashcards**:
```typescript
request_retention: 0.85,
maximum_interval: 90 dias  // ❌ 3 meses é MUITO!
```

**Questões**:
```typescript
request_retention: 0.80,
maximum_interval: 60 dias  // ❌ 2 meses é MUITO!
```

**Caderno de Erros**:
```typescript
request_retention: 0.75,
maximum_interval: 45 dias  // ❌ 1.5 meses é MUITO!
```

**Por que é problema?**
- Provas são a cada 6 meses
- Usuário estuda por 1-6 meses
- Revisão de 60-90 dias significa que o item só volta depois da prova!
- Não faz sentido para preparação de concursos

### 3. Funcionalidades Existentes

#### ✅ O que funciona
- Adicionar questões/flashcards/erros ao sistema
- Calcular próxima revisão com FSRS
- Registrar revisões
- Histórico de revisões
- Limites diários (DailyLimitsService)
- Completação de dias (DayCompletionService)

#### ❌ O que NÃO existe
- Preferências de usuário para revisões
- Controle de auto-add (automático vs manual)
- Desabilitar tipos de conteúdo (ex: só questões, sem flashcards)
- Remover items das revisões (controller existe mas retorna 410 Gone)
- Configuração personalizada de intervalos
- Modo "preparação para prova" com intervalos curtos


---

## 🎯 REQUISITOS DO USUÁRIO

### Contexto de Uso
- **Provas**: A cada 6 meses (Residência e Revalida)
- **Tempo de preparo**: 1-6 meses
- **Objetivo**: Revisar conteúdo ANTES da prova, não depois

### Funcionalidades Desejadas

1. **Controle de Auto-Add**
   - ✅ Modo Automático: Adiciona tudo automaticamente
   - ✅ Modo Manual: Usuário escolhe o que adicionar

2. **Controle por Tipo de Conteúdo**
   - ✅ Habilitar/desabilitar Questões
   - ✅ Habilitar/desabilitar Flashcards
   - ✅ Habilitar/desabilitar Caderno de Erros

3. **Gerenciamento de Items**
   - ✅ Adicionar item manualmente
   - ✅ Remover item das revisões
   - ✅ Ver items removidos
   - ✅ Restaurar item removido

4. **Intervalos Inteligentes**
   - ✅ Intervalos curtos para preparação de prova
   - ✅ Máximo de 21-30 dias (não 60-90!)
   - ✅ Ajuste baseado na proximidade da prova

5. **Eficiência**
   - ✅ Não sobrecarregar o usuário
   - ✅ Priorizar items importantes
   - ✅ Balancear novos items vs revisões

---

## 🛠️ SOLUÇÃO PROPOSTA

### Fase 1: Criar Sistema de Preferências

#### 1.1 Criar Tabela `review_preferences`

```sql
CREATE TABLE review_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Controle de Auto-Add
  auto_add_questions BOOLEAN DEFAULT true,
  auto_add_flashcards BOOLEAN DEFAULT true,
  auto_add_error_notebook BOOLEAN DEFAULT true,
  
  -- Habilitar/Desabilitar Tipos
  enable_questions BOOLEAN DEFAULT true,
  enable_flashcards BOOLEAN DEFAULT true,
  enable_error_notebook BOOLEAN DEFAULT true,
  
  -- Configurações de Intervalos
  max_interval_days INTEGER DEFAULT 21,  -- Máximo 21 dias (3 semanas)
  target_retention NUMERIC DEFAULT 0.85,  -- Taxa de retenção desejada
  
  -- Modo de Estudo
  study_mode TEXT DEFAULT 'balanced',  -- 'intensive' | 'balanced' | 'relaxed'
  
  -- Data da Prova (para ajustar intervalos)
  exam_date TIMESTAMP,
  
  -- Limites Diários
  daily_new_items_limit INTEGER DEFAULT 20,
  daily_reviews_limit INTEGER DEFAULT 100,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_review_preferences_user ON review_preferences(user_id);
```

#### 1.2 Criar Tabela `removed_review_items`

```sql
CREATE TABLE removed_review_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL,  -- 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK'
  
  -- Motivo da Remoção
  removal_reason TEXT,  -- 'MASTERED' | 'NOT_RELEVANT' | 'TOO_DIFFICULT' | 'OTHER'
  removal_notes TEXT,
  
  -- Dados do Card Original (para restaurar)
  original_card_data JSONB,
  
  -- Timestamps
  removed_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, content_id, content_type)
);

CREATE INDEX idx_removed_items_user ON removed_review_items(user_id);
CREATE INDEX idx_removed_items_content ON removed_review_items(content_id, content_type);
```

### Fase 2: Ajustar Parâmetros FSRS

#### 2.1 Novos Parâmetros (Intervalos Curtos)

```typescript
// Modo INTENSIVE (preparação próxima da prova)
private intensiveParameters: FSRSParameters = {
  request_retention: 0.90,  // Alta retenção
  maximum_interval: 14,     // Máximo 2 semanas
  w: [
    4.0, 0.8, 2.0, 0.1, 5.0, 0.3, 0.7, 0.02, 0.9, 0.1,
    0.6, 1.0, 0.08, 0.15, 1.2, 0.2, 1.3
  ],
};

// Modo BALANCED (preparação normal)
private balancedParameters: FSRSParameters = {
  request_retention: 0.85,
  maximum_interval: 21,     // Máximo 3 semanas
  w: [
    5.0, 1.0, 2.5, 0.1, 6.0, 0.4, 0.8, 0.02, 1.0, 0.1,
    0.7, 1.2, 0.08, 0.18, 1.4, 0.2, 1.5
  ],
};

// Modo RELAXED (preparação longa)
private relaxedParameters: FSRSParameters = {
  request_retention: 0.80,
  maximum_interval: 30,     // Máximo 1 mês
  w: [
    6.0, 1.2, 3.0, 0.1, 7.0, 0.5, 0.9, 0.02, 1.1, 0.1,
    0.8, 1.4, 0.08, 0.20, 1.6, 0.2, 1.7
  ],
};
```

#### 2.2 Ajuste Dinâmico Baseado na Prova

```typescript
private getParametersForUser(userId: string, contentType: UnifiedContentType): FSRSParameters {
  const preferences = await this.getReviewPreferences(userId);
  
  // Se tem data da prova, ajustar intervalos
  if (preferences.exam_date) {
    const daysUntilExam = this.calculateDaysUntilExam(preferences.exam_date);
    
    if (daysUntilExam <= 30) {
      return this.intensiveParameters;  // Última semana: revisões frequentes
    } else if (daysUntilExam <= 90) {
      return this.balancedParameters;   // 1-3 meses: balanceado
    }
  }
  
  // Usar modo configurado pelo usuário
  switch (preferences.study_mode) {
    case 'intensive':
      return this.intensiveParameters;
    case 'balanced':
      return this.balancedParameters;
    case 'relaxed':
      return this.relaxedParameters;
    default:
      return this.balancedParameters;
  }
}
```


### Fase 3: Implementar Controle de Auto-Add

#### 3.1 Service: ReviewPreferencesService

```typescript
export class ReviewPreferencesService {
  constructor(private supabase: SupabaseClient) {}

  async getPreferences(userId: string): Promise<ReviewPreferences> {
    const { data, error } = await this.supabase
      .from('review_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Criar preferências padrão
      return this.createDefaultPreferences(userId);
    }

    return data;
  }

  async updatePreferences(userId: string, preferences: Partial<ReviewPreferences>): Promise<ReviewPreferences> {
    const { data, error } = await this.supabase
      .from('review_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new AppError('Erro ao atualizar preferências', 500);
    return data;
  }

  async shouldAutoAdd(userId: string, contentType: UnifiedContentType): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    
    switch (contentType) {
      case UnifiedContentType.QUESTION:
        return prefs.auto_add_questions && prefs.enable_questions;
      case UnifiedContentType.FLASHCARD:
        return prefs.auto_add_flashcards && prefs.enable_flashcards;
      case UnifiedContentType.ERROR_NOTEBOOK:
        return prefs.auto_add_error_notebook && prefs.enable_error_notebook;
      default:
        return false;
    }
  }

  async isContentTypeEnabled(userId: string, contentType: UnifiedContentType): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    
    switch (contentType) {
      case UnifiedContentType.QUESTION:
        return prefs.enable_questions;
      case UnifiedContentType.FLASHCARD:
        return prefs.enable_flashcards;
      case UnifiedContentType.ERROR_NOTEBOOK:
        return prefs.enable_error_notebook;
      default:
        return false;
    }
  }
}
```

#### 3.2 Modificar addQuestionToReviews

```typescript
async addQuestionToReviews(questionId: string, userId: string, force: boolean = false): Promise<void> {
  try {
    // Se não for forçado, verificar preferências
    if (!force) {
      const shouldAdd = await this.preferencesService.shouldAutoAdd(userId, UnifiedContentType.QUESTION);
      if (!shouldAdd) {
        logger.info(`Auto-add desabilitado para questões do usuário ${userId}`);
        return;
      }
    }

    // Verificar se já existe
    const { data: existingCard } = await this.supabase
      .from('fsrs_cards')
      .select('id')
      .eq('content_id', questionId)
      .eq('user_id', userId)
      .eq('content_type', UnifiedContentType.QUESTION)
      .single();

    if (existingCard) {
      logger.info(`Card FSRS já existe para a questão ${questionId}`);
      return;
    }

    // Criar novo card
    const newCard = this.createNewCard(questionId, userId, '', UnifiedContentType.QUESTION);
    
    const { error } = await this.supabase
      .from('fsrs_cards')
      .insert(newCard);

    if (error) throw new AppError('Erro ao adicionar questão às revisões', 500);

    logger.info(`Questão ${questionId} adicionada ao sistema FSRS`);
  } catch (error) {
    logger.error('Erro ao adicionar questão às revisões:', error);
    throw error;
  }
}
```

### Fase 4: Implementar Remoção e Restauração

#### 4.1 Service: ReviewItemManagementService

```typescript
export class ReviewItemManagementService {
  constructor(private supabase: SupabaseClient) {}

  async removeFromReviews(
    userId: string,
    contentId: string,
    contentType: UnifiedContentType,
    reason?: string,
    notes?: string
  ): Promise<void> {
    // Buscar card FSRS
    const { data: card, error: cardError } = await this.supabase
      .from('fsrs_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .single();

    if (cardError || !card) {
      throw new AppError('Item não encontrado nas revisões', 404);
    }

    // Salvar em removed_review_items
    await this.supabase
      .from('removed_review_items')
      .insert({
        id: `removed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        content_id: contentId,
        content_type: contentType,
        removal_reason: reason,
        removal_notes: notes,
        original_card_data: card,
        removed_at: new Date().toISOString()
      });

    // Deletar card FSRS
    await this.supabase
      .from('fsrs_cards')
      .delete()
      .eq('id', card.id);

    logger.info(`Item ${contentId} removido das revisões do usuário ${userId}`);
  }

  async restoreToReviews(
    userId: string,
    contentId: string,
    contentType: UnifiedContentType
  ): Promise<void> {
    // Buscar item removido
    const { data: removed, error: removedError } = await this.supabase
      .from('removed_review_items')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .single();

    if (removedError || !removed) {
      throw new AppError('Item removido não encontrado', 404);
    }

    // Restaurar card FSRS
    const cardData = removed.original_card_data;
    await this.supabase
      .from('fsrs_cards')
      .insert({
        ...cardData,
        updated_at: new Date().toISOString()
      });

    // Deletar de removed_review_items
    await this.supabase
      .from('removed_review_items')
      .delete()
      .eq('id', removed.id);

    logger.info(`Item ${contentId} restaurado às revisões do usuário ${userId}`);
  }

  async getRemovedItems(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('removed_review_items')
      .select('*')
      .eq('user_id', userId)
      .order('removed_at', { ascending: false });

    if (error) throw new AppError('Erro ao buscar items removidos', 500);
    return data || [];
  }
}
```


### Fase 5: Filtrar Revisões por Tipo

#### 5.1 Modificar getDueReviews

```typescript
async getDueReviews(
  userId: string,
  limit?: number,
  contentTypes?: UnifiedContentType[]
): Promise<UnifiedReviewItem[]> {
  try {
    // Buscar preferências do usuário
    const prefs = await this.preferencesService.getPreferences(userId);
    
    // Filtrar tipos habilitados
    let enabledTypes: UnifiedContentType[] = [];
    if (prefs.enable_questions) enabledTypes.push(UnifiedContentType.QUESTION);
    if (prefs.enable_flashcards) enabledTypes.push(UnifiedContentType.FLASHCARD);
    if (prefs.enable_error_notebook) enabledTypes.push(UnifiedContentType.ERROR_NOTEBOOK);
    
    // Se contentTypes foi especificado, usar interseção
    if (contentTypes && contentTypes.length > 0) {
      enabledTypes = enabledTypes.filter(t => contentTypes.includes(t));
    }
    
    // Se nenhum tipo habilitado, retornar vazio
    if (enabledTypes.length === 0) {
      return [];
    }
    
    const today = this.getUTCMinus3Date();
    
    let query = this.supabase
      .from('fsrs_cards')
      .select('*')
      .eq('user_id', userId)
      .lte('due', today.toISOString())
      .in('content_type', enabledTypes)
      .order('due', { ascending: true });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw new AppError('Erro ao buscar revisões', 500);
    
    const items = data || [];
    const enrichedItems = await Promise.all(
      items.map(item => this.enrichCardWithContent(item))
    );
    
    return enrichedItems.filter(item => item !== null) as UnifiedReviewItem[];
  } catch (error) {
    logger.error('Erro em getDueReviews:', error);
    throw error;
  }
}
```

### Fase 6: Endpoints da API

#### 6.1 ReviewPreferencesController

```typescript
export class ReviewPreferencesController {
  constructor(private preferencesService: ReviewPreferencesService) {}

  // GET /api/review-preferences
  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const prefs = await this.preferencesService.getPreferences(userId);
      
      res.status(200).json({ success: true, data: prefs });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/review-preferences
  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const prefs = await this.preferencesService.updatePreferences(userId, req.body);
      
      res.status(200).json({ 
        success: true, 
        message: 'Preferências atualizadas',
        data: prefs 
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/review-preferences/set-exam-date
  async setExamDate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { exam_date } = req.body;
      if (!exam_date) throw AppError.badRequest("Data da prova é obrigatória");

      const prefs = await this.preferencesService.updatePreferences(userId, { exam_date });
      
      res.status(200).json({ 
        success: true, 
        message: 'Data da prova configurada',
        data: prefs 
      });
    } catch (error) {
      next(error);
    }
  }
}
```

#### 6.2 ReviewItemManagementController

```typescript
export class ReviewItemManagementController {
  constructor(private managementService: ReviewItemManagementService) {}

  // DELETE /api/unified-reviews/items/:contentId
  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { contentId } = req.params;
      const { content_type, reason, notes } = req.body;

      await this.managementService.removeFromReviews(
        userId,
        contentId,
        content_type,
        reason,
        notes
      );
      
      res.status(200).json({ 
        success: true, 
        message: 'Item removido das revisões' 
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/unified-reviews/items/:contentId/restore
  async restoreItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { contentId } = req.params;
      const { content_type } = req.body;

      await this.managementService.restoreToReviews(userId, contentId, content_type);
      
      res.status(200).json({ 
        success: true, 
        message: 'Item restaurado às revisões' 
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/unified-reviews/removed-items
  async getRemovedItems(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const items = await this.managementService.getRemovedItems(userId);
      
      res.status(200).json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/unified-reviews/items/add-manual
  async addManually(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { content_id, content_type } = req.body;

      // Adicionar forçadamente (ignorar auto-add)
      switch (content_type) {
        case UnifiedContentType.QUESTION:
          await this.unifiedReviewService.addQuestionToReviews(content_id, userId, true);
          break;
        case UnifiedContentType.FLASHCARD:
          await this.unifiedReviewService.addFlashcardToReviews(content_id, userId, true);
          break;
        case UnifiedContentType.ERROR_NOTEBOOK:
          await this.unifiedReviewService.addErrorNoteToReview(content_id, userId);
          break;
        default:
          throw AppError.badRequest("Tipo de conteúdo inválido");
      }
      
      res.status(201).json({ 
        success: true, 
        message: 'Item adicionado às revisões' 
      });
    } catch (error) {
      next(error);
    }
  }
}
```


---

## 📋 MELHORIAS ADICIONAIS

### 1. Priorização Inteligente

#### 1.1 Priorizar por Importância
```typescript
async getDueReviewsPrioritized(userId: string, limit?: number): Promise<UnifiedReviewItem[]> {
  const items = await this.getDueReviews(userId, limit * 2); // Buscar mais para filtrar
  
  // Calcular score de prioridade
  const scored = items.map(item => ({
    ...item,
    priority_score: this.calculatePriorityScore(item)
  }));
  
  // Ordenar por prioridade
  scored.sort((a, b) => b.priority_score - a.priority_score);
  
  return scored.slice(0, limit);
}

private calculatePriorityScore(item: UnifiedReviewItem): number {
  let score = 0;
  
  // Quanto mais atrasado, maior prioridade
  const daysOverdue = this.dateDiff(item.due, new Date());
  score += daysOverdue * 10;
  
  // Quanto mais lapses, maior prioridade (está com dificuldade)
  score += item.lapses * 5;
  
  // Quanto menor a stability, maior prioridade (memória fraca)
  score += (10 - item.stability) * 3;
  
  // Caderno de erros tem prioridade extra
  if (item.content_type === UnifiedContentType.ERROR_NOTEBOOK) {
    score += 20;
  }
  
  return score;
}
```

### 2. Balanceamento de Conteúdo

#### 2.1 Distribuir Tipos de Conteúdo
```typescript
async getDueReviewsBalanced(userId: string, limit: number = 50): Promise<UnifiedReviewItem[]> {
  const prefs = await this.preferencesService.getPreferences(userId);
  
  // Distribuição: 40% questões, 30% flashcards, 30% erros
  const questionLimit = Math.floor(limit * 0.4);
  const flashcardLimit = Math.floor(limit * 0.3);
  const errorLimit = Math.floor(limit * 0.3);
  
  const questions = prefs.enable_questions 
    ? await this.getDueReviews(userId, questionLimit, [UnifiedContentType.QUESTION])
    : [];
    
  const flashcards = prefs.enable_flashcards
    ? await this.getDueReviews(userId, flashcardLimit, [UnifiedContentType.FLASHCARD])
    : [];
    
  const errors = prefs.enable_error_notebook
    ? await this.getDueReviews(userId, errorLimit, [UnifiedContentType.ERROR_NOTEBOOK])
    : [];
  
  // Misturar aleatoriamente
  return this.shuffleArray([...questions, ...flashcards, ...errors]);
}
```

### 3. Estatísticas e Insights

#### 3.1 Dashboard de Revisões
```typescript
async getReviewDashboard(userId: string): Promise<ReviewDashboard> {
  const prefs = await this.preferencesService.getPreferences(userId);
  const dueItems = await this.getDueReviews(userId);
  const todayReviews = await this.getTodayReviews(userId);
  
  // Calcular tempo estimado
  const avgTimePerItem = 45; // segundos
  const estimatedTimeMinutes = Math.ceil((dueItems.length * avgTimePerItem) / 60);
  
  // Calcular dias até a prova
  let daysUntilExam = null;
  if (prefs.exam_date) {
    daysUntilExam = this.dateDiff(new Date(), prefs.exam_date);
  }
  
  // Breakdown por tipo
  const breakdown = {
    questions: dueItems.filter(i => i.content_type === UnifiedContentType.QUESTION).length,
    flashcards: dueItems.filter(i => i.content_type === UnifiedContentType.FLASHCARD).length,
    errors: dueItems.filter(i => i.content_type === UnifiedContentType.ERROR_NOTEBOOK).length,
  };
  
  // Breakdown por estado
  const stateBreakdown = {
    new: dueItems.filter(i => i.state === FSRSState.NEW).length,
    learning: dueItems.filter(i => i.state === FSRSState.LEARNING).length,
    review: dueItems.filter(i => i.state === FSRSState.REVIEW).length,
    relearning: dueItems.filter(i => i.state === FSRSState.RELEARNING).length,
  };
  
  return {
    total_due: dueItems.length,
    completed_today: todayReviews.length,
    estimated_time_minutes: estimatedTimeMinutes,
    days_until_exam: daysUntilExam,
    breakdown,
    state_breakdown: stateBreakdown,
    study_mode: prefs.study_mode,
    max_interval_days: prefs.max_interval_days,
  };
}
```

### 4. Modo "Cramming" (Revisão Intensiva)

#### 4.1 Ativar Modo Prova Próxima
```typescript
async activateCrammingMode(userId: string, examDate: Date): Promise<void> {
  // Atualizar preferências
  await this.preferencesService.updatePreferences(userId, {
    exam_date: examDate,
    study_mode: 'intensive',
    max_interval_days: 7,  // Máximo 1 semana
    daily_reviews_limit: 200,  // Aumentar limite
  });
  
  // Reajustar todos os cards para intervalos curtos
  const { data: cards } = await this.supabase
    .from('fsrs_cards')
    .select('*')
    .eq('user_id', userId);
  
  if (cards) {
    for (const card of cards) {
      // Se a próxima revisão está muito longe, antecipar
      const daysUntilDue = this.dateDiff(new Date(), card.due);
      if (daysUntilDue > 7) {
        // Reagendar para os próximos 7 dias
        const newDue = this.addDays(new Date(), Math.min(daysUntilDue, 7));
        
        await this.supabase
          .from('fsrs_cards')
          .update({
            due: newDue.toISOString(),
            scheduled_days: Math.min(card.scheduled_days, 7),
            updated_at: new Date().toISOString()
          })
          .eq('id', card.id);
      }
    }
  }
  
  logger.info(`Modo cramming ativado para usuário ${userId}`);
}
```

### 5. Integração com Histórico de Questões

#### 5.1 Sincronizar Respostas
```typescript
// Quando usuário responde questão em lista/simulado
async syncQuestionResponse(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  studyMode: 'normal_list' | 'simulated_exam' | 'unified_review'
): Promise<void> {
  // Salvar em question_responses (histórico)
  await this.saveToQuestionResponses(userId, questionId, isCorrect, studyMode);
  
  // Se está no sistema de revisões, atualizar card FSRS
  const { data: card } = await this.supabase
    .from('fsrs_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('content_id', questionId)
    .eq('content_type', UnifiedContentType.QUESTION)
    .single();
  
  if (card) {
    // Atualizar FSRS
    const grade = isCorrect ? FSRSGrade.GOOD : FSRSGrade.AGAIN;
    await this.recordReview(userId, questionId, grade);
  } else {
    // Se não está no sistema, verificar se deve adicionar
    const shouldAdd = await this.preferencesService.shouldAutoAdd(userId, UnifiedContentType.QUESTION);
    if (shouldAdd) {
      await this.addQuestionToReviews(questionId, userId);
    }
  }
}
```


---

## 🚀 ROTEIRO DE IMPLEMENTAÇÃO

### Sprint 1: Fundação (3-4 dias)

**Dia 1: Banco de Dados**
- [ ] Criar migration para `review_preferences`
- [ ] Criar migration para `removed_review_items`
- [ ] Criar índices
- [ ] Testar migrations

**Dia 2: Services Base**
- [ ] Criar `ReviewPreferencesService`
- [ ] Criar `ReviewItemManagementService`
- [ ] Criar métodos de preferências padrão
- [ ] Testes unitários

**Dia 3: Ajustar Parâmetros FSRS**
- [ ] Implementar novos parâmetros (intensive, balanced, relaxed)
- [ ] Implementar `getParametersForUser()`
- [ ] Implementar ajuste dinâmico baseado em data da prova
- [ ] Testar cálculos

**Dia 4: Integração**
- [ ] Modificar `addQuestionToReviews()` para verificar preferências
- [ ] Modificar `getDueReviews()` para filtrar por tipo habilitado
- [ ] Modificar `recordQuestionResponse()` para sincronizar
- [ ] Testes de integração

### Sprint 2: API e Controllers (2-3 dias)

**Dia 5: Controllers**
- [ ] Criar `ReviewPreferencesController`
- [ ] Criar `ReviewItemManagementController`
- [ ] Criar rotas
- [ ] Registrar em `routes.ts`

**Dia 6: Endpoints**
- [ ] `GET /api/review-preferences`
- [ ] `PUT /api/review-preferences`
- [ ] `POST /api/review-preferences/set-exam-date`
- [ ] `DELETE /api/unified-reviews/items/:contentId`
- [ ] `POST /api/unified-reviews/items/:contentId/restore`
- [ ] `GET /api/unified-reviews/removed-items`
- [ ] `POST /api/unified-reviews/items/add-manual`

**Dia 7: Testes**
- [ ] Testar todos os endpoints
- [ ] Testar autenticação
- [ ] Testar casos de erro
- [ ] Documentar API

### Sprint 3: Melhorias (2-3 dias)

**Dia 8: Priorização**
- [ ] Implementar `getDueReviewsPrioritized()`
- [ ] Implementar `calculatePriorityScore()`
- [ ] Implementar `getDueReviewsBalanced()`
- [ ] Testar distribuição

**Dia 9: Dashboard**
- [ ] Implementar `getReviewDashboard()`
- [ ] Criar endpoint `GET /api/unified-reviews/dashboard`
- [ ] Adicionar estatísticas
- [ ] Testar métricas

**Dia 10: Modo Cramming**
- [ ] Implementar `activateCrammingMode()`
- [ ] Criar endpoint `POST /api/review-preferences/activate-cramming`
- [ ] Testar reagendamento de cards
- [ ] Validar intervalos

### Sprint 4: Frontend (3-4 dias)

**Dia 11-12: Componentes**
- [ ] Tela de Preferências de Revisão
- [ ] Toggle para auto-add por tipo
- [ ] Toggle para habilitar/desabilitar tipos
- [ ] Seletor de modo de estudo
- [ ] Configuração de data da prova
- [ ] Limites diários

**Dia 13: Gerenciamento**
- [ ] Botão "Remover das revisões" em questões/flashcards
- [ ] Modal de confirmação com motivo
- [ ] Tela de "Items Removidos"
- [ ] Botão "Restaurar" em items removidos
- [ ] Botão "Adicionar manualmente às revisões"

**Dia 14: Dashboard**
- [ ] Card de estatísticas de revisão
- [ ] Gráfico de distribuição por tipo
- [ ] Contador de dias até prova
- [ ] Tempo estimado de revisão
- [ ] Botão "Ativar Modo Cramming"

---

## 📊 ESTRUTURA DE DADOS FINAL

### Interface: ReviewPreferences
```typescript
interface ReviewPreferences {
  id: string;
  user_id: string;
  
  // Auto-Add
  auto_add_questions: boolean;
  auto_add_flashcards: boolean;
  auto_add_error_notebook: boolean;
  
  // Habilitar/Desabilitar
  enable_questions: boolean;
  enable_flashcards: boolean;
  enable_error_notebook: boolean;
  
  // Intervalos
  max_interval_days: number;
  target_retention: number;
  
  // Modo
  study_mode: 'intensive' | 'balanced' | 'relaxed';
  
  // Prova
  exam_date?: Date;
  
  // Limites
  daily_new_items_limit: number;
  daily_reviews_limit: number;
  
  created_at: Date;
  updated_at: Date;
}
```

### Interface: RemovedReviewItem
```typescript
interface RemovedReviewItem {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK';
  
  removal_reason?: 'MASTERED' | 'NOT_RELEVANT' | 'TOO_DIFFICULT' | 'OTHER';
  removal_notes?: string;
  
  original_card_data: FSRSCard;
  
  removed_at: Date;
}
```

### Interface: ReviewDashboard
```typescript
interface ReviewDashboard {
  total_due: number;
  completed_today: number;
  estimated_time_minutes: number;
  days_until_exam: number | null;
  
  breakdown: {
    questions: number;
    flashcards: number;
    errors: number;
  };
  
  state_breakdown: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };
  
  study_mode: 'intensive' | 'balanced' | 'relaxed';
  max_interval_days: number;
}
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Funcionalidades Essenciais
- [ ] Usuário pode habilitar/desabilitar auto-add por tipo
- [ ] Usuário pode habilitar/desabilitar tipos de conteúdo
- [ ] Usuário pode remover item das revisões
- [ ] Usuário pode restaurar item removido
- [ ] Usuário pode adicionar item manualmente
- [ ] Usuário pode configurar data da prova
- [ ] Usuário pode escolher modo de estudo
- [ ] Intervalos máximos são respeitados (21-30 dias)
- [ ] Modo cramming funciona corretamente
- [ ] Dashboard mostra estatísticas corretas

### Performance
- [ ] Queries otimizadas com índices
- [ ] Não há N+1 queries
- [ ] Cache de preferências quando apropriado
- [ ] Paginação em listas grandes

### UX
- [ ] Preferências padrão sensatas
- [ ] Feedback claro ao usuário
- [ ] Confirmação antes de remover
- [ ] Explicação de cada modo de estudo
- [ ] Avisos quando prova está próxima

---

## 🎯 RESUMO DAS MUDANÇAS

### ❌ Problemas Resolvidos
1. ✅ Intervalos muito longos (90 dias → 21-30 dias)
2. ✅ Falta de controle de auto-add
3. ✅ Impossibilidade de remover items
4. ✅ Falta de controle por tipo de conteúdo
5. ✅ Sem ajuste para proximidade de prova
6. ✅ Sem modo manual de adição

### ✅ Novas Funcionalidades
1. ✅ Sistema de preferências completo
2. ✅ Controle granular de auto-add
3. ✅ Remoção e restauração de items
4. ✅ Filtros por tipo de conteúdo
5. ✅ Ajuste dinâmico de intervalos
6. ✅ Modo cramming para prova próxima
7. ✅ Priorização inteligente
8. ✅ Balanceamento de conteúdo
9. ✅ Dashboard de revisões
10. ✅ Integração com histórico de questões

### 📈 Melhorias de Eficiência
- Intervalos adequados ao contexto de concursos (6 meses)
- Priorização de items com dificuldade
- Balanceamento automático de tipos
- Modo intensivo para reta final
- Controle total do usuário sobre o que revisar

---

## 💡 RECOMENDAÇÕES FINAIS

1. **Começar com Preferências Padrão Sensatas**
   - Auto-add habilitado para tudo
   - Modo balanced
   - Intervalos de 21 dias
   - Limites diários razoáveis (50 revisões, 20 novos)

2. **Educar o Usuário**
   - Explicar o que é cada modo
   - Mostrar impacto de cada configuração
   - Sugerir configurações baseadas na data da prova

3. **Monitorar Métricas**
   - Taxa de completação diária
   - Tempo médio por revisão
   - Taxa de acerto por tipo
   - Uso de cada modo

4. **Iterar Baseado em Feedback**
   - Ajustar parâmetros FSRS se necessário
   - Adicionar novos modos se usuários pedirem
   - Melhorar priorização baseado em dados reais

**Estimativa Total**: 10-14 dias de desenvolvimento
**Prioridade**: ALTA (impacta diretamente eficácia do estudo)
