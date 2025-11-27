# 📐 ANÁLISE COMPLETA DO DESIGN SYSTEM - PLANNER SEMANAL

## 🎨 1. SISTEMA DE CORES

### 1.1 Cores de Conteúdo (Content Types)
```typescript
// Cores para tipos de revisão do sistema
cyan: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200'     // Questões
purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'  // Flashcards
red: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'         // Caderno de Erros / Atrasadas

// Cores para tarefas do usuário
blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
green: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
yellow: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
orange: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
pink: 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200'
gray: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200'
```

### 1.2 Cores com Transparência (Para Cards com Progresso)
```typescript
// Versão semi-transparente para permitir visualização da barra de progresso
cyan: 'bg-cyan-100/60 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200'
purple: 'bg-purple-100/60 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
// ... (todas as cores com /60 no light e /30 no dark)
```

### 1.3 Cores da Barra de Progresso
```typescript
// Cores customizadas com contraste garantido
red: 'bg-progress-bar-red-light dark:bg-progress-bar-red-dark'
purple: 'bg-progress-bar-purple-light dark:bg-progress-bar-purple-dark'
cyan: 'bg-progress-bar-cyan-light dark:bg-progress-bar-cyan-dark'
blue: 'bg-progress-bar-blue-light dark:bg-progress-bar-blue-dark'
orange: 'bg-progress-bar-orange-light dark:bg-progress-bar-orange-dark'
pink: 'bg-progress-bar-pink-light dark:bg-progress-bar-pink-dark'

// Indicadores de progresso com brilho e animação
shadow-[4px_0_20px_rgba(220,38,38,1),2px_0_10px_rgba(220,38,38,0.8)]  // Red
shadow-[4px_0_20px_rgba(147,51,234,1),2px_0_10px_rgba(147,51,234,0.8)]  // Purple
// ... (cada cor com seu shadow específico)
```

## 🎭 2. TOKENS DO DESIGN SYSTEM

### 2.1 Cores de Superfície
```typescript
bg-surface-light dark:bg-surface-dark           // Superfícies principais
bg-background-light dark:bg-background-dark     // Backgrounds secundários
```

### 2.2 Cores de Borda
```typescript
border-border-light dark:border-border-dark     // Bordas padrão (2px)
border-border-light/50 dark:border-border-dark/50  // Bordas sutis
```

### 2.3 Cores de Texto
```typescript
text-text-light-primary dark:text-text-dark-primary       // Texto principal
text-text-light-secondary dark:text-text-dark-secondary   // Texto secundário
```

### 2.4 Cor Primária
```typescript
bg-primary                    // Cor primária sólida
bg-primary/90                 // Hover state
bg-primary/5 dark:bg-primary/10   // Background sutil
bg-primary/20                 // Background médio
text-primary                  // Texto primário
ring-primary/30               // Ring sutil
```

## 🌟 3. SOMBRAS E PROFUNDIDADE

### 3.1 Hierarquia de Sombras
```typescript
shadow-sm                                    // Sombra mínima
shadow-lg dark:shadow-dark-lg               // Sombra padrão
shadow-xl dark:shadow-dark-xl               // Sombra elevada
shadow-2xl dark:shadow-dark-2xl             // Sombra máxima

// Hover states
hover:shadow-xl dark:hover:shadow-dark-xl
hover:shadow-2xl dark:hover:shadow-dark-2xl
```

### 3.2 Aplicação de Sombras
- **Container principal**: `shadow-2xl dark:shadow-dark-2xl`
- **Headers**: `shadow-lg dark:shadow-dark-lg`
- **Cards de evento**: `shadow-lg dark:shadow-dark-lg` → `hover:shadow-xl dark:hover:shadow-dark-xl`
- **Botões**: `shadow-lg dark:shadow-dark-lg` → `hover:shadow-xl dark:hover:shadow-dark-xl`
- **Modais**: `shadow-2xl dark:shadow-dark-2xl`

## 🎬 4. ANIMAÇÕES E TRANSIÇÕES

### 4.1 Transições Padrão
```typescript
transition-all duration-200        // Transição rápida (hover, scale)
transition-all duration-300        // Transição média (movimento, cor)
transition-all duration-500        // Transição lenta (progresso)
transition-colors                  // Apenas cores
transition-transform              // Apenas transformações
transition-opacity                // Apenas opacidade
```

### 4.2 Easing Functions
```typescript
ease-out                          // Padrão para hover/scale
ease-in-out                       // Para movimentos suaves
```

### 4.3 Animações Específicas
```typescript
// Botão flutuante
hover:scale-110 hover:rotate-90 transition-all duration-300 ease-out

// Cards de evento
hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 ease-out

// Ícones
group-hover:scale-110 transition-transform duration-300
group-hover:rotate-12 transition-transform duration-300

// Progresso (slide up/down)
translate-y-0 opacity-75 → translate-y-full opacity-0  // Desce
translate-y-full opacity-0 → translate-y-0 opacity-100  // Sobe

// Pulse
animate-pulse                     // Para indicadores de tempo real

// Fade in
animate-fade-in                   // Para modais

// Zoom in
animate-zoom-in                   // Para conteúdo de modais

// Blink (tarefas atrasadas)
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
animation: blink 1.5s ease-in-out infinite
```

