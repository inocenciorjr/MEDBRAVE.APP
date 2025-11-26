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
import { supabase } from '../../../config';

// Importar serviços Supabase
import { SupabasePaymentService } from '../../../infra/payment/supabase/SupabasePaymentService';
import { SupabasePixPaymentService } from '../../../infra/payment/supabase/SupabasePixPaymentService';
import { SupabaseCreditCardPaymentService } from '../../../infra/payment/supabase/SupabaseCreditCardPaymentService';
import { SupabaseUserPlanService } from '../../../infra/payment/supabase/SupabaseUserPlanService';
import { SupabasePlanService } from '../../../infra/payment/supabase/SupabasePlanService';
import { SupabaseCouponService } from '../../../infra/payment/supabase/SupabaseCouponService';
import { SupabaseInvoiceService } from '../../../infra/payment/supabase/SupabaseInvoiceService';
import { SupabasePaymentNotificationService } from '../../../infra/notifications/supabase/SupabasePaymentNotificationService';
import { SupabaseNotificationService } from '../../../infra/notifications/supabase/SupabaseNotificationService';

/**
 * Cria o módulo de pagamentos
 * @returns Router com todas as rotas do módulo de pagamentos
 */
export const createPaymentModule = (): Router => {
  const router = Router();

  // Inicializar serviços
  const planService = new SupabasePlanService(supabase);
  const userPlanService = new SupabaseUserPlanService(supabase, planService);
  const pixPaymentService = new SupabasePixPaymentService(supabase);
  const creditCardPaymentService = new SupabaseCreditCardPaymentService(supabase);
  const notificationService = new SupabaseNotificationService(supabase);
  const paymentNotificationService = new SupabasePaymentNotificationService(notificationService);
  const paymentService = new SupabasePaymentService(
    supabase,
    userPlanService,
    pixPaymentService,
  );
  const couponService = new SupabaseCouponService(supabase);
  const invoiceService = new SupabaseInvoiceService(paymentService);

  // Inicializar controladores
  const paymentController = new PaymentController(
    paymentService,
    pixPaymentService,
    creditCardPaymentService,
    paymentNotificationService,
  );
  const planController = new PlanController(planService);
  const userPlanController = new UserPlanController(
    userPlanService,
    planService,
  );
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
