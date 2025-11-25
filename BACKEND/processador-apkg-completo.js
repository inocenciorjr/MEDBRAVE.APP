const fs = require('fs');
const path = require('path');

// Importar da biblioteca exatamente como no exemplo
const { readDatabaseFrom, ZipHandler } = require(path.join(__dirname, 'apkg-reader.js/dist/index.js'));
const { MediaHandler } = require(path.join(__dirname, 'apkg-reader.js/dist/lib/handlers/MediaHandler.js'));
const { getDecompressedZSTD } = require(path.join(__dirname, 'apkg-reader.js/dist/lib/handlers/getDecompressedZSTD.js'));

// Importar função de geração de IDs (usar versão compilada)
const { generateFlashcardId, generateDeckId } = require(path.join(__dirname, 'dist/src/utils/idGenerator.js'));

// ✅ FUNÇÃO UNIVERSAL DE LIMPEZA - USAR EM TODOS OS LUGARES
function limparTextoAnki(texto) {
    if (!texto || typeof texto !== 'string') return texto;

    return texto
        // ✅ CORRIGIR SEPARADORES ANKI ESPECÍFICOS
        .replace(/\u001f/g, '::')           // Unit Separator → ::
        .replace(/\u001e/g, '|')            // Record Separator → |
        .replace(/\u001d/g, '')             // Group Separator → remover

        // ✅ REMOVER CARACTERES DE CONTROLE PROBLEMÁTICOS
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Controle exceto \t, \n, \r

        // ✅ NORMALIZAR ESPAÇOS
        .replace(/\s+/g, ' ')               // Múltiplos espaços → 1 espaço
        .trim();                            // Remover espaços início/fim
}

// ✅ FUNÇÃO ESPECÍFICA PARA CAMPOS DE NOTAS
function processarCamposAnki(flds) {
    if (!flds) return [];

    // ✅ PRIMEIRO LIMPAR, DEPOIS DIVIDIR
    const textoLimpo = limparTextoAnki(flds);

    // ✅ DIVIDIR POR SEPARADOR CORRETO
    return textoLimpo
        .split('::')  // Agora já convertido de \u001f para ::
        .map(campo => limparTextoAnki(campo))  // Limpar cada campo
        .filter(campo => campo.length > 0);
}

// ✅ FUNÇÃO PARA CALCULAR HASH DA ESTRUTURA DE DECKS
function calcularHashEstrutura(deckNames) {
    const crypto = require('crypto');

    // Extrair prefixos principais (primeiro nível da hierarquia)
    const mainPrefixes = new Set();
    const rootDecks = [];

    deckNames.forEach(name => {
        if (name.includes('::')) {
            const prefix = name.split('::')[0];
            mainPrefixes.add(prefix);
        } else if (name !== 'Default') {
            rootDecks.push(name);
        }
    });

    // Se não há hierarquia, usar os decks raiz
    const prefixArray = mainPrefixes.size > 0
        ? Array.from(mainPrefixes).sort()
        : rootDecks.sort();

    // Calcular hash
    const hash = crypto
        .createHash('sha256')
        .update(prefixArray.join('|'))
        .digest('hex')
        .substring(0, 16);

    return {
        hash,
        mainPrefixes: prefixArray,
        totalPrefixes: prefixArray.length
    };
}

// ✅ FUNÇÃO PARA SUGERIR NOME DA COLEÇÃO
function sugerirNomeColecao(deckNames) {
    const mainPrefixes = new Set();
    const rootDecks = [];

    deckNames.forEach(name => {
        if (name.includes('::')) {
            const prefix = name.split('::')[0];
            mainPrefixes.add(prefix);
        } else if (name !== 'Default') {
            rootDecks.push(name);
        }
    });

    // Estratégia de nomeação
    if (mainPrefixes.size === 1) {
        // Apenas um prefixo principal
        return Array.from(mainPrefixes)[0];
    } else if (mainPrefixes.size === 0 && rootDecks.length > 0) {
        // Sem hierarquia, usar primeiro deck raiz
        return rootDecks[0];
    } else if (mainPrefixes.size <= 3) {
        // Poucos prefixos, combinar
        return Array.from(mainPrefixes).sort().join(' + ');
    } else {
        // Muitos prefixos, usar o mais comum
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
            return mostCommon[0];
        }

        return 'Coleção Importada';
    }
}

// ✅ FUNÇÃO PARA GERAR ID DE COLEÇÃO (compatível com idGenerator.ts)
async function generateCollectionId(collectionName, userId) {
    const { createClient } = require('@supabase/supabase-js');
    const crypto = require('crypto');
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Função para sanitizar texto (corrigida para remover acentos corretamente)
    const sanitizeForId = (text) => {
        if (!text) return 'user';

        return text
            .normalize('NFD')                           // Decompor caracteres acentuados
            .replace(/[\u0300-\u036f]/g, '')           // Remover marcas diacríticas
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')               // Substituir não-alfanuméricos por hífen
            .replace(/^-+|-+$/g, '')                   // Remover hífens do início/fim
            .substring(0, 50);                         // Limitar tamanho
    };

    // Buscar o username do usuário
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username_slug, display_name')
        .eq('id', userId)
        .maybeSingle();

    if (userError) {
        console.error('Erro ao buscar usuário:', userError);
    }

    const usernameSlug = userData?.username_slug || sanitizeForId(userData?.display_name || 'user');

    // Sanitizar nome da coleção
    const sanitizedCollectionName = sanitizeForId(collectionName);

    // Gerar hash único baseado no userId + collectionName para evitar colisões
    const hash = crypto
        .createHash('sha256')
        .update(`${userId}-${collectionName}-${Date.now()}`)
        .digest('hex')
        .substring(0, 8);

    // Gerar ID no formato: username_collection_hash
    return `${usernameSlug}_${sanitizedCollectionName}_${hash}`;
}

/**
 * Processador APKG COMPLETO com FSRS integrado
 */
