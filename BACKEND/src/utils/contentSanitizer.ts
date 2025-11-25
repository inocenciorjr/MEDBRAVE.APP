/**
 * 🧹 CONTENT SANITIZER
 * 
 * Utilitário para sanitizar conteúdo HTML extraído, prevenindo XSS.
 * Remove scripts, iframes e outros elementos perigosos.
 */

import logger from './logger';

// Protocolos permitidos em URLs
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:'];

/**
 * Sanitiza texto HTML removendo elementos perigosos
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  try {
    // Remover scripts
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remover iframes
    html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    // Remover event handlers (onclick, onload, etc)
    html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    html = html.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remover javascript: URLs
    html = html.replace(/javascript:/gi, '');

    // Remover data: URLs que não sejam imagens
    html = html.replace(/data:(?!image\/)/gi, '');

    // Remover style com expressões perigosas
    html = html.replace(/style\s*=\s*["'][^"']*expression\([^"']*\)["']/gi, '');
    html = html.replace(/style\s*=\s*["'][^"']*javascript:[^"']*["']/gi, '');

    // Remover tags <object>, <embed>, <applet>
    html = html.replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

    // Remover <meta> tags
    html = html.replace(/<meta\b[^>]*>/gi, '');

    // Remover <link> tags
    html = html.replace(/<link\b[^>]*>/gi, '');

    // Remover <base> tags
    html = html.replace(/<base\b[^>]*>/gi, '');



    return html.trim();
  } catch (error: any) {
    logger.error('[ContentSanitizer] Erro ao sanitizar HTML:', error);
    // Em caso de erro, retornar string vazia (fail-safe)
    return '';
  }
}

/**
 * Sanitiza texto simples removendo caracteres perigosos
 */
export function sanitizeText(text: string): string {
  if (!text) return '';

  try {
    // Remover caracteres de controle
    text = text.replace(/[\x00-\x1F\x7F]/g, '');

    // Remover múltiplos espaços
    text = text.replace(/\s+/g, ' ');

    // Trim
    text = text.trim();

    return text;
  } catch (error: any) {
    logger.error('[ContentSanitizer] Erro ao sanitizar texto:', error);
    return '';
  }
}

/**
 * Sanitiza URL verificando protocolo e removendo partes perigosas
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);

    // Verificar protocolo
    if (!ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
      logger.warn(`[ContentSanitizer] Protocolo não permitido: ${urlObj.protocol}`);
      return null;
    }

    // Remover credenciais
    urlObj.username = '';
    urlObj.password = '';

    return urlObj.toString();
  } catch (error) {
    logger.warn(`[ContentSanitizer] URL inválida: ${url}`);
    return null;
  }
}

/**
 * Sanitiza objeto de questão extraída
 */
export function sanitizeQuestion(question: any): any {
  try {
    // Se a questão vem do scraper (formato inglês), converter para português
    if (question.statement || question.alternatives) {
      // Encontrar índice da alternativa correta
      let correctIndex: number | undefined;
      if (question.correct_alternative_id && Array.isArray(question.alternatives)) {
        correctIndex = question.alternatives.findIndex((alt: any) =>
          alt.id === question.correct_alternative_id || alt.isCorrect === true
        );
        if (correctIndex === -1) correctIndex = undefined;
      }

      // Para imagens locais (caminhos do Windows), manter o caminho original
      let imagemUrl: string | undefined;
      if (question.image_urls && question.image_urls.length > 0) {
        const imageUrl = question.image_urls[0];
        // Se é caminho local do Windows, manter como está
        if (imageUrl.includes(':\\') || imageUrl.startsWith('/')) {
          imagemUrl = imageUrl;
        } else {
          // Se é URL, sanitizar
          imagemUrl = sanitizeUrl(imageUrl) || undefined;
        }
      }

      // Usar número da questão do metadata se disponível, senão usar ID
      const numero = question.metadata?.questionNumber
        ? String(question.metadata.questionNumber).padStart(2, '0')
        : sanitizeText(question.id || '');

      return {
        numero,
        enunciado: sanitizeHtml(question.statement || ''),
        alternativas: Array.isArray(question.alternatives)
          ? question.alternatives.map((alt: any) => sanitizeHtml(alt.text || alt))
          : [],
        correta: correctIndex,
        explicacao: question.explanation ? sanitizeHtml(question.explanation) : undefined,
        imagem: imagemUrl,
        tags: Array.isArray(question.tags)
          ? question.tags.map((tag: string) => sanitizeText(tag))
          : [],
        dificuldade: sanitizeText(question.difficulty || ''),
        status: sanitizeText(question.status || 'DRAFT'),
      };
    }

    // Formato já em português
    return {
      numero: sanitizeText(question.numero || ''),
      enunciado: sanitizeHtml(question.enunciado || ''),
      alternativas: Array.isArray(question.alternativas)
        ? question.alternativas.map((alt: string) => sanitizeHtml(alt))
        : [],
      correta: typeof question.correta === 'number' ? question.correta : undefined,
      explicacao: question.explicacao ? sanitizeHtml(question.explicacao) : undefined,
      imagem: question.imagem ? sanitizeUrl(question.imagem) : undefined,
      tags: Array.isArray(question.tags)
        ? question.tags.map((tag: string) => sanitizeText(tag))
        : [],
      dificuldade: sanitizeText(question.dificuldade || ''),
      status: sanitizeText(question.status || ''),
    };
  } catch (error: any) {
    logger.error('[ContentSanitizer] Erro ao sanitizar questão:', error);
    return null;
  }
}

/**
 * Sanitiza array de questões
 */
export function sanitizeQuestions(questions: any[]): any[] {
  if (!Array.isArray(questions)) {
    logger.warn('[ContentSanitizer] Input não é um array');
    return [];
  }

  return questions
    .map(q => sanitizeQuestion(q))
    .filter(q => q !== null);
}

/**
 * Valida e sanitiza metadados de extração
 */
export function sanitizeMetadata(metadata: any): any {
  try {
    return {
      source: sanitizeUrl(metadata.source) || '',
      institution: sanitizeText(metadata.institution || ''),
      year: typeof metadata.year === 'number' ? metadata.year : undefined,
      totalQuestions: typeof metadata.totalQuestions === 'number' ? metadata.totalQuestions : 0,
      extractionTime: typeof metadata.extractionTime === 'number' ? metadata.extractionTime : 0,
    };
  } catch (error: any) {
    logger.error('[ContentSanitizer] Erro ao sanitizar metadata:', error);
    return {};
  }
}
