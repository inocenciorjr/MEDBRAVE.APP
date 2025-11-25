# Administração do Jogo Termo

## Endpoints Administrativos

Os endpoints administrativos do jogo Termo estão disponíveis em `/admin/games/termo/` e requerem autenticação de administrador.

### 1. Gerar Palavra do Dia Manualmente

**Endpoint:** `POST /admin/games/termo/daily-word/generate`

**Descrição:** Permite gerar uma palavra específica para uma data específica.

**Body:**
```json
{
  "word": "CORAÇÃO",
  "date": "2024-01-15"
}
```

**Exemplo de uso:**
```bash
curl -X POST http://localhost:3000/admin/games/termo/daily-word/generate \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"word": "CORAÇÃO", "date": "2024-01-15"}'
```

### 2. Forçar Geração da Palavra do Dia

**Endpoint:** `POST /admin/games/termo/daily-word/force-generate`

**Descrição:** Força a geração automática da palavra do dia para hoje, caso não exista.

**Exemplo de uso:**
```bash
curl -X POST http://localhost:3000/admin/games/termo/daily-word/force-generate \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

### 3. Listar Palavras do Dia

**Endpoint:** `GET /admin/games/termo/daily-word/list`

**Descrição:** Lista todas as palavras do dia cadastradas.

**Exemplo de uso:**
```bash
curl -X GET http://localhost:3000/admin/games/termo/daily-word/list \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

## Solução para Erro 404

Se você está vendo erros 404 nos endpoints `/api/games/termo/start`, `/api/games/termo/current` e `/api/games/termo/can-play`, isso geralmente indica que não há palavra do dia gerada.

### Passos para resolver:

1. **Verificar se há palavra do dia:**
   ```bash
   curl -X GET http://localhost:3000/admin/games/termo/daily-word/list \
     -H "Authorization: Bearer SEU_TOKEN_ADMIN"
   ```

2. **Forçar geração da palavra do dia:**
   ```bash
   curl -X POST http://localhost:3000/admin/games/termo/daily-word/force-generate \
     -H "Authorization: Bearer SEU_TOKEN_ADMIN"
   ```

3. **Verificar se o problema foi resolvido:**
   ```bash
   curl -X GET http://localhost:3000/api/games/termo/current \
     -H "Authorization: Bearer SEU_TOKEN"
   ```

## Testes Automatizados

Use o script `test-termo-admin.js` para testar os endpoints:

```bash
# Instalar axios (se necessário)
npm install axios

# Executar testes
ADMIN_TOKEN="seu_token_admin" node test-termo-admin.js
```

## Observações Importantes

- **Não afeta a geração automática:** As palavras geradas manualmente não interferem no sistema de geração automática diária.
- **Autenticação necessária:** Todos os endpoints requerem token de administrador válido.
- **Logs:** Verifique os logs do servidor para mais detalhes sobre operações realizadas.