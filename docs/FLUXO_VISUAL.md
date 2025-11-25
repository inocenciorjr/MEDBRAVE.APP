# 🎨 Fluxo Visual - Como Tudo Funciona

## 🏗️ Arquitetura Simplificada

```
┌─────────────────────────────────────────────────────────┐
│                    SEU COMPUTADOR                        │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐   ┌────────────┐ │
│  │   Browser    │    │   Backend    │   │   Docker   │ │
│  │ (Frontend)   │◄──►│  Node.js     │◄──►│   Redis    │ │
│  │ localhost:   │    │ localhost:   │   │ localhost: │ │
│  │   5173       │    │   5000       │   │   6379     │ │
│  └──────────────┘    └──────────────┘   └────────────┘ │
│         │                    │                  │        │
│         │                    │                  │        │
│         └────────────────────┴──────────────────┘        │
│                              │                           │
└──────────────────────────────┼───────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │    Supabase      │
                    │   (PostgreSQL)   │
                    │   Banco de Dados │
                    └──────────────────┘
```

---

## 🔄 Fluxo de Extração Manual

```
1. VOCÊ
   │
   ├─► Cola URL no formulário
   │
   ▼
2. FRONTEND (React)
   │
   ├─► Envia POST /api/admin/scraper/extract
   │
   ▼
3. BACKEND (Express)
   │
   ├─► Valida URL
   ├─► Chama ScraperService
   │
   ▼
4. SCRAPER (Puppeteer)
   │
   ├─► Abre navegador headless
   ├─► Navega até a URL
   ├─► Extrai questões, alternativas, gabarito
   ├─► Baixa imagens
   ├─► Retorna JSON
   │
   ▼
5. BACKEND
   │
   ├─► Converte para formato BulkQuestion
   ├─► Retorna para frontend
   │
   ▼
6. FRONTEND
   │
   ├─► Exibe questões em cards
   ├─► Permite edição
   │
   ▼
7. VOCÊ
   │
   ├─► Revisa e edita
   ├─► Clica em "Salvar"
   │
   ▼
8. BACKEND
   │
   ├─► Salva no Supabase
   │
   ▼
9. ✅ SUCESSO!
```

---

## ⚡ Fluxo de Processamento em Lote (Batch)

```
1. VOCÊ
   │
   ├─► Cola 10 URLs
   ├─► Clica "Processar em Lote"
   │
   ▼
2. FRONTEND
   │
   ├─► POST /api/admin/scraper/batch
   │
   ▼
3. BACKEND
   │
   ├─► Valida todas as URLs
   ├─► Cria JOB no Redis via BullMQ
   ├─► Retorna jobId
   │
   ▼
4. REDIS (Job Queue)
   │
   ├─► Armazena job com status "pending"
   ├─► Worker pega o job
   │
   ▼
5. WORKER (Background)
   │
   ├─► Para cada URL:
   │   ├─► Chama Scraper
   │   ├─► Extrai questões
   │   ├─► Salva no banco
   │   ├─► Atualiza progresso no Redis
   │   ├─► Emite evento via WebSocket
   │   └─► Aguarda 2 segundos (delay)
   │
   ▼
6. WEBSOCKET
   │
   ├─► Envia eventos em tempo real:
   │   ├─► job:progress (a cada URL)
   │   ├─► job:url:complete
   │   └─► job:completed (no final)
   │
   ▼
7. FRONTEND
   │
   ├─► Recebe eventos via WebSocket
   ├─► Atualiza barra de progresso
   ├─► Atualiza lista de URLs
   ├─► Mostra estatísticas
   │
   ▼
8. VOCÊ
   │
   ├─► Acompanha em tempo real
   ├─► Pode fechar a página (continua processando)
   ├─► Pode cancelar se quiser
   │
   ▼
9. ✅ RELATÓRIO FINAL
   ├─► Total extraído
   ├─► Sucessos/Falhas
   └─► Questões faltantes
```

---

## 🔐 Fluxo de Rate Limiting

