const fs = require('fs');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const path = require('path');
const crypto = require('crypto');

// Importar função de descompressão ZSTD
const { getDecompressedZSTD } = require(path.join(__dirname, 'apkg-reader.js/dist/lib/handlers/getDecompressedZSTD.js'));

async function analyzeMedspacyFile(filePath, label) {
    try {
        const SQL = await initSqlJs();
        const buf = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buf);
        
        let collectionData;
        let isZSTD = false;
        
        // Tentar collection.anki21b (ZSTD)
        if (zip.file('collection.anki21b')) {
            console.log(`   [${label}] Detectado formato ZSTD (collection.anki21b)`);
            isZSTD = true;
            const compressedData = await zip.file('collection.anki21b').async('uint8array');
            // Descomprimir ZSTD
            collectionData = await getDecompressedZSTD(compressedData);
            console.log(`   [${label}] ZSTD descomprimido com sucesso`);
        } else if (zip.file('collection.anki21')) {
            collectionData = await zip.file('collection.anki21').async('uint8array');
        } else if (zip.file('collection.anki2')) {
            collectionData = await zip.file('collection.anki2').async('uint8array');
        }
        
        const db = new SQL.Database(collectionData);
        
        // Extrair CRT
        const colRes = db.exec('SELECT crt FROM col');
        const crt = colRes[0].values[0][0];
        
        // Extrair decks - pode estar na tabela col (antigo) ou tabela decks (ZSTD)
        let deckNames = [];
        
        // Primeiro tentar tabela decks (ZSTD)
        try {
            const decksTableRes = db.exec('SELECT name FROM decks');
            if (decksTableRes.length > 0 && decksTableRes[0].values.length > 0) {
                deckNames = decksTableRes[0].values
                    .map(row => row[0])
                    .filter(n => n && n !== 'Default');
                console.log(`   [${label}] Decks extraídos da tabela 'decks' (ZSTD): ${deckNames.length}`);
            }
        } catch (e) {
            // Tabela decks não existe, tentar col.decks (formato antigo)
            console.log(`   [${label}] Tabela 'decks' não encontrada, tentando col.decks...`);
        }
        
        // Se não encontrou na tabela decks, tentar col.decks
        if (deckNames.length === 0) {
            try {
                const decksRes = db.exec('SELECT decks FROM col');
                if (decksRes.length > 0 && decksRes[0].values.length > 0) {
                    const decksValue = decksRes[0].values[0][0];
                    if (decksValue && decksValue.trim().length > 0) {
                        const decksJson = JSON.parse(decksValue);
                        const allDecks = Object.values(decksJson);
                        deckNames = allDecks.map(d => d.name).filter(n => n !== 'Default');
                        console.log(`   [${label}] Decks extraídos de col.decks (formato antigo): ${deckNames.length}`);
                    }
                }
            } catch (e) {
                console.log(`   [${label}] Erro ao extrair decks de col.decks: ${e.message}`);
            }
        }
        
        // Identificar prefixos principais
        const mainPrefixes = new Set();
        const rootDecks = [];
        
        deckNames.forEach(name => {
            if (name.includes('::')) {
                const prefix = name.split('::')[0];
                mainPrefixes.add(prefix);
            } else {
                rootDecks.push(name);
            }
        });
        
        // Calcular hash dos prefixos principais
        const sortedMainDecks = Array.from(mainPrefixes).sort();
        const hash = crypto.createHash('sha256')
            .update(sortedMainDecks.join('|'))
            .digest('hex')
            .substring(0, 16);
        
        // Sugerir nome
        let suggestedName = '';
        if (mainPrefixes.size === 1) {
            suggestedName = Array.from(mainPrefixes)[0];
        } else if (mainPrefixes.size === 0 && rootDecks.length > 0) {
            suggestedName = rootDecks[0];
        } else {
            const prefixCounts = {};
            deckNames.forEach(name => {
                if (name.includes('::')) {
                    const prefix = name.split('::')[0];
                    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
                }
            });
            
            if (Object.keys(prefixCounts).length > 0) {
                const mostCommon = Object.entries(prefixCounts)
                    .sort((a, b) => b[1] - a[1])[0];
                suggestedName = mostCommon[0];
            } else {
                suggestedName = 'Coleção Importada';
            }
        }
        
        db.close();
        
        return {
            label,
            fileName: path.basename(filePath),
            crt,
            crtDate: new Date(crt * 1000).toLocaleString('pt-BR'),
            totalDecks: deckNames.length,
            mainPrefixes: sortedMainDecks,
            hash,
            suggestedName,
            allDeckNames: deckNames
        };
        
    } catch (error) {
        return {
            label,
            fileName: path.basename(filePath),
            error: error.message
        };
    }
}

