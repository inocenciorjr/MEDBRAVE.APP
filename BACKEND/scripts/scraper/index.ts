#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { CLIOptions } from './types';
import { logger } from './utils/logger';
import { launchBrowser, setupCleanupHandlers } from './utils/browser';
import { MedicalExamScraper } from './scraper';
import { ExamParser } from './parser';
import { QuestionTransformer } from './transformer';
import { QuestionValidator } from './validator';
import { ImageDownloader } from './downloader';
import fs from 'fs/promises';
import { SCRAPER_CONFIG } from './config';
import { Browser } from 'puppeteer';
import { RawQuestion } from './types';

const program = new Command();

program
  .name('scraper')
  .description('Medical exam scraper for provaderesidencia.com.br')
  .version('1.0.0')
  .argument('<url>', 'URL of the exam to scrape')
  .option('-o, --output <path>', 'Output JSON file path')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('-d, --download-images', 'Download images locally', false)
  .option('-t, --timeout <seconds>', 'Page load timeout in seconds', '60')
  .option('-l, --limit <number>', 'Limit number of questions to scrape (0 = all)', '0')
  .action(async (url: string, options: any) => {
    const cliOptions: CLIOptions = {
      url,
      output: options.output,
      verbose: options.verbose,
      downloadImages: options.downloadImages,
      timeout: parseInt(options.timeout, 10) * 1000,
      limit: parseInt(options.limit, 10) || 0,
    };

    await main(cliOptions);
  });

