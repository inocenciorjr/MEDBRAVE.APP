import { JSDOM } from 'jsdom';
import { SELECTORS } from './config';
import { RawQuestion, RawAlternative, ExamMetadata } from './types';
import { logger } from './utils/logger';

export class ExamParser {
  /**
   * Parse exam metadata from HTML
   */
  parseExamMetadata(html: string): ExamMetadata {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const metadata: ExamMetadata = {
      tags: [],
    };

    // Try to extract title from h3
    const h3 = document.querySelector('h3');
    if (h3) {
      const titleText = h3.textContent || '';
      metadata.title = this.cleanText(titleText);
      
      // Try to extract institution and year from URL or title
      const yearMatch = titleText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        metadata.year = parseInt(yearMatch[0], 10);
      }
    }

    // Try to extract from page title or URL
    const pageTitle = document.title;
    if (pageTitle) {
      const institutionMatch = pageTitle.match(/([A-Z]{2,}[-\s]?[A-Z]{2,})/);
      if (institutionMatch) {
        metadata.institution = institutionMatch[0].trim();
      }

      const yearMatch = pageTitle.match(/\b(19|20)\d{2}\b/);
      if (yearMatch && !metadata.year) {
        metadata.year = parseInt(yearMatch[0], 10);
      }
    }

    logger.debug('Parsed exam metadata', metadata);
    return metadata;
  }

  /**
   * Parse all questions from HTML
   */
  parseQuestions(html: string): RawQuestion[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const questions: RawQuestion[] = [];
    const questionElements = document.querySelectorAll(SELECTORS.questionContainer);

    logger.info(`Found ${questionElements.length} question containers`);

    questionElements.forEach((questionElement, index) => {
      try {
        const question = this.parseQuestion(questionElement as Element);
        if (question) {
          questions.push(question);
          logger.debug(`Parsed question ${index + 1}/${questionElements.length}`);
        }
      } catch (error) {
        logger.warn(`Failed to parse question ${index + 1}: ${(error as Error).message}`);
      }
    });

    return questions;
  }

  /**
   * Parse a single question from HTML (for single-page questions)
   */
  parseSingleQuestion(html: string): RawQuestion | null {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    try {
      // Look for h3 directly in document
      const h3 = document.querySelector('h3');
      if (!h3) {
        logger.warn('Question title (h3) not found in document');
        return null;
      }

      // Get parent container of h3
      const container = h3.parentElement;
      if (!container) {
        logger.warn('Question container (parent of h3) not found');
        return null;
      }

      return this.parseQuestionFromContainer(container);
    } catch (error) {
      logger.error(`Failed to parse single question: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Parse a single question from container element
   */
  private parseQuestionFromContainer(container: Element): RawQuestion | null {
    // Extract title
    const h3 = container.querySelector('h3');
    if (!h3) {
      logger.warn('Question title (h3) not found');
      return null;
    }

    // Extract statement - get all text between h3 and form/img
    let statement = '';
    let node = h3.nextSibling;
    
    while (node) {
      // Stop at form or img
      if (node.nodeName === 'FORM') {
        break;
      }
      
      if (node.nodeName === 'IMG') {
        // Skip images but continue
        node = node.nextSibling;
        continue;
      }
      
      if (node.nodeType === 3) { // Text node
        statement += node.textContent || '';
      } else if (node.nodeType === 1) { // Element node
        const element = node as Element;
        if (element.tagName !== 'FORM' && element.tagName !== 'IMG') {
          statement += element.textContent || '';
        }
      }
      
      node = node.nextSibling;
    }

    statement = this.cleanText(statement);

    if (!statement) {
      logger.warn('Question statement is empty');
      return null;
    }

    // Extract alternatives from radio buttons
    const alternatives = this.parseAlternativesFromContainer(container);
    if (alternatives.length === 0) {
      logger.warn('No alternatives found for question');
      return null;
    }

    // Extract images
    const imageUrls = this.extractImagesFromContainer(container);

    // Find correct answer index from alternatives marked with isCorrect
    const correctAlternativeIndex = alternatives.findIndex(alt => alt.isCorrect);
    
    if (correctAlternativeIndex >= 0) {
      logger.debug(`Found correct answer at index ${correctAlternativeIndex}: ${alternatives[correctAlternativeIndex].text.substring(0, 50)}...`);
    } else {
      logger.debug('No correct answer found (question not yet answered)');
    }

    // Extract question number from h3 title (e.g., "Questão 5" -> "5")
    let questionNumber: string | undefined;
    const h3Text = h3.textContent || '';
    const numberMatch = h3Text.match(/questão\s+(\d+)/i);
    if (numberMatch) {
      questionNumber = numberMatch[1];
    }

    return {
      statement,
      alternatives,
      correctAlternativeIndex: correctAlternativeIndex >= 0 ? correctAlternativeIndex : -1,
      imageUrls,
      metadata: {
        questionNumber,
      },
    };
  }

  /**
   * Parse alternatives from container
   * Detects correct answer by looking for 'alert-success' class
   */
  private parseAlternativesFromContainer(container: Element): RawAlternative[] {
    const alternatives: RawAlternative[] = [];
    const radioLabels = container.querySelectorAll('.radio label');

    radioLabels.forEach((label, index) => {
      const text = this.cleanText(label.textContent || '');
      
      if (text) {
        // Check if this alternative is marked as correct (has alert-success class on parent div)
        const parentDiv = label.closest('.radio');
        const isCorrect = parentDiv?.classList.contains('alert-success') || false;
        
        alternatives.push({
          text,
          order: index,
          isCorrect, // Mark if this is the correct answer
        });
      }
    });

    return alternatives;
  }

  /**
   * Extract images from container
   */
  private extractImagesFromContainer(container: Element): string[] {
    const images: string[] = [];
    const imgElements = container.querySelectorAll('img.img-responsive');

    imgElements.forEach((img) => {
      const src = img.getAttribute('src');
      if (src) {
        const absoluteUrl = this.makeAbsoluteUrl(src);
        images.push(absoluteUrl);
      }
    });

    return images;
  }

  /**
   * Parse a single question element (legacy method)
   */
  private parseQuestion(questionElement: Element): RawQuestion | null {
    return this.parseQuestionFromContainer(questionElement);
  }

  /**
   * Parse alternatives from question element (legacy method)
   */
  parseAlternatives(questionElement: Element): RawAlternative[] {
    return this.parseAlternativesFromContainer(questionElement);
  }

  /**
   * Extract image URLs from element (legacy method)
   */
  extractImages(element: Element): string[] {
    return this.extractImagesFromContainer(element);
  }

  /**
   * Clean HTML content while preserving some formatting
   */
  cleanHtmlContent(html: string): string {
    // Remove script and style tags
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Clean up whitespace
    html = html.replace(/\s+/g, ' ').trim();

    return html;
  }

  /**
   * Clean text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\t+/g, ' ')
      .trim();
  }

  /**
   * Convert relative URL to absolute
   */
  private makeAbsoluteUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Assume provaderesidencia.com.br as base
    const baseUrl = 'https://provaderesidencia.com.br';
    
    if (url.startsWith('/')) {
      return baseUrl + url;
    }

    return baseUrl + '/' + url;
  }
}
