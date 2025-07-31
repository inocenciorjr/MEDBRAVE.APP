// Carregar variáveis de ambiente ANTES de qualquer outra coisa
import * as dotenv from 'dotenv';
dotenv.config();

import "reflect-metadata";
import { createServer } from 'http';
import { firestore } from './config/firebaseAdmin';
import { createApp } from './app';
import { logger } from './utils/logger';
import { env } from './config/env';
import { setupWebSocketServer } from './websocket/webSocketServer';

// Configuração do servidor
const PORT = env.PORT;
const HOST = process.env.HOST || 'localhost';

// Criar aplicação
const app = createApp(firestore);

// Criar servidor HTTP
const server = createServer(app);

// Configurar WebSocket server
setupWebSocketServer(server);

// Iniciar servidor
server.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
  logger.info(`🔌 WebSocket disponível em ws://${HOST}:${PORT}/ws`);
  logger.info('Pressione CTRL+C para parar');
});

// Tratamento global para rejeições não tratadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', error => {
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
  server.close(() => {
    logger.info('Servidor fechado com sucesso');
    process.exit(0);
  });

  // Se o servidor não fechar em 10 segundos, forçar encerramento
  setTimeout(() => {
    logger.error('Timeout de encerramento, forçando saída');
    process.exit(1);
  }, 10000);
}
