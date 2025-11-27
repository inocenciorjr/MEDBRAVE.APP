# 🛡️ Guia de Implementação - Proteção de Planos no Frontend

## ✅ O QUE FOI CRIADO

### 1. Componentes Base
- ✅ `components/errors/PlanRequired403.tsx` - Componente 403 com leão piscando
- ✅ `components/guards/PagePlanGuard.tsx` - Wrapper automático para páginas
- ✅ `components/guards/PlanGuard.tsx` - Guard para features específicas
- ✅ `components/guards/LimitGuard.tsx` - Guard para limites de uso

### 2. Hooks & Context
- ✅ `contexts/PlanContext.tsx` - Context global de planos
- ✅ `hooks/usePlan.ts` - Hook principal de planos
- ✅ `services/planService.ts` - Serviço de API
- ✅ `types/plan.ts` - Types TypeScript

### 3. Documentação
- ✅ `FRONTEND_PLAN_MAPPING.md` - Mapeamento completo (47 páginas)
- ✅ `SECURITY_ARCHITECTURE.md` - Arquitetura de segurança
- ✅ `PLAN_FRONTEND_IMPLEMENTATION.md` - Plano de implementação

## 🎯 COMO FUNCIONA

### Fluxo Automático

```
1. Usuário acessa /prova-integra
   ↓
2. PagePlanGuard verifica plano (cache 30s)
   ↓
3a. TEM PLANO ATIVO → Mostra página normal
3b. SEM PLANO ATIVO → Mostra componente 403
   ↓
4. Página faz request ao backend
   ↓
5a. Backend retorna 200 OK → Tudo certo
5b. Backend retorna 403 → PagePlanGuard detecta e mostra 403
```

### Componente 403

O componente mostra:
- 🦁 **Leão roxo** com olhos piscando (animação)
- 🚧 **Barreira amarela** com "NO ENTRY"
- ☁️ **Nuvens** no fundo
- 🧱 **Tijolos** no chão (perspectiva 3D)
- 📝 **Mensagem**: "Não identificamos um plano ativo"
- 🔗 **Botão**: "Adquirir um Plano" → `/planos`
- 🎨 **Dark mode** suportado

## 📝 COMO APLICAR EM CADA PÁGINA

### Opção 1: Página Inteira (Requer Plano Ativo)

```tsx
// frontend/app/minha-pagina/page.tsx
'use client';

import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import MainLayout from '@/components/layout/MainLayout';

export default function MinhaPage() {
  return (
    <PagePlanGuard>
      <MainLayout>
        {/* Conteúdo da página */}
      </MainLayout>
    </PagePlanGuard>
  );
}
```

### Opção 2: Feature Específica

```tsx
// frontend/app/minha-pagina/page.tsx
'use client';

import { PlanGuard } from '@/components/guards/PlanGuard';

export default function MinhaPage() {
  return (
    <div>
      <h1>Minha Página</h1>
      
      {/* Botão protegido por feature */}
      <PlanGuard feature="canCreateCustomLists">
        <button>Criar Lista</button>
      </PlanGuard>
    </div>
  );
}
```

### Opção 3: Limite de Uso

```tsx
// frontend/app/minha-pagina/page.tsx
'use client';

import { LimitGuard } from '@/components/guards/LimitGuard';
import { useState, useEffect } from 'react';

export default function MinhaPage() {
  const [questionsToday, setQuestionsToday] = useState(0);
  
  // Buscar uso atual do backend
  useEffect(() => {
    // fetch('/api/usage/questions-today')...
  }, []);
  
  return (
    <LimitGuard limit="maxQuestionsPerDay" currentUsage={questionsToday}>
      <QuestionList />
    </LimitGuard>
  );
}
```

## 🗺️ PÁGINAS QUE PRECISAM PROTEÇÃO

### ✅ Já Implementado (1/42)
- ✅ `/prova-integra` - Provas na íntegra

### ⏳ Pendente (41/42)

#### Banco de Questões (3)
- [ ] `/banco-questoes`
- [ ] `/banco-questoes/criar`
- [ ] `/banco-questoes/criar/[step]`

#### Caderno de Erros (4)
- [ ] `/caderno-erros`
- [ ] `/caderno-erros/[id]`
- [ ] `/caderno-erros/sessao`
- [ ] `/caderno-erros/sessao/[sessionId]`

#### Flashcards (8)
- [ ] `/flashcards`
- [ ] `/flashcards/colecoes`
- [ ] `/flashcards/colecoes/[id]`
- [ ] `/flashcards/comunidade`
- [ ] `/flashcards/comunidade/especialidade`
- [ ] `/flashcards/estudo/[deckId]`

#### Lista de Questões (3)
- [ ] `/lista-questoes`
- [ ] `/lista-questoes/minhas-listas`

