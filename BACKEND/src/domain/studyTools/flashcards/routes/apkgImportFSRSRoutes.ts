import { Router } from 'express';
const multer = require('multer');
import * as path from 'path';
import * as fs from 'fs';
import * as admin from 'firebase-admin';
import { authMiddleware } from '../../../../domain/auth/middleware/auth.middleware';
import { firestore } from '../../../../config/firebaseAdmin';
import { 
  saveDecksToDatabase,
  findExistingFlashcards,
  filterUndefinedFields,
  ensureValidFieldValues
} from './apkgImportRoutes';

// Sistema de progresso em memória para cada usuário
interface ProgressStep {
  timestamp: string;
  step: string;
  status: 'processing' | 'completed' | 'error' | 'warning';
  details?: string;
  progress?: number;
}

interface UserProgress {
  userId: string;
  steps: ProgressStep[];
  currentProgress: number;
  isActive: boolean;
  startTime: number;
  lastUpdate: number;
}

const userProgressMap = new Map<string, UserProgress>();

// Função para adicionar etapa de progresso
function addProgressStep(userId: string, step: string, status: 'processing' | 'completed' | 'error' | 'warning' = 'processing', details?: string, progress?: number) {
  const timestamp = new Date().toLocaleTimeString();
  
  if (!userProgressMap.has(userId)) {
    userProgressMap.set(userId, {
      userId,
      steps: [],
      currentProgress: 0,
      isActive: true,
      startTime: Date.now(),
      lastUpdate: Date.now()
    });
  }
  
  const userProgress = userProgressMap.get(userId)!;
  userProgress.steps.push({ timestamp, step, status, details, progress });
  if (progress !== undefined) {
    userProgress.currentProgress = progress;
  }
  userProgress.lastUpdate = Date.now();
  

}



// Função para limpar progresso antigo (mais de 30 minutos)
function cleanupOldProgress() {
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
  const entries = Array.from(userProgressMap.entries());
  for (let i = 0; i < entries.length; i++) {
    const [userId, progress] = entries[i];
    if (progress.lastUpdate < thirtyMinutesAgo) {
      userProgressMap.delete(userId);

    }
  }
}

// Limpar progresso antigo a cada 5 minutos
setInterval(cleanupOldProgress, 5 * 60 * 1000);



// Função para gerar mensagem final clara e útil
function generateFinalMessage(existingCheck: any, updateStats: any, _mediaFiles: string[], resultadoFSRS: any, collectionName: string): string {
  const action = existingCheck.action;
  // ✅ USAR CONTAGEM CORRETA DE MÍDIA
  const totalMediaInFile = resultadoFSRS.resultado?.stats?.mediaFilesFound || 0;
  const mediaProcessed = Object.keys(resultadoFSRS.resultado?.mediaMap || {}).length;
  
  let message = '';
  message += '='.repeat(45) + '\n';
  
  // ✅ TIPO DE OPERAÇÃO CLARA COM NOME DA COLEÇÃO
  if (action === 'create') {
    message += `NOVA COLEÇÃO CRIADA (${collectionName})\n`;
    message += `   • ${updateStats.newDecks} deck(s) importado(s)\n`;
    message += `   • ${updateStats.newCards || updateStats.totalCards} card(s) importado(s)\n`;
  }
  else if (action === 'merge') {
    message += `COLEÇÃO ATUALIZADA (${collectionName})\n`;
    // Mostrar breakdown detalhado para merge
    if (updateStats.newDecks > 0) {
      message += `   • ${updateStats.newDecks} deck(s) novos adicionados\n`;
    }
    if (existingCheck.existingDecks && existingCheck.existingDecks.length > 0) {
      message += `   • ${existingCheck.existingDecks.length} deck(s) já existentes ignorados\n`;
    }
    if (updateStats.newCards > 0) {
      message += `   • ${updateStats.newCards} card(s) novos adicionados\n`;
    }
    if (updateStats.existingCards > 0) {
      message += `   • ${updateStats.existingCards} card(s) já existentes ignorados\n`;
    }
  }
  else {
    message += `COLEÇÃO ATUALIZADA (${collectionName})\n`;
    message += `   • ${updateStats.updatedDecks} deck(s) atualizado(s)\n`;
    if (updateStats.newCards > 0) {
      message += `   • ${updateStats.newCards} card(s) novos adicionados\n`;
    }
  }
  
  // ✅ INFORMAÇÕES CORRETAS SOBRE MÍDIA
  if (totalMediaInFile > 0) {
    message += `MÍDIA PROCESSADA\n`;
    message += `   • ${totalMediaInFile} arquivo(s) de mídia encontrados e carregados\n`;
    
    // Mostrar falhas apenas se houver
    if (mediaProcessed < totalMediaInFile) {
      const failed = totalMediaInFile - mediaProcessed;
      message += `   • ${failed} arquivo(s) falharam no upload\n`;
    }
  } else {
    message += `SOMENTE TEXTO\n`;
    message += `   • Nenhum arquivo de mídia encontrado no APKG\n`;
  }
  
  message += '='.repeat(45);
  return message;
}

