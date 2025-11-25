# ⚡ Quick Start - Sistema de Flashcards

## 🚀 Início Rápido (5 minutos)

### 1. Verificar Configuração ✅

```bash
# Backend já está configurado
cd BACKEND
npm run dev

# Frontend já está configurado
cd frontend
npm run dev
```

### 2. Testar Importação APKG (2 minutos)

1. Acesse: `http://localhost:3000/flashcards/colecoes`
2. Clique em "Importar Arquivo Anki"
3. Selecione um arquivo `.apkg`
4. Aguarde o preview
5. Confirme a importação
6. ✅ Pronto! Seus decks aparecerão na lista

### 3. Criar Flashcard Manual (1 minuto)

1. Acesse: `http://localhost:3000/flashcards/colecoes`
2. Clique em "Criar Deck"
3. Preencha nome e descrição
4. Clique em "Adicionar Card"
5. Preencha frente e verso
6. ✅ Pronto! Card criado

### 4. Estudar Flashcards (2 minutos)

1. Clique em um deck
2. Clique em "Estudar"
3. Veja a frente do card
4. Clique em "Mostrar Resposta"
5. Avalie: Again, Hard, Good ou Easy
6. ✅ Pronto! Revisão registrada

## 🔍 Verificação Rápida

### Backend Funcionando?
```bash
curl http://localhost:5000/api/flashcards/decks \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Esperado**: Lista de decks (pode estar vazia)

### Frontend Conectado?
1. Abra DevTools (F12)
2. Vá para Network
3. Recarregue `/flashcards/colecoes`
4. Veja requisições para `/api/flashcards/*`

**Esperado**: Status 200 nas requisições

### Banco de Dados OK?
```sql
SELECT COUNT(*) FROM decks;
SELECT COUNT(*) FROM flashcards;
```

**Esperado**: Números >= 0

## 🐛 Problemas Comuns

### Erro 401 (Não Autenticado)
```bash
# Fazer login primeiro
# Depois tentar novamente
```

### Erro 404 (Rota Não Encontrada)
```bash
# Verificar se backend está rodando
# Verificar se rota é /api/flashcards/*
```

### Imagens Não Carregam
```bash
# Verificar se R2 está configurado
# Ver variáveis de ambiente:
# R2_ACCOUNT_ID
# R2_ACCESS_KEY_ID
# R2_SECRET_ACCESS_KEY
# R2_BUCKET_NAME
```

## 📊 Comandos Úteis

### Ver Logs
```bash
# Backend
tail -f BACKEND/logs/app.log

# Filtrar flashcards
tail -f BACKEND/logs/app.log | grep -i flashcard
```

### Limpar Cache
```javascript
// No DevTools Console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Verificar Progresso de Importação
```javascript
// No DevTools Console
fetch('/api/flashcards/import-progress/SEU_USER_ID', {
  headers: {
    'Authorization': 'Bearer SEU_TOKEN'
  }
})
.then(r => r.json())
.then(console.log);
```

## 🎯 Próximos Passos

1. ✅ Sistema funcionando? → Execute testes completos
2. ✅ Testes OK? → Deploy em produção
3. ✅ Em produção? → Monitore logs e performance

## 📚 Documentação Completa

- **Análise Técnica**: `FLASHCARDS_CONNECTION_ANALYSIS.md`
- **Guia Completo**: `FLASHCARDS_IMPLEMENTATION_COMPLETE.md`
- **Checklist de Testes**: `FLASHCARDS_TESTING_CHECKLIST.md`
- **Comandos de Debug**: `FLASHCARDS_DEBUG_COMMANDS.md`
- **Diagramas de Fluxo**: `FLASHCARDS_FLOW_DIAGRAM.md`
- **Resumo Executivo**: `RESUMO_EXECUTIVO_FLASHCARDS.md`

## 💡 Dicas

1. **Importação Lenta?** → Arquivo muito grande, aguarde
2. **Muitos Decks?** → Use busca global
3. **Perdeu um Deck?** → Verifique coleções
4. **Quer Compartilhar?** → Torne público na configuração

## 🎉 Pronto!

Agora você pode:
- ✅ Importar arquivos Anki
- ✅ Criar flashcards manualmente
- ✅ Estudar com revisão espaçada
- ✅ Explorar comunidade
- ✅ Gerenciar biblioteca

**Divirta-se estudando! 📚**

---

**Tempo total**: ~5 minutos
**Dificuldade**: Fácil
**Status**: ✅ PRONTO
