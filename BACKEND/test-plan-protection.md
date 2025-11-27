# 🧪 Teste de Proteção de Planos

## Status da Conta
- **Email**: inocencio.123@gmail.com
- **Plano**: CANCELLED (sem plano ativo)
- **Esperado**: 403 Forbidden em rotas protegidas

## Testes a Realizar

### ✅ Teste 1: Login (Deve Funcionar)
```bash
# Login ainda funciona (rota pública)
POST /api/auth/login
Body: { email, password }

Esperado: 200 OK + token
```

### ❌ Teste 2: Criar Lista Customizada (Deve Falhar)
```bash
# Requer feature: canCreateCustomLists
POST /api/question-lists
Headers: { Authorization: "Bearer <seu-token>" }
Body: { name: "Minha Lista" }

Esperado: 403 Forbidden
{
  "error": "SUBSCRIPTION_REQUIRED",
  "message": "Você precisa de um plano ativo para acessar este recurso"
}
```

### ❌ Teste 3: Criar Flashcard (Deve Falhar)
```bash
# Requer plano ativo + limite de flashcards
POST /api/flashcards
Headers: { Authorization: "Bearer <seu-token>" }
Body: { front: "Pergunta", back: "Resposta" }

Esperado: 403 Forbidden
```

### ❌ Teste 4: Criar Simulado (Deve Falhar)
```bash
# Requer plano ativo + limite de simulados/mês
POST /api/simulated-exams
Headers: { Authorization: "Bearer <seu-token>" }
Body: { title: "Simulado Teste" }

Esperado: 403 Forbidden
```

### ❌ Teste 5: Exportar Dados (Deve Falhar)
```bash
# Requer feature: canExportData
POST /api/export
Headers: { Authorization: "Bearer <seu-token>" }

Esperado: 403 Forbidden
{
  "error": "FEATURE_NOT_AVAILABLE",
  "message": "Feature canExportData não disponível no seu plano"
}
```

### ✅ Teste 6: Ver Planos Disponíveis (Deve Funcionar)
```bash
# Rota pública
GET /api/plans/public

Esperado: 200 OK + lista de planos
```

### ✅ Teste 7: Ver Perfil (Deve Funcionar)
```bash
# Rota de perfil não requer plano
GET /api/users/profile
Headers: { Authorization: "Bearer <seu-token>" }

Esperado: 200 OK + dados do perfil
```

## 🔄 Como Testar no Frontend

### Opção 1: Via Interface
1. Faça login com inocencio.123@gmail.com
2. Tente criar uma lista de questões
3. Tente criar um flashcard
4. Tente criar um simulado
5. Observe os erros 403

### Opção 2: Via DevTools
1. Abra DevTools (F12)
2. Vá para Network
3. Tente qualquer ação protegida
4. Veja a resposta 403 Forbidden

### Opção 3: Via Postman/Insomnia
1. Faça login para obter token
2. Use o token nas rotas protegidas
3. Veja os erros 403

## 📝 Logs Esperados no Backend

```
[INFO] User 2cb83d3e-42a1-46e4-bf7e-d9581a0f57e1 authenticated
[WARN] User 2cb83d3e-42a1-46e4-bf7e-d9581a0f57e1 has no active plan
[ERROR] Access denied: SUBSCRIPTION_REQUIRED
```

## 🔧 Como Restaurar o Plano

Quando quiser voltar a ter acesso:

```sql
-- Opção 1: Reativar o plano trial
UPDATE user_plans
SET 
  status = 'ACTIVE',
  cancelled_at = NULL,
  cancellation_reason = NULL,
  updated_at = NOW()
WHERE user_id = '2cb83d3e-42a1-46e4-bf7e-d9581a0f57e1';

-- Opção 2: Criar novo plano FREE
INSERT INTO user_plans (
  user_id,
  plan_id,
  status,
  start_date,
  end_date
) VALUES (
  '2cb83d3e-42a1-46e4-bf7e-d9581a0f57e1',
  'free-plan-default',
  'ACTIVE',
  NOW(),
  NOW() + INTERVAL '365 days'
);
```

## ⚠️ Importante

- **Cache**: Aguarde 30 segundos após cancelar para garantir que o cache expirou
- **Token**: Use um token válido (faça login novamente se necessário)
- **Logs**: Verifique os logs do backend para ver as mensagens de erro
- **Frontend**: Se tiver o frontend rodando, verá os erros na interface

## 🎯 Resultado Esperado

✅ **Segurança funcionando**: Todas as rotas protegidas devem retornar 403
✅ **Mensagens claras**: Erros devem explicar o motivo
✅ **Rotas públicas**: Login e visualização de planos devem funcionar
✅ **Logs**: Backend deve registrar tentativas de acesso negado
