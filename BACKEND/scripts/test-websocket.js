/**
 * Script de teste para WebSocket
 * Testa a conexão Socket.IO e emissão de eventos de progresso
 */

const { io } = require('socket.io-client');

// Configuração
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const TEST_JOB_ID = 'test-job-' + Date.now();

console.log('🧪 Iniciando teste de WebSocket...');
console.log(`📡 Conectando em: ${BACKEND_URL}`);
console.log(`🆔 Job ID de teste: ${TEST_JOB_ID}\n`);

// Criar cliente Socket.IO
const socket = io(BACKEND_URL, {
  path: '/socket.io',
  transports: ['polling', 'websocket'], // Tentar polling primeiro
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  forceNew: true,
});

let eventsReceived = 0;
let testPassed = false;

// Timeout de 10 segundos
const timeout = setTimeout(() => {
  if (!testPassed) {
    console.error('\n❌ TESTE FALHOU: Timeout de 10 segundos');
    console.error(`   Eventos recebidos: ${eventsReceived}`);
    socket.disconnect();
    process.exit(1);
  }
}, 10000);

// Eventos de conexão
socket.on('connect', () => {
  console.log('✅ Socket.IO conectado!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transporte: ${socket.io.engine.transport.name}\n`);
  
  // Inscrever no job de teste
  console.log(`📝 Inscrevendo no job: ${TEST_JOB_ID}`);
  socket.emit('subscribe:job', TEST_JOB_ID);
});

socket.on('subscribed', (data) => {
  console.log(`✅ Inscrito no job: ${data.jobId}\n`);
  console.log('🔔 Aguardando eventos de progresso...');
  console.log('   (Você pode emitir eventos manualmente no backend)\n');
  
  // Simular eventos após 2 segundos
  setTimeout(() => {
    console.log('📤 Simulando eventos de progresso...\n');
    simulateProgressEvents();
  }, 2000);
});

socket.on('job:progress', (event) => {
  eventsReceived++;
  
  const icon = getEventIcon(event.type);
  console.log(`${icon} Evento recebido [${eventsReceived}]:`);
  console.log(`   Tipo: ${event.type}`);
  console.log(`   Step: ${event.step}`);
  console.log(`   Mensagem: ${event.message}`);
  
  if (event.progress) {
    console.log(`   Progresso: ${event.progress.current}/${event.progress.total} (${event.progress.percentage}%)`);
  }
  
  console.log(`   Timestamp: ${new Date(event.timestamp).toLocaleTimeString()}\n`);
  
  // Se recebeu evento de conclusão, teste passou
  if (event.type === 'complete') {
    testPassed = true;
    clearTimeout(timeout);
    
    console.log('✅ TESTE PASSOU!');
    console.log(`   Total de eventos recebidos: ${eventsReceived}`);
    console.log('   WebSocket está funcionando corretamente! 🎉\n');
    
    socket.disconnect();
    process.exit(0);
  }
});

socket.on('disconnect', (reason) => {
  console.log(`\n🔌 Socket.IO desconectado: ${reason}`);
  
  if (!testPassed) {
    console.error('❌ TESTE FALHOU: Desconectado antes de completar');
    process.exit(1);
  }
});

socket.on('connect_error', (error) => {
  console.error('\n❌ Erro de conexão Socket.IO:');
  console.error(`   ${error.message}`);
  console.error('\n💡 Verifique se:');
  console.error('   1. O backend está rodando na porta 5000');
  console.error('   2. O Socket.IO está inicializado no server.ts');
  console.error('   3. O CORS está configurado corretamente\n');
  
  clearTimeout(timeout);
  process.exit(1);
});

// Função para simular eventos de progresso via HTTP
async function simulateProgressEvents() {
  try {
    console.log('📡 Chamando endpoint HTTP para emitir eventos...\n');
    
    const response = await fetch(`${BACKEND_URL}/api/test/websocket/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId: TEST_JOB_ID }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Erro ao emitir eventos');
    }

    console.log(`✅ ${result.message}\n`);
    
  } catch (error) {
    console.error('❌ Erro ao simular eventos:');
    console.error(`   ${error.message}`);
    console.error('\n💡 Verifique se o backend está rodando\n');
    
    clearTimeout(timeout);
    socket.disconnect();
    process.exit(1);
  }
}

function getEventIcon(type) {
  const icons = {
    extraction: '🔍',
    categorization: '🏷️',
    rewrite: '✍️',
    draft: '📝',
    complete: '✅',
    error: '❌',
  };
  return icons[type] || '📌';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Instruções
console.log('📖 Como usar este teste:');
console.log('   1. Certifique-se que o backend está rodando (npm run dev)');
console.log('   2. Execute: node scripts/test-websocket.js');
console.log('   3. O script vai conectar e simular eventos de progresso');
console.log('   4. Você verá os eventos sendo recebidos em tempo real\n');
console.log('─'.repeat(60) + '\n');
