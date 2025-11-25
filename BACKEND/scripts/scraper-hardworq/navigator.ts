/**
 * Navigation module for Hardworq
 */

import { Page } from 'puppeteer';
import { HARDWORQ_CONFIG } from './config';
import { logger } from './utils/logger';
import { sleep } from './utils/helpers';

export class HardworqNavigator {
  /**
   * Navigate to Banco de Questões page
   */
  async navigateToBancoQuestoes(page: Page): Promise<void> {
    logger.info('Navigating directly to Banco de Questões...');

    // Navigate directly to banco-questoes URL (simpler and more reliable)
    await page.goto(HARDWORQ_CONFIG.urls.banco, {
      waitUntil: 'networkidle2',
      timeout: HARDWORQ_CONFIG.browser.timeout,
    });

    await sleep(HARDWORQ_CONFIG.delays.afterNavigation);

    // Take screenshot
    await page.screenshot({ path: 'debug-banco-questoes.png', fullPage: true });
    logger.info('Screenshot saved: debug-banco-questoes.png');

    // Verify we're on the right page
    const currentUrl = page.url();
    if (!currentUrl.includes('/banco-questoes')) {
      throw new Error(`Failed to navigate to banco-questoes. Current URL: ${currentUrl}`);
    }

    logger.info('✅ Navigated to Banco de Questões');
  }

  /**
   * Scroll to "Acessar prova na íntegra" section
   */
  async scrollToProvaIntegra(page: Page): Promise<void> {
    logger.info('Scrolling to "Acessar prova na íntegra"...');

    const scrolled = await page.evaluate(() => {
      // Try multiple text variations
      const texts = ['Acessar prova na íntegra', 'Acessar prova na integra', 'prova na íntegra', 'prova na integra'];

      for (const text of texts) {
        const heading = Array.from(document.querySelectorAll('h2, h3, h1, div')).find((h) =>
          h.textContent?.toLowerCase().includes(text.toLowerCase())
        );

        if (heading) {
          heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
      }

      // If not found, scroll to bottom
      window.scrollTo(0, document.body.scrollHeight);
      return false;
    });

    logger.debug(`Scroll result: ${scrolled ? 'Found heading' : 'Scrolled to bottom'}`);
    await sleep(2000);
  }

  /**
   * Get list of available provas from React Select
   */
  async getProvasList(page: Page): Promise<Array<{ value: string; label: string }>> {
    logger.info('Getting list of provas...');

    // Wait for page to load
    logger.info('Waiting for page to render...');
    await sleep(3000);

    // The content is inside an iframe!
    logger.info('Looking for iframe...');

    const iframeElement = await page.waitForSelector('iframe', { timeout: 10000 });
    if (!iframeElement) {
      throw new Error('Iframe not found');
    }

    logger.info('✅ Found iframe');

    // Get the iframe content
    const frame = await iframeElement.contentFrame();
    if (!frame) {
      throw new Error('Could not access iframe content');
    }

    logger.info('✅ Accessed iframe content');

    // Wait for iframe content to load
    await sleep(3000);

    // Apply zoom out using CSS transform (more reliable than zoom property)
    logger.info('Applying zoom out to iframe...');
    await frame.evaluate(() => {
      // Try multiple zoom methods
      document.body.style.zoom = '0.5';
      document.body.style.transform = 'scale(0.5)';
      document.body.style.transformOrigin = 'top left';
      document.documentElement.style.zoom = '0.5';
    });

    await sleep(2000);
    logger.info('✅ Applied zoom to iframe');

    // Scroll progressively inside iframe to trigger lazy loading
    logger.info('Scrolling progressively inside iframe...');
    await frame.evaluate(async () => {
      const scrollStep = 200;
      const scrollDelay = 100;

      for (let i = 0; i < 15; i++) {
        window.scrollBy(0, scrollStep);
        await new Promise(resolve => setTimeout(resolve, scrollDelay));
      }

      // Final scroll to bottom
      window.scrollTo(0, document.body.scrollHeight);
    });

    await sleep(2000);
    logger.info('✅ Scrolled inside iframe');

    // Take screenshot
    await page.screenshot({ path: 'debug-iframe.png', fullPage: true });
    logger.info('Screenshot saved: debug-iframe.png');

    // Now look for the select inside the iframe
    logger.info('Looking for .basic-single React Select inside iframe...');
    const selector = '.basic-single input[id^="react-select-"]';

    try {
      // Wait for the element to exist (not necessarily visible)
      await frame.waitForSelector(selector, { timeout: 10000 });
      logger.info('✅ Found React Select inside iframe');
    } catch (error) {
      // Debug info from iframe
      const debugInfo = await frame.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const basicSingle = document.querySelector('.basic-single');
        return {
          url: window.location.href,
          scrollY: window.scrollY,
          bodyHeight: document.body.scrollHeight,
          windowHeight: window.innerHeight,
          hasBasicSingle: !!basicSingle,
          basicSingleHTML: basicSingle?.outerHTML.substring(0, 300),
          totalInputs: inputs.length,
        };
      });

      await page.screenshot({ path: 'debug-select-not-found.png', fullPage: true });
      console.log('=== DEBUG INFO (IFRAME) ===');
      console.log(JSON.stringify(debugInfo, null, 2));
      logger.error('React Select not found inside iframe.');
      throw new Error('React Select not found inside iframe. Check debug-select-not-found.png and console output');
    }

