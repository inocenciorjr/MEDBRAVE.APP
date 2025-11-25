# ✅ MUDANÇAS NOS INTERVALOS E DIFERENCIAÇÃO

## 📊 NOVOS INTERVALOS MÁXIMOS

| Modo | Antes | Depois | Uso |
|------|-------|--------|-----|
| **CRAMMING** | - | **15 dias** | Última hora (< 15 dias até prova) |
| **INTENSIVE** | 14 dias | **30 dias** | Preparação próxima (15-30 dias) |
| **BALANCED** | 21 dias | **40 dias** | Preparação normal (30-90 dias) |
| **RELAXED** | 30 dias | **60 dias** | Preparação longa (> 90 dias) |

## 🎯 NOVA DIFERENCIAÇÃO ENTRE AVALIAÇÕES

### Multiplicadores de Intervalo

| Avaliação | Antes | Depois | Diferença |
|-----------|-------|--------|-----------|
| **AGAIN** | 1 dia | 1 dia | Mantém (penaliza) |
| **HARD** | 1.2x | **1.1x** | Reduzido (10% a mais) |
| **GOOD** | 1.0x | **1.0x** | Mantém (base) |
| **EASY** | 1.3x | **1.5x** | Aumentado (50% a mais) |

### Exemplo Prático (card com stability = 20)

**ANTES:**
- AGAIN: 1 dia
- HARD: 24 dias (20 * 1.2)
- GOOD: 20 dias
- EASY: 26 dias (20 * 1.3)
- **Diferença HARD→EASY:** 2 dias (muito pequena!)

**DEPOIS:**
- AGAIN: 1 dia
- HARD: 22 dias (20 * 1.1)
- GOOD: 20 dias
- EASY: 30 dias (20 * 1.5)
- **Diferença HARD→EASY:** 8 dias (muito melhor!)

## 🔧 PARÂMETROS W AJUSTADOS

Os parâmetros `w` foram ajustados para aumentar a diferença entre as avaliações:

- **w[8]**: Fator de crescimento base (aumentado)
- **w[15]**: Multiplicador EASY (aumentado de 1.5-1.7 para 2.0-3.0)

## 🚀 AUTO-AJUSTE MELHORADO

Agora o sistema ajusta automaticamente baseado na proximidade da prova:

```
> 90 dias → RELAXED (60 dias max)
30-90 dias → BALANCED (40 dias max)
15-30 dias → INTENSIVE (30 dias max)
< 15 dias → CRAMMING (15 dias max)
```

## ✅ RESULTADO ESPERADO

Agora você verá diferenças **MUITO MAIS CLARAS** entre:
- HARD (aumento pequeno)
- GOOD (base)
- EASY (aumento grande)

E os intervalos máximos são mais realistas para preparação de longo prazo!
