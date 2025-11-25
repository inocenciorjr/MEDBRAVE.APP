import express from 'express';
import { r2Service } from '../services/r2Service';
import { logger } from '../utils/logger';
import { supabaseAuthMiddleware as authMiddleware } from '../domain/auth/middleware/supabaseAuth.middleware';

const router = express.Router();

// Diagnóstico de configuração R2
router.get('/debug', async (_req, res) => {
  try {
    const config = {
      bucket: process.env.R2_BUCKET_NAME || 'medbrave',
      endpoint:
        process.env.R2_ENDPOINT ||
        'https://16fc5a72ff7734d925e9e5a1b0136737.r2.cloudflarestorage.com',
      hasAccessKey: !!(
        process.env.R2_ACCESS_KEY_ID || '41c779389c2f6cd8039d2537cced5a69'
      ),
      hasSecretKey: !!(
        process.env.R2_SECRET_ACCESS_KEY ||
        'f99e3b6cc38730d0a8ccb266a8adedb9a677ed5308a8a39b18edd8b43dbb2a78'
      ),
      publicUrl: process.env.R2_PUBLIC_URL || 'https://medbrave.com.br',
      nodeEnv: process.env.NODE_ENV,
      tlsReject: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
    };

    logger.info('🔧 Debug R2 Configuration', config);

    res.json({
      success: true,
      message: 'R2 Debug Info',
      config,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Erro no debug R2', { error });
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Proteger todas as rotas
router.use(authMiddleware as any);

// Health check
router.get('/health', async (_req, res) => {
  try {
    const bucketInfo = await r2Service.getBucketInfo();

    res.json({
      success: true,
      message: 'R2 Service está funcionando',
      ...bucketInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Erro no health check R2', { error });
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
});

// Gerar presigned URL para upload
router.post('/presigned-upload', async (req, res) => {
  try {
    const { filename, contentType, folder = 'uploads', metadata = {} } = req.body;

    // Validações
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename é obrigatório',
      });
    }

    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type é obrigatório',
      });
    }

    // Validar tipo de arquivo
    if (!r2Service.validateFileType(contentType)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de arquivo não permitido',
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
        ],
      });
    }

    // Sanitizar inputs
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9_\-/]/g, '');
    const safeFilename = String(filename).replace(/[^a-zA-Z0-9_\-.]/g, '');
    if (!safeFilename) {
      return res.status(400).json({ success: false, error: 'Filename inválido' });
    }
    // Gerar presigned URL
    const result = await r2Service.generatePresignedUploadUrl(
      safeFilename,
      contentType,
      safeFolder,
      3600,
      metadata,
    );

    logger.info('Presigned upload URL gerada via API', {
      filename,
      folder,
      contentType,
      fileKey: result.fileKey,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('Erro ao gerar presigned upload URL via API', { error });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Gerar presigned URL para download
router.post('/download-url', async (req, res) => {
  try {
    const { fileKey, expiresIn = 3600 } = req.body;
    const safeFileKey = String(fileKey);
    if (!/^[a-zA-Z0-9_\-/\.]+$/.test(safeFileKey) || safeFileKey.includes('..')) {
      return res.status(400).json({ success: false, error: 'fileKey inválido' });
    }

    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'fileKey é obrigatório',
      });
    }

    // Verificar se arquivo existe
    const exists = await r2Service.fileExists(safeFileKey);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado',
      });
    }

    // Gerar presigned URL para download
    const downloadUrl = await r2Service.generatePresignedDownloadUrl(
      safeFileKey,
      expiresIn,
    );

    logger.info('Presigned download URL gerada via API', {
      fileKey: safeFileKey,
      expiresIn,
    });

    return res.json({
      success: true,
      downloadUrl,
      expiresIn,
      fileKey,
    });
  } catch (error: any) {
    logger.error('Erro ao gerar presigned download URL via API', { error });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Listar arquivos
router.get('/files', async (req, res) => {
  try {
    logger.info('🔍 Iniciando listagem de arquivos R2', {
      query: req.query,
      headers: req.headers['user-agent'],
    });

    const { folder = '', limit = 50 } = req.query;
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9_\-/]/g, '');
    const maxKeys = Math.min(parseInt(limit as string) || 50, 100);

    logger.info('📁 Parâmetros processados', { folder, maxKeys });

    // Testar conexão primeiro
    try {
      await r2Service.getBucketInfo();
      logger.info('✅ Conexão com R2 verificada');
    } catch (connectionError: any) {
      logger.error('❌ Falha na conexão com R2', {
        error: connectionError.message,
        stack: connectionError.stack,
      });
      throw new Error(`Falha na conexão R2: ${connectionError.message}`);
    }

    const files = await r2Service.listFiles(safeFolder, maxKeys);

    logger.info('Arquivos listados via API', {
      folder: safeFolder,
      count: files.length,
      maxKeys,
    });

    return res.json({
      success: true,
      files,
      count: files.length,
      folder: safeFolder,
      limit: maxKeys,
    });
  } catch (error: any) {
    logger.error('❌ Erro ao listar arquivos via API', {
      error: error.message,
      stack: error.stack,
      query: req.query,
    });
    return res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
});

