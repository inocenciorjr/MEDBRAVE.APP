const fs = require('fs');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const path = require('path');

async function testFile(filePath, label) {
    try {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`${label}: ${path.basename(filePath)}`);
        console.log('='.repeat(80));
        
        const SQL = await initSqlJs();
        const buf = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buf);
        const collectionData = await zip.file('collection.anki21').async('uint8array');
        const db = new SQL.Database(collectionData);
        
        // Extrair dados da tabela col
        const res = db.exec('SELECT * FROM col');
        if (res.length === 0) {
            console.log('❌ Tabela col vazia');
            return;
        }
        
        console.log('\n📋 Colunas:', res[0].columns.join(', '));
        
        const values = res[0].values[0];
        const colIndex = res[0].columns.indexOf('id');
        const crtIndex = res[0].columns.indexOf('crt');
        const decksIndex = res[0].columns.indexOf('decks');
        const modelsIndex = res[0].columns.indexOf('models');
        
        if (colIndex >= 0) {
            console.log('\n🆔 Collection ID:', values[colIndex]);
        }
        
        if (crtIndex >= 0) {
            console.log('📅 Creation Timestamp (crt):', values[crtIndex]);
            console.log('📅 Data de criação:', new Date(values[crtIndex] * 1000).toLocaleString('pt-BR'));
        }
        
        if (decksIndex >= 0) {
            const decksJson = JSON.parse(values[decksIndex]);
            console.log('\n📚 Decks encontrados:', Object.keys(decksJson).length);
            Object.values(decksJson).forEach(deck => {
                console.log(`  - ${deck.name} (ID: ${deck.id})`);
            });
        }
        
        // Tentar extrair da tabela decks (versão ZSTD)
        try {
            const decksRes = db.exec('SELECT * FROM decks');
            if (decksRes.length > 0) {
                console.log('\n📚 Decks (tabela separada):', decksRes[0].values.length);
                decksRes[0].values.forEach(deck => {
                    console.log(`  - ${deck[1]} (ID: ${deck[0]})`);
                });
            }
        } catch (e) {
            // Tabela decks não existe (versão antiga)
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

(async () => {
    await testFile('C:/MEDBRAVE.APP/MEDBRAVE.APP/BACKEND/uploads/Flashcards_Medspacy_Cirurgia_Trauma_Queimaduras_20250310123649.apkg', 'ARQUIVO 1 (20 decks)');
    await testFile('C:/MEDBRAVE.APP/MEDBRAVE.APP/BACKEND/uploads/Flashcards Medspacy-20250309223939.apkg', 'ARQUIVO 2 (1 deck)');
})();
