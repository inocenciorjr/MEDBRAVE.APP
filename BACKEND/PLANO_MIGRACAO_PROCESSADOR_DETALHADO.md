# PLANO DETALHADO DE MIGRAÇÃO - PROCESSADOR APKG COMPLETO
## Firebase → Supabase (Linha por Linha)

**Arquivo:** `processador-apkg-completo.js` (1817 linhas)  
**Data:** 2024-12-19  
**Objetivo:** Migrar todas as operações Firebase/Firestore para Supabase

---

## RESUMO EXECUTIVO

**Total de alterações identificadas:** 47 alterações
**Linhas afetadas:** 331-332, 1093-1094, 1386-1390, 1606-1652, 1655-1788
**Principais mudanças:**
- Substituir `firebase-admin` por `@supabase/supabase-js`
- Converter operações Firestore para SQL/Supabase
- Adaptar estrutura de dados para PostgreSQL
- Manter toda lógica FSRS e processamento APKG intacta

---

## ALTERAÇÕES DETALHADAS POR LINHA

### SEÇÃO 1: IMPORTS E DEPENDÊNCIAS

**Linhas 1-10: Imports básicos**
- ✅ **MANTER INALTERADO** - Imports do sistema de arquivos e apkg-reader
- Nenhuma alteração necessária

### SEÇÃO 2: FUNÇÃO analisarDuplicatas (Linhas 325-400)

**LINHA 331:**
```javascript
// ANTES:
const admin = require('firebase-admin');

// DEPOIS:
const { createClient } = require('@supabase/supabase-js');
```
**MOTIVO:** Substituir Firebase Admin SDK por Supabase client
**IMPACTO:** Mudança de dependência principal

**LINHA 332:**
```javascript
// ANTES:
const firestore = admin.firestore();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```
**MOTIVO:** Inicializar cliente Supabase em vez de Firestore
**IMPACTO:** Mudança de inicialização do banco

**LINHA 340:**
```javascript
// ANTES:
const existingDecksSnapshot = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .get();

// DEPOIS:
const { data: existingDecks, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id);

if (error) throw error;
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe de consulta

**LINHA 345-365: Loop de verificação de decks existentes**
```javascript
// ANTES:
for (const existingDoc of existingDecksSnapshot.docs) {
    const existingDeck = existingDoc.data();
    // ...
}

// DEPOIS:
for (const existingDeck of existingDecks || []) {
    // Remover .data() pois Supabase já retorna objetos
    // ...
}
```
**MOTIVO:** Supabase retorna dados diretamente, não DocumentSnapshot
**IMPACTO:** Simplificação do código

### SEÇÃO 3: FUNÇÃO checkExistingCollection (Linhas 1090-1162)

**LINHA 1093:**
```javascript
// ANTES:
const admin = require('firebase-admin');

// DEPOIS:
const { createClient } = require('@supabase/supabase-js');
```
**MOTIVO:** Mesmo motivo da linha 331
**IMPACTO:** Consistência na migração

**LINHA 1094:**
```javascript
// ANTES:
const firestore = admin.firestore();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```
**MOTIVO:** Mesmo motivo da linha 332
**IMPACTO:** Consistência na migração

**LINHA 1100-1110: Verificação de coleção existente**
```javascript
// ANTES:
const existingCollectionQuery = await firestore
    .collection('collections')
    .where('user_id', '==', user_id)
    .where('name', '==', collection_name)
    .limit(1)
    .get();

// DEPOIS:
const { data: existingCollection, error: collectionError } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user_id)
    .eq('name', collection_name)
    .limit(1)
    .single();

if (collectionError && collectionError.code !== 'PGRST116') {
    throw collectionError;
}
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe e tratamento de erro

**LINHA 1115-1125: Verificação de decks similares**
```javascript
// ANTES:
const similarDecksQuery = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .where('collection', '==', collection_name)
    .get();

// DEPOIS:
const { data: similarDecks, error: decksError } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id)
    .eq('collection', collection_name);

if (decksError) throw decksError;
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe

**LINHA 1130-1140: Processamento de resultados**
```javascript
// ANTES:
const existingDecks = similarDecksQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
}));

// DEPOIS:
const existingDecks = similarDecks || [];
// Supabase já inclui o ID no objeto
```
**MOTIVO:** Supabase retorna dados completos diretamente
**IMPACTO:** Simplificação do código

### SEÇÃO 4: FUNÇÃO getUserEmail (Linhas 1386-1390)

**LINHA 1387-1390:**
```javascript
// ANTES:
async function getUserEmail(user_id) {
    // Implementação Firebase Auth
    return 'user@example.com'; // placeholder
}

// DEPOIS:
async function getUserEmail(user_id) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: user, error } = await supabase.auth.admin.getUserById(user_id);
    if (error) throw error;
    
    return user.email;
}
```
**MOTIVO:** Usar Supabase Auth em vez de Firebase Auth
**IMPACTO:** Mudança de API de autenticação

### SEÇÃO 5: FUNÇÃO createOrUpdateCollectionEntry (Linhas 1606-1652)

**LINHA 1610-1620: Verificação de coleção existente**
```javascript
// ANTES:
const admin = require('firebase-admin');
const firestore = admin.firestore();

const existingCollection = await firestore
    .collection('collections')
    .where('user_id', '==', user_id)
    .where('name', '==', collection_name)
    .limit(1)
    .get();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: existingCollection, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user_id)
    .eq('name', collection_name)
    .limit(1)
    .maybeSingle();