(async () => {
    const uploadsDir = 'C:/MEDBRAVE.APP/MEDBRAVE.APP/BACKEND/uploads';
    
    console.log('='.repeat(120));
    console.log('ANÁLISE COMPARATIVA: 3 ARQUIVOS MEDSPACY');
    console.log('='.repeat(120));
    console.log();
    
    const files = [
        { path: path.join(uploadsDir, 'Flashcards Medspacy-20250309223939.apkg'), label: 'ARQUIVO 1' },
        { path: path.join(uploadsDir, 'Flashcards Medspacyssssssssssss.apkg'), label: 'ARQUIVO 2' },
        { path: path.join(uploadsDir, 'Flashcards Medspacy__Cirurgia__Trauma__Queimaduraks.apkg'), label: 'ARQUIVO 3' }
    ];
    
    const results = [];
    
    for (const file of files) {
        const result = await analyzeMedspacyFile(file.path, file.label);
        results.push(result);
    }
    
    // Mostrar resultados individuais
    results.forEach(r => {
        console.log(`${r.label}: ${r.fileName}`);
        console.log('-'.repeat(120));
        
        if (r.error) {
            console.log(`   ❌ Erro: ${r.error}`);
        } else {
            console.log(`   📅 CRT: ${r.crt} (${r.crtDate})`);
            console.log(`   📚 Total de decks: ${r.totalDecks}`);
            console.log(`   🔐 Hash: ${r.hash}`);
            console.log(`   💡 Nome sugerido: "${r.suggestedName}"`);
            console.log(`   📂 Prefixos principais (${r.mainPrefixes.length}):`);
            
            if (r.mainPrefixes.length > 0) {
                r.mainPrefixes.forEach(p => console.log(`      - ${p}`));
            } else {
                console.log(`      (nenhum - todos são decks raiz)`);
            }
            
            console.log(`   📋 Todos os decks:`);
            r.allDeckNames.slice(0, 10).forEach(name => {
                console.log(`      - ${name}`);
            });
            if (r.allDeckNames.length > 10) {
                console.log(`      ... e mais ${r.allDeckNames.length - 10} deck(s)`);
            }
        }
        console.log();
    });
    
    // Análise comparativa
    console.log('='.repeat(120));
    console.log('ANÁLISE COMPARATIVA');
    console.log('='.repeat(120));
    console.log();
    
    // Comparar CRTs
    console.log('🔍 COMPARAÇÃO DE CRT:');
    const crtGroups = {};
    results.forEach(r => {
        if (!r.error) {
            if (!crtGroups[r.crt]) {
                crtGroups[r.crt] = [];
            }
            crtGroups[r.crt].push(r.label);
        }
    });
    
    Object.entries(crtGroups).forEach(([crt, labels]) => {
        const date = new Date(parseInt(crt) * 1000).toLocaleString('pt-BR');
        console.log(`   CRT ${crt} (${date}):`);
        labels.forEach(l => console.log(`      - ${l}`));
        if (labels.length > 1) {
            console.log(`      ✅ Mesma coleção Anki original`);
        }
    });
    console.log();
    
    // Comparar Hashes
    console.log('🔍 COMPARAÇÃO DE HASH (Estrutura):');
    const hashGroups = {};
    results.forEach(r => {
        if (!r.error) {
            if (!hashGroups[r.hash]) {
                hashGroups[r.hash] = [];
            }
            hashGroups[r.hash].push(r.label);
        }
    });
    
    Object.entries(hashGroups).forEach(([hash, labels]) => {
        console.log(`   Hash ${hash}:`);
        labels.forEach(l => console.log(`      - ${l}`));
        if (labels.length > 1) {
            console.log(`      ✅ Mesma estrutura de decks (mesmos prefixos principais)`);
        }
    });
    console.log();
    
    // Decisão do sistema
    console.log('='.repeat(120));
    console.log('DECISÃO DO SISTEMA AO IMPORTAR');
    console.log('='.repeat(120));
    console.log();
    
    console.log('Cenário: Usuário já importou ARQUIVO 1 e nomeou como "Flashcards Medspacy"');
    console.log();
    
    results.forEach((r, idx) => {
        if (r.error) return;
        
        console.log(`${r.label} (${r.fileName}):`);
        
        // Comparar com ARQUIVO 1
        const ref = results[0];
        
        if (idx === 0) {
            console.log(`   ✅ Primeira importação`);
            console.log(`   💾 Salvar como: "${r.suggestedName}" (editável pelo usuário)`);
            console.log(`   💾 Hash salvo: ${r.hash}`);
        } else {
            const sameCRT = r.crt === ref.crt;
            const sameHash = r.hash === ref.hash;
            
            console.log(`   🔍 CRT: ${sameCRT ? '✅ IGUAL' : '❌ DIFERENTE'} (${sameCRT ? 'mesma coleção Anki' : 'coleção diferente'})`);
            console.log(`   🔍 Hash: ${sameHash ? '✅ IGUAL' : '❌ DIFERENTE'} (${sameHash ? 'mesma estrutura' : 'estrutura diferente'})`);
            console.log();
            
            if (sameHash) {
                console.log(`   💡 DECISÃO: Coleção "Flashcards Medspacy" detectada!`);
                console.log(`   ❓ Perguntar: "Ignorar duplicatas" ou "Sobrescrever"?`);
                if (!sameCRT) {
                    console.log(`   ⚠️  Aviso: CRT diferente (pode ser exportação de outra coleção Anki)`);
                }
            } else {
                console.log(`   💡 DECISÃO: Estrutura diferente - criar nova coleção`);
                console.log(`   💾 Nome sugerido: "${r.suggestedName}"`);
            }
        }
        console.log();
    });
    
    // Tabela resumo
    console.log('='.repeat(120));
    console.log('TABELA RESUMO');
    console.log('='.repeat(120));
    console.log();
    console.log('Arquivo'.padEnd(70) + 'CRT'.padEnd(15) + 'Hash'.padEnd(20) + 'Decks');
    console.log('-'.repeat(120));
    results.forEach(r => {
        if (!r.error) {
            const fileName = r.fileName.length > 68 ? r.fileName.substring(0, 65) + '...' : r.fileName;
            console.log(
                fileName.padEnd(70) + 
                (r.crt === results[0].crt ? '✅ IGUAL' : r.crt.toString()).padEnd(15) +
                (r.hash === results[0].hash ? '✅ IGUAL' : r.hash).padEnd(20) +
                r.totalDecks
            );
        }
    });
    console.log();
    
})();
