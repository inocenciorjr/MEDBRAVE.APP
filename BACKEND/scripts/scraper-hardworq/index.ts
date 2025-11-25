#!/usr/bin/env node

/**
 * Hardworq Scraper CLI
 * 
 * Extrai questões do site Hardworq (app.hardworq.com.br)
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import { HardworqCLIOptions, ExtractionResult } from './types';
import { HARDWORQ_CONFIG } from './config';
import { logger } from './utils/logger';
import { launchBrowser, createPage, closeBrowser, setupCleanupHandlers } from './utils/browser';
import { HardworqAuth } from './auth';
import { HardworqNavigator } from './navigator';
import { HardworqExtractor } from './extractor';
import { HardworqParser } from './parser';
import { HardworqImageDownloader } from './downloader';
import { HardworqTransformer } from './transformer';
import { Browser } from 'puppeteer';

const program = new Command();

program
  .name('scraper-hardworq')
  .description('Scraper de questões médicas do Hardworq')
  .version('1.0.0')
  .requiredOption('-e, --email <email>', 'Email de login')
  .requiredOption('-p, --password <password>', 'Senha de login')
  .option('-o, --output <path>', 'Caminho do arquivo JSON de saída')
  .option('-v, --verbose', 'Ativar logs detalhados', false)
  .option('-l, --limit <number>', 'Limitar número de questões por prova (0 = todas)', '0')
  .option('--prova-id <id>', 'ID específico de uma prova (opcional)')
  .option('--prova-name <name>', 'Nome da prova para buscar (ex: "UNICAMP R1 2019")')
  .option('--prova-index <index>', 'Índice da prova na lista (1-based, ex: 1493)')
  .action(async (options: any) => {
    const cliOptions: HardworqCLIOptions = {
      email: options.email,
      password: options.password,
      provaId: options.provaId,
      provaName: options.provaName,
      provaIndex: options.provaIndex ? parseInt(options.provaIndex, 10) : undefined,
      output: options.output,
      verbose: options.verbose,
      limit: parseInt(options.limit, 10) || 0,
    };

    await main(cliOptions);
  });

async function main(options: HardworqCLIOptions): Promise<void> {
  const startTime = Date.now();

  // Set log level
  if (options.verbose) {
    logger.level = 'debug';
  }

  logger.info('=== Hardworq Scraper ===');
  logger.info(`Email: ${options.email}`);
  logger.info(`Verbose: ${options.verbose}`);
  logger.info(`Limit: ${options.limit || 'Todas'}`);

  let browser: Browser | undefined;

  try {
    // Launch browser
    browser = await launchBrowser();
    setupCleanupHandlers(browser);

    const page = await createPage(browser);

    // Initialize modules
    const auth = new HardworqAuth();
    const navigator = new HardworqNavigator();
    const extractor = new HardworqExtractor();
    const parser = new HardworqParser();

    // Login
    logger.info('');
    logger.info('=== Step 1: Login ===');
    await auth.login(page, options.email, options.password);

    // Navigate to Banco de Questões
    logger.info('');
    logger.info('=== Step 2: Navigate to Banco de Questões ===');
    await navigator.navigateToBancoQuestoes(page);

    // Get list of provas
    logger.info('');
    logger.info('=== Step 3: Get Provas List ===');
    const provas = await navigator.getProvasList(page);

    if (provas.length === 0) {
      logger.error('No provas found!');
      await closeBrowser(browser);
      process.exit(1);
    }

    logger.info(`Found ${provas.length} provas available:`);
    logger.info('');
    let selectedIndex: number;

    // Check if prova was specified via CLI options
    if (options.provaIndex !== undefined) {
      // Use provided index (1-based)
      selectedIndex = options.provaIndex - 1;
      if (selectedIndex < 0 || selectedIndex >= provas.length) {
        logger.error(`Invalid prova index: ${options.provaIndex}. Must be between 1 and ${provas.length}`);
        process.exit(1);
      }
      logger.info(`Using prova index from CLI: ${options.provaIndex}`);
    } else if (options.provaName) {
      // Search by name
      selectedIndex = provas.findIndex((p) =>
        p.label.toLowerCase().includes(options.provaName!.toLowerCase())
      );
      if (selectedIndex === -1) {
        logger.error(`Prova not found with name: ${options.provaName}`);
        process.exit(1);
      }
      logger.info(`Found prova: ${provas[selectedIndex].label}`);
    } else {
      // Interactive mode: show list and ask user
      provas.forEach((prova, index) => {
        logger.info(`  ${index + 1}. ${prova.label}`);
      });
      logger.info('');

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      selectedIndex = await new Promise<number>((resolve) => {
        rl.question('Digite o número da prova que deseja extrair: ', (answer: string) => {
          rl.close();
          const num = parseInt(answer, 10);
          if (isNaN(num) || num < 1 || num > provas.length) {
            logger.error('Número inválido!');
            process.exit(1);
          }
          resolve(num - 1);
        });
      });
    }

    const selectedProva = provas[selectedIndex];
    logger.info('');
    logger.info(`=== Step 4: Select Prova: ${selectedProva.label} ===`);
    await navigator.selectProva(page, selectedProva.label, selectedIndex);

    // Open prova
    logger.info('');
    logger.info('=== Step 5: Open Prova ===');
    await navigator.abrirProva(page);

    // Extract questions
    logger.info('');
    logger.info('=== Step 6: Extract Questions ===');
    const extractionResult: ExtractionResult = await extractor.extractProva(page, options.limit);

    // Convert to MedBrave format
    logger.info('');
    logger.info('=== Step 7: Convert to MedBrave Format ===');
    const questions = parser.convertBatch(extractionResult.questions);

    // Download images
    logger.info('');
    logger.info('=== Step 8: Download Images ===');
    const downloader = new HardworqImageDownloader();
    const transformer = new HardworqTransformer();

    const allImageUrls = questions.flatMap((q) => q.image_urls || []);
    const uniqueImageUrls = [...new Set(allImageUrls)];

    let imageResults: any[] = [];
    if (uniqueImageUrls.length > 0) {
      imageResults = await downloader.downloadBatch(uniqueImageUrls);

      // Update image URLs to local paths
      questions.forEach((question) => {
        if (question.image_urls && question.image_urls.length > 0) {
          question.image_urls = question.image_urls.map((url) => {
            const result = imageResults.find((r) => r.url === url);
            return result?.localPath || url;
          });
        }
      });
    }

    // Insert images into statements
    logger.info('');
    logger.info('=== Step 9: Insert Images into Statements ===');
    questions.forEach((question) => {
      if (question.image_urls && question.image_urls.length > 0) {
        question.statement = transformer.insertImagesIntoStatement(
          question.statement,
          question.image_urls
        );
      }
    });

    // Generate output path
    const outputPath = options.output || generateOutputPath(extractionResult.prova);

    // Save questions to JSON
    logger.info('');
    logger.info(`=== Step 10: Save to ${outputPath} ===`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(questions, null, 2));

    // Generate report
    const duration = Date.now() - startTime;
    const report = {
      executionId: `hardworq-${Date.now()}`,
      prova: extractionResult.prova,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration,
      status: 'success',
      statistics: {
        totalQuestions: questions.length,
        withExplanation: extractionResult.stats.withExplanation,
        withImages: extractionResult.stats.withImages,
        imagesDownloaded: imageResults.filter((r) => r.success).length,
        imagesFailed: imageResults.filter((r) => !r.success).length,
        anuladas: extractionResult.stats.anuladas,
      },
      outputFile: outputPath,
    };

    // Save report
    const reportPath = path.join(HARDWORQ_CONFIG.output.logsDir, `report-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    logger.info('');
    logger.info('=== Extraction Complete ===');
    logger.info(`Duration: ${(duration / 1000).toFixed(2)}s`);
    logger.info(`Prova: ${extractionResult.prova.codigo}`);
    logger.info(`Questions extracted: ${questions.length}`);
    logger.info(`With explanation: ${extractionResult.stats.withExplanation}`);
    logger.info(`With images: ${extractionResult.stats.withImages}`);
    logger.info(`Images downloaded: ${imageResults.filter((r) => r.success).length}`);
    logger.info(`Images failed: ${imageResults.filter((r) => !r.success).length}`);
    logger.info(`Anuladas: ${extractionResult.stats.anuladas}`);
    logger.info(`Output file: ${outputPath}`);
    logger.info(`Report saved: ${reportPath}`);

    // Close browser
    await closeBrowser(browser);

    process.exit(0);

  } catch (error) {
    logger.error('Scraping failed:', error);

    if (browser) {
      await closeBrowser(browser);
    }

    process.exit(1);
  }
}

function generateOutputPath(prova: any): string {
  const timestamp = Date.now();
  
  // Normalizar instituição (remover caracteres especiais, espaços, etc)
  const institution = prova.instituicao
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '-') // Substitui caracteres especiais por -
    .replace(/-+/g, '-') // Remove múltiplos hífens
    .trim();
  
  const year = prova.ano;
  const filename = `${institution}-${year}-${timestamp}.json`;
  
  return path.join(HARDWORQ_CONFIG.output.questionsDir, filename);
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

// Parse CLI arguments
program.parse();