    // Scroll and click the control div (not the input)
    await frame.evaluate(() => {
      const container = document.querySelector('.basic-single');
      if (container) {
        container.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    });

    await sleep(1000);

    // Try clicking on the dropdown indicator (arrow)
    const clicked = await frame.evaluate(() => {
      // First try the dropdown indicator
      const indicator = document.querySelector('.select__dropdown-indicator') as HTMLElement;
      if (indicator) {
        // Trigger mousedown and mouseup events (React Select listens to these)
        indicator.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        indicator.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        indicator.click();
        return 'indicator';
      }

      // Fallback to control
      const control = document.querySelector('.select__control') as HTMLElement;
      if (control) {
        control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        control.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        control.click();
        return 'control';
      }

      return null;
    });

    if (!clicked) {
      throw new Error('Could not click on select');
    }

    logger.info(`✅ Clicked React Select ${clicked} inside iframe`);

    // Wait for dropdown to open
    await sleep(3000);

    // Get all dropdown options from iframe
    const provas = await frame.evaluate(() => {
      // Select options that match the pattern react-select-X-option-Y
      const options = Array.from(
        document.querySelectorAll('[id*="-option-"]')
      ).filter(el => el.id.match(/^react-select-\d+-option-\d+$/));

      return options.map((opt, index) => ({
        value: index.toString(),
        label: opt.textContent?.trim() || '',
      }));
    });

    if (provas.length === 0) {
      await page.screenshot({ path: 'debug-no-options.png', fullPage: true });
      throw new Error('No options found. Dropdown may not have opened.');
    }

    logger.info(`Found ${provas.length} provas`);
    return provas;
  }

  /**
   * Select a prova from React Select dropdown
   */
  async selectProva(page: Page, provaLabel: string, provaIndex?: number): Promise<void> {
    logger.info(`Selecting prova: ${provaLabel}...`);

    let targetIndex: number;
    
    // If index is provided directly, use it
    if (provaIndex !== undefined) {
      targetIndex = provaIndex + 1; // Convert 0-based to 1-based
      logger.info(`Using provided index: ${targetIndex}`);
    } else {
      // Extract the index from the label (e.g., "1 - Prova..." -> 1)
      const indexMatch = provaLabel.match(/^(\d+)\s*-/);
      if (!indexMatch) {
        throw new Error(`Invalid prova label format: ${provaLabel}. Expected format: "N - Prova Name" or provide provaIndex parameter`);
      }
      targetIndex = parseInt(indexMatch[1], 10);
      logger.info(`Target index from label: ${targetIndex}`);
    }

    // Get the iframe
    const iframeElement = await page.waitForSelector('iframe', { timeout: 10000 });
    if (!iframeElement) {
      throw new Error('Iframe not found');
    }

    const frame = await iframeElement.contentFrame();
    if (!frame) {
      throw new Error('Could not access iframe content');
    }

    // Scroll to the select inside iframe
    await frame.evaluate(() => {
      const container = document.querySelector('.basic-single');
      if (container) {
        container.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    });

    await sleep(1000);

    logger.info(`Clicking directly on option ${targetIndex}...`);

    // Click directly on the option using JavaScript (much faster!)
    const clicked = await frame.evaluate((index) => {
      // Find the option by its ID pattern: react-select-X-option-Y
      const optionId = `react-select-2-option-${index - 1}`; // 0-based in DOM
      const option = document.getElementById(optionId) as HTMLElement;
      
      if (option) {
        option.click();
        return true;
      }
      
      // Fallback: try to find by index in the list
      const options = Array.from(document.querySelectorAll('[id*="-option-"]'));
      if (options[index - 1]) {
        (options[index - 1] as HTMLElement).click();
        return true;
      }
      
      return false;
    }, targetIndex);

    if (!clicked) {
      logger.warn('Direct click failed, trying keyboard navigation...');
      
      // Fallback to keyboard if direct click doesn't work
      await frame.evaluate(() => {
        const input = document.querySelector('.basic-single input[id^="react-select-"]') as HTMLInputElement;
        if (input) {
          input.focus();
          input.click();
        }
      });

      await sleep(1000);
      await page.keyboard.press('ArrowDown');
      await sleep(500);
    }

    await sleep(500);

    // Press Enter to select
    await page.keyboard.press('Enter');
    await sleep(2000); // Give more time for React to update

    // Verify selection - CRITICAL: must confirm the prova was actually selected
    const selectedValue = await frame.evaluate(() => {
      const selectedElement = document.querySelector('.select__single-value');
      return selectedElement?.textContent?.trim() || '';
    });

    logger.info(`Selected value: "${selectedValue}"`);

    if (!selectedValue || selectedValue === 'Selecione...') {
      await page.screenshot({ path: 'debug-selection-failed.png', fullPage: true });
      
      // Try alternative: click directly on the highlighted option
      logger.warn('Enter key did not work, trying to click on highlighted option...');
      await frame.evaluate(() => {
        const highlightedOption = document.querySelector('[class*="option"][class*="focused"]') as HTMLElement;
        if (highlightedOption) {
          highlightedOption.click();
        }
      });
      
      await sleep(2000);
      
      const retryValue = await frame.evaluate(() => {
        const selectedElement = document.querySelector('.select__single-value');
        return selectedElement?.textContent?.trim() || '';
      });
      
      if (!retryValue || retryValue === 'Selecione...') {
        throw new Error(`Failed to select prova. Expected "${provaLabel}" but got "${retryValue}"`);
      }
      
      logger.info(`✅ Prova selected (after retry): ${retryValue}`);
    } else {
      logger.info(`✅ Prova selected: ${selectedValue}`);
    }
    
    // Extra verification: wait a bit more to ensure React state updated
    await sleep(1000);
  }

  /**
   * Click "Abrir prova" button
   */
  async abrirProva(page: Page): Promise<void> {
    logger.info('Clicking "Abrir prova"...');

    // Get the iframe
    const iframeElement = await page.waitForSelector('iframe', { timeout: 10000 });
    if (!iframeElement) {
      throw new Error('Iframe not found');
    }

    const frame = await iframeElement.contentFrame();
    if (!frame) {
      throw new Error('Could not access iframe content');
    }

    // Click "Abrir prova" button inside iframe
    await frame.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const abrirButton = buttons.find((btn) =>
        btn.textContent?.includes('Abrir prova')
      );

      if (!abrirButton) {
        throw new Error('Abrir prova button not found');
      }

      (abrirButton as HTMLButtonElement).click();
    });

