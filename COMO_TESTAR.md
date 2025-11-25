# 🧪 Como Testar o Sistema de Revisões

## 🎯 Resposta Rápida

**SIM! Você pode testar sem esperar dias.**

Criei 4 endpoints de desenvolvimento que manipulam datas no banco para simular cenários.

---

## 🚀 INÍCIO RÁPIDO (3 minutos)

### 1. **Criar Cards de Teste**
```bash
curl -X POST http://localhost:5000/api/unified-reviews/dev/create-test-cards \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 50}'
```

### 2. **Simular Atraso de 45 Dias**
```bash
curl -X POST http://localhost:5000/api/unified-reviews/dev/simulate-overdue \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_overdue": 45, "count": 50}'
```

### 3. **Testar no Frontend**
1. Abra `/revisoes`
2. Configure modo Smart (limite 50/dia)
3. Veja BacklogStatusCard
4. Desative e reative sistema
5. Veja OverdueReviewsModal

### 4. **Limpar Tudo**
```bash
# Deletar cards de teste
curl -X DELETE http://localhost:5000/api/unified-reviews/dev/delete-test-cards \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 📋 ENDPOINTS DISPONÍVEIS

### ✅ Criar Cards
`POST /api/unified-reviews/dev/create-test-cards`
- Cria N cards de teste
- IDs começam com `test_`

### ⏰ Simular Atraso
`POST /api/unified-reviews/dev/simulate-overdue`
- Altera datas para passado
- Simula revisões atrasadas

### 🔄 Resetar Datas
`POST /api/unified-reviews/dev/reset-dates`
- Volta datas para hoje
- Desfaz simulação

### 🗑️ Deletar Cards
`DELETE /api/unified-reviews/dev/delete-test-cards`
- Remove cards de teste
- Limpa banco

---

## 🎬 CENÁRIOS PRONTOS

### A. Testar BacklogStatusCard (Modo Smart)
```bash
# 1. Criar 150 cards
curl -X POST .../create-test-cards -d '{"count": 150}'

# 2. Simular 30 dias de atraso
curl -X POST .../simulate-overdue -d '{"days_overdue": 30, "count": 150}'

# 3. Configurar modo smart (50/dia) no wizard
# 4. Ver status SEVERE no dashboard
```

### B. Testar Modal de Reativação
```bash
# 1. Criar 50 cards
curl -X POST .../create-test-cards -d '{"count": 50}'

# 2. Simular 60 dias de atraso
curl -X POST .../simulate-overdue -d '{"days_overdue": 60, "count": 50}'

# 3. Desativar sistema no wizard
# 4. Reativar sistema
# 5. Ver modal com 4 opções
```

### C. Testar Modo Recuperação
```bash
# 1. Criar 150 cards
curl -X POST .../create-test-cards -d '{"count": 150}'

# 2. Simular 30 dias de atraso
curl -X POST .../simulate-overdue -d '{"days_overdue": 30, "count": 150}'

# 3. Ver BacklogStatusCard (CRITICAL)
# 4. Clicar "Ativar Modo Recuperação"
# 5. Ver redistribuição em 3 dias
```

---

## 📊 NÍVEIS DE BACKLOG

| Cards | Limite | Ratio | Status | Como Testar |
|-------|--------|-------|--------|-------------|
| 50 | 50 | 1.0 | NORMAL | `count: 50` |
| 75 | 50 | 1.5 | WARNING | `count: 75` |
| 125 | 50 | 2.5 | CRITICAL | `count: 125` |
| 200 | 50 | 4.0 | SEVERE | `count: 200` |

---

## 🛠️ FERRAMENTAS

### Opção 1: cURL (Terminal)
```bash
curl -X POST http://localhost:5000/api/unified-reviews/dev/create-test-cards \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 50}'
```

### Opção 2: Postman/Insomnia
Importe o arquivo `TESTES_RAPIDOS.http`

### Opção 3: VS Code REST Client
Abra `TESTES_RAPIDOS.http` e clique em "Send Request"

---

## ⚠️ IMPORTANTE

### Segurança
- ✅ Funciona APENAS em desenvolvimento
- ✅ Verifica `NODE_ENV !== 'production'`
- ✅ Retorna 403 em produção

### Limpeza
- ✅ Cards de teste têm IDs com `test_`
- ✅ Fácil de identificar e deletar
- ✅ Não afeta cards reais

### Reversível
- ✅ Pode resetar datas a qualquer momento
- ✅ Pode deletar cards de teste
- ✅ Não perde dados reais

---

## 📚 DOCUMENTAÇÃO COMPLETA

- `GUIA_TESTES_DESENVOLVIMENTO.md` - Guia detalhado
- `TESTES_RAPIDOS.http` - Requisições prontas
- `DevTestingController.ts` - Código fonte

---

## 🎉 PRONTO!

Agora você pode testar todo o sistema em minutos, sem esperar dias ou fazer centenas de revisões manualmente! 🚀

**Fluxo típico:**
1. Criar cards (30 segundos)
2. Simular atraso (30 segundos)
3. Testar no frontend (2 minutos)
4. Limpar tudo (30 segundos)

**Total: ~3 minutos por cenário!**
