import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    /**
     * Populado pelo authMiddleware após validação do token
     */
    user?: {
      id: string;
      email: string;
      user_role: string;
      emailVerified: boolean;
      username_slug?: string;
      [key: string]: any;
    };
    token?: string;
    mentorship?: any;
    admin?: import('../../domain/admin/types/AdminTypes').AdminUser;
  }
}
