import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { PresenceService } from './presenceService';
import logger from '../utils/logger';
import supabase from '../config/supabaseAdmin';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

export class SocketService {
  private io: SocketIOServer;
  private presenceService: PresenceService;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(httpServer: HTTPServer) {
    // Criar Socket.IO server com path diferente para não conflitar
    
    this.io = new SocketIOServer(httpServer, {
      path: '/socket.io/presence',
      cors: {
        origin: '*', // Permitir todas as origens (igual ao websocketService)
        methods: ['GET', 'POST'],
        credentials: false, // Desabilitar credentials quando origin é *
      },
      transports: ['websocket', 'polling'],
    });
    

    
    // Configurar Redis adapter para escalar
    const { redis } = require('../lib/redis');
    this.pubClient = redis;
    this.subClient = this.pubClient.duplicate();
    
    this.io.adapter(createAdapter(this.pubClient, this.subClient));

    // Inicializar PresenceService
    this.presenceService = new PresenceService(this.io);

    // Configurar autenticação
    this.io.use(this.authMiddleware.bind(this));

    // Configurar event handlers
    this.setupEventHandlers();

    // Cleanup periódico
    setInterval(() => {
      this.presenceService.cleanupExpired();
    }, 60000); // A cada 1 minuto

    logger.info('[SocketService] Socket.IO server initialized');
  }

  /**
   * Middleware de autenticação
   */
  private async authMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Validar token com Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return next(new Error('Invalid token'));
      }

      // Extrair session_id do token JWT
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        socket.sessionId = payload.session_id;
      } catch (e) {
        socket.sessionId = socket.id; // fallback
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      logger.error('[SocketService] Auth error:', error);
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Configurar event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      const { userId, sessionId } = socket;
      
      if (!userId || !sessionId) {
        socket.disconnect();
        return;
      }

      // Registrar presença
      await this.presenceService.setPresence(userId, sessionId, socket.id);

      // Join room do usuário
      socket.join(`user:${userId}`);

      // Enviar lista de usuários online para admins
      if (await this.isAdmin(userId)) {
        socket.join('admins');
        const onlineCount = await this.presenceService.getOnlineCount();
        socket.emit('presence:stats', { onlineCount });
      }

      // Heartbeat
      socket.on('presence:heartbeat', async (data) => {
        await this.presenceService.updateActivity(userId, sessionId, data?.metadata);
        
        // Broadcast para admins
        this.io.to('admins').emit('presence:update', {
          userId,
          sessionId,
          lastActivity: Date.now(),
        });
      });

      // Atualizar metadata (página, etc)
      socket.on('presence:update-metadata', async (metadata) => {
        await this.presenceService.updateActivity(userId, sessionId, metadata);
      });

      // Disconnect
      socket.on('disconnect', async () => {
        await this.presenceService.removePresence(userId, sessionId);
        
        // Broadcast para admins
        this.io.to('admins').emit('presence:leave', { userId, sessionId });
      });

      // Admin: solicitar lista de usuários online
      socket.on('presence:get-online', async (callback) => {
        if (await this.isAdmin(userId)) {
          const presences = await this.presenceService.getActivePresences();
          callback({ success: true, data: presences });
        } else {
          callback({ success: false, error: 'Unauthorized' });
        }
      });
    });
  }

  /**
   * Verifica se usuário é admin
   */
  private async isAdmin(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Broadcast para todos os usuários online
   */
  public broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  /**
   * Enviar mensagem para usuário específico
   */
  public sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Obter PresenceService
   */
  public getPresenceService(): PresenceService {
    return this.presenceService;
  }

  /**
   * Obter Socket.IO instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}
