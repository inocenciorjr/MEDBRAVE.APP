import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { SCRAPER_CONFIG } from './config';
import { DownloadResult } from './types';
import { logger } from './utils/logger';
import { withRetry } from './utils/retry';

export interface DownloadOptions {
  outputDir: string;
  maxRetries: number;
  timeout: number;
  maxConcurrent: number;
}

export class ImageDownloader {
  private options: DownloadOptions;

  constructor(options?: Partial<DownloadOptions>) {
    this.options = {
      outputDir: options?.outputDir || SCRAPER_CONFIG.output.imagesDir,
      maxRetries: options?.maxRetries || SCRAPER_CONFIG.retry.maxAttempts,
      timeout: options?.timeout || 30000,
      maxConcurrent: options?.maxConcurrent || 5,
    };
  }

  /**
   * Download a single image
   */
  async downloadImage(url: string, filename?: string): Promise<string> {
    const finalFilename = filename || this.generateFilename(url);
    const outputPath = path.join(this.options.outputDir, finalFilename);

    // Check if file already exists
    try {
      await fs.access(outputPath);
      logger.debug(`Image already exists: ${finalFilename}`);
      return outputPath;
    } catch {
      // File doesn't exist, proceed with download
    }

    logger.debug(`Downloading image: ${url}`);

    const downloadFn = async () => {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.options.timeout,
        headers: {
          'User-Agent': SCRAPER_CONFIG.browser.userAgent,
        },
      });

      const buffer = Buffer.from(response.data);

      // Validate image
      if (!this.validateImage(buffer)) {
        throw new Error('Invalid image data');
      }

      // Ensure output directory exists
      await fs.mkdir(this.options.outputDir, { recursive: true });

      // Write file
      await fs.writeFile(outputPath, buffer);

      return outputPath;
    };

    return await withRetry(
      downloadFn,
      {
        maxAttempts: this.options.maxRetries,
        initialDelay: SCRAPER_CONFIG.retry.initialDelay,
        maxDelay: SCRAPER_CONFIG.retry.maxDelay,
        backoffMultiplier: SCRAPER_CONFIG.retry.backoffMultiplier,
      },
      (error, attempt) => {
        logger.warn(`Image download attempt ${attempt} failed: ${error.message}`);
      }
    );
  }

  /**
   * Download multiple images in parallel (with concurrency limit)
   */
  async downloadBatch(urls: string[]): Promise<DownloadResult[]> {
    logger.info(`Downloading ${urls.length} images...`);

    const results: DownloadResult[] = [];
    const chunks = this.chunkArray(urls, this.options.maxConcurrent);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (url) => {
          try {
            const localPath = await this.downloadImage(url);
            return {
              url,
              success: true,
              localPath,
            };
          } catch (error) {
            logger.error(`Failed to download image ${url}: ${(error as Error).message}`);
            return {
              url,
              success: false,
              error: (error as Error).message,
            };
          }
        })
      );

      results.push(...chunkResults);
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    logger.info(`Downloaded ${successCount} images, ${failCount} failed`);

    return results;
  }

  /**
   * Generate filename from URL using hash
   */
  private generateFilename(url: string): string {
    const hash = createHash('md5').update(url).digest('hex');
    const ext = this.getExtensionFromUrl(url) || 'jpg';
    return `img-${hash}.${ext}`;
  }

  /**
   * Extract file extension from URL
   */
  private getExtensionFromUrl(url: string): string | null {
    const match = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Validate image buffer
   */
  private validateImage(buffer: Buffer): boolean {
    // Check minimum size (1KB)
    if (buffer.length < 1024) {
      return false;
    }

    // Check for common image signatures
    const signatures = [
      [0xff, 0xd8, 0xff], // JPEG
      [0x89, 0x50, 0x4e, 0x47], // PNG
      [0x47, 0x49, 0x46], // GIF
      [0x42, 0x4d], // BMP
      [0x49, 0x49, 0x2a, 0x00], // TIFF (little-endian)
      [0x4d, 0x4d, 0x00, 0x2a], // TIFF (big-endian)
    ];

    return signatures.some((signature) => {
      return signature.every((byte, index) => buffer[index] === byte);
    });
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
