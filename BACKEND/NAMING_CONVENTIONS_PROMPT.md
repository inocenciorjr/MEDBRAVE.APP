# PROMPT PARA CONVENÇÕES DE NOMENCLATURA - MEDBRAVE

## INSTRUÇÕES PARA O ASSISTENTE

### REGRA FUNDAMENTAL
**SEMPRE use snake_case para propriedades que vão para o banco de dados (Supabase)**
**SEMPRE use camelCase para propriedades que ficam apenas no código TypeScript/JavaScript**

### QUANDO USAR snake_case:
- Todas as colunas do banco de dados Supabase
- Propriedades em interfaces que representam dados do banco
- Parâmetros de métodos que serão enviados diretamente para queries SQL
- Campos em DTOs que serão mapeados para o banco

### QUANDO USAR camelCase:
- Propriedades de classes TypeScript
- Variáveis locais no código
- Métodos e funções
- Propriedades que são apenas para lógica interna

### EXEMPLOS PRÁTICOS:

#### ✅ CORRETO - Interface para banco de dados:
```typescript
interface Flashcard {
  id: string;
  user_id: string;        // snake_case - vai para o banco
  deck_id: string;        // snake_case - vai para o banco
  created_at: Date;       // snake_case - vai para o banco
  updated_at: Date;       // snake_case - vai para o banco
}
```

#### ✅ CORRETO - Método que recebe parâmetros do banco:
```typescript
findByUser(user_id: string, deck_id?: string) // snake_case - parâmetros do banco
```

#### ✅ CORRETO - Variáveis internas do código:
```typescript
const flashcardService = new FlashcardService(); // camelCase - variável interna
const currentUser = await userService.getCurrentUser(); // camelCase - variável interna
```

### COMO INSTRUIR O ASSISTENTE:

**Para conversão para snake_case:**
"Converta todas as propriedades relacionadas ao banco de dados para snake_case"

**Para manter camelCase:**
"Mantenha camelCase apenas para variáveis e métodos internos do código"

**Para correção específica:**
"Na interface [NomeInterface], converta [propriedade] para snake_case pois ela representa uma coluna do banco"

### CONTEXTO DO PROJETO:
- Backend: Node.js + TypeScript
- Banco de dados: Supabase (PostgreSQL)
- Padrão do Supabase: snake_case para colunas
- Padrão do TypeScript: camelCase para código

### REGRA DE OURO:
**Se a propriedade existe como coluna no Supabase = snake_case**
**Se a propriedade é apenas código TypeScript = camelCase**