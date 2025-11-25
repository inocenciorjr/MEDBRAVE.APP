# Implementação do Sistema de Threshold para Revisões

## 📋 Resumo

Implementado sistema inteligente que decide quando recalcular a próxima revisão baseado em quanto tempo passou desde a última revisão e quanto tempo falta para a próxima.

## 🎯 Objetivo

Evitar penalizar usuários que estudam conteúdo **antes** da data programada de revisão, mantendo o espaçamento ideal do FSRS.

## 🔧 Como Funciona

### Conceitos

- **elapsed_days**: Dias que passaram desde a última revisão
- **scheduled_days**: Dias totais do intervalo (entre última revisão e próxima)
- **progress**: Percentual do intervalo que já passou (`elapsed_days / scheduled_days`)
- **threshold**: Limite percentual para decidir se recalcula ou não

### Regras de Threshold

| Grade | Threshold | Comportamento |
|-------|-----------|---------------|
| **AGAIN (0)** | N/A | **Sempre recalcula** (penaliza) |
| **HARD (1)** | 50% | Recalcula se progress ≥ 50% |
| **GOOD (2)** | 70% | Recalcula se progress ≥ 70% |
| **EASY (3)** | 70% | Recalcula se progress ≥ 70% |

### Exemplo Prático

**Cenário**: Intervalo de 14 dias

```
Última revisão: Dia 1
Próxima revisão: Dia 15
```

| Dia | Elapsed | Progress | AGAIN | HARD | GOOD/EASY |
|-----|---------|----------|-------|------|-----------|
| 3   | 2 dias  | 14%      | ♻️ Recalcula | ✋ Mantém | ✋ Mantém |
| 5   | 4 dias  | 29%      | ♻️ Recalcula | ✋ Mantém | ✋ Mantém |
| 8   | 7 dias  | 50%      | ♻️ Recalcula | ♻️ Recalcula | ✋ Mantém |
| 11  | 10 dias | 71%      | ♻️ Recalcula | ♻️ Recalcula | ♻️ Recalcula |
| 14  | 13 dias | 93%      | ♻️ Recalcula | ♻️ Recalcula | ♻️ Recalcula |

## 📁 Arquivos Modificados

### 1. SupabaseUnifiedReviewService.ts

#### Novo método: `shouldRecalculateReview()`

```typescript
private shouldRecalculateReview(card: FSRSCard, grade: FSRSGrade, now: Date): boolean {
  // AGAIN sempre recalcula
  if (grade === FSRSGrade.AGAIN) {
    return true;
  }

  // Calcular progresso
  const elapsed_days = this.dateDiff(lastReview, now);
  const scheduled_days = this.dateDiff(lastReview, dueDate);
  const progress = elapsed_days / scheduled_days;
  
  // Thresholds
  const THRESHOLD_HARD = 0.5;       // 50%
  const THRESHOLD_GOOD_EASY = 0.7;  // 70%
  
  // Verificar threshold
  if (grade === FSRSGrade.HARD) {
    return progress >= THRESHOLD_HARD;
  } else {
    return progress >= THRESHOLD_GOOD_EASY;
  }
}
```

#### Método atualizado: `processReview()`

```typescript
private async processReview(
  card: FSRSCard, 
  grade: FSRSGrade, 
  userId: string,
  isActiveReview: boolean = true  // ← NOVO PARÂMETRO
): Promise<SchedulingInfo> {
  const now = this.getUTCMinus3Date();
  
  // Se não é revisão ativa, verificar threshold
  if (!isActiveReview) {
    const shouldRecalculate = this.shouldRecalculateReview(card, grade, now);
    
    if (!shouldRecalculate) {
      // Mantém a data original, apenas atualiza last_review
      return {
        card: {
          ...card,
          last_review: now,
          updated_at: this.getUTCMinus3Date().toISOString(),
        }
      };
    }
  }
  
  // ... resto do código FSRS
}
```

### 2. Chamadas Atualizadas

#### Página de Flashcards (SupabaseFlashcardRepository.ts)

```typescript
await unifiedReviewService.recordReview(
  user_id,
  id,
  quality,
  reviewTimeMs || 0,
  false // ← isActiveReview = false (página de flashcards)
);
```

