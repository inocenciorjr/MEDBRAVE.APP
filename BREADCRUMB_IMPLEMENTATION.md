# Plano de Implementação de Breadcrumbs

## Ícones da Sidebar (Referência)
- Dashboard: `grid_view`
- Banco de Questões: `folder_open`
- Lista de Questões: `list_alt`
- Prova na Íntegra: `description`
- Flashcards: `layers`
- Caderno de Erros: `book`
- Revisões: `history`
- Aquecimento: `sports_esports`
- Painel de Métricas: `bar_chart`

## Páginas a Implementar

### ✅ Flashcards
1. `/flashcards/colecoes` - Adicionar breadcrumb
2. `/flashcards/colecoes/[id]` - ✅ FEITO
3. `/flashcards/comunidade` - Adicionar breadcrumb
4. `/flashcards/comunidade/especialidade/[id]` - Adicionar breadcrumb

### Banco de Questões
1. `/banco-questoes` - Adicionar breadcrumb
2. `/banco-questoes/criar/[step]` - Substituir botão por breadcrumb

### Lista de Questões
1. `/lista-questoes/minhas-listas` - Adicionar breadcrumb
2. `/lista-questoes/[id]` - Adicionar breadcrumb

### Prova na Íntegra
1. `/prova-integra` - Adicionar breadcrumb
2. `/prova-integra/[id]` - Adicionar breadcrumb

### Simulados
1. `/simulados` - Adicionar breadcrumb
2. `/simulados/[id]/configurar` - Substituir botão por breadcrumb

## Estrutura de Breadcrumbs por Seção

### Flashcards
- Coleções: `Dashboard > Flashcards > Coleções`
- Coleção específica: `Dashboard > Flashcards > Coleções > [Nome da Coleção]`
- Comunidade: `Dashboard > Flashcards > Comunidade`
- Especialidade: `Dashboard > Flashcards > Comunidade > [Especialidade]`

### Banco de Questões
- Principal: `Dashboard > Banco de Questões`
- Criar: `Dashboard > Banco de Questões > Criar > [Step]`

### Lista de Questões
- Minhas Listas: `Dashboard > Lista de Questões`
- Lista específica: `Dashboard > Lista de Questões > [Nome da Lista]`
