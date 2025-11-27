# Provas na Íntegra

Esta funcionalidade permite aos usuários visualizar e resolver provas oficiais completas de diversas instituições.

## Estrutura de Arquivos

```
frontend/
├── app/
│   └── prova-integra/
│       ├── page.tsx                    # Página principal com lista de provas
│       ├── [id]/
│       │   ├── page.tsx                # Detalhes da prova
│       │   └── resolver/
│       │       └── page.tsx            # Resolução da prova (a implementar)
│       └── README.md
├── components/
│   └── prova-integra/
│       ├── InstitutionCard.tsx         # Card de instituição com provas
│       ├── ExamCard.tsx                # Card individual de prova
│       ├── ExamFilters.tsx             # Filtros de busca
│       └── LoadingState.tsx            # Estado de carregamento
├── services/
│   └── officialExamService.ts          # Serviço para buscar provas
└── types/
    └── official-exams.ts               # Tipos TypeScript
```

## Funcionalidades

### Página Principal (`/prova-integra`)

- **Lista de Instituições**: Exibe todas as instituições com provas disponíveis
- **Filtros**:
  - Busca por texto (nome da prova ou instituição)
  - Filtro por região (UF)
  - Filtro por instituição
  - Filtro por tipo (R1, R2, R3)
- **Cards Expansíveis**: Cada instituição pode ser expandida para ver suas provas
- **Scroll Horizontal**: Provas são exibidas em carrossel horizontal
- **Tabs**: Alternância entre "Provas na íntegra" e "Simulados"

### Página de Detalhes (`/prova-integra/[id]`)

- **Informações da Prova**:
  - Título e instituição
  - Número de questões
  - Tempo estimado
  - Data de adição
- **Estatísticas**: Cards com métricas da prova
- **Tags**: Exibição de tags associadas
- **Ações**:
  - Iniciar prova
  - Ver estatísticas

## Design System

### Cores

- **Primary**: `#7C3AED` (roxo)
- **Background Light**: `#F8F8FA`
- **Background Dark**: `#0A0A0A`
- **Surface Light**: `#FFFFFF`
- **Surface Dark**: `#1A1A1A`

### Componentes Reutilizáveis

- **Checkbox**: Componente customizado com animações
- **MedBraveLoader**: Loader animado da marca
- **ThemeToggle**: Alternância entre tema claro e escuro

### Animações

- **Hover Effects**: Escala e sombra em cards
- **Expand/Collapse**: Animação suave de expansão
- **Fade In**: Transições suaves de opacidade
- **Slide In**: Animações de entrada de conteúdo

### Responsividade

- **Mobile First**: Design adaptável para todos os tamanhos
- **Grid Responsivo**: Ajuste automático de colunas
- **Scroll Horizontal**: Navegação touch-friendly em mobile

## Banco de Dados

### Tabela: `official_exams`

```sql
CREATE TABLE official_exams (
  id TEXT PRIMARY KEY,
  university_id VARCHAR,
  title VARCHAR NOT NULL,
  question_ids JSONB NOT NULL DEFAULT '[]',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);
```

### Campos

- `id`: Identificador único da prova
- `university_id`: ID da universidade/instituição
- `title`: Título da prova (ex: "ENAMED/ENARE - 2026 - R1")
- `question_ids`: Array de IDs das questões na ordem correta
- `created_by`: UUID do usuário que criou
- `created_at`: Data de criação
- `updated_at`: Data de atualização
- `tags`: Tags associadas à prova

## Próximos Passos

1. **Página de Resolução**: Implementar `/prova-integra/[id]/resolver`
2. **Estatísticas**: Adicionar página de estatísticas por prova
3. **Histórico**: Mostrar tentativas anteriores do usuário
4. **Filtros Avançados**: Adicionar mais opções de filtro
5. **Favoritos**: Permitir marcar provas como favoritas
6. **Compartilhamento**: Opção de compartilhar provas

## Melhorias Futuras

- [ ] Adicionar paginação para grandes listas
- [ ] Implementar busca com debounce
- [ ] Adicionar skeleton loading
- [ ] Implementar cache de dados
- [ ] Adicionar modo offline
- [ ] Implementar PWA
- [ ] Adicionar analytics de uso
- [ ] Implementar sistema de comentários
- [ ] Adicionar ranking de provas mais resolvidas
- [ ] Implementar sistema de recomendação

## Testes

Para testar a funcionalidade:

1. Acesse `/prova-integra`
2. Verifique se as provas são carregadas
3. Teste os filtros de busca
4. Expanda uma instituição
5. Clique em uma prova para ver detalhes
6. Teste o tema claro/escuro
7. Teste em diferentes tamanhos de tela

## Suporte

Para dúvidas ou problemas, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.