## 🎯 5. HOVER STATES

### 5.1 Headers e Células
```typescript
// Header de dias
hover:bg-primary/5 dark:hover:bg-primary/10
hover:shadow-lg dark:hover:shadow-dark-lg
group-hover:text-primary
group-hover:scale-105

// Células de horário
hover:bg-primary/10 hover:shadow-inner
```

### 5.2 Cards de Evento
```typescript
// Estado normal
cursor-grab
shadow-lg dark:shadow-dark-lg

// Hover
hover:shadow-xl dark:hover:shadow-dark-xl
hover:scale-[1.02]
hover:-translate-y-0.5
hover:z-50

// Dragging
cursor-grabbing
shadow-2xl dark:shadow-dark-2xl
opacity-90
scale-105
transition-none
```

### 5.3 Botões
```typescript
// Botão flutuante
hover:bg-primary/90
hover:scale-110
hover:rotate-90
hover:shadow-xl dark:hover:shadow-dark-xl

// Botões de ação
hover:scale-[1.02]
hover:shadow-xl dark:hover:shadow-dark-xl
```

## 📦 6. ARREDONDAMENTO (BORDER RADIUS)

### 6.1 Hierarquia de Arredondamento
```typescript
rounded-lg          // 0.5rem (8px) - Pequeno
rounded-xl          // 0.75rem (12px) - Médio
rounded-2xl         // 1rem (16px) - Grande
rounded-full        // 9999px - Circular
```

### 6.2 Aplicação
- **Container principal**: `rounded-2xl`
- **Cards de evento**: `rounded-2xl`
- **Botões**: `rounded-lg` ou `rounded-xl`
- **Ícones circulares**: `rounded-full`
- **Modais**: `rounded-xl`
- **Inputs**: `rounded-xl`

## 🎨 7. DETALHES DE CARDS

### 7.1 Estrutura do Card de Evento
```typescript
// Container
absolute rounded-2xl shadow-lg dark:shadow-dark-lg
border border-border-light/50 dark:border-border-dark/50
overflow-hidden

// Barra de progresso (esquerda)
absolute left-0 top-0 bottom-0
width: calc(progress% + 12px)  // Mínimo 12px
rounded-l-2xl

// Indicador de progresso (borda direita da barra)
absolute right-0 top-0 bottom-0 w-3
animate-pulse
shadow-[4px_0_20px_rgba(...)]

// Conteúdo
relative py-2
padding-left: 0.625rem (height < 60) | 0.75rem
padding-right: 0.375rem (height < 60) | 0.5rem
gap: 0.375rem (height < 60) | 0.5rem

// Ícone circular
rounded-full bg-white/40 dark:bg-white/20
shadow-sm
width/height: clamp(1.5rem, 2.5vw, 1.75rem) (height < 60)
width/height: clamp(1.75rem, 3vw, 2.25rem) (height >= 60)
group-hover:scale-110
group-hover:bg-white/60 dark:group-hover:bg-white/30

// Título
font-display font-bold
fontSize: clamp(0.625rem, 1.2vw, 0.75rem) (height < 60)
fontSize: clamp(0.75rem, 1.4vw, 0.875rem) (60 <= height < 100)
fontSize: clamp(0.8125rem, 1.6vw, 1rem) (height >= 100)
overflow: hidden text-ellipsis whitespace-nowrap

// Horário/Progresso (com transição slide)
fontSize: clamp(0.5rem, 0.8vw, 0.625rem) (height < 60)
fontSize: clamp(0.5625rem, 0.9vw, 0.6875rem) (60 <= height < 100)
fontSize: clamp(0.625rem, 1vw, 0.75rem) (height >= 100)

// Handle de resize
absolute bottom-0 left-0 right-0 h-3
cursor-ns-resize
hover:bg-black/20 dark:hover:bg-white/20
rounded-b-xl
```

### 7.2 Responsividade do Card
- **Altura < 60px**: Compacto (ícone menor, texto menor, espaçamento reduzido)
- **60px ≤ Altura < 100px**: Médio
- **Altura ≥ 100px**: Expandido (máximo conforto visual)

### 7.3 Estados do Card
- **Normal**: Opacidade 100%, cursor-grab
- **Hover**: Scale 1.02, translate-y -0.5, shadow-xl, z-50
- **Dragging**: Scale 1.05, opacity 90%, shadow-2xl, cursor-grabbing, transition-none

## 🎯 8. ELEMENTOS ESPECIAIS

