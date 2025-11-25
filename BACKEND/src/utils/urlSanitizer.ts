/**
 * 🔒 URL SANITIZER
 * 
 * Utilitário para validar e sanitizar URLs, prevenindo ataques SSRF.
 */

import logger from './logger';

// Lista de domínios permitidos (whitelist)
const ALLOWED_DOMAINS = [
  'provaderesidencia.com.br',
  'www.provaderesidencia.com.br',
];

// Lista de IPs/ranges privados bloqueados (prevenir SSRF)
const BLOCKED_IP_PATTERNS = [
  /^127\./,           // localhost
  /^10\./,            // Private network
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Private network
  /^192\.168\./,      // Private network
  /^169\.254\./,      // Link-local
  /^::1$/,            // IPv6 localhost
  /^fe80:/,           // IPv6 link-local
  /^fc00:/,           // IPv6 private
];

// Lista de protocolos permitidos
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Valida e sanitiza uma URL
 */
export function validateAndSanitizeUrl(urlString: string): UrlValidationResult {
  try {
    // Remover espaços em branco
    urlString = urlString.trim();

    // Verificar se a URL não está vazia
    if (!urlString) {
      return {
        isValid: false,
        error: 'URL não pode estar vazia',
      };
    }

    // Parse da URL
    let url: URL;
    try {
      url = new URL(urlString);
    } catch (e) {
      return {
        isValid: false,
        error: 'Formato de URL inválido',
      };
    }

    // Verificar protocolo
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return {
        isValid: false,
        error: `Protocolo não permitido: ${url.protocol}. Apenas HTTP e HTTPS são permitidos.`,
      };
    }

    // Verificar domínio na whitelist
    const hostname = url.hostname.toLowerCase();
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowedDomain) {
      logger.warn(`[UrlSanitizer] Tentativa de acesso a domínio não permitido: ${hostname}`);
      return {
        isValid: false,
        error: `Domínio não permitido: ${hostname}. Apenas ${ALLOWED_DOMAINS.join(', ')} são permitidos.`,
      };
    }

    // Verificar se não é um IP privado (prevenir SSRF)
    const isBlockedIp = BLOCKED_IP_PATTERNS.some(pattern => pattern.test(hostname));
    if (isBlockedIp) {
      logger.warn(`[UrlSanitizer] Tentativa de acesso a IP privado: ${hostname}`);
      return {
        isValid: false,
        error: 'Acesso a IPs privados não é permitido',
      };
    }

    // Verificar se não tem credenciais na URL (username:password@)
    if (url.username || url.password) {
      logger.warn(`[UrlSanitizer] URL com credenciais detectada`);
      return {
        isValid: false,
        error: 'URLs com credenciais não são permitidas',
      };
    }

    // URL válida e sanitizada
    const sanitizedUrl = url.toString();
    
    logger.info(`[UrlSanitizer] URL validada: ${sanitizedUrl}`);
    
    return {
      isValid: true,
      sanitizedUrl,
    };
  } catch (error: any) {
    logger.error('[UrlSanitizer] Erro ao validar URL:', error);
    return {
      isValid: false,
      error: 'Erro ao validar URL',
    };
  }
}

/**
 * Valida múltiplas URLs
 */
export function validateAndSanitizeUrls(urls: string[]): {
  valid: string[];
  invalid: Array<{ url: string; error: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ url: string; error: string }> = [];

  for (const url of urls) {
    const result = validateAndSanitizeUrl(url);
    
    if (result.isValid && result.sanitizedUrl) {
      valid.push(result.sanitizedUrl);
    } else {
      invalid.push({
        url,
        error: result.error || 'URL inválida',
      });
    }
  }

  return { valid, invalid };
}

/**
 * Adiciona domínio à whitelist (útil para testes ou configuração)
 */
export function addAllowedDomain(domain: string) {
  if (!ALLOWED_DOMAINS.includes(domain)) {
    ALLOWED_DOMAINS.push(domain);
    logger.info(`[UrlSanitizer] Domínio adicionado à whitelist: ${domain}`);
  }
}

/**
 * Remove domínio da whitelist
 */
export function removeAllowedDomain(domain: string) {
  const index = ALLOWED_DOMAINS.indexOf(domain);
  if (index > -1) {
    ALLOWED_DOMAINS.splice(index, 1);
    logger.info(`[UrlSanitizer] Domínio removido da whitelist: ${domain}`);
  }
}

/**
 * Obtém lista de domínios permitidos
 */
export function getAllowedDomains(): string[] {
  return [...ALLOWED_DOMAINS];
}
