import { createHash } from 'crypto';
import { Question, QuestionAlternative, QuestionDifficulty, QuestionStatus } from '../../src/domain/questions/types';
import { RawQuestion, ExamMetadata } from './types';
import { logger } from './utils/logger';

export class QuestionTransformer {
  /**
   * Transform raw question data to Question schema
   */
  transform(raw: RawQuestion, examMetadata: ExamMetadata, index: number): Question {
    const questionId = this.generateQuestionId(raw, index);
    const alternatives = this.transformAlternatives(raw, questionId);
    const correctAlternativeId = alternatives[raw.correctAlternativeIndex]?.id || alternatives[0]?.id;

    const question: Question = {
      id: questionId,
      statement: raw.statement,
      alternatives,
      correct_alternative_id: correctAlternativeId,
      explanation: null,
      difficulty: QuestionDifficulty.MEDIUM,
      difficulty_level: 3,
      filter_ids: [],
      sub_filter_ids: [],
      tags: examMetadata.tags || [],
      source: examMetadata.institution || null,
      year: examMetadata.year || null,
      status: QuestionStatus.DRAFT,
      is_annulled: false,
      is_active: false,
      review_count: 0,
      average_rating: 0,
      rating: 0,
      created_by: 'scraper-system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_urls: raw.imageUrls,
      metadata: {
        ...raw.metadata,
        scraped_at: new Date().toISOString(),
        scraper_version: '1.0.0',
      },
    };

    logger.debug(`Transformed question ${index + 1}`, {
      id: question.id,
      alternativesCount: alternatives.length,
      imagesCount: raw.imageUrls.length,
    });

    return question;
  }

  /**
   * Insert images into statement HTML
   * Replaces placeholders like "(VER IMAGEM)" or inserts at the end
   */
  public insertImagesIntoStatement(statement: string, imageUrls: string[]): string {
    if (!imageUrls || imageUrls.length === 0) {
      return statement;
    }

    let result = statement;

    // Check if statement has image placeholders
    const placeholderPatterns = [
      /\(VER IMAGEM\)/gi,
      /\(ver imagem\)/gi,
      /\[IMAGEM\]/gi,
      /\[imagem\]/gi,
    ];

    let hasPlaceholder = false;
    for (const pattern of placeholderPatterns) {
      if (pattern.test(result)) {
        hasPlaceholder = true;
        break;
      }
    }

    if (hasPlaceholder) {
      // Replace placeholders with actual images
      imageUrls.forEach((imageUrl, index) => {
        const imgTag = this.createImageTag(imageUrl, index);
        
        // Try to replace first occurrence of any placeholder
        for (const pattern of placeholderPatterns) {
          if (pattern.test(result)) {
            result = result.replace(pattern, imgTag);
            return; // Move to next image
          }
        }
      });
    } else {
      // No placeholder found, append images at the end
      const imageTags = imageUrls.map((url, index) => this.createImageTag(url, index)).join('\n');
      result = `${result}\n\n${imageTags}`;
    }

    return result;
  }

  /**
   * Create HTML img tag for local image path
   */
  private createImageTag(imageUrl: string, index: number): string {
    // Extract filename from local path (Windows or Unix)
    const filename = imageUrl.includes('\\') 
      ? imageUrl.split('\\').pop()
      : imageUrl.includes('/') 
        ? imageUrl.split('/').pop() 
        : imageUrl;

    // Create img tag with local API endpoint
    return `<img src="/api/temp-images/${filename}" alt="Imagem da questão ${index + 1}" style="max-width: 100%; height: auto;" />`;
  }

  /**
   * Transform raw alternatives to QuestionAlternative schema
   */
  private transformAlternatives(raw: RawQuestion, questionId: string): QuestionAlternative[] {
    return raw.alternatives.map((alt, index) => ({
      id: this.generateAlternativeId(questionId, index),
      text: alt.text,
      isCorrect: index === raw.correctAlternativeIndex,
      explanation: null,
      order: alt.order,
    }));
  }

  /**
   * Generate unique question ID based on content hash
   */
  private generateQuestionId(raw: RawQuestion, index: number): string {
    // Use content hash for deterministic ID generation
    const content = raw.statement + raw.alternatives.map(a => a.text).join('');
    const hash = createHash('md5').update(content).digest('hex');
    
    // Use first 8 chars of hash + index for uniqueness
    return `q-${hash.substring(0, 8)}-${index}`;
  }

  /**
   * Generate unique alternative ID
   */
  private generateAlternativeId(questionId: string, index: number): string {
    return `${questionId}-alt-${index}`;
  }

  /**
   * Transform batch of raw questions
   */
  transformBatch(rawQuestions: RawQuestion[], examMetadata: ExamMetadata): Question[] {
    logger.info(`Transforming ${rawQuestions.length} questions...`);

    const questions = rawQuestions.map((raw, index) => {
      try {
        return this.transform(raw, examMetadata, index);
      } catch (error) {
        logger.error(`Failed to transform question ${index + 1}: ${(error as Error).message}`);
        return null;
      }
    }).filter((q): q is Question => q !== null);

    logger.info(`Successfully transformed ${questions.length}/${rawQuestions.length} questions`);

    return questions;
  }
}
