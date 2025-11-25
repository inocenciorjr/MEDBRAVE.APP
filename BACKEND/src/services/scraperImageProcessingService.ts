/**
 * 🖼️ SERVIÇO DE PROCESSAMENTO DE IMAGENS DO SCRAPER
 * 
 * Processa imagens extraídas pelo scraper:
 * - Faz upload para R2 com estrutura de pastas organizada
 * - Substitui caminhos locais por URLs do R2
 * - Deleta imagens locais após upload
 * - Atualiza JSON de backup com URLs do R2
 */

import fs from 'fs/promises';
import path from 'path';
import { R2Service } from './r2Service';
import logger from '../utils/logger';

export interface ProcessedQuestion {
  statement: string;
  image_urls: string[];
  [key: string]: any;
}

export interface ProcessImageResult {
  success: boolean;
  originalPath: string;
  r2Url?: string;
  error?: string;
}

export interface ProcessQuestionsResult {
  success: boolean;
  questionsProcessed: number;
  imagesUploaded: number;
  imagesFailed: number;
  localImagesDeleted: number;
  jsonBackupCreated: boolean;
  errors: string[];
}

export class ScraperImageProcessingService {
  private r2Service: R2Service;

  constructor() {
    this.r2Service = new R2Service();
  }

  /**
   * Processa todas as questões: faz upload das imagens para R2 e atualiza referências
   */
  async processQuestions(
    questions: ProcessedQuestion[],
    examName: string,
    examYear: number,
    originalJsonPath?: string,
  ): Promise<ProcessQuestionsResult> {
    const result: ProcessQuestionsResult = {
      success: true,
      questionsProcessed: 0,
      imagesUploaded: 0,
      imagesFailed: 0,
      localImagesDeleted: 0,
      jsonBackupCreated: false,
      errors: [],
    };

    try {
      logger.info(`[ScraperImageProcessing] Processing ${questions.length} questions`);

      // Gerar nome da pasta no R2
      const r2Folder = this.generateR2Folder(examName, examYear);
      logger.info(`[ScraperImageProcessing] R2 folder: ${r2Folder}`);

      // Processar cada questão
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionNumber = i + 1;

        try {
          await this.processQuestion(question, questionNumber, r2Folder, result);
          result.questionsProcessed++;
        } catch (error) {
          const errorMsg = `Failed to process question ${questionNumber}: ${(error as Error).message}`;
          logger.error(`[ScraperImageProcessing] ${errorMsg}`);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // Criar backup JSON com URLs do R2
      if (originalJsonPath && result.imagesUploaded > 0) {
        try {
          await this.createBackupJson(questions, originalJsonPath);
          result.jsonBackupCreated = true;
          logger.info(`[ScraperImageProcessing] Backup JSON created`);
        } catch (error) {
          const errorMsg = `Failed to create backup JSON: ${(error as Error).message}`;
          logger.error(`[ScraperImageProcessing] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      logger.info(`[ScraperImageProcessing] Processing complete:`, {
        questionsProcessed: result.questionsProcessed,
        imagesUploaded: result.imagesUploaded,
        imagesFailed: result.imagesFailed,
        localImagesDeleted: result.localImagesDeleted,
      });

      return result;
    } catch (error) {
      logger.error(`[ScraperImageProcessing] Fatal error:`, error);
      result.success = false;
      result.errors.push((error as Error).message);
      return result;
    }
  }

  /**
   * Processa uma única questão
   */
  private async processQuestion(
    question: ProcessedQuestion,
    questionNumber: number,
    r2Folder: string,
    result: ProcessQuestionsResult,
  ): Promise<void> {
    // Extrair imagens locais do statement
    const localImages = this.extractLocalImagesFromStatement(question.statement);

    if (localImages.length === 0) {
      logger.debug(`[ScraperImageProcessing] Question ${questionNumber} has no local images`);
      return;
    }

    logger.info(`[ScraperImageProcessing] Processing ${localImages.length} images for question ${questionNumber}`);

    // Processar cada imagem
    for (let imgIndex = 0; imgIndex < localImages.length; imgIndex++) {
      const localImagePath = localImages[imgIndex];

      try {
        // Fazer upload para R2
        const r2Url = await this.uploadImageToR2(
          localImagePath,
          questionNumber,
          imgIndex,
          r2Folder,
        );

        // Substituir no statement
        question.statement = question.statement.replace(localImagePath, r2Url);

        // Atualizar image_urls
        if (question.image_urls) {
          question.image_urls = question.image_urls.map((url) => {
            if (url.includes(path.basename(localImagePath))) {
              return r2Url;
            }
            return url;
          });
        }

        // Deletar imagem local
        await this.deleteLocalImage(localImagePath);
        result.localImagesDeleted++;

        result.imagesUploaded++;
        logger.info(`[ScraperImageProcessing] Uploaded image ${imgIndex + 1}/${localImages.length} for question ${questionNumber}`);
      } catch (error) {
        const errorMsg = `Failed to process image ${localImagePath}: ${(error as Error).message}`;
        logger.error(`[ScraperImageProcessing] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.imagesFailed++;
      }
    }
  }

  /**
   * Extrai caminhos de imagens locais do statement
   */
  private extractLocalImagesFromStatement(statement: string): string[] {
    const regex = /\/api\/temp-images\/([^"']+)/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(statement)) !== null) {
      matches.push(`/api/temp-images/${match[1]}`);
    }

    return matches;
  }

  /**
   * Faz upload de uma imagem local para o R2
   */
  private async uploadImageToR2(
    localImagePath: string,
    questionNumber: number,
    imageIndex: number,
    r2Folder: string,
  ): Promise<string> {
    // Extrair nome do arquivo
    const filename = localImagePath.split('/').pop() || '';
    
    // Caminho completo no sistema de arquivos
    const fullPath = path.join(
      __dirname,
      '../../output/scraped/images',
      filename,
    );

    // Ler arquivo
    const fileData = await fs.readFile(fullPath);

    // Determinar content-type
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
    };
    const contentType = contentTypeMap[ext] || 'image/jpeg';

    // Gerar nome do arquivo no R2
    const questionNumberPadded = questionNumber.toString().padStart(2, '0');
    const r2Filename = imageIndex === 0
      ? `q${questionNumberPadded}${ext}`
      : `q${questionNumberPadded}-img${imageIndex + 1}${ext}`;

    // Upload para R2 com nome exato (sem timestamp/randomId)
    const uploadResult = await this.r2Service.uploadFile(
      fileData,
      r2Filename,
      contentType,
      r2Folder,
      {
        questionNumber: questionNumber.toString(),
        imageIndex: imageIndex.toString(),
        originalFilename: filename,
      },
      true, // useExactFilename
    );

    logger.info(`[ScraperImageProcessing] Uploaded to R2: ${uploadResult.publicUrl}`);

    return uploadResult.publicUrl;
  }

  /**
   * Deleta imagem local
   */
  private async deleteLocalImage(localImagePath: string): Promise<void> {
    const filename = localImagePath.split('/').pop() || '';
    const fullPath = path.join(
      __dirname,
      '../../output/scraped/images',
      filename,
    );

    try {
      await fs.unlink(fullPath);
      logger.debug(`[ScraperImageProcessing] Deleted local image: ${filename}`);
    } catch (error) {
      logger.warn(`[ScraperImageProcessing] Failed to delete local image ${filename}: ${(error as Error).message}`);
    }
  }

  /**
   * Cria backup JSON com URLs do R2
   */
  private async createBackupJson(
    questions: ProcessedQuestion[],
    originalJsonPath: string,
  ): Promise<void> {
    // Gerar novo nome do arquivo
    const dir = path.dirname(originalJsonPath);
    const basename = path.basename(originalJsonPath, '.json');
    const newJsonPath = path.join(dir, `${basename}-final.json`);

    // Salvar novo JSON
    await fs.writeFile(newJsonPath, JSON.stringify(questions, null, 2), 'utf-8');

    // Deletar JSON original
    try {
      await fs.unlink(originalJsonPath);
      logger.info(`[ScraperImageProcessing] Deleted original JSON: ${originalJsonPath}`);
    } catch (error) {
      logger.warn(`[ScraperImageProcessing] Failed to delete original JSON: ${(error as Error).message}`);
    }

    logger.info(`[ScraperImageProcessing] Created backup JSON: ${newJsonPath}`);
  }

  /**
   * Gera nome da pasta no R2 baseado no exame
   */
  private generateR2Folder(examName: string, examYear: number): string {
    const normalizedName = examName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    return `questions/${normalizedName}-${examYear}`;
  }
}

export const scraperImageProcessingService = new ScraperImageProcessingService();
