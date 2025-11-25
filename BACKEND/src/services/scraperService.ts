import { spawn } from 'child_process';
import path from 'path';
import { validateAndSanitizeUrl } from '../utils/urlSanitizer';
import { sanitizeQuestions, sanitizeMetadata } from '../utils/contentSanitizer';

// Error types
export class ScraperTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScraperTimeoutError';
  }
}

export class NoQuestionsFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoQuestionsFoundError';
  }
}

export class AuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

// Interfaces
export interface ScraperOptions {
  timeout?: number;        // Timeout in seconds (default: 300)
  limit?: number;          // Limit of questions (default: 0 = all)
  downloadImages?: boolean; // Download images (default: true)
  verbose?: boolean;       // Verbose logging (default: false)
}

export interface ExtractedQuestionsResult {
  questions: any[];
  metadata: {
    source: string;
    institution?: string;
    year?: number;
    totalQuestions: number;
    extractionTime: number; // ms
  };
  stats: {
    questionsExtracted: number;
    questionsWithAnswers: number;
    imagesFound: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class ScraperService {
  constructor() {
    // ScraperService initialized
  }

  /**
   * Validates if URL is accessible and has correct format
   * Uses URL sanitizer to prevent SSRF attacks
   */
  async validateUrl(url: string): Promise<ValidationResult> {
    // First, sanitize and validate URL (prevents SSRF)
    const sanitizationResult = validateAndSanitizeUrl(url);
    
    if (!sanitizationResult.isValid) {
      return {
        valid: false,
        error: sanitizationResult.error || 'Invalid URL',
      };
    }

    // Use sanitized URL for further checks
    const sanitizedUrl = sanitizationResult.sanitizedUrl!;
    
    try {
      const urlObj = new URL(sanitizedUrl);

      // Check if URL contains /demo/ or /questao/ or /prova/
      const hasValidPath = urlObj.pathname.includes('/demo/') || 
                          urlObj.pathname.includes('/questao/') ||
                          urlObj.pathname.includes('/prova/');
      
      if (!hasValidPath) {
        return {
          valid: false,
          error: 'URL must contain /demo/, /questao/, or /prova/ path.',
        };
      }

      // Test URL accessibility with HEAD request
      try {
        const response = await fetch(sanitizedUrl, { 
          method: 'HEAD',
          redirect: 'manual', // Don't follow redirects automatically
        });
        
        if (!response.ok && response.status !== 301 && response.status !== 302) {
          return {
            valid: false,
            error: `URL returned status ${response.status}`,
          };
        }
      } catch (fetchError) {
        return {
          valid: false,
          error: `URL is not accessible: ${(fetchError as Error).message}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid URL format: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Extracts questions from a single URL
   */
  async extractFromUrl(
    url: string,
    options: ScraperOptions = {}
  ): Promise<ExtractedQuestionsResult> {
    const startTime = Date.now();
    
    // Validate URL first
    const validation = await this.validateUrl(url);
    if (!validation.valid) {
      throw new InvalidUrlError(validation.error || 'Invalid URL');
    }

    // Prepare command arguments
    const args = [
      'run',
      'scrape',
      '--',
      url,
    ];

    if (options.limit && options.limit > 0) {
      args.push('-l', options.limit.toString());
    }

    if (options.verbose) {
      args.push('-v');
    }

    if (options.downloadImages !== false) {
      args.push('-d');
    }

    const timeout = (options.timeout || 300) * 1000; // Convert to ms

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Spawn scraper process
      const scraperProcess = spawn('npm', args, {
        cwd: path.join(__dirname, '../..'),
        shell: true,
      });

      // Setup timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        scraperProcess.kill('SIGTERM');
        reject(new ScraperTimeoutError(`Extraction timeout after ${options.timeout || 300}s`));
      }, timeout);

      // Capture stdout
      scraperProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Capture stderr
      scraperProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      scraperProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (timedOut) return; // Already rejected

        if (code !== 0) {
          // Check for specific error patterns
          if (stderr.includes('AUTH_REQUIRED') || stderr.includes('login')) {
            reject(new AuthRequiredError('Content requires authentication'));
          } else if (stderr.includes('NO_QUESTIONS') || stdout.includes('0 valid')) {
            reject(new NoQuestionsFoundError('No questions found on page'));
          } else {
            reject(new Error(`Scraper failed with code ${code}: ${stderr}`));
          }
          return;
        }

        try {
          // Parse output to find JSON file path
          const outputMatch = stdout.match(/Output file: (.+\.json)/);
          if (!outputMatch) {
            reject(new Error('Could not find output file in scraper output'));
            return;
          }

          const outputPath = outputMatch[1].trim();
          
          // Read the generated JSON file
          const fs = require('fs');
          const questionsData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

          if (!Array.isArray(questionsData) || questionsData.length === 0) {
            reject(new NoQuestionsFoundError('No questions extracted'));
            return;
          }

          // Extract metadata from first question
          const firstQuestion = questionsData[0];
          const extractionTime = Date.now() - startTime;

          // Sanitize questions to prevent XSS
          const sanitizedQuestions = sanitizeQuestions(questionsData);

          const result: ExtractedQuestionsResult = {
            questions: sanitizedQuestions,
            metadata: sanitizeMetadata({
              source: firstQuestion.source || 'Unknown',
              institution: firstQuestion.source,
              year: firstQuestion.year,
              totalQuestions: sanitizedQuestions.length,
              extractionTime,
            }),
            stats: {
              questionsExtracted: sanitizedQuestions.length,
              questionsWithAnswers: sanitizedQuestions.filter((q: any) => 
                q.correct_alternative_id
              ).length,
              imagesFound: sanitizedQuestions.reduce((sum: number, q: any) => 
                sum + (q.image_urls?.length || 0), 0
              ),
            },
          };

          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse scraper output: ${(error as Error).message}`));
        }
      });

      // Handle process errors
      scraperProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start scraper: ${error.message}`));
      });
    });
  }

  /**
   * Extract questions with progress callbacks for real-time updates
   */
  async extractFromUrlWithProgress(
    url: string,
    options: ScraperOptions = {},
    onProgress: (progress: any) => void
  ): Promise<ExtractedQuestionsResult> {
    const startTime = Date.now();
    
    // Validate URL first
    onProgress({
      status: 'validating',
      message: 'Validando URL...',
      currentQuestion: 0,
      totalQuestions: 0,
    });

    const validation = await this.validateUrl(url);
    if (!validation.valid) {
      throw new InvalidUrlError(validation.error || 'Invalid URL');
    }

    onProgress({
      status: 'starting',
      message: 'Iniciando navegador...',
      currentQuestion: 0,
      totalQuestions: 0,
    });

    // Prepare command arguments
    const args = ['run', 'scrape', '--', url];
    if (options.limit && options.limit > 0) args.push('-l', options.limit.toString());
    if (options.verbose) args.push('-v');
    if (options.downloadImages !== false) args.push('-d');

    const timeout = (options.timeout || 300) * 1000;

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let currentQuestion = 0;
      let totalQuestions = 0;

      const scraperProcess = spawn('npm', args, {
        cwd: path.join(__dirname, '../..'),
        shell: true,
      });

      const timeoutId = setTimeout(() => {
        timedOut = true;
        scraperProcess.kill('SIGTERM');
        reject(new ScraperTimeoutError(`Extraction timeout after ${options.timeout || 300}s`));
      }, timeout);

      // Parse stdout for progress
      scraperProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;

        // Parse linhas de progresso
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          
          // PROGRESS_TOTAL:120
          if (line.startsWith('PROGRESS_TOTAL:')) {
            totalQuestions = parseInt(line.split(':')[1]);
            onProgress({
              status: 'starting',
              message: `Encontradas ${totalQuestions} questões. Iniciando extração...`,
              currentQuestion: 0,
              totalQuestions,
            });
            continue;
          }

          // PROGRESS_CURRENT:86:120
          if (line.startsWith('PROGRESS_CURRENT:')) {
            const parts = line.split(':');
            currentQuestion = parseInt(parts[1]);
            totalQuestions = parseInt(parts[2]);
            onProgress({
              status: 'extracting',
              message: `Extraindo questão ${currentQuestion} de ${totalQuestions}...`,
              currentQuestion,
              totalQuestions,
            });
            continue;
          }

          // PROGRESS_IMAGES:6
          if (line.startsWith('PROGRESS_IMAGES:')) {
            const imagesCount = parseInt(line.split(':')[1]);
            onProgress({
              status: 'downloading_images',
              message: `Baixando ${imagesCount} imagens...`,
              currentQuestion,
              totalQuestions,
              imagesCount,
            });
            continue;
          }

          // PROGRESS_IMAGE_FOUND:5
          if (line.startsWith('PROGRESS_IMAGE_FOUND:')) {
            const questionNumber = parseInt(line.split(':')[1]);
            onProgress({
              status: 'image_found',
              message: `Imagem encontrada na questão ${questionNumber}`,
              currentQuestion,
              totalQuestions,
              questionWithImage: questionNumber,
            });
            continue;
          }
        }
      });

      scraperProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      scraperProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        if (timedOut) return;

        if (code !== 0) {
          if (stderr.includes('AUTH_REQUIRED') || stderr.includes('login')) {
            reject(new AuthRequiredError('Content requires authentication'));
          } else if (stderr.includes('NO_QUESTIONS') || stdout.includes('0 valid')) {
            reject(new NoQuestionsFoundError('No questions found on page'));
          } else {
            reject(new Error(`Scraper failed with code ${code}: ${stderr}`));
          }
          return;
        }

        try {
          const outputMatch = stdout.match(/Output file: (.+\.json)/);
          if (!outputMatch) {
            reject(new Error('Could not find output file in scraper output'));
            return;
          }

          const outputPath = outputMatch[1].trim();
          const fs = require('fs');
          const rawData = fs.readFileSync(outputPath, 'utf-8');
          const parsedData = JSON.parse(rawData);

          const extractionTime = Date.now() - startTime;

          // O scraper salva um array de questões diretamente, não um objeto com propriedade 'questions'
          const questionsArray = Array.isArray(parsedData) ? parsedData : (parsedData.questions || []);

          const result: ExtractedQuestionsResult = {
            questions: sanitizeQuestions(questionsArray),
            metadata: sanitizeMetadata({
              source: url,
              institution: parsedData.metadata?.institution || questionsArray[0]?.source,
              year: parsedData.metadata?.year || questionsArray[0]?.year,
              totalQuestions: questionsArray.length,
              extractionTime,
            }),
            stats: {
              questionsExtracted: questionsArray.length,
              questionsWithAnswers: questionsArray.filter((q: any) => q.correct_alternative_id !== undefined).length,
              imagesFound: questionsArray.filter((q: any) => q.image_urls && q.image_urls.length > 0).length,
            },
          };

          onProgress({
            status: 'complete',
            message: `✅ Extração concluída! ${result.stats.questionsExtracted} questões extraídas.`,
            currentQuestion: result.stats.questionsExtracted,
            totalQuestions: result.stats.questionsExtracted,
          });

          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse scraper output: ${(error as Error).message}`));
        }
      });

      scraperProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start scraper: ${error.message}`));
      });
    });
  }

  /**
   * Converts scraper Question format to BulkQuestion format
   */
  convertToBulkFormat(scraperQuestions: any[]): any[] {
    return scraperQuestions.map((q, index) => {
      // Find correct alternative index
      const correctIndex = q.alternatives?.findIndex((alt: any) => alt.isCorrect) ?? -1;
      
      // Map alternatives to simple string array
      const alternativas = q.alternatives?.map((alt: any) => alt.text) || [];
      
      return {
        numero: `Q${index + 1}`,
        enunciado: q.statement || '',
        alternativas,
        correta: correctIndex >= 0 ? correctIndex : undefined,
        dificuldade: this.mapDifficulty(q.difficulty),
        status: q.status === 'PUBLISHED' ? 'Publicada' : 'Rascunho',
        tags: q.tags || [],
        filterIds: q.filter_ids || [],
        subFilterIds: q.sub_filter_ids || [],
        explicacao: q.explanation || '',
        imagem: q.image_urls?.[0], // First image URL
        tempId: `temp-scraper-${Date.now()}-${index}`,
        aiGenerated: false,
        isAnnulled: q.is_annulled || false,
        isOutdated: false,
      };
    });
  }

  /**
   * Maps scraper difficulty to bulk format
   */
  private mapDifficulty(difficulty?: string): string {
    const map: Record<string, string> = {
      'EASY': 'Fácil',
      'MEDIUM': 'Média',
      'HARD': 'Difícil',
    };
    return map[difficulty || 'MEDIUM'] || 'Média';
  }
}

export default new ScraperService();
