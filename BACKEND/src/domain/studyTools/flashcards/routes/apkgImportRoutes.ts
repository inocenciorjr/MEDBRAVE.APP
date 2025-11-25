import { Router } from "express";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";

import { supabaseAuthMiddleware as authMiddleware } from "../../../auth/middleware/supabaseAuth.middleware";
// searchIndexMiddleware removed - now uses GIN index directly (auto-updated)

import { r2Service } from "../../../../services/r2Service";
import { apkgProgressService } from "../../../../services/apkgProgressService";

import { supabase } from "../../../../config/supabaseAdmin";

// Garantir que o diretório de uploads existe
const uploadDir = path.join(__dirname, "../../../../../uploads/temp");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `apkg-${uniqueSuffix}${ext}`);
  },
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
    headerPairs: 2000, // Número máximo de pares de header
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // Verificar extensão do arquivo
    const allowedExtensions = [".apkg", ".colpkg"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos .apkg e .colpkg são permitidos"));
    }
  },
  // Configurações adicionais para melhor performance com arquivos grandes
  preservePath: false,
  dest: uploadDir,
});



const router = Router();

// Função para processar e fazer upload de múltiplas mídias para R2 em paralelo
async function processBatchMediaFiles(
  mediaFiles: Array<{ fileName: string; data: Buffer }>,
  userId: string,
): Promise<Record<string, string>> {
  try {
    // Preparar arquivos para upload em lote
    const filesForBatchUpload = mediaFiles.map(({ fileName, data }) => {
      // Detectar tipo de conteúdo baseado na extensão
      const ext = path.extname(fileName).toLowerCase();
      let contentType = "application/octet-stream"; // Padrão

      // Mapear extensões comuns para tipos MIME
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4",
        ".pdf": "application/pdf",
        ".webm": "video/webm",
      };

      if (ext in mimeTypes) {
        contentType = mimeTypes[ext];
      }

      return {
        fileData: data,
        filename: fileName,
        contentType,
      };
    });

    // Upload em lote para R2
    const uploadResults = await r2Service.batchUploadFiles(
      filesForBatchUpload,
      `flashcards/${userId}/media`,
      {
        userId,
        source: "anki-import",
        imported_at: new Date().toISOString(),
      }
    );

    // Criar mapeamento de nomes de arquivo para URLs
    const mediaMap: Record<string, string> = {};
    uploadResults.forEach((result) => {
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
function replaceMediaReferences(
  html: string,
  mediaMap: Record<string, string>,
): string {
  let updatedHtml = html;

  // Substituir referências de imagens
  Object.entries(mediaMap).forEach(([originalName, url]) => {
    // Substituir referências no formato src="nome_arquivo.jpg"
    const srcRegex = new RegExp(`src=["']${originalName}["']`, "gi");
    updatedHtml = updatedHtml.replace(srcRegex, `src="${url}"`);

    // Substituir referências no formato src="nome_arquivo.jpg?12345"
    const srcWithParamsRegex = new RegExp(
      `src=["']${originalName}\\?[^"']*["']`,
      "gi",
    );
    updatedHtml = updatedHtml.replace(srcWithParamsRegex, `src="${url}"`);

    // Substituir referências no formato [sound:nome_arquivo.mp3]
    const soundRegex = new RegExp(`\\[sound:${originalName}\\]`, "gi");
    updatedHtml = updatedHtml.replace(
      soundRegex,
      `<audio controls src="${url}"></audio>`,
    );
  });

  return updatedHtml;
}

// Função para gerar hash de conteúdo único


// Função para verificar se coleção já existe e implementar atualização incremental
async function checkExistingCollection(
  userId: string,
  collectionId: string,
  decks: any[],
): Promise<{
  shouldUpdate: boolean;
  existingDecks: any[];
  newDecks: any[];
  action: "create" | "update" | "merge";
}> {
  try {
    // Buscar decks existentes da mesma coleção usando collection_id
    const { data: existingDecksData, error } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", userId)
      .eq("collection_id", collectionId);

    if (error) {throw error;}

    const existingDecks = existingDecksData || [];

    // Decks existentes verificados

    if (existingDecks.length === 0) {
      return {
        shouldUpdate: false,
        existingDecks: [],
        newDecks: decks,
        action: "create",
      };
    }

    // Comparar nomes dos decks para identificar novos vs existentes
    const existingDeckNames = new Set(
      existingDecks.map((deck: any) => deck.name || deck.title),
    );
    const newDecks = decks.filter(
      (deck: any) => !existingDeckNames.has(deck.title),
    );

    // Análise da coleção concluída

    return {
      shouldUpdate: existingDecks.length > 0,
      existingDecks,
      newDecks,
      action: newDecks.length > 0 ? "merge" : "update",
    };
  } catch (error) {
    return {
      shouldUpdate: false,
      existingDecks: [],
      newDecks: decks,
      action: "create",
    };
  }
}

// Função removida - agora está no processador




// Função removida - agora está no processador


// Configuração do multer para múltiplos arquivos
const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max
    files: 2, // APKG + imagem de capa
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // Aceitar .apkg para apkgFile e imagens para coverImage
    if (file.fieldname === 'apkgFile') {
      const allowedExtensions = [".apkg", ".colpkg"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Apenas arquivos .apkg e .colpkg são permitidos"));
      }
    } else if (file.fieldname === 'coverImage') {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Apenas imagens JPG, PNG ou WEBP são permitidas"));
      }
    } else {
      cb(new Error("Campo de arquivo não reconhecido"));
    }
  },
});