```
1. VOCÊ faz requisição de extração
   │
   ▼
2. MIDDLEWARE (rateLimiter)
   │
   ├─► Verifica no Redis: rate_limit:USER_ID
   │
   ├─► Se < 10 requisições na última hora:
   │   ├─► Incrementa contador
   │   ├─► Permite requisição ✅
   │   └─► Adiciona headers (X-RateLimit-Remaining)
   │
   └─► Se >= 10 requisições:
       ├─► Bloqueia requisição ❌
       └─► Retorna erro 429 (Too Many Requests)
```

---

## 🗄️ O que o Redis Armazena

```
REDIS
│
├─── rate_limit:USER_123
│    └─── Valor: 5 (contador de requisições)
│    └─── Expira em: 3600 segundos (1 hora)
│
├─── bull:scraper-batch:JOB_456
│    └─── Status: processing
│    └─── Progress: 3/10 URLs
│    └─── Results: [...]
│
├─── bull:scraper-batch:JOB_789
│    └─── Status: completed
│    └─── Results: [...]
│
└─── scraper_rate_limit:USER_123
     └─── Valor: 8 (contador específico do scraper)
     └─── Expira em: 3600 segundos
```

---

## 🎯 Quando Usar Cada Modo

### 📝 Modo Manual
```
USE QUANDO:
✅ Prova importante (residência recente)
✅ Precisa revisar questões
✅ Quer categorizar com IA
✅ Quer salvar como prova oficial com metadados
✅ Primeira vez usando o scraper

TEMPO: ~2-5 minutos por prova
```

### ⚡ Modo Batch
```
USE QUANDO:
✅ Múltiplas provas antigas
✅ Não precisa revisar (confia no scraper)
✅ Quer economizar tempo
✅ Processamento em background
✅ Pode deixar rodando e fazer outras coisas

TEMPO: ~30 segundos por prova (automático)
```

---

## 🚦 Estados de um Job

```
PENDING
   │
   ├─► Job criado, aguardando processamento
   │
   ▼
PROCESSING
   │
   ├─► Worker está processando URLs
   ├─► Progresso: 3/10 URLs
   │
   ▼
COMPLETED ✅
   │
   ├─► Todas as URLs processadas
   ├─► Relatório disponível
   │
   OU
   │
   ▼
FAILED ❌
   │
   ├─► Erro crítico
   ├─► Ver logs para detalhes
   │
   OU
   │
   ▼
CANCELLED 🚫
   │
   └─► Você cancelou manualmente
```

---

## 💾 Onde os Dados Ficam

```
┌─────────────────────────────────────────┐
│           SUPABASE (PostgreSQL)         │
├─────────────────────────────────────────┤
│                                         │
│  📋 questions                           │
│     ├─── id                             │
│     ├─── statement                      │
│     ├─── alternatives                   │
│     ├─── correct_alternative_id         │
│     └─── ...                            │
│                                         │
│  📊 scraper_jobs                        │
│     ├─── id                             │
│     ├─── user_id                        │
│     ├─── status                         │
│     ├─── results                        │
│     └─── ...                            │
│                                         │
│  📝 scraper_logs                        │
│     ├─── id                             │
│     ├─── job_id                         │
│     ├─── url                            │
│     ├─── status                         │
│     └─── ...                            │
│                                         │
│  🔐 audit_logs                          │
│     ├─── event_type                     │
│     ├─── user_id                        │
│     └─── ...                            │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           REDIS (In-Memory)             │
├─────────────────────────────────────────┤
│                                         │
│  ⏱️  Rate Limits (temporário)           │
│     └─── Expira em 1 hora              │
│                                         │
│  📦 Jobs Queue (temporário)             │
│     └─── Limpo após 7 dias             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎓 Resumo para Iniciantes

1. **Docker** = Programa que roda containers (mini-servidores)
2. **Redis** = Banco de dados rápido em memória (para filas e cache)
3. **BullMQ** = Biblioteca que usa Redis para gerenciar filas de jobs
4. **Scraper** = Robô que extrai questões de sites
5. **WebSocket** = Conexão em tempo real (como chat)

**Você só precisa:**
- Abrir Docker Desktop (1x ao ligar o PC)
- Rodar `npm run dev` no backend
- Acessar a interface no navegador
- Usar! 🎉
