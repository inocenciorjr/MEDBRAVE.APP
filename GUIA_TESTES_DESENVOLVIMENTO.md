# 🧪 Guia de Testes - Sistema de Revisões

## 🎯 OBJETIVO

Este guia mostra como testar o sistema de revisões sem precisar esperar dias ou fazer centenas de revisões manualmente.

---

## ⚠️ IMPORTANTE

**Estes endpoints funcionam APENAS em desenvolvimento!**
- Verificam `NODE_ENV !== 'production'`
- Retornam 403 Forbidden em produção
- Manipulam datas no banco para simular cenários

---

## 🚀 ENDPOINTS DE TESTE

### 1. **Criar Cards de Teste**
```http
POST /api/unified-reviews/dev/create-test-cards
Authorization: Bearer {seu_token}
Content-Type: application/json

{
  "count": 50
}
```

**O que faz:**
- Cria 50 cards FSRS de teste
- Distribui entre QUESTION, FLASHCARD, ERROR_NOTEBOOK
- IDs começam com `test_` para fácil identificação
- Todos com data de hoje

**Resposta:**
```json
{
  "success": true,
  "message": "50 cards de teste criados",
  "data": {
    "created_count": 50
  }
}
```

---

### 2. **Simular Revisões Atrasadas**
```http
POST /api/unified-reviews/dev/simulate-overdue
Authorization: Bearer {seu_token}
Content-Type: application/json

{
  "days_overdue": 45,
  "count": 50
}
```

**O que faz:**
- Pega 50 cards do usuário
- Altera `due` para datas passadas (1 a 45 dias atrás)
- Distribui aleatoriamente o atraso

**Resposta:**
```json
{
  "success": true,
  "message": "50 revisões simuladas como atrasadas",
  "data": {
    "modified": 50,
    "max_days_overdue": 45,
    "cards": [
      {
        "id": "card123",
        "content_type": "QUESTION",
        "days_overdue": 32
      }
      // ... mais 9
    ]
  }
}
```

---

### 3. **Resetar Datas**
```http
POST /api/unified-reviews/dev/reset-dates
Authorization: Bearer {seu_token}
```

**O que faz:**
- Reseta `due` de todos os cards para hoje
- Desfaz a simulação de atraso

**Resposta:**
```json
{
  "success": true,
  "message": "50 revisões resetadas para hoje",
  "data": {
    "reset_count": 50
  }
}
```

---

### 4. **Deletar Cards de Teste**
```http
DELETE /api/unified-reviews/dev/delete-test-cards
Authorization: Bearer {seu_token}
```

**O que faz:**
- Deleta todos os cards com `content_id` começando com `test_`
- Limpa cards de teste

**Resposta:**
```json
{
  "success": true,
  "message": "50 cards de teste deletados",
  "data": {
    "deleted_count": 50
  }
}
```

---

## 📋 CENÁRIOS DE TESTE

### Cenário A: Testar BacklogStatusCard (Modo Smart)

**Objetivo:** Ver o card de status de backlog com diferentes níveis

**Passos:**
```bash
# 1. Criar cards de teste
curl -X POST http://localhost:5000/api/unified-reviews/dev/create-test-cards \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 50}'

# 2. Simular atraso de 45 dias
curl -X POST http://localhost:5000/api/unified-reviews/dev/simulate-overdue \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_overdue": 45, "count": 50}'

# 3. Configurar modo smart no wizard
# - Abrir /revisoes
# - Clicar "Configurar"
# - Escolher "Smart Scheduling"
# - Limite: 50 revisões/dia
# - Salvar

# 4. Acessar /revisoes
# - Ver BacklogStatusCard
# - Status: NORMAL (50/50)

# 5. Criar mais cards para aumentar backlog
curl -X POST http://localhost:5000/api/unified-reviews/dev/create-test-cards \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 100}'

# 6. Simular atraso nos novos cards
curl -X POST http://localhost:5000/api/unified-reviews/dev/simulate-overdue \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_overdue": 30, "count": 100}'

# 7. Recarregar /revisoes
# - Ver BacklogStatusCard
# - Status: SEVERE (150/50 = ratio 3.0)
# - Sugestões aparecem
```

**Resultado Esperado:**
```
🚨 Backlog Severo
Você tem 150 revisões acumuladas (3.0x o limite).

💡 Sugestões:
• Ativar modo recuperação urgente
• Considerar mudar para modo tradicional
• Aumentar limite diário para 75 revisões/dia

[Ver Opções de Recuperação]
```

---

### Cenário B: Testar OverdueReviewsModal (Reativação)

**Objetivo:** Ver o modal ao reativar sistema com revisões atrasadas

**Passos:**
```bash
# 1. Criar cards de teste
curl -X POST http://localhost:5000/api/unified-reviews/dev/create-test-cards \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 50}'

# 2. Simular atraso de 60 dias
curl -X POST http://localhost:5000/api/unified-reviews/dev/simulate-overdue \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_overdue": 60, "count": 50}'

# 3. Desativar sistema
# - Abrir /revisoes
# - Clicar "Configurar"
# - Desmarcar "Ativar Sistema de Revisões"
# - Clicar "Salvar"
# - Confirmar no modal

# 4. Reativar sistema
# - Clicar "Configurar" novamente
# - Marcar "Ativar Sistema de Revisões"
# - Configurar tipos, modo, etc.
# - Clicar "Salvar e Começar"

# 5. Ver modal de revisões atrasadas
# - Modal aparece automaticamente
# - Mostra 50 revisões atrasadas
# - 4 opções disponíveis
```

