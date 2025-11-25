# Componentes de Provas na Íntegra

Esta pasta contém os componentes específicos para a funcionalidade de Provas na Íntegra.

## Componentes

### InstitutionCard

Card expansível que exibe uma instituição e suas provas.

**Props:**
- `institution: ExamInstitution` - Dados da instituição

**Funcionalidades:**
- Expansão/colapso com animação
- Exibição de contador de provas
- Lista de provas em scroll horizontal
- Ícone da instituição
- Hover effects

**Exemplo:**
```tsx
<InstitutionCard institution={institution} />
```

### ExamCard

Card individual de uma prova com link para detalhes.

**Props:**
- `exam: OfficialExam` - Dados da prova

**Funcionalidades:**
- Link para página de detalhes
- Ícone de documento
- Contador de questões
- Hover effects com escala
- Animação de seta

**Exemplo:**
```tsx
<ExamCard exam={exam} />
```

### ExamFilters

Componente de filtros para busca de provas.

**Props:**
- `filters: ExamFilters` - Estado atual dos filtros
- `onFilterChange: (filters: ExamFilters) => void` - Callback de mudança
- `regions: string[]` - Lista de regiões disponíveis
- `institutions: string[]` - Lista de instituições disponíveis

**Funcionalidades:**
- Busca por texto
- Filtro por região
- Filtro por instituição
- Filtro por tipo (R1, R2, R3)
- Design responsivo

**Exemplo:**
```tsx
<ExamFilters
  filters={filters}
  onFilterChange={setFilters}
  regions={regions}
  institutions={institutions}
/>
```

### LoadingState

Componente de estado de carregamento.

**Funcionalidades:**
- Animação de pontos pulsantes
- Mensagem de carregamento
- Design minimalista

**Exemplo:**
```tsx
<LoadingState />
```

## Estrutura de Dados

### ExamInstitution

```typescript
interface ExamInstitution {
  id: string;
  name: string;
  exams: OfficialExam[];
  examCount: number;
}
```

### OfficialExam

```typescript
interface OfficialExam {
  id: string;
  university_id: string;
  title: string;
  question_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}
```

### ExamFilters

```typescript
interface ExamFilters {
  search: string;
  region: string;
  institution: string;
  type: string;
}
```

## Estilos

Todos os componentes seguem o design system do projeto:

- **Cores**: Uso de tokens de cor do Tailwind
- **Sombras**: Variantes light/dark
- **Bordas**: Arredondamento padrão de 1rem
- **Animações**: Transições suaves
- **Responsividade**: Mobile-first

## Acessibilidade

- Labels semânticos
- Aria-labels em botões
- Contraste adequado
- Navegação por teclado
- Estados de foco visíveis

## Performance

- Lazy loading de imagens
- Memoização de componentes pesados
- Debounce em filtros de busca
- Virtual scrolling para listas grandes (futuro)

## Testes

Para testar os componentes:

1. Importe o componente
2. Forneça as props necessárias
3. Verifique renderização
4. Teste interações
5. Verifique responsividade
6. Teste tema claro/escuro

## Melhorias Futuras

- [ ] Adicionar skeleton loading
- [ ] Implementar virtual scrolling
- [ ] Adicionar testes unitários
- [ ] Melhorar acessibilidade
- [ ] Adicionar animações mais complexas
- [ ] Implementar drag and drop
- [ ] Adicionar modo de visualização em grade
- [ ] Implementar favoritos
