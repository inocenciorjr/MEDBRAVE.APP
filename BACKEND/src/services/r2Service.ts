import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';
import * as https from 'https';

// Comentado para remover warning de segurança - apenas usar em desenvolvimento se necessário
// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// Configuração do R2 usando variáveis de ambiente
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || '16fc5a72ff773d4925e9e5a1b0136737',
  bucketName: process.env.R2_BUCKET_NAME || 'medbrave',
  accessKeyId:
    process.env.R2_ACCESS_KEY_ID || '41c779389c2f6cd8039d2537cced5a69',
  secretAccessKey:
    process.env.R2_SECRET_ACCESS_KEY ||
    'f99e3b6cc38730d0a8ccb266a8adedb9a677ed5308a8a39b18edd8b43dbb2a78',
  endpoint:
    process.env.R2_ENDPOINT ||
    'https://16fc5a72ff773d4925e9e5a1b0136737.r2.cloudflarestorage.com',
  publicUrl: process.env.R2_PUBLIC_URL || 'https://medbrave.com.br',
};

// Verificar se todas as variáveis estão configuradas
if (
  !R2_CONFIG.accountId ||
  !R2_CONFIG.accessKeyId ||
  !R2_CONFIG.secretAccessKey
) {
  logger.warn(
    '⚠️ Configurações R2 incompletas. Verificar variáveis de ambiente.',
  );
}

// Configurar Node.js para aceitar certificados SSL com problemas (temporário - comentado por segurança)
// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// Configuração robusta do agente HTTPS para resolver problemas SSL com Cloudflare R2
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 60000, // 60 segundos timeout
  // Configurações SSL mais tolerantes
  secureProtocol: 'TLS_method',
  ciphers:
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384',
  honorCipherOrder: true,
  rejectUnauthorized: false, // Mais tolerante com problemas de certificado
});

// Cliente S3 compatível para R2 com configurações SSL melhoradas
const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
  forcePathStyle: true,
  maxAttempts: 5, // Aumentar número de tentativas automáticas
  requestHandler: {
    httpsAgent,
    connectionTimeout: 30000, // 30s para estabelecer conexão
    socketTimeout: 60000, // 60s para transferência de dados
  },
  retryMode: 'adaptive',
});

