# Flashcards Components

Sistema completo de flashcards com repetição espaçada para o MEDBRAVE.

## Estrutura de Componentes

### Sessão de Estudo
- **FlashcardView**: Componente principal da sessão de estudo
- **FlashcardStack**: Card com efeito de empilhamento (3 cards)
- **DifficultyButtons**: Botões de avaliação (Não lembrei, Difícil, Bom, Fácil)
- **ProgressBar**: Barra de progresso da sessão
- **ReportButton**: Botão fixo para reportar erros

### Gerenciamento de Decks
- **DeckList**: Lista de decks com filtros e paginação
- **DeckCard**: Card individual de deck com estatísticas
- **FilterBar**: Barra de filtros (busca, área, prioridade)
- **Pagination**: Componente de paginação

### Coleções
- **CollectionList**: Lista de coleções
- **CollectionCard**: Card individual de coleção
- **ImportAnkiButton**: Botão para importar arquivos .apkg

### Utilitários
- **FeedbackButton**: Botão fixo lateral para feedback
- **ChatButton**: Botão fixo para chat de suporte

## Uso

### Sessão de Estudo

```tsx
import { FlashcardView } from '@/components/flashcards';

<FlashcardView deck={deck} flashcards={flashcards} />
```

### Lista de Decks

```tsx
import { DeckList } from '@/components/flashcards';

<DeckList decks={decks} />
```

### Lista de Coleções

```tsx
import { CollectionList } from '@/components/flashcards';

<CollectionList collections={collections} />
```

## Funcionalidades

### Algoritmo de Repetição Espaçada (SM-2)
- Calcula intervalos de revisão baseado na dificuldade
- Ajusta fator de facilidade dinamicamente
- Otimiza retenção de conhecimento

### Animações
- Transição suave de flip (fade + scale, 300ms)
- Efeito de empilhamento com rotação
- Hover effects em cards e botões

### Acessibilidade
- ARIA labels em todos os botões
- Navegação por teclado
- Suporte a screen readers
- Contraste adequado em light/dark mode

### Persistência
- Progresso da sessão salvo no localStorage
- Preferências do usuário persistidas
- Limpeza automática de dados antigos (7 dias)

## Design System

### Cores
- Primary: `#7C3AED`
- Difficulty Again: `#EF4444` (vermelho)
- Difficulty Hard: `#FBBF24` (amarelo)
- Difficulty Good: `#15803D` (verde escuro)
- Difficulty Easy: `#4ADE80` (verde claro)

### Fontes
- Display: Poppins
- Body: Inter

### Sombras
- Cards: `shadow-lg`, `dark:shadow-dark-xl`
- Hover: `shadow-xl`, `dark:shadow-dark-2xl`
- Buttons: `shadow-lg` com `hover:shadow-xl`

## Rotas

- `/flashcards/colecoes` - Lista de coleções
- `/flashcards/colecoes/[id]` - Decks de uma coleção
- `/flashcards/estudo/[deckId]` - Sessão de estudo

## Próximos Passos

### Backend Integration
- Conectar com API real
- Sincronizar reviews com servidor
- Implementar autenticação

### Importação Anki
- Instalar dependências: `jszip`, `sql.js`
- Implementar parsing completo de .apkg
- Extrair e armazenar media files

### Funcionalidades Adicionais
- Modal de resumo do card
- Modal de comentários
- Modal de reporte de erro
- Preview de decks
- Estatísticas detalhadas
- Gráficos de progresso
