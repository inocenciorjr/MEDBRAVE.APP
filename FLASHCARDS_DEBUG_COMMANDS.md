# 🔧 Comandos de Debug - Sistema de Flashcards

## 📊 Verificações no Supabase

### 1. Verificar Decks Criados
```sql
-- Listar todos os decks do usuário
SELECT 
  id,
  name,
  collection,
  flashcard_count,
  is_public,
  created_at,
  updated_at
FROM decks 
WHERE user_id = 'SEU_USER_ID'
ORDER BY created_at DESC
LIMIT 20;

-- Contar decks por coleção
SELECT 
  collection,
  COUNT(*) as total_decks,
  SUM(flashcard_count) as total_cards
FROM decks 
WHERE user_id = 'SEU_USER_ID'
GROUP BY collection
ORDER BY total_decks DESC;
```

### 2. Verificar Flashcards Criados
```sql
-- Listar flashcards recentes
SELECT 
  f.id,
  f.front_content,
  f.back_content,
  f.deck_id,
  d.name as deck_name,
  f.created_at
FROM flashcards f
JOIN decks d ON f.deck_id = d.id
WHERE d.user_id = 'SEU_USER_ID'
ORDER BY f.created_at DESC
LIMIT 20;

-- Contar flashcards por deck
SELECT 
  d.name as deck_name,
  COUNT(f.id) as total_cards
FROM decks d
LEFT JOIN flashcards f ON d.id = f.deck_id
WHERE d.user_id = 'SEU_USER_ID'
GROUP BY d.id, d.name
ORDER BY total_cards DESC;
```

### 3. Verificar Interações (Revisões)
```sql
-- Listar revisões recentes
SELECT 
  ufi.flashcard_id,
  f.front_content,
  ufi.review_count,
  ufi.last_reviewed_at,
  ufi.next_review_at,
  ufi.difficulty,
  ufi.stability
FROM user_flashcard_interactions ufi
JOIN flashcards f ON ufi.flashcard_id = f.id
WHERE ufi.user_id = 'SEU_USER_ID'
ORDER BY ufi.last_reviewed_at DESC
LIMIT 20;

-- Estatísticas de revisão
SELECT 
  COUNT(*) as total_cards_reviewed,
  AVG(review_count) as avg_reviews_per_card,
  MAX(review_count) as max_reviews,
  COUNT(CASE WHEN next_review_at <= NOW() THEN 1 END) as cards_due
FROM user_flashcard_interactions
WHERE user_id = 'SEU_USER_ID';
```

### 4. Verificar Coleções
```sql
-- Listar coleções
SELECT 
  id,
  name,
  description,
  deck_count,
  card_count,
  is_public,
  created_at
FROM collections
WHERE user_id = 'SEU_USER_ID'
ORDER BY created_at DESC;

-- Verificar hierarquia de decks
SELECT 
  name,
  collection,
  hierarchy,
  hierarchy_path,
  flashcard_count
FROM decks
WHERE user_id = 'SEU_USER_ID'
  AND collection = 'NOME_DA_COLECAO'
ORDER BY hierarchy_path;
```

### 5. Verificar Mídia (R2)
```sql
-- Buscar flashcards com imagens
SELECT 
  f.id,
  f.front_content,
  f.back_content,
  d.name as deck_name
FROM flashcards f
JOIN decks d ON f.deck_id = d.id
WHERE d.user_id = 'SEU_USER_ID'
  AND (
    f.front_content LIKE '%<img%' 
    OR f.back_content LIKE '%<img%'
    OR f.front_content LIKE '%r2.dev%'
    OR f.back_content LIKE '%r2.dev%'
  )
LIMIT 20;

-- Extrair URLs de imagens
SELECT 
  id,
  SUBSTRING(front_content FROM 'src="([^"]+)"') as image_url_front,
  SUBSTRING(back_content FROM 'src="([^"]+)"') as image_url_back
FROM flashcards
WHERE deck_id IN (
  SELECT id FROM decks WHERE user_id = 'SEU_USER_ID'
)
  AND (front_content LIKE '%<img%' OR back_content LIKE '%<img%')
LIMIT 10;
```

### 6. Verificar Índice de Busca
```sql
-- Verificar entradas no índice de busca
SELECT 
  deck_id,
  deck_name,
  collection_name,
  flashcard_count,
  hierarchy_path,
  created_at
FROM flashcard_search_index
WHERE user_id = 'SEU_USER_ID'
ORDER BY created_at DESC
LIMIT 20;
```

## 🔍 Verificações no Backend (Node.js)