// Deletar arquivo
router.delete('/files/:fileKey(*)', async (req, res) => {
  try {
    const fileKey = req.params.fileKey;
    if (!/^[a-zA-Z0-9_\-/\.]+$/.test(fileKey) || fileKey.includes('..')) {
      return res.status(400).json({ success: false, error: 'fileKey inválido' });
    }

    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'fileKey é obrigatório',
      });
    }

    // Verificar se arquivo existe
    const exists = await r2Service.fileExists(fileKey);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado',
      });
    }

    // Deletar arquivo
    await r2Service.deleteFile(fileKey);

    logger.info('Arquivo deletado via API', { fileKey });

    return res.json({
      success: true,
      message: 'Arquivo deletado com sucesso',
      fileKey,
    });
  } catch (error: any) {
    logger.error('Erro ao deletar arquivo via API', {
      error,
      fileKey: req.params.fileKey,
    });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Notificar que upload foi concluído (opcional)
router.post('/upload-complete', async (req, res) => {
  try {
    const { fileKey, metadata = {} } = req.body;

    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'fileKey é obrigatório',
      });
    }

    logger.info('Upload concluído notificado via API', {
      fileKey,
      metadata,
    });

    return res.json({
      success: true,
      message: 'Upload registrado com sucesso',
      fileKey,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Erro ao processar notificação de upload completo', { error });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Gerar URLs para múltiplas versões de imagem
router.post('/image-upload-urls', async (req, res) => {
  try {
    const { filename, folder = 'images', metadata = {} } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename é obrigatório',
      });
    }

    // Verificar se é uma imagem
    const contentType = filename.toLowerCase().includes('.')
      ? getContentTypeFromFilename(filename)
      : 'image/jpeg';

    if (!contentType.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Apenas imagens são suportadas neste endpoint',
      });
    }

    // Gerar URLs para diferentes versões
    const urls = await r2Service.generateImageUploadUrls(
      filename,
      folder,
      metadata,
    );

    logger.info('URLs de upload de imagem geradas via API', {
      filename,
      folder,
      versionsGenerated: Object.keys(urls).length,
    });

    return res.json({
      success: true,
      ...urls,
    });
  } catch (error: any) {
    logger.error('Erro ao gerar URLs de upload de imagem via API', { error });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Verificar se arquivo existe
router.get('/files/:fileKey(*)/exists', async (req, res) => {
  try {
    const fileKey = req.params.fileKey;

    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'fileKey é obrigatório',
      });
    }

    const exists = await r2Service.fileExists(fileKey);

    return res.json({
      success: true,
      exists,
      fileKey,
    });
  } catch (error: any) {
    logger.error('Erro ao verificar existência de arquivo via API', { error });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Informações do bucket
router.get('/bucket-info', async (_req, res) => {
  try {
    const bucketInfo = await r2Service.getBucketInfo();

    return res.json({
      success: true,
      ...bucketInfo,
    });
  } catch (error: any) {
    logger.error('Erro ao obter informações do bucket via API', { error });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper function
function getContentTypeFromFilename(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop();

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    txt: 'text/plain',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}

export default router;
