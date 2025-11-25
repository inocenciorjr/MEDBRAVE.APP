# 🔧 Guia do Desenvolvedor - Scraper de Questões

## Arquitetura

O sistema de scraper é composto por:

### Backend

- **ScraperService**: Executa o CLI do scraper e processa resultados
- **JobQueueService**: Gerencia jobs de batch processing com BullMQ
- **WebSocketService**: Comunica progresso em tempo real
- **LogService**: Registra execuções e erros
- **Middlewares**: Autenticação, autorização, rate limiting

### Frontend

- **scraperService**: Cliente HTTP para API do scraper
- **useScraperWebSocket**: Hook React para WebSocket
- **Página Bulk**: Interface unificada com 3 modos (PPTX, Manual, Batch)
- **UrlConfigPanel**: Componente para configuração de URLs

### Infraestrutura

- **Redis**: Armazenamento de jobs e rate limiting
- **BullMQ**: Fila de jobs para batch processing
- **Socket.io**: WebSocket para comunicação em tempo real
- **Supabase**: Banco de dados PostgreSQL

## API Endpoints

### POST /api/admin/scraper/extract

Extrai questões de uma URL única (modo manual).

**Request:**
```json
{
  "url": "https://provaderesidencia.com.br/demo/prova-exemplo",
  "options": {
    "timeout": 300,
    "limit": 0,
    "downloadImages": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [...],
    "metadata": {
      "source": "...",
      "institution": "...",
      "year": 2025,
      "totalQuestions": 100,
      "extractionTime": 45000
    },
    "stats": {
      "questionsExtracted": 100,
      "questionsWithAnswers": 95,
      "imagesFound": 50
    }
  }
}
```

### POST /api/admin/scraper/batch

Cria job de processamento em lote.

**Request:**
```json
{
  "urls": [
    "https://provaderesidencia.com.br/demo/prova1",
    "https://provaderesidencia.com.br/demo/prova2"
  ],
  "configs": {
    "https://provaderesidencia.com.br/demo/prova1": {
      "saveAsOfficial": true,
      "officialExamData": {
        "examName": "Revalida 2025",
        "examYear": 2025,
        "examType": "revalida",
        "title": "Revalida 2025 - 1ª Etapa",
        "institution": "INEP"
      }
    }
  },
  "options": {
    "delayBetweenUrls": 2000,
    "maxRetries": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "pending",
    "totalUrls": 2,
    "estimatedTime": 600
  }
}
```

### GET /api/admin/scraper/batch/:jobId

Obtém status de um job.

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "processing",
    "progress": {
      "total": 2,
      "completed": 1,
      "failed": 0,
      "percentage": 50
    },
    "currentUrl": "https://provaderesidencia.com.br/demo/prova2",
    "results": [
      {
        "url": "https://provaderesidencia.com.br/demo/prova1",
        "status": "success",
        "questionsExtracted": 100,
        "questionsSaved": 98,
        "missingQuestions": [45, 67]
      }
    ]
  }
}
```

### DELETE /api/admin/scraper/batch/:jobId

Cancela job em execução.

### GET /api/admin/scraper/jobs

Lista jobs do usuário com paginação e filtros.

### GET /api/admin/scraper/logs

Obtém logs de execução com filtros.

### GET /api/admin/scraper/stats

Obtém estatísticas agregadas.

### GET /api/admin/scraper/rate-limit

Obtém informações de rate limit do usuário.

## WebSocket Events

### Client → Server

- `join-job`: Entrar na sala de um job
- `leave-job`: Sair da sala de um job

### Server → Client

- `job:started`: Job iniciado
- `job:progress`: Atualização de progresso
- `job:url:complete`: URL processada com sucesso
- `job:url:failed`: URL falhou
- `job:completed`: Job completado
- `job:failed`: Job falhou
- `job:cancelled`: Job cancelado

**Exemplo de evento `job:progress`:**
```json
{
  "jobId": "job_abc123",
  "currentUrl": "https://provaderesidencia.com.br/demo/prova2",
  "completed": 1,
  "total": 2,
  "failed": 0,
  "percentage": 50
}
```

## Database Schema

### scraper_jobs

```sql
CREATE TABLE scraper_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) NOT NULL,
  total_urls INTEGER NOT NULL,
  completed_urls INTEGER DEFAULT 0,
  failed_urls INTEGER DEFAULT 0,
  results JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### scraper_logs

