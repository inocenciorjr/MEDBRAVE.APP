# Qwen3-235B-A22B Setup Guide

## Visão Geral

O Qwen3-235B-A22B é um modelo de linguagem de última geração com 235B parâmetros totais e 22B ativos (MoE - Mixture of Experts). Ele oferece recursos avançados de raciocínio e suporte multilíngue.

## Características Principais

- **235B parâmetros totais, 22B ativos**: Arquitetura MoE eficiente
- **Contexto extensível**: 32.768 tokens nativamente, até 131.072 com YaRN
- **Modo de pensamento**: Pode alternar entre modo de raciocínio complexo e diálogo eficiente
- **Suporte multilíngue**: 100+ idiomas e dialetos
- **Visão**: Suporte para análise de imagens médicas

## Configuração

### 1. Obter API Key do Hugging Face

1. Acesse https://huggingface.co/settings/tokens
2. Crie um novo token com permissões de leitura
3. Copie o token (formato: `hf_...`)

### 2. Configurar .env

```bash
# Ativar Qwen3
USE_QWEN=true

# API Key do Hugging Face
QWEN_API_KEY=hf_seu_token_aqui

# Modelo (não alterar)
QWEN_MODEL=Qwen/Qwen3-235B-A22B
QWEN_BASE_URL=https://api-inference.huggingface.co/models/Qwen/Qwen3-235B-A22B/v1

# Modo de pensamento
# false = modo eficiente para diálogo geral (recomendado para categorização)
# true = modo de raciocínio para problemas complexos
QWEN_ENABLE_THINKING=false

# Comprimento máximo de contexto
# 32768 = nativo (recomendado)
# 131072 = com YaRN (para textos muito longos)
QWEN_MAX_CONTEXT=32768
```

### 3. Desativar outros provedores

```bash
USE_GEMINI=false
USE_GPT_OSS=false
USE_MINIMAX=false
USE_LM_STUDIO=false
```

## Modos de Operação

### Modo Não-Pensante (Padrão)

Recomendado para categorização de questões médicas:

```bash
QWEN_ENABLE_THINKING=false
```

**Parâmetros de amostragem:**
- Temperature: 0.7
- Top P: 0.8
- Top K: 20
- Min P: 0

**Vantagens:**
- Respostas mais rápidas
- Mais eficiente para tarefas de classificação
- Menor uso de tokens

### Modo Pensante

Para problemas complexos de raciocínio:

```bash
QWEN_ENABLE_THINKING=true
```

**Parâmetros de amostragem:**
- Temperature: 0.6
- Top P: 0.95
- Top K: 20
- Min P: 0

**Vantagens:**
- Raciocínio mais profundo
- Melhor para matemática e código
- Gera blocos `<think>...</think>` com o processo de pensamento

**Desvantagens:**
- Mais lento
- Usa mais tokens
- Pode gerar repetições se usar decodificação gananciosa

## YaRN (Yet another RoPE extensioN method)

O YaRN é uma técnica de extensão de contexto que permite ao modelo processar até 131.072 tokens.

### Quando usar YaRN?

- Questões com enunciados muito longos (>10.000 palavras)
- Análise de múltiplas imagens complexas
- Contexto histórico extenso

### Como ativar?

```bash
QWEN_MAX_CONTEXT=131072
```

**Nota:** O YaRN já está implementado no modelo. Você só precisa ajustar o parâmetro de contexto máximo.

## Melhores Práticas

### Para Categorização de Questões

1. **Use modo não-pensante**: Mais rápido e eficiente
2. **Contexto de 32.768 tokens**: Suficiente para a maioria das questões
3. **Batch size de 5-10**: Equilíbrio entre velocidade e qualidade
4. **Padronize o formato de saída**: Use prompts claros para JSON

### Para Análise de Imagens

1. **Formato suportado**: JPEG, PNG, GIF, WebP
2. **Tamanho recomendado**: Até 2MB por imagem
3. **Contexto claro**: Sempre forneça contexto médico relevante

### Evitar Repetições Infinitas

Se o modelo entrar em loop de repetição:

1. **Não use decodificação gananciosa** (temperature > 0)
2. **Ajuste presence_penalty**: Entre 0 e 2
3. **Reduza max_tokens**: Limite a saída

## Comparação com Outros Modelos

| Modelo | Parâmetros | Contexto | Velocidade | Custo |
|--------|-----------|----------|------------|-------|
| Qwen3-235B-A22B | 235B (22B ativos) | 32k-131k | Médio | Gratuito* |
| GPT-OSS-120B | 120B | 128k | Rápido | Gratuito* |
| Gemini 2.5 Flash | ? | 1M | Muito Rápido | Gratuito** |
| MiniMax M2 | ? | 200k | Rápido | Gratuito** |

*Via Hugging Face Inference API (rate limits aplicam)
**Com limites de quota

## Troubleshooting

### Erro: "Model is loading"

O modelo está sendo carregado no servidor do Hugging Face. Aguarde 1-2 minutos e tente novamente.

### Erro: "Rate limit exceeded"

Você excedeu o limite de requisições gratuitas. Opções:
1. Aguarde alguns minutos
2. Use outro provedor temporariamente
3. Considere Hugging Face Pro para limites maiores

### Resposta truncada

Se a resposta for cortada:
1. Aumente `QWEN_MAX_CONTEXT`
2. Reduza o tamanho do batch
3. Simplifique o prompt

### Qualidade baixa

Se as categorizações estiverem ruins:
1. Ative modo pensante: `QWEN_ENABLE_THINKING=true`
2. Ajuste temperature para 0.6
3. Forneça mais exemplos no prompt

## Recursos Adicionais

- [Documentação oficial Qwen3](https://github.com/QwenLM/Qwen3)
- [Hugging Face Model Card](https://huggingface.co/Qwen/Qwen3-235B-A22B)
- [Paper YaRN](https://arxiv.org/abs/2309.00071)

## Suporte

Para problemas específicos do Qwen3, consulte:
- GitHub Issues: https://github.com/QwenLM/Qwen3/issues
- Hugging Face Discussions: https://huggingface.co/Qwen/Qwen3-235B-A22B/discussions