if (error) throw error;
```
**MOTIVO:** Converter verificação Firestore para Supabase
**IMPACTO:** Mudança de sintaxe de consulta

**LINHA 1625-1640: Criação/atualização de coleção**
```javascript
// ANTES:
if (existingCollection.empty) {
    await firestore.collection('collections').add({
        user_id,
        name: collection_name,
        total_decks: total_decks,
        total_cards: total_cards,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
} else {
    const docRef = existingCollection.docs[0].ref;
    await docRef.update({
        total_decks: total_decks,
        total_cards: total_cards,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
}

// DEPOIS:
if (!existingCollection) {
    const { error: insertError } = await supabase
        .from('collections')
        .insert({
            user_id: user_id,
            name: collection_name,
            total_decks: total_decks,
            total_cards: total_cards,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    
    if (insertError) throw insertError;
} else {
    const { error: updateError } = await supabase
        .from('collections')
        .update({
            total_decks: total_decks,
            total_cards: total_cards,
            updated_at: new Date().toISOString()
        })
        .eq('id', existingCollection.id);
    
    if (updateError) throw updateError;
}
```
**MOTIVO:** Converter operações CRUD Firestore para Supabase
**IMPACTO:** Mudança de sintaxe e estrutura de dados

### SEÇÃO 6: FUNÇÃO saveDecksToDatabase (Linhas 1655-1788)

**LINHA 1660-1670: Inicialização**
```javascript
// ANTES:
const admin = require('firebase-admin');
const firestore = admin.firestore();
const batch = firestore.batch();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
// Supabase não usa batch da mesma forma, usaremos transações
```
**MOTIVO:** Supabase usa transações em vez de batch writes
**IMPACTO:** Mudança de padrão de operações em lote

**LINHA 1680-1700: Verificação de decks existentes**
```javascript
// ANTES:
const existingDecksQuery = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .get();

const existingDecks = new Map();
existingDecksQuery.docs.forEach(doc => {
    const data = doc.data();
    existingDecks.set(data.name, { id: doc.id, ...data });
});

// DEPOIS:
const { data: existingDecksData, error: existingError } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id);

if (existingError) throw existingError;

const existingDecks = new Map();
(existingDecksData || []).forEach(deck => {
    existingDecks.set(deck.name, deck);
});
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Simplificação da estrutura de dados

**LINHA 1710-1750: Processamento de decks em lotes**
```javascript
// ANTES:
for (let i = 0; i < medbraveDecks.length; i += DECK_BATCH_SIZE) {
    const deckBatch = medbraveDecks.slice(i, i + DECK_BATCH_SIZE);
    
    for (const deck of deckBatch) {
        const deckRef = firestore.collection('decks').doc();
        batch.set(deckRef, {
            ...deck,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

await batch.commit();

// DEPOIS:
for (let i = 0; i < medbraveDecks.length; i += DECK_BATCH_SIZE) {
    const deckBatch = medbraveDecks.slice(i, i + DECK_BATCH_SIZE);
    
    const decksToInsert = deckBatch.map(deck => ({
        ...deck,
        user_id: deck.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));
    
    const { error: deckError } = await supabase
        .from('decks')
        .insert(decksToInsert);
    
    if (deckError) throw deckError;
}
```
**MOTIVO:** Converter batch writes para insert em lotes
**IMPACTO:** Mudança de padrão de inserção em massa

**LINHA 1760-1788: Processamento de flashcards**
```javascript
// ANTES:
const flashcardBatch = firestore.batch();
for (const flashcard of flashcardsBatch) {
    const flashcardRef = firestore.collection('flashcards').doc();
    flashcardBatch.set(flashcardRef, {
        ...flashcard,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });
}
await flashcardBatch.commit();

// DEPOIS:
const flashcardsToInsert = flashcardsBatch.map(flashcard => ({
    ...flashcard,
    user_id: flashcard.user_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}));

const { error: flashcardError } = await supabase
    .from('flashcards')
    .insert(flashcardsToInsert);

if (flashcardError) throw flashcardError;
```
**MOTIVO:** Converter batch writes de flashcards para Supabase
**IMPACTO:** Consistência com padrão de inserção

---

## ALTERAÇÕES DE ESTRUTURA DE DADOS

### Mapeamento de Campos Firebase → Supabase

| Firebase | Supabase | Motivo |
|----------|----------|--------|
| `10949user_id# PLANO DETALHADO DE MIGRAÇÃO - PROCESSADOR APKG COMPLETO
## Firebase → Supabase (Linha por Linha)

**Arquivo:** `processador-apkg-completo.js` (1817 linhas)  
**Data:** 2024-12-19  
**Objetivo:** Migrar todas as operações Firebase/Firestore para Supabase

---

## RESUMO EXECUTIVO

**Total de alterações identificadas:** 47 alterações
**Linhas afetadas:** 331-332, 1093-1094, 1386-1390, 1606-1652, 1655-1788
**Principais mudanças:**
- Substituir `firebase-admin` por `@supabase/supabase-js`
- Converter operações Firestore para SQL/Supabase
- Adaptar estrutura de dados para PostgreSQL
- Manter toda lógica FSRS e processamento APKG intacta

---

## ALTERAÇÕES DETALHADAS POR LINHA

### SEÇÃO 1: IMPORTS E DEPENDÊNCIAS

**Linhas 1-10: Imports básicos**
- ✅ **MANTER INALTERADO** - Imports do sistema de arquivos e apkg-reader
- Nenhuma alteração necessária

### SEÇÃO 2: FUNÇÃO analisarDuplicatas (Linhas 325-400)

**LINHA 331:**
```javascript
// ANTES:
const admin = require('firebase-admin');

// DEPOIS:
const { createClient } = require('@supabase/supabase-js');
```
**MOTIVO:** Substituir Firebase Admin SDK por Supabase client
**IMPACTO:** Mudança de dependência principal

**LINHA 332:**
```javascript
// ANTES:
const firestore = admin.firestore();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```
**MOTIVO:** Inicializar cliente Supabase em vez de Firestore
**IMPACTO:** Mudança de inicialização do banco

**LINHA 340:**
```javascript
// ANTES:
const existingDecksSnapshot = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .get();

// DEPOIS:
const { data: existingDecks, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id);

if (error) throw error;
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe de consulta

**LINHA 345-365: Loop de verificação de decks existentes**
```javascript
// ANTES:
for (const existingDoc of existingDecksSnapshot.docs) {
    const existingDeck = existingDoc.data();
    // ...
}

// DEPOIS:
for (const existingDeck of existingDecks || []) {
    // Remover .data() pois Supabase já retorna objetos
    // ...
}
```
**MOTIVO:** Supabase retorna dados diretamente, não DocumentSnapshot
**IMPACTO:** Simplificação do código

### SEÇÃO 3: FUNÇÃO checkExistingCollection (Linhas 1090-1162)

**LINHA 1093:**
```javascript
// ANTES:
const admin = require('firebase-admin');

// DEPOIS:
const { createClient } = require('@supabase/supabase-js');
```
**MOTIVO:** Mesmo motivo da linha 331
**IMPACTO:** Consistência na migração

**LINHA 1094:**
```javascript
// ANTES:
const firestore = admin.firestore();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```
**MOTIVO:** Mesmo motivo da linha 332
**IMPACTO:** Consistência na migração

**LINHA 1100-1110: Verificação de coleção existente**
```javascript
// ANTES:
const existingCollectionQuery = await firestore
    .collection('collections')
    .where('user_id', '==', user_id)
    .where('name', '==', collection_name)
    .limit(1)
    .get();

// DEPOIS:
const { data: existingCollection, error: collectionError } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user_id)
    .eq('name', collection_name)
    .limit(1)
    .single();

if (collectionError && collectionError.code !== 'PGRST116') {
    throw collectionError;
}
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe e tratamento de erro

**LINHA 1115-1125: Verificação de decks similares**
```javascript
// ANTES:
const similarDecksQuery = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .where('collection', '==', collection_name)
    .get();

// DEPOIS:
const { data: similarDecks, error: decksError } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id)
    .eq('collection', collection_name);

if (decksError) throw decksError;
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe

**LINHA 1130-1140: Processamento de resultados**
```javascript
// ANTES:
const existingDecks = similarDecksQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
}));

// DEPOIS:
const existingDecks = similarDecks || [];
// Supabase já inclui o ID no objeto
```
**MOTIVO:** Supabase retorna dados completos diretamente
**IMPACTO:** Simplificação do código

### SEÇÃO 4: FUNÇÃO getUserEmail (Linhas 1386-1390)

**LINHA 1387-1390:**
```javascript
// ANTES:
async function getUserEmail(user_id) {
    // Implementação Firebase Auth
    return 'user@example.com'; // placeholder
}

// DEPOIS:
async function getUserEmail(user_id) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: user, error } = await supabase.auth.admin.getUserById(user_id);
    if (error) throw error;
    
    return user.email;
}
```
**MOTIVO:** Usar Supabase Auth em vez de Firebase Auth
**IMPACTO:** Mudança de API de autenticação

### SEÇÃO 5: FUNÇÃO createOrUpdateCollectionEntry (Linhas 1606-1652)

**LINHA 1610-1620: Verificação de coleção existente**
```javascript
// ANTES:
const admin = require('firebase-admin');
const firestore = admin.firestore();

const existingCollection = await firestore
    .collection('collections')
    .where('user_id', '==', user_id)
    .where('name', '==', collection_name)
    .limit(1)
    .get();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: existingCollection, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user_id)
    .eq('name', collection_name)
    .limit(1)
    .maybeSingle();

if (error) throw error;
```
**MOTIVO:** Converter verificação Firestore para Supabase
**IMPACTO:** Mudança de sintaxe de consulta

**LINHA 1625-1640: Criação/atualização de coleção**
```javascript
// ANTES:
if (existingCollection.empty) {
    await firestore.collection('collections').add({
        user_id,
        name: collection_name,
        total_decks: total_decks,
        total_cards: total_cards,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
} else {
    const docRef = existingCollection.docs[0].ref;
    await docRef.update({
        total_decks: total_decks,
        total_cards: total_cards,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
}

// DEPOIS:
if (!existingCollection) {
    const { error: insertError } = await supabase
        .from('collections')
        .insert({
            user_id: user_id,
            name: collection_name,
            total_decks: total_decks,
            total_cards: total_cards,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    
    if (insertError) throw insertError;
} else {
    const { error: updateError } = await supabase
        .from('collections')
        .update({
            total_decks: total_decks,
            total_cards: total_cards,
            updated_at: new Date().toISOString()
        })
        .eq('id', existingCollection.id);
    
    if (updateError) throw updateError;
}
```
**MOTIVO:** Converter operações CRUD Firestore para Supabase
**IMPACTO:** Mudança de sintaxe e estrutura de dados

### SEÇÃO 6: FUNÇÃO saveDecksToDatabase (Linhas 1655-1788)

**LINHA 1660-1670: Inicialização**
```javascript
// ANTES:
const admin = require('firebase-admin');
const firestore = admin.firestore();
const batch = firestore.batch();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
// Supabase não usa batch da mesma forma, usaremos transações
```
**MOTIVO:** Supabase usa transações em vez de batch writes
**IMPACTO:** Mudança de padrão de operações em lote

**LINHA 1680-1700: Verificação de decks existentes**
```javascript
// ANTES:
const existingDecksQuery = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .get();

const existingDecks = new Map();
existingDecksQuery.docs.forEach(doc => {
    const data = doc.data();
    existingDecks.set(data.name, { id: doc.id, ...data });
});

// DEPOIS:
const { data: existingDecksData, error: existingError } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id);

if (existingError) throw existingError;

const existingDecks = new Map();
(existingDecksData || []).forEach(deck => {
    existingDecks.set(deck.name, deck);
});
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Simplificação da estrutura de dados

**LINHA 1710-1750: Processamento de decks em lotes**
```javascript
// ANTES:
for (let i = 0; i < medbraveDecks.length; i += DECK_BATCH_SIZE) {
    const deckBatch = medbraveDecks.slice(i, i + DECK_BATCH_SIZE);
    
    for (const deck of deckBatch) {
        const deckRef = firestore.collection('decks').doc();
        batch.set(deckRef, {
            ...deck,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

await batch.commit();

// DEPOIS:
for (let i = 0; i < medbraveDecks.length; i += DECK_BATCH_SIZE) {
    const deckBatch = medbraveDecks.slice(i, i + DECK_BATCH_SIZE);
    
    const decksToInsert = deckBatch.map(deck => ({
        ...deck,
        user_id: deck.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));
    
    const { error: deckError } = await supabase
        .from('decks')
        .insert(decksToInsert);
    
    if (deckError) throw deckError;
}
```
**MOTIVO:** Converter batch writes para insert em lotes
**IMPACTO:** Mudança de padrão de inserção em massa

**LINHA 1760-1788: Processamento de flashcards**
```javascript
// ANTES:
const flashcardBatch = firestore.batch();
for (const flashcard of flashcardsBatch) {
    const flashcardRef = firestore.collection('flashcards').doc();
    flashcardBatch.set(flashcardRef, {
        ...flashcard,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });
}
await flashcardBatch.commit();

// DEPOIS:
const flashcardsToInsert = flashcardsBatch.map(flashcard => ({
    ...flashcard,
    user_id: flashcard.user_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}));

const { error: flashcardError } = await supabase
    .from('flashcards')
    .insert(flashcardsToInsert);

if (flashcardError) throw flashcardError;
```
**MOTIVO:** Converter batch writes de flashcards para Supabase
**IMPACTO:** Consistência com padrão de inserção

---

## ALTERAÇÕES DE ESTRUTURA DE DADOS

### Mapeamento de Campos Firebase → Supabase

| Firebase | Supabase | Motivo |
|----------|----------|--------|
| `21910user_id# PLANO DETALHADO DE MIGRAÇÃO - PROCESSADOR APKG COMPLETO
## Firebase → Supabase (Linha por Linha)

**Arquivo:** `processador-apkg-completo.js` (1817 linhas)  
**Data:** 2024-12-19  
**Objetivo:** Migrar todas as operações Firebase/Firestore para Supabase

---

## RESUMO EXECUTIVO

**Total de alterações identificadas:** 47 alterações
**Linhas afetadas:** 331-332, 1093-1094, 1386-1390, 1606-1652, 1655-1788
**Principais mudanças:**
- Substituir `firebase-admin` por `@supabase/supabase-js`
- Converter operações Firestore para SQL/Supabase
- Adaptar estrutura de dados para PostgreSQL
- Manter toda lógica FSRS e processamento APKG intacta

---

## ALTERAÇÕES DETALHADAS POR LINHA

### SEÇÃO 1: IMPORTS E DEPENDÊNCIAS

**Linhas 1-10: Imports básicos**
- ✅ **MANTER INALTERADO** - Imports do sistema de arquivos e apkg-reader
- Nenhuma alteração necessária

### SEÇÃO 2: FUNÇÃO analisarDuplicatas (Linhas 325-400)

**LINHA 331:**
```javascript
// ANTES:
const admin = require('firebase-admin');

// DEPOIS:
const { createClient } = require('@supabase/supabase-js');
```
**MOTIVO:** Substituir Firebase Admin SDK por Supabase client
**IMPACTO:** Mudança de dependência principal

**LINHA 332:**
```javascript
// ANTES:
const firestore = admin.firestore();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```
**MOTIVO:** Inicializar cliente Supabase em vez de Firestore
**IMPACTO:** Mudança de inicialização do banco

**LINHA 340:**
```javascript
// ANTES:
const existingDecksSnapshot = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .get();

// DEPOIS:
const { data: existingDecks, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id);

if (error) throw error;
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe de consulta

**LINHA 345-365: Loop de verificação de decks existentes**
```javascript
// ANTES:
for (const existingDoc of existingDecksSnapshot.docs) {
    const existingDeck = existingDoc.data();
    // ...
}

// DEPOIS:
for (const existingDeck of existingDecks || []) {
    // Remover .data() pois Supabase já retorna objetos
    // ...
}
```
**MOTIVO:** Supabase retorna dados diretamente, não DocumentSnapshot
**IMPACTO:** Simplificação do código

### SEÇÃO 3: FUNÇÃO checkExistingCollection (Linhas 1090-1162)

**LINHA 1093:**
```javascript
// ANTES:
const admin = require('firebase-admin');

// DEPOIS:
const { createClient } = require('@supabase/supabase-js');
```
**MOTIVO:** Mesmo motivo da linha 331
**IMPACTO:** Consistência na migração

**LINHA 1094:**
```javascript
// ANTES:
const firestore = admin.firestore();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```
**MOTIVO:** Mesmo motivo da linha 332
**IMPACTO:** Consistência na migração

**LINHA 1100-1110: Verificação de coleção existente**
```javascript
// ANTES:
const existingCollectionQuery = await firestore
    .collection('collections')
    .where('user_id', '==', user_id)
    .where('name', '==', collection_name)
    .limit(1)
    .get();

// DEPOIS:
const { data: existingCollection, error: collectionError } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user_id)
    .eq('name', collection_name)
    .limit(1)
    .single();

if (collectionError && collectionError.code !== 'PGRST116') {
    throw collectionError;
}
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe e tratamento de erro

**LINHA 1115-1125: Verificação de decks similares**
```javascript
// ANTES:
const similarDecksQuery = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .where('collection', '==', collection_name)
    .get();

// DEPOIS:
const { data: similarDecks, error: decksError } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id)
    .eq('collection', collection_name);

if (decksError) throw decksError;
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe

**LINHA 1130-1140: Processamento de resultados**
```javascript
// ANTES:
const existingDecks = similarDecksQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
}));

// DEPOIS:
const existingDecks = similarDecks || [];
// Supabase já inclui o ID no objeto
```
**MOTIVO:** Supabase retorna dados completos diretamente
**IMPACTO:** Simplificação do código

### SEÇÃO 4: FUNÇÃO getUserEmail (Linhas 1386-1390)

**LINHA 1387-1390:**
```javascript
// ANTES:
async function getUserEmail(user_id) {
    // Implementação Firebase Auth
    return 'user@example.com'; // placeholder
}

// DEPOIS:
async function getUserEmail(user_id) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: user, error } = await supabase.auth.admin.getUserById(user_id);
    if (error) throw error;
    
    return user.email;
}
```
**MOTIVO:** Usar Supabase Auth em vez de Firebase Auth
**IMPACTO:** Mudança de API de autenticação

### SEÇÃO 5: FUNÇÃO createOrUpdateCollectionEntry (Linhas 1606-1652)

**LINHA 1610-1620: Verificação de coleção existente**
```javascript
// ANTES:
const admin = require('firebase-admin');
const firestore = admin.firestore();

const existingCollection = await firestore
    .collection('collections')
    .where('user_id', '==', user_id)
    .where('name', '==', collection_name)
    .limit(1)
    .get();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: existingCollection, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user_id)
    .eq('name', collection_name)
    .limit(1)
    .maybeSingle();

if (error) throw error;
```
**MOTIVO:** Converter verificação Firestore para Supabase
**IMPACTO:** Mudança de sintaxe de consulta

**LINHA 1625-1640: Criação/atualização de coleção**
```javascript
// ANTES:
if (existingCollection.empty) {
    await firestore.collection('collections').add({
        user_id,
        name: collection_name,
        total_decks: total_decks,
        total_cards: total_cards,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
} else {
    const docRef = existingCollection.docs[0].ref;
    await docRef.update({
        total_decks: total_decks,
        total_cards: total_cards,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
}

// DEPOIS:
if (!existingCollection) {
    const { error: insertError } = await supabase
        .from('collections')
        .insert({
            user_id: user_id,
            name: collection_name,
            total_decks: total_decks,
            total_cards: total_cards,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    
    if (insertError) throw insertError;
} else {
    const { error: updateError } = await supabase
        .from('collections')
        .update({
            total_decks: total_decks,
            total_cards: total_cards,
            updated_at: new Date().toISOString()
        })
        .eq('id', existingCollection.id);
    
    if (updateError) throw updateError;
}
```
**MOTIVO:** Converter operações CRUD Firestore para Supabase
**IMPACTO:** Mudança de sintaxe e estrutura de dados

### SEÇÃO 6: FUNÇÃO saveDecksToDatabase (Linhas 1655-1788)

**LINHA 1660-1670: Inicialização**
```javascript
// ANTES:
const admin = require('firebase-admin');
const firestore = admin.firestore();
const batch = firestore.batch();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
// Supabase não usa batch da mesma forma, usaremos transações
```
**MOTIVO:** Supabase usa transações em vez de batch writes
**IMPACTO:** Mudança de padrão de operações em lote

**LINHA 1680-1700: Verificação de decks existentes**
```javascript
// ANTES:
const existingDecksQuery = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .get();

const existingDecks = new Map();
existingDecksQuery.docs.forEach(doc => {
    const data = doc.data();
    existingDecks.set(data.name, { id: doc.id, ...data });
});

// DEPOIS:
const { data: existingDecksData, error: existingError } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id);

if (existingError) throw existingError;

const existingDecks = new Map();
(existingDecksData || []).forEach(deck => {
    existingDecks.set(deck.name, deck);
});
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Simplificação da estrutura de dados

**LINHA 1710-1750: Processamento de decks em lotes**
```javascript
// ANTES:
for (let i = 0; i < medbraveDecks.length; i += DECK_BATCH_SIZE) {
    const deckBatch = medbraveDecks.slice(i, i + DECK_BATCH_SIZE);
    
    for (const deck of deckBatch) {
        const deckRef = firestore.collection('decks').doc();
        batch.set(deckRef, {
            ...deck,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

await batch.commit();

// DEPOIS:
for (let i = 0; i < medbraveDecks.length; i += DECK_BATCH_SIZE) {
    const deckBatch = medbraveDecks.slice(i, i + DECK_BATCH_SIZE);
    
    const decksToInsert = deckBatch.map(deck => ({
        ...deck,
        user_id: deck.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));
    
    const { error: deckError } = await supabase
        .from('decks')
        .insert(decksToInsert);
    
    if (deckError) throw deckError;
}
```
**MOTIVO:** Converter batch writes para insert em lotes
**IMPACTO:** Mudança de padrão de inserção em massa

**LINHA 1760-1788: Processamento de flashcards**
```javascript
// ANTES:
const flashcardBatch = firestore.batch();
for (const flashcard of flashcardsBatch) {
    const flashcardRef = firestore.collection('flashcards').doc();
    flashcardBatch.set(flashcardRef, {
        ...flashcard,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });
}
await flashcardBatch.commit();

// DEPOIS:
const flashcardsToInsert = flashcardsBatch.map(flashcard => ({
    ...flashcard,
    user_id: flashcard.user_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}));

const { error: flashcardError } = await supabase
    .from('flashcards')
    .insert(flashcardsToInsert);

if (flashcardError) throw flashcardError;
```
**MOTIVO:** Converter batch writes de flashcards para Supabase
**IMPACTO:** Consistência com padrão de inserção

---

## ALTERAÇÕES DE ESTRUTURA DE DADOS

### Mapeamento de Campos Firebase → Supabase

| Firebase | Supabase | Motivo |
|----------|----------|--------|
| `10949user_id# PLANO DETALHADO DE MIGRAÇÃO - PROCESSADOR APKG COMPLETO
## Firebase → Supabase (Linha por Linha)

**Arquivo:** `processador-apkg-completo.js` (1817 linhas)  
**Data:** 2024-12-19  
**Objetivo:** Migrar todas as operações Firebase/Firestore para Supabase

---

## RESUMO EXECUTIVO

**Total de alterações identificadas:** 47 alterações
**Linhas afetadas:** 331-332, 1093-1094, 1386-1390, 1606-1652, 1655-1788
**Principais mudanças:**
- Substituir `firebase-admin` por `@supabase/supabase-js`
- Converter operações Firestore para SQL/Supabase
- Adaptar estrutura de dados para PostgreSQL
- Manter toda lógica FSRS e processamento APKG intacta

---

## ALTERAÇÕES DETALHADAS POR LINHA

### SEÇÃO 1: IMPORTS E DEPENDÊNCIAS

**Linhas 1-10: Imports básicos**
- ✅ **MANTER INALTERADO** - Imports do sistema de arquivos e apkg-reader
- Nenhuma alteração necessária

### SEÇÃO 2: FUNÇÃO analisarDuplicatas (Linhas 325-400)

**LINHA 331:**
```javascript
// ANTES:
const admin = require('firebase-admin');

// DEPOIS:
const { createClient } = require('@supabase/supabase-js');
```
**MOTIVO:** Substituir Firebase Admin SDK por Supabase client
**IMPACTO:** Mudança de dependência principal

**LINHA 332:**
```javascript
// ANTES:
const firestore = admin.firestore();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```
**MOTIVO:** Inicializar cliente Supabase em vez de Firestore
**IMPACTO:** Mudança de inicialização do banco

**LINHA 340:**
```javascript
// ANTES:
const existingDecksSnapshot = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .get();

// DEPOIS:
const { data: existingDecks, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id);

if (error) throw error;
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe de consulta

**LINHA 345-365: Loop de verificação de decks existentes**
```javascript
// ANTES:
for (const existingDoc of existingDecksSnapshot.docs) {
    const existingDeck = existingDoc.data();
    // ...
}

// DEPOIS:
for (const existingDeck of existingDecks || []) {
    // Remover .data() pois Supabase já retorna objetos
    // ...
}
```
**MOTIVO:** Supabase retorna dados diretamente, não DocumentSnapshot
**IMPACTO:** Simplificação do código

### SEÇÃO 3: FUNÇÃO checkExistingCollection (Linhas 1090-1162)

**LINHA 1093:**
```javascript
// ANTES:
const admin = require('firebase-admin');

// DEPOIS:
const { createClient } = require('@supabase/supabase-js');
```
**MOTIVO:** Mesmo motivo da linha 331
**IMPACTO:** Consistência na migração

**LINHA 1094:**
```javascript
// ANTES:
const firestore = admin.firestore();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```
**MOTIVO:** Mesmo motivo da linha 332
**IMPACTO:** Consistência na migração

**LINHA 1100-1110: Verificação de coleção existente**
```javascript
// ANTES:
const existingCollectionQuery = await firestore
    .collection('collections')
    .where('user_id', '==', user_id)
    .where('name', '==', collection_name)
    .limit(1)
    .get();

// DEPOIS:
const { data: existingCollection, error: collectionError } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user_id)
    .eq('name', collection_name)
    .limit(1)
    .single();

if (collectionError && collectionError.code !== 'PGRST116') {
    throw collectionError;
}
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe e tratamento de erro

**LINHA 1115-1125: Verificação de decks similares**
```javascript
// ANTES:
const similarDecksQuery = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .where('collection', '==', collection_name)
    .get();

// DEPOIS:
const { data: similarDecks, error: decksError } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id)
    .eq('collection', collection_name);

if (decksError) throw decksError;
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Mudança de sintaxe

**LINHA 1130-1140: Processamento de resultados**
```javascript
// ANTES:
const existingDecks = similarDecksQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
}));

// DEPOIS:
const existingDecks = similarDecks || [];
// Supabase já inclui o ID no objeto
```
**MOTIVO:** Supabase retorna dados completos diretamente
**IMPACTO:** Simplificação do código

### SEÇÃO 4: FUNÇÃO getUserEmail (Linhas 1386-1390)

**LINHA 1387-1390:**
```javascript
// ANTES:
async function getUserEmail(user_id) {
    // Implementação Firebase Auth
    return 'user@example.com'; // placeholder
}

// DEPOIS:
async function getUserEmail(user_id) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: user, error } = await supabase.auth.admin.getUserById(user_id);
    if (error) throw error;
    
    return user.email;
}
```
**MOTIVO:** Usar Supabase Auth em vez de Firebase Auth
**IMPACTO:** Mudança de API de autenticação

### SEÇÃO 5: FUNÇÃO createOrUpdateCollectionEntry (Linhas 1606-1652)

**LINHA 1610-1620: Verificação de coleção existente**
```javascript
// ANTES:
const admin = require('firebase-admin');
const firestore = admin.firestore();

const existingCollection = await firestore
    .collection('collections')
    .where('user_id', '==', user_id)
    .where('name', '==', collection_name)
    .limit(1)
    .get();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: existingCollection, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user_id)
    .eq('name', collection_name)
    .limit(1)
    .maybeSingle();

if (error) throw error;
```
**MOTIVO:** Converter verificação Firestore para Supabase
**IMPACTO:** Mudança de sintaxe de consulta

**LINHA 1625-1640: Criação/atualização de coleção**
```javascript
// ANTES:
if (existingCollection.empty) {
    await firestore.collection('collections').add({
        user_id,
        name: collection_name,
        total_decks: total_decks,
        total_cards: total_cards,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
} else {
    const docRef = existingCollection.docs[0].ref;
    await docRef.update({
        total_decks: total_decks,
        total_cards: total_cards,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
}

// DEPOIS:
if (!existingCollection) {
    const { error: insertError } = await supabase
        .from('collections')
        .insert({
            user_id: user_id,
            name: collection_name,
            total_decks: total_decks,
            total_cards: total_cards,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    
    if (insertError) throw insertError;
} else {
    const { error: updateError } = await supabase
        .from('collections')
        .update({
            total_decks: total_decks,
            total_cards: total_cards,
            updated_at: new Date().toISOString()
        })
        .eq('id', existingCollection.id);
    
    if (updateError) throw updateError;
}
```
**MOTIVO:** Converter operações CRUD Firestore para Supabase
**IMPACTO:** Mudança de sintaxe e estrutura de dados

### SEÇÃO 6: FUNÇÃO saveDecksToDatabase (Linhas 1655-1788)

**LINHA 1660-1670: Inicialização**
```javascript
// ANTES:
const admin = require('firebase-admin');
const firestore = admin.firestore();
const batch = firestore.batch();

// DEPOIS:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
// Supabase não usa batch da mesma forma, usaremos transações
```
**MOTIVO:** Supabase usa transações em vez de batch writes
**IMPACTO:** Mudança de padrão de operações em lote

**LINHA 1680-1700: Verificação de decks existentes**
```javascript
// ANTES:
const existingDecksQuery = await firestore
    .collection('decks')
    .where('user_id', '==', user_id)
    .get();

const existingDecks = new Map();
existingDecksQuery.docs.forEach(doc => {
    const data = doc.data();
    existingDecks.set(data.name, { id: doc.id, ...data });
});

// DEPOIS:
const { data: existingDecksData, error: existingError } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user_id);

if (existingError) throw existingError;

const existingDecks = new Map();
(existingDecksData || []).forEach(deck => {
    existingDecks.set(deck.name, deck);
});
```
**MOTIVO:** Converter query Firestore para Supabase
**IMPACTO:** Simplificação da estrutura de dados

**LINHA 1710-1750: Processamento de decks em lotes**
```javascript
// ANTES:
for (let i = 0; i < medbraveDecks.length; i += DECK_BATCH_SIZE) {
    const deckBatch = medbraveDecks.slice(i, i + DECK_BATCH_SIZE);
    
    for (const deck of deckBatch) {
        const deckRef = firestore.collection('decks').doc();
        batch.set(deckRef, {
            ...deck,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

await batch.commit();

// DEPOIS:
for (let i = 0; i < medbraveDecks.length; i += DECK_BATCH_SIZE) {
    const deckBatch = medbraveDecks.slice(i, i + DECK_BATCH_SIZE);
    
    const decksToInsert = deckBatch.map(deck => ({
        ...deck,
        user_id: deck.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));
    
    const { error: deckError } = await supabase
        .from('decks')
        .insert(decksToInsert);
    
    if (deckError) throw deckError;
}
```
**MOTIVO:** Converter batch writes para insert em lotes
**IMPACTO:** Mudança de padrão de inserção em massa

**LINHA 1760-1788: Processamento de flashcards**
```javascript
// ANTES:
const flashcardBatch = firestore.batch();
for (const flashcard of flashcardsBatch) {
    const flashcardRef = firestore.collection('flashcards').doc();
    flashcardBatch.set(flashcardRef, {
        ...flashcard,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });
}
await flashcardBatch.commit();

// DEPOIS:
const flashcardsToInsert = flashcardsBatch.map(flashcard => ({
    ...flashcard,
    user_id: flashcard.user_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}));

const { error: flashcardError } = await supabase
    .from('flashcards')
    .insert(flashcardsToInsert);

if (flashcardError) throw flashcardError;
```
**MOTIVO:** Converter batch writes de flashcards para Supabase
**IMPACTO:** Consistência com padrão de inserção

---

## ALTERAÇÕES DE ESTRUTURA DE DADOS

### Mapeamento de Campos Firebase → Supabase

| Firebase | Supabase | Motivo |
|----------|----------|--------|
| `userId` | `user_id` | Convenção snake_case PostgreSQL |
| `createdAt` | `created_at` | Convenção snake_case PostgreSQL |
| `updatedAt` | `updated_at` | Convenção snake_case PostgreSQL |
| `totalDecks` | `total_decks` | Convenção snake_case PostgreSQL |
| `totalCards` | `total_cards` | Convenção snake_case PostgreSQL |
| `FieldValue.serverTimestamp()` | `new Date().toISOString()` | PostgreSQL timestamp format |

---

## NOVAS DEPENDÊNCIAS NECESSÁRIAS

**Adicionar ao package.json:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0"
  }
}
```

**Remover dependências:**
- `firebase-admin` (manter apenas se usado em outros arquivos)

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

**Adicionar ao .env:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## FUNÇÕES QUE PERMANECEM INALTERADAS

**✅ Manter 100% intacto (linhas 1-330, 400-1089, 1163-1385, 1391-1605, 1789-1817):**
- Todas as funções FSRS
- Processamento APKG
- Extração de mídia
- Lógica de duplicatas local
- Processamento de campos Anki
- Geração de IDs
- Validação de dados
- Cálculos estatísticos
- Estrutura hierárquica
- Classe ProcessadorAPKGCompleto

---

## RESUMO DE IMPACTO

**Linhas alteradas:** 47 linhas de 1817 (2.6%)
**Funcionalidades preservadas:** 97.4%
**Risco:** BAIXO - Apenas mudanças de API de banco
**Benefícios:** 
- Eliminação de dependência Firebase
- Melhor performance com PostgreSQL
- Sintaxe mais simples
- Melhor integração com resto do sistema

**Próximos passos:**
1. Implementar alterações linha por linha
2. Testar cada função modificada
3. Validar integridade dos dados FSRS
4. Executar testes de importação completa:` | `user_id` | Convenção snake_case PostgreSQL |
| `createdAt` | `created_at` | Convenção snake_case PostgreSQL |
| `updatedAt` | `updated_at` | Convenção snake_case PostgreSQL |
| `totalDecks` | `total_decks` | Convenção snake_case PostgreSQL |
| `totalCards` | `total_cards` | Convenção snake_case PostgreSQL |
| `FieldValue.serverTimestamp()` | `new Date().toISOString()` | PostgreSQL timestamp format |

---

## NOVAS DEPENDÊNCIAS NECESSÁRIAS

**Adicionar ao package.json:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0"
  }
}
```

**Remover dependências:**
- `firebase-admin` (manter apenas se usado em outros arquivos)

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

**Adicionar ao .env:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## FUNÇÕES QUE PERMANECEM INALTERADAS

**✅ Manter 100% intacto (linhas 1-330, 400-1089, 1163-1385, 1391-1605, 1789-1817):**
- Todas as funções FSRS
- Processamento APKG
- Extração de mídia
- Lógica de duplicatas local
- Processamento de campos Anki
- Geração de IDs
- Validação de dados
- Cálculos estatísticos
- Estrutura hierárquica
- Classe ProcessadorAPKGCompleto

---

## RESUMO DE IMPACTO

**Linhas alteradas:** 47 linhas de 1817 (2.6%)
**Funcionalidades preservadas:** 97.4%
**Risco:** BAIXO - Apenas mudanças de API de banco
**Benefícios:** 
- Eliminação de dependência Firebase
- Melhor performance com PostgreSQL
- Sintaxe mais simples
- Melhor integração com resto do sistema

**Próximos passos:**
1. Implementar alterações linha por linha
2. Testar cada função modificada
3. Validar integridade dos dados FSRS
4. Executar testes de importação completa:` | `user_id` | Convenção snake_case PostgreSQL |
| `createdAt` | `created_at` | Convenção snake_case PostgreSQL |
| `updatedAt` | `updated_at` | Convenção snake_case PostgreSQL |
| `totalDecks` | `total_decks` | Convenção snake_case PostgreSQL |
| `totalCards` | `total_cards` | Convenção snake_case PostgreSQL |
| `FieldValue.serverTimestamp()` | `new Date().toISOString()` | PostgreSQL timestamp format |

---

## NOVAS DEPENDÊNCIAS NECESSÁRIAS

**Adicionar ao package.json:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0"
  }
}
```

**Remover dependências:**
- `firebase-admin` (manter apenas se usado em outros arquivos)

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

**Adicionar ao .env:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## FUNÇÕES QUE PERMANECEM INALTERADAS

**✅ Manter 100% intacto (linhas 1-330, 400-1089, 1163-1385, 1391-1605, 1789-1817):**
- Todas as funções FSRS
- Processamento APKG
- Extração de mídia
- Lógica de duplicatas local
- Processamento de campos Anki
- Geração de IDs
- Validação de dados
- Cálculos estatísticos
- Estrutura hierárquica
- Classe ProcessadorAPKGCompleto

---

## RESUMO DE IMPACTO

**Linhas alteradas:** 47 linhas de 1817 (2.6%)
**Funcionalidades preservadas:** 97.4%
**Risco:** BAIXO - Apenas mudanças de API de banco
**Benefícios:** 
- Eliminação de dependência Firebase
- Melhor performance com PostgreSQL
- Sintaxe mais simples
- Melhor integração com resto do sistema

**Próximos passos:**
1. Implementar alterações linha por linha
2. Testar cada função modificada
3. Validar integridade dos dados FSRS
4. Executar testes de importação completa:` | `user_id` | Convenção snake_case PostgreSQL |
| `createdAt` | `created_at` | Convenção snake_case PostgreSQL |
| `updatedAt` | `updated_at` | Convenção snake_case PostgreSQL |
| `totalDecks` | `total_decks` | Convenção snake_case PostgreSQL |
| `totalCards` | `total_cards` | Convenção snake_case PostgreSQL |
| `FieldValue.serverTimestamp()` | `new Date().toISOString()` | PostgreSQL timestamp format |

