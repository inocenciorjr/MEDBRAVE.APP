# 🔍 ANÁLISE COMPLETA DO PROBLEMA DE PREVIEW

## ❌ PROBLEMAS IDENTIFICADOS

### 1. **HARD, GOOD e EASY mostram valores iguais (22 dias)**

**CAUSA RAIZ:** O card tem `stability = 21` e está 21 dias no futuro. Quando você tenta revisar AGORA:

```typescript
// scheduleHard (linha ~280)
new_card.stability = calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.HARD, parameters);
// Resultado: stability ≈ 21 (porque elapsed_days = 0, r ≈ 1, factor ≈ 0)
new_card.scheduled_days = Math.max(1, Math.min(21, Math.round(21 * 1.2)));
// Resultado: Math.min(21, 25.2) = 21 dias

// scheduleGood (linha ~310)
new_card.stability = calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.GOOD, parameters);
// Resultado: stability ≈ 44 (dobro do HARD)
new_card.scheduled_days = Math.max(1, Math.min(21, Math.round(44)));
// Resultado: Math.min(21, 44) = 21 dias ← LIMITADO!

// scheduleEasy (linha ~340)
new_card.stability = calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.EASY, parameters);
// Resultado: stability ≈ 66 (triplo do HARD)
new_card.scheduled_days = Math.max(1, Math.min(21, Math.round(66 * 1.3)));
// Resultado: Math.min(21, 86) = 21 dias ← LIMITADO!
```

**O PROBLEMA:** O `maximum_interval = 21` está **LIMITANDO TODOS OS VALORES!**

---

### 2. **Por que está mostrando 22-24 dias se o máximo é 21?**

**CAUSA:** O `applySmartScheduling` está **ADICIONANDO DIAS** para ajustar para o próximo dia de estudo disponível!

```typescript
// processReview (linha ~410)
schedulingInfo.card.due = await this.applySmartScheduling(
  userId,
  schedulingInfo.card.due,  // 21 dias no futuro
  card.content_type
);
// Resultado: 22-24 dias (ajustado para próximo dia de estudo)
```

**PROBLEMA:** Isso está **MASCARANDO** o limite de 21 dias e confundindo o usuário!

---

### 3. **Por que HARD não está reduzindo o intervalo?**

**CAUSA:** A fórmula de `calculateStabilityAfterSuccess` depende de `elapsed_days`:

```typescript
const r = Math.exp(-elapsed_days / s);
// Se elapsed_days = 0 (revisando antes do tempo):
// r = Math.exp(0) = 1

factor = 0.6 * w[8] * Math.pow(card.difficulty, -w[9]) * Math.pow(s, w[10]) * (Math.exp(w[11] * (1 - r)) - 1);
// Se r = 1:
// factor = 0.6 * w[8] * ... * (Math.exp(0) - 1) = 0.6 * w[8] * ... * 0 = 0

// Resultado: new_stability = s * 0 = 0 (mínimo 0.1)
```

**PROBLEMA:** Quando você revisa ANTES do tempo, a stability cai para quase ZERO, e o FSRS não sabe como lidar com isso!

---

## 🎯 SOLUÇÕES NECESSÁRIAS

### Solução 1: **Remover o limite de `maximum_interval` do preview**

O preview deve mostrar o que **REALMENTE** aconteceria, não o valor limitado!

```typescript
// scheduleGood
if (isPreview) {
  new_card.scheduled_days = Math.round(new_card.stability);
} else {
  new_card.scheduled_days = Math.max(1, Math.min(parameters.maximum_interval, Math.round(new_card.stability)));
}
```

### Solução 2: **Desabilitar `applySmartScheduling` no preview**

O preview deve mostrar o intervalo PURO do FSRS, sem ajustes de dias de estudo!

```typescript
// processReview
if (!isPreview) {
  schedulingInfo.card.due = await this.applySmartScheduling(...);
}
```

### Solução 3: **Corrigir a fórmula de stability para revisões antecipadas**

Quando `elapsed_days < scheduled_days`, usar uma fórmula diferente:

```typescript
if (elapsed_days < card.scheduled_days) {
  // Revisão antecipada - penalizar proporcionalmente
  const progress = elapsed_days / card.scheduled_days;
  new_card.stability = card.stability * progress * factor;
} else {
  // Revisão normal
  new_card.stability = card.stability * factor;
}
```

---

## 📊 RESULTADO ESPERADO APÓS CORREÇÕES

Para o card com `stability = 21`, revisando AGORA (21 dias antes):

- **AGAIN:** ~1 dia (penaliza muito)
- **HARD:** ~12 dias (21 * 0.6 = 12.6)
- **GOOD:** ~21 dias (mantém)
- **EASY:** ~27 dias (21 * 1.3 = 27.3)

**SEM** ajustes de smart scheduling no preview!
