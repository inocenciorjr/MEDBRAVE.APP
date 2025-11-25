/**
 * Teste simples de WebSocket - SEM dependências do backend compilado
 * Apenas testa a conexão e inscrição
 */

const { io } = require('socket.io-client');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const TEST_JOB_ID = 'test-job-' + Date.now();

console.log('🧪 Teste Simples de WebSocket\n');
console.log(`📡 Backend: ${BACKEND_URL}`);
console.log(`🆔 Job ID: ${TEST_JOB_ID}\n`);

const socket = io(BACKEND_URL, {
  path: '/socket.io',
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 3,
  forceNew: true,
});

let testPassed = false;

const timeout = setTimeout(() => {
  if (!testPassed) {
    console.error('\n❌ TESTE FALHOU: Timeout de 10 segundos\n');
    socket.disconnect();
    process.exit(1);
  }
}, 10000);

socket.on('connect', () => {
  console.log('✅ Socket.IO conectado!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transporte: ${socket.io.engine.transport.name}\n`);
  
  console.log(`📝 Inscrevendo no job: ${TEST_JOB_ID}...`);
  socket.emit('subscribe:job', TEST_JOB_ID);
});

socket.on('subscribed', (data) => {
  console.log(`✅ Inscrito no job: ${data.jobId}\n`);
  
  console.log('🎉 TESTE PASSOU!');
  console.log('   ✓ Conexão Socket.IO estabelecida');
  console.log('   ✓ Inscrição em job funcionando');
  console.log('   ✓ WebSocket está operacional!\n');
  
  testPassed = true;
  clearTimeout(timeout);
  
  socket.disconnect();
  process.exit(0);
});

socket.on('job:progress', (event) => {
  console.log(`📥 Evento recebido: ${event.type} - ${event.message}`);
});

socket.on('disconnect', (reason) => {
  if (!testPassed) {
    console.error(`\n❌ Desconectado: ${reason}\n`);
    process.exit(1);
  }
});

socket.on('connect_error', (error) => {
  console.error('\n❌ Erro de conexão:');
  console.error(`   ${error.message}\n`);
  console.error('💡 Verifique se o backend está rodando na porta 5000\n');
  
  clearTimeout(timeout);
  process.exit(1);
});

console.log('⏳ Conectando...\n');
