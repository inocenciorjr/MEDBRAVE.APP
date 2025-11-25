import { Browser, Page } from 'puppeteer';
import { SCRAPER_CONFIG } from './config';
import { logger } from './utils/logger';
import { sleep, withRetry } from './utils/retry';

export class CloudflareBlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudflareBlockError';
  }
}

export class PageLoadTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PageLoadTimeoutError';
  }
}

export class SelectorNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SelectorNotFoundError';
  }
}

export class MedicalExamScraper {
  private browser: Browser;
  private page: Page | null = null;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  /**
   * Initialize scraper by creating a new page
   */
  async initialize(): Promise<void> {
    logger.info('Initializing scraper...');
    this.page = await this.browser.newPage();

    // Set viewport
    await this.page.setViewport(SCRAPER_CONFIG.browser.viewport);

    // Set user agent
    await this.page.setUserAgent(SCRAPER_CONFIG.browser.userAgent);

    // Set extra HTTP headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Set default timeout
    this.page.setDefaultTimeout(SCRAPER_CONFIG.browser.timeout);

    logger.info('Scraper initialized successfully');
  }

  /**
   * Navigate to exam URL and wait for page load
   */
  async navigateToExam(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    logger.info(`Navigating to URL: ${url}`);

    const navigateFn = async () => {
      try {
        await this.page!.goto(url, {
          waitUntil: 'domcontentloaded', // Faster than networkidle2
          timeout: 30000, // 30 seconds timeout
        });
      } catch (error) {
        if ((error as Error).message.includes('timeout')) {
          throw new PageLoadTimeoutError(`Page load timeout after 30s`);
        }
        throw error;
      }
    };

    await withRetry(
      navigateFn,
      {
        maxAttempts: 2, // Only 2 attempts instead of 3
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
      },
      (error, attempt) => {
        logger.warn(`Navigation attempt ${attempt} failed: ${error.message}`);
      }
    );

    logger.info('Page loaded successfully');
  }

  /**
   * Wait for Cloudflare challenge to resolve
   */
  async waitForCloudflare(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    logger.info('Checking for Cloudflare challenge...');

    try {
      // Check if Cloudflare challenge is present
      const cloudflareDetected = await this.page.evaluate(() => {
        const title = document.title.toLowerCase();
        const body = document.body.innerText.toLowerCase();
        
        return (
          title.includes('just a moment') ||
          title.includes('checking your browser') ||
          title.includes('attention required') ||
          body.includes('cloudflare') ||
          body.includes('checking your browser') ||
          body.includes('ddos protection')
        );
      });

      if (cloudflareDetected) {
        logger.info('Cloudflare challenge detected. Waiting for resolution...');
        await sleep(SCRAPER_CONFIG.delays.cloudflareWait);

        // Wait for challenge to complete
        try {
          await this.page.waitForFunction(
            () => {
              const title = document.title.toLowerCase();
              const body = document.body.innerText.toLowerCase();
              
              return !(
                title.includes('just a moment') ||
                title.includes('checking your browser') ||
                title.includes('attention required') ||
                body.includes('checking your browser')
              );
            },
            { timeout: 30000 }
          );

          logger.info('Cloudflare challenge bypassed successfully');
        } catch (error) {
          throw new CloudflareBlockError('Failed to bypass Cloudflare challenge');
        }
      } else {
        logger.info('No Cloudflare challenge detected');
      }
    } catch (error) {
      if (error instanceof CloudflareBlockError) {
        throw error;
      }
      logger.error('Error checking for Cloudflare:', error);
      throw error;
    }
  }

  /**
   * Get question URLs from overview page
   */
  async getQuestionUrls(): Promise<string[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    logger.info('Detecting question URLs...');

    // Extract question links from the page
    const questionUrls = await this.page.evaluate(() => {
      // Try multiple selectors
      let links = Array.from(document.querySelectorAll('table a[href*="/questao/"]'));
      
      if (links.length === 0) {
        // Try finding links in question navigation grid
        links = Array.from(document.querySelectorAll('.questoes a[href*="/questao/"]'));
      }
      
      if (links.length === 0) {
        // Try any link with /questao/ in href
        links = Array.from(document.querySelectorAll('a[href*="/questao/"]'));
      }
      
      // Filter out navigation links (próxima, anterior, etc)
      const filteredLinks = links.filter(link => {
        const text = link.textContent?.toLowerCase() || '';
        
        // Excluir links de navegação
        if (text.includes('próxima') || text.includes('anterior') || 
            text.includes('voltar') || text.includes('início')) {
          return false;
        }
        
        // Manter apenas links que parecem ser números de questões
        // ou que estão em tabelas/grids de questões
        return true;
      });
      
      return filteredLinks.map(link => (link as HTMLAnchorElement).href);
    });

    if (questionUrls.length > 0) {
      // Remove duplicates
      const uniqueUrls = [...new Set(questionUrls)];
      
      // Extrair o identificador da prova da URL atual
      // Ex: /prova/550/sus-sp-sp-2015-r1-1 -> sus-sp-sp-2015-r1-1
      const currentUrl = this.page?.url() || '';
      const examIdMatch = currentUrl.match(/\/prova\/\d+\/([^/?]+)/);
      const examId = examIdMatch?.[1];
      
      // Filtrar URLs que pertencem à mesma prova
      const filteredUrls = examId 
        ? uniqueUrls.filter(url => url.includes(examId))
        : uniqueUrls;
      
      logger.info(`Found ${filteredUrls.length} question URLs (${uniqueUrls.length} before filtering)`);
      return filteredUrls;
    }

    logger.warn('Could not find question URLs');
    return [];
  }