async function main(options: CLIOptions): Promise<void> {
  const startTime = Date.now();
  
  // Set log level
  if (options.verbose) {
    logger.level = 'debug';
  }

  logger.info('=== Medical Exam Scraper ===');
  logger.info(`URL: ${options.url}`);
  logger.info(`Verbose: ${options.verbose}`);
  logger.info(`Download Images: ${options.downloadImages}`);

  // Validate URL
  if (!isValidUrl(options.url)) {
    logger.error('Invalid URL provided');
    process.exit(1);
  }

  let browser: Browser | undefined;
  let scraper: MedicalExamScraper | undefined;

  try {
    // Launch browser
    browser = await launchBrowser();
    setupCleanupHandlers(browser);

    // Initialize scraper
    scraper = new MedicalExamScraper(browser);
    await scraper.initialize();

    // Navigate to exam
    await scraper.navigateToExam(options.url);

    // Wait for Cloudflare
    await scraper.waitForCloudflare();

    // Check if URL is a single question or exam overview
    const isSingleQuestion = options.url.includes('/questao/');
    
    let questionHtmls: string[] = [];
    
    if (isSingleQuestion) {
      logger.info('Detected single question URL, will extract sequentially...');
      // Extract from this question and navigate to next ones
      // Se limit é 0 (todas), usar 1000 como máximo seguro
      const limit = options.limit === 0 ? 1000 : options.limit;
      questionHtmls = await scraper.extractSequentialQuestions(limit);
    } else {
      // Extract all questions by navigating through them
      logger.info('Extracting all questions from exam...');
      questionHtmls = await scraper.extractAllQuestions(options.limit);
    }

    if (questionHtmls.length === 0) {
      logger.warn('No questions found. The page structure might have changed.');
      logger.info('Saving first page HTML for manual inspection...');
      const html = await scraper.getPageContent();
      const htmlPath = path.join(SCRAPER_CONFIG.output.logsDir, `page-${Date.now()}.html`);
      await fs.writeFile(htmlPath, html);
      logger.info(`HTML saved to: ${htmlPath}`);
      await scraper.close();
      await browser.close();
      process.exit(1);
    }

    // Parse exam metadata from first question
    logger.info('Parsing exam data...');
    const parser = new ExamParser();
    const examMetadata = parser.parseExamMetadata(questionHtmls[0]);

    // Parse each question
    const rawQuestions: RawQuestion[] = [];
    for (let i = 0; i < questionHtmls.length; i++) {
      try {
        const question = parser.parseSingleQuestion(questionHtmls[i]);
        if (question) {
          rawQuestions.push(question);
          logger.debug(`Parsed question ${i + 1}/${questionHtmls.length}`);
        }
      } catch (error) {
        logger.error(`Failed to parse question ${i + 1}: ${(error as Error).message}`);
      }
    }

    logger.info(`Successfully parsed ${rawQuestions.length}/${questionHtmls.length} questions`);

    // If no questions found, save HTML for debugging
    if (rawQuestions.length === 0 && questionHtmls.length > 0) {
      logger.warn('No questions parsed. Saving HTML for debugging...');
      const htmlPath = path.join(SCRAPER_CONFIG.output.logsDir, `debug-page-${Date.now()}.html`);
      await fs.writeFile(htmlPath, questionHtmls[0]);
      logger.info(`Debug HTML saved to: ${htmlPath}`);
    }

    // Transform questions (without inserting images yet)
    const transformer = new QuestionTransformer();
    const questions = transformer.transformBatch(rawQuestions, examMetadata);

    // Validate questions
    logger.info('Validating questions...');
    const validator = new QuestionValidator();
    const validationResult = validator.validateBatch(questions);

    logger.info(`Validation: ${validationResult.validQuestions} valid, ${validationResult.invalidQuestions} invalid`);

    // Download images if requested
    let imageResults: any[] = [];
    if (options.downloadImages && questions.length > 0) {
      logger.info('Downloading images...');
      const downloader = new ImageDownloader();
      
      const allImageUrls = questions.flatMap(q => q.image_urls || []);
      const uniqueImageUrls = [...new Set(allImageUrls)];
      
      if (uniqueImageUrls.length > 0) {
        // Enviar progresso de imagens
        process.stdout.write(`PROGRESS_IMAGES:${uniqueImageUrls.length}\n`);
        
        imageResults = await downloader.downloadBatch(uniqueImageUrls);
        
        // Update image URLs to local paths
        questions.forEach(question => {
          if (question.image_urls) {
            question.image_urls = question.image_urls.map(url => {
              const result = imageResults.find(r => r.url === url);
              return result?.localPath || url;
            });
          }
        });
      }
    }

    // Insert images into statements after download (so we have local paths)
    questions.forEach(question => {
      if (question.image_urls && question.image_urls.length > 0) {
        question.statement = transformer.insertImagesIntoStatement(question.statement, question.image_urls);
      }
    });

    // Generate output path
    const outputPath = options.output || generateOutputPath(examMetadata);

    // Save questions to JSON
    logger.info(`Saving questions to: ${outputPath}`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(questions, null, 2));

    // Generate report
    const duration = Date.now() - startTime;
    const report = {
      executionId: `scrape-${Date.now()}`,
      url: options.url,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration,
      status: validationResult.invalidQuestions === 0 ? 'success' : 'partial',
      statistics: {
        totalQuestions: questions.length,
        validQuestions: validationResult.validQuestions,
        invalidQuestions: validationResult.invalidQuestions,
        imagesDownloaded: imageResults.filter(r => r.success).length,
        imagesFailed: imageResults.filter(r => !r.success).length,
      },
      outputFile: outputPath,
      examMetadata,
    };

    // Save report
    const reportPath = path.join(SCRAPER_CONFIG.output.logsDir, `report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    logger.info('');
    logger.info('=== Scraping Complete ===');
    logger.info(`Duration: ${(duration / 1000).toFixed(2)}s`);
    logger.info(`Questions extracted: ${questions.length}`);
    logger.info(`Valid questions: ${validationResult.validQuestions}`);
    logger.info(`Invalid questions: ${validationResult.invalidQuestions}`);
    if (options.downloadImages) {
      logger.info(`Images downloaded: ${imageResults.filter(r => r.success).length}`);
      logger.info(`Images failed: ${imageResults.filter(r => !r.success).length}`);
    }
    logger.info(`Output file: ${outputPath}`);
    logger.info(`Report saved: ${reportPath}`);

    // Close scraper
    await scraper.close();
    await browser.close();

    process.exit(validationResult.invalidQuestions === 0 ? 0 : 1);

  } catch (error) {
    logger.error('Scraping failed:', error);
    
    if (scraper) {
      await scraper.close();
    }
    
    if (browser) {
      await browser.close();
    }

    process.exit(1);
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function generateOutputPath(examMetadata: any): string {
  const timestamp = Date.now();
  const institution = examMetadata.institution?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'exam';
  const year = examMetadata.year || 'unknown';
  const filename = `${institution}-${year}-${timestamp}.json`;
  return path.join(SCRAPER_CONFIG.output.questionsDir, filename);
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

// Parse CLI arguments
program.parse();
