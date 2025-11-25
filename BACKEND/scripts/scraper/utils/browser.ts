import { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { SCRAPER_CONFIG } from '../config';
import { logger } from './logger';

// Add stealth plugin to avoid detection
puppeteerExtra.use(StealthPlugin());

/**
 * Initialize and launch browser with stealth configuration
 * @returns Browser instance
 */
export async function launchBrowser(): Promise<Browser> {
  logger.info('Launching browser with stealth configuration...');

  const browser = await puppeteerExtra.launch({
    headless: SCRAPER_CONFIG.browser.headless,
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

  logger.info('Browser launched successfully');
  return browser;
}

/**
 * Create a new page with configured settings
 * @param browser Browser instance
 * @returns Page instance
 */
export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  // Set viewport
  await page.setViewport(SCRAPER_CONFIG.browser.viewport);

  // Set user agent
  await page.setUserAgent(SCRAPER_CONFIG.browser.userAgent);

  // Set extra HTTP headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });

  // Set default timeout
  page.setDefaultTimeout(SCRAPER_CONFIG.browser.timeout);

  logger.debug('Page created with configured settings');
  return page;
}

/**
 * Close browser and cleanup resources
 * @param browser Browser instance
 */
export async function closeBrowser(browser: Browser): Promise<void> {
  if (browser) {
    await browser.close();
    logger.info('Browser closed');
  }
}

/**
 * Setup cleanup handlers for graceful shutdown
 * @param browser Browser instance
 */
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