// Garantir que o diretório de uploads existe
const uploadDir = path.join(__dirname, '../../../../../uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer para upload de arquivos - IGUAL À ROTA ORIGINAL
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

// ✅ CONFIGURAÇÃO EXATA DA ROTA ORIGINAL QUE FUNCIONA
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





// ✅ USAR EXATAMENTE A MESMA ROTA DA ORIGINAL QUE FUNCIONA, APENAS ADICIONANDO FSRS
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
    
    // ✅ DEIXAR O PROCESSADOR DETECTAR AUTOMATICAMENTE A COLEÇÃO
    const collectionName = req.body.collectionName || null; // Não forçar nome padrão
    
    // Inicializar progresso do usuário
    addProgressStep(userId, 'Iniciando processamento FSRS', 'processing', undefined, 0);

    // ✅ USAR EXATAMENTE A MESMA ESTRATÉGIA DA ROTA ORIGINAL: PROCESSAMENTO EM BACKGROUND
    setImmediate(async () => {
      const timeoutId = setTimeout(() => {
        addProgressStep(userId, 'Timeout de processamento atingido', 'warning', 'Processamento pode ter sido concluído', 100);
        const userProgress = userProgressMap.get(userId);
        if (userProgress) {
          userProgress.isActive = false;
        }
      }, 15 * 60 * 1000); // ✅ AUMENTADO PARA 15 MINUTOS para arquivos grandes
      
      try {
        addProgressStep(userId, 'Analisando arquivo APKG', 'processing', undefined, 5);
        
        // ✅ USAR O PROCESSADOR UNIFICADO QUE JÁ INTEGRA TUDO (FSRS + ROBUSTO)
        const projectRoot = process.cwd();
        const processadorCompletoPath = path.join(projectRoot, 'processador-apkg-completo.js');
        
        const { ProcessadorAPKGCompleto } = require(processadorCompletoPath);
        if (!ProcessadorAPKGCompleto) {
          throw new Error('ProcessadorAPKGCompleto não encontrado');
        }
        
        // ✅ USAR O PROCESSADOR UNIFICADO QUE JÁ INTEGRA FSRS + TODAS AS FUNCIONALIDADES
        const processadorFSRS = new ProcessadorAPKGCompleto();
        
        // Callback de progresso silencioso
        processadorFSRS.setProgressCallback((percent: number, message: string) => {
          // Mapear progresso do processador para etapas específicas
          if (percent <= 40) {
            addProgressStep(userId, 'Extraindo dados do arquivo', 'processing', message, percent);
          } else if (percent <= 70) {
            addProgressStep(userId, 'Processando flashcards', 'processing', message, percent);
          } else if (percent <= 90) {
            addProgressStep(userId, 'Configurando FSRS', 'processing', message, percent);
          } else {
            addProgressStep(userId, 'Finalizando processamento', 'processing', message, percent);
          }
        });
        
        addProgressStep(userId, 'Carregando processador FSRS', 'processing', undefined, 10);
        
        // ✅ USAR O PROCESSADOR FSRS CORRIGIDO QUE JÁ FAZ A CONVERSÃO COMPLETA
        const resultadoFSRS = await processadorFSRS.processarAPKG(filePath, userId, collectionName);
        
        if (!resultadoFSRS.success) {
          addProgressStep(userId, 'Erro no processamento FSRS', 'error', 'Falha no processamento do arquivo');
          throw new Error('Processamento FSRS falhou');
        }
        
        // ✅ ADAPTAR RESULTADO DO PROCESSADOR UNIFICADO PARA FORMATO ESPERADO
        if (!resultadoFSRS.resultado.decks) {
          // O processador unificado retorna uma estrutura diferente
          // Mapear medbraveDecks para decks
          const medbraveDecks = resultadoFSRS.resultado.medbraveDecks || [];
          
          resultadoFSRS.resultado.decks = medbraveDecks;
          resultadoFSRS.resultado.collection = resultadoFSRS.resultado.colecao;
          resultadoFSRS.resultado.mediaMap = resultadoFSRS.resultado.mediaMap || {};
          resultadoFSRS.resultado.existingCheck = null; // Será criado abaixo se necessário
        }
        
        addProgressStep(userId, 'Verificando duplicatas', 'processing', undefined, 85);
        
        // ✅ USAR SISTEMA INTELIGENTE DE DETECÇÃO DE DUPLICATAS
        let existingCheck = resultadoFSRS.resultado?.existingCheck;
        
        // Se o processador unificado não retornou existingCheck, criar um padrão
        if (!existingCheck) {
          // Verificar se já existe algum deck com o mesmo nome da coleção
          const collectionNameToCheck = resultadoFSRS.resultado?.colecao;
          const existingDecksSnapshot = await firestore
            .collection('decks')
            .where('userId', '==', userId)
            .where('collection', '==', collectionNameToCheck)
            .get();
          
          if (existingDecksSnapshot.empty) {
            existingCheck = {
              action: 'create',
              shouldUpdate: false,
              existingDecks: [],
              newDecks: resultadoFSRS.resultado.decks || []
            };
          } else {
            existingCheck = {
              action: 'merge',
              shouldUpdate: true,
              existingDecks: existingDecksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              newDecks: resultadoFSRS.resultado.decks || []
            };
          }
        }
        
        let savedDecks = [];
        let updateStats = {
          newDecks: 0,
          updatedDecks: 0,
          newCards: 0,
          updatedCards: 0,
          existingCards: 0,
          totalCards: 0
        };
        
        addProgressStep(userId, 'Salvando no banco de dados', 'processing', undefined, 90);
        
        // Verificação adicional de segurança
        if (!existingCheck || !existingCheck.action) {
          existingCheck = {
            action: 'create',
            shouldUpdate: false,
            existingDecks: [],
            newDecks: resultadoFSRS.resultado.decks || []
          };
        }
        
        if (existingCheck.action === 'create') {
          // Nenhum deck existente - criar todos
          if (!resultadoFSRS.resultado.decks || resultadoFSRS.resultado.decks.length === 0) {
            throw new Error('Nenhum deck encontrado para processar');
          }
          
          savedDecks = await saveDecksToDatabase(resultadoFSRS.resultado.decks);
          updateStats.newDecks = savedDecks.length;
          
          // ✅ CALCULAR TOTAL DE CARDS CORRETAMENTE DOS DECKS SALVOS
          updateStats.newCards = resultadoFSRS.resultado.decks.reduce((total: number, deck: any) => {
            const cardCount = deck.cards?.length || deck.flashcardCount || 0;
            return total + cardCount;
          }, 0);
          
        } else if (existingCheck.action === 'merge') {
          // Alguns decks existem, outros são novos - fazer merge inteligente
          
          // Salvar apenas decks novos
          if (existingCheck.newDecks.length > 0) {
            const newSavedDecks = await saveDecksToDatabase(existingCheck.newDecks);
            savedDecks.push(...newSavedDecks);
            updateStats.newDecks = newSavedDecks.length;
            
            // Calcular cards nos novos decks
            updateStats.newCards += existingCheck.newDecks.reduce((total: number, deck: any) => {
              return total + (deck.cards?.length || deck.flashcardCount || 0);
            }, 0);
          }
          
          // Para decks existentes, verificar cards novos usando findExistingFlashcards
          for (const existingDeck of existingCheck.existingDecks) {
            const matchingNewDeck = resultadoFSRS.resultado.decks.find(
              (deck: any) => (deck.title || deck.name) === (existingDeck.name || existingDeck.title)
            );
            
            if (matchingNewDeck && matchingNewDeck.cards) {
              const cardAnalysis = await findExistingFlashcards(
                userId,
                existingDeck.id,
                matchingNewDeck.cards
              );
              
              // Salvar apenas cards novos
              if (cardAnalysis.newCards.length > 0) {
                
                const batch = firestore.batch();
                for (const newCard of cardAnalysis.newCards) {
                  const validCard = ensureValidFieldValues(newCard);
                  const flashcardData = {
                    deckId: existingDeck.id,
                    userId: userId,
                    frontContent: validCard.frontContent,
                    backContent: validCard.backContent,
                    personalNotes: null,
                    tags: validCard.tags,
                    mediaRefs: validCard.mediaRefs,
                    order: validCard.order,
                    contentHash: validCard.contentHash,
                    originalAnkiNoteId: validCard.originalAnkiNoteId,
                    originalAnkiCardId: validCard.originalAnkiCardId,
                    originalDeckId: validCard.originalDeckId,
                    // ✅ DADOS FSRS ESPECÍFICOS
                    fsrsData: validCard.fsrsData || {
                      state: 'NEW',
                      stability: 0,
                      difficulty: 5.0,
                      elapsed_days: 0,
                      scheduled_days: 1,
                      reps: 0,
                      lapses: 0,
                      last_review: null,
                      due: new Date(),
                      algorithm: 'FSRS v4.5'
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  };
                  
                  const filteredData = filterUndefinedFields(flashcardData);
                  const newCardRef = firestore.collection('flashcards').doc();
                  batch.set(newCardRef, filteredData);
                }
                
                await batch.commit();
                updateStats.newCards += cardAnalysis.newCards.length;
              }
              
              // Atualizar estatísticas
              updateStats.existingCards += cardAnalysis.existingCards.length;
              
              // Atualizar contadores do deck existente
              const totalCards = cardAnalysis.existingCards.length + cardAnalysis.newCards.length;
              await firestore.collection('decks').doc(existingDeck.id).update({
                flashcardCount: totalCards,
                fsrsEnabled: true,
                algorithm: 'FSRS v4.5',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastImportAt: admin.firestore.FieldValue.serverTimestamp()
              });
              
              savedDecks.push({
                id: existingDeck.id,
                name: existingDeck.name,
                isNew: false,
                newCards: cardAnalysis.newCards.length,
                existingCards: cardAnalysis.existingCards.length
              });
            }
          }
          
        } else {
          // Todos os decks existem - apenas atualizar cards novos
          savedDecks = await saveDecksToDatabase(resultadoFSRS.resultado.decks);
          updateStats.updatedDecks = savedDecks.length;
        }
        
        // ✅ CALCULAR TOTAL DE CARDS PROCESSADOS CORRETAMENTE
        updateStats.totalCards = updateStats.newCards + updateStats.existingCards;
        
        // Limpar timeout já que processamento foi concluído
        clearTimeout(timeoutId);
        
        // ✅ GERAR MENSAGEM FINAL CLARA COM COLEÇÃO CORRETA
        const finalCollectionName = resultadoFSRS.resultado.colecao;
        const finalMessage = generateFinalMessage(existingCheck, updateStats, 
          Object.keys(resultadoFSRS.resultado.mediaMap || {}), 
          resultadoFSRS, finalCollectionName);
        
        // ✅ ÚNICO LOG FINAL PERMITIDO
        console.log(finalMessage);
        addProgressStep(userId, 'Processamento FSRS concluído', 'completed', finalMessage, 100);
        
        // Marcar progresso como inativo
        const userProgress = userProgressMap.get(userId);
        if (userProgress) {
          userProgress.isActive = false;
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no processamento';
        addProgressStep(userId, 'Erro no processamento FSRS', 'error', errorMessage);
        
        const userProgress = userProgressMap.get(userId);
        if (userProgress) {
          userProgress.isActive = false;
        }
      }
    });
    
    // ✅ ENVIAR RESPOSTA IMEDIATA AO CLIENTE (IGUAL À ROTA ORIGINAL)
    return res.status(200).json({
      success: true,
      message: 'Arquivo recebido e processamento FSRS iniciado. Os decks aparecerão em sua lista quando o processamento for concluído.',
      processing: true,
      algorithm: 'FSRS v4.5',
      fsrsInfo: {
        description: 'Free Spaced Repetition Scheduler - Algoritmo moderno baseado em machine learning',
        advantages: [
          '15-25% mais eficiente que SM-2',
          '90-95% de taxa de retenção',
          'Personalização automática por usuário',
          '17 parâmetros adaptativos'
        ]
      }
    });
    
  } catch (error: unknown) {
    // Limpar arquivo temporário em caso de erro
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar arquivo APKG com FSRS',
      error: errorMessage
    });
  }
});

