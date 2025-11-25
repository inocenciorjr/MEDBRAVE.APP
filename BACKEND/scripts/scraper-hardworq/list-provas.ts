/**
 * Script to extract the complete list of provas from Hardworq
 * This will generate a JSON file with all provas and their IDs
 */

import { Command } from 'commander';
import { HardworqAuth } from './auth';
import { HardworqNavigator } from './navigator';
import { logger } from './utils/logger';
import { launchBrowser, createPage, closeBrowser } from './utils/browser';
import * as fs from 'fs';
import * as path from 'path';

interface ProvaListItem {
  index: number;
  label: string;
  value: string;
}

const program = new Command();

program
  .name('list-provas')
  .description('Extract complete list of provas from Hardworq')
  .requiredOption('-e, --email <email>', 'Email de login')
  .requiredOption('-p, --password <password>', 'Senha de login')
  .option('-o, --output <path>', 'Caminho do arquivo JSON de saída', 'output/hardworq/provas-list.json')
  .action(async (options: any) => {
    await main(options);
  });

async function main(options: any): Promise<void> {
  const startTime = Date.now();
  
  logger.info('=== Hardworq Provas List Extractor ===');
  logger.info(`Email: ${options.email}`);
  logger.info(`Output: ${options.output}`);
  logger.info('Launching browser...');

  const auth = new HardworqAuth();
  const navigator = new HardworqNavigator();

  try {
    // Launch browser
    const browser = await launchBrowser();
    const page = await createPage(browser);
    logger.info('✅ Browser launched');
    logger.info('');

    // Login
    logger.info('=== Step 1: Login ===');
    await auth.login(page, options.email, options.password);
    logger.info('');

    // Navigate to Banco de Questões
    logger.info('=== Step 2: Navigate to Banco de Questões ===');
    await navigator.navigateToBancoQuestoes(page);
    logger.info('');

    // Get provas list
    logger.info('=== Step 3: Extract Provas List ===');
    const provas = await navigator.getProvasList(page);
    
    logger.info(`✅ Extracted ${provas.length} provas`);
    logger.info('');

    // Convert to list format with index
    const provasList: ProvaListItem[] = provas.map((prova, index) => ({
      index: index + 1,
      label: prova.label,
      value: prova.value,
    }));

    // Save to file
    const outputPath = path.resolve(options.output);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(provasList, null, 2), 'utf-8');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.info('=== Extraction Complete ===');
    logger.info(`Duration: ${duration}s`);
    logger.info(`Total provas: ${provasList.length}`);
    logger.info(`Output file: ${outputPath}`);
    logger.info('');

    await closeBrowser(browser);
    logger.info('Browser closed');

  } catch (error) {
    logger.error('Extraction failed:', error);
    process.exit(1);
  }
}

program.parse(process.argv);
