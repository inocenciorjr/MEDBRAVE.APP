/**
 * 🔍 ROTAS DE MONITORAMENTO
 *
 * Rotas para acessar dados de monitoramento de requisições:
 * - GET /api/monitoring/stats - Estatísticas gerais
 * - GET /api/monitoring/dashboard - Dados para dashboard
 * - GET /api/monitoring/requests - Requisições recentes
 * - GET /api/monitoring/errors - Requisições com erro
 * - GET /api/monitoring/slow - Requisições lentas
 * - GET /api/monitoring/user/:userId - Requisições de usuário
 * - POST /api/monitoring/export - Exportar relatório
 * - DELETE /api/monitoring/clear - Limpar dados
 * - PUT /api/monitoring/toggle - Habilitar/desabilitar
 */

import { Router } from 'express';
import { monitoringController } from '../controllers/MonitoringController';
import { enhancedAuthMiddleware } from '../domain/auth/middleware/enhancedAuth.middleware';
import { adminMiddleware } from '../domain/auth/middleware/admin.middleware';

const router = Router();

// Rota pública para receber dados do frontend (sem autenticação)
router.post('/frontend-data', monitoringController.receiveFrontendData);

// Middleware de autenticação + plano e admin para as demais rotas
router.use(enhancedAuthMiddleware);
router.use(adminMiddleware as any);

/**
 * @swagger
 * /api/monitoring/stats:
 *   get:
 *     summary: Obter estatísticas de monitoramento
 *     description: Retorna estatísticas detalhadas sobre requisições, performance e erros
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial para filtrar estatísticas
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final para filtrar estatísticas
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: number
 *                     totalErrors:
 *                       type: number
 *                     averageResponseTime:
 *                       type: number
 *                     requestsByMethod:
 *                       type: object
 *                     requestsByEndpoint:
 *                       type: object
 *                     requestsByUser:
 *                       type: object
 *                     topSlowEndpoints:
 *                       type: array
 *       403:
 *         description: Acesso negado - apenas administradores
 */
router.get('/stats', monitoringController.getStatistics);

/**
 * @swagger
 * /api/monitoring/dashboard:
 *   get:
 *     summary: Obter dados para dashboard de monitoramento
 *     description: Retorna dados consolidados para exibição em dashboard
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do dashboard obtidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     recent:
 *                       type: object
 *                       description: Estatísticas dos últimos 30 minutos
 *                     overall:
 *                       type: object
 *                       description: Estatísticas gerais
 *                     recentRequests:
 *                       type: array
 *                       description: Últimas 20 requisições
 *                     recentErrors:
 *                       type: array
 *                       description: Últimos 10 erros
 *                     slowRequests:
 *                       type: array
 *                       description: 10 requisições mais lentas
 */
router.get('/dashboard', monitoringController.getDashboardData);

/**
 * @swagger
 * /api/monitoring/requests:
 *   get:
 *     summary: Obter requisições recentes
 *     description: Retorna lista das requisições mais recentes
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de requisições a retornar
 *     responses:
 *       200:
 *         description: Requisições obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                       method:
 *                         type: string
 *                       url:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       responseTime:
 *                         type: number
 *                       statusCode:
 *                         type: number
 *                       success:
 *                         type: boolean
 */
router.get('/requests', monitoringController.getRecentRequests);

/**
 * @swagger
 * /api/monitoring/errors:
 *   get:
 *     summary: Obter requisições com erro
 *     description: Retorna lista das requisições que resultaram em erro
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de erros a retornar
 *     responses:
 *       200:
 *         description: Erros obtidos com sucesso
 */
router.get('/errors', monitoringController.getErrorRequests);

/**
 * @swagger
 * /api/monitoring/slow:
 *   get:
 *     summary: Obter requisições lentas
 *     description: Retorna lista das requisições mais lentas
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Tempo mínimo em ms para considerar requisição lenta
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de requisições a retornar
 *     responses:
 *       200:
 *         description: Requisições lentas obtidas com sucesso
 */
router.get('/slow', monitoringController.getSlowRequests);

/**
 * @swagger
 * /api/monitoring/user/{userId}:
 *   get:
 *     summary: Obter requisições de um usuário
 *     description: Retorna lista das requisições feitas por um usuário específico
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de requisições a retornar
 *     responses:
 *       200:
 *         description: Requisições do usuário obtidas com sucesso
 */
router.get('/user/:userId', monitoringController.getUserRequests);

/**
 * @swagger
 * /api/monitoring/export:
 *   post:
 *     summary: Exportar relatório de monitoramento
 *     description: Gera e exporta relatório de monitoramento em JSON ou CSV
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *                 default: json
 *                 description: Formato do arquivo de exportação
 *               filename:
 *                 type: string
 *                 description: Nome personalizado para o arquivo
 *     responses:
 *       200:
 *         description: Relatório exportado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 filepath:
 *                   type: string
 *                 format:
 *                   type: string
 */
router.post('/export', monitoringController.exportReport);

/**
 * @swagger
 * /api/monitoring/clear:
 *   delete:
 *     summary: Limpar dados de monitoramento
 *     description: Remove todos os dados de monitoramento armazenados em memória
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados limpos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.delete('/clear', monitoringController.clearData);

/**
 * @swagger
 * /api/monitoring/toggle:
 *   put:
 *     summary: Habilitar/desabilitar monitoramento
 *     description: Controla se o sistema de monitoramento está ativo
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Se o monitoramento deve estar habilitado
 *             required:
 *               - enabled
 *     responses:
 *       200:
 *         description: Estado do monitoramento alterado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 enabled:
 *                   type: boolean
 */
router.put('/toggle', monitoringController.toggleMonitoring);

export default router;
