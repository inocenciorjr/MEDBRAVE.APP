# 🧪 INSTRUÇÕES PARA TESTAR O NOVO FSRS

## ✅ CARDS DE TESTE CRIADOS

Criei 3 cards de teste no seu banco de dados:

### 1. **teste_card_novo** (Card Novo)
- **Estado:** NEW (nunca revisado)
- **Expectativa:**
  - ❌ Não lembrei: **1 dia**
  - ⚠️ Lembrei, mas achei difícil: **2 dias**
  - ✅ Quase consolidado: **3 dias**
  - 🚀 Acertei com confiança: **5 dias**

### 2. **teste_card_3easy** (Progressão Saudável)
- **Estado:** REVIEW (3 revisões, 0 erros)
- **Intervalo atual:** 14 dias
- **Expectativa:**
  - ❌ Não lembrei: **1 dia** (reseta)
  - ⚠️ Lembrei, mas achei difícil: **7 dias** (50% de 14)
  - ✅ Quase consolidado: **~18 dias** (crescimento FSRS)
  - 🚀 Acertei com confiança: **~24 dias** (crescimento FSRS)

### 3. **teste_card_2again** (Recuperação)
- **Estado:** RELEARNING (2 revisões, 2 erros)
- **Intervalo atual:** 1 dia
- **Stability:** 0.4 (muito baixa!)
- **Difficulty:** 6.6 (alta)
- **Expectativa:**
  - ❌ Não lembrei: **1 dia** (mantém)
  - ⚠️ Lembrei, mas achei difícil: **2 dias** (mínimo, 50% de 1 = 0.5 → 2)
  - ✅ Quase consolidado: **2-3 dias** (recovery boost com 2 lapses)
  - 🚀 Acertei com confiança: **3-5 dias** (recovery boost com 2 lapses)

---

## 🎯 COMO TESTAR

### Opção 1: Testar no Frontend

1. Acesse a página de revisões de flashcards
2. Procure pelos cards de teste:
   - `teste_card_novo`
   - `teste_card_3easy`
   - `teste_card_2again`
3. **Passe o mouse** sobre os botões de avaliação
4. Verifique se os intervalos mostrados batem com as expectativas acima

### Opção 2: Testar via API (Preview)

```bash
# Card Novo
curl http://localhost:3000/api/unified-reviews/preview/FLASHCARD/teste_card_novo

# Card 3x EASY
curl http://localhost:3000/api/unified-reviews/preview/FLASHCARD/teste_card_3easy

# Card 2x AGAIN
curl http://localhost:3000/api/unified-reviews/preview/FLASHCARD/teste_card_2again
```

### Opção 3: Testar via SQL (Preview Manual)

```sql
-- Ver o preview calculado pelo backend
SELECT 
  content_id,
  state,
  scheduled_days as intervalo_atual,
  stability,
  difficulty,
  lapses
FROM fsrs_cards
WHERE content_id LIKE 'teste_%'
  AND user_id = '2cb83d3e-42a1-46e4-bf7e-d9581a0f57e1';
```

---

## ✅ O QUE VERIFICAR

### 1. **Card Novo deve ter intervalos DIFERENTES**
- ❌ 1 dia
- ⚠️ 2 dias (DIFERENTE de AGAIN!)
- ✅ 3 dias
- 🚀 5 dias

**Se todos forem iguais ou HARD = AGAIN, algo está errado!**

### 2. **Card 3x EASY deve mostrar progressão**
- HARD deve ser **50% do atual** (7 dias)
- GOOD deve ser **maior que o atual** (~18 dias)
- EASY deve ser **ainda maior** (~24 dias)

**Se HARD = GOOD = EASY, o limite está sendo aplicado incorretamente!**

### 3. **Card 2x AGAIN deve ter Recovery Boost**
- GOOD deve ser **2-3 dias** (não 1 dia!)
- EASY deve ser **3-5 dias** (não 1 dia!)

**Se GOOD = EASY = 1 dia, o Recovery Boost não está funcionando!**

---

## 🐛 PROBLEMAS COMUNS

### Problema 1: Todos os intervalos iguais
**Causa:** Limite máximo sendo aplicado no preview
**Solução:** Verificar se `isPreview` está sendo passado corretamente

### Problema 2: HARD = AGAIN (ambos 1 dia)
**Causa:** Lógica de 50% não está sendo aplicada
**Solução:** Verificar `scheduleHard` no código

### Problema 3: Recovery Boost não funciona
**Causa:** Condição `card.stability < 1.0` não está sendo atendida
**Solução:** Verificar valores de stability no banco

---

## 🧹 LIMPAR DADOS DE TESTE

Quando terminar os testes:

```sql
-- Deletar cards de teste
DELETE FROM fsrs_cards 
WHERE content_id LIKE 'teste_%' 
  AND user_id = '2cb83d3e-42a1-46e4-bf7e-d9581a0f57e1';
```

---

## 📊 RESULTADO ESPERADO

Se tudo estiver funcionando:

✅ Card novo mostra 4 intervalos diferentes (1, 2, 3, 5)
✅ Card 3x EASY mostra progressão clara (7, 18, 24)
✅ Card 2x AGAIN mostra recovery (2-3, 3-5)
✅ HARD sempre diferente de AGAIN
✅ Diferença visível entre todas as opções

**Boa sorte nos testes!** 🚀
