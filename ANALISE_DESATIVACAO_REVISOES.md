# Análise: O que acontece quando usuário desativa tipos de conteúdo?

## 🔍 COMPORTAMENTO ATUAL

### Quando usuário desativa um tipo (ex: `enable_flashcards: false`):

**✅ O que acontece:**
1. `getDueReviews()` filtra e **NÃO retorna** flashcards
2. Cards FSRS de flashcards **continuam existindo** no banco
3. Cards **NÃO são atualizados** (não aparecem nas revisões)
4. Cards **NÃO são deletados**

**Código relevante:**
```typescript
// SupabaseUnifiedReviewService.ts - linha 543
if (prefs.enable_questions) enabledTypes.push(UnifiedContentType.QUESTION);
if (prefs.enable_flashcards) enabledTypes.push(UnifiedContentType.FLASHCARD);
if (prefs.enable_error_notebook) enabledTypes.push(UnifiedContentType.ERROR_NOTEBOOK);

// Se nenhum tipo habilitado, retornar vazio
if (enabledTypes.length === 0) {
  logger.info(`Nenhum tipo de conteúdo habilitado para usuário ${userId}`);
  return [];
}
```

### Quando usuário desativa TODOS os tipos:

**✅ O que acontece:**
1. `getDueReviews()` retorna array vazio `[]`
2. Todos os cards FSRS **continuam existindo** no banco
3. Nenhum card é atualizado
4. Nenhum card é deletado

---

## 🎯 COMPORTAMENTO RECOMENDADO

### Opção 1: **Manter Cards (Atual)** ⭐ RECOMENDADO

**Vantagens:**
- ✅ Usuário pode reativar e continuar de onde parou
- ✅ Histórico de revisões é preservado
- ✅ Estatísticas não são perdidas
- ✅ Mais seguro (não perde dados)
- ✅ Comportamento esperado por usuários

**Desvantagens:**
- ⚠️ Cards "dormentes" ocupam espaço no banco
- ⚠️ Se usuário desativa por muito tempo, cards podem ficar muito atrasados

**Quando reativar:**
- Cards voltam a aparecer nas revisões
- Datas de revisão são mantidas (podem estar atrasadas)
- Usuário pode ter muitas revisões acumuladas

### Opção 2: **Deletar Cards**

**Vantagens:**
- ✅ Banco de dados mais limpo
- ✅ Sem cards "dormentes"

**Desvantagens:**
- ❌ Perde todo o progresso FSRS
- ❌ Perde histórico de revisões
- ❌ Perde estatísticas
- ❌ Se reativar, começa do zero
- ❌ Comportamento inesperado e frustrante

### Opção 3: **Pausar Cards (Híbrido)**

**Vantagens:**
- ✅ Preserva dados
- ✅ Marca cards como "pausados"
- ✅ Pode "despausar" e ajustar datas

**Desvantagens:**
- ⚠️ Requer nova coluna no banco (`paused: boolean`)
- ⚠️ Mais complexo de implementar
- ⚠️ Precisa decidir o que fazer com datas ao despausar

---

## 💡 RECOMENDAÇÃO: Opção 1 (Manter Cards)

### Por quê?

1. **Experiência do usuário**: Usuário espera que seus dados sejam preservados
2. **Casos de uso comuns**:
   - Usuário desativa temporariamente para focar em um tipo
   - Usuário desativa antes de uma prova (foco em questões)
   - Usuário desativa durante férias
   - Usuário reativa depois e quer continuar

3. **Analogia**: É como "pausar" um jogo, não "deletar o save"

### Melhorias sugeridas:

#### 1. **Adicionar campo `reviews_enabled` nas preferências**

```typescript
interface ReviewPreferences {
  // ... campos existentes
  
  // NOVO: Sistema de revisões ativo/inativo
  reviews_enabled: boolean;
}
```

**Comportamento:**
- Se `reviews_enabled: false` → `getDueReviews()` retorna `[]` imediatamente
- Cards continuam existindo
- Nenhum cálculo é feito (economiza processamento)

#### 2. **Adicionar aviso ao reativar**

Quando usuário reativa um tipo desativado há muito tempo:

```typescript
// Verificar se há cards muito atrasados
const overdueCards = cards.filter(card => {
  const daysOverdue = daysSince(card.due);
  return daysOverdue > 30;
});

if (overdueCards.length > 0) {
  // Mostrar aviso no frontend:
  // "Você tem 45 revisões atrasadas de flashcards. 
  //  Deseja reagendar para os próximos dias?"
  
  // Opções:
  // 1. Manter datas (fazer todas agora)
  // 2. Reagendar para próximos 7 dias
  // 3. Resetar progresso (começar do zero)
}
```

#### 3. **Adicionar opção "Resetar Progresso"**

No wizard ou nas configurações:

```typescript
// Botão: "Resetar Progresso de Flashcards"
async resetProgressForType(userId: string, contentType: UnifiedContentType) {
  // Deletar todos os cards desse tipo
  await supabase
    .from('fsrs_cards')
    .delete()
    .eq('user_id', userId)
    .eq('content_type', contentType);
  
  // Ou resetar para estado inicial
  await supabase
    .from('fsrs_cards')
    .update({
      state: FSRSState.NEW,
      reps: 0,
      lapses: 0,
      due: new Date(),
      stability: 0,
      difficulty: 5
    })
    .eq('user_id', userId)
    .eq('content_type', contentType);
}
```

