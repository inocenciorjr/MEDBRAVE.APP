/**
 * Extractor module for Hardworq
 * Captures questions from console.log
 */

import { Page } from 'puppeteer';
import { HardworqQuestion, ExtractionResult, ProvaMetadata } from './types';
import { logger } from './utils/logger';
import { HardworqNavigator } from './navigator';

export class HardworqExtractor {
  private questions: Map<number, HardworqQuestion> = new Map();
  private navigator: HardworqNavigator;

  constructor() {
    this.navigator = new HardworqNavigator();
  }

  /**
   * Extract all questions from a prova
   */
  async extractProva(page: Page, limit?: number): Promise<ExtractionResult> {
    const startTime = Date.now();
    this.questions.clear();

    // Setup console listener BEFORE navigating
    this.setupConsoleListener(page);

    // Get total questions
    const totalQuestions = await this.navigator.getTotalQuestions(page);
    const questionsToExtract = limit && limit > 0 ? Math.min(limit, totalQuestions) : totalQuestions;

    logger.info(`Extracting ${questionsToExtract} questions...`);

    // Navigate through each question
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;
    
    for (let i = 1; i <= questionsToExtract; i++) {
      try {
        logger.info(`[${i}/${questionsToExtract}] Navigating to question ${i}...`);
        
        await this.navigator.navigateToQuestion(page, i);
        
        // Wait a bit more to ensure console.log happens
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if question was captured
        if (!this.hasQuestionNumber(i)) {
          logger.warn(`Question ${i} not captured, retrying...`);
          await this.navigator.navigateToQuestion(page, i);
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // If still not captured after retry, count as failure
          if (!this.hasQuestionNumber(i)) {
            consecutiveFailures++;
            logger.warn(`Question ${i} still not captured (${consecutiveFailures}/${maxConsecutiveFailures} failures)`);
            
            // If we have too many consecutive failures, probably reached the end
            if (consecutiveFailures >= maxConsecutiveFailures) {
              logger.info(`Reached ${maxConsecutiveFailures} consecutive failures, stopping extraction`);
              break;
            }
          } else {
            consecutiveFailures = 0; // Reset on success
          }
        } else {
          consecutiveFailures = 0; // Reset on success
        }
        
      } catch (error) {
        logger.error(`Failed to extract question ${i}: ${(error as Error).message}`);
        consecutiveFailures++;
        
        if (consecutiveFailures >= maxConsecutiveFailures) {
          logger.info(`Too many errors, stopping extraction`);
          break;
        }
      }
    }

    const extractionTime = Date.now() - startTime;
    const questionsArray = Array.from(this.questions.values());

    // Extract prova metadata from first question
    const firstQuestion = questionsArray[0];
    if (!firstQuestion) {
      throw new Error('No questions extracted');
    }

    const provaMetadata: ProvaMetadata = {
      id: firstQuestion.prova.id,
      codigo: firstQuestion.prova.codigo,
      instituicao: firstQuestion.prova.instituicao,
      estado: firstQuestion.prova.estado,
      grupo: firstQuestion.prova.grupo,
      ano: firstQuestion.prova.ano,
      totalQuestoes: questionsArray.length,
    };

    const stats = {
      totalExtracted: questionsArray.length,
      withExplanation: questionsArray.filter((q) => q.explicacao_professor).length,
      withImages: questionsArray.filter((q) => q.imagem).length,
      anuladas: questionsArray.filter((q) => q.anulada).length,
    };

    logger.info('');
    logger.info('=== Extraction Complete ===');
    logger.info(`Total extracted: ${stats.totalExtracted}`);
    logger.info(`With explanation: ${stats.withExplanation}`);
    logger.info(`With images: ${stats.withImages}`);
    logger.info(`Anuladas: ${stats.anuladas}`);
    logger.info(`Time: ${(extractionTime / 1000).toFixed(2)}s`);

    return {
      prova: provaMetadata,
      questions: questionsArray,
      stats,
      extractionTime,
    };
  }

  /**
   * Setup console listener to capture questions
   */
  private setupConsoleListener(page: Page): void {
    logger.info('Setting up console listener...');

    page.on('console', async (msg) => {
      try {
        const text = msg.text();
        
        // Check if it's a question log (starts with "rawles ")
        if (text.startsWith('rawles ')) {
          // When console.log has an object, msg.text() returns "JSHandle@object"
          // We need to get the actual arguments
          const args = msg.args();
          
          if (args.length >= 2) {
            // First arg is "rawles", second is the object
            const questionHandle = args[1];
            const questionData = await questionHandle.jsonValue() as any;
            
            // Validate it's a question
            if (questionData && questionData.id && questionData.codigo && questionData.alternativas) {
              // Avoid duplicates (console.log happens 2x)
              if (!this.questions.has(questionData.id)) {
                this.questions.set(questionData.id, questionData as HardworqQuestion);
                logger.debug(`✅ Question ${questionData.codigo} captured (ID: ${questionData.id})`);
              }
            }
          } else {
            // Fallback: try to parse as JSON string
            const jsonStr = text.substring(7);
            const data: HardworqQuestion = JSON.parse(jsonStr);
            
            if (data.id && data.codigo && data.alternativas) {
              if (!this.questions.has(data.id)) {
                this.questions.set(data.id, data);
                logger.debug(`✅ Question ${data.codigo} captured (ID: ${data.id})`);
              }
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors
        logger.debug(`Failed to parse console log: ${msg.text().substring(0, 50)}...`);
      }
    });

    logger.info('✅ Console listener active');
  }

  /**
   * Check if a question number was captured
   */
  private hasQuestionNumber(questionNumber: number): boolean {
    // Check if any question has this number in its codigo
    // Try both with and without leading zero (e.g., "-01" or "-1")
    const paddedNumber = questionNumber.toString().padStart(2, '0');
    const unpaddedNumber = questionNumber.toString();
    
    return Array.from(this.questions.values()).some((q) =>
      q.codigo.endsWith(`-${paddedNumber}`) || q.codigo.endsWith(`-${unpaddedNumber}`)
    );
  }

  /**
   * Get captured questions
   */
  getQuestions(): HardworqQuestion[] {
    return Array.from(this.questions.values());
  }

  /**
   * Clear captured questions
   */
  clear(): void {
    this.questions.clear();
  }
}
