# Changelog - Integração Qwen3-235B-A22B

## 📅 Data: 04/11/2025

## 🎯 Objetivo

Adicionar suporte ao modelo Qwen3-235B-A22B (235B parâmetros, 22B ativos) via Hugging Face para categorização de questões médicas com IA.

## ✨ Novos Arquivos

### 1. Cliente Qwen3
- **Arquivo:** `src/services/qwenClient.ts`
- **Descrição:** Cliente completo para integração com Qwen3-235B-A22B
- **Recursos:**
  - Suporte a modo pensante e não-pensante
  - Contexto extensível (32k-131k tokens com YaRN)
  - Análise de imagens médicas
  - Parsing robusto de respostas JSON
  - Tratamento de erros

### 2. Documentação
- **Arquivo:** `docs/QWEN3_SETUP.md`
- **Descrição:** Guia completo de configuração e uso do Qwen3
- **Conteúdo:**
  - Características do modelo
  - Instruções de configuração
  - Modos de operação (pensante vs não-pensante)
  - Explicação sobre YaRN
  - Melhores práticas
  - Comparação com outros modelos
  - Troubleshooting

### 3. Guia Rápido
- **Arquivo:** `QWEN_QUICKSTART.md`
- **Descrição:** Guia de início rápido para usar o Qwen3
- **Conteúdo:**
  - Configuração em 3 passos
  - Configurações recomendadas
  - Quando usar Qwen3
  - Troubleshooting rápido
  - Comparação de performance

### 4. Script de Teste
- **Arquivo:** `scripts/test-qwen.ts`
- **Descrição:** Script para testar a integração do Qwen3
- **Testes:**
  - Categorização simples
  - Categorização em batch
  - Medição de performance
  - Validação de respostas

## 🔧 Arquivos Modificados

### 1. Variáveis de Ambiente
- **Arquivo:** `.env`
- **Alterações:**
  ```bash
  # Novas variáveis
  USE_QWEN=false
  QWEN_API_KEY=hf_...
  QWEN_MODEL=Qwen/Qwen3-235B-A22B
  QWEN_BASE_URL=https://api-inference.huggingface.co/models/Qwen/Qwen3-235B-A22B/v1
  QWEN_ENABLE_THINKING=false
  QWEN_MAX_CONTEXT=32768
  ```

### 2. Exemplo de Variáveis
- **Arquivo:** `.env.example`
- **Alterações:**
  - Adicionadas variáveis do Qwen3
  - Reorganizadas variáveis de provedores de IA
  - Adicionadas flags USE_* para todos os provedores

### 3. Rotas de Categorização
- **Arquivo:** `src/routes/categorizationRoutes.ts`
- **Alterações:**
  - Importado `createQwenClient`
  - Adicionada lógica de seleção do Qwen3
  - Prioridade: Qwen3 > GPT-OSS > MiniMax > Gemini > LM Studio > OpenRouter

### 4. Package.json
- **Arquivo:** `package.json`
- **Alterações:**
  - Adicionado script `test:qwen` para testar integração

## 🚀 Como Usar

### Ativar Qwen3

1. Obter API Key do Hugging Face:
   ```
   https://huggingface.co/settings/tokens
   ```

2. Configurar `.env`:
   ```bash
   USE_QWEN=true
   QWEN_API_KEY=hf_seu_token_aqui
   ```

3. Desativar outros provedores:
   ```bash
   USE_GEMINI=false
   USE_GPT_OSS=false
   USE_MINIMAX=false
   ```

4. Testar:
   ```bash
   npm run test:qwen
   ```

### Configurações Recomendadas

#### Para Categorização Rápida (Padrão)
```bash
QWEN_ENABLE_THINKING=false
QWEN_MAX_CONTEXT=32768
```
- Batch size: 5-10 questões
- Tempo: ~3-5s por questão

#### Para Análise Profunda
```bash
QWEN_ENABLE_THINKING=true
QWEN_MAX_CONTEXT=32768
```
- Batch size: 1-3 questões
- Tempo: ~10-15s por questão

#### Para Textos Muito Longos
```bash
QWEN_ENABLE_THINKING=false
QWEN_MAX_CONTEXT=131072
```
- Usa YaRN para estender contexto
- Suporta até 131k tokens

## 📊 Características do Qwen3-235B-A22B

### Arquitetura
- **Parâmetros totais:** 235B
- **Parâmetros ativos:** 22B (MoE - Mixture of Experts)
- **Contexto nativo:** 32.768 tokens
- **Contexto com YaRN:** 131.072 tokens

