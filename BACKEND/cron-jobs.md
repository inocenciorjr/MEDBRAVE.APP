# Cron Jobs Configuration

## Job de Expiração de Planos

Execute o job de expiração de planos periodicamente para marcar planos vencidos como EXPIRED.

### Configuração Recomendada

**Frequência:** A cada hora

```bash
# Crontab (Linux/Mac)
0 * * * * cd /path/to/backend && npm run expire-plans >> /var/log/expire-plans.log 2>&1

# Ou a cada 30 minutos
*/30 * * * * cd /path/to/backend && npm run expire-plans >> /var/log/expire-plans.log 2>&1
```

### Alternativas

#### 1. Node-cron (dentro da aplicação)

```typescript
// src/server.ts
import cron from 'node-cron';
import { expirePlansJob } from './jobs/expirePlansJob';

// Executa a cada hora
cron.schedule('0 * * * *', async () => {
  try {
    await expirePlansJob();
  } catch (error) {
    console.error('Erro no cron job:', error);
  }
});
```

#### 2. GitHub Actions (CI/CD)

```yaml
# .github/workflows/expire-plans.yml
name: Expire Plans Job

on:
  schedule:
    - cron: '0 * * * *' # A cada hora

jobs:
  expire-plans:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run expire-plans
```

#### 3. Vercel Cron (se hospedado na Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/expire-plans",
      "schedule": "0 * * * *"
    }
  ]
}
```

#### 4. AWS Lambda + EventBridge

Configure uma função Lambda que executa o job e agende com EventBridge.

### Monitoramento

Verifique os logs regularmente:

```bash
tail -f /var/log/expire-plans.log
```

### Notificações (Futuro)

Considere adicionar notificações quando planos estiverem próximos de expirar:
- 7 dias antes
- 3 dias antes
- 1 dia antes
- No dia da expiração