### 1. Verificar Logs de Importação
```bash
# Ver logs do servidor
tail -f logs/app.log | grep -i "apkg\|flashcard\|import"

# Ver logs de erro
tail -f logs/error.log | grep -i "flashcard"
```

### 2. Verificar Processamento APKG
```javascript
// No console do Node.js ou em um script de teste
const processador = require('./BACKEND/processador-apkg-completo.js');

// Testar preview
const preview = await processador.processarApkgPreview(
  'caminho/para/arquivo.apkg',
  'user-id-teste'
);
console.log('Preview:', JSON.stringify(preview, null, 2));

// Testar importação completa
const resultado = await processador.processarApkgCompleto(
  'caminho/para/arquivo.apkg',
  'user-id-teste',
  {
    collectionName: 'Teste',
    saveToDatabase: true
  }
);
console.log('Resultado:', JSON.stringify(resultado, null, 2));
```

### 3. Verificar Upload R2
```javascript
// Testar upload de arquivo para R2
const { r2Service } = require('./BACKEND/src/services/r2Service');

const testUpload = async () => {
  const testFile = {
    fileData: Buffer.from('test content'),
    filename: 'test-image.jpg',
    contentType: 'image/jpeg'
  };
  
  const result = await r2Service.uploadFile(
    testFile.fileData,
    `flashcards/test-user/media/${testFile.filename}`,
    testFile.contentType,
    { userId: 'test-user', source: 'test' }
  );
  
  console.log('Upload result:', result);
};

testUpload();
```

## 🌐 Verificações no Frontend (Browser)

### 1. Verificar Requisições HTTP
```javascript
// No DevTools Console
// Monitorar todas as requisições para /api/flashcards
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('/api/flashcards')) {
    console.log('🔵 Flashcard Request:', args[0]);
  }
  return originalFetch.apply(this, args);
};
```

### 2. Verificar Cache
```javascript
// No DevTools Console
// Ver cache de decks
const cacheKey = 'all-decks-{}';
console.log('Cache:', localStorage.getItem(cacheKey));

// Limpar cache
import { clearFlashcardCache } from '@/services/flashcardService';
clearFlashcardCache();
console.log('Cache limpo!');
```

### 3. Verificar Estado de Importação
```javascript
// No DevTools Console
// Verificar progresso de importação
fetch('/api/flashcards/import-progress/SEU_USER_ID', {
  headers: {
    'Authorization': 'Bearer SEU_TOKEN'
  }
})
.then(r => r.json())
.then(data => console.log('Progresso:', data));
```

### 4. Testar Serviços
```javascript
// No DevTools Console
import * as flashcardService from '@/services/flashcardService';

// Testar busca de decks
const decks = await flashcardService.getAllDecks();
console.log('Decks:', decks);

// Testar busca de coleções
const collections = await flashcardService.getCollectionsMetadata();
console.log('Coleções:', collections);

// Testar busca global
const results = await flashcardService.globalFlashcardSearch('medicina');
console.log('Resultados:', results);
```

## 🐛 Debug de Problemas Comuns

### Problema 1: Imagens Não Carregam
```sql
-- Verificar se URLs estão corretas
SELECT 
  id,
  front_content,
  back_content
FROM flashcards
WHERE deck_id IN (SELECT id FROM decks WHERE user_id = 'SEU_USER_ID')
  AND (front_content LIKE '%<img%' OR back_content LIKE '%<img%')
LIMIT 5;

-- Verificar se URLs são do R2
-- URLs devem começar com: https://pub-xxx.r2.dev/
```

```javascript
// No browser, verificar se imagem carrega
const testImageUrl = 'URL_DA_IMAGEM_DO_R2';
const img = new Image();
img.onload = () => console.log('✅ Imagem carregou!');
img.onerror = () => console.log('❌ Erro ao carregar imagem');
img.src = testImageUrl;
```

### Problema 2: Importação Falha
```bash
# Ver logs detalhados
tail -f logs/app.log | grep -A 10 "processarApkgCompleto"

# Verificar permissões de arquivo
ls -la uploads/temp/

# Verificar espaço em disco
df -h
```

```sql
-- Verificar se decks foram criados parcialmente
SELECT * FROM decks 
WHERE user_id = 'SEU_USER_ID' 
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Problema 3: Autenticação Falha
```javascript
// No DevTools Console
// Verificar token
const token = localStorage.getItem('supabase.auth.token');
console.log('Token:', token);

