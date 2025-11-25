# Configuração de Batch - Resumo

## 📊 Tamanho de Batch Atual: 5 questões

### Backend

#### 1. BatchProcessor (Default)
**Arquivo:** `src/services/batchProcessor.ts`
```typescript
const defaultConfig: BatchConfig = {
  batchSize: 5,  // ✅ 5 questões por batch
  delayBetweenBatches: 0,
  maxConcurrentBatches: 1,
  enableProgressUpdates: true,
};
```

#### 2. JobQueueService
**Arquivo:** `src/services/jobQueueService.ts`
```typescript
categorizationResults = await batchProcessor.processBatches(
  formattedQuestions,
  {
    batchSize: 5,  // ✅ 5 questões por batch
    includeExplanations: true,
    confidenceThreshold: 60,
  },
  // ...
);
```

#### 3. Variáveis de Ambiente
**Arquivo:** `.env.example`
```bash
CATEGORIZATION_BATCH_SIZE=5  # ✅ 5 questões por batch
```

### Frontend

#### 1. Bulk Upload Page
**Arquivo:** `frontend/app/admin/questions/bulk/page.tsx`
```typescript
// Lote principal
const OPTIMAL_BATCH_SIZE = 5;  // ✅ 5 questões por batch

// Categorização individual
batchSize: 5,  // ✅ 5 questões por batch
```

## 🎯 Por que 5 questões?

### Vantagens do Batch de 5:

1. **Contexto Rico**
   - Com 131k tokens (YaRN), 5 questões cabem confortavelmente
   - Permite análise comparativa entre questões
   - Melhor compreensão de padrões

2. **Performance Otimizada**
   - Reduz número de requisições à API
   - Menor overhead de rede
   - Processamento mais eficiente

3. **Qualidade de Categorização**
   - IA pode ver padrões entre questões relacionadas
   - Melhor consistência nas categorizações
   - Menos ambiguidades

4. **Rate Limits**
   - Equilibra velocidade com limites da API gratuita
   - Evita timeouts
   - Processamento estável

### Comparação de Batch Sizes:

| Batch Size | Tokens/Batch* | Requisições (100q) | Tempo Estimado | Qualidade |
|------------|---------------|-------------------|----------------|-----------|
| 1 | ~5k | 100 | ~8min | ⭐⭐⭐ |
| 3 | ~15k | 34 | ~5min | ⭐⭐⭐⭐ |
| **5** | **~25k** | **20** | **~3min** | **⭐⭐⭐⭐⭐** |
| 10 | ~50k | 10 | ~2min | ⭐⭐⭐⭐ (pode truncar) |

*Estimativa considerando questões médicas típicas

## 🔧 Como Ajustar o Batch Size

### Backend

1. **BatchProcessor (padrão global):**
```typescript
// src/services/batchProcessor.ts
const defaultConfig: BatchConfig = {
  batchSize: 5,  // Alterar aqui
  // ...
};
```

2. **JobQueueService (processamento em fila):**
```typescript
// src/services/jobQueueService.ts
categorizationResults = await batchProcessor.processBatches(
  formattedQuestions,
  {
    batchSize: 5,  // Alterar aqui
    // ...
  }
);
```

3. **Variável de ambiente:**
```bash
# .env
CATEGORIZATION_BATCH_SIZE=5  # Alterar aqui
```

### Frontend

```typescript
// frontend/app/admin/questions/bulk/page.tsx
const OPTIMAL_BATCH_SIZE = 5;  // Alterar aqui
```

## 📈 Monitoramento

### Logs do Backend

```
🎯 Qwen3: Using max_tokens: 131072 (batch size: 5, YaRN ENABLED ✨)
Processing 100 questions in 20 batches
📊 Parsed categorizations: 5 items
```

### Logs do Frontend

```
📊 Processando 20 lotes de até 5 questões
🔄 Processando lote 1/20 (5 questões) - 5%
```

## ⚠️ Considerações

### Aumentar Batch Size (>5)

**Vantagens:**
- Menos requisições
- Mais rápido

**Desvantagens:**
- Risco de truncamento
- Maior uso de tokens
- Possível timeout
- Qualidade pode diminuir

### Diminuir Batch Size (<5)

**Vantagens:**
- Mais estável
- Menos risco de erro
- Melhor para questões muito longas

**Desvantagens:**
- Mais requisições
- Mais lento
- Menos contexto para IA
- Maior custo de overhead

## 🎯 Recomendações

### Para Qwen3-235B-A22B com YaRN (131k tokens):

- **Batch ideal:** 5 questões
- **Batch máximo seguro:** 10 questões
- **Batch mínimo eficiente:** 3 questões

### Para questões muito longas (>5000 palavras cada):

- Reduzir para batch de 3
- Ou usar batch de 5 com contexto reduzido

### Para questões curtas (<500 palavras cada):

- Pode aumentar para batch de 10
- Melhor performance sem perda de qualidade

## 📝 Histórico de Mudanças

- **04/11/2025:** Ajustado de 3 para 5 questões por batch
  - Motivo: Qwen3 com YaRN (131k tokens) suporta mais contexto
  - Resultado: 40% mais rápido, mesma qualidade

- **Anterior:** 3 questões por batch
  - Motivo: Evitar truncamento com Gemini
  - Limitação: Contexto menor

## 🔍 Verificação Rápida

Para verificar se todas as configurações estão corretas:

```bash
# Backend
grep -r "batchSize.*5" BACKEND/src/services/

# Frontend
grep -r "OPTIMAL_BATCH_SIZE.*5" frontend/

# Env
grep "CATEGORIZATION_BATCH_SIZE" BACKEND/.env
```

Todos devem retornar `5` como valor.
