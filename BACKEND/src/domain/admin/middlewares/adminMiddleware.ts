import { Request, Response, NextFunction } from 'express';
import { SupabaseAdminService } from '../../../infra/admin/supabase/SupabaseAdminService';

/**
 * Middleware para verificar se o usuário é um administrador
 * @param req Requisição Express
 * @param res Resposta Express
 * @param next Função de próximo middleware
 */
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Autenticação necessária',
          code: 'auth/unauthorized',
        },
      });
    }

    // Inicializar o serviço de administração
    const adminService = SupabaseAdminService.getInstance();

    // Verificar se o usuário é um administrador
    const adminUser = await adminService.getAdminByUserId(req.user.id);

    if (!adminUser) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Acesso negado: permissões de administrador necessárias',
          code: 'auth/insufficient-permissions',
        },
      });
    }

    // Adicionar informações de administrador à requisição
    (req as any).admin = adminUser;

    // Prosseguir para o próximo middleware
    return next();
  } catch (error) {
    console.error('Erro no middleware de administrador:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Erro ao verificar permissões de administrador',
        code: 'admin/internal-error',
      },
    });
  }
};
