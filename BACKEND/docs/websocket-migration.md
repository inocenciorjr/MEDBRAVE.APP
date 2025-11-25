# Migração de SSE para WebSocket

## 📋 Resumo

Migração completa de Server-Sent Events (SSE) para WebSocket usando Socket.IO para progresso em tempo real de jobs.

## ✅ O que foi implementado

### Backend

1. **Serviço WebSocket** (`BACKEND/src/services/websocketService.ts`)
   - Gerenciamento de conexões Socket.IO
   - Sistema de rooms por jobId
   - Integração com jobProgressEmitter
   - Estatísticas de conexões

2. **Integração no servidor** (`BACKEND/src/server.ts`)
   - Socket.IO inicializado junto com o servidor HTTP
   - Porta: mesma do backend (3001)
   - Path: `/socket.io`

3. **Emissão de eventos**
   - jobProgressEmitter continua funcionando
   - Eventos são automaticamente transmitidos via WebSocket
   - Tipos de eventos:
     - `extraction` - Progresso de extração
     - `categorization` - Progresso de categorização
     - `rewrite` - Progresso de reescrita
     - `draft` - Criação de draft
     - `complete` - Job completo
     - `error` - Erro no job

### Frontend

1. **Hook React** (`frontend/hooks/useJobProgress.ts`)
   - Conexão automática ao Socket.IO
   - Inscrição em job específico
   - Reconexão automática
   - Cleanup automático
   - Retorna:
     - `events` - Lista de todos os eventos
     - `lastEvent` - Último evento recebido
     - `isConnected` - Status da conexão
     - `error` - Erro de conexão
     - `clearEvents()` - Limpar eventos

2. **Componente de UI** (`frontend/components/admin/scraper/JobProgressDisplay.tsx`)
   - Exibição visual de progresso
   - Lista de eventos com ícones
   - Barra de progresso
   - Auto-scroll
   - Status de conexão
   - Callback onComplete

3. **Integração na página bulk** (`frontend/app/admin/questions/bulk/page.tsx`)
   - Substituição do modal SSE por WebSocket
   - Uso do componente JobProgressDisplay
   - Remoção de código SSE deprecated

## 🗑️ O que foi removido

### Backend

1. **Rotas SSE removidas:**
   - `POST /api/admin/scraper/batch/:jobId/progress` (scraperRoutes.ts)
   - `POST /api/admin/scraper/extract-stream` (scraperRoutes.ts)
   - `GET /api/categorization/progress/:jobId` (categorizationRoutes.ts)

2. **Controllers removidos:**
   - `BACKEND/src/controllers/ScraperStreamController.ts` (deletado)

3. **Código SSE removido de:**
   - `BACKEND/src/routes/scraperRoutes.ts`
   - `BACKEND/src/routes/categorizationRoutes.ts`
   - Tracking de `activeJobs` com clientes SSE

### Frontend

1. **Código SSE deprecated:**
   - `categorizationService.streamProgress()` marcado como deprecated
   - EventSource removido da página bulk
   - Estados de cleanup SSE removidos

## 🔌 Como usar

### No Backend

O WebSocket é inicializado automaticamente. Basta emitir eventos usando o jobProgressEmitter:

```typescript
import { jobProgressEmitter } from './services/jobProgressEmitter';

// Emitir progresso de extração
jobProgressEmitter.emitExtraction(
  jobId,
  'extracting',
  'Extraindo questão 5 de 10',
  5,
  10
);

// Emitir progresso de categorização
jobProgressEmitter.emitCategorization(
  jobId,
  'categorizing',
  'Categorizando questão 3 de 10',
  3,
  10
);

// Emitir progresso de reescrita
jobProgressEmitter.emitRewrite(
  jobId,
  'rewriting',
  'Reescrevendo comentário 7 de 10',
  7,
  10
);

// Emitir conclusão
jobProgressEmitter.emitComplete(
  jobId,
  'Job concluído com sucesso!'
);

// Emitir erro
jobProgressEmitter.emitError(
  jobId,
  'Erro ao processar questão'
);
```

### No Frontend (React/Next.js)

#### Opção 1: Usar o componente pronto

```tsx
import { JobProgressDisplay } from '@/components/admin/scraper/JobProgressDisplay';

function MyComponent() {
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <div>
      {jobId && (
        <JobProgressDisplay 
          jobId={jobId}
          onComplete={() => {
            console.log('Job completo!');
            setJobId(null);
          }}
        />
      )}
    </div>
  );
}
```

#### Opção 2: Usar o hook diretamente

```tsx
import { useJobProgress } from '@/hooks/useJobProgress';

function MyComponent() {
  const { events, lastEvent, isConnected, error } = useJobProgress(jobId);

  return (
    <div>
      <p>Status: {isConnected ? 'Conectado' : 'Desconectado'}</p>
      {error && <p>Erro: {error}</p>}
      
      {lastEvent && (
        <div>
          <p>{lastEvent.message}</p>
          {lastEvent.progress && (
            <progress 
              value={lastEvent.progress.percentage} 
              max={100}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

## 🎯 Vantagens do WebSocket sobre SSE

1. **Bidirecional** - Cliente pode enviar mensagens para o servidor
2. **Mais confiável** - Reconexão automática
3. **Melhor suporte** - Funciona em mais ambientes
4. **Headers customizados** - Não precisa passar token na URL
5. **Multiplexing** - Múltiplos canais na mesma conexão
6. **Menos overhead** - Protocolo mais eficiente

## 🔧 Configuração

### Variáveis de ambiente

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:5000

# Backend (.env)
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### CORS

O Socket.IO já está configurado com CORS para o frontend:

```typescript
cors: {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
}
```

## 📊 Monitoramento

Para ver estatísticas de conexões WebSocket:

```typescript
import { websocketService } from './services/websocketService';

const stats = websocketService.getStats();
console.log(stats);
// {
//   connectedClients: 5,
//   activeJobRooms: 3,
//   jobRooms: [
//     { jobId: 'job-123', subscribers: 2 },
//     { jobId: 'job-456', subscribers: 1 },
//     { jobId: 'job-789', subscribers: 2 }
//   ]
// }
```

## 🐛 Troubleshooting

### Cliente não conecta

1. Verificar se o backend está rodando
2. Verificar NEXT_PUBLIC_API_URL no frontend
3. Verificar CORS no backend
4. Verificar console do navegador para erros

### Eventos não chegam

1. Verificar se o jobId está correto
2. Verificar se o cliente está inscrito no job
3. Verificar logs do backend
4. Verificar se jobProgressEmitter está emitindo eventos

### Reconexão não funciona

1. Socket.IO tem reconexão automática habilitada
2. Máximo de 5 tentativas com delay de 1 segundo
3. Verificar se o servidor está acessível

## 📝 Notas

- O WebSocket roda na mesma porta do backend (3001)
- Path do Socket.IO: `/socket.io`
- Eventos são transmitidos apenas para clientes inscritos no job
- Cleanup automático quando componente desmonta
- jobProgressEmitter continua funcionando normalmente
