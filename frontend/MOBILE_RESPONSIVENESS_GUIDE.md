# Guia de Responsividade Mobile - MedBRAVE

## Problema Identificado

O frontend estava completamente sem responsividade mobile:
- Sidebar sempre visível ocupando espaço
- Sem menu hamburger
- Grids não adaptavam para mobile
- Elementos se sobrepondo
- Botões empilhados sem espaçamento adequado

## Solução Implementada

### 1. Hook de Media Query (`useMediaQuery.ts`)

```typescript
import { useIsMobile } from '@/hooks/useMediaQuery';

const isMobile = useIsMobile(); // true se width <= 768px
```

### 2. MainLayout Responsivo

**Desktop:**
- Sidebar colapsada (96px) sempre visível
- Expande ao hover
- Conteúdo com `pl-24` (padding-left)

**Mobile:**
- Sidebar escondida por padrão
- Abre com overlay ao clicar no hamburger
- Sem padding-left no conteúdo
- Fecha ao clicar em link ou overlay

### 3. Sidebar Responsivo

**Desktop:**
- Hover para expandir
- Largura: 80px colapsada, 288px expandida

**Mobile:**
- Slide from left
- Sempre expandida quando aberta
- Botão X para fechar
- Overlay escuro no fundo

### 4. Header Responsivo

**Mobile:**
- Botão hamburger visível
- Texto menor e adaptado
- Avatar e notificações mantidos

**Desktop:**
- Sem botão hamburger
- Layout horizontal completo

## Breakpoints Padrão

```css
/* Mobile */
max-width: 768px

/* Tablet */
min-width: 769px and max-width: 1024px

/* Desktop */
min-width: 1025px
```

## Classes Tailwind Responsivas

### Spacing
```tsx
// Mobile: 16px, Desktop: 32px
className="gap-4 md:gap-8"
className="p-4 md:p-8"
className="space-y-4 md:space-y-8"
```

### Typography
```tsx
// Mobile: text-xl, Desktop: text-3xl
className="text-xl md:text-2xl lg:text-3xl"
```

### Grid Layouts
```tsx
// Mobile: 1 coluna, Desktop: 12 colunas
className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8"

// Mobile: 1 coluna, Tablet+: 2 colunas
className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8"
```

### Visibility
```tsx
// Esconder no mobile
className="hidden md:block"

// Mostrar apenas no mobile
className="md:hidden"
```

### Padding/Margin Condicional
```tsx
// Sem padding no mobile, com padding no desktop
className={isMobile ? '' : 'pl-24'}
```

## Checklist para Tornar Páginas Responsivas

### 1. Layout Container
- [ ] Usar `grid-cols-1 lg:grid-cols-12` ao invés de `grid-cols-12`
- [ ] Ajustar gaps: `gap-4 md:gap-8`
- [ ] Remover larguras fixas, usar `w-full` ou flex

### 2. Cards e Componentes
- [ ] Padding responsivo: `p-4 md:p-6`
- [ ] Texto responsivo: `text-sm md:text-base`
- [ ] Botões full-width no mobile: `w-full md:w-auto`

### 3. Formulários
- [ ] Inputs full-width no mobile
- [ ] Botões empilhados: `flex-col md:flex-row`
- [ ] Labels acima dos inputs no mobile

### 4. Tabelas
- [ ] Usar scroll horizontal: `overflow-x-auto`
- [ ] Ou converter para cards no mobile
- [ ] Esconder colunas menos importantes: `hidden md:table-cell`

### 5. Modais
- [ ] Full-screen no mobile: `w-full h-full md:w-auto md:h-auto`
- [ ] Padding reduzido: `p-4 md:p-6`
- [ ] Botões empilhados

### 6. Imagens
- [ ] Usar `w-full` e `h-auto`
- [ ] Aspect ratio adequado
- [ ] Lazy loading

## Exemplos de Conversão

### Antes (Não Responsivo)
```tsx
<div className="grid grid-cols-12 gap-8">
  <div className="col-span-8">
    <div className="p-8">
      <h1 className="text-3xl">Título</h1>
      <div className="flex gap-6">
        <button className="px-6 py-3">Botão 1</button>
        <button className="px-6 py-3">Botão 2</button>
      </div>
    </div>
  </div>
  <div className="col-span-4">Sidebar</div>
</div>
```

### Depois (Responsivo)
```tsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
  <div className="lg:col-span-8">
    <div className="p-4 md:p-8">
      <h1 className="text-xl md:text-2xl lg:text-3xl">Título</h1>
      <div className="flex flex-col md:flex-row gap-3 md:gap-6">
        <button className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3">
          Botão 1
        </button>
        <button className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3">
          Botão 2
        </button>
      </div>
    </div>
  </div>
  <div className="lg:col-span-4">Sidebar</div>
</div>
```

## Páginas que Precisam de Atualização

1. `/flashcards` - Cards de flashcards, botões de resposta
2. `/resolucao-questoes` - Área de questões, botões de alternativas
3. `/lista-questoes` - Tabela de listas, filtros
4. `/banco-questoes` - Grid de questões, filtros laterais
5. `/caderno-erros` - Lista de erros, cards
6. `/revisoes` - Cards de revisão, calendário
7. `/planner` - Calendário, eventos
8. `/statistics` - Gráficos, métricas
9. `/simulados` - Cards de simulados
10. `/prova-integra` - Visualização de provas

## Testes Recomendados

1. **Chrome DevTools**
   - F12 > Toggle device toolbar
   - Testar em: iPhone SE, iPhone 12 Pro, iPad, Desktop

2. **Breakpoints Críticos**
   - 320px (iPhone SE)
   - 375px (iPhone 12)
   - 768px (iPad portrait)
   - 1024px (iPad landscape)
   - 1440px (Desktop)

3. **Orientação**
   - Portrait e Landscape
   - Rotação de dispositivo

## Próximos Passos

1. Aplicar responsividade em todas as 42 páginas
2. Testar em dispositivos reais
3. Ajustar componentes específicos (flashcards, questões)
4. Otimizar performance mobile
5. Adicionar gestos touch (swipe, pinch)
