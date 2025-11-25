import {
  EmailVerificationToken,
  ListEmailVerificationTokensOptions,
  PaginatedEmailVerificationTokensResult,
} from '../types';

/**
 * Interface do serviu00e7o de gerenciamento de tokens de verificau00e7u00e3o de email
 */
export interface IEmailVerificationTokenService {
  /**
   * Cria um novo token de verificau00e7u00e3o de email
   * @param userId ID do usuu00e1rio
   * @param email Email do usuu00e1rio
   * @param type Tipo do token
   * @param options Opu00e7u00f5es adicionais
   */
  createEmailVerificationToken(
    userId: string,
    email: string,
    type: EmailVerificationToken['type'],
    options?: {
      expiresInMinutes?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<EmailVerificationToken>;

  /**
   * Busca um token de verificau00e7u00e3o de email pelo ID
   * @param tokenId ID do token
   */
  getEmailVerificationTokenById(
    tokenId: string,
  ): Promise<EmailVerificationToken | null>;

  /**
   * Busca um token de verificau00e7u00e3o de email pelo valor do token
   * @param token Valor do token
   */
  getEmailVerificationTokenByValue(
    token: string,
  ): Promise<EmailVerificationToken | null>;

  /**
   * Busca tokens ativos para um usuu00e1rio e tipo especu00edficos
   * @param userId ID do usuu00e1rio
   * @param type Tipo do token
   */
  getActiveTokensByUserIdAndType(
    userId: string,
    type: EmailVerificationToken['type'],
  ): Promise<EmailVerificationToken[]>;

  /**
   * Busca tokens de verificau00e7u00e3o de email com opu00e7u00f5es de filtro
   * @param options Opu00e7u00f5es de filtro
   */
  getEmailVerificationTokens(
    options?: ListEmailVerificationTokensOptions,
  ): Promise<PaginatedEmailVerificationTokensResult>;

  /**
   * Verifica e utiliza um token de verificau00e7u00e3o de email
   * @param token Valor do token
   */
  verifyAndUseEmailVerificationToken(
    token: string,
  ): Promise<EmailVerificationToken | null>;

  /**
   * Invalida todos os tokens de um usuu00e1rio
   * @param userId ID do usuu00e1rio
   * @param type Tipo do token
   */
  invalidateAllUserTokens(
    userId: string,
    type: EmailVerificationToken['type'],
  ): Promise<number>;

  /**
   * Exclui um token de verificau00e7u00e3o de email
   * @param tokenId ID do token
   */
  deleteEmailVerificationToken(tokenId: string): Promise<boolean>;

  /**
   * Limpa tokens de verificau00e7u00e3o de email expirados
   * @param olderThanDays Dias de retenu00e7u00e3o
   */
  cleanupExpiredEmailVerificationTokens(
    olderThanDays?: number,
  ): Promise<number>;
}
