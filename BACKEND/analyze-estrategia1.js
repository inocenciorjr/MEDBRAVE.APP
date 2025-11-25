const fs = require('fs');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const path = require('path');
const crypto = require('crypto');

async function analyzeEstrategia1() {
    try {
        const SQL = await initSqlJs();
        const buf = fs.readFileSync('C:/MEDBRAVE.APP/MEDBRAVE.APP/BACKEND/uploads/estrategia1.apkg');
        const zip = await JSZip.loadAsync(buf);
        
        let collectionData;
        if (zip.file('collection.anki21')) {
            collectionData = await zip.file('collection.anki21').async('uint8array');
        } else if (zip.file('collection.anki2')) {
            collectionData = await zip.file('collection.anki2').async('uint8array');
        }
        
        const db = new SQL.Database(collectionData);
        
        // Extrair decks
        const colRes = db.exec('SELECT decks FROM col');
        const decksJson = JSON.parse(colRes[0].values[0][0]);
        
        console.log('='.repeat(100));
        console.log('ANÁLISE: estrategia1.apkg (130 decks)');
        console.log('='.repeat(100));
        console.log();
        
        // Organizar decks por hierarquia
        const allDecks = Object.values(decksJson);
        const deckNames = allDecks.map(d => d.name).filter(n => n !== 'Default');
        
        console.log('📚 TODOS OS DECKS:');
        deckNames.forEach((name, idx) => {
            console.log(`   ${idx + 1}. ${name}`);
        });
        console.log();
        
        // Identificar decks raiz (sem ::)
        const rootDecks = deckNames.filter(name => !name.includes('::'));
        console.log('🌳 DECKS RAIZ (sem hierarquia):');
        rootDecks.forEach(name => console.log(`   - ${name}`));
        console.log();
        
        // Identificar prefixos principais (primeiro nível da hierarquia)
        const mainPrefixes = new Set();
        deckNames.forEach(name => {
            if (name.includes('::')) {
                const prefix = name.split('::')[0];
                mainPrefixes.add(prefix);
            }
        });
        
        console.log('📂 PREFIXOS PRINCIPAIS (primeiro nível):');
        Array.from(mainPrefixes).sort().forEach(prefix => {
            const count = deckNames.filter(n => n.startsWith(prefix + '::')).length;
            console.log(`   - ${prefix} (${count} subdeck(s))`);
        });
        console.log();
        
        // Sugerir nome da coleção
        console.log('💡 SUGESTÃO DE NOME:');
        let suggestedName = '';
        
        if (mainPrefixes.size === 1) {
            // Apenas um prefixo principal
            suggestedName = Array.from(mainPrefixes)[0];
            console.log(`   "${suggestedName}" (único prefixo principal)`);
        } else if (mainPrefixes.size <= 3) {
            // Poucos prefixos, combinar
            suggestedName = Array.from(mainPrefixes).sort().join(' + ');
            console.log(`   "${suggestedName}" (combinação dos prefixos principais)`);
        } else {
            // Muitos prefixos, usar nome genérico ou mais comum
            const prefixCounts = {};
            deckNames.forEach(name => {
                if (name.includes('::')) {
                    const prefix = name.split('::')[0];
                    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
                }
            });
            
            const mostCommon = Object.entries(prefixCounts)
                .sort((a, b) => b[1] - a[1])[0];
            
            suggestedName = mostCommon[0];
            console.log(`   "${suggestedName}" (prefixo mais comum com ${mostCommon[1]} subdeck(s))`);
            console.log(`   Alternativa: "Coleção Mista" ou "Flashcards Diversos"`);
        }
        console.log();
        
        // Calcular hash da estrutura (para identificação futura)
        console.log('🔐 IDENTIFICAÇÃO ÚNICA:');
        
        // Método 1: Hash dos nomes dos decks principais (ordenados)
        const sortedMainDecks = Array.from(mainPrefixes).sort();
        const hash1 = crypto.createHash('sha256')
            .update(sortedMainDecks.join('|'))
            .digest('hex')
            .substring(0, 16);
        console.log(`   Hash dos prefixos principais: ${hash1}`);
        console.log(`   Baseado em: ${sortedMainDecks.join(', ')}`);
        console.log();
        
        // Método 2: Hash de TODOS os nomes de decks (mais preciso)
        const sortedAllDecks = deckNames.sort();
        const hash2 = crypto.createHash('sha256')
            .update(sortedAllDecks.join('|'))
            .digest('hex')
            .substring(0, 16);
        console.log(`   Hash de todos os decks: ${hash2}`);
        console.log(`   Baseado em: ${sortedAllDecks.length} deck(s)`);
        console.log();
        
        // Simular atualização
        console.log('='.repeat(100));
        console.log('SIMULAÇÃO: Como identificar atualização?');
        console.log('='.repeat(100));
        console.log();
        
        console.log('Cenário 1: Usuário adiciona 5 novos decks à coleção');
        console.log('   ✅ Hash dos prefixos principais: IGUAL (mesmos prefixos)');
        console.log('   ❌ Hash de todos os decks: DIFERENTE (novos decks)');
        console.log();
        
        console.log('Cenário 2: Usuário renomeia a coleção no MedBrave');
        console.log('   ✅ Hash dos prefixos principais: IGUAL');
        console.log('   ✅ Sistema identifica pela estrutura, não pelo nome');
        console.log();
        
        console.log('Cenário 3: Usuário exporta apenas alguns decks');
        console.log('   ❌ Hash dos prefixos principais: PODE SER DIFERENTE');
        console.log('   ❌ Hash de todos os decks: DIFERENTE');
        console.log('   💡 Solução: Perguntar ao usuário');
        console.log();
        
        // Recomendação
        console.log('='.repeat(100));
        console.log('RECOMENDAÇÃO FINAL');
        console.log('='.repeat(100));
        console.log();
        console.log('Usar HASH DOS PREFIXOS PRINCIPAIS porque:');
        console.log('   ✅ Identifica a "família" de decks');
        console.log('   ✅ Permite adicionar novos decks sem perder identificação');
        console.log('   ✅ Mais flexível para atualizações');
        console.log();
        console.log('Salvar no banco:');
        console.log('   - deck_structure_hash: ' + hash1);
        console.log('   - main_deck_prefixes: ' + JSON.stringify(sortedMainDecks));
        console.log('   - total_decks: ' + deckNames.length);
        console.log();
        console.log('Ao importar novamente:');
        console.log('   1. Calcular hash dos prefixos principais');
        console.log('   2. Buscar: WHERE user_id = X AND deck_structure_hash = "' + hash1 + '"');
        console.log('   3. Se encontrar → "Coleção \'' + suggestedName + '\' detectada. Atualizar?"');
        console.log('   4. Se não encontrar → Criar nova coleção');
        console.log();
        
        db.close();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

analyzeEstrategia1();
