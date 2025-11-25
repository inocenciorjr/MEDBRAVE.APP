# Guia de Limpeza do R2 Bucket

Este guia explica como usar o script `clean-r2-bucket.ts` para gerenciar e limpar arquivos no seu bucket Cloudflare R2.

## Pré-requisitos

- Variáveis de ambiente R2 configuradas (`.env`)
- Backend rodando ou compilado

## Comandos Disponíveis

### 1. Listar Todos os Arquivos

```bash
cd BACKEND
npm run clean-r2 -- --list
```

**Saída:**
```
📋 Listando arquivos no bucket...

📁 questions/images/ (45 arquivos)
   Tamanho total: 2.3 MB
   - question_img_1234567890_abc123.jpg (156 KB) - 08/01/2025
   - question_img_1234567891_def456.png (234 KB) - 08/01/2025
   ... e mais 43 arquivos

📊 Resumo:
   Total de arquivos: 45
   Tamanho total: 2.3 MB
   Pastas: 1
```

### 2. Listar Arquivos de uma Pasta Específica

```bash
npm run clean-r2 -- --list --folder questions/images
```

### 3. Simular Limpeza (Dry Run)

**Recomendado antes de deletar!**

```bash
# Simular limpeza de uma pasta
npm run clean-r2 -- --folder questions/images --dry-run

# Simular limpeza de arquivos antigos
npm run clean-r2 -- --older-than 30 --dry-run

# Simular limpeza de tudo
npm run clean-r2 -- --all --dry-run
```

### 4. Deletar Arquivos de uma Pasta (Rápido - 50 por vez)

```bash
npm run clean-r2 -- --folder questions/images
```

**Modo Turbo (100 por vez):**
```bash
npm run clean-r2 -- --folder flashcards/media --fast
```

**Saída:**
```
🗑️  Deletando arquivos da pasta "questions/images"...

⚠️  Arquivos a serem deletados: 45
⚠️  Tamanho total: 2.3 MB

🗑️  Deletando arquivos...

   Progresso: 10/45 arquivos deletados
   Progresso: 20/45 arquivos deletados
   Progresso: 30/45 arquivos deletados
   Progresso: 40/45 arquivos deletados

✅ Deleção completa!
   Deletados: 45
   Falhas: 0
   Total: 45
```

### 5. Deletar Arquivos Antigos

Deletar arquivos mais antigos que X dias:

```bash
# Deletar arquivos com mais de 30 dias
npm run clean-r2 -- --older-than 30

# Deletar arquivos com mais de 7 dias em uma pasta específica
npm run clean-r2 -- --folder questions/images --older-than 7
```

### 6. Deletar TUDO (⚠️ CUIDADO!)

Para deletar **TODOS** os arquivos do bucket:

```bash
npm run clean-r2 -- --all --confirm
```

**⚠️ ATENÇÃO:** Isso deletará TODOS os arquivos do bucket! Use com extremo cuidado!

## Opções Disponíveis

| Opção | Descrição | Exemplo |
|-------|-----------|---------|
| `--list` | Apenas listar arquivos sem deletar | `--list` |
| `--folder <path>` | Especificar pasta | `--folder questions/images` |
| `--all` | Deletar tudo (requer `--confirm`) | `--all --confirm` |
| `--confirm` | Confirmar deleção de tudo | `--all --confirm` |
| `--older-than <days>` | Deletar arquivos mais antigos que X dias | `--older-than 30` |
| `--dry-run` | Simular sem deletar | `--dry-run` |

## Casos de Uso Comuns

### Limpar Imagens de Teste

```bash
# 1. Ver o que tem
npm run clean-r2 -- --list --folder questions/images

# 2. Simular limpeza
npm run clean-r2 -- --folder questions/images --dry-run

# 3. Deletar
npm run clean-r2 -- --folder questions/images
```

### Limpar Flashcards (Rápido)

```bash
# Deletar todos os flashcards rapidamente
npm run clean-r2 -- --folder flashcards
```

### Limpar Tudo de Uma Vez (Mais Rápido)

```bash
# Ver tudo primeiro
npm run clean-r2 -- --list

# Deletar tudo rapidamente
npm run clean-r2 -- --all --confirm
```

### Limpar Arquivos Antigos

```bash
# 1. Ver arquivos com mais de 30 dias
npm run clean-r2 -- --older-than 30 --dry-run

# 2. Deletar
npm run clean-r2 -- --older-than 30
```

### Limpar Tudo e Recomeçar

```bash
# 1. Ver tudo
npm run clean-r2 -- --list

# 2. Simular limpeza total
npm run clean-r2 -- --all --dry-run

# 3. Deletar tudo (CUIDADO!)
npm run clean-r2 -- --all --confirm
```

## Estrutura de Pastas Comum

```
bucket-root/
├── questions/
│   └── images/          # Imagens de questões
├── flashcards/
│   └── media/           # Mídia de flashcards
├── uploads/             # Uploads gerais
└── temp/                # Arquivos temporários
```

## Dicas de Segurança

1. **Sempre use `--dry-run` primeiro** para ver o que será deletado
2. **Faça backup** de arquivos importantes antes de deletar
3. **Use `--list`** para entender o que está no bucket
4. **Evite `--all --confirm`** a menos que tenha certeza absoluta
5. **Teste em ambiente de desenvolvimento** antes de produção

## Troubleshooting

### Erro: "Credenciais R2 inválidas"

Verifique suas variáveis de ambiente:
```bash
# .env
R2_ACCOUNT_ID=...
R2_BUCKET_NAME=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=...
R2_PUBLIC_URL=...
```

### Erro: "Falha na conexão R2"

1. Verifique se o endpoint está correto
2. Verifique se as credenciais têm permissão de leitura/escrita
3. Verifique sua conexão com a internet

### Erro: "Bucket não existe"

Verifique se o nome do bucket está correto no `.env`:
```bash
R2_BUCKET_NAME=medbrave
```

## Exemplos Práticos

### Exemplo 1: Limpeza Semanal

```bash
# Deletar arquivos temporários com mais de 7 dias
npm run clean-r2 -- --folder temp --older-than 7
```

### Exemplo 2: Limpeza de Desenvolvimento

```bash
# Limpar tudo em ambiente de dev
npm run clean-r2 -- --all --confirm
```

### Exemplo 3: Auditoria

```bash
# Ver o que está ocupando espaço
npm run clean-r2 -- --list
```

## Automação (Opcional)

Você pode criar um cron job para limpeza automática:

```bash
# Crontab para limpar arquivos temporários semanalmente
0 2 * * 0 cd /path/to/BACKEND && npm run clean-r2 -- --folder temp --older-than 7
```

## Suporte

Se encontrar problemas:
1. Verifique os logs do script
2. Verifique as credenciais R2
3. Teste com `--dry-run` primeiro
4. Entre em contato com o time de desenvolvimento

---

**Última atualização:** 2025-01-08  
**Versão:** 1.0.0
