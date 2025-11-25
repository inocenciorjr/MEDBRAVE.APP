/**
 * Browser utilities
 */

import { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { HARDWORQ_CONFIG } from '../config';
import { logger } from './logger';

puppeteerExtra.use(StealthPlugin());

export async function launchBrowser(): Promise<Browser> {
  logger.info('Launching browser...');

  const browser = await puppeteerExtra.launch({
    headless: HARDWORQ_CONFIG.browser.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  logger.info('✅ Browser launched');
  return browser;
}

export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  await page.setViewport(HARDWORQ_CONFIG.browser.viewport);
  await page.setUserAgent(HARDWORQ_CONFIG.browser.userAgent);

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });

  page.setDefaultTimeout(HARDWORQ_CONFIG.browser.timeout);

  return page;
}

export async function closeBrowser(browser: Browser): Promise<void> {
  if (browser) {
    await browser.close();
    logger.info('Browser closed');
  }
}

export function setupCleanupHandlers(browser: Browser): void {
  const cleanup = async () => {
    logger.info('Cleaning up browser...');
    await closeBrowser(browser);
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', () => {
    if (browser) {
      browser.close();
    }
  });
}
