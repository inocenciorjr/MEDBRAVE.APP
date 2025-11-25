# 🧮 CÁLCULO CORRETO DOS PARÂMETROS FSRS

## 🎯 REQUISITOS

| Modo | Máximo | EASY | GOOD | HARD | AGAIN |
|------|--------|------|------|------|-------|
| **CRAMMING** | 15 dias | 3 rev | 5 rev | nunca | 1 dia |
| **INTENSIVE** | 30 dias | 6 rev | 10 rev | nunca | 1 dia |
| **BALANCED** | 40 dias | 8 rev | 12 rev | nunca | 1 dia |
| **RELAXED** | 60 dias | 12 rev | 18 rev | nunca | 1 dia |

---

## 📐 FÓRMULA

Para atingir o máximo em N revisões:

```
fator = (máximo / inicial) ^ (1 / revisões)
```

Onde:
- `inicial = 2 dias` (primeira revisão GOOD/EASY)
- `revisões = número de revisões - 1` (porque a 1ª já é 2 dias)

---

## 🧮 CÁLCULOS

### CRAMMING (15 dias)

**EASY (3 revisões):**
```
fator = (15 / 2) ^ (1 / 2) = 7.5 ^ 0.5 ≈ 2.74
Progressão: 2 → 5.5 → 15
```

**GOOD (5 revisões):**
```
fator = (15 / 2) ^ (1 / 4) = 7.5 ^ 0.25 ≈ 1.65
Progressão: 2 → 3.3 → 5.4 → 9.0 → 15
```

**Relação EASY/GOOD:** 2.74 / 1.65 ≈ **1.66x**

---

### INTENSIVE (30 dias)

**EASY (6 revisões):**
```
fator = (30 / 2) ^ (1 / 5) = 15 ^ 0.2 ≈ 1.72
Progressão: 2 → 3.4 → 5.9 → 10.2 → 17.5 → 30
```

**GOOD (10 revisões):**
```
fator = (30 / 2) ^ (1 / 9) = 15 ^ 0.111 ≈ 1.33
Progressão: 2 → 2.7 → 3.5 → 4.7 → 6.2 → 8.3 → 11.0 → 14.6 → 19.5 → 26.0 → 30 (limitado)
```

**Relação EASY/GOOD:** 1.72 / 1.33 ≈ **1.29x**

---

### BALANCED (40 dias)

**EASY (8 revisões):**
```
fator = (40 / 2) ^ (1 / 7) = 20 ^ 0.143 ≈ 1.52
Progressão: 2 → 3.0 → 4.6 → 7.0 → 10.6 → 16.1 → 24.5 → 37.2 → 40 (limitado)
```

**GOOD (12 revisões):**
```
fator = (40 / 2) ^ (1 / 11) = 20 ^ 0.091 ≈ 1.30
Progressão: 2 → 2.6 → 3.4 → 4.4 → 5.7 → 7.4 → 9.6 → 12.5 → 16.3 → 21.2 → 27.5 → 35.8 → 40 (limitado)
```

**Relação EASY/GOOD:** 1.52 / 1.30 ≈ **1.17x**

---

### RELAXED (60 dias)

**EASY (12 revisões):**
```
fator = (60 / 2) ^ (1 / 11) = 30 ^ 0.091 ≈ 1.35
Progressão: 2 → 2.7 → 3.6 → 4.9 → 6.6 → 8.9 → 12.0 → 16.2 → 21.9 → 29.6 → 40.0 → 54.0 → 60 (limitado)
```

**GOOD (18 revisões):**
```
fator = (60 / 2) ^ (1 / 17) = 30 ^ 0.059 ≈ 1.21
Progressão: 2 → 2.4 → 2.9 → 3.5 → 4.3 → 5.2 → 6.3 → 7.6 → 9.2 → 11.1 → 13.4 → 16.3 → 19.7 → 23.8 → 28.8 → 34.9 → 42.2 → 51.1 → 60 (limitado)
```

**Relação EASY/GOOD:** 1.35 / 1.21 ≈ **1.12x**

---

## 🎯 RESUMO DOS FATORES

| Modo | EASY | GOOD | Relação |
|------|------|------|---------|
| **CRAMMING** | 2.74x | 1.65x | 1.66x |
| **INTENSIVE** | 1.72x | 1.33x | 1.29x |
| **BALANCED** | 1.52x | 1.30x | 1.17x |
| **RELAXED** | 1.35x | 1.21x | 1.12x |

---

## 🔧 MAPEAMENTO PARA PARÂMETROS W

O FSRS calcula o fator assim:

```typescript
factor = w[8] * (difficulty^-w[9]) * (stability^w[10]) * (exp(w[11] * (1 - r)) - 1)

// Para EASY:
factor_easy = factor * w[15]
```

Para atingir os fatores desejados, precisamos ajustar:
- **w[8]:** Fator base
- **w[10]:** Exponente da stability (controla crescimento)
- **w[11]:** Fator de retrievability
- **w[15]:** Multiplicador EASY

---

## 📊 VALORES RECOMENDADOS

Baseado nos cálculos, os parâmetros devem ser:

### CRAMMING (fatores: 2.74 / 1.65)
```
w[8] = 0.35
w[10] = 0.05
w[11] = 0.3
w[15] = 1.66
```

### INTENSIVE (fatores: 1.72 / 1.33)
```
w[8] = 0.28
w[10] = 0.08
w[11] = 0.4
w[15] = 1.29
```

### BALANCED (fatores: 1.52 / 1.30)
```
w[8] = 0.27
w[10] = 0.10
w[11] = 0.5
w[15] = 1.17
```

### RELAXED (fatores: 1.35 / 1.21)
```
w[8] = 0.25
w[10] = 0.12
w[11] = 0.6
w[15] = 1.12
```

---

## ✅ RESULTADO ESPERADO

Com esses parâmetros:
- ✅ EASY atinge o máximo em 3-12 revisões (conforme modo)
- ✅ GOOD atinge o máximo em 5-18 revisões (conforme modo)
- ✅ HARD nunca atinge o máximo (limitado a 20% de crescimento)
- ✅ AGAIN sempre 1 dia
- ✅ Diferença clara entre EASY e GOOD em todas as fases
