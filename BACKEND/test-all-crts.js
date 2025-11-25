const fs = require('fs');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const path = require('path');

async function extractCRT(filePath) {
    try {
        const SQL = await initSqlJs();
        const buf = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buf);
        
        // Tentar collection.anki21 (versão nova)
        let collectionData;
        if (zip.file('collection.anki21')) {
            collectionData = await zip.file('collection.anki21').async('uint8array');
        } else if (zip.file('collection.anki2')) {
            collectionData = await zip.file('collection.anki2').async('uint8array');
        } else {
            return { error: 'Arquivo collection não encontrado' };
        }
        
        const db = new SQL.Database(collectionData);
        
        // Extrair dados da tabela col
        const res = db.exec('SELECT id, crt, mod FROM col');
        if (res.length === 0) {
            return { error: 'Tabela col vazia' };
        }
        
        const values = res[0].values[0];
        const colIndex = res[0].columns.indexOf('id');
        const crtIndex = res[0].columns.indexOf('crt');
        const modIndex = res[0].columns.indexOf('mod');
        
        // Extrair decks
        let deckCount = 0;
        try {
            const decksRes = db.exec('SELECT * FROM col');
            if (decksRes.length > 0) {
                const decksColIndex = decksRes[0].columns.indexOf('decks');
                if (decksColIndex >= 0) {
                    const decksJson = JSON.parse(decksRes[0].values[0][decksColIndex]);
                    deckCount = Object.keys(decksJson).length;
                }
            }
        } catch (e) {
            // Ignorar erro
        }
        
        db.close();
        
        return {
            collectionId: colIndex >= 0 ? values[colIndex] : null,
            crt: crtIndex >= 0 ? values[crtIndex] : null,
            mod: modIndex >= 0 ? values[modIndex] : null,
            crtDate: crtIndex >= 0 ? new Date(values[crtIndex] * 1000) : null,
            modDate: modIndex >= 0 ? new Date(values[modIndex] * 1000) : null,
            deckCount: deckCount
        };
    } catch (error) {
        return { error: error.message };
    }
}

(async () => {
    const uploadsDir = 'C:/MEDBRAVE.APP/MEDBRAVE.APP/BACKEND/uploads';
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.apkg'));
    
    console.log('='.repeat(100));
    console.log('ANÁLISE DE CRT (Creation Timestamp) DE TODOS OS ARQUIVOS APKG');
    console.log('='.repeat(100));
    console.log();
    
    const results = [];
    
    for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const fileStats = fs.statSync(filePath);
        const sizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
        
        console.log(`📦 ${file} (${sizeMB} MB)`);
        
        const data = await extractCRT(filePath);
        
        if (data.error) {
            console.log(`   ❌ Erro: ${data.error}`);
        } else {
            console.log(`   🆔 Collection ID: ${data.collectionId}`);
            console.log(`   📅 CRT: ${data.crt}`);
            console.log(`   📅 Data de criação: ${data.crtDate?.toLocaleString('pt-BR')}`);
            console.log(`   📝 Última modificação: ${data.modDate?.toLocaleString('pt-BR')}`);
            console.log(`   📚 Decks: ${data.deckCount}`);
            
            results.push({
                file,
                crt: data.crt,
                collectionId: data.collectionId,
                deckCount: data.deckCount,
                sizeMB
            });
        }
        console.log();
    }
    
    // Análise de duplicatas
    console.log('='.repeat(100));
    console.log('ANÁLISE DE DUPLICATAS');
    console.log('='.repeat(100));
    console.log();
    
    const crtMap = new Map();
    results.forEach(r => {
        if (!crtMap.has(r.crt)) {
            crtMap.set(r.crt, []);
        }
        crtMap.get(r.crt).push(r.file);
    });
    
    console.log(`📊 Total de arquivos: ${results.length}`);
    console.log(`📊 CRTs únicos: ${crtMap.size}`);
    console.log();
    
    if (crtMap.size < results.length) {
        console.log('⚠️  DUPLICATAS ENCONTRADAS:');
        console.log();
        crtMap.forEach((files, crt) => {
            if (files.length > 1) {
                console.log(`   CRT: ${crt} (${new Date(crt * 1000).toLocaleString('pt-BR')})`);
                files.forEach(f => console.log(`      - ${f}`));
                console.log();
            }
        });
    } else {
        console.log('✅ Todos os CRTs são únicos! Cada arquivo é de uma coleção diferente.');
    }
    
    // Tabela resumo
    console.log('='.repeat(100));
    console.log('TABELA RESUMO');
    console.log('='.repeat(100));
    console.log();
    console.log('Arquivo'.padEnd(60) + 'CRT'.padEnd(15) + 'Decks'.padEnd(10) + 'Tamanho');
    console.log('-'.repeat(100));
    results.forEach(r => {
        const fileName = r.file.length > 58 ? r.file.substring(0, 55) + '...' : r.file;
        console.log(
            fileName.padEnd(60) + 
            r.crt.toString().padEnd(15) + 
            r.deckCount.toString().padEnd(10) + 
            `${r.sizeMB} MB`
        );
    });
    console.log();
})();
