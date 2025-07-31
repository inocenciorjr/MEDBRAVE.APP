import { Router } from 'express';
const multer = require('multer');
import * as path from 'path';
import * as fs from 'fs';

import { authMiddleware } from '../../../../domain/auth/middleware/auth.middleware';

import { r2Service } from '../../../../services/r2Service';

import { performanceMonitor } from '../../../../utils/performanceMonitor';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { firestore } from '../../../../config/firebaseAdmin';

// Garantir que o diretório de uploads existe
const uploadDir = path.join(__dirname, '../../../../../uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `apkg-${uniqueSuffix}${ext}`);
  }
});

// Configuração robusta do multer para arquivos muito grandes
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max (aumentado para 1GB)
    files: 1, // Apenas um arquivo por vez
    fieldSize: 1024 * 1024 * 1024, // 1GB para campos
    fieldNameSize: 1000, // Tamanho máximo do nome do campo
    fields: 50, // Número máximo de campos não-arquivo
    parts: 5000, // Número máximo de partes (aumentado)
    headerPairs: 2000 // Número máximo de pares de header
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // Verificar extensão do arquivo
    const allowedExtensions = ['.apkg', '.colpkg'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .apkg e .colpkg são permitidos'));
    }
  },
  // Configurações adicionais para melhor performance com arquivos grandes
  preservePath: false,
  dest: uploadDir
});

// Estender a interface Request para incluir o campo user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        [key: string]: any;
      };
    }
  }
}

const router = Router();



// Função para converter estrutura JS para formato MedBrave (OTIMIZADA)
async function convertJSStructureToMedBrave(jsResult: any, userId: string, collectionName: string): Promise<any[]> {
  try {
    const medbraveDecks: any[] = [];
    const estrutura = jsResult.estrutura;
    
    // ✅ CONTADORES PARA PROGRESSO
    let totalDecks = 0;
    let processedDecks = 0;
    
    // Função recursiva para processar a estrutura hierárquica (OTIMIZADA)
    const processarNivelJS = (obj: any, caminhoAtual: string[] = []): void => {
      Object.values(obj).forEach((item: any) => {
        // ✅ CONTAR DECKS PRIMEIRO
        if (item.cards && item.cards.length > 0) {
          totalDecks++;
        }
        
        if (item.cards && item.cards.length > 0) {
          // Este é um deck final com cards
          const caminhoCompleto = [...caminhoAtual, item.nome];
          processedDecks++;
          
          // Progresso silencioso
          
          const medbraveCards = item.cards.map((card: any, index: number) => {
            const note = card.note;
            if (!note) {
              return null;
            }
            
            // Extrair front e back do note
            const fields = note.flds ? note.flds.split('\x1f') : [];
            const front = fields[0] || '';
            const back = fields[1] || '';
                        
                        return {
                            front: front,
                            back: back,
              tags: note.tags ? note.tags.split(' ').filter((tag: string) => tag.trim()) : [],
                            difficulty: 1,
              originalAnkiCardId: card.card_id?.toString() || `card_${Date.now()}_${index}`,
              originalAnkiNoteId: card.note_id?.toString() || `note_${Date.now()}_${index}`,
              originalDeckId: card.deck_id?.toString() || `deck_${Date.now()}`,
                            contentHash: generateContentHash(front, back),
                            mediaRefs: []
                        };
          }).filter(Boolean); // Remove cards nulos

          if (medbraveCards.length > 0) {
                    medbraveDecks.push({
                        name: item.nome,
                        title: item.nome,
                        description: `Deck importado do Anki - ${caminhoCompleto.join(' → ')}`,
                        userId: userId,
                        collection: collectionName,
                        hierarchy: caminhoCompleto,
                        isPublic: false,
              tags: [collectionName, 'anki-import'],
                        flashcardCount: medbraveCards.length,
                        cards: medbraveCards,
                        originalDeckId: item.id?.toString(),
              originalFormat: 'apkg-js',
                        importedAt: new Date().toISOString(),
              createdAt: new Date(),
              updatedAt: new Date()
                    });
                    
            // Conversão silenciosa
          }
                }
                
        // Processar filhos recursivamente
                if (item.filhos && Object.keys(item.filhos).length > 0) {
          processarNivelJS(item.filhos, [...caminhoAtual, item.nome]);
                }
            });
        }

    // Iniciar conversão
    processarNivelJS(estrutura);
        
    return medbraveDecks;
    
  } catch (error) {
    throw error;
    }
}