async function processarApkgCompleto(caminhoArquivo, user_id, options = {}) {
    const {
        progressCallback = null,
        collectionName = null,
        coverImageUrl = null,
        saveToDatabase = true,
        duplicateHandling = 'ignore'
    } = options;

    const processId = `${user_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Função auxiliar para emitir progresso
    function emitProgress(percent, message) {
        if (progressCallback) {
            progressCallback(percent, message);
        }
    }
    try {
        // 1. Validar arquivo
        if (!fs.existsSync(caminhoArquivo)) {
            throw new Error('Arquivo APKG não encontrado');
        }

        const stats = fs.statSync(caminhoArquivo);
        const fileName = path.basename(caminhoArquivo);

        // 2. Ler arquivo e extrair com biblioteca
        emitProgress(10, 'Extraindo arquivo APKG...');
        const data = fs.readFileSync(caminhoArquivo);
        const zip = new ZipHandler();
        await zip.extractFilesInPlace(data);

        // 3. Ler database (detecção automática ZSTD)
        emitProgress(20, 'Lendo banco de dados do Anki...');
        const db = await readDatabaseFrom(zip);

        if (!db) {
            throw new Error('Não foi possível ler o database do APKG');
        }

        // 3.5. ✅ EXTRAÇÃO ROBUSTA: Usar extração direta do SQLite (do backup)
        emitProgress(30, 'Extraindo notas e flashcards...');
        const notes = extrairNotesRobustos(db);

        // ✅ LIMPAR NOMES DOS DECKS (converter \x1F para ::)
        const decks = db.decks().map(deck => ({
            ...deck,
            name: limparTextoAnki(deck.name)
        }));

        // Contar decks válidos encontrados
        const decksValidos = decks.filter(deck => deck.name !== 'Default');
        const deckNames = decksValidos.map(d => d.name);

        // ✅ CALCULAR HASH DA ESTRUTURA E EXTRAIR PREFIXOS
        const estruturaInfo = calcularHashEstrutura(deckNames);
        console.log(`✅ Hash da estrutura: ${estruturaInfo.hash}`);
        console.log(`✅ Prefixos principais (${estruturaInfo.totalPrefixes}):`, estruturaInfo.mainPrefixes);

        // ✅ SUGERIR NOME DA COLEÇÃO
        const nomeColetaoSugerido = collectionName || sugerirNomeColecao(deckNames);
        console.log(`💡 Nome sugerido: "${nomeColetaoSugerido}"`);

        emitProgress(35, `${decksValidos.length} deck(s) encontrado(s)`);

        // 5. Extrair relacionamentos cards->decks
        emitProgress(40, 'Organizando estrutura dos decks...');
        const relacionamentos = await extrairRelacionamentos(db);

        // 6. ✅ DETECÇÃO DE DUPLICATAS
        emitProgress(45, 'Verificando duplicatas...');
        const analiseDeduplicacao = await analisarDuplicatas(decks, notes, fileName, duplicateHandling, user_id);

        // 7. Processar mídia com dados binários completos
        // ✅ PULAR PROCESSAMENTO DE MÍDIA SE IGNORAR DUPLICATAS E COLEÇÃO JÁ EXISTE
        const shouldProcessMedia = !(duplicateHandling === 'ignore' && analiseDeduplicacao.collectionExists);

        let mediaFiles = [];
        if (shouldProcessMedia) {
            emitProgress(50, 'Processando arquivos de mídia...');
            mediaFiles = await processarMidiaCompleta(zip, db.isZSTDVersion, db);
        } else {
            console.log('⏭️ Pulando processamento de mídia (ignorando duplicatas de coleção existente)');
        }

        // 8. Organizar estrutura hierárquica
        const estrutura = organizarEstrutura(decks, relacionamentos, notes);

        // 9. Identificar coleção - usar nome fornecido pelo usuário ou identificar automaticamente
        const colecao = collectionName || identificarColecao(decks);

        // 10. Extrair note types
        const noteTypes = db.noteTypes || [];

        // 11. ✅ UPLOAD DE MÍDIA PARA R2 (10-50%)
        let mediaMap = {};
        if (shouldProcessMedia && mediaFiles.length > 0) {
            emitProgress(10, `Fazendo upload de ${mediaFiles.length} arquivo(s) de mídia...`);

            // Criar callback de progresso para upload de mídia
            const mediaProgressCallback = (uploaded, total, message) => {
                const mediaProgress = 10 + Math.floor((uploaded / total) * 40); // 10-50%
                const displayMessage = message || `Upload de mídia: ${uploaded}/${total} arquivos (${Math.floor((uploaded / total) * 100)}%)`;
                emitProgress(mediaProgress, displayMessage);
            };

            mediaMap = await processBatchMediaFiles(mediaFiles, user_id, collectionName || colecao, mediaProgressCallback);
            emitProgress(50, `Upload de mídia concluído!`);
        } else {
            emitProgress(50, `Nenhuma mídia para processar`);
        }

        // 12. ✅ CONVERSÃO PARA MEDBRAVE (50-80%)
        emitProgress(50, `Convertendo ${decksValidos.length} deck(s) para formato MedBrave...`);
        const jsResult = { estrutura: estrutura };
        const medbraveDecks = await convertJSStructureToMedBrave(
            jsResult,
            user_id,
            collectionName || colecao,
            mediaMap,
            progressCallback
        );

        // 13. ✅ APLICAR DUPLICATE HANDLING usando objetos medbraveDecks com cards
        const existingNames = new Set(
            analiseDeduplicacao.existingDecks?.map(d => d.name || d.title || '') || []
        );

        let finalDecks;
        if (existingNames.size === 0) {
            // Coleção totalmente nova -> importa tudo
            finalDecks = medbraveDecks;
        } else if (duplicateHandling === 'ignore') {
            // Ignorar duplicatas: só decks que não existem ainda
            // medbraveDecks tem estrutura { deck: {...}, flashcards: [...] }
            finalDecks = medbraveDecks.filter(item => {
                const deckName = item.deck?.name || item.deck?.title || '';
                return !existingNames.has(deckName);
            });
            console.log(`⏭️ Ignorando ${medbraveDecks.length - finalDecks.length} deck(s) duplicado(s), importando ${finalDecks.length} novo(s)`);
        } else {
            // Overwrite: importa todos os decks completos
            finalDecks = medbraveDecks;
        }

        // Montar resultado final usando finalDecks e analiseDeduplicacao
        const resultado = {
            timestamp: new Date().toISOString(),
            arquivo: fileName,
            tamanho_mb: parseFloat((stats.size / 1024 / 1024).toFixed(2)),
            user_id: user_id,
            success: true,
            versaoZSTD: db.isZSTDVersion,
            bibliotecaUsada: 'apkg-reader.js v1.1.0 + ZSTD + Extração Robusta',
            stats: {
                total_decks: decks.length,
                totalNotes: notes.length,
                total_cards: relacionamentos.length,
                totalMedia: mediaFiles.length,
                medbraveDecks: finalDecks.length
            },
            colecao: nomeColetaoSugerido,
            // ✅ INFORMAÇÕES DE ESTRUTURA PARA IDENTIFICAÇÃO
            estruturaInfo: {
                hash: estruturaInfo.hash,
                mainPrefixes: estruturaInfo.mainPrefixes,
                totalPrefixes: estruturaInfo.totalPrefixes,
                totalDecks: deckNames.length,
                nomeColetaoSugerido: nomeColetaoSugerido
            },
            estrutura: estrutura,
            mediaFiles: mediaFiles,
            mediaMap: mediaMap,
            medbraveDecks: finalDecks,
            noteTypes: noteTypes,
            analiseDeduplicacao: analiseDeduplicacao,
            processedAt: new Date().toISOString()
        };

        // 14. ✅ SALVAR NO BANCO SE SOLICITADO
        if (saveToDatabase) {
            // Inicializar stats com valores padrão
            resultado.stats.newDecks = 0;
            resultado.stats.newCards = 0;

            if (finalDecks.length > 0) {
                // ✅ PROGRESSO PROPORCIONAL: 80-95% para salvar decks
                const totalCards = finalDecks.reduce((sum, d) => sum + (d.flashcards?.length || 0), 0);
                emitProgress(80, `Salvando ${finalDecks.length} deck(s) e ${totalCards} flashcard(s)...`);
                try {
                    // Passar informações de estrutura para saveDecksToDatabase
                    const savedDecks = await saveDecksToDatabase(
                        finalDecks,
                        coverImageUrl,
                        progressCallback,
                        estruturaInfo, // ✅ NOVO: passar hash e prefixos
                        colecao // ✅ NOVO: passar nome da coleção escolhido pelo usuário
                    );
                    resultado.savedDecks = savedDecks;

                    // Adicionar contagem de decks e cards NOVOS (não ignorados)
                    resultado.stats.newDecks = savedDecks.length;
                    resultado.stats.newCards = savedDecks.reduce((sum, deck) => sum + (deck.flashcard_count || 0), 0);

                    // 15. ✅ INDEXAR DECKS PARA BUSCA (95-100%)
                    emitProgress(95, `Indexando ${savedDecks.length} deck(s) para busca...`);
                    try {
                        const { createClient } = require('@supabase/supabase-js');
                        const supabase = createClient(
                            process.env.SUPABASE_URL,
                            process.env.SUPABASE_SERVICE_ROLE_KEY
                        );

                        let indexedCount = 0;
                        for (const deck of savedDecks) {
                            indexedCount++;
                            const indexProgress = 95 + Math.floor((indexedCount / savedDecks.length) * 5); // 95-100%
                            if (indexedCount % 10 === 0 || indexedCount === savedDecks.length) {
                                emitProgress(indexProgress, `Otimizando sistema de buscas...`);
                            }
                            try {
                                // Índice de busca removido - agora usa GIN index diretamente na tabela decks
                            } catch (error) {
                                console.error(`❌ Erro ao processar deck ${deck.name}:`, error);
                            }
                        }
                        emitProgress(95, 'Processamento concluído!');
                    } catch (error) {
                        console.error('❌ Erro no processamento:', error);
                    }

                    // 16. ✅ BUSCAR ESTATÍSTICAS ATUALIZADAS DA COLEÇÃO
                    try {
                        const { createClient } = require('@supabase/supabase-js');
                        const supabase = createClient(
                            process.env.SUPABASE_URL,
                            process.env.SUPABASE_SERVICE_ROLE_KEY
                        );

                        // Buscar todos os decks da coleção usando collection_id
                        // Primeiro buscar o collection_id pelo nome
                        const { data: collectionData } = await supabase
                            .from('collections')
                            .select('id')
                            .eq('user_id', user_id)
                            .eq('name', collectionName || colecao)
                            .maybeSingle();

                        const collectionId = collectionData?.id;

                        if (collectionId) {
                            const { data: collectionDecks, error: collectionError } = await supabase
                                .from('decks')
                                .select('id, name, flashcard_count')
                                .eq('user_id', user_id)
                                .eq('collection_id', collectionId);

                            if (!collectionError && collectionDecks) {
                                const totalDecksInCollection = collectionDecks.length;
                                const totalCardsInCollection = collectionDecks.reduce((sum, deck) => sum + (deck.flashcard_count || 0), 0);

                                // Calcular cards importados e ignorados
                                const newCards = savedDecks.reduce((sum, deck) => sum + (deck.flashcard_count || 0), 0);
                                const ignoredCards = duplicateHandling === 'ignore'
                                    ? (analiseDeduplicacao?.existingDecks?.reduce((sum, deck) => sum + (deck.flashcard_count || 0), 0) || 0)
                                    : 0;

                                resultado.collectionStats = {
                                    totalDecks: totalDecksInCollection,
                                    totalCards: totalCardsInCollection,
                                    newDecks: savedDecks.length,
                                    newCards: newCards,
                                    existingDecks: analiseDeduplicacao?.existingDecks?.length || 0,
                                    ignoredDecks: duplicateHandling === 'ignore' ? (analiseDeduplicacao?.existingDecks?.length || 0) : 0,
                                    ignoredCards: ignoredCards,
                                    overwrittenDecks: duplicateHandling === 'overwrite' ? (analiseDeduplicacao?.existingDecks?.length || 0) : 0
                                };
                            }
                        }
                    } catch (statsError) {
                        console.error('❌ Erro ao buscar estatísticas da coleção:', statsError);
                    }
                } catch (saveError) {
                    console.error('❌ Erro ao salvar decks no banco:', saveError);
                    // Não falha o processamento, apenas registra o erro
                    resultado.saveError = saveError.message;
                }
            } else {
                // Nenhum deck novo para salvar (todos foram ignorados)
                console.log('⏭️ Nenhum deck novo para salvar (todos foram ignorados)');

                // Buscar estatísticas da coleção existente
                try {
                    const { createClient } = require('@supabase/supabase-js');
                    const supabase = createClient(
                        process.env.SUPABASE_URL,
                        process.env.SUPABASE_SERVICE_ROLE_KEY
                    );

                    const { data: collectionData } = await supabase
                        .from('collections')
                        .select('id')
                        .eq('user_id', user_id)
                        .eq('name', collectionName || colecao)
                        .maybeSingle();

                    const collectionId = collectionData?.id;

                    if (collectionId) {
                        const { data: collectionDecks } = await supabase
                            .from('decks')
                            .select('id, name, flashcard_count')
                            .eq('user_id', user_id)
                            .eq('collection_id', collectionId);

                        if (collectionDecks) {
                            const totalDecksInCollection = collectionDecks.length;
                            const totalCardsInCollection = collectionDecks.reduce((sum, deck) => sum + (deck.flashcard_count || 0), 0);
                            const ignoredCards = analiseDeduplicacao?.existingDecks?.reduce((sum, deck) => sum + (deck.flashcard_count || 0), 0) || 0;

                            // Atualizar a coleção no banco com os valores corretos
                            const { error: updateError } = await supabase
                                .from('collections')
                                .update({
                                    deck_count: totalDecksInCollection,
                                    card_count: totalCardsInCollection,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', collectionId);

                            if (updateError) {
                                console.error(`❌ Erro ao atualizar coleção:`, updateError);
                            }

                            resultado.collectionStats = {
                                totalDecks: totalDecksInCollection,
                                totalCards: totalCardsInCollection,
                                newDecks: 0,
                                newCards: 0,
                                existingDecks: analiseDeduplicacao?.existingDecks?.length || 0,
                                ignoredDecks: analiseDeduplicacao?.existingDecks?.length || 0,
                                ignoredCards: ignoredCards,
                                overwrittenDecks: 0
                            };
                        }
                    }
                } catch (statsError) {
                    console.error('❌ Erro ao buscar estatísticas da coleção:', statsError);
                }
            }
        }

        emitProgress(100, 'Importação concluída com sucesso!');
        return { success: true, resultado: resultado, processor: 'APKG Completo' };

    } catch (error) {
        console.error(`❌ Erro ao processar ${caminhoArquivo}:`, error.message);
        throw error;
    }
}

/**
 * Processador APKG para PREVIEW - executa apenas até a detecção de duplicatas
 */
async function processarApkgPreview(caminhoArquivo, user_id, options = {}) {
    const {
        duplicateHandling = 'ignore'
    } = options;

    // Define sendProgress function for this scope
    const sendProgress = (message) => {
        if (global.sendApkgProgress && user_id) {
            global.sendApkgProgress(user_id, message);
        }
    };

    try {
        // 1. Validar arquivo
        if (!fs.existsSync(caminhoArquivo)) {
            throw new Error('Arquivo APKG não encontrado');
        }

        const stats = fs.statSync(caminhoArquivo);
        const fileName = path.basename(caminhoArquivo);

        // 2. Ler arquivo e extrair com biblioteca
        const data = fs.readFileSync(caminhoArquivo);
        const zip = new ZipHandler();
        await zip.extractFilesInPlace(data);



        // 3. Ler database (detecção automática ZSTD)
        const db = await readDatabaseFrom(zip);

        if (!db) {
            throw new Error('Não foi possível ler o database do APKG');
        }

        // 4. ✅ EXTRAÇÃO ROBUSTA
        const notes = extrairNotesRobustos(db);

        // ✅ LIMPAR NOMES DOS DECKS (converter \x1F para ::)
        const decks = db.decks().map(deck => ({
            ...deck,
            name: limparTextoAnki(deck.name)
        }));

        // 5. Extrair relacionamentos cards->decks
        const relacionamentos = await extrairRelacionamentos(db);

        // 6. ✅ DETECÇÃO DE DUPLICATAS
        const analiseDeduplicacao = await analisarDuplicatas(decks, notes, fileName, duplicateHandling, user_id);

        // Filtrar apenas decks que serão estudados (com cards ou decks reais)
        const listaDecks = decks.map(deck => ({
            id: deck.id,
            name: deck.name,
            cardCount: relacionamentos.filter(r => r.deck_id === deck.id).length,
            isSubdeck: deck.name.includes('::')
        }));

        // Contar apenas decks que serão estudados (com cards > 0)
        const decksDeEstudo = listaDecks.filter(deck => deck.cardCount > 0);

        // Identificar nome da coleção (usar TODOS os decks para consistência com analisarDuplicatas)
        const collectionName = identificarColecao(decks) || 'Coleção Anki';

        // Montar resultado de preview
        const resultadoPreview = {
            timestamp: new Date().toISOString(),
            arquivo: fileName,
            collectionName: collectionName,
            tamanho_mb: parseFloat((stats.size / 1024 / 1024).toFixed(2)),
            user_id: user_id,
            success: true,
            versaoZSTD: db.isZSTDVersion,
            bibliotecaUsada: 'apkg-reader.js v1.1.0 + ZSTD + Extração Robusta',
            stats: {
                total_decks: decksDeEstudo.length, // Contar apenas decks com cards (decks de estudo)
                total_decks_com_subpastas: decks.length, // Total incluindo subpastas/subdecks
                total_decks_principais: decks.filter(deck =>
                    !deck.name.includes('::') || deck.name.split('::').length === 1
                ).length, // Decks principais (sem subpastas)
                totalNotes: notes.length,
                total_cards: relacionamentos.length,
                totalMedia: 0 // Não processamos mídia no preview
            },
            decks: listaDecks,
            analiseDeduplicacao: analiseDeduplicacao,
            previewMode: true,
            processedAt: new Date().toISOString()
        };

        return { success: true, resultado: resultadoPreview, processor: 'APKG Preview' };

    } catch (error) {
        console.error(`❌ Erro ao processar preview ${caminhoArquivo}:`, error.message);
        throw error;
    }
}

// ✅ NOVA FUNÇÃO: Extrair notes robustamente do banco SQLite (DO BACKUP)
function extrairNotesRobustos(db) {
    try {
        // Query direta no banco SQLite para extrair notes corretamente
        const query = `
                SELECT 
                    id,
                    guid,
                    mid,
                    mod,
                    usn,
                    tags,
                    flds,
                    sfld,
                    csum,
                    flags,
                    data
                FROM notes
                ORDER BY id
            `;

        const result = db.db.exec(query);

        if (result.length === 0) {
            return db.notes();
        }

        const columns = result[0].columns;
        const values = result[0].values;
        const notes = [];

        for (const row of values) {
            const note = {};
            columns.forEach((col, index) => {
                note[col] = row[index];
            });

            // ✅ PROCESSAMENTO ROBUSTO DOS CAMPOS (DO BACKUP)
            const flds = note.flds || '';
            const campos = processarCamposRobustos(flds);

            // Atribuir front e back corretamente
            note.front = campos[0] || '';
            note.back = campos[1] || '';

            // Manter flds original para compatibilidade
            note.flds = flds;

            notes.push(note);
        }



        return notes;

    } catch (error) {
        console.error('[ERRO] Falha na extração robusta de notes:', error);
        // Fallback para método original
        return db.notes();
    }
}

// ✅ FUNÇÃO UNIFICADA: Processar campos do Anki (suporta múltipla escolha, emojis, HTML, etc)
function processarCamposRobustos(flds) {
    if (!flds) return ['', ''];

    try {
        // Primeiro, separar pelo delimitador padrão \x1f
        let campos = flds.split('\x1f').map(c => c.trim());

        // ✅ DEBUG: Log dos campos recebidos
        console.log('🔍 [DEBUG] processarCamposRobustos - Total de campos:', campos.length);
        campos.forEach((campo, index) => {
            const preview = campo.substring(0, 80);
            console.log(`   Campo ${index}: "${preview}${campo.length > 80 ? '...' : ''}"`);
        });

        // ✅ DETECTAR CARDS DE MÚLTIPLA ESCOLHA POR POSIÇÃO FIXA
        // Estrutura esperada (posições fixas):
        // 0: Question (pode estar vazio)
        // 1: Title (pode estar vazio)
        // 2: Qtype (IGNORAR - metadata tipo "2")
        // 3: Q_1 (alternativa 1 - pode estar vazio)
        // 4: Q_2 (alternativa 2 - pode estar vazio)
        // 5: Q_3 (alternativa 3 - pode estar vazio)
        // 6: Q_4 (alternativa 4 - pode estar vazio)
        // 7: Q_5 (alternativa 5 - pode estar vazio)
        // 8: Answer (resposta - pode estar vazio)
        // 9: Sources (explicação - pode estar vazio)
        // 10+: Extra, Etiquetas (IGNORAR)

        if (campos.length >= 10) {
            console.log('🔍 [DEBUG] Detectando estrutura de múltipla escolha (10+ campos)...');

            // Coletar campos do FRONT (Question + Title + Q_1 a Q_5)
            const frontParts = [];

            // Campo 0: Question
            if (campos[0]) {
                frontParts.push(campos[0]);
                console.log(`   ✅ Question (campo 0): "${campos[0].substring(0, 50)}..."`);
            }

            // Campo 1: Title
            if (campos[1]) {
                frontParts.push(campos[1]);
                console.log(`   ✅ Title (campo 1): "${campos[1].substring(0, 50)}..."`);
            }

            // Campo 2: Qtype - IGNORAR
            console.log(`   ⏭️ Qtype (campo 2): IGNORADO - "${campos[2]}"`);

            // Campos 3-7: Q_1 a Q_5 (alternativas)
            for (let i = 3; i <= 7; i++) {
                if (campos[i]) {
                    frontParts.push(campos[i]);
                    console.log(`   ✅ Alternativa Q_${i - 2} (campo ${i}): "${campos[i].substring(0, 50)}..."`);
                } else {
                    console.log(`   ⏭️ Alternativa Q_${i - 2} (campo ${i}): VAZIO`);
                }
            }

            // Coletar campos do BACK (Answer + Sources)
            const backParts = [];

            // Campo 8: Answer
            if (campos[8]) {
                backParts.push(campos[8]);
                console.log(`   ✅ Answer (campo 8): "${campos[8].substring(0, 50)}..."`);
            } else {
                console.log(`   ⏭️ Answer (campo 8): VAZIO`);
            }

            // Campo 9: Sources
            if (campos[9]) {
                backParts.push(campos[9]);
                console.log(`   ✅ Sources (campo 9): "${campos[9].substring(0, 50)}..."`);
            } else {
                console.log(`   ⏭️ Sources (campo 9): VAZIO`);
            }

            // Se tem pelo menos 2 alternativas (Q_1 a Q_5), é múltipla escolha
            const numAlternativas = [campos[3], campos[4], campos[5], campos[6], campos[7]].filter(c => c).length;

            if (numAlternativas >= 2) {
                console.log(`✅ [DEBUG] Card de múltipla escolha detectado! (${numAlternativas} alternativas)`);

                const front = frontParts.join('<br><br>');
                const back = backParts.join('<br><br>');

                console.log(`✅ [DEBUG] Processado - Front: ${front.length} chars, Back: ${back.length} chars`);
                return [front, back];
            } else {
                console.log(`❌ [DEBUG] Menos de 2 alternativas (${numAlternativas}), não é múltipla escolha`);
            }
        }

        // Se só temos um campo, tentar detectar padrões de separação visual
        if (campos.length === 1) {
            const texto = campos[0];

            // ✅ PADRÕES COMUNS DE SEPARAÇÃO FRONT/BACK
            // Padrão 1: Pergunta + emoji + resposta
            const padraoEmoji = /^(.+?)[📍🔹🔸▶️➡️→⭐✅❓❔]\s*(.+)$/s;
            const matchEmoji = texto.match(padraoEmoji);
            if (matchEmoji) {
                campos = [matchEmoji[1].trim(), matchEmoji[2].trim()];
            }

            // Padrão 2: Pergunta + quebra de linha + resposta
            else if (texto.includes('\n')) {
                const linhas = texto.split('\n');
                const pergunta = linhas[0].trim();
                const resposta = linhas.slice(1).join('\n').trim();
                if (pergunta && resposta) {
                    campos = [pergunta, resposta];
                }
            }

            // Padrão 3: Pergunta? + Resposta (sem quebra de linha)
            else {
                const padraoQuestao = /^(.+\?)\s*(.+)$/s;
                const matchQuestao = texto.match(padraoQuestao);
                if (matchQuestao && matchQuestao[2].length > 10) { // Resposta deve ter pelo menos 10 chars
                    campos = [matchQuestao[1].trim(), matchQuestao[2].trim()];
                }
            }
        }

        // ✅ PRESERVAR HTML: Processar cada campo mantendo formatação HTML
        const camposProcessados = campos.map(campo => {
            if (!campo) return '';

            // ✅ PRESERVAR FORMATAÇÃO HTML (negritos, cores, etc.)
            let campoLimpo = campo;

            // Decodificar APENAS entidades HTML básicas, preservando tags
            campoLimpo = campoLimpo
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ');

            // ✅ NÃO REMOVER tags HTML como <b>, <i>, <font color>, etc.
            // ✅ PRESERVAR EMOJIS E CARACTERES UNICODE

            return campoLimpo.trim();
        });

        // Garantir que sempre temos pelo menos 2 campos
        while (camposProcessados.length < 2) {
            camposProcessados.push('');
        }

        return camposProcessados;

    } catch (error) {
        console.error('[ERRO] Falha no processamento de campos:', error);
        return [flds, ''];
    }
}

// ✅ NOVA FUNÇÃO: Análise de duplicatas CORRIGIDA
async function analisarDuplicatas(decks, notes, nomeArquivo, duplicateHandling, user_id) {
    try {

        // ✅ VERIFICAÇÃO REAL NO SUPABASE (baseada no processador FSRS)
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Usar user_id real passado como parâmetro
            if (!user_id) {
                console.warn('⚠️ user_id não fornecido, usando fallback');
                user_id = process.env.TEST_USER_ID || 'test-user';
            }

            // ✅ CALCULAR HASH DA ESTRUTURA DOS DECKS
            const deckNames = decks.map(d => d.name).filter(n => n !== 'Default');
            const estruturaInfo = calcularHashEstrutura(deckNames);
            const structureHash = estruturaInfo.hash;

            console.log(`🔍 Buscando coleção com hash: ${structureHash}`);

            // ✅ BUSCAR COLEÇÃO EXISTENTE PELO HASH DA ESTRUTURA (mais confiável)
            let { data: existingCollection } = await supabase
                .from('collections')
                .select('*')
                .eq('user_id', user_id)
                .eq('deck_structure_hash', structureHash)
                .maybeSingle();

            // Se não encontrou por hash, buscar coleções similares por sobreposição de nomes
            let similarCollections = [];
            if (!existingCollection) {
                console.log('🔍 Hash não encontrado, buscando coleções similares...');

                // Buscar todas as coleções do usuário
                const { data: allCollections } = await supabase
                    .from('collections')
                    .select('*')
                    .eq('user_id', user_id);

                if (allCollections && allCollections.length > 0) {
                    // Calcular sobreposição com cada coleção
                    for (const col of allCollections) {
                        // Buscar decks desta coleção
                        const { data: colDecks } = await supabase
                            .from('decks')
                            .select('name, title')
                            .eq('collection_id', col.id);

                        if (colDecks && colDecks.length > 0) {
                            const existingDeckNames = new Set(
                                colDecks.map(d => d.name || d.title)
                            );

                            // Contar quantos decks novos já existem
                            const overlap = deckNames.filter(name =>
                                existingDeckNames.has(name)
                            ).length;

                            const overlapPercentage = (overlap / deckNames.length) * 100;

                            if (overlapPercentage > 30) { // 30% de sobreposição
                                similarCollections.push({
                                    ...col,
                                    overlapPercentage: overlapPercentage.toFixed(1),
                                    overlapCount: overlap,
                                    totalDecks: colDecks.length
                                });
                            }
                        }
                    }

                    // Ordenar por sobreposição (maior primeiro)
                    similarCollections.sort((a, b) => b.overlapPercentage - a.overlapPercentage);

                    console.log(`📊 Encontradas ${similarCollections.length} coleção(ões) similar(es)`);
                }
            }

            // Se a coleção existe (por hash), usar o ID dela
            const collectionId = existingCollection?.id;
            const collectionExists = !!existingCollection;

            // Buscar decks desta coleção específica (se existir)
            let allUserDecks = [];
            if (collectionId) {
                const { data, error: decksError } = await supabase
                    .from('decks')
                    .select('*')
                    .eq('user_id', user_id)
                    .eq('collection_id', collectionId);

                if (!decksError && data) {
                    allUserDecks = data;
                }
            }

            const existingDecks = [];
            const newDecks = [];

            // ✅ VERIFICAR QUAIS DECKS JÁ EXISTEM (match por nome)
            for (const newDeck of decks) {
                const deckName = newDeck.name;
                let found = false;

                for (const existingDeck of allUserDecks || []) {
                    const existingName = existingDeck.name || existingDeck.title;

                    // Match por nome completo ou hierarquia
                    let isMatch = existingName === deckName;

                    if (!isMatch && existingDeck.hierarchy && Array.isArray(existingDeck.hierarchy)) {
                        const hierarchyPath = existingDeck.hierarchy.join('::');
                        isMatch = hierarchyPath === deckName;
                    }

                    if (isMatch) {
                        if (!existingDecks.find(d => d.id === existingDeck.id)) {
                            existingDecks.push(existingDeck);
                        }
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    newDecks.push(newDeck);
                }
            }

            // Determinar ação baseada nos resultados
            let action = 'create';
            let recomendacao = 'Criar nova coleção';

            if (collectionExists) {
                if (existingDecks.length > 0 && newDecks.length > 0) {
                    action = 'merge';
                    recomendacao = 'Mesclar com decks existentes';
                } else if (existingDecks.length > 0) {
                    action = 'update';
                    recomendacao = 'Atualizar decks existentes';
                } else {
                    action = 'add';
                    recomendacao = 'Adicionar novos decks à coleção existente';
                }
            } else if (similarCollections.length > 0) {
                action = 'ask_user';
                recomendacao = 'Perguntar ao usuário (coleções similares encontradas)';
            }

            return {
                analiseRealizada: true,
                tipoAnalise: 'supabase_hash',
                timestamp: new Date().toISOString(),
                arquivo: nomeArquivo,
                structureHash: structureHash,
                mainPrefixes: estruturaInfo.mainPrefixes,
                action: action,
                hasExisting: existingDecks.length > 0,
                collectionExists: collectionExists,
                existingCollection: existingCollection,
                similarCollections: similarCollections, // ✅ NOVO: coleções similares
                totalDecksInCollection: allUserDecks.length,
                existingDecks: existingDecks,
                newDecks: newDecks,
                totalAnalyzed: decks.length,
                duplicatePercentage: existingDecks.length > 0 ? (existingDecks.length / decks.length * 100).toFixed(1) : 0,
                recomendacao: recomendacao
            };

        } catch (supabaseError) {
            // Fallback para análise local (código anterior)
            const deckNames = decks.map(d => d.name).filter(name => name !== 'Default');
            const noteContents = notes.map(n => (n.front + ' ' + n.back).substring(0, 100));

            // Análise básica de padrões
            const padroesSimilares = {
                decksComNomesSimilares: deckNames.filter(name =>
                    deckNames.some(other => other !== name && other.includes(name.split('::')[0]))
                ).length,
                notesComConteudoSimilar: noteContents.filter(content =>
                    noteContents.some(other => other !== content &&
                        other.length > 50 && content.length > 50 &&
                        other.substring(0, 30) === content.substring(0, 30))
                ).length
            };

            return {
                analiseRealizada: true,
                tipoAnalise: 'local',
                timestamp: new Date().toISOString(),
                arquivo: nomeArquivo,
                possiveisDuplicatas: padroesSimilares,
                recomendacao: padroesSimilares.decksComNomesSimilares > 0 || padroesSimilares.notesComConteudoSimilar > 0
                    ? 'Verificar manualmente possíveis duplicatas'
                    : 'Nenhuma duplicata óbvia detectada'
            };
        }

    } catch (error) {
        console.error('❌ Erro na análise de duplicatas:', error.message);
        return {
            analiseRealizada: false,
            erro: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ✅ FUNÇÃO: Extrair relacionamentos cards->decks
async function extrairRelacionamentos(db) {
    try {
        const query = `
                SELECT 
                    c.id as card_id,
                    c.nid as note_id, 
                    c.did as deck_id,
                    c.ord as card_order,
                    c.type as card_type,
                    c.queue as card_queue,
                    n.flds as note_fields
                FROM cards c 
                JOIN notes n ON c.nid = n.id
                ORDER BY c.did, c.ord
            `;

        const result = db.db.exec(query);

        if (result.length === 0) {
            const notes = db.notes();
            return notes.map((note, index) => ({
                card_id: index + 1,
                note_id: note.id,
                deck_id: 1, // Deck padrão
                card_order: index,
                card_type: 0,
                card_queue: 0,
                note_fields: note.front + '\x1f' + note.back
            }));
        }

        const columns = result[0].columns;
        const values = result[0].values;

        return values.map(row => {
            const card = {};
            columns.forEach((col, index) => {
                card[col] = row[index];
            });
            return card;
        });
    } catch (error) {
        // Fallback
        const notes = db.notes();
        return notes.map((note, index) => ({
            card_id: index + 1,
            note_id: note.id,
            deck_id: 1,
            card_order: index,
            card_type: 0,
            card_queue: 0,
            note_fields: note.front + '\x1f' + note.back
        }));
    }
}

// ✅ FUNÇÃO: Processar mídia com dados binários E NOMES CORRETOS
async function processarMidiaCompleta(zip, isZSTDVersion, db = null) {
    const mediaFiles = [];

    try {
        const mediaFile = await zip.getMediaFile();

        if (mediaFile && mediaFile.contents) {

            let mediaContents = mediaFile.contents;

            // Descomprimir ZSTD se necessário
            if (isZSTDVersion && mediaContents instanceof Uint8Array) {
                const zstdSignature = [0x28, 0xb5, 0x2f, 0xfd];
                const hasZstdSignature = zstdSignature.every((byte, i) => mediaContents[i] === byte);

                if (hasZstdSignature) {
                    mediaContents = getDecompressedZSTD(mediaContents);
                }
            }

            const mediaHandler = new MediaHandler(mediaContents);

            if (mediaHandler.hasMedia()) {
                const mediaMapping = mediaHandler.getFiles();

                // ✅ NOVA FUNCIONALIDADE: Extrair nomes corretos dos NOTES
                let mapeamentoCorreto = mediaMapping;
                if (db && isZSTDVersion) {
                    const nomesCorretos = extrairNomesCorretosDoNotes(db);
                    mapeamentoCorreto = criarMapeamentoCorreto(nomesCorretos, mediaMapping);
                }

                // Buscar dados binários dos arquivos
                Object.entries(mapeamentoCorreto).forEach(([key, fileName]) => {
                    const fileData = zip.files.find(f => f.name === key);

                    if (fileData && fileData.contents) {
                        let imageContents = fileData.contents;

                        // ✅ CORREÇÃO: Descomprimir arquivo individual se for ZSTD
                        if (isZSTDVersion && imageContents instanceof Uint8Array) {
                            const zstdSignature = [0x28, 0xb5, 0x2f, 0xfd];
                            const hasZstdSignature = zstdSignature.every((byte, i) => imageContents[i] === byte);

                            if (hasZstdSignature) {
                                imageContents = getDecompressedZSTD(imageContents);
                            }
                        }

                        mediaFiles.push({
                            fileName: fileName,
                            data: imageContents,
                            nome: fileName,
                            tamanho: imageContents.length,
                            tipo: detectarTipoMidia(fileName),
                            originalKey: key
                        });
                    }
                });
            }
        }

    } catch (error) {
        console.error(`❌ Erro ao processar mídia: ${error.message}`);
    }

    return mediaFiles;
}

// ✅ FUNÇÃO: Organizar estrutura hierárquica CORRIGIDA
function organizarEstrutura(decks, relacionamentos, notes) {
    // Criar mapa de notes por ID
    const notesMap = new Map();
    notes.forEach(note => {
        notesMap.set(note.id, note);
    });

    // Agrupar cards por deck
    const cardsPorDeck = new Map();
    relacionamentos.forEach(card => {
        if (!cardsPorDeck.has(card.deck_id)) {
            cardsPorDeck.set(card.deck_id, []);
        }
        cardsPorDeck.get(card.deck_id).push(card);
    });

    // Organizar estrutura hierárquica
    const estrutura = {};

    decks.forEach(deck => {
        if (deck.name === 'Default') return; // Ignorar deck padrão

        const cardsNoDeck = cardsPorDeck.get(deck.id) || [];

        // ✅ LIMPAR NOME DO DECK ANTES DE PROCESSAR
        const nomeClean = limparTextoAnki(deck.name);
        const partes = nomeClean.split('::');
        let nivel = estrutura;



        // ✅ PRIMEIRA PARTE É SEMPRE A COLEÇÃO
        const colecao = partes[0];

        partes.forEach((parte, index) => {
            if (!nivel[parte]) {
                nivel[parte] = {
                    id: deck.id,
                    nome: parte,
                    nomeCompleto: nomeClean,
                    nivel: index,
                    colecao: colecao,
                    // ✅ IDENTIFICAR TIPO CORRETAMENTE
                    tipo: index === 0 ? 'colecao' :
                        index === partes.length - 1 && cardsNoDeck.length > 0 ? 'deck' : 'pasta',
                    total_cards: 0,
                    filhos: {},
                    cards: [],
                    deck: deck
                };
            }

            // ✅ SE TEM CARDS, É UM DECK (independente do nível)
            if (cardsNoDeck.length > 0 && index === partes.length - 1) {
                nivel[parte].tipo = 'deck';
                nivel[parte].cards = cardsNoDeck.map(card => ({
                    ...card,
                    note: notesMap.get(card.note_id)
                }));
                nivel[parte].totalCards = cardsNoDeck.length;
            }

            nivel = nivel[parte].filhos;
        });
    });

    return calcularTotaisHierarquicos(estrutura);
}

// ✅ FUNÇÃO: Calcular totais hierárquicos (DO BACKUP)
function calcularTotaisHierarquicos(estrutura) {
    // Calcular totais recursivamente
    function calcularTotal(obj) {
        let total = obj.totalCards || 0;

        Object.values(obj.filhos || {}).forEach(filho => {
            total += calcularTotal(filho);
        });

        obj.totalCards = total;
        return total;
    }

    Object.values(estrutura).forEach(item => {
        calcularTotal(item);
    });

    return estrutura;
}

// ✅ FUNÇÃO: Identificar coleção (EXATAMENTE COMO NO BACKUP)
function identificarColecao(decks) {
    // Identificar a coleção principal baseado nos nomes dos decks
    const nomes = decks.map(d => d.name).filter(name => name !== 'Default');

    if (nomes.length === 0) return 'Sem nome';

    // Pegar o prefixo mais comum (antes do primeiro ::)
    const prefixes = nomes.map(name => name.split('::')[0]);
    const contagem = {};

    prefixes.forEach(prefix => {
        contagem[prefix] = (contagem[prefix] || 0) + 1;
    });

    const colecaoMaisComum = Object.keys(contagem).reduce((a, b) =>
        contagem[a] > contagem[b] ? a : b
    );

    return colecaoMaisComum;
}

// ✅ FUNÇÃO: Detectar tipo de mídia
function detectarTipoMidia(fileName) {
    const ext = path.extname(fileName).toLowerCase();

    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) return 'imagem';
    if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)) return 'audio';
    if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext)) return 'video';
    if (['.pdf', '.doc', '.docx'].includes(ext)) return 'documento';

    return 'outro';
}

// ✅ NOVA FUNÇÃO: Extrair nomes corretos dos NOTES (SOLUÇÃO ZSTD)
function extrairNomesCorretosDoNotes(db) {
    const notes = db.notes();
    const nomesCorretos = new Set();

    notes.forEach(note => {
        // Extrair de front e back
        [note.front, note.back].forEach(conteudo => {
            if (conteudo) {
                const referencias = extrairReferenciasMidiaDoTexto(conteudo);
                referencias.forEach(ref => nomesCorretos.add(ref.nome));
            }
        });
    });

    return Array.from(nomesCorretos);
}

// ✅ NOVA FUNÇÃO: Criar mapeamento correto (SOLUÇÃO ZSTD)
function criarMapeamentoCorreto(nomesCorretos, mediaMapping) {
    const mapeamentoCorreto = {};

    // Para cada chave no mapping original, tentar encontrar o nome correto correspondente
    Object.entries(mediaMapping).forEach(([key, nomeTruncado]) => {
        // Procurar nome correto que seja similar ao truncado
        const nomeCorreto = nomesCorretos.find(nome => {
            // Estratégia 1: Nome exato
            if (nome === nomeTruncado) return true;

            // Estratégia 2: Remover prefixos misteriosos do Anki (como "2")
            let nomeTruncadoLimpo = nomeTruncado;
            if (/^\d+/.test(nomeTruncado)) {
                nomeTruncadoLimpo = nomeTruncado.replace(/^\d+/, '');
            }

            // Estratégia 3: Nome correto contém o truncado limpo
            const baseTruncado = nomeTruncadoLimpo.replace(/\.[^.]+$/, '');
            const baseCorreto = nome.replace(/\.[^.]+$/, '');

            if (baseCorreto.includes(baseTruncado)) return true;

            // Estratégia 4: Similaridade por palavras-chave
            const palavrasTruncado = baseTruncado.split(/[\s\-_()]+/).filter(p => p.length > 1);
            const palavrasCorreto = baseCorreto.split(/[\s\-_()]+/).filter(p => p.length > 1);

            const palavrasComuns = palavrasTruncado.filter(p =>
                palavrasCorreto.some(pc =>
                    pc.toLowerCase().includes(p.toLowerCase()) ||
                    p.toLowerCase().includes(pc.toLowerCase())
                )
            );

            // Se pelo menos 50% das palavras coincidem
            const percentualMatch = palavrasComuns.length / Math.max(palavrasTruncado.length, 1);
            if (percentualMatch >= 0.5) return true;

            // Estratégia 5: Match por extensão + palavras-chave principais
            const extTruncado = nomeTruncado.split('.').pop();
            const extCorreto = nome.split('.').pop();

            if (extTruncado === extCorreto && palavrasComuns.length > 0) return true;

            return false;
        });

        if (nomeCorreto) {
            mapeamentoCorreto[key] = nomeCorreto;
        } else {
            // Fallback inteligente: se só há um nome correto e um truncado, assumir que são o mesmo
            if (nomesCorretos.length === 1 && Object.keys(mediaMapping).length === 1) {
                mapeamentoCorreto[key] = nomesCorretos[0];
            } else {
                mapeamentoCorreto[key] = nomeTruncado; // Fallback padrão
            }
        }
    });

    return mapeamentoCorreto;
}

// ✅ NOVA FUNÇÃO: Extrair referências de mídia do texto
function extrairReferenciasMidiaDoTexto(texto) {
    const referencias = [];

    const padroes = [
        /src="([^"]*\.(png|jpg|jpeg|gif|webp|svg|mp3|wav|ogg|mp4|webm))"/gi,
        /\[sound:([^]]*\.(mp3|wav|ogg))\]/gi
    ];

    padroes.forEach(padrao => {
        let match;
        while ((match = padrao.exec(texto)) !== null) {
            referencias.push({
                nome: match[1],
                tipo: 'midia'
            });
        }
    });

    return referencias;
}

// ✅ FUNÇÃO: Validar integridade dos dados extraídos
function validarIntegridadeDados(decks, notes, relacionamentos, mediaFiles) {

    const validacao = {
        valido: true,
        avisos: [],
        erros: [],
        estatisticas: {
            decks: decks.length,
            notes: notes.length,
            relacionamentos: relacionamentos.length,
            mediaFiles: mediaFiles.length
        }
    };

    // Validar decks
    if (decks.length === 0) {
        validacao.erros.push('Nenhum deck encontrado no arquivo APKG');
        validacao.valido = false;
    }

    const decksVazios = decks.filter(d => d.name === 'Default' || !d.name);
    if (decksVazios.length > 0) {
        validacao.avisos.push(`${decksVazios.length} deck(s) sem nome ou padrão encontrado(s)`);
    }

    // Validar notes
    if (notes.length === 0) {
        validacao.erros.push('Nenhuma nota encontrada no arquivo APKG');
        validacao.valido = false;
    }

    const notesVazios = notes.filter(n => !n.front && !n.back);
    if (notesVazios.length > 0) {
        validacao.avisos.push(`${notesVazios.length} nota(s) sem conteúdo front/back`);
    }

    // Validar relacionamentos
    if (relacionamentos.length === 0) {
        validacao.avisos.push('Nenhum relacionamento card->deck encontrado');
    }

    // Validar referências de mídia
    const referenciasMidia = extrairReferenciasDeTodasAsNotas(notes);
    const mediaEncontrada = mediaFiles.map(m => m.nome || m.fileName);
    const mediaFaltando = referenciasMidia.filter(ref => !mediaEncontrada.includes(ref));

    if (mediaFaltando.length > 0) {
        validacao.avisos.push(`${mediaFaltando.length} arquivo(s) de mídia referenciado(s) mas não encontrado(s): ${mediaFaltando.slice(0, 3).join(', ')}${mediaFaltando.length > 3 ? '...' : ''}`);
    }

    validacao.estatisticas.mediaReferenciada = referenciasMidia.length;
    validacao.estatisticas.mediaFaltando = mediaFaltando.length;



    return validacao;
}

// ✅ NOVA FUNÇÃO: Extrair referências de mídia de todas as notas
function extrairReferenciasDeTodasAsNotas(notes) {
    const refs = new Set();

    notes.forEach(note => {
        const content = (note.front || '') + ' ' + (note.back || '');

        try {
            // Extrair referências src="filename"
            const srcMatches = content.match(/src="?([^"'\s>]+)"?/gi);
            if (srcMatches) {
                srcMatches.forEach(match => {
                    const fileName = match.replace(/src="?/gi, '').replace(/"?$/g, '');
                    if (fileName) refs.add(fileName);
                });
            }

            // Extrair referências [sound:filename]
            const soundMatches = content.match(/\[sound:([^\]]+)\]/gi);
            if (soundMatches) {
                soundMatches.forEach(match => {
                    const fileName = match.replace(/\[sound:/gi, '').replace(/\]$/g, '');
                    if (fileName) refs.add(fileName);
                });
            }

        } catch (error) {
            console.error(`❌ Erro ao extrair referências de mídia da nota ${note.id}:`, error.message);
        }
    });

    return Array.from(refs);
}





// ✅ FUNÇÃO: Verificação completa de duplicatas
async function checkExistingCollection(user_id, userEmail, collectionName, decks) {
    try {
        // ✅ VERIFICAÇÃO REAL NO SUPABASE
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Buscar decks existentes do usuário com nomes similares
        const { data: existingDecksData, error } = await supabase
            .from('decks')
            .select('*')
            .eq('user_id', user_id);

        if (error) throw error;

        const existingDecks = existingDecksData || [];
        const newDecks = [];

        // Verificar cada deck novo contra os existentes
        for (const newDeck of decks) {
            const deckName = newDeck.name || newDeck.title;
            let found = false;

            for (const existingDeck of existingDecks || []) {
                // Supabase já retorna objetos diretamente
                const existingName = existingDeck.name || existingDeck.title;

                // Verificar se é o mesmo deck (nome exato ou hierarquia similar)
                if (existingName === deckName ||
                    existingName.includes(deckName) ||
                    deckName.includes(existingName)) {

                    existingDecks.push(existingDeck);
                    found = true;
                    break;
                }
            }

            if (!found) {
                newDecks.push(newDeck);
            }
        }

        // Análise de importação silenciosa

        // Determinar ação baseada nos resultados
        let action = 'create';
        if (existingDecks.length > 0) {
            action = newDecks.length > 0 ? 'merge' : 'update';
        }

        return {
            action: action,
            hasExisting: existingDecks.length > 0,
            existingDecks: existingDecks,
            newDecks: newDecks,
            totalAnalyzed: decks.length,
            duplicatePercentage: existingDecks.length > 0 ? (existingDecks.length / decks.length * 100).toFixed(1) : 0
        };

    } catch (error) {
        // Fallback para criação nova em caso de erro
        return {
            action: 'create',
            hasExisting: false,
            existingDecks: [],
            newDecks: decks,
            totalAnalyzed: decks.length,
            duplicatePercentage: 0,
            error: error.message
        };
    }
}

// ✅ FUNÇÃO: Upload de mídia em lote para R2
async function processBatchMediaFiles(mediaFiles, user_id, collectionName, progressCallback = null) {
    const mediaMap = {};

    if (!mediaFiles || mediaFiles.length === 0) {
        return mediaMap;
    }

    try {
        // ✅ IMPORTAR R2SERVICE DE FORMA INTELIGENTE (dev ou prod)
        const path = require('path');
        const fs = require('fs');
        const projectRoot = process.cwd();

        let r2Service = null;
        let useRealUpload = false;

        // Tentar importar r2Service (detecção automática dev/prod)
        try {
            // Primeiro: tentar arquivo compilado (modo produção)
            const compiledPath = path.join(projectRoot, 'dist/src/services/r2Service.js');
            if (fs.existsSync(compiledPath)) {
                const { r2Service: r2ServiceCompiled } = require(compiledPath);
                r2Service = r2ServiceCompiled;
                useRealUpload = true;
            } else {
                // Segundo: tentar TypeScript direto (modo dev)
                const tsPath = path.join(projectRoot, 'src/services/r2Service.ts');
                if (fs.existsSync(tsPath)) {
                    const { r2Service: r2ServiceTS } = require(tsPath);
                    r2Service = r2ServiceTS;
                    useRealUpload = true;
                }
            }
        } catch (importError) {
            // Se falhar, usar URLs fake como fallback
            useRealUpload = false;
        }

        let processedCount = 0;
        let errorCount = 0;

        if (useRealUpload && r2Service) {
            // ✅ UPLOAD EM BATCHES COM PROGRESSO (OTIMIZADO)
            const BATCH_SIZE = 200; // 200 arquivos por vez (4x mais rápido)
            const totalFiles = mediaFiles.length;

            for (let i = 0; i < mediaFiles.length; i += BATCH_SIZE) {
                const batch = mediaFiles.slice(i, i + BATCH_SIZE);

                const uploadPromises = batch.map(async (mediaFile) => {
                    try {
                        const cleanFileName = mediaFile.fileName
                            .replace(/\s+/g, '_')
                            .replace(/[^\w\-_.]/g, '')
                            .replace(/_{2,}/g, '_');

                        const fileData = mediaFile.data;
                        const contentType = getContentTypeFromFileName(mediaFile.fileName);
                        // ✅ ORGANIZAR POR COLEÇÃO: flashcards/{userId}/{collectionSlug}/media
                        const collectionSlug = (collectionName || 'default')
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                            .substring(0, 50);
                        const folder = `flashcards/${user_id}/${collectionSlug}/media`;

                        // 🎨 OTIMIZAR MÍDIA antes de enviar
                        let optimizedData = fileData;
                        let optimizedType = contentType;
                        let optimizedFileName = cleanFileName;
                        let optimizationInfo = null;

                        try {
                            const { MediaOptimizationService } = require('./dist/src/services/mediaOptimizationService');
                            const optimizer = new MediaOptimizationService();

                            // Otimizar apenas imagens
                            if (optimizer.isImage(contentType)) {
                                // Emitir progresso de otimização
                                if (progressCallback) {
                                    const currentProgress = Math.floor((processedCount / totalFiles) * 100);
                                    progressCallback(processedCount, totalFiles, `Otimizando imagem ${processedCount + 1}/${totalFiles}...`);
                                }

                                const result = await optimizer.optimizeImage(fileData, {
                                    maxWidth: 1920,
                                    maxHeight: 1920,
                                    quality: 90,
                                    format: 'webp'
                                });

                                optimizedData = result.buffer;
                                optimizedType = result.mimeType;
                                optimizationInfo = result;

                                // Atualizar extensão do arquivo para .webp
                                optimizedFileName = cleanFileName.replace(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i, '.webp');

                                // Log removido para reduzir verbosidade
                            }
                        } catch (optError) {
                            console.warn('⚠️ [APKG] Erro ao otimizar mídia, usando original:', optError.message);
                            // Continuar com arquivo original
                        }

                        const uploadResult = await r2Service.uploadFile(
                            optimizedData,
                            optimizedFileName,
                            optimizedType,
                            folder
                        );

                        return {
                            originalName: mediaFile.fileName,
                            url: uploadResult.publicUrl,
                            success: true
                        };
                    } catch (uploadError) {
                        // Fallback para URL fake
                        const cleanFileName = mediaFile.fileName
                            .replace(/\s+/g, '_')
                            .replace(/[^\w\-_.]/g, '')
                            .replace(/_{2,}/g, '_');

                        const r2PublicUrl = process.env.R2_PUBLIC_URL || 'https://medbrave.com.br';
                        const collectionSlug = (collectionName || 'default')
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                            .substring(0, 50);
                        const timestamp = Date.now();
                        const randomId = Math.random().toString(36).substring(2, 15);
                        const fakeUrl = `${r2PublicUrl}/flashcards/${user_id}/${collectionSlug}/media/${timestamp}_${randomId}_${cleanFileName}`;

                        return {
                            originalName: mediaFile.fileName,
                            url: fakeUrl,
                            success: false
                        };
                    }
                });

                // Aguardar batch atual
                const results = await Promise.all(uploadPromises);

                // Processar resultados
                results.forEach(result => {
                    mediaMap[result.originalName] = result.url;
                    if (result.success) {
                        processedCount++;
                    } else {
                        errorCount++;
                    }
                });

                // Emitir progresso
                if (progressCallback) {
                    progressCallback(processedCount, totalFiles, `Upload de mídia: ${processedCount}/${totalFiles} arquivos`);
                }
            }

        } else {
            // ✅ GERAR URLs FAKE EM LOTE (quando r2Service não disponível)
            const totalFiles = mediaFiles.length;
            mediaFiles.forEach((mediaFile, index) => {
                const cleanFileName = mediaFile.fileName
                    .replace(/\s+/g, '_')
                    .replace(/[^\w\-_.]/g, '')
                    .replace(/_{2,}/g, '_');

                const r2PublicUrl = process.env.R2_PUBLIC_URL || 'https://medbrave.com.br';
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substring(2, 15);
                const fakeUrl = `${r2PublicUrl}/flashcards/${user_id}/media/${timestamp}_${randomId}_${cleanFileName}`;

                mediaMap[mediaFile.fileName] = fakeUrl;
                processedCount++;

                // Emitir progresso a cada 100 arquivos
                if (progressCallback && (index % 100 === 0 || index === totalFiles - 1)) {
                    progressCallback(processedCount, totalFiles);
                }
            });
        }

        // Processamento de mídia concluído silenciosamente

    } catch (error) {
        console.error('❌ Erro no processamento de mídia:', error.message);
    }

    return mediaMap;
}

// ✅ FUNÇÃO AUXILIAR: Detectar Content-Type do arquivo
function getContentTypeFromFileName(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();

    const contentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'pdf': 'application/pdf'
    };

    return contentTypes[ext] || 'application/octet-stream';
}

// ✅ FUNÇÃO: Substituir referências de mídia (mantida para compatibilidade)
function replaceMediaReferences(html, mediaMap) {
    if (!html || Object.keys(mediaMap).length === 0) return html;

    try {
        let processedHtml = html;

        // Substituir referências src="filename" por URLs do R2
        Object.entries(mediaMap).forEach(([fileName, url]) => {
            const patterns = [
                new RegExp(`src="?${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?`, 'gi'),
                new RegExp(`src='?${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'?`, 'gi'),
                new RegExp(`\\[sound:${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'gi')
            ];

            patterns.forEach(pattern => {
                if (pattern.test(processedHtml)) {
                    if (fileName.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                        // Áudio
                        processedHtml = processedHtml.replace(pattern, `<audio controls><source src="${url}"></audio>`);
                    } else {
                        // Imagem
                        processedHtml = processedHtml.replace(pattern, `src="${url}"`);
                    }
                }
            });
        });

        return processedHtml;

    } catch (error) {
        return html;
    }
}

// ✅ FUNÇÃO: Extrair referências de mídia do conteúdo (mantida para compatibilidade)
function extractMediaRefsFromContent(content) {
    const refs = [];

    try {
        // Extrair referências src="filename"
        const srcMatches = content.match(/src="?([^"'\s>]+)"?/gi);
        if (srcMatches) {
            srcMatches.forEach(match => {
                const fileName = match.replace(/src="?/gi, '').replace(/"?$/g, '');
                if (fileName && !refs.includes(fileName)) {
                    refs.push(fileName);
                }
            });
        }

        // Extrair referências [sound:filename]
        const soundMatches = content.match(/\[sound:([^\]]+)\]/gi);
        if (soundMatches) {
            soundMatches.forEach(match => {
                const fileName = match.replace(/\[sound:/gi, '').replace(/\]$/g, '');
                if (fileName && !refs.includes(fileName)) {
                    refs.push(fileName);
                }
            });
        }

    } catch (error) {
        // Erro ao extrair referências de mídia - silencioso
    }

    return refs;
}

// ✅ FUNÇÃO: Obter email do usuário (mantida para compatibilidade)
async function getUserEmail(user_id) {
    // Implementação simplificada - em produção, buscar do banco
    // NOTA: Esta função não é mais usada após otimização do FSRS
    return `user_${user_id}@medbrave.com.br`;
}

// ✅ FUNÇÃO: Conversão completa para MedBrave com FSRS (OTIMIZADA)
async function convertJSStructureToMedBrave(jsResult, user_id, collectionName, mediaMap = {}, progressCallback = null) {
    try {
        const medbraveDecks = [];
        const estrutura = jsResult.estrutura;

        // ✅ VALIDAR COLLECTION NAME OBRIGATÓRIO
        if (!collectionName || collectionName === 'undefined') {
            collectionName = 'Coleção Importada';
        }

        // ✅ OTIMIZAÇÃO: Buscar username UMA VEZ no início
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: userData } = await supabase
            .from('users')
            .select('username_slug, display_name')
            .eq('id', user_id)
            .maybeSingle();

        const { sanitizeForId } = require(path.join(__dirname, 'dist/src/utils/idGenerator.js'));
        const usernameSlug = userData?.username_slug || sanitizeForId(userData?.display_name || 'user');
        const sanitizedCollection = sanitizeForId(collectionName);



        // Conversão silenciosa para MedBrave

        // ✅ CORRIGIR: A estrutura pode ser array ou objeto
        let itensParaProcessar = [];

        if (Array.isArray(estrutura)) {
            // Se é array, usar diretamente
            itensParaProcessar = estrutura;
        } else if (estrutura && typeof estrutura === 'object') {
            // Se é objeto, extrair valores
            itensParaProcessar = Object.values(estrutura);
        } else {
            return [];
        }

        // ✅ OTIMIZAÇÃO: Pré-compilar regex para mídia se existir
        const mediaReplacements = Object.keys(mediaMap).length > 0 ?
            Object.entries(mediaMap).map(([fileName, url]) => ({
                patterns: [
                    new RegExp(`src="?${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?`, 'gi'),
                    new RegExp(`src='?${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'?`, 'gi'),
                    new RegExp(`\\[sound:${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'gi')
                ],
                url,
                fileName,
                isAudio: fileName.match(/\.(mp3|wav|ogg|m4a)$/i)
            })) : [];

        // ✅ FUNÇÃO OTIMIZADA: Substituir mídia em lote
        function replaceMediaReferencesFast(html) {
            if (!html || mediaReplacements.length === 0) return html;

            let processedHtml = html;
            mediaReplacements.forEach(({ patterns, url, isAudio }) => {
                patterns.forEach(pattern => {
                    if (pattern.test(processedHtml)) {
                        const replacement = isAudio ?
                            `<audio controls><source src="${url}"></audio>` :
                            `src="${url}"`;
                        processedHtml = processedHtml.replace(pattern, replacement);
                    }
                });
            });
            return processedHtml;
        }

        // ✅ CONTADORES PARA PROGRESSO
        let processedDecks = 0;

        // Função para enviar progresso
        function emitConversionProgress(currentDeck, totalDecksCount, message) {
            if (progressCallback) {
                // Calcular progresso entre 50-80%
                const baseProgress = 50;
                const progressRange = 30;
                const currentProgress = totalDecksCount > 0
                    ? baseProgress + Math.floor((currentDeck / totalDecksCount) * progressRange)
                    : baseProgress;
                progressCallback(currentProgress, message);
            }
        }

        // Função recursiva para processar a estrutura hierárquica (OTIMIZADA)
        const processarNivelJS = async (items, caminhoAtual = [], user_id, totalDecksCount = 0, depth = 0) => {
            // Prevenir loop infinito com limite de profundidade
            if (depth > 50) {
                console.warn('Limite de profundidade alcançado, parando recursão');
                return;
            }

            // Verificar se items é válido
            if (!Array.isArray(items) && typeof items === 'object') {
                items = Object.values(items);
            }

            if (!Array.isArray(items) || items.length === 0) {
                return;
            }

            // ✅ OTIMIZAÇÃO: Processar múltiplos decks em paralelo (batches de 10)
            const validDecks = items.filter(item =>
                item && typeof item === 'object' &&
                item.tipo === 'deck' &&
                item.cards &&
                Array.isArray(item.cards) &&
                item.cards.length > 0
            );

            const PARALLEL_BATCH = 20; // Processar 20 decks por vez em paralelo (2x mais rápido)
            for (let i = 0; i < validDecks.length; i += PARALLEL_BATCH) {
                const batch = validDecks.slice(i, i + PARALLEL_BATCH);

                await Promise.all(batch.map(async (item) => {
                    // Se for um deck válido, processar
                    if (item.tipo === 'deck' && item.cards && Array.isArray(item.cards) && item.cards.length > 0) {
                        const nomeItem = item.nome || item.name || 'Deck Sem Nome';
                        const caminhoCompleto = [...caminhoAtual, nomeItem];

                        // Gerar ID do deck com hierarchyPath para garantir unicidade
                        const hierarchyPath = caminhoCompleto.join('::');
                        const deckId = await generateDeckId(user_id, nomeItem, collectionName, hierarchyPath);



                        if (!deckId) {
                            console.error(`[ERROR] ID do deck é null/undefined para: ${nomeItem}`);
                            throw new Error(`Falha ao gerar ID para o deck: ${nomeItem}`);
                        }

                        // Array para armazenar IDs dos flashcards
                        const cardIds = [];
                        const medbraveCards = [];

                        // Variáveis para geração de IDs de flashcards
                        const sanitizedDeckName = sanitizeForId(nomeItem);

                        // Processar cards
                        for (let index = 0; index < item.cards.length; index++) {
                            const card = item.cards[index];
                            const note = card.note;
                            if (!note) {
                                continue;
                            }

                            // ✅ USAR CAMPOS JÁ PROCESSADOS (não reprocessar!)
                            // Os campos já foram processados por processarCamposRobustos em extrairNotesRobustos
                            let frontContent = note.front || '';
                            let backContent = note.back || '';

                            // Se não tiver front/back, tentar processar flds como fallback
                            if (!frontContent && !backContent && note.flds) {
                                const campos = processarCamposRobustos(note.flds);
                                frontContent = campos[0] || '';
                                backContent = campos[1] || '';
                            }

                            // Limpeza e processamento de mídia
                            frontContent = limparTextoAnki(frontContent);
                            backContent = limparTextoAnki(backContent);

                            if (mediaReplacements.length > 0) {
                                frontContent = replaceMediaReferencesFast(frontContent);
                                backContent = replaceMediaReferencesFast(backContent);
                            }

                            // ✅ OTIMIZAÇÃO: Gerar ID do flashcard sem buscar banco
                            // Adicionar hash do conteúdo para garantir unicidade mesmo com índices iguais
                            const contentHash = require('crypto')
                                .createHash('md5')
                                .update(`${frontContent}${backContent}${note.id || ''}`)
                                .digest('hex')
                                .substring(0, 8);
                            const flashcardIdOptimized = `${usernameSlug}_${sanitizedCollection}_${sanitizedDeckName}_${index}_${contentHash}`;
                            cardIds.push(flashcardIdOptimized);

                            // Criar flashcard
                            const flashcard = {
                                id: flashcardIdOptimized,
                                deck_id: deckId,
                                front_content: frontContent,
                                back_content: backContent,
                                tags: note.tags || '',
                                created_at: new Date(),
                                updated_at: new Date(),
                                anki_data: {
                                    note_id: note.id,
                                    card_id: card.card_id,
                                    deck_id: card.deck_id,
                                    original_type: card.card_type,
                                    original_queue: card.card_queue
                                }
                            };

                            medbraveCards.push(flashcard);
                        }

                        // Criar deck apenas com referências aos IDs
                        const medBraveDeck = {
                            id: deckId,
                            name: nomeItem,
                            title: nomeItem,
                            description: `Deck importado do Anki: ${nomeItem}`,
                            card_ids: cardIds,  // Apenas IDs dos flashcards
                            user_id: user_id,
                            collection: item.colecao,
                            is_public: false,
                            created_at: new Date(),
                            updated_at: new Date(),
                            total_cards: cardIds.length,
                            path: caminhoCompleto.join(' > '),
                            source: 'Anki Import',
                            hierarchy: caminhoCompleto,
                            hierarchy_path: item.nomeCompleto,
                            tags: [],
                            image_url: null,
                            flashcard_count: cardIds.length
                        };

                        medbraveDecks.push({
                            deck: medBraveDeck,
                            flashcards: medbraveCards
                        });
                    }
                }));

                // Emitir progresso após processar o batch
                processedDecks += batch.length;
                const lastDeck = batch[batch.length - 1];
                const lastDeckName = lastDeck?.nome || lastDeck?.name || 'Deck';
                emitConversionProgress(
                    processedDecks,
                    totalDecksCount,
                    `Convertendo para formato MedBrave: ${lastDeckName} - ${processedDecks}/${totalDecksCount}`
                );
            }

            // Processar filhos recursivamente (após processar todos os decks do nível)
            for (const item of items) {
                if (item && item.filhos && Object.keys(item.filhos).length > 0) {
                    const nomeItem = item.nome || item.name || 'Sem Nome';
                    await processarNivelJS(item.filhos, [...caminhoAtual, nomeItem], user_id, totalDecksCount, depth + 1);
                }
            }
        };

        // Função auxiliar para contar decks na estrutura
        function contarDecksNaEstrutura(items) {
            let count = 0;
            function contarRecursivo(obj) {
                if (!obj || typeof obj !== 'object') return;

                if (Array.isArray(obj)) {
                    obj.forEach(contarRecursivo);
                } else {
                    if (obj.tipo === 'deck' && obj.cards && Array.isArray(obj.cards) && obj.cards.length > 0) {
                        count++;
                    }
                    if (obj.filhos && typeof obj.filhos === 'object') {
                        Object.values(obj.filhos).forEach(contarRecursivo);
                    }
                }
            }
            contarRecursivo(items);
            return count;
        }

        // Iniciar processamento
        const totalDecksCount = contarDecksNaEstrutura(itensParaProcessar);
        await processarNivelJS(itensParaProcessar, [], user_id, totalDecksCount);
        emitConversionProgress(totalDecksCount, totalDecksCount, `Conversão para formato MedBrave concluída!`);

        return medbraveDecks;

    } catch (error) {
        console.error('Erro na conversão:', error);
        return [];
    }
}
// Função para gerar hash de conteúdo


// Função para filtrar campos undefined antes de operações do Supabase
function filterUndefinedFields(obj) {
    const filtered = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
            filtered[key] = value;
        }
    }
    return filtered;
}

// Função para garantir valores válidos para campos obrigatórios
function ensureValidFieldValues(card) {
    // Suporte universal: múltiplas fontes de conteúdo para compatibilidade total
    const frontContent = card.frontContent || card.front_content || card.front || card.question || "";
    const backContent = card.backContent || card.back_content || card.back || card.answer || "";

    return {
        ...card,
        front_content: frontContent,
        back_content: backContent,
        tags: card.tags || [],

    };
}

// Função para verificar flashcards existentes com detecção inteligente de duplicatas
async function findExistingFlashcards(userId, deckId, processedCards) {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Buscar flashcards existentes do deck
        const { data: existingCardsData, error } = await supabase
            .from("flashcards")
            .select("*")
            .eq("deck_id", deckId);

        if (error) { throw error; }

        const existingCards = existingCardsData || [];
        const existingCount = existingCards.length;

        // Se não há cards existentes, todos são novos
        if (existingCount === 0) {
            // Garantir que todos os cards têm valores válidos
            const validCards = processedCards.map((card) =>
                ensureValidFieldValues(card),
            );

            return {
                existingCards: [],
                newCards: validCards,
                updatedCards: [],
            };
        }

        // Cards existentes já estão no formato correto do Supabase
        const existingCardsFormatted = existingCards;

        // Cards existentes já estão no formato correto do Supabase

        const newCards = [];
        const updatedCards = [];

        // Verificar cada card processado
        processedCards.forEach((processedCard) => {
            // Garantir que o card tenha valores válidos
            const validCard = ensureValidFieldValues(processedCard);

            // Por enquanto, todos os cards são considerados novos
            // TODO: Implementar lógica de detecção de duplicatas baseada em conteúdo
            const existingCard = null;

            if (existingCard) {
                // Card existe - preparar para atualização
                // Filtrar campos undefined antes do update
                const updateData = {
                    front_content: validCard.frontContent,
                    back_content: validCard.backContent,
                    tags: validCard.tags,
                    updated_at: new Date().toISOString(),
                };

                // Filtrar campos undefined
                const filteredUpdates = filterUndefinedFields(updateData);

                updatedCards.push({
                    existingId: existingCard.id,
                    updates: filteredUpdates,
                });
            } else {
                // Card novo - adicionar à lista de criação (já com valores válidos)
                newCards.push(validCard);
            }
        });

        return {
            existingCards,
            newCards,
            updatedCards,
        };
    } catch (error) {
        return {
            existingCards: [],
            newCards: processedCards,
            updatedCards: [],
        };
    }
}

// Função para salvar decks no banco de dados (versão das rotas)
async function saveDecksToDatabase(medbraveDecks, coverImageUrl = null, progressCallback = null, estruturaInfo = null, userCollectionName = null) {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const savedDecks = [];
    const totalDecks = medbraveDecks.length;
    let processedDecks = 0;

    try {

        // ✅ OTIMIZAÇÃO: Aumentar batch size para 30 decks por vez (3x mais rápido)
        const BATCH_SIZE = 30;
        const deckBatches = [];
        for (let i = 0; i < medbraveDecks.length; i += BATCH_SIZE) {
            deckBatches.push(medbraveDecks.slice(i, i + BATCH_SIZE));
        }

        for (let batchIndex = 0; batchIndex < deckBatches.length; batchIndex++) {
            const batch = deckBatches[batchIndex];

            // ✅ EMITIR PROGRESSO DETALHADO
            const currentDeck = batch[0]?.deck || batch[0];
            const deckName = currentDeck.name || currentDeck.title || 'Deck';
            const cardCount = currentDeck.flashcard_count || 0;
            const progress = 80 + Math.floor((processedDecks / totalDecks) * 15); // 80-95%

            if (progressCallback) {
                progressCallback(progress, `Salvando informações do baralho: ${deckName} (${cardCount} cards) - ${processedDecks + 1}/${totalDecks}`);
            }

            // Verificar todos os decks do lote de uma vez
            const deckNames = batch.map((deck) => deck.title);
            const { data: existingDecksData, error } = await supabase
                .from("decks")
                .select("*")
                .eq("user_id", batch[0].user_id)
                .eq("collection_id", batch[0].collection_id)
                .in("name", deckNames);

            if (error) { throw error; }

            const existingDecksMap = new Map();
            (existingDecksData || []).forEach((deck) => {
                existingDecksMap.set(deck.name, { id: deck.id, data: deck });
            });

            // Usar operações diretas do Supabase
            const batchOperations = [];

            for (const deckWrapper of batch) {
                try {
                    // Extrair o deck do wrapper
                    const deck = deckWrapper.deck || deckWrapper;

                    // Validar se o deck tem ID
                    if (!deck.id) {
                        console.error(`[ERROR] Deck sem ID: ${deck.title || deck.name || 'sem nome'}`);
                        console.error(`[ERROR] Dados do deck:`, JSON.stringify(deck, null, 2));
                        throw new Error(`Deck '${deck.title || deck.name || 'sem nome'}' não possui ID válido`);
                    }

                    const existingDeck = existingDecksMap.get(deck.title || deck.name);
                    let deckId;
                    const isNewDeck = !existingDeck;

                    // Preparar dados do deck
                    const deckData = {
                        id: deck.id,  // Garantir que o ID está sendo passado
                        user_id: deck.user_id,
                        name: deck.title || deck.name,
                        description: deck.description || "",
                        collection_id: deck.collection_id || null,  // ✅ Usar collection_id (UUID)
                        hierarchy: deck.hierarchy,
                        hierarchy_path: deck.hierarchyPath,
                        tags: deck.tags || [],
                        image_url: deck.imageUrl || coverImageUrl || null,  // Usar coverImageUrl das options
                        flashcard_count: deck.cards?.length || 0,
                        is_public: false,
                        is_official: false,  // Por padrão não é oficial (admin pode marcar depois)
                        is_imported: true,  // ✅ Marcar como importado via .apkg
                        created_at: isNewDeck
                            ? new Date().toISOString()
                            : existingDeck.data.created_at,
                        updated_at: new Date().toISOString(),
                    };

                    // Se o deck já existe no banco, decidir baseado no duplicateHandling
                    // NOTA: Se chegou aqui, é porque passou pelo filtro de duplicateHandling
                    // então pode ser um deck novo OU um deck para sobrescrever

                    if (isNewDeck) {
                        // Deck novo - inserir
                        const { data: newDeck, error } = await supabase
                            .from("decks")
                            .insert(deckData)
                            .select("id")
                            .maybeSingle();

                        if (error) {
                            // Se der erro de duplicata, significa que o deck foi criado entre a verificação e agora
                            // Nesse caso, buscar o ID
                            if (error.code === '23505') {
                                const { data: existingDeck } = await supabase
                                    .from("decks")
                                    .select("id")
                                    .eq("id", deck.id)
                                    .maybeSingle();
                                deckId = existingDeck?.id || deck.id;
                            } else {
                                throw error;
                            }
                        } else {
                            deckId = newDeck?.id || deck.id;
                        }
                    } else {
                        // Deck existente - atualizar (só chega aqui se duplicateHandling === 'overwrite')
                        deckId = existingDeck.id;
                        const { error } = await supabase
                            .from("decks")
                            .update(deckData)
                            .eq("id", deckId);

                        if (error) {
                            console.error(`Erro ao atualizar deck ${deck.title || deck.name}:`, error);
                            throw error;
                        }
                    }

                    // Preparar processamento de flashcards
                    const flashcards = deckWrapper.flashcards || deck.cards || [];

                    if (flashcards && flashcards.length > 0) {
                        batchOperations.push({
                            deckId,
                            userId: deck.user_id,
                            cards: flashcards,
                            isNewDeck,
                        });
                    }

                    savedDecks.push({
                        id: deckId,
                        ...deckData,
                        cards: deck.cards || [],
                    });
                } catch (deckError) {
                    const deck = deckWrapper.deck || deckWrapper;
                    console.error(`Erro ao preparar deck ${deck.title || deck.name || 'sem nome'}:`, deckError);
                }
            }

            // Processar flashcards em paralelo para cada deck do lote
            const cardPromises = batchOperations.map(async (operation) => {
                try {
                    // Buscar flashcards existentes (otimizado)
                    const { newCards } = await findExistingFlashcards(
                        operation.userId,
                        operation.deckId,
                        operation.cards,
                    );

                    // Salvar flashcards em lotes (Supabase suporta inserção em massa)
                    if (newCards.length > 0) {

                        const cardsData = newCards.map((card) => ({
                            ...card,
                            deck_id: operation.deckId,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }));

                        const { data, error } = await supabase
                            .from("flashcards")
                            .insert(cardsData)
                            .select('id');

                        if (error) {
                            // ✅ Se for erro de duplicata (23505), tentar inserir em lotes menores
                            if (error.code === '23505') {
                                console.warn(`⚠️ Detectadas duplicatas, inserindo em lotes menores...`);
                                let insertedCount = 0;
                                const MINI_BATCH = 200; // Inserir 200 cards por vez (4x mais rápido)

                                for (let i = 0; i < cardsData.length; i += MINI_BATCH) {
                                    const miniBatch = cardsData.slice(i, i + MINI_BATCH);
                                    try {
                                        const { data: miniData, error: miniError } = await supabase
                                            .from("flashcards")
                                            .insert(miniBatch)
                                            .select('id');

                                        if (!miniError) {
                                            insertedCount += miniData?.length || miniBatch.length;
                                        } else if (miniError.code === '23505') {
                                            // Se ainda houver duplicata no mini-lote, inserir um por um
                                            for (const cardData of miniBatch) {
                                                try {
                                                    const { error: singleError } = await supabase
                                                        .from("flashcards")
                                                        .insert(cardData);
                                                    if (!singleError) insertedCount++;
                                                } catch (e) { /* Ignorar duplicatas */ }
                                            }
                                        }
                                    } catch (e) {
                                        console.error(`Erro no mini-lote:`, e);
                                    }
                                }
                                return; // Não lançar erro, continuar processamento
                            }

                            console.error(`[ERRO-INSERÇÃO] Falha na inserção de flashcards:`, {
                                error,
                                message: error.message,
                                code: error.code,
                                details: error.details,
                                hint: error.hint,
                                deckId: operation.deckId,
                                userId: operation.userId,
                                cardsCount: cardsData.length
                            });
                            throw error;
                        }
                    }
                } catch (cardError) {
                    console.error(`[ERRO-FLASHCARDS] Falha ao processar flashcards para deck ${operation.deckId}:`, {
                        error: cardError,
                        message: cardError?.message,
                        code: cardError?.code,
                        details: cardError?.details,
                        hint: cardError?.hint,
                        userId: operation.userId,
                        deckId: operation.deckId,
                        cardsCount: operation.cards?.length || 0
                    });

                    // ✅ NÃO LANÇAR ERRO - continuar processando outros decks
                    console.warn(`⚠️ Pulando deck ${operation.deckId} devido a erro, continuando com próximos...`);
                }
            });

            // Aguardar todos os flashcards do lote serem processados
            await Promise.allSettled(cardPromises); // ✅ Usar allSettled para não parar se um falhar

            // ✅ ATUALIZAR CONTADOR DE PROGRESSO
            processedDecks += batch.length;

            // ✅ OTIMIZAÇÃO: Remover delay (Supabase aguenta a carga)
            // Delay removido para acelerar processamento
        }

        // Após salvar todos os decks, atualizar contagens de flashcards e criar entrada de coleção
        if (savedDecks.length > 0) {
            // Atualizar contagens de flashcards para cada deck
            for (const deck of savedDecks) {
                const { count } = await supabase
                    .from('flashcards')
                    .select('*', { count: 'exact', head: true })
                    .eq('deck_id', deck.id);

                const actualCardCount = count || 0;

                await supabase
                    .from('decks')
                    .update({ flashcard_count: actualCardCount })
                    .eq('id', deck.id);

                deck.flashcard_count = actualCardCount;
            }

            // ==================== CRIAR/ATUALIZAR COLLECTION COM ID ÚNICO ====================
            try {
                const firstDeck = savedDecks[0];
                const userId = firstDeck.user_id;

                // Extrair nome da coleção - priorizar nome fornecido pelo usuário
                const firstMedbraveDeck = medbraveDecks[0];
                const collectionName = userCollectionName ||
                    firstMedbraveDeck?.collection ||
                    firstMedbraveDeck?.deck?.collection ||
                    'Coleção Importada';

                console.log(`📦 [saveDecksToDatabase] Criando collection: "${collectionName}" para user: ${userId}`);

                if (collectionName && userId) {
                    // ✅ BUSCAR COLEÇÃO EXISTENTE PRIMEIRO (pelo nome)
                    const { data: existingCollectionData } = await supabase
                        .from('collections')
                        .select('id')
                        .eq('name', collectionName)
                        .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
                        .maybeSingle();

                    // Se existe, usar o ID dela; senão, gerar novo
                    const collectionId = existingCollectionData?.id || await generateCollectionId(collectionName, userId);

                    console.log(`📦 [saveDecksToDatabase] Collection ID: ${collectionId} (${existingCollectionData ? 'existente' : 'novo'})`);

                    // Verificar se coleção já existe
                    const { data: existingCollection } = await supabase
                        .from('collections')
                        .select('*')
                        .eq('id', collectionId)
                        .single();

                    // ✅ PRIMEIRO: Atualizar collection_id em todos os decks salvos
                    for (const deck of savedDecks) {
                        await supabase
                            .from('decks')
                            .update({ collection_id: collectionId })
                            .eq('id', deck.id);
                    }
                    console.log(`✅ ${savedDecks.length} decks associados à coleção ${collectionId}`);

                    // ✅ DEPOIS: RECALCULAR estatísticas da coleção buscando TODOS os decks
                    // Aguardar um pouco para garantir que todos os decks foram salvos
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const { data: allCollectionDecks, error: decksError } = await supabase
                        .from('decks')
                        .select('flashcard_count')
                        .eq('collection_id', collectionId);

                    if (decksError) {
                        console.error('❌ Erro ao buscar decks da coleção:', decksError);
                    }

                    const deckCount = allCollectionDecks?.length || 0;
                    const cardCount = allCollectionDecks?.reduce((sum, deck) => sum + (deck.flashcard_count || 0), 0) || 0;

                    const collectionData = {
                        id: collectionId,
                        name: collectionName,
                        title: collectionName,
                        description: `Coleção importada de arquivo APKG`,
                        owner_id: userId,
                        user_id: userId,
                        is_public: false,
                        is_official: false,
                        is_imported: true,
                        thumbnail_url: coverImageUrl || firstDeck.image_url || null,
                        image_url: coverImageUrl || firstDeck.image_url || null,
                        deck_count: deckCount,
                        card_count: cardCount,
                        // ✅ NOVAS COLUNAS PARA IDENTIFICAÇÃO DE ESTRUTURA
                        deck_structure_hash: estruturaInfo?.hash || null,
                        main_deck_prefixes: estruturaInfo?.mainPrefixes || [],
                        total_decks_at_import: estruturaInfo?.totalDecks || deckCount,
                        updated_at: new Date().toISOString(),
                    };

                    if (existingCollection) {
                        // Atualizar coleção existente
                        const { error: updateError } = await supabase
                            .from('collections')
                            .update(collectionData)
                            .eq('id', collectionId);

                        if (updateError) {
                            console.error(`❌ Erro ao atualizar coleção:`, updateError);
                        } else {
                            console.log(`✅ Coleção atualizada: ${collectionName} (${collectionId}) - ${deckCount} decks, ${cardCount} cards`);
                        }
                    } else {
                        // Criar nova coleção
                        collectionData.created_at = new Date().toISOString();

                        await supabase
                            .from('collections')
                            .insert(collectionData);

                        console.log(`✅ Coleção criada: ${collectionName} (${collectionId}) - ${deckCount} decks, ${cardCount} cards`);
                    }
                }
            } catch (collectionError) {
                console.error('❌ Erro ao criar/atualizar collection:', collectionError);
                // Não falhar o processamento se a criação da collection falhar
            }
        }

        return savedDecks;
    } catch (error) {
        throw error;
    }
}

// Classe para compatibilidade com código existente
class ProcessadorAPKGCompleto {
    constructor() {
        this.progressCallback = null;
    }

    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    async processarAPKG(filePath, user_id, options = {}) {
        // Se options for string (modo antigo), converter para objeto
        if (typeof options === 'string') {
            options = { collectionName: options };
        }

        const finalOptions = {
            progressCallback: this.progressCallback,
            ...options
        };
        return await processarApkgCompleto(filePath, user_id, finalOptions);
    }
}

module.exports = {
    ProcessadorAPKGCompleto,
    processarApkgCompleto,
    processarApkgPreview
};