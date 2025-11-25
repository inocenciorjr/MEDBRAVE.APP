import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { supabaseAdmin } from '../../supabase.config';
import { logger } from '../utils/logger';

interface AuthenticatedWebSocket extends WebSocket {
  user_id?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type:
    | 'notification'
    | 'badge_update'
    | 'connection_status'
    | 'ping'
    | 'pong'
    | 'error';
  data?: any;
  timestamp: number;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));

    // Heartbeat para detectar conexões mortas
    this.heartbeatInterval = setInterval(this.heartbeat.bind(this), 30000);

    logger.info('🔌 WebSocket server configurado');
  }

  private async verifyClient(info: any): Promise<boolean> {
    try {
      const url = parse(info.req.url, true);
      const token = url.query.token as string;

      if (!token) {
        logger.warn('🔌 WebSocket: Token não fornecido');
        return false;
      }

      // Verificar token Supabase
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(decodeURIComponent(token));

      if (error || !user) {
        logger.warn('🔌 WebSocket: Token inválido', error?.message);
        return false;
      }

      if (!user.id) {
        logger.warn('🔌 WebSocket: ID do usuário não encontrado');
        return false;
      }

      // Armazenar user_id para uso posterior
      (info.req as any).user_id = user.id;
      return true;
    } catch (error) {
      logger.error('🔌 WebSocket: Erro na verificação do token:', error);
      return false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: any) {
    const user_id = req.user_id;

    if (!user_id) {
      logger.warn('🔌 WebSocket: Conexão rejeitada - user_id não encontrado');
      ws.close(1008, 'Token inválido');
      return;
    }

    // Configurar cliente
    ws.user_id = user_id;
    ws.isAlive = true;

    // Adicionar à lista de clientes
    if (!this.clients.has(user_id)) {
      this.clients.set(user_id, new Set());
    }
    this.clients.get(user_id)!.add(ws);

    logger.info(`🔌 WebSocket: Cliente conectado - user_id: ${user_id}`);

    // Enviar mensagem de boas-vindas
    this.sendToClient(ws, {
      type: 'connection_status',
      data: { status: 'connected', message: 'WebSocket conectado com sucesso' },
      timestamp: Date.now(),
    });

    // Handlers de eventos
    ws.on('message', (data: Buffer) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleDisconnection(ws));
    ws.on('error', (error: Error) => this.handleError(ws, error));
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      logger.info(`📨 WebSocket: Mensagem recebida de ${ws.user_id}:`, message);

      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, {
            type: 'pong',
            data: { timestamp: message.timestamp },
            timestamp: Date.now(),
        });
          break;

        case 'subscribe':
          // Implementar sistema de subscriptions futuro
          logger.info(
          `🔔 WebSocket: ${ws.user_id} inscrito em: ${message.data?.channel}`,
        );
          break;

        default:
          logger.warn(
          `🔌 WebSocket: Tipo de mensagem desconhecido: ${message.type}`,
        );
      }
    } catch (error) {
      logger.error('🔌 WebSocket: Erro ao processar mensagem:', error);
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Erro ao processar mensagem' },
        timestamp: Date.now(),
      });
    }
  }

  private handleDisconnection(ws: AuthenticatedWebSocket) {
    if (ws.user_id) {
      const userClients = this.clients.get(ws.user_id);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.user_id);
        }
      }
      logger.info(`🔌 WebSocket: Cliente desconectado - user_id: ${ws.user_id}`);
    }
  }

  private handleError(ws: AuthenticatedWebSocket, error: Error) {
    logger.error(`🔌 WebSocket: Erro na conexão ${ws.user_id}:`, error);
  }

  private heartbeat() {
    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (!ws.isAlive) {
        logger.info(`💔 WebSocket: Conexão morta detectada - ${ws.user_id}`);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }

  private sendToClient(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('🔌 WebSocket: Erro ao enviar mensagem:', error);
      }
    }
  }

  // Métodos públicos para envio de notificações
  public sendNotificationToUser(userId: string, notification: any) {
    const userClients = this.clients.get(userId);
    if (userClients && userClients.size > 0) {
      const message: WebSocketMessage = {
        type: 'notification',
        data: notification,
        timestamp: Date.now(),
      };

      userClients.forEach((ws) => {
        this.sendToClient(ws, message);
      });

      logger.info(`🔔 WebSocket: Notificação enviada para ${userId}`);
      return true;
    }

    logger.info(`🔔 WebSocket: Usuário ${userId} não conectado`);
    return false;
  }

  public sendBadgeUpdate(userId: string, stats: any) {
    const userClients = this.clients.get(userId);
    if (userClients && userClients.size > 0) {
      const message: WebSocketMessage = {
        type: 'badge_update',
        data: stats,
        timestamp: Date.now(),
      };

      userClients.forEach((ws) => {
        this.sendToClient(ws, message);
      });

      return true;
    }
    return false;
  }

  public broadcastToAll(message: WebSocketMessage) {
    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      this.sendToClient(ws, message);
    });
    logger.info(
      '🔔 WebSocket: Mensagem enviada para todos os clientes conectados',
    );
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  public getStats() {
    return {
      totalConnections: this.wss.clients.size,
      uniqueUsers: this.clients.size,
      userConnections: Array.from(this.clients.entries()).map(
        ([userId, connections]) => ({
          userId,
          connections: connections.size,
        }),
      ),
    };
  }

  public close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
    logger.info('🔌 WebSocket server fechado');
  }
}

let wsManager: WebSocketManager | null = null;

export function setupWebSocketServer(server: Server): WebSocketManager {
  if (wsManager) {
    logger.warn('🔌 WebSocket server já configurado');
    return wsManager;
  }

  wsManager = new WebSocketManager(server);
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}

// Funções utilitárias para usar em outros módulos
export function sendNotificationToUser(
  userId: string,
  notification: any,
): boolean {
  return wsManager?.sendNotificationToUser(userId, notification) || false;
}

export function sendBadgeUpdate(userId: string, stats: any): boolean {
  return wsManager?.sendBadgeUpdate(userId, stats) || false;
}

export function broadcastToAll(message: WebSocketMessage): void {
  wsManager?.broadcastToAll(message);
}
