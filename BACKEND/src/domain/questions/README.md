# Módulo de Questões

Este módulo implementa o sistema de questões do MedPulse Academy, incluindo:

1. **Banco de Questões (QuestionService)**
   - Gerenciamento de questões (CRUD)
   - Busca e filtragem
   - Classificação e categorização

2. **Listas de Questões (QuestionListService)**
   - Criação de listas de estudo personalizadas
   - Adição e remoção de questões às listas
   - Favoritos e compartilhamento
   - Acompanhamento de progresso

3. **Respostas a Questões (QuestionResponseService)**
   - Registro de respostas
   - Integração com o sistema SRS (Spaced Repetition System)
   - Análise de desempenho

4. **Histórico de Questões (UserQuestionHistoryService)**
   - Registro cronológico de respostas
   - Estatísticas de desempenho
   - Identificação de pontos fracos

## Arquitetura

O módulo segue a arquitetura limpa em camadas:

- **Interfaces**: Definem contratos para os serviços
- **Serviços**: Implementam a lógica de negócio
- **Controladores**: Gerenciam as requisições HTTP
- **Rotas**: Definem os endpoints da API
- **Factory**: Cria e conecta os componentes

## Integração com outros Módulos

- **SRS (Repetição Espaçada)**: Para otimizar o aprendizado com o algoritmo SuperMemo-2
- **Estatísticas de Usuário**: Para acompanhar o desempenho e identificar áreas de melhoria

## Uso

```typescript
// Inicializar o módulo completo
const questionsRouter = createQuestionsModule(db, userStatisticsService);
app.use('/api/questions', questionsRouter);

// Ou inicializar serviços individuais
const questionService = createQuestionService(db);
const questionListService = createQuestionListService(db);
```

## Características Principais

1. **Sistema SRS Integrado**: Otimiza o aprendizado com revisões espaçadas
2. **Analítica Detalhada**: Fornece estatísticas de desempenho por tópico
3. **Listas Personalizadas**: Permite criar coleções específicas para estudo
4. **Histórico Completo**: Mantém registro de todas as interações com questões 