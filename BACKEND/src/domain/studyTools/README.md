# Ferramentas de Estudo (Study Tools)

Este módulo implementa as ferramentas de estudo do MedPulse Academy, incluindo:

- Flashcards
- Cadernos de Erros (Error Notebooks)
- Sessões de Estudo
- Revisões Programadas (SRS)

## Estrutura

O módulo está organizado em sub-módulos:

```
studyTools/
├── flashcards/          # Gestão de flashcards e baralhos
├── errorNotebook/       # Cadernos de erro e entradas
├── studySessions/       # Sessões de estudo
├── programmableReviews/ # Sistema de revisão espaçada (SRS)
└── index.ts             # Exporta todas as rotas consolidadas
```

## Submódulos

### Flashcards

Gerencia flashcards e baralhos para estudo com repetição espaçada.

**Funcionalidades:**
- Criação e gerenciamento de baralhos
- Criação e gerenciamento de flashcards
- Revisão com algoritmo SRS
- Estatísticas de estudo
- Compartilhamento de baralhos

### Cadernos de Erro (Error Notebook)

Permite aos usuários registrar erros e aprender com eles.

**Funcionalidades:**
- Criação e gerenciamento de cadernos de erro
- Categorização de erros
- Importação de erros de questões e flashcards
- Revisão espaçada de entradas
- Estatísticas de progresso

### Sessões de Estudo

Acompanha o tempo e o progresso das sessões de estudo.

**Funcionalidades:**
- Registro de sessões de estudo
- Diferentes tipos de sessão (flashcards, questões, leitura)
- Estatísticas de desempenho
- Registro de respostas e tempo de estudo

### Revisões Programadas (SRS)

Implementa o algoritmo de repetição espaçada.

**Funcionalidades:**
- Agendamento de revisões
- Algoritmo adaptativo baseado no desempenho
- Integração com flashcards e cadernos de erro

## Uso

Para importar o módulo completo:

```typescript
import studyToolsRoutes from './domain/studyTools';

// Em sua configuração de rotas
app.use('/api/study', studyToolsRoutes);
```

Isso registrará todas as rotas necessárias para as ferramentas de estudo. 