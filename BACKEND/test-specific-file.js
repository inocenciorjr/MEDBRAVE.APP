const fs = require('fs');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const path = require('path');

async function analyzeFile(filePath) {
    try {
        const SQL = await initSqlJs();
        const buf = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buf);
        
        console.log('📦 Arquivos dentro do .apkg:');
        Object.keys(zip.files).forEach(name => {
            console.log(`   - ${name}`);
        });
        console.log();
        
        // Tentar collection.anki21 (versão nova)
        let collectionData;
        let collectionFile = null;
        if (zip.file('collection.anki21')) {
            collectionFile = 'collection.anki21';
            collectionData = await zip.file('collection.anki21').async('uint8array');
        } else if (zip.file('collection.anki2')) {
            collectionFile = 'collection.anki2';
            collectionData = await zip.file('collection.anki2').async('uint8array');
        } else {
            console.log('❌ Arquivo collection não encontrado');
            return;
        }
        
        console.log(`✅ Usando: ${collectionFile}`);
        console.log();
        
        const db = new SQL.Database(collectionData);
        
        // Listar todas as tabelas
        const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('📋 Tabelas no banco de dados:');
        if (tables.length > 0) {
            tables[0].values.forEach(row => console.log(`   - ${row[0]}`));
        }
        console.log();
        
        // Extrair TUDO da tabela col
        const colRes = db.exec('SELECT * FROM col');
        if (colRes.length > 0) {
            console.log('📊 Tabela COL (Collection):');
            console.log('   Colunas:', colRes[0].columns.join(', '));
            console.log();
            
            const values = colRes[0].values[0];
            colRes[0].columns.forEach((col, idx) => {
                let value = values[idx];
                
                // Formatar valores especiais
                if (col === 'crt' || col === 'mod') {
                    const timestamp = value;
                    const date = new Date(timestamp * 1000);
                    console.log(`   ${col}: ${timestamp} → ${date.toLocaleString('pt-BR')}`);
                } else if (col === 'decks' || col === 'models' || col === 'dconf' || col === 'conf') {
                    try {
                        const parsed = JSON.parse(value);
                        if (col === 'decks') {
                            console.log(`   ${col}: ${Object.keys(parsed).length} deck(s)`);
                            Object.values(parsed).forEach(deck => {
                                console.log(`      - ${deck.name} (ID: ${deck.id})`);
                            });
                        } else {
                            console.log(`   ${col}: [JSON com ${Object.keys(parsed).length} chave(s)]`);
                        }
                    } catch (e) {
                        console.log(`   ${col}: ${String(value).substring(0, 100)}...`);
                    }
                } else {
                    console.log(`   ${col}: ${value}`);
                }
            });
        }
        console.log();
        
        // Verificar se há notas
        try {
            const notesRes = db.exec('SELECT COUNT(*) as count FROM notes');
            if (notesRes.length > 0) {
                console.log(`📝 Total de notas: ${notesRes[0].values[0][0]}`);
            }
        } catch (e) {
            console.log('⚠️ Tabela notes não encontrada');
        }
        
        // Verificar se há cards
        try {
            const cardsRes = db.exec('SELECT COUNT(*) as count FROM cards');
            if (cardsRes.length > 0) {
                console.log(`🃏 Total de cards: ${cardsRes[0].values[0][0]}`);
            }
        } catch (e) {
            console.log('⚠️ Tabela cards não encontrada');
        }
        
        db.close();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
    }
}

(async () => {
    console.log('='.repeat(100));
    console.log('ANÁLISE DETALHADA: Flashcards Medspacyssssssssssss.apkg');
    console.log('='.repeat(100));
    console.log();
    
    await analyzeFile('C:/MEDBRAVE.APP/MEDBRAVE.APP/BACKEND/uploads/Flashcards Medspacyssssssssssss.apkg');
    
    console.log();
    console.log('='.repeat(100));
    console.log('COMPARAÇÃO: Flashcards Medspacy-20250309223939.apkg (CRT: 1719298800)');
    console.log('='.repeat(100));
    console.log();
    
    await analyzeFile('C:/MEDBRAVE.APP/MEDBRAVE.APP/BACKEND/uploads/Flashcards Medspacy-20250309223939.apkg');
})();
