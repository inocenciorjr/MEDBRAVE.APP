/**
 * Authentication module for Hardworq
 */

import { Page } from 'puppeteer';
import { HARDWORQ_CONFIG } from './config';
import { logger } from './utils/logger';
import { sleep } from './utils/helpers';

export class HardworqAuth {
  /**
   * Perform login on Hardworq
   */
  async login(page: Page, email: string, password: string): Promise<void> {
    logger.info('Navigating to login page...');
    
    await page.goto(HARDWORQ_CONFIG.urls.login, {
      waitUntil: 'networkidle2',
      timeout: HARDWORQ_CONFIG.browser.timeout,
    });

    logger.info('Filling login form...');

    // Wait for form to be visible
    await page.waitForSelector(HARDWORQ_CONFIG.selectors.login.emailInput, {
      visible: true,
      timeout: 10000,
    });

    // Fill email
    await page.type(HARDWORQ_CONFIG.selectors.login.emailInput, email, {
      delay: 100,
    });

    // Fill password
    await page.type(HARDWORQ_CONFIG.selectors.login.passwordInput, password, {
      delay: 100,
    });

    logger.info('Submitting login form...');

    // Click submit button
    await page.click(HARDWORQ_CONFIG.selectors.login.submitButton);

    // Wait for navigation after login
    try {
      await page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
    } catch (error) {
      logger.warn('Navigation timeout, checking if logged in anyway...');
    }

    // Additional wait for page to stabilize
    await sleep(HARDWORQ_CONFIG.delays.afterLogin);

    // Verify login success
    const currentUrl = page.url();
    logger.debug(`Current URL after login: ${currentUrl}`);

    if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
      throw new Error('Login failed - still on login page');
    }

    // Check if we're on hardworq page OR if login was successful
    if (!currentUrl.includes('/hardworq') && !currentUrl.includes('app.hardworq.com.br')) {
      throw new Error(`Login failed - unexpected URL: ${currentUrl}`);
    }

    // Take screenshot after login
    await page.screenshot({ path: 'debug-after-login.png', fullPage: true });
    logger.info('Screenshot saved: debug-after-login.png');

    // Check for modals/popups/questionnaires
    await sleep(2000);
    const hasModal = await page.evaluate(() => {
      // Check for common modal patterns
      const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="Modal"], [class*="popup"]');
      if (modals.length > 0) {
        return {
          found: true,
          count: modals.length,
          html: Array.from(modals).map(m => m.outerHTML.substring(0, 200)).join('\n'),
        };
      }
      return { found: false };
    });

    if (hasModal.found) {
      logger.warn('⚠️ Modal/Popup detected after login!');
      logger.warn(JSON.stringify(hasModal, null, 2));
      
      // Try to close it
      const closed = await page.evaluate(() => {
        // Try to find close button
        const closeButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
          btn.textContent?.toLowerCase().includes('fechar') ||
          btn.textContent?.toLowerCase().includes('pular') ||
          btn.textContent?.toLowerCase().includes('não') ||
          btn.textContent?.toLowerCase().includes('depois') ||
          btn.getAttribute('aria-label')?.toLowerCase().includes('close')
        );
        
        if (closeButtons.length > 0) {
          (closeButtons[0] as HTMLButtonElement).click();
          return true;
        }
        
        // Try ESC key
        return false;
      });

      if (closed) {
        logger.info('✅ Modal closed');
      } else {
        logger.warn('⚠️ Could not close modal automatically, trying ESC');
        await page.keyboard.press('Escape');
      }
      
      await sleep(1000);
    }

    logger.info('✅ Login successful!');
  }

  /**
   * Check if already logged in
   */
  async isLoggedIn(page: Page): Promise<boolean> {
    const currentUrl = page.url();
    return (
      currentUrl.includes('/hardworq') &&
      !currentUrl.includes('/signin') &&
      !currentUrl.includes('/login')
    );
  }
}