---

## 🔄 FLUXO RECOMENDADO

### Cenário 1: Usuário desativa flashcards

1. **Desativação:**
   - `enable_flashcards: false`
   - Cards de flashcards continuam no banco
   - `getDueReviews()` não retorna flashcards
   - Usuário não vê flashcards nas revisões

2. **Reativação (1 semana depois):**
   - `enable_flashcards: true`
   - Cards voltam a aparecer
   - Alguns podem estar atrasados
   - Usuário revisa normalmente

### Cenário 2: Usuário desativa TUDO

1. **Desativação:**
   - `reviews_enabled: false`
   - Todos os cards continuam no banco
   - `getDueReviews()` retorna `[]` imediatamente
   - Página de revisões mostra "Sistema desativado"

2. **Reativação (1 mês depois):**
   - `reviews_enabled: true`
   - Sistema verifica cards atrasados
   - Mostra aviso: "Você tem 150 revisões atrasadas"
   - Oferece opções:
     - Fazer todas agora
     - Reagendar para próximos 7 dias
     - Resetar progresso

### Cenário 3: Usuário quer começar do zero

1. **Opção no wizard ou configurações:**
   - Botão "Resetar Progresso"
   - Confirmação: "Isso vai deletar todo seu progresso de revisões"
   - Deleta todos os cards FSRS
   - Usuário começa do zero

---

## 📊 IMPACTO NO BANCO DE DADOS

### Situação atual (manter cards):

**Exemplo:** Usuário com 1000 cards FSRS desativa tudo por 6 meses

- **Espaço ocupado**: ~100KB (insignificante)
- **Processamento**: Zero (getDueReviews retorna vazio)
- **Impacto**: Praticamente nenhum

**Conclusão**: Não há problema em manter cards "dormentes"

---

## ✅ IMPLEMENTAÇÃO RECOMENDADA

### 1. **Adicionar `reviews_enabled` no backend**

```typescript
// ReviewPreferencesService.ts
export interface ReviewPreferences {
  // ... campos existentes
  reviews_enabled: boolean; // NOVO
}

// Valor padrão
const defaultPrefs = {
  // ... outros campos
  reviews_enabled: true, // Ativo por padrão
};
```

### 2. **Atualizar `getDueReviews()`**

```typescript
async getDueReviews(userId: string, ...): Promise<UnifiedReviewItem[]> {
  // NOVO: Verificar se sistema está ativo
  if (this.preferencesService) {
    const prefs = await this.preferencesService.getPreferences(userId);
    
    if (!prefs.reviews_enabled) {
      logger.info(`Sistema de revisões desativado para usuário ${userId}`);
      return [];
    }
  }
  
  // ... resto do código existente
}
```

### 3. **Adicionar aviso ao reativar (frontend)**

```typescript
// Quando usuário reativa no wizard
if (previouslyDisabled && nowEnabled) {
  const overdueCount = await checkOverdueReviews();
  
  if (overdueCount > 0) {
    showWarning({
      title: 'Revisões Atrasadas',
      message: `Você tem ${overdueCount} revisões atrasadas.`,
      options: [
        { label: 'Fazer todas agora', value: 'keep' },
        { label: 'Reagendar para próximos 7 dias', value: 'reschedule' },
        { label: 'Resetar progresso', value: 'reset' }
      ]
    });
  }
}
```

### 4. **Adicionar botão "Resetar Progresso"**

```typescript
// Na página de configurações
<button onClick={() => resetProgress('FLASHCARD')}>
  Resetar Progresso de Flashcards
</button>

// Confirmação
"Tem certeza? Isso vai deletar todo seu progresso de flashcards.
Você não poderá desfazer essa ação."
```

---

## 🎯 CONCLUSÃO

### Comportamento Atual: ✅ CORRETO

- Cards são mantidos quando tipos são desativados
- Cards não aparecem nas revisões
- Cards não são atualizados
- Cards não são deletados

### Melhorias Sugeridas:

1. ✅ Adicionar `reviews_enabled` para desativar sistema completo
2. ✅ Adicionar aviso ao reativar após muito tempo
3. ✅ Adicionar opção "Resetar Progresso" para quem quer começar do zero
4. ✅ Adicionar opção "Reagendar" para distribuir revisões atrasadas

### Prioridade:

- **Alta**: Adicionar `reviews_enabled` (já implementado no wizard)
- **Média**: Aviso ao reativar
- **Baixa**: Opção de resetar progresso

---

## 💬 RESPOSTA PARA O USUÁRIO

**Quando você desativa um tipo de conteúdo:**
- ✅ Cards continuam existindo no banco
- ✅ Cards não aparecem mais nas revisões
- ✅ Cards não são atualizados
- ✅ Você pode reativar a qualquer momento e continuar de onde parou

**Quando você desativa TUDO:**
- ✅ Todos os cards continuam existindo
- ✅ Sistema não calcula revisões (economiza processamento)
- ✅ Você pode reativar e continuar

**Se você quiser deletar tudo:**
- ⏭️ Vamos adicionar um botão "Resetar Progresso" nas configurações
- ⏭️ Isso vai deletar todos os cards e você começa do zero

**Recomendação**: Manter cards é mais seguro e flexível. É como "pausar" em vez de "deletar o save".
