import { Request, Response, NextFunction } from 'express';
import { IPaymentService } from '../interfaces/IPaymentService';
import { IPixPaymentService } from '../interfaces/IPixPaymentService';
import { ICreditCardPaymentService } from '../interfaces/ICreditCardPaymentService';
import { IPaymentNotificationService } from '../../notifications/interfaces/IPaymentNotificationService';
import { PaymentMethod, PaymentStatus } from '../types';
import { AppError, ErrorCodes, ErrorStatusCodes } from '../../../utils/errors';
import logger from '../../../utils/logger';
import '../../../@types/express';

/**
 * Controlador responsável por gerenciar os pagamentos
 */
export class PaymentController {
  private paymentService: IPaymentService;
  private pixPaymentService: IPixPaymentService;
  private creditCardPaymentService: ICreditCardPaymentService;
  private paymentNotificationService: IPaymentNotificationService;

  /**
   * Construtor do controlador de pagamentos
   * @param paymentService Serviço de pagamentos
   * @param pixPaymentService Serviço de pagamentos PIX
   * @param creditCardPaymentService Serviço de pagamentos por cartão de crédito
   * @param paymentNotificationService Serviço de notificações de pagamento
   */
  constructor(
    paymentService: IPaymentService,
    pixPaymentService: IPixPaymentService,
    creditCardPaymentService: ICreditCardPaymentService,
    paymentNotificationService: IPaymentNotificationService,
  ) {
    this.paymentService = paymentService;
    this.pixPaymentService = pixPaymentService;
    this.creditCardPaymentService = creditCardPaymentService;
    this.paymentNotificationService = paymentNotificationService;
  }

