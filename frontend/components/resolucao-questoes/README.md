# Componentes de Resolução de Questões

Este diretório contém todos os componentes relacionados à funcionalidade de resolução de questões médicas do MEDBRAVE.

## Estrutura de Componentes

### Componente Principal

- **QuestionView**: Componente principal que orquestra toda a interface de resolução de questões

### Componentes de UI

- **QuestionHeader**: Cabeçalho com botões de ação e contadores de likes/dislikes
- **QuestionBody**: Corpo da questão com ferramentas de marcação de texto
- **Alternatives**: Lista de alternativas com feedback visual
- **NavigationButtons**: Botões de navegação Anterior/Próxima
- **ReportLink**: Link para reportar problemas na questão

### Componentes do Sidebar

- **NavigationPanel**: Painel de navegação com grid de questões
- **StylesPanel**: Painel de tags/estilos da questão

### Componentes de Ação

- **ActionBar**: Barra fixa inferior com ações principais

### Modais

- **SummaryModal**: Modal com resumo da questão
- **CommentsModal**: Modal de comentários
- **ReportModal**: Modal para reportar problemas

## Uso

```tsx
import { QuestionView } from '@/components/resolucao-questoes/QuestionView';
import { getQuestion, getQuestionList } from '@/lib/api/questions';

export default async function Page({ params }: { params: { id: string } }) {
  const question = await getQuestion(params.id);
  const questionList = await getQuestionList();

  return <QuestionView question={question} questionList={questionList} />;
}
```

## Hooks Personalizados

### useQuestionState

Gerencia o estado da questão incluindo seleção de alternativas, highlights e tags.

```tsx
const {
  state,
  selectAlternative,
  confirmAnswer,
  addHighlight,
  addTag,
} = useQuestionState(question);
```

### useQuestionNavigation

Gerencia a navegação entre questões.

```tsx
const {
  currentIndex,
  goToNext,
  goToPrevious,
  goToQuestion,
  canGoNext,
  canGoPrevious,
} = useQuestionNavigation(questionList, currentQuestionId);
```

### useTextHighlight

Gerencia a funcionalidade de highlight de texto.

```tsx
const {
  textRef,
  handleTextSelection,
  applyHighlightStyle,
} = useTextHighlight(toolMode, onAddHighlight);
```

## Funcionalidades

### Marcação de Texto

- **Highlight**: Destaca texto em azul
- **Strikethrough**: Risca texto
- **Edit**: Modo de edição de anotações

### Navegação

- Navegação sequencial (Anterior/Próxima)
- Navegação direta por número da questão
- Indicadores visuais de estado (correta, incorreta, não respondida)

### Persistência

O estado da questão é automaticamente salvo no localStorage, incluindo:
- Alternativa selecionada
- Status de resposta
- Highlights aplicados
- Tags adicionadas

### Acessibilidade

- Todos os botões têm aria-labels apropriados
- Navegação por teclado suportada
- Suporte a screen readers
- Contraste adequado em ambos os temas

## Design System

Todos os componentes seguem o design system do projeto:

- **Cores**: Utiliza tokens de cor do Tailwind config
- **Fontes**: Poppins para títulos, Inter para corpo
- **Sombras**: Sombras consistentes para profundidade
- **Bordas**: Border radius padrão de 1rem
- **Espaçamentos**: Espaçamentos consistentes (p-4, p-6, p-8)
- **Transições**: Transições suaves em elementos interativos

## Dark Mode

Todos os componentes suportam dark mode automaticamente através das classes Tailwind `dark:`.

## Performance

- Componentes otimizados com React.memo onde apropriado
- useMemo para cálculos pesados
- Lazy loading de modais
- Persistência eficiente no localStorage
