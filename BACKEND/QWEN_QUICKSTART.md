# Qwen3-235B-A22B - Guia Rápido

## 🚀 Início Rápido

### 1. Configurar API Key

Edite o arquivo `.env`:

```bash
# Ativar Qwen3
USE_QWEN=true

# Desativar outros provedores
USE_GEMINI=false
USE_GPT_OSS=false
USE_MINIMAX=false

# Sua API Key do Hugging Face
QWEN_API_KEY=hf_seu_token_aqui
```

### 2. Testar Conexão

```bash
cd BACKEND
npm run test:qwen
# ou
ts-node scripts/test-qwen.ts
```

### 3. Usar no Scraper/Batch

O Qwen3 será usado automaticamente quando `USE_QWEN=true`.

## 📊 Configurações Recomendadas

### Para Categorização de Questões (Padrão)

```bash
QWEN_ENABLE_THINKING=false  # Modo eficiente
QWEN_MAX_CONTEXT=32768      # Contexto nativo
```

**Batch size recomendado:** 5-10 questões por batch

### Para Análise Complexa

```bash
QWEN_ENABLE_THINKING=true   # Modo de raciocínio
QWEN_MAX_CONTEXT=32768      # Ou 131072 para textos muito longos
```

**Batch size recomendado:** 1-3 questões por batch

## 🎯 Quando Usar Qwen3?

### ✅ Use Qwen3 quando:
- Precisar de raciocínio complexo
- Trabalhar com múltiplos idiomas
- Precisar de contexto longo (até 131k tokens)
- Quiser análise de imagens médicas
- Precisar de respostas estruturadas em JSON

### ⚠️ Use outro modelo quando:
- Precisar de velocidade máxima (use Gemini)
- Tiver limite de rate (use modelo local)
- Trabalhar com contexto muito grande (>131k tokens, use Gemini 1M)

## 🔧 Troubleshooting Rápido

### Erro: "Model is loading"
**Solução:** Aguarde 1-2 minutos. O modelo está sendo carregado no servidor.

### Erro: "Rate limit exceeded"
**Solução:** 
1. Aguarde alguns minutos
2. Ou mude temporariamente para outro provedor: `USE_GEMINI=true`

### Respostas de baixa qualidade
**Solução:**
1. Ative modo pensante: `QWEN_ENABLE_THINKING=true`
2. Reduza batch size para 1-3
3. Melhore o prompt com mais exemplos

### Resposta truncada
**Solução:**
1. Aumente contexto: `QWEN_MAX_CONTEXT=131072`
2. Ou reduza o tamanho do batch

## 📈 Comparação de Performance

| Cenário | Batch Size | Thinking Mode | Tempo/Questão | Qualidade |
|---------|-----------|---------------|---------------|-----------|
| Categorização simples | 10 | false | ~3s | ⭐⭐⭐⭐ |
| Categorização complexa | 5 | false | ~5s | ⭐⭐⭐⭐⭐ |
| Análise profunda | 1 | true | ~15s | ⭐⭐⭐⭐⭐ |
| Com imagens | 3 | false | ~8s | ⭐⭐⭐⭐⭐ |

## 🔗 Links Úteis

- [Documentação Completa](./docs/QWEN3_SETUP.md)
- [Modelo no Hugging Face](https://huggingface.co/Qwen/Qwen3-235B-A22B)
- [GitHub Qwen3](https://github.com/QwenLM/Qwen3)

## 💡 Dicas

1. **Comece com modo não-pensante** para ter respostas mais rápidas
2. **Use batch size de 5-10** para equilíbrio entre velocidade e qualidade
3. **Monitore os logs** para ver tokens usados e tempo de resposta
4. **Padronize seus prompts** para resultados mais consistentes
5. **Teste com questões reais** antes de processar grandes lotes

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs do backend
2. Execute o script de teste: `npm run test:qwen`
3. Consulte a [documentação completa](./docs/QWEN3_SETUP.md)
4. Abra uma issue no repositório
