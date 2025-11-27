# 🗺️ Mapeamento Completo - Frontend Plan Protection

## 📊 VISÃO GERAL

**Total de Páginas**: 47 páginas principais
**Páginas que precisam proteção**: 42 páginas
**Páginas públicas**: 5 páginas

## 🔐 PÁGINAS QUE PRECISAM PROTEÇÃO (42)

### 1. Banco de Questões (3 páginas)
- ✅ `/banco-questoes` - Lista de questões
  - **Limite**: `maxQuestionsPerDay`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/banco-questoes/criar` - Criar lista
  - **Feature**: `canCreateCustomLists`
  - **Componente**: Adicionar `<PlanGuard>`
  
- ✅ `/banco-questoes/criar/[step]` - Steps de criação
  - **Feature**: `canCreateCustomLists`
  - **Componente**: Adicionar `<PlanGuard>`

### 2. Caderno de Erros (4 páginas)
- ✅ `/caderno-erros` - Dashboard
  - **Feature**: `canUseErrorNotebook`
  - **Componente**: Adicionar `<PlanGuard>`
  
- ✅ `/caderno-erros/[id]` - Visualizar entrada
  - **Feature**: `canUseErrorNotebook`
  - **Componente**: Adicionar `<PlanGuard>`
  
- ✅ `/caderno-erros/sessao` - Sessão de revisão
  - **Feature**: `canUseErrorNotebook`
  - **Limite**: `maxReviewsPerDay`
  - **Componente**: Adicionar `<PlanGuard>` + `<LimitGuard>`
  
- ✅ `/caderno-erros/sessao/[sessionId]` - Sessão específica
  - **Feature**: `canUseErrorNotebook`
  - **Componente**: Adicionar `<PlanGuard>`

### 3. Flashcards (8 páginas)
- ✅ `/flashcards` - Dashboard
  - **Limite**: `maxFlashcardsCreated`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/flashcards/colecoes` - Minhas coleções
  - **Limite**: `maxFlashcardDecks`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/flashcards/colecoes/[id]` - Visualizar coleção
  - **Limite**: `maxFlashcardDecks`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/flashcards/comunidade` - Explorar comunidade
  - **Público**: Pode ver, mas não importar sem plano
  - **Componente**: Botão de importar com `<PlanGuard>`
  
- ✅ `/flashcards/comunidade/especialidade` - Por especialidade
  - **Público**: Pode ver, mas não importar sem plano
  - **Componente**: Botão de importar com `<PlanGuard>`
  
- ✅ `/flashcards/estudo/[deckId]` - Estudar deck
  - **Limite**: `maxReviewsPerDay`
  - **Componente**: Adicionar `<LimitGuard>`

### 4. Lista de Questões (3 páginas)
- ✅ `/lista-questoes` - Dashboard
  - **Feature**: `canCreateCustomLists`
  - **Componente**: Botão criar com `<PlanGuard>`
  
- ✅ `/lista-questoes/minhas-listas` - Minhas listas
  - **Feature**: `canCreateCustomLists`
  - **Limite**: `maxQuestionListsPerDay`
  - **Componente**: Adicionar `<PlanGuard>` + `<LimitGuard>`

### 5. Official Exams (2 páginas)
- ✅ `/official-exams` - Lista de provas
  - **Requer plano ativo**
  - **Componente**: Adicionar `<PlanGuard>` na página inteira
  
- ✅ `/official-exams/[id]` - Visualizar prova
  - **Requer plano ativo**
  - **Componente**: Adicionar `<PlanGuard>`

### 6. Planner (1 página)
- ✅ `/planner` - Planejador de estudos
  - **Requer plano ativo**
  - **Componente**: Adicionar `<PlanGuard>`

### 7. Prova na Íntegra (2 páginas)
- ✅ `/prova-integra` - Lista de provas
  - **Requer plano ativo**
  - **Componente**: Adicionar `<PlanGuard>`
  