### 8.1 Linha do Horário Atual
```typescript
// Chip em formato de seta
bg-red-500 text-white text-xs font-bold
px-2 py-1 shadow-lg animate-pulse
height: 22px

// Seta (CSS puro)
border-top: 11px solid transparent
border-bottom: 11px solid transparent
border-left: 8px solid #ef4444

// Linha vermelha
height: 0.5 bg-red-500 shadow-lg
```

### 8.2 Indicador de Dia Atual (Header)
```typescript
// Glow effect
absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse

// Badge
bg-gradient-to-br from-primary to-primary/80
text-white rounded-full w-8 h-8
shadow-xl dark:shadow-dark-xl
ring-2 ring-primary/30
animate-pulse
```

### 8.3 Dias Não-Estudo (Background Pattern)
```typescript
backgroundImage: 'repeating-linear-gradient(45deg, 
  rgba(168, 85, 247, 0.05), 
  rgba(168, 85, 247, 0.05) 10px, 
  rgba(168, 85, 247, 0.15) 10px, 
  rgba(168, 85, 247, 0.15) 20px)'
backgroundColor: 'rgba(168, 85, 247, 0.03)'
```

## 📱 9. RESPONSIVIDADE

### 9.1 Breakpoints Implícitos
- **Mobile**: Grid adaptativo, texto responsivo com clamp()
- **Desktop**: Layout completo com 7 colunas

### 9.2 Técnicas de Responsividade
```typescript
// Clamp para tamanhos fluidos
clamp(min, preferred, max)

// Exemplo: Ícone
clamp(1.5rem, 2.5vw, 1.75rem)  // 24px → 2.5vw → 28px

// Exemplo: Texto
clamp(0.625rem, 1.2vw, 0.75rem)  // 10px → 1.2vw → 12px
```

## 🎨 10. TIPOGRAFIA

### 10.1 Famílias de Fonte
```typescript
font-display        // Para títulos e headers (bold, uppercase)
font-inter          // Para corpo de texto e números
```

### 10.2 Pesos
```typescript
font-bold           // 700 - Títulos, números importantes
font-semibold       // 600 - Subtítulos, botões
font-medium         // 500 - Texto secundário
```

### 10.3 Tamanhos
```typescript
text-xs             // 0.75rem (12px)
text-sm             // 0.875rem (14px)
text-base           // 1rem (16px)
text-lg             // 1.125rem (18px)
text-xl             // 1.25rem (20px)
text-2xl            // 1.5rem (24px)
text-3xl            // 1.875rem (30px)
```

## 🔧 11. INTERATIVIDADE

### 11.1 Cursor States
```typescript
cursor-pointer      // Clicável
cursor-grab         // Arrastável
cursor-grabbing     // Arrastando
cursor-ns-resize    // Redimensionável vertical
cursor-not-allowed  // Desabilitado
```

### 11.2 Pointer Events
```typescript
pointer-events-none  // Desabilitar interação (linha de tempo, overlays)
```

### 11.3 User Select
```typescript
select-none         // Prevenir seleção de texto durante drag
```

## 🎯 12. Z-INDEX HIERARCHY

```typescript
z-10                // Cards de evento (base)
z-20                // Coluna de horários (sticky)
z-30                // Linha do horário atual
z-40                // Botão flutuante
z-50                // Modal overlay, card hover
z-100               // Card durante drag
z-[10000]           // Modal de criação
```

## 📋 13. CHECKLIST DE IMPLEMENTAÇÃO

### ✅ Cores
- [ ] Sistema de cores completo (9 cores)
- [ ] Versões com transparência para progresso
- [ ] Cores customizadas para barras de progresso
- [ ] Suporte dark mode em todas as cores

### ✅ Sombras
- [ ] 4 níveis de sombra (sm, lg, xl, 2xl)
- [ ] Versões dark para todas as sombras
- [ ] Hover states com elevação

### ✅ Animações
- [ ] Transições suaves (200ms, 300ms, 500ms)
- [ ] Hover effects (scale, translate, rotate)
- [ ] Animações especiais (pulse, fade-in, zoom-in, blink)
- [ ] Transições de progresso (slide up/down)

### ✅ Arredondamento
- [ ] 4 níveis (lg, xl, 2xl, full)
- [ ] Consistência em todos os elementos

### ✅ Responsividade
- [ ] Clamp() para tamanhos fluidos
- [ ] Adaptação baseada em altura do card
- [ ] Grid responsivo

### ✅ Tipografia
- [ ] 2 famílias (display, inter)
- [ ] 3 pesos (bold, semibold, medium)
- [ ] Escala de tamanhos consistente

### ✅ Interatividade
- [ ] Estados de cursor apropriados
- [ ] Feedback visual em todas as ações
- [ ] Drag & drop suave
- [ ] Resize intuitivo

### ✅ Acessibilidade
- [ ] Contraste adequado (WCAG AA)
- [ ] Títulos descritivos
- [ ] Estados de foco visíveis
- [ ] Feedback de ações

---

**Este documento serve como referência completa para implementar o mesmo nível de qualidade e detalhamento no MonthlyPlanner.**