    // Wait for the iframe to navigate to the prova page
    await sleep(5000);

    logger.info('✅ Prova opened');
  }

  /**
   * Get total number of questions from dropdown
   */
  async getTotalQuestions(page: Page): Promise<number> {
    logger.info('Getting total number of questions...');

    // Get the iframe
    const iframeElement = await page.waitForSelector('iframe', { timeout: 10000 });
    if (!iframeElement) {
      throw new Error('Iframe not found');
    }
    
    const frame = await iframeElement.contentFrame();
    if (!frame) {
      throw new Error('Could not access iframe content');
    }

    // Wait for the page to load inside iframe
    await sleep(2000);

    // Try to get total from the dropdown by hovering and counting buttons
    try {
      // Find the dropdown trigger (the element showing current question number)
      const dropdownTrigger = await frame.waitForSelector('button, [class*="group"]', { timeout: 5000 });
      
      if (dropdownTrigger) {
        // Hover to open dropdown
        await dropdownTrigger.hover();
        await sleep(500);
        
        // Count buttons in the dropdown
        const total = await frame.evaluate(() => {
          // Try different selectors for question buttons
          const buttons = document.querySelectorAll('button[class*="question"], button[type="button"]');
          return buttons.length;
        });
        
        if (total > 0) {
          logger.info(`Total questions found: ${total}`);
          return total;
        }
      }
    } catch (error) {
      logger.warn('Could not count questions from dropdown, will use fallback method');
    }

    // Fallback: assume a reasonable maximum and let the extractor handle it
    logger.info('Using fallback: will extract until no more questions found');
    return 100; // Maximum reasonable number, extractor will stop when questions stop appearing
  }

  /**
   * Navigate to a specific question by clicking its button
   */
  async navigateToQuestion(page: Page, questionNumber: number): Promise<void> {
    logger.debug(`Navigating to question ${questionNumber}...`);

    // Get the iframe
    const iframeElement = await page.waitForSelector('iframe', { timeout: 10000 });
    if (!iframeElement) {
      throw new Error('Iframe not found');
    }
    
    const frame = await iframeElement.contentFrame();
    if (!frame) {
      throw new Error('Could not access iframe content');
    }

    // Hover to open dropdown inside iframe
    await frame.evaluate(() => {
      const dropdown = document.querySelector('.group.shadow') as HTMLElement;
      if (dropdown) {
        dropdown.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    });

    await sleep(300);

    // Click on question button inside iframe
    await frame.evaluate((num) => {
      const buttons = Array.from(
        document.querySelectorAll('.group.shadow button')
      );
      const button = buttons.find(
        (btn) => btn.textContent?.trim() === num.toString().padStart(2, '0')
      );

      if (button) {
        (button as HTMLButtonElement).click();
      }
    }, questionNumber);

    // Wait for question to load
    await sleep(HARDWORQ_CONFIG.delays.betweenQuestions);
  }
}