// Verificar se token é válido
fetch('/api/flashcards/decks', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(data => console.log('Data:', data));
```

### Problema 4: Busca Não Retorna Resultados
```sql
-- Verificar índice de busca
SELECT COUNT(*) FROM flashcard_search_index 
WHERE user_id = 'SEU_USER_ID';

-- Reindexar manualmente (se necessário)
-- Executar no backend:
```

```javascript
const { searchIndexService } = require('./BACKEND/src/infra/studyTools/supabase/SupabaseSearchIndexService');

// Reindexar todos os decks do usuário
const decks = await supabase
  .from('decks')
  .select('*')
  .eq('user_id', 'SEU_USER_ID');

for (const deck of decks.data) {
  await searchIndexService.addDeckToIndex({
    user_id: deck.user_id,
    deck_id: deck.id,
    deck_name: deck.name,
    deck_description: deck.description || '',
    collection_name: deck.collection || '',
    flashcard_count: deck.flashcard_count || 0,
    hierarchy: deck.hierarchy,
    hierarchy_path: deck.hierarchyPath,
    path: deck.path
  });
}
```

## 📊 Monitoramento de Performance

### 1. Tempo de Resposta das APIs
```javascript
// No DevTools Console
const measureApiTime = async (url) => {
  const start = performance.now();
  await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
    }
  });
  const end = performance.now();
  console.log(`${url}: ${(end - start).toFixed(2)}ms`);
};

// Testar endpoints
measureApiTime('/api/flashcards/decks');
measureApiTime('/api/flashcards/collections/metadata');
measureApiTime('/api/flashcards/search?q=medicina');
```

### 2. Tamanho das Respostas
```javascript
// No DevTools Console
const measureResponseSize = async (url) => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
    }
  });
  const data = await response.json();
  const size = new Blob([JSON.stringify(data)]).size;
  console.log(`${url}: ${(size / 1024).toFixed(2)} KB`);
};

measureResponseSize('/api/flashcards/decks');
```

### 3. Cache Hit Rate
```javascript
// No DevTools Console
let cacheHits = 0;
let cacheMisses = 0;

const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (url.includes('/api/flashcards')) {
    // Verificar se está no cache (simplificado)
    const cached = sessionStorage.getItem(url);
    if (cached) {
      cacheHits++;
      console.log(`✅ Cache HIT: ${url} (${cacheHits}/${cacheHits + cacheMisses})`);
    } else {
      cacheMisses++;
      console.log(`❌ Cache MISS: ${url} (${cacheHits}/${cacheHits + cacheMisses})`);
    }
  }
  return originalFetch.apply(this, args);
};
```

## 🔐 Verificações de Segurança

### 1. Verificar RLS (Row Level Security)
```sql
-- Tentar acessar dados de outro usuário (deve falhar)
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.sub = 'SEU_USER_ID';

-- Deve retornar apenas seus dados
SELECT * FROM decks;

-- Tentar acessar dados de outro usuário (deve retornar vazio)
SELECT * FROM decks WHERE user_id != 'SEU_USER_ID';
```

### 2. Verificar Políticas RLS
```sql
-- Ver políticas ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('decks', 'flashcards', 'collections', 'user_flashcard_interactions')
ORDER BY tablename, policyname;
```

### 3. Testar Autorização
```bash
# Tentar acessar deck de outro usuário
curl -X GET "http://localhost:5000/api/flashcards/decks/DECK_ID_DE_OUTRO_USER" \
  -H "Authorization: Bearer SEU_TOKEN"

# Deve retornar 403 Forbidden
```

## 📝 Logs Úteis

### Backend
```bash
# Logs gerais
tail -f logs/app.log

# Logs de erro
tail -f logs/error.log

# Logs de importação APKG
tail -f logs/app.log | grep "APKG\|processador"

# Logs de upload R2
tail -f logs/app.log | grep "R2\|upload"
```

### Frontend (Browser Console)
```javascript
// Ativar logs detalhados
localStorage.setItem('debug', 'flashcards:*');

// Ver todos os logs de flashcards
// Recarregar página
```

## 🎯 Comandos Rápidos

```bash
# Reiniciar backend
npm run dev

# Limpar cache do backend
rm -rf node_modules/.cache

# Verificar conexão com Supabase
curl -X GET "https://SEU_PROJETO.supabase.co/rest/v1/decks?select=count" \
  -H "apikey: SUA_ANON_KEY" \
  -H "Authorization: Bearer SEU_TOKEN"

# Verificar conexão com R2
curl -I "https://pub-xxx.r2.dev/flashcards/test.jpg"
```

---

**Dica**: Salve este arquivo para referência rápida durante debug e manutenção do sistema!
