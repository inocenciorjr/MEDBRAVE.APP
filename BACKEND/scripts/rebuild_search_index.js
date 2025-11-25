#!/usr/bin/env node

/**
 * Script para reconstruir o índice de busca manualmente
 * 
 * Uso: node scripts/rebuild_search_index.js [user_id]
 * Se não fornecer user_id, reconstruirá para todos os usuários
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAllUsersWithDecks() {
  const { data, error } = await supabase
    .from('decks')
    .select('user_id')
    .distinct();

  if (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }

  return data.map(d => d.user_id);
}

async function getUserDecks(userId) {
  const { data, error } = await supabase
    .from('decks')
    .select(`
      id,
      name,
      description,
      collection,
      user_id,
      created_at,
      updated_at
    `)
    .eq('user_id', userId);

  if (error) {
    console.error(`Erro ao buscar decks do usuário ${userId}:`, error);
    return [];
  }

  return data;
}

async function getDeckFlashcardCount(deckId) {
  const { count, error } = await supabase
    .from('flashcards')
    .select('*', { count: 'exact', head: true })
    .eq('deck_id', deckId);

  if (error) {
    console.error(`Erro ao contar flashcards do deck ${deckId}:`, error);
    return 0;
  }

  return count || 0;
}

async function clearUserSearchIndex(userId) {
  const { error } = await supabase
    .from('flashcard_search_index')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error(`Erro ao limpar índice do usuário ${userId}:`, error);
    return false;
  }

  console.log(`Índice do usuário ${userId} limpo com sucesso`);
  return true;
}

async function addDeckToIndex(deck) {
  const flashcardCount = await getDeckFlashcardCount(deck.id);
  
  const searchableText = [
    deck.name || '',
    deck.description || '',
    deck.collection || 'Sem Coleção'
  ].join(' ').toLowerCase();

  const { error } = await supabase
    .from('flashcard_search_index')
    .insert({
      user_id: deck.user_id,
      deck_id: deck.id,
      deck_name: deck.name || 'Deck sem nome',
      deck_description: deck.description || '',
      collection_name: deck.collection || 'Sem Coleção',
      flashcard_count: flashcardCount,
      hierarchy: null, // Use null instead of [] for empty array
      hierarchy_path: deck.name || '',
      path: deck.name || '',
      searchable_text: searchableText,
      created_at: deck.created_at || new Date().toISOString(),
      updated_at: deck.updated_at || new Date().toISOString()
    });

  if (error) {
    console.error(`Erro ao adicionar deck ${deck.id} ao índice:`, error);
    return false;
  }

  console.log(`Deck ${deck.id} (${deck.name}) adicionado ao índice`);
  return true;
}

async function rebuildUserIndex(userId) {
  console.log(`Reconstruindo índice para usuário: ${userId}`);

  // Limpar índice existente
  await clearUserSearchIndex(userId);

  // Buscar todos os decks do usuário
  const decks = await getUserDecks(userId);
  console.log(`Encontrados ${decks.length} decks para o usuário ${userId}`);

  let successCount = 0;
  for (const deck of decks) {
    const success = await addDeckToIndex(deck);
    if (success) successCount++;
  }

  console.log(`Usuário ${userId}: ${successCount}/${decks.length} decks adicionados ao índice`);
  return { total: decks.length, success: successCount };
}

async function main() {
  const userId = process.argv[2];

  try {
    if (userId) {
      // Reconstruir para um usuário específico
      console.log(`Reconstruindo índice para usuário específico: ${userId}`);
      await rebuildUserIndex(userId);
    } else {
      // Reconstruir para todos os usuários
      console.log('Reconstruindo índice para todos os usuários...');
      const users = await getAllUsersWithDecks();
      console.log(`Encontrados ${users.length} usuários com decks`);

      for (const user of users) {
        await rebuildUserIndex(user);
      }
    }

    console.log('Reconstrução do índice concluída!');
  } catch (error) {
    console.error('Erro durante reconstrução:', error);
    process.exit(1);
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { rebuildUserIndex, getAllUsersWithDecks };