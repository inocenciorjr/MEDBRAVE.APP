/**
 * Parser module - Converts Hardworq format to MedBrave format
 */

import { HardworqQuestion } from './types';
import { Question, QuestionAlternative, QuestionDifficulty, QuestionStatus } from '../../src/domain/questions/types';
import { logger } from './utils/logger';

export class HardworqParser {
  /**
   * Convert Hardworq question to MedBrave Question format
   */
  convertToMedBraveFormat(hardworqQuestion: HardworqQuestion): Question {
    // Find correct alternative
    const correctAlt = hardworqQuestion.alternativas.find((a) => a.correta);
    const correctIndex = hardworqQuestion.alternativas.indexOf(correctAlt!);

    // Generate IDs
    const questionId = `hardworq-${hardworqQuestion.id}`;
    const alternatives = this.convertAlternatives(hardworqQuestion, questionId);
    const correctAlternativeId = alternatives[correctIndex]?.id || alternatives[0]?.id;

    const question: Question = {
      id: questionId,
      statement: hardworqQuestion.enunciado,
      alternatives,
      correct_alternative_id: correctAlternativeId,
      explanation: null, // Será preenchido pela IA depois
      difficulty: QuestionDifficulty.MEDIUM,
      difficulty_level: 3,
      filter_ids: [],
      sub_filter_ids: [],
      tags: this.generateTags(hardworqQuestion),
      source: hardworqQuestion.prova.instituicao,
      year: parseInt(hardworqQuestion.prova.ano),
      status: QuestionStatus.DRAFT,
      is_annulled: hardworqQuestion.anulada,
      is_outdated: false, // Sempre false no scraper, será marcado manualmente depois
      is_active: false,
      review_count: 0,
      average_rating: 0,
      rating: 0,
      created_by: 'scraper-hardworq',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_urls: hardworqQuestion.imagem ? [hardworqQuestion.imagem] : [],
      metadata: {
        hardworq_id: hardworqQuestion.id,
        hardworq_codigo: hardworqQuestion.codigo,
        prova_id: hardworqQuestion.prova.id,
        prova_codigo: hardworqQuestion.prova.codigo,
        estado: hardworqQuestion.prova.estado,
        grupo: hardworqQuestion.prova.grupo,
        professor_comment: hardworqQuestion.explicacao_professor || null, // Comentário original do professor
        scraped_at: new Date().toISOString(),
        scraper_version: '1.0.0',
        scraper_source: 'hardworq',
      },
    };

    return question;
  }

  /**
   * Convert alternatives
   */
  private convertAlternatives(
    hardworqQuestion: HardworqQuestion,
    questionId: string
  ): QuestionAlternative[] {
    return hardworqQuestion.alternativas.map((alt, index) => ({
      id: `${questionId}-alt-${index}`,
      text: alt.alternativa,
      isCorrect: alt.correta,
      order: index,
      explanation: null,
    }));
  }

  /**
   * Generate tags from prova metadata
   */
  private generateTags(hardworqQuestion: HardworqQuestion): string[] {
    const tags: string[] = [];

    // Add prova codigo
    tags.push(hardworqQuestion.prova.codigo);

    // Add instituição
    if (hardworqQuestion.prova.instituicao) {
      tags.push(hardworqQuestion.prova.instituicao);
    }

    // Add grupo (R1, R2, etc)
    if (hardworqQuestion.prova.grupo) {
      tags.push(hardworqQuestion.prova.grupo);
    }

    // Add estado
    if (hardworqQuestion.prova.estado) {
      tags.push(hardworqQuestion.prova.estado);
    }

    // Add ano
    if (hardworqQuestion.prova.ano) {
      tags.push(hardworqQuestion.prova.ano);
    }

    // Add "anulada" tag if applicable
    if (hardworqQuestion.anulada) {
      tags.push('anulada');
    }

    return tags;
  }

  /**
   * Convert batch of questions
   */
  convertBatch(hardworqQuestions: HardworqQuestion[]): Question[] {
    logger.info(`Converting ${hardworqQuestions.length} questions to MedBrave format...`);

    const questions = hardworqQuestions.map((hq) => {
      try {
        return this.convertToMedBraveFormat(hq);
      } catch (error) {
        logger.error(`Failed to convert question ${hq.codigo}: ${(error as Error).message}`);
        return null;
      }
    }).filter((q): q is Question => q !== null);

    logger.info(`Successfully converted ${questions.length}/${hardworqQuestions.length} questions`);

    return questions;
  }
}
