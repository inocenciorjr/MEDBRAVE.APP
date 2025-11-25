import sharp from 'sharp';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface OptimizationResult {
  buffer: Buffer;
  mimeType: string;
  originalSize: number;
  optimizedSize: number;
  savings: number;
  hash: string;
}

interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export class MediaOptimizationService {
  private static readonly DEFAULT_MAX_WIDTH = 1920;
  private static readonly DEFAULT_MAX_HEIGHT = 1920;
  private static readonly DEFAULT_QUALITY = 90;
  private static readonly DEFAULT_FORMAT = 'webp';

  /**
   * Otimiza uma imagem sem perda perceptível de qualidade
   */
  async optimizeImage(
    buffer: Buffer,
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult> {
    // const startTime = Date.now();
    const originalSize = buffer.length;

    try {
      const {
        maxWidth = MediaOptimizationService.DEFAULT_MAX_WIDTH,
        maxHeight = MediaOptimizationService.DEFAULT_MAX_HEIGHT,
        quality = MediaOptimizationService.DEFAULT_QUALITY,
        format = MediaOptimizationService.DEFAULT_FORMAT,
      } = options;

      // Obter metadados da imagem
      const metadata = await sharp(buffer).metadata();
      
      // Log removido para reduzir poluição no console
      // logger.info('📸 Otimizando imagem', {
      //   originalFormat: metadata.format,
      //   originalWidth: metadata.width,
      //   originalHeight: metadata.height,
      //   originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
      // });

      // Criar pipeline de otimização
      let pipeline = sharp(buffer);

      // Redimensionar se necessário (mantém aspect ratio)
      if (metadata.width && metadata.width > maxWidth) {
        pipeline = pipeline.resize(maxWidth, null, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      if (metadata.height && metadata.height > maxHeight) {
        pipeline = pipeline.resize(null, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Converter para formato otimizado
      let optimizedBuffer: Buffer;
      let mimeType: string;

      switch (format) {
        case 'webp':
          optimizedBuffer = await pipeline
            .webp({ quality, effort: 6 })
            .toBuffer();
          mimeType = 'image/webp';
          break;

        case 'jpeg':
          optimizedBuffer = await pipeline
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
          mimeType = 'image/jpeg';
          break;

        case 'png':
          optimizedBuffer = await pipeline
            .png({ quality, compressionLevel: 9 })
            .toBuffer();
          mimeType = 'image/png';
          break;

        default:
          throw new Error(`Formato não suportado: ${format}`);
      }

      const optimizedSize = optimizedBuffer.length;
      const savings = ((originalSize - optimizedSize) / originalSize) * 100;

      // Gerar hash para deduplicação
      const hash = crypto
        .createHash('sha256')
        .update(optimizedBuffer)
        .digest('hex');

      // Log removido para reduzir verbosidade

      return {
        buffer: optimizedBuffer,
        mimeType,
        originalSize,
        optimizedSize,
        savings,
        hash,
      };
    } catch (error) {
      logger.error('❌ Erro ao otimizar imagem', { error });
      
      // Fallback: retornar imagem original com hash
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      
      return {
        buffer,
        mimeType: 'application/octet-stream',
        originalSize,
        optimizedSize: originalSize,
        savings: 0,
        hash,
      };
    }
  }

  /**
   * Gera hash de um buffer para deduplicação
   */
  generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verifica se um arquivo é uma imagem
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Verifica se um arquivo é áudio
   */
  isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * Verifica se um arquivo é vídeo
   */
  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Otimiza múltiplas imagens em lote
   */
  async optimizeBatch(
    files: Array<{ buffer: Buffer; filename: string }>,
    options: OptimizationOptions = {}
  ): Promise<Map<string, OptimizationResult>> {
    const results = new Map<string, OptimizationResult>();
    const startTime = Date.now();

    logger.info(`🔄 Otimizando ${files.length} imagens em lote...`);

    // Processar em paralelo (máximo 5 por vez para não sobrecarregar)
    const BATCH_SIZE = 5;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          const result = await this.optimizeImage(file.buffer, options);
          return { filename: file.filename, result };
        })
      );

      batchResults.forEach(({ filename, result }) => {
        results.set(filename, result);
      });
    }

    const totalOriginalSize = Array.from(results.values()).reduce(
      (sum, r) => sum + r.originalSize,
      0
    );
    const totalOptimizedSize = Array.from(results.values()).reduce(
      (sum, r) => sum + r.optimizedSize,
      0
    );
    const totalSavings =
      ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100;

    const duration = Date.now() - startTime;

    logger.info('✅ Lote otimizado', {
      totalFiles: files.length,
      originalSize: `${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`,
      optimizedSize: `${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`,
      savings: `${totalSavings.toFixed(1)}%`,
      duration: `${(duration / 1000).toFixed(2)}s`,
    });

    return results;
  }

  /**
   * Detecta e remove duplicatas baseado em hash
   */
  detectDuplicates(
    results: Map<string, OptimizationResult>
  ): Map<string, string[]> {
    const hashMap = new Map<string, string[]>();

    results.forEach((result, filename) => {
      const existing = hashMap.get(result.hash) || [];
      existing.push(filename);
      hashMap.set(result.hash, existing);
    });

    // Filtrar apenas duplicatas (mais de 1 arquivo com mesmo hash)
    const duplicates = new Map<string, string[]>();
    hashMap.forEach((files, hash) => {
      if (files.length > 1) {
        duplicates.set(hash, files);
      }
    });

    if (duplicates.size > 0) {
      logger.info('🔍 Duplicatas detectadas', {
        uniqueHashes: duplicates.size,
        totalDuplicates: Array.from(duplicates.values()).reduce(
          (sum, files) => sum + files.length - 1,
          0
        ),
      });
    }

    return duplicates;
  }
}