#### Página de Caderno de Erros (SupabaseErrorNotebookService.ts)

```typescript
await this.unifiedReviewService.recordErrorNotebookEntryReview(
  entryId,
  userId,
  selfAssessment,
  reviewTimeMs,
  false // ← isActiveReview = false (página de caderno de erros)
);
```

#### Listas/Simulados (SupabaseUnifiedReviewService.ts)

```typescript
// updateQuestionCardOnly
const schedulingInfo = await this.processReview(
  card, 
  grade, 
  userId, 
  false // ← isActiveReview = false (lista/simulado)
);
```

#### Página de Revisões (UnifiedReviewController.ts)

```typescript
await this.unifiedReviewService.recordReview(
  user_id,
  content_id,
  grade,
  review_time_ms,
  true // ← isActiveReview = true (página de revisões)
);
```

#### Revisão Ativa de Questões (SupabaseUnifiedReviewService.ts)

```typescript
// recordQuestionResponse
const schedulingInfo = await this.processReview(
  card, 
  grade, 
  userId, 
  true // ← isActiveReview = true (revisão ativa)
);
```

## ✅ Vantagens

1. **Evita penalização injusta**: Usuário que estuda antes do tempo não é penalizado
2. **Mantém espaçamento ideal**: Respeita o algoritmo FSRS quando próximo da data
3. **Flexibilidade**: Permite "reforço" sem prejudicar o progresso
4. **Inteligente**: HARD tem threshold menor (50%) pois indica dificuldade

## 🎯 Casos de Uso

### Caso 1: Estudo Antecipado (Mantém Data)

```
Última revisão: Dia 1
Próxima revisão: Dia 15 (14 dias)
Hoje: Dia 5 (4 dias depois, 29% do intervalo)

Usuário responde: GOOD
→ Progress = 29% < 70%
→ MANTÉM próxima = Dia 15 ✅
→ Apenas atualiza last_review
```

### Caso 2: Próximo da Data (Recalcula)

```
Última revisão: Dia 1
Próxima revisão: Dia 15 (14 dias)
Hoje: Dia 12 (11 dias depois, 79% do intervalo)

Usuário responde: GOOD
→ Progress = 79% ≥ 70%
→ RECALCULA próxima revisão ✅
→ Nova data baseada no FSRS
```

### Caso 3: Errou (Sempre Recalcula)

```
Última revisão: Dia 1
Próxima revisão: Dia 15 (14 dias)
Hoje: Dia 3 (2 dias depois, 14% do intervalo)

Usuário responde: AGAIN
→ SEMPRE recalcula (penaliza) ✅
→ Próxima = ~1 dia
```

### Caso 4: Teve Dificuldade (Threshold 50%)

```
Última revisão: Dia 1
Próxima revisão: Dia 15 (14 dias)
Hoje: Dia 8 (7 dias depois, 50% do intervalo)

Usuário responde: HARD
→ Progress = 50% ≥ 50%
→ RECALCULA (mais conservador) ✅
```

## 🔍 Onde Aplica

| Contexto | isActiveReview | Aplica Threshold? |
|----------|----------------|-------------------|
| Página de Revisões | `true` | ❌ Não (sempre recalcula) |
| Página de Flashcards | `false` | ✅ Sim |
| Página de Caderno de Erros | `false` | ✅ Sim |
| Listas/Simulados | `false` | ✅ Sim |
| Revisão Ativa de Questões | `true` | ❌ Não (sempre recalcula) |

## 📊 Impacto

- ✅ Usuários podem estudar livremente sem medo de "estragar" o algoritmo
- ✅ Sistema mantém espaçamento ideal quando próximo da data
- ✅ AGAIN sempre penaliza (correto)
- ✅ HARD é mais conservador (faz sentido)
- ✅ GOOD/EASY são mais generosos (recompensa)

## 🚀 Próximos Passos

1. Testar em produção
2. Monitorar métricas de retenção
3. Ajustar thresholds se necessário (atualmente 50% e 70%)
4. Considerar adicionar configuração de threshold nas preferências do usuário
