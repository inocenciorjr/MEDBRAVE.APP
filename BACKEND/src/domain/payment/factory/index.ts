import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { PlanController } from '../controllers/PlanController';
import { UserPlanController } from '../controllers/UserPlanController';
import { CouponController } from '../controllers/CouponController';
import { InvoiceController } from '../controllers/InvoiceController';
import { createPaymentRoutes } from '../routes/paymentRoutes';
import { createPlanRoutes } from '../routes/planRoutes';
import { createUserPlanRoutes } from '../routes/userPlanRoutes';
import { createCouponRoutes } from '../routes/couponRoutes';
import { createInvoiceRoutes } from '../routes/invoiceRoutes';

// Importar serviços
import { FirebasePaymentService } from '../services/FirebasePaymentService';
import { FirebasePixPaymentService } from '../services/FirebasePixPaymentService';
import { FirebaseCreditCardPaymentService } from '../services/FirebaseCreditCardPaymentService';
import { FirebaseUserPlanService } from '../services/FirebaseUserPlanService';
import { FirebasePlanService } from '../services/FirebasePlanService';
import { FirebaseCouponService } from '../services/FirebaseCouponService';
import { FirebaseInvoiceService } from '../services/FirebaseInvoiceService';
import { FirebasePaymentNotificationService } from '../../notifications/services/FirebasePaymentNotificationService';
import { IPaymentNotificationService } from '../../notifications/interfaces/IPaymentNotificationService';

/**
 * Cria o módulo de pagamentos
 * @returns Router com todas as rotas do módulo de pagamentos
 */
export const createPaymentModule = (): Router => {
  const router = Router();

  // Inicializar serviços
  const planService = new FirebasePlanService();
  const userPlanService = new FirebaseUserPlanService();
  const pixPaymentService = new FirebasePixPaymentService();
  const creditCardPaymentService = new FirebaseCreditCardPaymentService();
  // Mock mínimo para INotificationService, apenas para evitar erro de tipo em tempo de compilação
  const notificationServiceMock = {
    createNotification: async () => { throw new Error('Not implemented'); },
    getNotificationById: async () => { throw new Error('Not implemented'); },
    getUserNotifications: async () => { throw new Error('Not implemented'); },
    markNotificationAsRead: async () => { throw new Error('Not implemented'); },
    markAllNotificationsAsRead: async () => { throw new Error('Not implemented'); },
    updateNotification: async () => { throw new Error('Not implemented'); },
    deleteNotification: async () => { throw new Error('Not implemented'); },
    deleteAllUserNotifications: async () => { throw new Error('Not implemented'); },
    cleanupExpiredNotifications: async () => { throw new Error('Not implemented'); },
    sendNotificationToMultipleUsers: async () => { throw new Error('Not implemented'); },
    countUnreadNotifications: async () => { throw new Error('Not implemented'); },
    getUnreadNotificationsByTypeAndPriority: async () => { throw new Error('Not implemented'); },
  };
  const paymentNotificationService: IPaymentNotificationService = new FirebasePaymentNotificationService(notificationServiceMock);
  const paymentService = new FirebasePaymentService(
    userPlanService,
    pixPaymentService,
    paymentNotificationService,
  );
  const couponService = new FirebaseCouponService();
  const invoiceService = new FirebaseInvoiceService();

  // Inicializar controladores
  const paymentController = new PaymentController(
    paymentService,
    pixPaymentService,
    creditCardPaymentService,
    paymentNotificationService,
  );
  const planController = new PlanController(planService);
  const userPlanController = new UserPlanController(userPlanService, planService);
  const couponController = new CouponController(couponService);
  const invoiceController = new InvoiceController(invoiceService);

  // Configurar rotas
  router.use('/payments', createPaymentRoutes(paymentController));
  router.use('/plans', createPlanRoutes(planController));
  router.use('/user-plans', createUserPlanRoutes(userPlanController));
  router.use('/coupons', createCouponRoutes(couponController));
  router.use('/invoices', createInvoiceRoutes(invoiceController));

  return router;
};