// Rota para verificar progresso de importação em tempo real
router.get('/import-progress/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user?.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    const userProgress = userProgressMap.get(userId);
    
    if (!userProgress) {
      return res.status(200).json({
        success: true,
        data: {
          isActive: false,
          steps: [],
          currentProgress: 0,
          message: 'Nenhuma importação ativa'
        }
      });
    }

    // Calcular tempo decorrido
    const elapsedTime = Date.now() - userProgress.startTime;
    const elapsedMinutes = Math.floor(elapsedTime / 60000);
    const elapsedSeconds = Math.floor((elapsedTime % 60000) / 1000);
    
    return res.status(200).json({
      success: true,
      data: {
        isActive: userProgress.isActive,
        steps: userProgress.steps,
        currentProgress: userProgress.currentProgress,
        elapsedTime: `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`,
        lastUpdate: new Date(userProgress.lastUpdate).toISOString()
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar progresso da importação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para verificar status da importação FSRS
router.get('/import-status/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user?.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Buscar decks FSRS do usuário
    const fsrsDecksSnapshot = await firestore
      .collection('decks')
      .where('userId', '==', userId)
      .where('fsrsEnabled', '==', true)
      .get();

    const fsrsStats = {
      totalFSRSDecks: fsrsDecksSnapshot.size,
      algorithm: 'FSRS v4.5',
      lastImport: null as any
    };

    if (!fsrsDecksSnapshot.empty) {
      const latestDeck = fsrsDecksSnapshot.docs
        .sort((a, b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0))[0];
      fsrsStats.lastImport = latestDeck.data().createdAt?.toDate();
    }
    
    return res.status(200).json({
      success: true,
      data: {
        fsrsStats,
        algorithm: 'FSRS v4.5',
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar status da importação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 