import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        user_role: string;
        emailVerified: boolean;
        username_slug?: string;
      };
      user_id?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    user_role: string;
    emailVerified: boolean;
    username_slug?: string;
  };
}