- ✅ `/prova-integra/[id]` - Resolver prova
  - **Requer plano ativo**
  - **Componente**: Adicionar `<PlanGuard>`

### 8. Resolução de Questões (2 páginas)
- ✅ `/resolucao-questoes` - Dashboard
  - **Limite**: `maxQuestionsPerDay`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/resolucao-questoes/[id]` - Resolver questão
  - **Limite**: `maxQuestionsPerDay`
  - **Componente**: Adicionar `<LimitGuard>`

### 9. Revisões (10 páginas)
- ✅ `/revisoes` - Dashboard de revisões
  - **Limite**: `maxReviewsPerDay`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/revisoes/caderno-erros/sessao` - Revisão caderno
  - **Feature**: `canUseErrorNotebook`
  - **Limite**: `maxReviewsPerDay`
  - **Componente**: Adicionar `<PlanGuard>` + `<LimitGuard>`
  
- ✅ `/revisoes/flashcards/atrasados` - Flashcards atrasados
  - **Limite**: `maxReviewsPerDay`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/revisoes/flashcards/estudar` - Estudar flashcards
  - **Limite**: `maxReviewsPerDay`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/revisoes/flashcards/sessao` - Sessão de flashcards
  - **Limite**: `maxReviewsPerDay`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/revisoes/gerenciar` - Gerenciar revisões
  - **Requer plano ativo**
  - **Componente**: Adicionar `<PlanGuard>`
  
- ✅ `/revisoes/questoes/sessao` - Sessão de questões
  - **Limite**: `maxReviewsPerDay`
  - **Componente**: Adicionar `<LimitGuard>`

### 10. Simulados (4 páginas)
- ✅ `/simulados` - Lista de simulados
  - **Limite**: `maxSimulatedExamsPerMonth`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/simulados/[id]/configurar` - Configurar simulado
  - **Limite**: `maxSimulatedExamsPerMonth`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/simulados/[id]/resolver` - Resolver simulado
  - **Limite**: `maxSimulatedExamsPerMonth`
  - **Componente**: Adicionar `<LimitGuard>`
  
- ✅ `/simulados/[id]/resultado` - Ver resultado
  - **Requer plano ativo**
  - **Componente**: Adicionar `<PlanGuard>`

### 11. Statistics (1 página)
- ✅ `/statistics` - Estatísticas
  - **Feature**: `canAccessAdvancedStatistics` (para features avançadas)
  - **Componente**: Seções avançadas com `<PlanGuard>`

### 12. Admin (15 páginas) - ADMIN APENAS
- ⚠️ `/admin/*` - Todas as páginas admin
  - **Requer**: Admin role
  - **Componente**: Já tem proteção de admin, adicionar verificação de plano

---

## ✅ PÁGINAS PÚBLICAS (5)

### 1. Autenticação
- 🌐 `/login` - Login
- 🌐 `/(auth)/login` - Login alternativo
- 🌐 `/auth/callback` - Callback OAuth

### 2. Home
- 🌐 `/` - Página inicial (dashboard)
  - **Nota**: Pode mostrar resumo, mas ações requerem plano

### 3. Debug/Demo
- 🌐 `/demo-loader` - Demo de loading
- 🌐 `/loading-demo` - Demo de loading

---

## 🎯 ESTRATÉGIA DE IMPLEMENTAÇÃO

### Fase 1: Componente 403 (PRIORIDADE MÁXIMA)
1. ✅ Criar `components/errors/PlanRequired403.tsx`
2. ✅ Criar `components/errors/LimitReached403.tsx`
3. ✅ Criar `components/errors/FeatureBlocked403.tsx`

### Fase 2: Wrapper Global (PRIORIDADE ALTA)
1. ✅ Criar `components/guards/PagePlanGuard.tsx`
   - Wrapper que envolve páginas inteiras
   - Detecta erro 403 automaticamente
   - Mostra componente 403 apropriado

### Fase 3: Integração por Categoria (PRIORIDADE ALTA)
1. ✅ Banco de Questões (3 páginas)
2. ✅ Flashcards (8 páginas)
3. ✅ Simulados (4 páginas)
4. ✅ Revisões (10 páginas)
5. ✅ Caderno de Erros (4 páginas)
6. ✅ Official Exams (2 páginas)
7. ✅ Outras (11 páginas)

### Fase 4: Testes (PRIORIDADE MÉDIA)
1. ✅ Testar cada página sem plano
2. ✅ Testar limites atingidos
3. ✅ Testar features bloqueadas
4. ✅ Testar navegação entre páginas

---

## 📝 TEMPLATE DE IMPLEMENTAÇÃO

### Para Página Inteira (Requer Plano Ativo)
```tsx
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';

export default function MyPage() {
  return (
    <PagePlanGuard>
      {/* Conteúdo da página */}
    </PagePlanGuard>
  );
}
```

### Para Feature Específica
```tsx
import { PlanGuard } from '@/components/guards/PlanGuard';

