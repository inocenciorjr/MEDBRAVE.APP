# Módulo de Integração

## Descrição

O módulo de Integração fornece funcionalidades para importação e exportação de dados entre o sistema MedPulse Academy e sistemas externos. Através deste módulo, é possível criar e gerenciar jobs de importação e exportação de dados em diferentes formatos (JSON, CSV, Excel).

## Principais Recursos

- Criação de jobs de importação/exportação
- Execução assíncrona de processamentos
- Mapeamento de campos para compatibilidade
- Monitoramento de progresso de execução
- Exportação em múltiplos formatos (JSON, CSV, Excel)
- Importação de dados a partir de URLs externas

## Componentes

### Tipos

O módulo utiliza as seguintes interfaces e tipos principais:

- `DataJob`: Define a estrutura de um job de importação/exportação
- `DataJobType`: Enum para tipos de jobs (IMPORT, EXPORT)
- `DataFormat`: Enum para formatos de dados (JSON, CSV, EXCEL)
- `DataJobStatus`: Enum para status de jobs (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)

### Serviços

- `IDataImportExportService`: Interface que define o contrato para serviços de importação/exportação
- `FirebaseDataImportExportService`: Implementação do serviço utilizando Firebase

### Controladores

- `DataImportExportController`: Gerencia as requisições HTTP

### Factory

- `createIntegrationModule`: Factory para criação do módulo

## Uso da API

### Criar um Job de Importação

```http
POST /api/data-jobs

{
  "type": "import",
  "name": "Importação de Usuários",
  "description": "Importação de lista de usuários via CSV",
  "collection": "users",
  "format": "csv",
  "sourceUrl": "https://exemplo.com/usuarios.csv",
  "mappings": {
    "nome": "name",
    "email": "email",
    "telefone": "phone"
  }
}
```

### Criar um Job de Exportação

```http
POST /api/data-jobs

{
  "type": "export",
  "name": "Exportação de Questões",
  "description": "Exportação de questões para Excel",
  "collection": "questions",
  "format": "excel",
  "query": {
    "subject": "anatomia",
    "difficulty": "medium"
  }
}
```

### Listar Jobs

```http
GET /api/data-jobs?type=import&status=completed&limit=10&offset=0
```

### Obter Job por ID

```http
GET /api/data-jobs/123456
```

### Cancelar um Job

```http
PUT /api/data-jobs/123456/cancel
```

### Excluir um Job

```http
DELETE /api/data-jobs/123456
```

## Fluxo de Importação/Exportação

1. **Criação**: Um job é criado com status `PENDING`
2. **Execução**: O serviço inicia o processamento, atualizando o status para `PROCESSING`
3. **Progresso**: Durante o processamento, o progresso é atualizado
4. **Conclusão**: Ao finalizar, o status é atualizado para `COMPLETED` ou `FAILED`
5. **Resultado**: Para jobs de exportação, uma URL é gerada para download do arquivo resultante

## Permissões

- A criação e execução de jobs é restrita a usuários administradores
- Usuários comuns podem visualizar apenas seus próprios jobs
- Administradores podem ver e gerenciar todos os jobs

## Limitações

- Tamanho máximo de arquivo: 50MB
- Formatos suportados: JSON, CSV, Excel
- Limite de 10 jobs por hora para criação
- Limite de 5 execuções por hora para importação/exportação 