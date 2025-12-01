// Carregar variáveis de ambiente ANTES de qualquer outra coisa
import * as dotenv from 'dotenv';
dotenv.config();

import "reflect-metadata";
import { createServer } from 'http';
import { supabase } from './config/supabase';
import { createApp } from './app';
import { logger } from './utils/logger';
import { env } from './config/env';
import { setupWebSocketServer } from './websocket/webSocketServer';
import { draftCleanupService } from './services/draftCleanupService';
import { websocketService } from './services/websocketService';
import { apkgProgressService } from './services/apkgProgressService';
import { SocketService } from './services/socketService';
import { planExpirationService } from './services/planExpirationService';

// Configuração do servidor
const PORT = env.PORT;
const HOST = process.env.HOST || '0.0.0.0';

// Função async para inicializar o servidor
async function startServer() {
  // Criar aplicação
  const app = await createApp(supabase);

  // Criar servidor HTTP
  const server = createServer(app);

  // Configurar WebSocket server (ws nativo)
  setupWebSocketServer(server);
  
  // Configurar Socket.IO para presença em tempo real (path: /socket.io/presence) - PRIMEIRO
  try {
    logger.info('🔄 Inicializando SocketService para presença...');
    const socketService = new SocketService(server);
    logger.info('✅ Socket.IO presence service initialized on /socket.io/presence');
  } catch (error) {
    logger.error('❌ Erro ao inicializar SocketService:', error);
    // Não bloquear o servidor se Socket.IO falhar
  }
  
  // Configurar Socket.IO para progresso de jobs (path: /socket.io/jobs)
  websocketService.initialize(server);
  
  // Configurar Socket.IO para progresso de importação APKG (path: /socket.io/apkg)
  apkgProgressService.initialize(server);

  // Iniciar servidor
  server.listen(PORT, () => {
    logger.info(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
    logger.info(`🔌 WebSocket disponível em ws://${HOST}:${PORT}/ws`);
    logger.info('Pressione CTRL+C para parar');
    
    // Iniciar serviço de limpeza de drafts (executa a cada 24 horas)
    draftCleanupService.start(24);
    logger.info('🧹 Serviço de limpeza de drafts iniciado');
    
    // Iniciar serviço de expiração de planos (executa a cada 1 hora)
    planExpirationService.start(1);
    logger.info('⏰ Serviço de expiração de planos iniciado');
  });

  return server;
}

// Variável para armazenar referência do servidor
let server: any;

// Inicializar servidor
startServer().then((serverInstance) => {
  server = serverInstance;
}).catch((error) => {
  logger.error('Erro ao inicializar servidor:', error);
  process.exit(1);
});

// Tratamento global para rejeições não tratadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada:', { error });
  // Fechar servidor graciosamente
  server.close(() => {
    process.exit(1);
  });
});

// Tratamento de sinais para encerramento gracioso
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  logger.info('Recebido sinal de encerramento, fechando servidor...');
  
  // Parar serviços
  draftCleanupService.stop();
  logger.info('🧹 Serviço de limpeza de drafts parado');
  
  planExpirationService.stop();
  logger.info('⏰ Serviço de expiração de planos parado');
  
  if (server) {
    server.close(() => {
      logger.info('Servidor fechado com sucesso');
      process.exit(0);
    });

    // Se o servidor não fechar em 10 segundos, forçar encerramento
    setTimeout(() => {
      logger.error('Timeout de encerramento, forçando saída');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}
 