#### Official Exams (2)
- [ ] `/official-exams`
- [ ] `/official-exams/[id]`

#### Planner (1)
- [ ] `/planner`

#### Resolução de Questões (2)
- [ ] `/resolucao-questoes`
- [ ] `/resolucao-questoes/[id]`

#### Revisões (10)
- [ ] `/revisoes`
- [ ] `/revisoes/caderno-erros/sessao`
- [ ] `/revisoes/flashcards/atrasados`
- [ ] `/revisoes/flashcards/estudar`
- [ ] `/revisoes/flashcards/sessao`
- [ ] `/revisoes/gerenciar`
- [ ] `/revisoes/questoes/sessao`

#### Simulados (4)
- [ ] `/simulados`
- [ ] `/simulados/[id]/configurar`
- [ ] `/simulados/[id]/resolver`
- [ ] `/simulados/[id]/resultado`

#### Statistics (1)
- [ ] `/statistics`

#### Admin (15)
- [ ] `/admin/*` (todas as páginas admin)

## 🚀 PRÓXIMOS PASSOS

### 1. Testar Implementação Atual
```bash
# 1. Faça login com inocencio.123@gmail.com
# 2. Acesse /prova-integra
# 3. Deve mostrar componente 403 com leão
# 4. Clique em "Adquirir um Plano"
# 5. Deve redirecionar para /planos
```

### 2. Aplicar em Todas as Páginas
```bash
# Para cada página em FRONTEND_PLAN_MAPPING.md:
# 1. Abrir arquivo page.tsx
# 2. Importar PagePlanGuard
# 3. Envolver conteúdo com <PagePlanGuard>
# 4. Testar sem plano ativo
# 5. Marcar como concluído
```

### 3. Integrar com PlanContext
```tsx
// frontend/app/layout.tsx ou providers.tsx
import { PlanProvider } from '@/contexts/PlanContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {(token) => (
            <PlanProvider token={token}>
              {children}
            </PlanProvider>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 4. Criar Página de Planos
```bash
# Criar frontend/app/planos/page.tsx
# - Listar planos disponíveis (FREE, TRIAL, PRO)
# - Comparação de features
# - Botão de upgrade
# - Integração com pagamento
```

## 🧪 COMO TESTAR

### Teste 1: Sem Plano Ativo
```bash
1. Remover plano do usuário no banco
2. Fazer login
3. Acessar /prova-integra
4. Deve mostrar 403 com leão
5. Sidebar deve estar visível
6. Botão de tema deve funcionar
```

### Teste 2: Com Plano FREE
```bash
1. Atribuir plano FREE ao usuário
2. Fazer login
3. Acessar /prova-integra
4. Deve mostrar página normal
5. Tentar criar lista customizada
6. Deve mostrar 403 (feature bloqueada)
```

### Teste 3: Com Plano TRIAL
```bash
1. Atribuir plano TRIAL ao usuário
2. Fazer login
3. Acessar todas as páginas
4. Tudo deve funcionar (acesso completo)
```

### Teste 4: Limite Atingido
```bash
1. Usuário com plano FREE
2. Responder 10 questões (limite)
3. Tentar responder 11ª questão
4. Deve mostrar aviso de limite
5. Deve bloquear ação
```

## 📊 ESTATÍSTICAS

- **Total de Páginas**: 47
- **Páginas Protegidas**: 42 (89%)
- **Páginas Públicas**: 5 (11%)
- **Implementadas**: 1 (2%)
- **Pendentes**: 41 (98%)

## 🎨 CUSTOMIZAÇÃO

### Mudar Mensagem do 403
```tsx
<PagePlanGuard customMessage="Você precisa de um plano PRO para acessar esta página">
  <MyPage />
</PagePlanGuard>
```

### Desabilitar Verificação (Debug)
```tsx
<PagePlanGuard requireActivePlan={false}>
  <MyPage />
</PagePlanGuard>
```

## 🔧 TROUBLESHOOTING

### Problema: 403 não aparece
**Solução**: Verificar se PlanProvider está no layout raiz

### Problema: Cache desatualizado
**Solução**: Aguardar 30 segundos ou limpar cache manualmente

### Problema: Sidebar não aparece no 403
**Solução**: Componente 403 é fullscreen, sidebar não deve aparecer

### Problema: Botão "Adquirir Plano" não funciona
**Solução**: Criar página `/planos` primeiro

## 📚 REFERÊNCIAS

- [Mapeamento Completo](./FRONTEND_PLAN_MAPPING.md)
- [Arquitetura de Segurança](./SECURITY_ARCHITECTURE.md)
- [Backend Implementation](../BACKEND/PLAN_SYSTEM_SUMMARY.md)
- [Teste de Proteção](../BACKEND/test-plan-protection.md)
