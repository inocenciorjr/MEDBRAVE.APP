/**
 * Monitor de Requisições Firebase
 * Monitora e registra todas as requisições para identificar gargalos
 */

class FirebaseMonitor {
  constructor() {
    this.requests = [];
    this.isMonitoring = false;
    this.maxRequests = 1000; // Limite para evitar vazamento de memória
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 [Firebase Monitor] Iniciando monitoramento de requisições...');
    
    // Interceptar getDocs
    this.interceptFirebaseMethod('getDocs');
    this.interceptFirebaseMethod('getCountFromServer');
    this.interceptFirebaseMethod('getDoc');
    
    // Log periódico
    this.logInterval = setInterval(() => {
      this.logSummary();
    }, 30000); // A cada 30 segundos
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.logInterval) {
      clearInterval(this.logInterval);
    }
    console.log('🛑 [Firebase Monitor] Monitoramento parado.');
  }

  interceptFirebaseMethod(methodName) {
    // Esta é uma implementação simplificada
    // Em produção, você interceptaria os métodos reais do Firebase
    const originalConsoleLog = console.log;
    
    // Interceptar logs que contenham informações sobre Firebase
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('Firebase') || message.includes('Firestore') || message.includes('getDocs')) {
        this.logRequest(methodName, message);
      }
      originalConsoleLog.apply(console, args);
    };
  }

  logRequest(method, details) {
    const request = {
      timestamp: new Date().toISOString(),
      method,
      details,
      stack: new Error().stack
    };
    
    this.requests.push(request);
    
    // Limitar número de requests armazenados
    if (this.requests.length > this.maxRequests) {
      this.requests = this.requests.slice(-this.maxRequests / 2);
    }
    
    console.warn(`🔥 [Firebase Monitor] ${method}: ${details}`);
  }

  logSummary() {
    const now = Date.now();
    const last5Minutes = this.requests.filter(r => 
      now - new Date(r.timestamp).getTime() < 5 * 60 * 1000
    );
    
    const methodCounts = {};
    last5Minutes.forEach(r => {
      methodCounts[r.method] = (methodCounts[r.method] || 0) + 1;
    });
    
    console.group('📊 [Firebase Monitor] Resumo dos últimos 5 minutos:');
    console.log(`Total de requisições: ${last5Minutes.length}`);
    Object.entries(methodCounts).forEach(([method, count]) => {
      console.log(`${method}: ${count} requisições`);
    });
    
    if (last5Minutes.length > 50) {
      console.error('⚠️ ALERTA: Muitas requisições detectadas! Possível problema de performance.');
    }
    
    console.groupEnd();
  }

  getReport() {
    return {
      totalRequests: this.requests.length,
      recentRequests: this.requests.slice(-20),
      summary: this.generateSummary()
    };
  }

  generateSummary() {
    const methodCounts = {};
    this.requests.forEach(r => {
      methodCounts[r.method] = (methodCounts[r.method] || 0) + 1;
    });
    
    return methodCounts;
  }

  // Método para identificar padrões problemáticos
  detectPatterns() {
    const patterns = [];
    
    // Detectar requisições repetitivas
    const recentRequests = this.requests.slice(-50);
    const duplicates = {};
    
    recentRequests.forEach(r => {
      const key = `${r.method}_${r.details}`;
      duplicates[key] = (duplicates[key] || 0) + 1;
    });
    
    Object.entries(duplicates).forEach(([key, count]) => {
      if (count > 5) {
        patterns.push({
          type: 'REPETITIVE_REQUESTS',
          description: `${key} foi chamado ${count} vezes recentemente`,
          severity: count > 10 ? 'HIGH' : 'MEDIUM'
        });
      }
    });
    
    return patterns;
  }
}

// Instância global
const firebaseMonitor = new FirebaseMonitor();

// Auto-iniciar em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  firebaseMonitor.startMonitoring();
  
  // Disponibilizar globalmente para debug
  window.firebaseMonitor = firebaseMonitor;
}

export default firebaseMonitor;