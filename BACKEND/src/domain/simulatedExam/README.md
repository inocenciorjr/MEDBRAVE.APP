# Módulo SimulatedExam

## Descrição
O módulo SimulatedExam implementa a funcionalidade de simulados para os usuários da plataforma, permitindo a realização de provas com tempos definidos e questões de múltipla escolha, com registro de resultados e estatísticas de desempenho.

## Funcionalidades
- Criação, edição e gerenciamento de simulados (admin)
- Realização de simulados por usuários
- Resposta a questões e registro do tempo gasto
- Finalização e cálculo automático de pontuação
- Estatísticas de desempenho por usuário
- Listagem de simulados com filtragem e paginação

## Estrutura

### Tipos e Interfaces
- `SimulatedExam`: Representa um simulado com suas questões, dificuldade, tempo limite, etc.
- `SimulatedExamResult`: Representa o resultado de uma tentativa de simulado por um usuário
- `SimulatedExamAnswer`: Representa uma resposta a uma questão do simulado
- `ISimulatedExamService`: Interface do serviço principal com métodos para gerenciar simulados

### Controladores
- `SimulatedExamController`: Gerencia as requisições HTTP para criar, listar, iniciar e finalizar simulados

### Serviços
- `SupabaseSimulatedExamService`: Implementa a lógica de negócio para simulados utilizando Supabase como backend

### Rotas
- `/simulatedExams`: Rotas para gerenciamento de simulados
- `/simulatedExams/start`: Iniciar um simulado
- `/simulatedExams/answer`: Submeter uma resposta
- `/simulatedExams/finish`: Finalizar um simulado
- `/simulatedExams/results`: Obter resultados de simulados
- `/simulatedExams/statistics`: Obter estatísticas de desempenho

### Validação
- `simulatedExamValidators.ts`: Esquemas de validação usando Zod para garantir a integridade dos dados

## Fluxo de Uso
1. O administrador cria simulados através da rota POST `/simulatedExams`
2. Os usuários podem listar simulados disponíveis via GET `/simulatedExams`
3. Um usuário inicia um simulado via POST `/simulatedExams/start`
4. O usuário responde questões via POST `/simulatedExams/answer`
5. Ao terminar, o usuário finaliza o simulado via POST `/simulatedExams/finish`
6. O usuário pode consultar seus resultados via GET `/simulatedExams/my/results`
7. O usuário pode ver suas estatísticas via GET `/simulatedExams/my/statistics`

## Exemplos de Uso

### Criação de um Simulado (Admin)
```json
POST /simulatedExams
{
  "title": "Simulado de Anatomia",
  "description": "Simulado para testar conhecimentos em anatomia básica",
  "timeLimit": 60,
  "questions": [
    { "questionId": "q123", "order": 0, "points": 1 },
    { "questionId": "q456", "order": 1, "points": 2 }
  ],
  "difficulty": "medium",
  "isPublic": true
}
```

### Iniciar um Simulado
```json
POST /simulatedExams/start
{
  "examId": "exam123"
}
```

### Submeter uma Resposta
```json
POST /simulatedExams/answer
{
  "resultId": "result123",
  "questionId": "q123",
  "answerId": "a456",
  "timeSpent": 45
}
```