// Função para processar e fazer upload de múltiplas mídias para R2 em paralelo
async function processBatchMediaFiles(mediaFiles: Array<{fileName: string, data: Buffer}>, userId: string): Promise<Record<string, string>> {
  try {
    
    // Preparar arquivos para upload em lote
    const filesForBatchUpload = mediaFiles.map(({ fileName, data }) => {
      // Detectar tipo de conteúdo baseado na extensão
      const ext = path.extname(fileName).toLowerCase();
      let contentType = 'application/octet-stream'; // Padrão
      
      // Mapear extensões comuns para tipos MIME
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.pdf': 'application/pdf',
        '.webm': 'video/webm'
      };
      
      if (ext in mimeTypes) {
        contentType = mimeTypes[ext];
      }
      
      return {
        fileData: data,
        filename: fileName,
        contentType
      };
    });
    
    // Upload em lote para R2
    const uploadResults = await r2Service.batchUploadFiles(
      filesForBatchUpload,
      `flashcards/${userId}/media`,
      {
        userId,
        source: 'anki-import',
        importedAt: new Date().toISOString()
      }
    );
    
    // Criar mapeamento de nomes de arquivo para URLs
    const mediaMap: Record<string, string> = {};
    uploadResults.forEach(result => {
      if (result.publicUrl) {
        mediaMap[result.filename] = result.publicUrl;
      }
    });
    
    return mediaMap;
  } catch (error) {
    return {};
  }
}

// Função para substituir referências de mídia no conteúdo HTML
function replaceMediaReferences(html: string, mediaMap: Record<string, string>): string {
  let updatedHtml = html;
  
  // Substituir referências de imagens
  Object.entries(mediaMap).forEach(([originalName, url]) => {
    // Substituir referências no formato src="nome_arquivo.jpg"
    const srcRegex = new RegExp(`src=["']${originalName}["']`, 'gi');
    updatedHtml = updatedHtml.replace(srcRegex, `src="${url}"`);
    
    // Substituir referências no formato src="nome_arquivo.jpg?12345"
    const srcWithParamsRegex = new RegExp(`src=["']${originalName}\\?[^"']*["']`, 'gi');
    updatedHtml = updatedHtml.replace(srcWithParamsRegex, `src="${url}"`);
    
    // Substituir referências no formato [sound:nome_arquivo.mp3]
    const soundRegex = new RegExp(`\\[sound:${originalName}\\]`, 'gi');
    updatedHtml = updatedHtml.replace(soundRegex, `<audio controls src="${url}"></audio>`);
  });
  
  return updatedHtml;
}

// Função para gerar hash de conteúdo único
function generateContentHash(front: string, back: string): string {
  return crypto.createHash('md5')
    .update(`${front}|${back}`)
    .digest('hex');
}