// Rota para importar arquivo APKG
router.post(
  "/import",
  authMiddleware,
  (req, res, next) => {
    // Upload de múltiplos arquivos: apkgFile (opcional se tempFileName fornecido) e coverImage (opcional)
    uploadMultiple.fields([
      { name: 'apkgFile', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 }
    ])(req, res, (err: any) => {
      if (err) {
        let errorMessage = "Erro ao fazer upload do arquivo";
        let statusCode = 400;

        if (err.code === "LIMIT_FILE_SIZE") {
          errorMessage =
            "Arquivo muito grande. O tamanho máximo permitido é 500MB.";
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
          errorMessage = 'Campo de arquivo inesperado. Use o campo "apkgFile".';
        } else if (err.message.includes("Unexpected end of form")) {
          errorMessage =
            "Upload interrompido. Tente novamente com uma conexão mais estável.";
          statusCode = 408; // Request Timeout
        } else {
          errorMessage = err.message || "Erro desconhecido no upload";
        }

        return res.status(statusCode).json({
          success: false,
          message: errorMessage,
          error: err.message,
          code: err.code || "UNKNOWN_ERROR",
        });
      }

      return next();
    });
  },
  async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const tempFileName = req.body.tempFileName; // Nome do arquivo do preview
      
      let filePath: string;
      let apkgFile: Express.Multer.File | undefined;
      
      // ✅ Se tempFileName foi fornecido, usar arquivo do preview
      if (tempFileName) {
        filePath = path.join(uploadDir, tempFileName);
        
        if (!fs.existsSync(filePath)) {
          return res.status(400).json({ 
            success: false, 
            message: "Arquivo de preview não encontrado. Por favor, faça o upload novamente." 
          });
        }
        
      } else {
        // ✅ Caso contrário, usar arquivo enviado agora
        if (!files || !files.apkgFile || files.apkgFile.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "Nenhum arquivo APKG enviado" });
        }
        
        apkgFile = files.apkgFile[0];
        filePath = apkgFile.path;
      }
      
      const coverImageFile = files?.coverImage ? files.coverImage[0] : null;
      const userId = req.user?.id;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Usuário não autenticado" });
      }

      // Obter nome da coleção do formulário
      const collectionName = req.body.collectionName || "Coleção Importada";
      
      // Processar imagem de capa se fornecida
      let coverImageUrl: string | null = null;
      if (coverImageFile) {
        try {
          // Upload da imagem para R2
          const imageBuffer = fs.readFileSync(coverImageFile.path);
          const imageKey = `collections/covers/${userId}/${Date.now()}-${coverImageFile.originalname}`;
          
          const uploadResult = await r2Service.uploadFile(
            imageBuffer,
            imageKey,
            coverImageFile.mimetype
          );
          
          if (uploadResult.publicUrl) {
            coverImageUrl = uploadResult.publicUrl;
            console.log(`✅ Imagem de capa enviada para R2: ${coverImageUrl}`);
          }
          
          // Limpar arquivo temporário
          fs.unlinkSync(coverImageFile.path);
        } catch (imageError) {
          console.error('❌ Erro ao fazer upload da imagem de capa:', imageError);
          // Continuar mesmo se o upload da imagem falhar
        }
      }

      // Processar em background com WebSocket
      setImmediate(async () => {
        try {
          apkgProgressService.sendProgress(userId || '', 0, 'Iniciando importação...', 'init');

          // Importar o processador
          const processador = require('../../../../../processador-apkg-completo.js');
          
          apkgProgressService.sendProgress(userId || '', 5, 'Lendo arquivo APKG...', 'reading');

          // Obter modo de duplicatas do body (padrão: ignore)
          const duplicateHandling = req.body.duplicateHandling || 'ignore';

          // Processar o arquivo APKG com callback de progresso
          const resultado = await processador.processarApkgCompleto(filePath, userId, {
            collectionName: collectionName,
            coverImageUrl: coverImageUrl,
            saveToDatabase: true,
            duplicateHandling: duplicateHandling,
            progressCallback: (percent: number, message: string) => {
              apkgProgressService.sendProgress(userId || '', percent, message, 'processing');
            }
          });

          // Log removido para reduzir verbosidade
          
          // Enviar resultado completo via WebSocket
          apkgProgressService.sendComplete(userId || '', resultado);
          
        } catch (error) {
          console.error(`[APKG Import] ❌ Erro no processamento:`, error);
          apkgProgressService.sendError(
            userId || '',
            error instanceof Error ? error.message : 'Erro desconhecido'
          );
        } finally {
          // ✅ SEMPRE limpar arquivo temporário após processamento (sucesso ou erro)
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (cleanupError) {
            console.error(`[APKG Import] Erro ao deletar arquivo temporário:`, cleanupError);
          }
        }
      });

      // Enviar resposta imediata
      return res.status(202).json({
        success: true,
        message: 'Importação iniciada. Acompanhe o progresso em tempo real.',
        processing: true,
      });
    } catch (error: unknown) {
      // Limpar arquivo temporário em caso de erro
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";

      return res.status(500).json({
        success: false,
        message: "Erro ao processar arquivo APKG",
        error: errorMessage,
      });

      return;
  }
  },
);

