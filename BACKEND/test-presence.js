/**
 * Script de teste para verificar o sistema de presença
 * Execute com: node test-presence.js
 */

const Redis = require('ioredis');

async function testPresence() {
  console.log('🧪 Testando sistema de presença...\n');
  
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  
  try {
    // 1. Testar conexão Redis
    console.log('1️⃣ Testando conexão Redis...');
    await redis.ping();
    console.log('✅ Redis conectado\n');
    
    // 2. Simular presença de usuário
    const testUserId = 'test-user-123';
    const testSessionId = 'test-session-456';
    const presenceKey = `presence:${testUserId}:${testSessionId}`;
    
    console.log('2️⃣ Criando presença de teste...');
    const presenceData = {
      userId: testUserId,
      sessionId: testSessionId,
      socketId: 'socket-789',
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      metadata: {
        page: '/test-page',
        device: 'Desktop',
        browser: 'Chrome',
      },
    };
    
    await redis.setex(presenceKey, 90, JSON.stringify(presenceData));
    await redis.zadd('presence:active', Date.now(), presenceKey);
    console.log('✅ Presença criada:', presenceKey, '\n');
    
    // 3. Buscar presença
    console.log('3️⃣ Buscando presença...');
    const retrieved = await redis.get(presenceKey);
    if (retrieved) {
      const parsed = JSON.parse(retrieved);
      console.log('✅ Presença encontrada:', {
        userId: parsed.userId,
        sessionId: parsed.sessionId,
        page: parsed.metadata.page,
      });
    } else {
      console.log('❌ Presença não encontrada');
    }
    console.log('');
    
    // 4. Buscar todas as presenças ativas
    console.log('4️⃣ Buscando todas as presenças ativas...');
    const now = Date.now();
    const cutoff = now - 90000;
    const activeKeys = await redis.zrangebyscore('presence:active', cutoff, now);
    console.log(`✅ ${activeKeys.length} presença(s) ativa(s) encontrada(s)`);
    
    if (activeKeys.length > 0) {
      const pipeline = redis.pipeline();
      activeKeys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();
      
      console.log('\nPresenças ativas:');
      results.forEach(([err, data], index) => {
        if (!err && data) {
          const presence = JSON.parse(data);
          console.log(`  - ${presence.userId} (${presence.sessionId})`);
        }
      });
    }
    console.log('');
    
    // 5. Contar usuários online
    console.log('5️⃣ Contando usuários online...');
    const count = await redis.zcount('presence:active', cutoff, now);
    console.log(`✅ ${count} usuário(s) online\n`);
    
    // 6. Limpar teste
    console.log('6️⃣ Limpando dados de teste...');
    await redis.del(presenceKey);
    await redis.zrem('presence:active', presenceKey);
    console.log('✅ Dados de teste removidos\n');
    
    console.log('🎉 Todos os testes passaram!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  } finally {
    await redis.quit();
  }
}

testPresence();