export class R2Service {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    this.client = r2Client;
    this.bucketName = R2_CONFIG.bucketName;
    this.publicUrl = R2_CONFIG.publicUrl;
  }

  // Gerar presigned URL para upload
  async generatePresignedUploadUrl(
    filename: string,
    contentType: string,
    folder: string = 'uploads',
    expiresIn: number = 3600,
    metadata: Record<string, string> = {},
  ): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
    try {
      // Sanitizar filename
      const sanitizedFilename = this.sanitizeFilename(filename);

      // Gerar chave do arquivo
      // Se o filename já tem formato customizado (ex: q01.png, qQ5.png), não adicionar timestamp
      const isCustomFilename = /^q[a-zA-Z]?\d+(_\d+)?\.\w+$/i.test(sanitizedFilename);
      const fileKey = isCustomFilename
        ? `${folder}/${sanitizedFilename}`
        : `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${sanitizedFilename}`;

      // Comando para upload
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          originalName: filename,
        },
      });

      // Gerar URL assinada
      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

      // URL pública para acesso
      const publicUrl = `${this.publicUrl}/${fileKey}`;

      // Silencioso - não loga para evitar poluição
      logger.debug('Presigned upload URL gerada', {
        fileKey,
        folder,
        contentType,
        expiresIn,
      });

      return {
        uploadUrl,
        fileKey,
        publicUrl,
      };
    } catch (error: any) {
      logger.error('Erro ao gerar presigned URL para upload', {
        error,
        filename,
        folder,
      });
      throw new Error(`Falha ao gerar URL de upload: ${error.message}`);
    }
  }

  // Gerar presigned URL para download
  async generatePresignedDownloadUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const downloadUrl = await getSignedUrl(this.client, command, {
        expiresIn,
      });

      logger.info('Presigned download URL gerada', { fileKey, expiresIn });

      return downloadUrl;
    } catch (error: any) {
      logger.error('Erro ao gerar presigned URL para download', {
        error,
        fileKey,
      });
      throw new Error(`Falha ao gerar URL de download: ${error.message}`);
    }
  }

  // Listar arquivos
  async listFiles(
    folder: string = '',
    maxKeys: number = 50,
  ): Promise<
    Array<{
      key: string;
      size: number;
      lastModified: Date;
      url: string;
    }>
  > {
    // Primeira tentativa com configuração SSL padrão
    try {
      return await this.tryListFiles(folder, maxKeys, false);
    } catch (error: any) {
      if (
        error.message.includes('SSL') ||
        error.message.includes('EPROTO') ||
        error.message.includes('handshake')
      ) {
        logger.warn(
          '🔄 Tentativa SSL falhou, tentando com configuração alternativa',
          { error: error.message },
        );

        // Segunda tentativa com configuração SSL alternativa
        try {
          return await this.tryListFiles(folder, maxKeys, true);
        } catch (fallbackError: any) {
          logger.error('❌ Ambas as tentativas de conexão R2 falharam', {
            originalError: error.message,
            fallbackError: fallbackError.message,
          });
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }

  // Método auxiliar para tentar listar arquivos com diferentes configurações
  private async tryListFiles(
    folder: string,
    maxKeys: number,
    useAlternativeConfig: boolean = false,
  ): Promise<
    Array<{
      key: string;
      size: number;
      lastModified: Date;
      url: string;
    }>
  > {
    try {
      logger.info('🔍 Iniciando listFiles', {
        folder,
        maxKeys,
        bucket: this.bucketName,
        endpoint: R2_CONFIG.endpoint,
        useAlternativeConfig,
      });

      // Se for configuração alternativa, criar cliente temporário com configurações diferentes
      let clientToUse = this.client;

      if (useAlternativeConfig) {
        logger.info('🔧 Usando configuração SSL alternativa');

        // Configuração SSL ainda mais permissiva
        const altHttpsAgent = new https.Agent({
          keepAlive: false,
          rejectUnauthorized: false,
          secureProtocol: 'TLSv1_method', // TLS 1.0 para compatibilidade máxima
          maxSockets: 10,
          timeout: 30000,
          servername: undefined,
          checkServerIdentity: () => undefined,
        });

        clientToUse = new S3Client({
          region: 'auto',
          endpoint: R2_CONFIG.endpoint,
          credentials: {
            accessKeyId: R2_CONFIG.accessKeyId,
            secretAccessKey: R2_CONFIG.secretAccessKey,
          },
          forcePathStyle: true,
          maxAttempts: 1,
          requestHandler: {
            httpsAgent: altHttpsAgent,
            requestTimeout: 30000,
            connectionTimeout: 5000,
          },
        });
      }

      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: folder,
        MaxKeys: maxKeys,
      });

      logger.info('📡 Enviando comando para R2', {
        bucket: this.bucketName,
        prefix: folder,
        maxKeys,
      });

      const response = await clientToUse.send(command);

      logger.info('📥 Resposta recebida do R2', {
        contentsLength: response.Contents?.length || 0,
        isTruncated: response.IsTruncated,
        keyCount: response.KeyCount,
      });

      const files = (response.Contents || []).map((object) => ({
        key: object.Key!,
        size: object.Size || 0,
        lastModified: object.LastModified || new Date(),
        url: `${this.publicUrl}/${object.Key}`,
      }));

      logger.info('✅ Arquivos listados com sucesso', {
        folder,
        count: files.length,
        maxKeys,
        useAlternativeConfig,
      });

      return files;
    } catch (error: any) {
      logger.error('❌ Erro detalhado ao listar arquivos', {
        error: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        folder,
        maxKeys,
        bucket: this.bucketName,
        endpoint: R2_CONFIG.endpoint,
        hasCredentials: !!(R2_CONFIG.accessKeyId && R2_CONFIG.secretAccessKey),
        useAlternativeConfig,
      });

      // Fornecer erro mais específico baseado no tipo
      if (error.name === 'CredentialsProviderError') {
        throw new Error('Credenciais R2 inválidas ou ausentes');
      } else if (
        error.name === 'NetworkingError' ||
        error.code === 'ENOTFOUND'
      ) {
        throw new Error(
          'Erro de conectividade com R2. Verifique a configuração do endpoint',
        );
      } else if (
        error.name === 'AccessDenied' ||
        error.code === 'AccessDenied'
      ) {
        throw new Error('Acesso negado ao bucket R2. Verifique as permissões');
      } else if (error.name === 'NoSuchBucket') {
        throw new Error(`Bucket '${this.bucketName}' não existe`);
      }

      throw new Error(`Falha ao listar arquivos: ${error.message}`);
    }
  }

  // Listar TODOS os arquivos de uma pasta (com paginação automática)
  async listAllFiles(
    folder: string = '',
  ): Promise<
    Array<{
      key: string;
      size: number;
      lastModified: Date;
      url: string;
    }>
  > {
    const allFiles: Array<{
      key: string;
      size: number;
      lastModified: Date;
      url: string;
    }> = [];
    
    let continuationToken: string | undefined = undefined;
    let pageCount = 0;

    do {
      pageCount++;
      
      try {
        const command = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: folder,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        });

        const response: ListObjectsV2CommandOutput = await this.client.send(command);

        const files = (response.Contents || []).map((object) => ({
          key: object.Key!,
          size: object.Size || 0,
          lastModified: object.LastModified || new Date(),
          url: `${this.publicUrl}/${object.Key}`,
        }));

        allFiles.push(...files);
        
        logger.info(`📄 Página ${pageCount}: ${files.length} arquivos (total: ${allFiles.length})`);

        // Verificar se tem mais páginas
        continuationToken = response.NextContinuationToken;
      } catch (error: any) {
        logger.error('Erro ao listar arquivos (paginação)', { error, folder, pageCount });
        throw new Error(`Falha ao listar arquivos: ${error.message}`);
      }
    } while (continuationToken);

    logger.info(`✅ Total de ${allFiles.length} arquivos listados de ${folder}`);
    
    return allFiles;
  }

  // Deletar arquivo
  async deleteFile(fileKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.client.send(command);

      logger.info('Arquivo deletado', { fileKey });
    } catch (error: any) {
      logger.error('Erro ao deletar arquivo', { error, fileKey });
      throw new Error(`Falha ao deletar arquivo: ${error.message}`);
    }
  }

  // Deletar múltiplos arquivos de uma vez (até 1000 por requisição)
  async deleteFiles(fileKeys: string[]): Promise<{
    deleted: number;
    errors: Array<{ key: string; message: string }>;
  }> {
    try {
      if (fileKeys.length === 0) {
        return { deleted: 0, errors: [] };
      }

      // Limitar a 1000 arquivos (limite do S3/R2)
      const keysToDelete = fileKeys.slice(0, 1000);

      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keysToDelete.map((key) => ({ Key: key })),
          Quiet: false, // Retornar lista de arquivos deletados
        },
      });

      const response = await this.client.send(command);

      const deleted = response.Deleted?.length || 0;
      const errors = (response.Errors || []).map((err) => ({
        key: err.Key || 'unknown',
        message: err.Message || 'unknown error',
      }));

      logger.info(`${deleted} arquivos deletados em lote`, {
        total: keysToDelete.length,
        deleted,
        errors: errors.length,
      });

      return { deleted, errors };
    } catch (error: any) {
      logger.error('Erro ao deletar arquivos em lote', { error, count: fileKeys.length });
      throw new Error(`Falha ao deletar arquivos em lote: ${error.message}`);
    }
  }

  // Verificar se arquivo existe
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Sanitizar nome do arquivo
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Validar tipo de arquivo
  validateFileType(
    contentType: string,
    allowedTypes: string[] = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
    ],
  ): boolean {
    return allowedTypes.includes(contentType);
  }

  // Validar tamanho do arquivo (em bytes)
  validateFileSize(size: number, maxSize: number = 50 * 1024 * 1024): boolean {
    return size <= maxSize;
  }

  // Obter informações do bucket
  async getBucketInfo(): Promise<{
    bucketName: string;
    endpoint: string;
    publicUrl: string;
    status: string;
  }> {
    try {
      // Tentar listar objetos para verificar conectividade
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1,
      });

      await this.client.send(command);

      logger.info('Verificação do bucket R2 bem-sucedida');

      return {
        bucketName: this.bucketName,
        endpoint: R2_CONFIG.endpoint,
        publicUrl: this.publicUrl,
        status: 'connected',
      };
    } catch (error: any) {
      logger.error('Erro ao verificar bucket R2', { error });

      return {
        bucketName: this.bucketName,
        endpoint: R2_CONFIG.endpoint,
        publicUrl: this.publicUrl,
        status: 'error',
      };
    }
  }

  // Upload direto de arquivo para R2
  async uploadFile(
    fileData: Buffer | Uint8Array,
    filename: string,
    contentType: string,
    folder: string = 'uploads',
    metadata: Record<string, string> = {},
    useExactFilename: boolean = false,
  ): Promise<{ fileKey: string; publicUrl: string; size: number }> {
    return this.uploadFileWithRetry(
      fileData,
      filename,
      contentType,
      folder,
      metadata,
      0,
      useExactFilename,
    );
  }

  // Método auxiliar para upload com retry
  private async uploadFileWithRetry(
    fileData: Buffer | Uint8Array,
    filename: string,
    contentType: string,
    folder: string = 'uploads',
    metadata: Record<string, string> = {},
    retryCount = 0,
    useExactFilename: boolean = false,
  ): Promise<{ fileKey: string; publicUrl: string; size: number }> {
    try {
      // Sanitizar filename
      const sanitizedFilename = this.sanitizeFilename(filename);

      // Gerar chave do arquivo
      let fileKey: string;
      if (useExactFilename) {
        // Usar nome exato sem timestamp/randomId
        fileKey = `${folder}/${sanitizedFilename}`;
      } else {
        // Gerar chave única do arquivo
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        fileKey = `${folder}/${timestamp}_${randomId}_${sanitizedFilename}`;
      }

      // Comando para upload direto
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: fileData,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          originalName: filename,
        },
      });

      // Enviar arquivo para R2
      await this.client.send(command);

      // URL pública para acesso
      const publicUrl = `${this.publicUrl}/${fileKey}`;

      // Upload concluído silenciosamente

      return {
        fileKey,
        publicUrl,
        size: fileData.length,
      };
    } catch (error: any) {
      // Se for erro de SSL e ainda não excedeu o número máximo de tentativas
      const maxRetries = 3;
      const isSSLError =
        error.code?.includes('SSL') ||
        error.code?.includes('TLS') ||
        error.library === 'SSL routines' ||
        error.message?.includes('SSL');

      if (isSSLError && retryCount < maxRetries) {
        // Backoff exponencial: espera 2^retryCount * 100ms antes de tentar novamente
        const delayMs = Math.pow(2, retryCount) * 100;
        logger.warn(
          `Erro SSL ao fazer upload de ${filename}, tentando novamente em ${delayMs}ms (tentativa ${retryCount + 1}/${maxRetries})`,
          { error: error.message },
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.uploadFileWithRetry(
          fileData,
          filename,
          contentType,
          folder,
          metadata,
          retryCount + 1,
          useExactFilename,
        );
      }

      // Se não for erro SSL ou já excedeu as tentativas, registra o erro
      logger.error('Erro no upload direto para R2', {
        error,
        filename,
        folder,
      });
      throw new Error(`Falha no upload direto: ${error.message}`);
    }
  }

  // Upload em lote de múltiplos arquivos para R2
  async batchUploadFiles(
    files: Array<{
      fileData: Buffer | Uint8Array;
      filename: string;
      contentType: string;
    }>,
    folder: string = 'uploads',
    metadata: Record<string, string> = {},
  ): Promise<
    Array<{
      filename: string;
      fileKey: string;
      publicUrl: string;
      size: number;
    }>
  > {
    try {
      if (files.length === 0) {
        return [];
      }

      // Iniciando upload em lote silenciosamente

      // Usar um timestamp comum para todos os arquivos do lote
      const timestamp = Date.now();

      // Função auxiliar para fazer upload com retry
      const uploadWithRetry = async (
        fileData: Buffer | Uint8Array,
        filename: string,
        contentType: string,
        retryCount = 0,
      ): Promise<{
        filename: string;
        fileKey: string;
        publicUrl: string;
        size: number;
      }> => {
        try {
          // Sanitizar filename
          const sanitizedFilename = this.sanitizeFilename(filename);

          // Gerar chave única do arquivo com timestamp compartilhado
          const randomId = Math.random().toString(36).substring(2, 15);
          const fileKey = `${folder}/${timestamp}_${randomId}_${sanitizedFilename}`;

          // Comando para upload direto
          const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileKey,
            Body: fileData,
            ContentType: contentType,
            Metadata: {
              ...metadata,
              uploadedAt: new Date().toISOString(),
              originalName: filename,
              batchId: `batch-${timestamp}`,
            },
          });

          // Enviar arquivo para R2
          await this.client.send(command);

          // URL pública para acesso
          const publicUrl = `${this.publicUrl}/${fileKey}`;

          return {
            filename,
            fileKey,
            publicUrl,
            size: fileData.length,
          };
        } catch (error: any) {
          // Se for erro de SSL e ainda não excedeu o número máximo de tentativas
          const maxRetries = 3;
          const isSSLError =
            error.code?.includes('SSL') ||
            error.code?.includes('TLS') ||
            error.library === 'SSL routines' ||
            error.message?.includes('SSL');

          if (isSSLError && retryCount < maxRetries) {
            // Backoff exponencial: espera 2^retryCount * 100ms antes de tentar novamente
            const delayMs = Math.pow(2, retryCount) * 100;
            logger.warn(
              `Erro SSL ao fazer upload de ${filename}, tentando novamente em ${delayMs}ms (tentativa ${retryCount + 1}/${maxRetries})`,
              { error: error.message },
            );

            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return uploadWithRetry(
              fileData,
              filename,
              contentType,
              retryCount + 1,
            );
          }

          // Se não for erro SSL ou já excedeu as tentativas, registra o erro
          logger.error(
            `Erro no upload do arquivo ${filename} no lote${retryCount > 0 ? ` após ${retryCount} tentativas` : ''}`,
            { error },
          );
          return {
            filename,
            fileKey: '',
            publicUrl: '',
            size: 0,
          };
        }
      };

      // Executar todos os uploads em paralelo (método anterior mais rápido)
      const results = await Promise.all(
        files.map(({ fileData, filename, contentType }) =>
          uploadWithRetry(fileData, filename, contentType),
        ),
      );

      // Filtrar resultados falharam
      const failedUploads = results.filter((result) => !result.publicUrl);

      // Upload em lote concluído silenciosamente

      if (failedUploads.length > 0) {
        logger.warn(
          `Falha no upload de ${failedUploads.length} arquivos no lote`,
          {
            failedFiles: failedUploads.map((f) => f.filename).slice(0, 10),
          },
        );
      }

      return results;
    } catch (error: any) {
      logger.error('Erro geral no upload em lote para R2', { error, folder });
      throw new Error(`Falha no upload em lote: ${error.message}`);
    }
  }

  // Gerar múltiplas URLs para diferentes versões de imagem
  async generateImageUploadUrls(
    filename: string,
    folder: string = 'images',
    metadata: Record<string, string> = {},
  ): Promise<{
    original: { uploadUrl: string; fileKey: string; publicUrl: string };
    thumbnail?: { uploadUrl: string; fileKey: string; publicUrl: string };
    medium?: { uploadUrl: string; fileKey: string; publicUrl: string };
  }> {
    try {
      const contentType = this.getContentTypeFromFilename(filename);

      // URL para imagem original
      const original = await this.generatePresignedUploadUrl(
        filename,
        contentType,
        `${folder}/original`,
        3600,
        { ...metadata, version: 'original' },
      );

      // URLs para versões redimensionadas (opcional)
      let thumbnail, medium;

      if (contentType.startsWith('image/')) {
        thumbnail = await this.generatePresignedUploadUrl(
          `thumb_${filename}`,
          contentType,
          `${folder}/thumbnails`,
          3600,
          { ...metadata, version: 'thumbnail' },
        );

        medium = await this.generatePresignedUploadUrl(
          `medium_${filename}`,
          contentType,
          `${folder}/medium`,
          3600,
          { ...metadata, version: 'medium' },
        );
      }

      return { original, thumbnail, medium };
    } catch (error: any) {
      logger.error('Erro ao gerar URLs de upload de imagem', {
        error,
        filename,
      });
      throw new Error(
        `Falha ao gerar URLs de upload de imagem: ${error.message}`,
      );
    }
  }

  // Inferir content type a partir do filename
  private getContentTypeFromFilename(filename: string): string {
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

  // Upload de buffer direto para R2 (usado pelo endpoint upload-base64)
  async uploadBuffer(
    buffer: Buffer,
    fileKey: string,
    contentType: string,
    metadata: Record<string, string> = {},
  ): Promise<{ fileKey: string; publicUrl: string; size: number }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.client.send(command);

      const publicUrl = `${this.publicUrl}/${fileKey}`;

      logger.info('Upload de buffer concluído', { fileKey, size: buffer.length });

      return {
        fileKey,
        publicUrl,
        size: buffer.length,
      };
    } catch (error: any) {
      logger.error('Erro no upload de buffer para R2', { error, fileKey });
      throw new Error(`Falha no upload de buffer: ${error.message}`);
    }
  }
}

// Instância singleton
export const r2Service = new R2Service();
