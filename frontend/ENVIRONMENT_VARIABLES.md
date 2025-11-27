# 🔐 Guia de Variáveis de Ambiente - MedBrave Frontend

## 📋 Visão Geral

O Next.js usa diferentes arquivos `.env` para gerenciar variáveis de ambiente em diferentes contextos. Este guia explica como funciona e qual arquivo você precisa.

## 📁 Tipos de Arquivos .env

### `.env.local` ✅ **VOCÊ PRECISA DESTE**
- **Uso:** Desenvolvimento local (sua máquina)
- **Conteúdo:** Credenciais reais e sensíveis
- **Git:** ❌ NUNCA commitar (já está no .gitignore)
- **Criado:** ✅ Sim, já foi criado com suas credenciais

### `.env.example` ✅ **CRIADO COMO TEMPLATE**
- **Uso:** Template para outros desenvolvedores
- **Conteúdo:** Exemplos sem valores reais
- **Git:** ✅ Pode commitar (não tem dados sensíveis)
- **Criado:** ✅ Sim, já foi criado

### `.env` (opcional)
- **Uso:** Valores padrão para todos os ambientes
- **Conteúdo:** Configurações não-sensíveis
- **Git:** ⚠️ Depende (geralmente não)
- **Necessário:** ❌ Não, o .env.local é suficiente

### `.env.production` (opcional)
- **Uso:** Apenas em produção
- **Conteúdo:** Configurações de produção
- **Git:** ❌ Não commitar
- **Necessário:** ❌ Não, use variáveis de ambiente da plataforma (Vercel, etc)

### `.env.development` (opcional)
- **Uso:** Apenas em desenvolvimento
- **Conteúdo:** Configurações de dev
- **Git:** ⚠️ Depende
- **Necessário:** ❌ Não, o .env.local sobrescreve este

## 🎯 O Que Você Precisa Fazer

### 1. Verificar se o .env.local existe ✅
```bash
# No terminal, dentro da pasta frontend
ls -la .env.local
# ou no Windows
dir .env.local
```

**Status:** ✅ Já foi criado automaticamente com suas credenciais do Supabase!

### 2. Se precisar recriar o .env.local

Se por algum motivo você precisar recriar:

```bash
# Copie o template
cp .env.example .env.local

# Edite e adicione suas credenciais reais
# No Windows: notepad .env.local
# No Mac/Linux: nano .env.local
```

### 3. Obter suas credenciais do Supabase

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: Settings → API
4. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📊 Ordem de Prioridade

O Next.js carrega os arquivos nesta ordem (último sobrescreve o anterior):

```
1. .env                    (todos os ambientes)
2. .env.development        (apenas dev)
   ou .env.production      (apenas prod)
3. .env.local             (todos os ambientes, MAIOR PRIORIDADE)
```

**Resultado:** `.env.local` sempre vence! 🏆

## 🔒 Segurança

### ✅ O Que Está Protegido

1. **`.env.local` no .gitignore**
   ```gitignore
   # env files (can opt-in for committing if needed)
   .env*
   ```
   ✅ Todas as variações de .env estão protegidas

2. **Prefixo NEXT_PUBLIC_**
   - Variáveis com `NEXT_PUBLIC_` são expostas ao navegador
   - Variáveis sem prefixo ficam apenas no servidor
   - ✅ Usamos `NEXT_PUBLIC_` porque são chaves públicas do Supabase

3. **Chave Anônima vs Chave de Serviço**
   - ✅ Usamos a chave **anônima** (segura para expor)
   - ❌ NUNCA use a chave de **serviço** no frontend

### ⚠️ Avisos de Segurança

```typescript
// ✅ CORRETO - Chave anônima no frontend
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

// ❌ ERRADO - Nunca faça isso!
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=eyJhbGc...  // PERIGO!
DATABASE_PASSWORD=senha123                    // PERIGO!
```

## 🚀 Como Usar as Variáveis

### No Código TypeScript/JavaScript

```typescript
// ✅ Variáveis com NEXT_PUBLIC_ funcionam no cliente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ❌ Variáveis sem NEXT_PUBLIC_ retornam undefined no cliente
const secretKey = process.env.SECRET_KEY; // undefined no navegador
```

### Validação Automática

O código já valida se as variáveis existem:

```typescript
// Em config/supabase.ts
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis de ambiente faltando!');
}
```

## 🔄 Quando Reiniciar o Servidor

Você DEVE reiniciar o servidor de desenvolvimento quando:

- ✅ Criar ou modificar qualquer arquivo `.env*`
- ✅ Adicionar novas variáveis
- ✅ Mudar valores de variáveis existentes

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
npm run dev
```

## 📝 Checklist de Configuração

- [x] `.env.local` criado com credenciais reais
- [x] `.env.example` criado como template
- [x] `.env*` está no `.gitignore`
- [x] Variáveis usam prefixo `NEXT_PUBLIC_`
- [x] Apenas chave anônima (não service key)
- [x] Validação de variáveis implementada
- [ ] Servidor reiniciado após criar .env.local

## 🐛 Troubleshooting

### Erro: "Variáveis de ambiente faltando"

**Causa:** O .env.local não existe ou está vazio

**Solução:**
```bash
# Verificar se existe
cat .env.local  # Mac/Linux
type .env.local # Windows

# Se não existir, copiar do template
cp .env.example .env.local

# Editar e adicionar credenciais reais
```

### Erro: "process.env.NEXT_PUBLIC_SUPABASE_URL is undefined"

**Causa:** Servidor não foi reiniciado após criar .env.local

**Solução:**
```bash
# Parar o servidor (Ctrl+C)
npm run dev
```

### Variáveis não estão sendo lidas

**Causa:** Nome do arquivo errado ou localização errada

**Solução:**
- ✅ Arquivo deve estar em: `frontend/.env.local`
- ✅ Nome exato: `.env.local` (com ponto no início)
- ✅ Não pode ser: `env.local` ou `.env-local`

## 🌐 Deploy em Produção

### Vercel (Recomendado)

1. Vá em: Project Settings → Environment Variables
2. Adicione cada variável:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL`
3. ✅ Não precisa do arquivo .env.local em produção

### Outras Plataformas

- **Netlify:** Site Settings → Environment Variables
- **Railway:** Variables tab
- **AWS Amplify:** Environment Variables section

## 📚 Recursos

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Client Keys](https://supabase.com/docs/guides/api/api-keys)
- [Environment Variables Best Practices](https://12factor.net/config)

## ✅ Status Atual

**Arquivos Criados:**
- ✅ `frontend/.env.local` - Com suas credenciais reais
- ✅ `frontend/.env.example` - Template para outros devs
- ✅ `frontend/.gitignore` - Protegendo arquivos .env*

**Próximos Passos:**
1. Reinicie o servidor de desenvolvimento: `npm run dev`
2. Verifique se não há avisos no console
3. Teste o login na aplicação

**Tudo pronto para uso! 🎉**
