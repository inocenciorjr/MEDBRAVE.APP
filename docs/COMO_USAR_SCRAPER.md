# 🚀 Como Usar o Scraper - Guia Rápido

## Pré-requisitos

1. **Docker Desktop rodando** (ícone na bandeja do Windows)
2. **Redis rodando** (automático se seguiu o setup)
3. **Backend rodando**: `npm run dev` na pasta BACKEND

---

## 📍 Onde Acessar

Acesse a interface administrativa:
```
http://localhost:5173/admin/questions/scraper
```

Você verá 2 abas:
- **Manual**: Para extrair e revisar questões uma URL por vez
- **Batch**: Para processar múltiplas URLs automaticamente

---

## 🎯 Modo Manual (Recomendado para começar)

### Passo 1: Cole a URL
```
Exemplo de URL válida:
https://www.provaderesidencia.com.br/demo/prova-123
```

### Passo 2: Clique em "Extrair Questões"
- Aguarde o scraper processar (15-60 segundos)
- Você verá o progresso em tempo real

### Passo 3: Revise as Questões
- Todas as questões extraídas aparecem em cards
- Você pode editar:
  - Enunciado
  - Alternativas
  - Gabarito
  - Dificuldade
  - Filtros/categorias

### Passo 4: Categorize com IA (Opcional)
- Clique em "Categorizar com IA"
- A IA vai sugerir especialidades e tópicos

### Passo 5: Salvar
- Clique em "Salvar Questões"
- Escolha se quer salvar como "Prova Oficial" (com metadados)
- Confirme

✅ **Pronto!** Questões salvas no banco de dados.

---

## ⚡ Modo Batch (Automático)

### Passo 1: Cole Múltiplas URLs
```
https://www.provaderesidencia.com.br/demo/prova-123
https://www.provaderesidencia.com.br/demo/prova-456
https://www.provaderesidencia.com.br/demo/prova-789
```
(Uma URL por linha)

### Passo 2: Configure cada URL (Opcional)
- Para cada URL, você pode ativar "Salvar como Prova Oficial"
- Preencha: Nome da prova, Ano, Instituição, etc.

### Passo 3: Clique em "Processar em Lote"
- O sistema cria um JOB no Redis
- Você vê o progresso em tempo real via WebSocket
- Pode fechar a página, o processamento continua

### Passo 4: Acompanhe o Progresso
- Barra de progresso geral
- Status de cada URL (sucesso/falha)
- Estatísticas em tempo real

### Passo 5: Ver Relatório Final
- Total de questões extraídas
- Questões salvas
- Questões faltantes (se houver)
- Exportar CSV com questões faltantes

---

## 🔧 Configurações Avançadas

Clique no ícone de engrenagem para ajustar:

- **Timeout**: Tempo máximo de extração (padrão: 5 min)
- **Limite de questões**: Máximo por URL (padrão: ilimitado)
- **Download de imagens**: Ativar/desativar (padrão: ativado)
- **Delay entre URLs**: Tempo de espera no batch (padrão: 2s)
- **Tentativas de retry**: Quantas vezes tentar se falhar (padrão: 3)

---

## ⚠️ Limitações e Rate Limiting

- **10 extrações por hora** por usuário
- Se exceder, aguarde 1 hora ou peça ao admin resetar
- Apenas URLs do domínio `provaderesidencia.com.br` são permitidas

---

## 🐛 Troubleshooting

### "Erro: Redis não conectado"
```bash
# Verifique se Redis está rodando
docker ps | Select-String redis

# Se não estiver, inicie
docker start redis-medbrave
```

### "Erro: Nenhuma questão encontrada"
- Verifique se a URL é válida
- Verifique se o conteúdo não requer login premium
- Veja os logs em `/admin/scraper/logs`

### "Erro: Timeout"
- Aumente o timeout nas configurações
- Verifique sua conexão com internet
- Tente novamente mais tarde

### "Erro: Rate limit excedido"
- Aguarde 1 hora
- Ou peça ao admin para resetar seu limite

---

## 📊 Monitoramento

### Ver Logs de Execução
```
http://localhost:5173/admin/scraper/logs
```

### Ver Jobs em Andamento
```
http://localhost:5173/admin/scraper/jobs
```

### Métricas
- Taxa de sucesso
- Tempo médio de extração
- Total de questões extraídas

---

## 💡 Dicas

1. **Comece com Modo Manual** para entender o processo
2. **Use Batch para provas antigas** que não precisam de revisão
3. **Sempre revise questões importantes** no modo manual
4. **Configure metadados de prova** para melhor organização
5. **Exporte relatórios** para referência futura

---

## 🆘 Suporte

Se tiver problemas:
1. Verifique os logs do backend
2. Verifique os logs do scraper em `/admin/scraper/logs`
3. Verifique se Docker/Redis estão rodando
4. Reinicie o backend se necessário