**Resultado Esperado:**
```
⚠️ Você tem 50 revisões atrasadas

Total Atrasadas: 50
Muito Atrasadas: 35 (> 30 dias)

Por Tipo:
📝 Questões: 17
🗂️ Flashcards: 17
📔 Caderno de Erros: 16

O que você deseja fazer?
○ Fazer Todas Agora (~38 minutos)
● Reagendar (Recomendado)
  Distribuir ao longo de: [7] dias
  📊 ~7 revisões/dia (~5 min/dia)
○ Resetar Progresso
○ Deletar Todas
```

---

### Cenário C: Testar Modo Recuperação

**Objetivo:** Ativar modo recuperação e ver redistribuição

**Passos:**
```bash
# 1. Criar muitos cards
curl -X POST http://localhost:5000/api/unified-reviews/dev/create-test-cards \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 150}'

# 2. Simular atraso de 30 dias
curl -X POST http://localhost:5000/api/unified-reviews/dev/simulate-overdue \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_overdue": 30, "count": 150}'

# 3. Configurar modo smart (limite 50/dia)
# - Abrir /revisoes
# - Configurar modo smart
# - Limite: 50 revisões/dia

# 4. Ver BacklogStatusCard
# - Status: CRITICAL (150/50 = ratio 3.0)
# - Clicar "Ver Opções de Recuperação"

# 5. Ativar modo recuperação
# - Escolher "Modo Recuperação (3 dias)"
# - Clicar "Ativar Modo Recuperação"

# 6. Verificar redistribuição
# - Sistema redistribui 150 cards em 3 dias
# - ~50 cards por dia
# - Priorizados por score
```

**Resultado Esperado:**
- Cards redistribuídos ao longo de 3 dias
- Mais prioritários (mais atrasados, mais lapses) primeiro
- BacklogStatusCard atualiza para NORMAL

---

### Cenário D: Testar Reagendamento

**Objetivo:** Reagendar revisões atrasadas ao longo de dias

**Passos:**
```bash
# 1. Criar cards
curl -X POST http://localhost:5000/api/unified-reviews/dev/create-test-cards \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 70}'

# 2. Simular atraso
curl -X POST http://localhost:5000/api/unified-reviews/dev/simulate-overdue \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_overdue": 50, "count": 70}'

# 3. Desativar e reativar sistema
# - Ver modal de revisões atrasadas

# 4. Escolher "Reagendar"
# - Distribuir ao longo de: 7 dias
# - Clicar "Confirmar"

# 5. Verificar redistribuição
# - 70 cards distribuídos em 7 dias
# - ~10 cards por dia
```

---

## 🧹 LIMPEZA APÓS TESTES

Sempre limpar após testar:

```bash
# 1. Resetar datas (opcional)
curl -X POST http://localhost:5000/api/unified-reviews/dev/reset-dates \
  -H "Authorization: Bearer SEU_TOKEN"

# 2. Deletar cards de teste
curl -X DELETE http://localhost:5000/api/unified-reviews/dev/delete-test-cards \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 📊 TABELA DE CENÁRIOS

| Cenário | Cards | Dias Atraso | Modo | Resultado Esperado |
|---------|-------|-------------|------|-------------------|
| Normal | 50 | 0 | Smart (50/dia) | Status: NORMAL |
| Warning | 70 | 10 | Smart (50/dia) | Status: WARNING (ratio 1.4) |
| Critical | 120 | 20 | Smart (50/dia) | Status: CRITICAL (ratio 2.4) |
| Severe | 180 | 30 | Smart (50/dia) | Status: SEVERE (ratio 3.6) |
| Reativação | 50 | 45 | Qualquer | Modal aparece |
| Recuperação | 150 | 30 | Smart (50/dia) | Redistribui em 3 dias |

---

## 💡 DICAS

### 1. **Testar Diferentes Ratios**
```bash
# Ratio 1.5 (WARNING)
# 75 cards / 50 limite = 1.5
curl -X POST .../create-test-cards -d '{"count": 75}'
curl -X POST .../simulate-overdue -d '{"days_overdue": 15, "count": 75}'

# Ratio 2.5 (CRITICAL)
# 125 cards / 50 limite = 2.5
curl -X POST .../create-test-cards -d '{"count": 125}'
curl -X POST .../simulate-overdue -d '{"days_overdue": 25, "count": 125}'

# Ratio 4.0 (SEVERE)
# 200 cards / 50 limite = 4.0
curl -X POST .../create-test-cards -d '{"count": 200}'
curl -X POST .../simulate-overdue -d '{"days_overdue": 40, "count": 200}'
```

### 2. **Testar Tipos Específicos**
Os cards são criados alternando entre tipos:
- Card 0, 3, 6, 9... → QUESTION
- Card 1, 4, 7, 10... → FLASHCARD
- Card 2, 5, 8, 11... → ERROR_NOTEBOOK

### 3. **Verificar no Banco**
```sql
-- Ver cards atrasados
SELECT content_type, COUNT(*) as count, 
       AVG(EXTRACT(DAY FROM (NOW() - due))) as avg_days_overdue
FROM fsrs_cards
WHERE user_id = 'seu_user_id'
  AND due < NOW()
GROUP BY content_type;

-- Ver distribuição de datas
SELECT DATE(due) as due_date, COUNT(*) as count
FROM fsrs_cards
WHERE user_id = 'seu_user_id'
GROUP BY DATE(due)
ORDER BY due_date;
```

---

## 🎉 CONCLUSÃO

Com esses endpoints, você pode:
- ✅ Criar cards de teste rapidamente
- ✅ Simular qualquer cenário de atraso
- ✅ Testar todos os fluxos do sistema
- ✅ Limpar tudo facilmente

**Não precisa esperar dias ou fazer centenas de revisões manualmente!** 🚀