```sql
CREATE TABLE scraper_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES scraper_jobs(id),
  url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  questions_extracted INTEGER DEFAULT 0,
  questions_saved INTEGER DEFAULT 0,
  missing_questions INTEGER[],
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  html_snapshot TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Segurança

### Autenticação e Autorização

Todas as rotas requerem:
1. Token JWT válido (via `supabaseAuthMiddleware`)
2. Role ADMIN (via `adminMiddleware`)

### Rate Limiting

- **Limite**: 10 requisições por hora por usuário
- **Implementação**: Redis com TTL
- **Headers de resposta**:
  - `X-RateLimit-Limit`: Limite total
  - `X-RateLimit-Remaining`: Requisições restantes
  - `X-RateLimit-Reset`: Data/hora do reset

### URL Sanitization

- Whitelist de domínios permitidos
- Bloqueio de IPs privados (previne SSRF)
- Validação de protocolo (apenas HTTP/HTTPS)
- Remoção de credenciais da URL

### Content Sanitization

- Remoção de scripts e iframes
- Remoção de event handlers
- Sanitização de URLs em atributos
- Whitelist de tags e atributos HTML

## Monitoramento

### Logs

Todos os logs são armazenados em `scraper_logs` com:
- URL processada
- Status (success/failed)
- Questões extraídas e salvas
- Duração da extração
- Mensagens de erro e stack traces
- Snapshot do HTML (para debug)

### Métricas

Estatísticas disponíveis:
- Total de extrações
- Taxa de sucesso
- Tempo médio de extração
- Total de questões extraídas
- Total de questões salvas

### Alertas

Monitor de taxa de erro:
- Executa a cada hora
- Alerta se taxa de erro > 20% nas últimas 24h
- Requer pelo menos 10 execuções para alertar

### Cleanup

Job de limpeza de logs:
- Executa diariamente à meia-noite
- Remove logs com mais de 30 dias
- Mantém logs de erros por mais tempo (configurável)

## Desenvolvimento

### Configuração Local

1. **Instalar dependências:**
```bash
npm install
```

2. **Configurar variáveis de ambiente:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_WS_URL=http://localhost:3001
```

3. **Iniciar Redis:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

4. **Executar migrations:**
```bash
npm run db:migrate
```

5. **Iniciar servidor:**
```bash
npm run dev
```

### Testes

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Debug

Ativar logs detalhados:
```env
LOG_LEVEL=debug
```

## Troubleshooting

### Job travado em "processing"

**Causa**: Worker parou ou crashou durante processamento.

**Solução**:
1. Verificar logs do worker
2. Reiniciar worker
3. Marcar job como "failed" manualmente no Redis

### Rate limit não funcionando

**Causa**: Redis não está conectado ou chave expirou incorretamente.

**Solução**:
1. Verificar conexão com Redis
2. Verificar TTL das chaves
3. Resetar rate limit manualmente se necessário

### WebSocket não conecta

**Causa**: CORS ou autenticação falhando.

**Solução**:
1. Verificar configuração de CORS no Socket.io
2. Verificar token JWT no localStorage
3. Verificar logs do servidor WebSocket

### Extração timeout

**Causa**: Página muito lenta ou scraper travado.

**Solução**:
1. Aumentar timeout nas configurações
2. Verificar se a página está acessível
3. Verificar logs do scraper CLI

## Performance

### Otimizações Implementadas

- **Lazy loading**: Componentes pesados carregados sob demanda
- **Memoization**: Cálculos caros memoizados com `useMemo`
- **Debouncing**: Inputs com debounce para reduzir re-renders
- **Connection pooling**: Pool de conexões Redis e PostgreSQL
- **Indexes**: Indexes em colunas frequentemente consultadas

### Recomendações

- Processar no máximo 10 URLs por batch
- Usar delay de 2-3 segundos entre URLs
- Monitorar uso de memória do worker
- Limpar logs antigos regularmente

## Deployment

### Checklist

- [ ] Configurar Redis em produção
- [ ] Configurar variáveis de ambiente
- [ ] Executar migrations
- [ ] Configurar monitoramento (Sentry, etc)
- [ ] Configurar alertas
- [ ] Testar rate limiting
- [ ] Testar WebSocket
- [ ] Configurar backup de Redis
- [ ] Documentar rollback

### Rollback

Em caso de problemas:

1. Reverter deploy do backend
2. Reverter migrations se necessário
3. Limpar jobs pendentes no Redis
4. Notificar usuários sobre indisponibilidade temporária

---

**Última atualização**: 2025-02-01