// Função para filtrar campos undefined antes de operações do Firestore
function filterUndefinedFields(obj: any): any {
  const filtered: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// Função para garantir valores válidos para campos obrigatórios
function ensureValidFieldValues(card: any): any {
  // ✅ SUPORTE UNIVERSAL: Múltiplas fontes de conteúdo para compatibilidade total
  const frontContent = card.frontContent || card.front || card.question || '';
  const backContent = card.backContent || card.back || card.answer || '';
  
  // Card sem conteúdo - processamento silencioso
  
  return {
    ...card,
    originalAnkiNoteId: card.originalAnkiNoteId || card.originalNoteId || card.ankiData?.noteId || `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalAnkiCardId: card.originalAnkiCardId || card.originalId || card.id || card.ankiData?.cardId || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalDeckId: card.originalDeckId || card.deckId || card.ankiData?.deckId || `deck_${Date.now()}`,
    frontContent: frontContent,
    backContent: backContent,
    tags: card.tags || [],
    mediaRefs: card.mediaRefs || [],
    order: card.order || 1,
    contentHash: card.contentHash || generateContentHash(frontContent, backContent),
    // ✅ PRESERVAR DADOS FSRS SE EXISTIREM
    fsrsData: card.fsrsData || (card.difficulty ? {
      state: card.state === 0 ? 'NEW' : card.state === 1 ? 'LEARNING' : card.state === 2 ? 'REVIEW' : 'NEW',
      stability: card.stability || 0,
      difficulty: card.difficulty || 5.0,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: card.reviewCount || 0,
      lapses: card.lapseCount || 0,
      last_review: card.lastReview || null,
      due: card.nextReview || new Date(),
      algorithm: 'FSRS v4.5'
    } : undefined)
  };
}

// Função para verificar flashcards existentes com detecção inteligente de duplicatas
async function findExistingFlashcards(userId: string, deckId: string, processedCards: any[]): Promise<{
  existingCards: any[];
  newCards: any[];
  updatedCards: any[];
}> {
  try {
    // ✅ OTIMIZAÇÃO: Buscar apenas contagem primeiro para evitar transferência desnecessária de dados
    const existingCardsCountQuery = await firestore.collection('flashcards')
      .where('userId', '==', userId)
      .where('deckId', '==', deckId)
      .select() // Buscar apenas IDs para contar
      .get();
    
    const existingCount = existingCardsCountQuery.size;
    
    // ✅ OTIMIZAÇÃO: Se não há cards existentes, todos são novos
    if (existingCount === 0) {
      
      // Garantir que todos os cards têm valores válidos
      const validCards = processedCards.map(card => ensureValidFieldValues(card));
      
      return {
        existingCards: [],
        newCards: validCards,
        updatedCards: []
      };
    }
    
    // ✅ OTIMIZAÇÃO: Só buscar dados completos se há cards existentes
    const existingCardsQuery = await firestore.collection('flashcards')
      .where('userId', '==', userId)
      .where('deckId', '==', deckId)
      .get();
    
    const existingCards = existingCardsQuery.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Criar mapas para busca rápida
    const existingByAnkiNoteId = new Map();
    const existingByAnkiCardId = new Map();
    const existingByContentHash = new Map();
    
    existingCards.forEach((card: any) => {
      if (card.originalAnkiNoteId) {
        existingByAnkiNoteId.set(card.originalAnkiNoteId, card);
      }
      if (card.originalAnkiCardId) {
        existingByAnkiCardId.set(card.originalAnkiCardId, card);
      }
      if (card.contentHash) {
        existingByContentHash.set(card.contentHash, card);
      }
    });
    
    const newCards: any[] = [];
    const updatedCards: any[] = [];
    
    // Verificar cada card processado
    processedCards.forEach((processedCard: any) => {
      // Garantir que o card tenha valores válidos
      const validCard = ensureValidFieldValues(processedCard);
      
      let existingCard = null;
      
      // Estratégia 1: Buscar por originalAnkiCardId (mais preciso)
      if (validCard.originalAnkiCardId) {
        existingCard = existingByAnkiCardId.get(validCard.originalAnkiCardId);
      }
      
      // Estratégia 2: Buscar por originalAnkiNoteId (caso o card tenha mudado)
      if (!existingCard && validCard.originalAnkiNoteId) {
        existingCard = existingByAnkiNoteId.get(validCard.originalAnkiNoteId);
      }
      
      // Estratégia 3: Buscar por hash do conteúdo (conteúdo idêntico)
      if (!existingCard && validCard.contentHash) {
        existingCard = existingByContentHash.get(validCard.contentHash);
      }
      
      if (existingCard) {
        // Card existe - preparar para atualização
        // ✅ CORREÇÃO CRÍTICA: Filtrar campos undefined antes do update
        const updateData = {
          frontContent: validCard.frontContent,
          backContent: validCard.backContent,
          contentHash: validCard.contentHash,
          originalAnkiNoteId: validCard.originalAnkiNoteId,
          originalAnkiCardId: validCard.originalAnkiCardId,
          order: validCard.order,
          tags: validCard.tags,
          mediaRefs: validCard.mediaRefs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Filtrar campos undefined
        const filteredUpdates = filterUndefinedFields(updateData);
        
        updatedCards.push({
          existingId: existingCard.id,
          updates: filteredUpdates
        });
      } else {
        // Card novo - adicionar à lista de criação (já com valores válidos)
        newCards.push(validCard);
      }
    });
    
          // Análise de flashcards concluída
    
    return {
      existingCards,
      newCards,
      updatedCards
    };
    
  } catch (error) {
    return {
      existingCards: [],
      newCards: processedCards,
      updatedCards: []
    };
  }
}

// Função para verificar se coleção já existe e implementar atualização incremental
async function checkExistingCollection(userId: string, collectionName: string, decks: any[]): Promise<{
  shouldUpdate: boolean;
  existingDecks: any[];
  newDecks: any[];
  action: 'create' | 'update' | 'merge';
}> {
  try {
    // Buscar decks existentes da mesma coleção
    const existingDecksQuery = await firestore.collection('decks')
      .where('userId', '==', userId)
      .where('collection', '==', collectionName)
      .get();
    
    const existingDecks = existingDecksQuery.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Decks existentes verificados
    
    if (existingDecks.length === 0) {
      return {
        shouldUpdate: false,
        existingDecks: [],
        newDecks: decks,
        action: 'create'
      };
    }
    
    // Comparar nomes dos decks para identificar novos vs existentes
    const existingDeckNames = new Set(existingDecks.map((deck: any) => deck.name || deck.title));
    const newDecks = decks.filter((deck: any) => !existingDeckNames.has(deck.title));
    
    // Análise da coleção concluída
    
    return {
      shouldUpdate: existingDecks.length > 0,
      existingDecks,
      newDecks,
      action: newDecks.length > 0 ? 'merge' : 'update'
    };
    
  } catch (error) {
    return {
      shouldUpdate: false,
      existingDecks: [],
      newDecks: decks,
      action: 'create'
    };
  }
}

// Função principal para processar o arquivo APKG em background
async function processApkgFile(filePath: string, userId: string, collectionName?: string): Promise<any> {
  return performanceMonitor.monitor('processApkgFile', async () => {
    // Iniciando processamento APKG COMPLETO
    
    try {
      // Detectar nome da coleção automaticamente se não fornecido
      const finalCollectionName = collectionName || extractCollectionFromApkg(null, [], filePath);
      
      // Usar o processador JavaScript que FUNCIONA
      const projectRoot = process.cwd();
const ProcessadorFuncionando = require(path.join(projectRoot, 'processador-apkg-completo.js')).ProcessadorAPKGCompleto;
      const processador = new ProcessadorFuncionando();
      
      // Callback de progresso para logs
      processador.setProgressCallback((_percent: number, _message: string) => {
                  // Progresso silencioso
      });
      
      // Processar arquivo com o processador que FUNCIONA
      const resultadoJS = await processador.processarAPKG(filePath, userId);
      
      // Converter estrutura extraída para formato MedBrave e salvar no banco
      const medbraveDecks = await convertJSStructureToMedBrave(resultadoJS.resultado, userId, finalCollectionName);
      
      // Salvar no banco
              const savedDecks = await saveDecksToDatabase(medbraveDecks);
      
      const resultado = {
        success: true,
        collection: finalCollectionName,
        decks: savedDecks,
        stats: resultadoJS.resultado?.stats || {}
      };
      
              // Processamento completo concluído
      
      // Retornar resultado direto
      return resultado;
      
    } catch (error: unknown) {
      // Limpar arquivo temporário em caso de erro
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      throw error;
    }
  });
}



// Função para extrair coleção automaticamente do arquivo APKG
function extractCollectionFromApkg(sqlHandler: any, decks: any[], filePath: string): string {
  try {
    // Estratégia 1: Buscar no banco SQLite a tabela "col" que contém metadados da coleção
    const db = sqlHandler.db;
    
    try {
      // A tabela "col" contém informações da coleção principal do Anki
      const colStmt = db.prepare("SELECT name FROM col LIMIT 1");
      if (colStmt.step()) {
        const colData = colStmt.getAsObject();
        colStmt.free();
        
        if (colData.name && colData.name.trim()) {
          return colData.name.trim();
        }
      }
      colStmt.free();
    } catch (e: any) {
      // Tabela 'col' não encontrada
    }
    
    // Estratégia 2: Extrair da estrutura hierárquica dos nomes dos decks
    if (decks && decks.length > 0) {
      const deckNames = decks.map((deck: any) => deck.name).filter(Boolean);
      
      // Procurar padrão comum no início dos nomes (ex: "REVALIDA::", "Flashcards Medspacy::")
      const hierarchicalPatterns = deckNames
        .map((name: string) => {
          const parts = name.split('::');
          return parts.length > 1 ? parts[0].trim() : null;
        })
        .filter(Boolean);
      
      if (hierarchicalPatterns.length > 0) {
        // Encontrar o padrão mais comum
        const patternCounts: Record<string, number> = {};
        hierarchicalPatterns.filter((pattern): pattern is string => Boolean(pattern)).forEach((pattern: string) => {
          patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
        });
        
        const mostCommonPattern = Object.keys(patternCounts).reduce((a: string, b: string) => 
          patternCounts[a] > patternCounts[b] ? a : b
        );
        
        return mostCommonPattern;
      }
      
      // Estratégia 3: Usar nome do primeiro deck se não houver hierarquia clara
      const firstDeckName = deckNames[0];
      if (firstDeckName) {
        return firstDeckName;
      }
    }
    
    // Estratégia 4: Usar nome do arquivo como fallback
    const fileName = path.basename(filePath, path.extname(filePath));
    const cleanFileName = fileName
      .replace(/^apkg-\d+-\d+$/, 'Coleção Importada')
      .replace(/[_-]/g, ' ')
      .trim();
    
    return cleanFileName || 'Coleção Importada';
    
  } catch (error) {
    return 'Coleção Importada';
  }
}

// Função aprimorada para salvar decks com detecção inteligente de duplicatas
async function saveDecksToDatabase(medbraveDecks: any[]): Promise<any[]> {
  const savedDecks = [];
  
  try {
    
    // ✅ OTIMIZAÇÃO 1: Processar decks em lotes de 5 para reduzir carga
    const BATCH_SIZE = 5;
    const deckBatches = [];
    for (let i = 0; i < medbraveDecks.length; i += BATCH_SIZE) {
      deckBatches.push(medbraveDecks.slice(i, i + BATCH_SIZE));
    }
    
    // Processando lotes de decks
    
    for (let batchIndex = 0; batchIndex < deckBatches.length; batchIndex++) {
      const batch = deckBatches[batchIndex];
      // Processando lote de decks
      
      // ✅ OTIMIZAÇÃO 2: Verificar todos os decks do lote de uma vez
      const deckNames = batch.map(deck => deck.title);
      const existingDecksQuery = await firestore.collection('decks')
        .where('userId', '==', batch[0].userId)
        .where('collection', '==', batch[0].collection)
        .where('name', 'in', deckNames)
        .get();
      
      const existingDecksMap = new Map();
      existingDecksQuery.docs.forEach(doc => {
        existingDecksMap.set(doc.data().name, { id: doc.id, data: doc.data() });
      });
      
      // ✅ OTIMIZAÇÃO 3: Usar batch operations do Firestore
      const firestoreBatch = firestore.batch();
      const batchOperations = [];
      
      for (const deck of batch) {
        try {
          const existingDeck = existingDecksMap.get(deck.title);
          let deckId: string;
          let isNewDeck = !existingDeck;
          
          // Preparar dados do deck
          const deckData = {
            userId: deck.userId,
            name: deck.title,
            description: deck.description || '',
            collection: deck.collection,
            hierarchy: deck.hierarchy,
            hierarchyPath: deck.hierarchyPath,
            tags: deck.tags || [],
            imageUrl: deck.imageUrl || null,
            flashcardCount: deck.cards?.length || 0,
            isPublic: false,
            isCollectionPublic: false,
            createdAt: isNewDeck ? admin.firestore.FieldValue.serverTimestamp() : existingDeck.data.createdAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          if (isNewDeck) {
            // Criar novo deck
            const deckRef = firestore.collection('decks').doc();
            deckId = deckRef.id;
            firestoreBatch.set(deckRef, deckData);
            // Novo deck preparado
          } else {
            // Atualizar deck existente
            deckId = existingDeck.id;
            const deckRef = firestore.collection('decks').doc(deckId);
            firestoreBatch.update(deckRef, deckData);
            // Deck atualizado preparado
          }
          
          // Preparar processamento de flashcards
          if (deck.cards && deck.cards.length > 0) {
            batchOperations.push({
              deckId,
              userId: deck.userId,
              cards: deck.cards,
              isNewDeck
            });
          }
          
          savedDecks.push({
            id: deckId,
            ...deckData,
            cards: deck.cards || []
          });
          
        } catch (deckError) {
          continue;
        }
      }
      
      // ✅ OTIMIZAÇÃO 4: Executar todas as operações de deck em uma única transação
      await firestoreBatch.commit();
      // Lote de decks salvo
      
      // ✅ OTIMIZAÇÃO 5: Processar flashcards em paralelo para cada deck do lote
      const cardPromises = batchOperations.map(async (operation) => {
        try {
          // Processando flashcards
          
          // Buscar flashcards existentes (otimizado)
          const { newCards } = await findExistingFlashcards(
            operation.userId, 
            operation.deckId, 
            operation.cards
          );
          
          // ✅ OTIMIZAÇÃO 6: Salvar flashcards em lotes de 500 (limite do Firestore)
          if (newCards.length > 0) {
            const CARD_BATCH_SIZE = 500;
            for (let i = 0; i < newCards.length; i += CARD_BATCH_SIZE) {
              const cardBatch = newCards.slice(i, i + CARD_BATCH_SIZE);
              const cardFirestoreBatch = firestore.batch();
              
              cardBatch.forEach((card: any) => {
                const cardData = {
                  ...card,
                  deckId: operation.deckId,
                  userId: operation.userId,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                
                const cardRef = firestore.collection('flashcards').doc();
                cardFirestoreBatch.set(cardRef, cardData);
              });
              
              await cardFirestoreBatch.commit();
              // Flashcards salvos
            }
          }
          
          // Novos flashcards salvos
          
                  } catch (cardError) {
            // Erro ao processar flashcards
          }
      });
      
      // Aguardar todos os flashcards do lote serem processados
      await Promise.all(cardPromises);
      // Lote completamente processado
      
      // ✅ PEQUENO DELAY para evitar throttling do Firestore
      if (batchIndex < deckBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Após salvar todos os decks, verificar se devemos criar entrada de coleção
    if (savedDecks.length > 0) {
      await createOrUpdateCollectionEntry(savedDecks);
    }
    
    return savedDecks;
    
  } catch (error) {
    throw error;
  }
}

// Nova função para criar/atualizar entrada de coleção
async function createOrUpdateCollectionEntry(decks: any[]): Promise<void> {
  if (!decks || decks.length === 0) return;
  
  const firstDeck = decks[0];
  const collectionName = firstDeck.collection;
  const userId = firstDeck.userId;
  
  try {
    // Verificar se coleção já existe
    const existingCollectionQuery = await firestore.collection('collections')
      .where('userId', '==', userId)
      .where('name', '==', collectionName)
      .limit(1)
      .get();
    
    const totalCards = decks.reduce((sum, deck) => sum + (deck.flashcardCount || 0), 0);
    const collectionData = {
      userId,
      name: collectionName,
      description: `Coleção importada com ${decks.length} decks e ${totalCards} flashcards`,
      deckCount: decks.length,
      cardCount: totalCards, // Campo esperado pela interface CollectionMetadata
      totalCards, // Manter para compatibilidade
      isPublic: false, // Por padrão, coleções são privadas
      createdAt: existingCollectionQuery.empty ? admin.firestore.FieldValue.serverTimestamp() : undefined,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (existingCollectionQuery.empty) {
      // Criar nova coleção
      await firestore.collection('collections').add(collectionData);
      // Nova coleção criada
    } else {
      // Atualizar coleção existente
      const existingCollection = existingCollectionQuery.docs[0];
      await existingCollection.ref.update({
        ...collectionData,
        createdAt: existingCollection.data().createdAt // Preservar data de criação
      });
      // Coleção atualizada
    }
    
    // Atualizar flag isCollectionPublic nos decks se a coleção for pública
    const collectionDoc = existingCollectionQuery.empty ? 
      null : existingCollectionQuery.docs[0];
    
    if (collectionDoc && collectionDoc.data().isPublic) {
      const batch = firestore.batch();
      for (const deck of decks) {
        const deckRef = firestore.collection('decks').doc(deck.id);
        batch.update(deckRef, { isCollectionPublic: true });
      }
      await batch.commit();
      // Decks marcados como parte de coleção pública
    }
    
  } catch (error) {
    // Erro ao criar/atualizar coleção
  }
}

// Rota para importar arquivo APKG
router.post('/import', authMiddleware, (req, res, next) => {
  
  // ✅ USAR EXATAMENTE O MESMO MIDDLEWARE DE UPLOAD QUE FUNCIONA NA ROTA ORIGINAL
  upload.single('apkgFile')(req, res, (err: any) => {
    if (err) {
      
      let errorMessage = 'Erro ao fazer upload do arquivo';
      let statusCode = 400;
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        errorMessage = 'Arquivo muito grande. O tamanho máximo permitido é 500MB.';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        errorMessage = 'Campo de arquivo inesperado. Use o campo "apkgFile".';
      } else if (err.message.includes('Unexpected end of form')) {
        errorMessage = 'Upload interrompido. Tente novamente com uma conexão mais estável.';
        statusCode = 408; // Request Timeout
      } else {
        errorMessage = err.message || 'Erro desconhecido no upload';
      }
      
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: err.message,
        code: err.code || 'UNKNOWN_ERROR'
      });
    }
    
    return next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }

    const filePath = req.file.path;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
    
    // Obter nome da coleção do formulário
    const collectionName = req.body.collectionName || 'Coleção Importada';
    
    // Iniciar o processamento em background de forma independente
    // Usar setImmediate para garantir que o processamento aconteça após a resposta
    setImmediate(async () => {
      const timeoutId = setTimeout(() => {
        // Timeout silencioso
      }, 5 * 60 * 1000); // 5 minutos de timeout
      
      try {
        await processApkgFile(filePath, userId, collectionName);
        clearTimeout(timeoutId);
      } catch (backgroundError) {
        clearTimeout(timeoutId);
        
        // FALLBACK FINAL: Se tudo falhar, criar pelo menos um deck vazio para não deixar o usuário sem nada
        try {
          
          const fallbackDeck = {
            userId: userId,
            name: `Importação APKG - ${new Date().toLocaleString()}`,
            description: `Arquivo APKG importado mas houve erro no processamento completo`,
            isPublic: false,
            tags: ['apkg', 'erro'],
            coverImageUrl: null,
            status: 'ACTIVE',
            flashcardCount: 0,
            collection: collectionName || 'Importação com Erro',
            hierarchy: [collectionName || 'Importação com Erro'],
            originalFormat: 'apkg-error',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          await firestore.collection('decks').add(fallbackDeck);
          
        } catch (fallbackError) {
          // Falha total
        }
      }
    });
    
    // Enviar resposta imediata ao cliente
    return res.status(200).json({
      success: true,
      message: 'Arquivo recebido e processamento iniciado. Os decks aparecerão em sua lista quando o processamento for concluído.',
      processing: true
    });
    
  } catch (error: unknown) {
    
    // Limpar arquivo temporário em caso de erro
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar arquivo APKG',
      error: errorMessage
    });
  }
});

// Rota para preview do arquivo APKG
router.post(
  '/preview-apkg',
  authMiddleware,
  upload.single('apkgFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Arquivo APKG é obrigatório' });
      }
      // Invocar processador completo para extrair dados brutos
      const projectRoot = process.cwd();
      const ProcessadorFuncionando = require(path.join(projectRoot, 'processador-apkg-completo.js')).ProcessadorAPKGCompleto;
      const processador = new ProcessadorFuncionando();
      const resultadoJS = await processador.processarAPKG(req.file.path, req.user!.id);
      const jsResult = resultadoJS.resultado;
      // Incluir metadados de nome e tamanho do arquivo
      const previewResult = {
        ...jsResult,
        fileName: req.file.originalname,
        fileSize: req.file.size
      };
      return res.json(previewResult);
    } catch (error: any) {
      console.error('Erro no preview APKG:', error);
      return res.status(500).json({ success: false, error: error.message });
    } finally {
      // Limpar arquivo temporário
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  }
);

// Exportar funções para uso na rota FSRS
export { 
  saveDecksToDatabase,
  checkExistingCollection,
  findExistingFlashcards,
  processBatchMediaFiles,
  replaceMediaReferences,
  generateContentHash,
  filterUndefinedFields,
  ensureValidFieldValues
};

export default router;