import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/supabaseAuth.middleware';
import { IInvoiceService } from '../interfaces/IInvoiceService';
import { AppError, ErrorCodes, ErrorStatusCodes } from '../../../utils/errors';

/**
 * Controlador responsável por gerenciar as faturas
 */
export class InvoiceController {
  private invoiceService: IInvoiceService;

  /**
   * Construtor do controlador de faturas
   * @param invoiceService Serviço de faturas
   */
  constructor(invoiceService: IInvoiceService) {
    this.invoiceService = invoiceService;
  }

  /**
   * Obtém o ID do usuário autenticado
   * @param req Objeto de requisição
   * @returns ID do usuário autenticado
   * @throws {AppError} Erro se o usuário não estiver autenticado
   */
  private getAuthenticatedUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(
        ErrorStatusCodes[ErrorCodes.UNAUTHORIZED],
        'Usuário não autenticado',
        ErrorCodes.UNAUTHORIZED,
      );
    }
    return userId;
  }

  /**
   * Verifica se o usuário é um administrador
   * @param req Objeto de requisição
   * @throws {AppError} Erro se o usuário não for administrador
   */
  private ensureAdmin(req: AuthenticatedRequest): void {
    const role = (req.user?.user_role || '').toUpperCase();
    if (role !== 'ADMIN') {
      throw new AppError(
        ErrorStatusCodes[ErrorCodes.FORBIDDEN],
        'Acesso negado. Apenas administradores podem realizar esta operação.',
        ErrorCodes.FORBIDDEN,
      );
    }
  }

  /**
   * Obtém uma fatura pelo ID
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  getInvoiceById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const invoiceId = req.params.invoiceId;
      const invoice = await this.invoiceService.getInvoiceById(invoiceId);

      if (!invoice) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Fatura não encontrada',
          ErrorCodes.NOT_FOUND,
        );
      }

      // Verificar permissão: apenas o próprio usuário ou administradores podem acessar
      const userId = this.getAuthenticatedUserId(req);
      const role = (req.user?.user_role || '').toUpperCase();

      if (invoice.userId !== userId && role !== 'ADMIN') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.FORBIDDEN],
          'Você não tem permissão para acessar esta fatura',
          ErrorCodes.FORBIDDEN,
        );
      }

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtém uma fatura pelo ID do pagamento
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  getInvoiceByPaymentId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const paymentId = req.params.paymentId;
      const invoice =
        await this.invoiceService.getInvoiceByPaymentId(paymentId);

      if (!invoice) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Fatura não encontrada para este pagamento',
          ErrorCodes.NOT_FOUND,
        );
      }

      // Verificar permissão: apenas o próprio usuário ou administradores podem acessar
      const userId = this.getAuthenticatedUserId(req);
      const role = (req.user?.user_role || '').toUpperCase();

      if (invoice.userId !== userId && role !== 'ADMIN') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.FORBIDDEN],
          'Você não tem permissão para acessar esta fatura',
          ErrorCodes.FORBIDDEN,
        );
      }

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista as faturas do usuário autenticado
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  listUserInvoices = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Permitir que um usuário veja apenas suas próprias faturas ou que um admin veja de qualquer um
      let userId = req.params.userId || (req.query.userId as string);
      const authenticatedUserId = this.getAuthenticatedUserId(req);
      const role = (req.user?.user_role || '').toUpperCase();

      if (!userId) {
        userId = authenticatedUserId;
      } else if (userId !== authenticatedUserId && role !== 'ADMIN') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.FORBIDDEN],
          'Você não tem permissão para visualizar faturas de outros usuários',
          ErrorCodes.FORBIDDEN,
        );
      }

      const invoices = await this.invoiceService.getInvoicesByUserId(userId);

      res.status(200).json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Gera uma fatura para um pagamento (uso interno ou administrativo)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  generateInvoice = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Esta operação só pode ser feita por administradores ou pelo sistema
      this.ensureAdmin(req);

      const paymentId = req.params.paymentId;
      const invoice =
        await this.invoiceService.generateOrRetrieveInvoice(paymentId);

      if (!invoice) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR],
          'Não foi possível gerar a fatura para este pagamento',
          ErrorCodes.INTERNAL_SERVER_ERROR,
        );
      }

      res.status(200).json({
        success: true,
        data: invoice,
        message: 'Fatura gerada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };
}
