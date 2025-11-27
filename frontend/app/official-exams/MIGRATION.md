# Migração: official-exams → prova-integra

## ⚠️ Aviso de Migração

A funcionalidade de **Provas Oficiais** foi migrada para uma nova implementação chamada **Provas na Íntegra**.

## Mudanças

### URLs Antigas → Novas

- `/official-exams` → `/prova-integra`
- `/official-exams/[id]` → `/prova-integra/[id]`
- `/official-exams/[id]/history` → `/prova-integra` (redirecionamento temporário)

### Arquitetura

#### Antes (official-exams)
- Usava API proxy para backend Node.js
- Service com funções: `listOfficialExams`, `startOfficialExamAttempt`, `getUserOfficialExamAttempts`
- Integração com backend separado

#### Agora (prova-integra)
- Integração direta com Supabase
- Service simplificado: `officialExamService`
- Funções principais:
  - `getAllExams()` - Busca todas as provas
  - `getExamById(id)` - Busca prova por ID
  - `getExamsByInstitution()` - Agrupa por instituição
  - `filterExams()` - Filtra provas
  - `formatInstitutionName()` - Formata nomes

### Banco de Dados

A tabela `official_exams` no Supabase permanece a mesma:

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

### Componentes

#### Novos Componentes
- `InstitutionCard` - Card de instituição expansível
- `ExamCard` - Card individual de prova
- `ExamFilters` - Filtros de busca
- `LoadingState` - Estado de carregamento

#### Componentes UI Reutilizáveis
- `InfoBanner` - Banner informativo
- `EmptyState` - Estado vazio
- `Tabs` - Componente de abas

### Funcionalidades Removidas (Temporariamente)

As seguintes funcionalidades da versão antiga não estão disponíveis na nova versão:

1. **Histórico de Tentativas**: A visualização de tentativas anteriores
2. **Iniciar Prova Diretamente**: O botão de iniciar prova ainda não está implementado
3. **Filtros Avançados**: Alguns filtros específicos foram simplificados

### Funcionalidades Adicionadas

1. **Agrupamento por Instituição**: Provas organizadas por instituição
2. **Cards Expansíveis**: Interface mais limpa e organizada
3. **Scroll Horizontal**: Navegação melhorada em mobile
4. **Tema Claro/Escuro**: Suporte completo a temas
5. **Animações**: Transições suaves e feedback visual
6. **Design Responsivo**: Otimizado para todos os dispositivos

## Próximos Passos

Para restaurar todas as funcionalidades da versão antiga:

1. [ ] Implementar página de resolução de prova
2. [ ] Adicionar histórico de tentativas
3. [ ] Integrar com sistema de simulados
4. [ ] Adicionar estatísticas por prova
5. [ ] Implementar sistema de favoritos

## Redirecionamentos

Todos os acessos às URLs antigas são automaticamente redirecionados para `/prova-integra`.

## Suporte

Para dúvidas sobre a migração, consulte:
- `/frontend/app/prova-integra/README.md` - Documentação da nova funcionalidade
- `/frontend/components/prova-integra/README.md` - Documentação dos componentes

## Rollback

Se necessário fazer rollback, os arquivos antigos estão preservados no histórico do Git.
