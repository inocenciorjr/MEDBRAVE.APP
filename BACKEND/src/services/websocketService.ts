import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { jobProgressEmitter, JobProgressEvent } from './jobProgressEmitter';

class WebSocketService {
  private io: SocketIOServer | null = null;
  private jobRooms: Map<string, Set<string>> = new Map(); // jobId -> Set<socketId>
  private eventBuffer: Map<string, JobProgressEvent[]> = new Map(); // jobId -> eventos recentes
  private readonly BUFFER_SIZE = 50; // Manter últimos 50 eventos por job

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*', // Permitir todas as origens (desenvolvimento)
        methods: ['GET', 'POST'],
        credentials: false, // Desabilitar credentials quando origin é *
      },
      path: '/socket.io',
    });

    this.setupEventHandlers();
    this.setupJobProgressListener();

    logger.info('🔌 Socket.IO inicializado para progresso de jobs');
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      logger.info(`🔌 Cliente Socket.IO conectado: ${socket.id}`);

      // Cliente se inscreve para receber atualizações de um job específico
      socket.on('subscribe:job', (jobId: string) => {
        socket.join(`job:${jobId}`);
        
        if (!this.jobRooms.has(jobId)) {
          this.jobRooms.set(jobId, new Set());
        }
        this.jobRooms.get(jobId)!.add(socket.id);

        logger.info(`🔔 Cliente ${socket.id} inscrito no job ${jobId}`);
        
        // Enviar eventos buffered (histórico) para o cliente que acabou de se conectar
        const bufferedEvents = this.eventBuffer.get(jobId) || [];
        if (bufferedEvents.length > 0) {
          logger.info(`📤 Enviando ${bufferedEvents.length} eventos buffered para ${socket.id}`);
          bufferedEvents.forEach(event => {
            socket.emit('job:progress', event);
          });
        }
        
        // Confirmar inscrição
        socket.emit('subscribed', { jobId });
      });

      // Cliente cancela inscrição de um job
      socket.on('unsubscribe:job', (jobId: string) => {
        socket.leave(`job:${jobId}`);
        
        const room = this.jobRooms.get(jobId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            this.jobRooms.delete(jobId);
            // Limpar buffer quando não há mais clientes
            this.eventBuffer.delete(jobId);
          }
        }

        logger.info(`🔕 Cliente ${socket.id} desinscrito do job ${jobId}`);
      });

      socket.on('disconnect', () => {
        // Limpar cliente de todos os rooms
        this.jobRooms.forEach((clients, jobId) => {
          if (clients.has(socket.id)) {
            clients.delete(socket.id);
            if (clients.size === 0) {
              this.jobRooms.delete(jobId);
            }
          }
        });

        logger.info(`🔌 Cliente Socket.IO desconectado: ${socket.id}`);
      });
    });
  }

  private setupJobProgressListener() {
    // Escutar todos os eventos de progresso e transmitir via Socket.IO
    jobProgressEmitter.on('job:all', (event: JobProgressEvent) => {
      this.emitJobProgress(event);
    });

    logger.info('🔔 Listener de progresso de jobs configurado');
  }

  private emitJobProgress(event: JobProgressEvent) {
    if (!this.io) return;

    // Adicionar ao buffer
    if (!this.eventBuffer.has(event.jobId)) {
      this.eventBuffer.set(event.jobId, []);
    }
    const buffer = this.eventBuffer.get(event.jobId)!;
    buffer.push(event);
    
    // Manter apenas os últimos N eventos
    if (buffer.length > this.BUFFER_SIZE) {
      buffer.shift();
    }

    const room = `job:${event.jobId}`;
    const clientsInRoom = this.jobRooms.get(event.jobId);

    if (clientsInRoom && clientsInRoom.size > 0) {
      this.io.to(room).emit('job:progress', event);
      
      // Silencioso - não loga para evitar poluição
    } else {
      // Nenhum cliente conectado ainda, mas evento foi buffered
      // Silencioso - não loga para evitar poluição
    }
  }

  // Método público para emitir eventos customizados
  public emitToJob(jobId: string, eventName: string, data: any) {
    if (!this.io) return;

    const room = `job:${jobId}`;
    this.io.to(room).emit(eventName, data);
  }

  // Estatísticas
  public getStats() {
    return {
      connectedClients: this.io?.sockets.sockets.size || 0,
      activeJobRooms: this.jobRooms.size,
      jobRooms: Array.from(this.jobRooms.entries()).map(([jobId, clients]) => ({
        jobId,
        subscribers: clients.size,
      })),
    };
  }
}

export const websocketService = new WebSocketService();