export default function MyPage() {
  return (
    <div>
      <PlanGuard feature="canCreateCustomLists">
        <CreateListButton />
      </PlanGuard>
    </div>
  );
}
```

### Para Limite de Uso
```tsx
import { LimitGuard } from '@/components/guards/LimitGuard';

export default function MyPage() {
  const questionsToday = 15; // Buscar do backend
  
  return (
    <LimitGuard limit="maxQuestionsPerDay" currentUsage={questionsToday}>
      <QuestionList />
    </LimitGuard>
  );
}
```

---

## 🚨 COMPORTAMENTO ESPERADO

### Quando Usuário SEM Plano Ativo Acessa:
1. **Página carrega normalmente** (sem flash)
2. **Faz request ao backend** (GET /official-exams)
3. **Backend retorna 403** com mensagem
4. **Frontend detecta 403** automaticamente
5. **Mostra componente 403** com leão piscando
6. **Sidebar permanece visível** (navegação)
7. **Botão de tema permanece** (UX)

### Componente 403 Mostra:
- 🦁 Leão com olhos piscando (animação)
- 🚧 Barreira "NO ENTRY"
- 📝 Mensagem: "Não identificamos um plano ativo"
- 🔗 Botão: "Adquirir um Plano" → `/planos`
- 🎨 Nuvens e tijolos (design do HTML)

---

## 📊 ESTATÍSTICAS

- **Total de Páginas**: 47
- **Páginas Protegidas**: 42 (89%)
- **Páginas Públicas**: 5 (11%)
- **Features Usadas**: 7
- **Limites Usados**: 11

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Componentes Base
- [ ] PlanRequired403.tsx
- [ ] LimitReached403.tsx
- [ ] FeatureBlocked403.tsx
- [ ] PagePlanGuard.tsx

### Páginas por Categoria
- [ ] Banco de Questões (3/3)
- [ ] Caderno de Erros (4/4)
- [ ] Flashcards (8/8)
- [ ] Lista de Questões (3/3)
- [ ] Official Exams (2/2)
- [ ] Planner (1/1)
- [ ] Prova na Íntegra (2/2)
- [ ] Resolução de Questões (2/2)
- [ ] Revisões (10/10)
- [ ] Simulados (4/4)
- [ ] Statistics (1/1)
- [ ] Admin (15/15)

### Testes
- [ ] Teste sem plano ativo
- [ ] Teste com plano FREE
- [ ] Teste com plano TRIAL
- [ ] Teste limites atingidos
- [ ] Teste features bloqueadas
- [ ] Teste navegação
- [ ] Teste cache (30s)

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Criar componente PlanRequired403
2. ✅ Criar PagePlanGuard wrapper
3. ✅ Implementar em 1 página de teste
4. ✅ Validar funcionamento
5. ✅ Aplicar em todas as 42 páginas
6. ✅ Testar cada categoria
7. ✅ Documentar comportamento
8. ✅ Deploy gradual