### Capacidades
- ✅ Raciocínio complexo (modo pensante)
- ✅ Diálogo eficiente (modo não-pensante)
- ✅ Análise de imagens
- ✅ Suporte multilíngue (100+ idiomas)
- ✅ Geração de JSON estruturado
- ✅ Integração com ferramentas externas

### Parâmetros de Amostragem

**Modo Não-Pensante (Padrão):**
- Temperature: 0.7
- Top P: 0.8
- Top K: 20
- Min P: 0

**Modo Pensante:**
- Temperature: 0.6
- Top P: 0.95
- Top K: 20
- Min P: 0

## 🔄 Fluxo de Integração

```
Frontend (Bulk Upload)
    ↓
Backend API (/api/categorization/start)
    ↓
categorizationRoutes.ts
    ↓
initializeServices() → Seleciona Qwen3 se USE_QWEN=true
    ↓
createQwenClient(apiKey)
    ↓
batchProcessor.processBatches()
    ↓
categorizationService.categorize()
    ↓
qwenClient.categorize(prompt, batchSize)
    ↓
Hugging Face API (Qwen3-235B-A22B)
    ↓
Resposta JSON parseada
    ↓
Resultados salvos no Supabase
```

## 🎯 Prioridade de Provedores

A ordem de prioridade dos provedores de IA é:

1. **Qwen3** (USE_QWEN=true) - Novo!
2. GPT-OSS (USE_GPT_OSS=true)
3. MiniMax (USE_MINIMAX=true)
4. Gemini (USE_GEMINI=true)
5. LM Studio (USE_LM_STUDIO=true)
6. OpenRouter (padrão)

## 📈 Comparação de Modelos

| Modelo | Parâmetros | Contexto | Velocidade | Custo | Qualidade |
|--------|-----------|----------|------------|-------|-----------|
| **Qwen3-235B-A22B** | 235B (22B ativos) | 32k-131k | Médio | Gratuito* | ⭐⭐⭐⭐⭐ |
| GPT-OSS-120B | 120B | 128k | Rápido | Gratuito* | ⭐⭐⭐⭐ |
| Gemini 2.5 Flash | ? | 1M | Muito Rápido | Gratuito** | ⭐⭐⭐⭐ |
| MiniMax M2 | ? | 200k | Rápido | Gratuito** | ⭐⭐⭐⭐ |

*Via Hugging Face (rate limits aplicam)
**Com limites de quota

## 🐛 Troubleshooting

### Erro: "Model is loading"
- **Causa:** Modelo sendo carregado no servidor HF
- **Solução:** Aguardar 1-2 minutos

### Erro: "Rate limit exceeded"
- **Causa:** Limite de requisições gratuitas excedido
- **Solução:** Aguardar ou usar outro provedor

### Resposta truncada
- **Causa:** Resposta muito longa
- **Solução:** Aumentar QWEN_MAX_CONTEXT ou reduzir batch size

### Qualidade baixa
- **Causa:** Modo não-pensante para tarefa complexa
- **Solução:** Ativar QWEN_ENABLE_THINKING=true

## 📚 Recursos Adicionais

- [Documentação Oficial Qwen3](https://github.com/QwenLM/Qwen3)
- [Model Card no Hugging Face](https://huggingface.co/Qwen/Qwen3-235B-A22B)
- [Paper YaRN](https://arxiv.org/abs/2309.00071)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/index)

## ✅ Checklist de Implementação

- [x] Criar qwenClient.ts
- [x] Atualizar .env com variáveis do Qwen3
- [x] Atualizar .env.example
- [x] Integrar em categorizationRoutes.ts
- [x] Criar documentação completa (QWEN3_SETUP.md)
- [x] Criar guia rápido (QWEN_QUICKSTART.md)
- [x] Criar script de teste (test-qwen.ts)
- [x] Adicionar script no package.json
- [x] Documentar changelog

## 🎉 Próximos Passos

1. Testar integração: `npm run test:qwen`
2. Ativar no .env: `USE_QWEN=true`
3. Processar batch de questões
4. Monitorar performance e qualidade
5. Ajustar parâmetros conforme necessário

## 📝 Notas

- O YaRN já está implementado no modelo, basta ajustar QWEN_MAX_CONTEXT
- Modo não-pensante é recomendado para categorização de questões
- Modo pensante é melhor para análise complexa e raciocínio
- Rate limits do Hugging Face aplicam (considerar HF Pro se necessário)
- Suporte a imagens está implementado mas pode ter limitações na API gratuita

## 🤝 Contribuições

Para melhorias ou problemas:
1. Testar com `npm run test:qwen`
2. Verificar logs do backend
3. Consultar documentação em `docs/QWEN3_SETUP.md`
4. Abrir issue com detalhes do problema
