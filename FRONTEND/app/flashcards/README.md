# Flashcards - Páginas com Abas

Este diretório contém as páginas de flashcards com sistema de abas (Minhas Coleções e Comunidade).

## Estrutura de Páginas

```
app/flashcards/
├── page.tsx                    # Redirect para /colecoes
├── colecoes/
│   ├── page.tsx               # Aba "Minhas Coleções"
│   ├── loading.tsx            # Loading state
│   ├── error.tsx              # Error boundary
│   └── [id]/
│       └── page.tsx           # Detalhes da coleção
├── comunidade/
│   ├── page.tsx               # Aba "Comunidade"
│   ├── loading.tsx            # Loading state
│   └── error.tsx              # Error boundary
└── estudo/
    └── [deckId]/
        └── page.tsx           # Sessão de estudo
```

## Componentes Principais

### TabNavigation
Navegação entre as abas "Minhas Coleções" e "Comunidade".

### MyCollectionsTab
Exibe duas seções:
- **Minhas coleções**: Coleções criadas e importadas pelo usuário
- **Coleções importadas da comunidade**: Coleções da comunidade já adicionadas

Funcionalidades:
- Busca por nome em tempo real
- Paginação (6 itens por página)
- Botões "Importar Anki" e "Criar coleção"

### CommunityTab
Exibe duas seções em carousels horizontais:
- **Coleções MedBRAVE**: Organizadas por instituição (EINSTEIN, FAMEMA, etc.)
- **Coleções feitas pela comunidade**: Organizadas por especialidade

Funcionalidades:
- Busca por nome em cada seção
- Navegação por setas (esquerda/direita)
- Link "Ver todos" para cada seção

### CollectionCard
Card de coleção com:
- Nome e instituição
- Tags com ícones e cores
- Estatísticas (baralhos, data de atualização, cards novos)
- Botões: "Adicionado/Adicionar", "Preview", navegação

### HorizontalCarousel
Carousel horizontal com:
- Scroll suave
- Botões de navegação
- Scrollbar oculta
- Suporte a touch em mobile

### InstitutionCard
Card de instituição com:
- Logo da instituição
- Nome
- Contador de baralhos
- Botão "Visualizar baralhos"

### SpecialtyCard
Card de especialidade com:
- Ícone colorido
- Nome da especialidade
- Contador de baralhos
- Botão "Visualizar baralhos"

## Design System

### Cores
- **Primary**: #7C3AED (roxo)
- **Background Light**: #F8F8FA
- **Background Dark**: #0A0A0A
- **Surface Light**: #FFFFFF
- **Surface Dark**: #1A1A1A

### Tipografia
- **Títulos**: Poppins (font-display)
- **Corpo**: Inter (font-inter)

### Espaçamentos
- **Seções**: space-y-10
- **Cards**: p-5 ou p-6
- **Grid**: gap-6
- **Carousel**: space-x-6

### Sombras
- **Light mode**: shadow-lg, hover:shadow-xl
- **Dark mode**: shadow-dark-xl, hover:shadow-dark-2xl

### Border Radius
- **Padrão**: rounded-lg (1rem)
- **Tags**: rounded-full

## Responsividade

### Breakpoints
- **Mobile**: < 768px (1 coluna)
- **Desktop**: >= 768px (2 colunas)

### Grid Layouts
```tsx
// Collection Grid
className="grid grid-cols-1 md:grid-cols-2 gap-6"

// Carousel
className="flex overflow-x-auto space-x-6"
```

### Headers
```tsx
// Mobile: Stack vertical
// Desktop: Horizontal
className="flex flex-col md:flex-row justify-between md:items-center gap-4"
```

## Dark Mode

Todos os componentes suportam dark mode completo com:
- Backgrounds escuros (#0A0A0A, #1A1A1A)
- Textos claros (#FFFFFF, #A0A0A0)
- Bordas escuras (#2A2A2A)
- Sombras adaptadas (shadow-dark-xl)
- Tags com opacidade

## Acessibilidade

- **ARIA labels** em todos os botões e inputs
- **role="tablist"** e **role="tab"** na navegação
- **aria-selected** nas abas ativas
- **Focus states** visíveis (focus:ring-2)
- **Contraste WCAG AA** em todos os textos
- **Navegação por teclado** (Tab, Enter, Space)

## Performance

### Otimizações
- **React.memo** em CollectionCard
- **useMemo** para filtros de busca
- **Lazy loading** de imagens (Next Image)
- **Server Components** para carregamento de dados

### Loading States
- Skeleton screens durante carregamento
- Animação pulse nos placeholders

### Error Handling
- Error boundaries em cada página
- Mensagens de erro amigáveis
- Botão "Tentar novamente"

## Dados Mock

Os dados de exemplo estão em `lib/mock-data/flashcards-tabs.ts`:
- **mockMyCollections**: Coleções do usuário
- **mockImportedCollections**: Coleções importadas
- **mockInstitutions**: Instituições MedBRAVE
- **mockSpecialties**: Especialidades médicas

## Próximos Passos

1. Implementar páginas de detalhes:
   - `/flashcards/colecoes/[id]` - Decks da coleção
   - `/flashcards/comunidade/instituicao/[id]` - Decks da instituição
   - `/flashcards/comunidade/especialidade/[id]` - Decks da especialidade

2. Integrar com API real:
   - Substituir mock data por chamadas API
   - Implementar mutations (adicionar/remover coleções)

3. Implementar modais:
   - Modal de criação de coleção
   - Modal de importação Anki
   - Modal de preview

4. Adicionar funcionalidades:
   - Filtros avançados
   - Ordenação
   - Favoritos
   - Compartilhamento
