# 📚 Guia Rápido - Git e GitHub

## 🎯 Primeira Vez (Setup Inicial)

### 1. Verificar se .gitignore está correto
```bash
# Deve ignorar .env, node_modules, etc
cat .gitignore
```

### 2. Inicializar Git (se ainda não fez)
```bash
git init
```

### 3. Adicionar todos os arquivos
```bash
git add .
```

### 4. Fazer primeiro commit
```bash
git commit -m "Initial commit - MEDBRAVE platform"
```

### 5. Criar repositório no GitHub
1. Acesse https://github.com
2. Clique em "New repository"
3. Nome: `medbrave` (ou outro nome)
4. **NÃO** marque "Initialize with README"
5. Clique em "Create repository"

### 6. Conectar com GitHub
```bash
# Substitua SEU-USUARIO pelo seu usuário do GitHub
git remote add origin https://github.com/SEU-USUARIO/medbrave.git
git branch -M main
git push -u origin main
```

## ✅ Verificar o que será commitado

**ANTES de fazer commit, SEMPRE verifique:**

```bash
# Ver arquivos modificados
git status

# Ver diferenças
git diff

# Verificar se .env NÃO está na lista
git status | grep .env
# Se aparecer .env, PARE! Não commite!
```

## 🚨 IMPORTANTE: Arquivos que NUNCA devem ser commitados

❌ **NUNCA commite:**
- `.env`
- `.env.local`
- `BACKEND/.env`
- `frontend/.env.local`
- Qualquer arquivo com senhas/chaves

✅ **Pode commitar:**
- `.env.example`
- Código fonte
- Documentação
- Configurações (sem senhas)

## 📝 Workflow Diário

### Fazer mudanças e commitar
```bash
# 1. Ver o que mudou
git status

# 2. Adicionar arquivos específicos
git add frontend/src/components/NovoComponente.tsx
git add BACKEND/src/controllers/NovoController.ts

# OU adicionar tudo (cuidado!)
git add .

# 3. Commitar com mensagem descritiva
git commit -m "Adiciona novo componente de dashboard"

# 4. Enviar para GitHub
git push
```

### Atualizar do GitHub (se trabalhar em múltiplos computadores)
```bash
git pull
```

## 🔄 Comandos Úteis

### Ver histórico de commits
```bash
git log --oneline
```

### Desfazer mudanças não commitadas
```bash
# Desfazer mudanças em um arquivo
git checkout -- arquivo.ts

# Desfazer TODAS as mudanças
git reset --hard
```

### Ver branches
```bash
git branch
```

### Criar nova branch (para features)
```bash
git checkout -b feature/nova-funcionalidade
```

### Voltar para main
```bash
git checkout main
```

## 🆘 Problemas Comuns

### "Commitei .env por engano!"
```bash
# 1. Remover do Git (mas manter no disco)
git rm --cached .env
git rm --cached frontend/.env.local
git rm --cached BACKEND/.env

# 2. Commitar a remoção
git commit -m "Remove arquivos .env do repositório"

# 3. Enviar
git push

# 4. IMPORTANTE: Trocar TODAS as senhas/chaves que estavam no .env!
```

### "Conflito ao fazer push"
```bash
# 1. Puxar mudanças do GitHub
git pull

# 2. Resolver conflitos manualmente nos arquivos
# 3. Adicionar arquivos resolvidos
git add .

# 4. Commitar
git commit -m "Resolve conflitos"

# 5. Enviar
git push
```

### "Esqueci de fazer pull antes de commitar"
```bash
# 1. Puxar com rebase
git pull --rebase

# 2. Se houver conflitos, resolver e:
git add .
git rebase --continue

# 3. Enviar
git push
```

## 📋 Checklist Antes de Cada Push

- [ ] `git status` - Verificar arquivos modificados
- [ ] Nenhum arquivo `.env` na lista
- [ ] Código testado localmente
- [ ] Build funcionando (`npm run build`)
- [ ] Mensagem de commit descritiva
- [ ] `git push`

## 🎓 Boas Práticas

### Mensagens de Commit
```bash
# ✅ Bom
git commit -m "Adiciona autenticação com Supabase"
git commit -m "Corrige bug no carregamento de questões"
git commit -m "Atualiza documentação de deploy"

# ❌ Ruim
git commit -m "fix"
git commit -m "mudanças"
git commit -m "aaa"
```

### Frequência de Commits
- Commite frequentemente (várias vezes por dia)
- Cada commit deve ser uma unidade lógica de mudança
- Não espere ter "tudo perfeito" para commitar

### Branches
- `main` - código em produção
- `develop` - desenvolvimento
- `feature/nome` - novas funcionalidades
- `fix/nome` - correções de bugs

## 🔗 Links Úteis

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

**Dica**: Salve este arquivo e consulte sempre que precisar! 📌
