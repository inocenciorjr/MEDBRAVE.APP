/**
 * Image Downloader for Hardworq
 * Downloads images locally like the original scraper
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { HARDWORQ_CONFIG } from './config';
import { logger } from './utils/logger';

export interface DownloadResult {
  url: string;
  success: boolean;
  localPath?: string;
  error?: string;
}

export class HardworqImageDownloader {
  private outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'output', 'scraped', 'images');
  }

  /**
   * Download a single image
   */
  async downloadImage(url: string): Promise<string> {
    const filename = this.generateFilename(url);
    const outputPath = path.join(this.outputDir, filename);

    // Check if file already exists
    try {
      await fs.access(outputPath);
      logger.debug(`Image already exists: ${filename}`);
      return outputPath;
    } catch {
      // File doesn't exist, proceed with download
    }

    logger.debug(`Downloading image: ${url}`);

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': HARDWORQ_CONFIG.browser.userAgent,
        },
      });

      const buffer = Buffer.from(response.data);

      // Validate image
      if (!this.validateImage(buffer)) {
        throw new Error('Invalid image data');
      }

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Write file
      await fs.writeFile(outputPath, buffer);

      logger.debug(`✅ Image downloaded: ${filename}`);
      return outputPath;
    } catch (error) {
      logger.error(`Failed to download image ${url}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Download multiple images in parallel
   */
  async downloadBatch(urls: string[]): Promise<DownloadResult[]> {
    if (urls.length === 0) {
      return [];
    }

    logger.info(`Downloading ${urls.length} images...`);

    const results: DownloadResult[] = [];

    for (const url of urls) {
      try {
        const localPath = await this.downloadImage(url);
        results.push({
          url,
          success: true,
          localPath,
        });
      } catch (error) {
        results.push({
          url,
          success: false,
          error: (error as Error).message,
        });
      }
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
}
