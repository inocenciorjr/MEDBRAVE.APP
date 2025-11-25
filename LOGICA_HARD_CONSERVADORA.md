# 🎯 LÓGICA CONSERVADORA PARA HARD

## ❌ PROBLEMA ANTERIOR

Quando você marcava **HARD**, o FSRS aumentava o intervalo normalmente (só que menos que GOOD/EASY).

**Exemplo:**
- Intervalo anterior: 8 dias
- Resposta: HARD
- Novo intervalo: 11 dias ❌

**Problema:** Se você ainda acha difícil, aumentar muito o intervalo pode fazer você esquecer!

---

## ✅ NOVA LÓGICA

Agora, quando você marca **HARD**, o sistema:

1. **Calcula** o novo intervalo usando FSRS
2. **Compara** com o intervalo anterior
3. **Se o novo intervalo é MAIOR:**
   - Limita o crescimento a **máximo 20%** do intervalo anterior
4. **Se o novo intervalo é MENOR:**
   - Deixa o FSRS decidir (não interfere)

---

## 📊 EXEMPLOS PRÁTICOS

### Exemplo 1: HARD após revisar no tempo

**Situação:**
- Intervalo anterior: 10 dias
- Você revisou após: 10 dias (no tempo)
- Resposta: HARD

**Cálculo FSRS:**
- Nova stability: 6 dias (60% do GOOD)
- Calculado: 6 * 1.1 = 6.6 dias

**Resultado:** 6.6 dias ✅ (menor que 10, deixa o FSRS decidir)

---

### Exemplo 2: HARD após revisar MUITO depois

**Situação:**
- Intervalo anterior: 8 dias
- Você revisou após: 15 dias (muito depois!)
- Resposta: HARD

**Cálculo FSRS:**
- Nova stability: 12 dias (FSRS vê que você lembrou depois de muito tempo)
- Calculado: 12 * 1.1 = 13.2 dias

**Resultado:** 8 * 1.2 = **9.6 dias** ✅ (limitado a 20% de crescimento)

**Sem a limitação:** 13.2 dias ❌ (muito agressivo!)

---

### Exemplo 3: HARD após Recovery Boost

**Situação:**
- Intervalo anterior: 8 dias (após Recovery Boost de 5 → 8)
- Você revisou após: 8 dias
- Resposta: HARD

**Cálculo FSRS:**
- Nova stability: 10 dias
- Calculado: 10 * 1.1 = 11 dias

**Resultado:** 8 * 1.2 = **9.6 dias** ✅ (limitado a 20% de crescimento)

**Sem a limitação:** 11 dias ❌

---

## 🎯 COMPARAÇÃO: HARD vs GOOD vs EASY

Card com intervalo anterior de 10 dias, revisado após 10 dias:

| Resposta | Cálculo FSRS | Limitação | Resultado Final |
|----------|--------------|-----------|-----------------|
| **HARD** | 6.6 dias | Não aplica (menor) | **6.6 dias** |
| **GOOD** | 14 dias | Não aplica | **14 dias** |
| **EASY** | 37 dias | Não aplica | **37 dias** |

Card com intervalo anterior de 8 dias, revisado após 15 dias:

| Resposta | Cálculo FSRS | Limitação | Resultado Final |
|----------|--------------|-----------|-----------------|
| **HARD** | 13 dias | 8 * 1.2 = 9.6 | **9.6 dias** ✅ |
| **GOOD** | 20 dias | Não aplica | **20 dias** |
| **EASY** | 50 dias | Não aplica | **50 dias** |

---

## 🚀 BENEFÍCIOS

1. **Mais conservador:** HARD não aumenta muito o intervalo
2. **Mais seguro:** Evita que você esqueça na próxima revisão
3. **Mais intuitivo:** Se você acha difícil, o intervalo não cresce muito
4. **Mantém FSRS:** Quando o FSRS já está reduzindo, não interfere

---

## 🔧 PARÂMETROS

- **Crescimento máximo para HARD:** 20% (1.2x)
- **GOOD:** Sem limitação (FSRS puro)
- **EASY:** Sem limitação (FSRS puro)

Você pode ajustar o `1.2` para `1.1` (10%) ou `1.3` (30%) se quiser mais/menos conservador!