  /**
   * Obtém o ID do usuário autenticado
   * @param req Objeto de requisição
   * @returns ID do usuário autenticado
   * @throws {AppError} Erro se o usuário não estiver autenticado
   */
  private getAuthenticatedUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(ErrorStatusCodes[ErrorCodes.UNAUTHORIZED], 'Usuário não autenticado', ErrorCodes.UNAUTHORIZED);
    }
    return userId;
  }

  /**
   * Verifica se o usuário é um administrador
   * @param req Objeto de requisição
   * @throws {AppError} Erro se o usuário não for administrador
   */
  private ensureAdmin(req: Request): void {
    const role = req.user?.role;
    if (role !== 'admin') {
      throw new AppError(
        ErrorStatusCodes[ErrorCodes.FORBIDDEN],
        'Acesso negado. Apenas administradores podem realizar esta operação.',
        ErrorCodes.FORBIDDEN
      );
    }
  }

  /**
   * Cria um novo pagamento
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  createPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);

      // O usuário só pode criar pagamentos para si mesmo, a menos que seja admin
      const requestUserId = req.body.userId || userId;

      if (requestUserId !== userId) {
        const role = req.user?.role;
        if (role !== 'admin') {
          throw new AppError(
            ErrorStatusCodes[ErrorCodes.FORBIDDEN],
            'Você não pode criar pagamentos para outros usuários',
            ErrorCodes.FORBIDDEN
          );
        }
      }

      const {
        planId,
        userPlanId,
        couponId,
        amount,
        originalAmount,
        discountAmount,
        description,
        paymentMethod,
        paymentMethodDetails,
        metadata,
      } = req.body;

      // Validação básica
      if (!planId) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR], 'ID do plano é obrigatório', ErrorCodes.VALIDATION_ERROR);
      }

      if (!amount || amount <= 0) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Valor do pagamento deve ser maior que zero',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      if (!paymentMethod || !Object.values(PaymentMethod).includes(paymentMethod)) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          `Método de pagamento inválido. Valores permitidos: ${Object.values(PaymentMethod).join(', ')}`,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      const paymentData = {
        userId: requestUserId,
        planId,
        userPlanId,
        couponId,
        amount,
        originalAmount,
        discountAmount,
        description,
        paymentMethod,
        paymentMethodDetails,
        metadata,
      };

      const newPayment = await this.paymentService.createPayment(paymentData);

      res.status(201).json({
        success: true,
        data: newPayment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtém um pagamento pelo ID
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  getPaymentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paymentId = req.params.paymentId;
      const payment = await this.paymentService.getPaymentById(paymentId);

      if (!payment) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.NOT_FOUND], 'Pagamento não encontrado', ErrorCodes.NOT_FOUND);
      }

      // Verificar permissão: apenas o próprio usuário ou administradores podem acessar
      const userId = this.getAuthenticatedUserId(req);
      const role = req.user?.role;

      if (payment.userId !== userId && role !== 'admin') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.FORBIDDEN],
          'Você não tem permissão para acessar este pagamento',
          ErrorCodes.FORBIDDEN
        );
      }

      // Buscar detalhes adicionais do pagamento com base no método
      let paymentDetails = null;
      if (payment.paymentMethod === PaymentMethod.PIX) {
        paymentDetails = await this.pixPaymentService.getPixPaymentByPaymentId(paymentId);
      } else if (payment.paymentMethod === PaymentMethod.CREDIT_CARD) {
        paymentDetails =
          await this.creditCardPaymentService.getCreditCardPaymentByPaymentId(paymentId);
      }

      res.status(200).json({
        success: true,
        data: {
          payment,
          paymentDetails,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista os pagamentos do usuário
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  listUserPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Permitir que um usuário veja apenas seus próprios pagamentos ou que um admin veja de qualquer um
      let userId = req.params.userId || (req.query.userId as string);
      const authenticatedUserId = this.getAuthenticatedUserId(req);
      const role = req.user?.role;

      if (!userId) {
        userId = authenticatedUserId;
      } else if (userId !== authenticatedUserId && role !== 'admin') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.FORBIDDEN],
          'Você não tem permissão para visualizar pagamentos de outros usuários',
          ErrorCodes.FORBIDDEN
        );
      }

      const options = {
        userId,
        planId: req.query.planId as string,
        status: req.query.status as PaymentStatus,
        paymentMethod: req.query.paymentMethod as PaymentMethod,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        startAfter: req.query.startAfter as string,
      };

      const result = await this.paymentService.listPayments(options);

      res.status(200).json({
        success: true,
        data: result.payments,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          nextPageStartAfter: result.nextPageStartAfter,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Processa um pagamento
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  processPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paymentId = req.params.paymentId;

      // Verificar se o pagamento existe e se pertence ao usuário
      const payment = await this.paymentService.getPaymentById(paymentId);

      if (!payment) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.NOT_FOUND], 'Pagamento não encontrado', ErrorCodes.NOT_FOUND);
      }

      // Verificar permissão: apenas o próprio usuário ou administradores podem processar
      const userId = this.getAuthenticatedUserId(req);
      const role = req.user?.role;

      if (payment.userId !== userId && role !== 'admin') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.FORBIDDEN],
          'Você não tem permissão para processar este pagamento',
          ErrorCodes.FORBIDDEN
        );
      }

      // Verificar se o pagamento já foi processado
      if (payment.status !== PaymentStatus.PENDING) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.CONFLICT],
          `Não é possível processar um pagamento com status ${payment.status}`,
          ErrorCodes.CONFLICT
        );
      }

      const result = await this.paymentService.processPayment(paymentId);

      res.status(200).json({
        success: result.success,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancela um pagamento
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  cancelPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paymentId = req.params.paymentId;
      const { reason } = req.body;

      if (!reason) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR], 'Motivo do cancelamento é obrigatório', ErrorCodes.VALIDATION_ERROR);
      }

      // Verificar se o pagamento existe
      const payment = await this.paymentService.getPaymentById(paymentId);

      if (!payment) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.NOT_FOUND], 'Pagamento não encontrado', ErrorCodes.NOT_FOUND);
      }

      // Verificar permissão: apenas o próprio usuário (se o pagamento estiver pendente)
      // ou administradores podem cancelar
      const userId = this.getAuthenticatedUserId(req);
      const role = req.user?.role;

      if (payment.userId !== userId && role !== 'admin') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.FORBIDDEN],
          'Você não tem permissão para cancelar este pagamento',
          ErrorCodes.FORBIDDEN
        );
      }

      // Usuários normais só podem cancelar pagamentos pendentes
      if (
        payment.userId === userId &&
        role !== 'admin' &&
        payment.status !== PaymentStatus.PENDING
      ) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.CONFLICT],
          'Você só pode cancelar pagamentos pendentes. Entre em contato com o suporte para outros casos.',
          ErrorCodes.CONFLICT
        );
      }

      const cancelledPayment = await this.paymentService.cancelPayment(paymentId, reason);

      res.status(200).json({
        success: true,
        data: cancelledPayment,
        message: 'Pagamento cancelado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reembolsa um pagamento (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  refundPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const paymentId = req.params.paymentId;
      const { reason, gatewayTransactionId } = req.body;

      if (!reason) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR], 'Motivo do reembolso é obrigatório', ErrorCodes.VALIDATION_ERROR);
      }

      const adminId = this.getAuthenticatedUserId(req);

      const refundedPayment = await this.paymentService.refundPayment(
        paymentId,
        reason,
        gatewayTransactionId,
        adminId,
      );

      if (!refundedPayment) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.NOT_FOUND], 'Pagamento não encontrado ou não pode ser reembolsado', ErrorCodes.NOT_FOUND);
      }

      res.status(200).json({
        success: true,
        data: refundedPayment,
        message: 'Pagamento reembolsado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Manipula webhooks de pagamento
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   */
  webhookHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { gateway, event, data } = req.body;

      if (!gateway || !event || !data) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR], 'Informações incompletas de webhook', ErrorCodes.VALIDATION_ERROR);
      }

      logger.info(`Webhook recebido: gateway=${gateway}, event=${event}`);

      // Responder imediatamente, pois o processamento do webhook pode ser demorado
      // e alguns gateways têm timeout curto para resposta
      res.status(200).json({ success: true, message: 'Webhook recebido' });

      // Processar o webhook com base no gateway
      try {
        if (gateway.toLowerCase() === 'pix') {
          await this.handlePixWebhook(event, data);
        } else if (gateway.toLowerCase() === 'creditcard') {
          await this.handleCreditCardWebhook(event, data);
        } else {
          logger.warn(`Gateway desconhecido: ${gateway}`);
        }
      } catch (webhookError) {
        logger.error(`Erro ao processar webhook: ${webhookError}`);
      }
    } catch (error) {
      // Não podemos usar next(error) aqui, pois já respondemos ao cliente
      logger.error(`Erro ao receber webhook: ${error}`);
    }
  };

  /**
   * Manipula webhooks específicos de PIX
   * @param event Evento do webhook
   * @param data Dados do webhook
   */
  private async handlePixWebhook(event: string, data: any): Promise<void> {
    try {
      const { paymentId, transactionId, endToEndId } = data;

      if (!paymentId) {
        logger.error(`Webhook PIX sem paymentId: ${JSON.stringify(data)}`);
        return;
      }

      // Verificar se o pagamento existe
      const payment = await this.paymentService.getPaymentById(paymentId);

      if (!payment) {
        logger.error(`Pagamento não encontrado para webhook PIX: ${paymentId}`);
        return;
      }

      if (
        event.toLowerCase() === 'payment_received' ||
        event.toLowerCase() === 'payment_confirmed'
      ) {
        // Obter o pagamento PIX específico
        const pixPayment = await this.pixPaymentService.getPixPaymentByPaymentId(paymentId);

        if (!pixPayment) {
          logger.error(`Pagamento PIX não encontrado para webhook: ${paymentId}`);
          return;
        }

        // Aprovar o pagamento PIX
        await this.pixPaymentService.approvePixPayment(
          pixPayment.id,
          transactionId || 'webhook',
          endToEndId,
        );

        // Adicionar dados de transação
        const transactionData = {
          ...payment.transactionData,
          webhookEvent: event,
          webhookTimestamp: new Date().toISOString(),
          transactionId,
          endToEndId,
        };

        // Aprovar o pagamento principal
        await this.paymentService.approvePayment(paymentId, transactionId, transactionData);

        // Notificar o usuário
        await this.paymentNotificationService.notifyPaymentReceived(
          payment.userId,
          paymentId,
          payment.amount,
          payment.planId // ou nome do plano se disponível
        );
      }
    } catch (error) {
      logger.error(`Erro ao processar webhook PIX: ${error}`);
    }
  }

  /**
   * Manipula webhooks específicos de cartão de crédito
   * @param event Evento do webhook
   * @param data Dados do webhook
   */
  private async handleCreditCardWebhook(event: string, data: any): Promise<void> {
    try {
      const { paymentId, transactionId, authorizationCode, status, errorCode, errorMessage } = data;

      if (!paymentId) {
        logger.error(`Webhook de cartão sem paymentId: ${JSON.stringify(data)}`);
        return;
      }

      // Verificar se o pagamento existe
      const payment = await this.paymentService.getPaymentById(paymentId);

      if (!payment) {
        logger.error(`Pagamento não encontrado para webhook de cartão: ${paymentId}`);
        return;
      }

      // Obter o pagamento de cartão específico
      const ccPayment =
        await this.creditCardPaymentService.getCreditCardPaymentByPaymentId(paymentId);

      if (!ccPayment) {
        logger.error(`Pagamento de cartão não encontrado para webhook: ${paymentId}`);
        return;
      }

      // Adicionar dados de transação
      const transactionData = {
        ...payment.transactionData,
        webhookEvent: event,
        webhookTimestamp: new Date().toISOString(),
        transactionId,
        authorizationCode,
        status,
      };

      if (event.toLowerCase() === 'payment_authorized') {
        // Autorizar o pagamento de cartão
        await this.creditCardPaymentService.authorizeCreditCardPayment(
          ccPayment.id,
          transactionId || 'webhook',
          authorizationCode,
        );
      } else if (event.toLowerCase() === 'payment_captured') {
        // Capturar o pagamento de cartão
        await this.creditCardPaymentService.captureCreditCardPayment(ccPayment.id, transactionId);

        // Aprovar o pagamento principal
        await this.paymentService.approvePayment(paymentId, transactionId, transactionData);

        // Notificar o usuário
        await this.paymentNotificationService.notifyPaymentReceived(
          payment.userId,
          paymentId,
          payment.amount,
          payment.planId // ou nome do plano se disponível
        );
      } else if (
        event.toLowerCase() === 'payment_failed' ||
        event.toLowerCase() === 'payment_rejected'
      ) {
        // Rejeitar o pagamento de cartão
        await this.creditCardPaymentService.rejectCreditCardPayment(
          ccPayment.id,
          errorCode || 'webhook_rejected',
          errorMessage || `Pagamento rejeitado pelo gateway: ${event}`,
        );

        // Rejeitar o pagamento principal
        await this.paymentService.rejectPayment(
          paymentId,
          errorMessage || `Pagamento rejeitado pelo gateway: ${event}`,
          transactionData,
        );

        // Notificar o usuário
        await this.paymentNotificationService.notifyPaymentFailed(
          payment.userId,
          paymentId,
          payment.amount,
          errorMessage || 'Seu pagamento com cartão de crédito foi rejeitado pelo banco emissor.'
        );
      }
    } catch (error) {
      logger.error(`Erro ao processar webhook de cartão: ${error}`);
    }
  }
}