  /**
   * Extract current question data from the page
   */
  async extractCurrentQuestion(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Get page HTML content with timeout
    const html = await Promise.race([
      this.page.content(),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout getting page content')), 10000)
      )
    ]);

    return html;
  }

  /**
   * Extract all questions by navigating to each question URL
   */
  async extractAllQuestions(limit?: number): Promise<string[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    logger.info('Extracting all questions...');

    // Get all question URLs from overview page
    let questionUrls = await this.getQuestionUrls();
    
    if (questionUrls.length === 0) {
      logger.warn('No question URLs found');
      return [];
    }

    // Apply limit if specified
    if (limit && limit > 0) {
      questionUrls = questionUrls.slice(0, limit);
      logger.info(`Limiting extraction to ${limit} questions`);
    }

    logger.info(`Found ${questionUrls.length} questions to extract`);
    
    // Enviar progresso via stdout (flush imediato para SSE)
    process.stdout.write(`PROGRESS_TOTAL:${questionUrls.length}\n`);

    const questionHtmls: string[] = [];

    for (let i = 0; i < questionUrls.length; i++) {
      const questionUrl = questionUrls[i];
      
      try {
        logger.info(`Extracting question ${i + 1}/${questionUrls.length}...`);
        
        // Enviar progresso via stdout (flush imediato para SSE)
        process.stdout.write(`PROGRESS_CURRENT:${i + 1}:${questionUrls.length}\n`);
        logger.debug(`URL: ${questionUrl}`);

        // Wrap entire extraction in timeout (max 15 seconds per question)
        await Promise.race([
          (async () => {
            // Navigate to question URL with timeout
            logger.debug('Navigating to question...');
            await this.navigateToExam(questionUrl);
            
            logger.debug('Checking for Cloudflare...');
            await this.waitForCloudflare();

            // Try to reveal correct answer
            logger.debug('Revealing correct answer...');
            await this.revealCorrectAnswer();

            // Extract current question HTML
            logger.debug('Extracting HTML content...');
            const html = await this.extractCurrentQuestion();
            questionHtmls.push(html);
            
            // Check if question has images
            const hasImage = this.page ? await this.page.evaluate(() => {
              const container = document.querySelector('.question, .questao, .pergunta');
              if (!container) return false;
              const img = container.querySelector('img');
              return img !== null;
            }) : false;
            
            if (hasImage) {
              // Enviar progresso de imagem encontrada
              process.stdout.write(`PROGRESS_IMAGE_FOUND:${i + 1}\n`);
            }
            
            logger.debug(`Question ${i + 1} extracted successfully`);
          })(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Question extraction timeout (15s)')), 15000)
          )
        ]);

        // Shorter delay between questions (1-2 seconds)
        if (i < questionUrls.length - 1) {
          const delay = Math.floor(Math.random() * 1000) + 1000;
          logger.debug(`Waiting ${delay}ms before next question...`);
          await sleep(delay);
        }

      } catch (error) {
        logger.error(`Failed to extract question ${i + 1}: ${(error as Error).message}`);
        logger.error(`Stack: ${(error as Error).stack}`);
        // Push empty string to maintain index alignment
        questionHtmls.push('');
        
        // Try to recover by creating new page
        try {
          logger.warn('Attempting to recover by creating new page...');
          if (this.page) {
            await this.page.close();
          }
          this.page = await this.browser.newPage();
          await this.page.setViewport(SCRAPER_CONFIG.browser.viewport);
          await this.page.setUserAgent(SCRAPER_CONFIG.browser.userAgent);
          logger.info('Page recovered successfully');
        } catch (recoveryError) {
          logger.error('Failed to recover page:', recoveryError);
        }
        
        // Continue with next question
      }
    }

    logger.info(`Successfully extracted ${questionHtmls.length}/${questionUrls.length} questions`);

    return questionHtmls;
  }



  /**
   * Extract questions sequentially starting from current page
   */
  async extractSequentialQuestions(limit: number = 5): Promise<string[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    logger.info(`Found ${limit} questions to extract`);
    logger.info(`Extracting up to ${limit} questions sequentially...`);
    
    // Enviar progresso via stdout (flush imediato para SSE)
    process.stdout.write(`PROGRESS_TOTAL:${limit}\n`);
    
    const questionHtmls: string[] = [];

    for (let i = 0; i < limit; i++) {
      try {
        logger.info(`Extracting question ${i + 1}/${limit}...`);
        
        // Enviar progresso via stdout (flush imediato para SSE)
        process.stdout.write(`PROGRESS_CURRENT:${i + 1}:${limit}\n`);

        // Try to reveal correct answer by clicking "Responder" button
        await this.revealCorrectAnswer();

        // Extract current question (now with correct answer visible)
        const html = await this.page.content();
        questionHtmls.push(html);

        // Check if question has images
        const hasImage = this.page ? await this.page.evaluate(() => {
          const container = document.querySelector('.question, .questao, .pergunta');
          if (!container) return false;
          const img = container.querySelector('img');
          return img !== null;
        }) : false;
        
        if (hasImage) {
          // Enviar progresso de imagem encontrada
          process.stdout.write(`PROGRESS_IMAGE_FOUND:${i + 1}\n`);
        }

        // Try to find and click "Próxima" button
        if (i < limit - 1) {
          const nextUrl = await this.page.evaluate(() => {
            // Find "Próxima" button
            const links = Array.from(document.querySelectorAll('a'));
            const nextButton = links.find(link => 
              link.textContent?.includes('Próxima') || 
              link.textContent?.includes('próxima')
            );
            
            if (nextButton) {
              return (nextButton as HTMLAnchorElement).href;
            }
            return null;
          });

          if (!nextUrl) {
            logger.info('No more questions available (no "Próxima" button found)');
            break;
          }

          // Navigate to next question
          await this.navigateToExam(nextUrl);
          await this.waitForCloudflare();

          // Small delay
          await sleep(1000);
        }

      } catch (error) {
        logger.error(`Failed to extract question ${i + 1}: ${(error as Error).message}`);
        break;
      }
    }

    logger.info(`Successfully extracted ${questionHtmls.length} questions sequentially`);
    return questionHtmls;
  }

  /**
   * Try to reveal correct answer by selecting first option and clicking "Responder" button
   */
  async revealCorrectAnswer(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      logger.info('Attempting to reveal correct answer...');

      // Check if answer is already revealed (has alert-success class)
      const alreadyRevealed = await this.page.evaluate(() => {
        return document.querySelector('.radio.alert-success') !== null;
      });

      if (alreadyRevealed) {
        logger.info('Answer already revealed, skipping...');
        return;
      }

      // Select first radio button and click "Responder"
      const result = await this.page.evaluate(() => {
        // Find first radio button
        const firstRadio = document.querySelector('input[type="radio"][name="choice"]') as HTMLInputElement;
        if (!firstRadio) {
          return { success: false, reason: 'No radio button found' };
        }

        // Select it
        firstRadio.checked = true;

        // Find and click "Responder" button
        const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
        const responderButton = buttons.find(btn => 
          btn.textContent?.includes('Responder')
        ) as HTMLButtonElement;

        if (!responderButton) {
          return { success: false, reason: 'Responder button not found' };
        }

        responderButton.click();
        return { success: true, reason: 'Clicked successfully' };
      });

      if (result.success) {
        logger.info('Clicked Responder button, waiting for answer to be revealed...');
        
        // Wait for the alert-success class to appear (correct answer revealed)
        try {
          await this.page.waitForSelector('.radio.alert-success', { timeout: 5000 });
          logger.info('✅ Correct answer revealed successfully');
        } catch (waitError) {
          logger.info('⚠️ Timeout waiting for correct answer to appear, continuing anyway...');
        }
      } else {
        logger.info(`❌ Could not reveal answer: ${result.reason}`);
      }
    } catch (error) {
      logger.info(`❌ Error revealing answer: ${(error as Error).message}`);
      // Continue anyway
    }
  }

  /**
   * Get page HTML content
   */
  async getPageContent(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    return await this.page.content();
  }

  /**
   * Close the scraper and cleanup
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    logger.info('Scraper closed');
  }
}