// Função para preview rápido usando o processador otimizado para preview
async function getApkgPreview(filePath: string, userId: string, originalFileName?: string): Promise<any> {
  // Importar o processador completo
  const processador = require('C:\\MEDBRAVE.APP\\MEDBRAVE.APP\\BACKEND\\processador-apkg-completo.js');
  
  // Usar a nova função de preview que executa apenas até a detecção de duplicatas
  const resultado = await processador.processarApkgPreview(filePath, userId, {
    progressCallback: null
  });
  
  // A estrutura retornada tem: { success: true, resultado: { ... } }
  const previewData = resultado.resultado;
  
  // Usar o nome da coleção extraído pelo processador (correto!)
  const collectionName = previewData.collectionName || originalFileName?.replace(/\.apkg$/i, '').trim() || 'Coleção Anki';
  
  // Verificar se a coleção já existe para este usuário
  let collectionExists = false;
  let existingDecks = [];
  
  try {
    // A detecção de duplicatas já foi feita na processarApkgPreview
    if (previewData.analiseDeduplicacao) {
      // ✅ Usar collectionExists do processador (indica se a coleção existe, independente de duplicatas)
      collectionExists = previewData.analiseDeduplicacao.collectionExists || false;
      existingDecks = previewData.analiseDeduplicacao.existingDecks || [];
    }
  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error);
    collectionExists = false;
  }
  
  return {
        success: true,
        metadata: {
              totalCards: previewData.stats.total_cards,
              totalDecks: previewData.stats.total_decks,
              totalDecksComSubpastas: previewData.stats.total_decks_com_subpastas,
              totalNotes: previewData.stats.total_notes,
              totalMedia: 0,
              collectionName: collectionName,
              models: [],
              decks: previewData.decks || []
            },
        newCards: previewData.stats.total_cards,
        duplicates: existingDecks.length,
        collectionExists: collectionExists,
        existingDecks: existingDecks,
        existingCollectionName: previewData.analiseDeduplicacao?.existingCollection?.name || null,
        existingCollectionId: previewData.analiseDeduplicacao?.existingCollection?.id || null,
        collectionName: collectionName,
        // ✅ NOVAS INFORMAÇÕES PARA O FRONTEND
        estruturaInfo: previewData.estruturaInfo || null,
        similarCollections: previewData.analiseDeduplicacao?.similarCollections || [],
        action: previewData.analiseDeduplicacao?.action || 'create',
        recomendacao: previewData.analiseDeduplicacao?.recomendacao || 'Criar nova coleção',
        warnings: previewData.analiseDeduplicacao?.warnings || [],
        hasMedia: false
      };
}

// Rota para preview do arquivo APKG - usando processador completo
router.post(
  "/preview-apkg",
  authMiddleware,
  upload.single("apkgFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Arquivo APKG é obrigatório" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Usuário não autenticado" });
      }

      const previewResult = await getApkgPreview(req.file.path, userId, req.file.originalname);

      // ✅ NÃO deletar arquivo aqui - será deletado na importação ou cancelamento
      return res.json({
        ...previewResult,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        tempFileName: req.file.filename, // Usar filename ao invés de basename(path)
      });

    } catch (error: any) {
      console.error("[APKG Preview] Erro no preview:", error);
      
      // ❌ Em caso de erro, deletar arquivo
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(500).json({ success: false, error: error.message });
    }
  },
);



// Rota para cancelar preview e limpar arquivo temporário
router.post(
  "/cancel-preview",
  authMiddleware,
  async (req, res) => {
    try {
      const { fileName } = req.body;
      
      if (!fileName) {
        return res.status(400).json({ 
          success: false, 
          message: "Nome do arquivo é obrigatório" 
        });
      }

      // Construir caminho do arquivo temporário
      const filePath = path.join(uploadDir, fileName);
      
      // Deletar arquivo se existir
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return res.json({ 
          success: true, 
          message: "Preview cancelado e arquivo deletado" 
        });
      } else {
        return res.json({ 
          success: true, 
          message: "Arquivo já foi deletado" 
        });
      }
      
    } catch (error) {
      console.error("[APKG Preview] Erro ao cancelar preview:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao cancelar preview" 
      });
    }
  }
);

// Export functions for compatibility
export {
  checkExistingCollection,
  processBatchMediaFiles,
  replaceMediaReferences,
};

export default router;