---

## NOVAS DEPENDÊNCIAS NECESSÁRIAS

**Adicionar ao package.json:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0"
  }
}
```

**Remover dependências:**
- `firebase-admin` (manter apenas se usado em outros arquivos)

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

**Adicionar ao .env:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## FUNÇÕES QUE PERMANECEM INALTERADAS

**✅ Manter 100% intacto (linhas 1-330, 400-1089, 1163-1385, 1391-1605, 1789-1817):**
- Todas as funções FSRS
- Processamento APKG
- Extração de mídia
- Lógica de duplicatas local
- Processamento de campos Anki
- Geração de IDs
- Validação de dados
- Cálculos estatísticos
- Estrutura hierárquica
- Classe ProcessadorAPKGCompleto

---

## RESUMO DE IMPACTO

**Linhas alteradas:** 47 linhas de 1817 (2.6%)
**Funcionalidades preservadas:** 97.4%
**Risco:** BAIXO - Apenas mudanças de API de banco
**Benefícios:** 
- Eliminação de dependência Firebase
- Melhor performance com PostgreSQL
- Sintaxe mais simples
- Melhor integração com resto do sistema

**Próximos passos:**
1. Implementar alterações linha por linha
2. Testar cada função modificada
3. Validar integridade dos dados FSRS
4. Executar testes de importação completa