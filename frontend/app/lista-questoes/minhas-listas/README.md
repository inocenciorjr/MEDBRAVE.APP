# Página de Minhas Listas

Esta página exibe todas as listas de questões e pastas do usuário em formato de tabela, similar ao design fornecido no HTML modelo.

## Funcionalidades

### Visualização
- **Tabela responsiva** com todas as listas e pastas
- **Navegação hierárquica** através de pastas (breadcrumbs)
- **Estatísticas em tempo real** de cada lista:
  - Questões respondidas
  - Acertos
  - Erros
  - Progresso geral

### Filtros e Busca
- **Busca por nome** de lista ou pasta
- **Filtro por tipo**: Tudo, Pastas ou Listas
- **Ordenação** por data de criação (padrão: mais recentes primeiro)

### Ações
- **Criar nova lista** (redireciona para /banco-questoes/criar/geral)
- **Abrir pasta** (navega para dentro da pasta)
- **Abrir lista** (redireciona para /resolucao-questoes/:id)
- **Menu de opções** para cada item:
  - Editar
  - Mover
  - Compartilhar (apenas listas)
  - Excluir

## Integração com Backend

### Endpoints Utilizados

#### 1. Listar Pastas e Listas
```
GET /api/banco-questoes/folders
```
Retorna a hierarquia completa de pastas e listas do usuário.

#### 2. Estatísticas de Lista
```
GET /api/question-lists/:id/stats
```
Retorna estatísticas de uma lista específica:
```json
{
  "success": true,
  "data": {
    "total": 50,
    "answered": 30,
    "correct": 25,
    "incorrect": 5
  }
}
```

### Middlewares
- **Autenticação**: Todas as rotas requerem autenticação via `supabaseAuthMiddleware`
- **Não requer admin**: Usuários comuns podem acessar suas próprias listas

## Estrutura de Dados

### ListItem
```typescript
interface ListItem {
  id: string;
  name: string;
  type: 'folder' | 'list';
  created_at: string;
  question_count?: number;
  stats?: ListStats;
  parent_id?: string;
}
```

### ListStats
```typescript
interface ListStats {
  answered: number;
  correct: number;
  incorrect: number;
  total: number;
}
```

## Design System

A página segue o design system do projeto:

### Cores
- **Primary**: `#7C3AED` (roxo)
- **Background Light**: `#F8F8FA`
- **Background Dark**: `#0A0A0A`
- **Surface Light**: `#FFFFFF`
- **Surface Dark**: `#1A1A1A`

### Componentes Reutilizados
- `ListItemMenu`: Menu de opções para cada item
- `useQuestionListFolders`: Hook para buscar pastas e listas

### Dark Mode
Totalmente suportado com classes Tailwind `dark:*`

## Próximos Passos

### Funcionalidades Pendentes
- [ ] Implementar edição de lista/pasta
- [ ] Implementar exclusão de lista/pasta
- [ ] Implementar mover lista/pasta
- [ ] Implementar compartilhamento de lista
- [ ] Adicionar paginação real (atualmente mock)
- [ ] Adicionar ordenação por outros campos
- [ ] Adicionar filtros avançados
- [ ] Implementar busca em tempo real com debounce

### Melhorias de Performance
- [ ] Implementar cache de estatísticas
- [ ] Lazy loading de estatísticas
- [ ] Virtualização da tabela para grandes volumes

### UX
- [ ] Adicionar skeleton loading
- [ ] Adicionar animações de transição
- [ ] Adicionar tooltips informativos
- [ ] Adicionar confirmação antes de excluir
