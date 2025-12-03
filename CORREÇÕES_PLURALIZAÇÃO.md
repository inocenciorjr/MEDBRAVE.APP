# Correções de Pluralização e Otimizações

## Arquivos Corrigidos
1. ✅ `frontend/lib/utils/pluralize.ts` - Criado
2. ✅ `frontend/components/mentor/mentorados/detail/tabs/MenteePerformanceTab.tsx` - Parcialmente corrigido

## Correções Pendentes

### MenteePerformanceTab.tsx
- Linha 612: `{aggregate?.totalQuestions || 0} questões` → usar `pluralizeCommon.questao()`
- Linha 656: `{stat.totalAnswered} questões` → usar `pluralizeCommon.questao()`

### SimuladoSubspecialtyCharts.tsx  
- Linha 248: `{aggregate?.totalQuestions || 0} questões` → usar `pluralizeCommon.questao()`
- Linha 307: `{stat.totalQuestions} questões` → usar `pluralizeCommon.questao()`

### Outros componentes a verificar
- MenteeOverviewTab.tsx
- MenteeSimuladosTab.tsx
- SimuladoAnalyticsTab.tsx
- Todos os cards de estatísticas

## Otimizações de Performance

### 1. Queries Múltiplas
- **MentorAnalyticsService**: Já otimizado com queries únicas
- **MenteeDetailPage**: Carrega performance separadamente (OK)

### 2. Re-renders Desnecessários
- Usar `useMemo` para cálculos pesados ✅ (já implementado)
- Usar `useCallback` para funções passadas como props

### 3. Animações
- Evitar animações em listas grandes
- Usar `will-change` com cuidado
- Preferir `transform` e `opacity` para animações

### 4. Lazy Loading
- Considerar lazy loading para tabs não ativas
- Virtualização para listas longas de questões

## Recomendações Implementadas
1. ✅ Função de pluralização centralizada
2. ✅ Performance por especialidade separada de subespecialidade
3. ✅ Layout responsivo sem max-width restritivo
