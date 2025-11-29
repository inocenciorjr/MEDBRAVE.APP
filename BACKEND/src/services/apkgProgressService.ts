import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface ProgressMessage {
  userId: string;
  progress: number;
  message: string;
  step: string;
  timestamp: string;
}

class ApkgProgressService {
  private io: SocketIOServer | null = null;

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io/apkg',
    });

    this.io.on('connection', (socket) => {
      socket.on('join-import', (userId: string) => {
        socket.join(`import-${userId}`);
      });

      socket.on('disconnect', () => {
        // Cliente desconectado
      });
    });
  }

  sendProgress(userId: string, progress: number, message: string, step: string) {
    if (!this.io) {
      return;
    }

    const progressData: ProgressMessage = {
      userId,
      progress,
      message,
      step,
      timestamp: new Date().toISOString(),
    };

    this.io.to(`import-${userId}`).emit('import-progress', progressData);
  }

  sendComplete(userId: string, result: any) {
    if (!this.io) {
      return;
    }

    this.io.to(`import-${userId}`).emit('import-complete', result);
  }

  sendError(userId: string, error: string) {
    if (!this.io) {
      return;
    }

    this.io.to(`import-${userId}`).emit('import-error', { error });
  }
}

export const apkgProgressService = new ApkgProgressService();
