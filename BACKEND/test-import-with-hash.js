// Teste rápido para verificar se o hash está sendo salvo
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCollectionStructure() {
    console.log('🔍 Verificando estrutura da tabela collections...\n');
    
    // Buscar uma coleção qualquer para ver as colunas
    const { data, error } = await supabase
        .from('collections')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('❌ Erro:', error);
        return;
    }
    
    if (data && data.length > 0) {
        const collection = data[0];
        console.log('✅ Colunas disponíveis:');
        Object.keys(collection).forEach(key => {
            const value = collection[key];
            const type = Array.isArray(value) ? 'array' : typeof value;
            console.log(`   - ${key}: ${type}`);
        });
        
        console.log('\n📊 Verificando novas colunas:');
        console.log(`   deck_structure_hash: ${collection.deck_structure_hash ? '✅ Existe' : '❌ Não existe'}`);
        console.log(`   main_deck_prefixes: ${collection.main_deck_prefixes ? '✅ Existe' : '❌ Não existe'}`);
        console.log(`   total_decks_at_import: ${collection.total_decks_at_import !== undefined ? '✅ Existe' : '❌ Não existe'}`);
    } else {
        console.log('⚠️  Nenhuma coleção encontrada no banco');
    }
}

testCollectionStructure();
