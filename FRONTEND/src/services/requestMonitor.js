/**
 * 🔍 MONITOR DE REQUISIÇÕES - FRONTEND
 * 
 * Sistema de monitoramento de requisições do lado do cliente que:
 * - Intercepta todas as requisições fetch
 * - Monitora navegação entre páginas
 * - Rastreia ações do usuário
 * - Coleta métricas de performance
 * - Envia dados para o backend
 */

class FrontendRequestMonitor {
  constructor() {
    this.requests = [];
    this.pageViews = [];
    this.userActions = [];
    this.isEnabled = true;
    this.maxRequests = 1000;
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.userRole = null;
    this.authErrorStopped = false; // Flag para indicar se foi parado por erro de autenticação
    
    // Configurações
    this.config = {
      sendInterval: 120000, // Enviar dados a cada 2 minutos (reduzido de 30s para diminuir logs)
      maxBatchSize: 50,    // Máximo de eventos por lote
      enablePageTracking: false, // Desabilitado por padrão
      enableUserActions: false,  // Desabilitado por padrão
      enablePerformanceMetrics: false, // Desabilitado por padrão
      autoSend: false // Não enviar automaticamente
    };
    
    this.init();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  init() {
    if (!this.isEnabled) return;
    
    console.log('🔍 [Frontend Monitor] Iniciando monitoramento...');
    
    // Interceptar fetch
    this.interceptFetch();
    
    // Monitorar navegação
    if (this.config.enablePageTracking) {
      this.trackPageViews();
    }
    
    // Monitorar ações do usuário
    if (this.config.enableUserActions) {
      this.trackUserActions();
    }
    
    // Métricas de performance
    if (this.config.enablePerformanceMetrics) {
      this.trackPerformanceMetrics();
    }
    
    // Enviar dados periodicamente (apenas se não foi parado por erro de autenticação)
    if (!this.authErrorStopped) {
      this.startPeriodicSend();
    }
    
    // Enviar dados antes de sair da página
    this.setupBeforeUnload();
  }

  setUser(userId, userRole = 'USER') {
    this.userId = userId;
    this.userRole = userRole;
    this.authErrorStopped = false; // Resetar flag ao definir novo usuário
    console.log(`🔍 [Frontend Monitor] Usuário definido: ${userId} (${userRole})`);
  }

  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const [url, options = {}] = args;
      
      const requestData = {
        id: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        userId: this.userId,
        userRole: this.userRole,
        method: options.method || 'GET',
        url: typeof url === 'string' ? url : url.toString(),
        headers: this.sanitizeHeaders(options.headers),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        page: window.location.pathname,
        startTime
      };
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        requestData.responseTime = Math.round((endTime - startTime) * 100) / 100;
        requestData.statusCode = response.status;
        requestData.success = response.ok;
        requestData.responseSize = this.getResponseSize(response);
        
        if (!response.ok) {
          requestData.error = `HTTP ${response.status} ${response.statusText}`;
        }
        
        this.addRequest(requestData);
        return response;
        
      } catch (error) {
        const endTime = performance.now();
        
        requestData.responseTime = Math.round((endTime - startTime) * 100) / 100;
        requestData.statusCode = 0;
        requestData.success = false;
        requestData.error = error.message;
        
        this.addRequest(requestData);
        throw error;
      }
    };
  }

  trackPageViews() {
    // Página inicial
    this.addPageView(window.location.pathname);
    
    // Interceptar mudanças de URL (SPA)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      frontendMonitor.addPageView(window.location.pathname);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      frontendMonitor.addPageView(window.location.pathname);
    };
    
    // Evento popstate (botão voltar/avançar)
    window.addEventListener('popstate', () => {
      this.addPageView(window.location.pathname);
    });
  }

  trackUserActions() {
    // Cliques
    document.addEventListener('click', (event) => {
      this.addUserAction('click', {
        element: event.target.tagName,
        className: event.target.className,
        id: event.target.id,
        text: event.target.textContent?.substring(0, 50),
        page: window.location.pathname
      });
    });
    
    // Submissão de formulários
    document.addEventListener('submit', (event) => {
      this.addUserAction('form_submit', {
        formId: event.target.id,
        formClass: event.target.className,
        page: window.location.pathname
      });
    });
    
    // Scroll (throttled)
    let scrollTimeout;
    document.addEventListener('scroll', () => {
      if (scrollTimeout) return;
      
      scrollTimeout = setTimeout(() => {
        this.addUserAction('scroll', {
          scrollY: window.scrollY,
          page: window.location.pathname
        });
        scrollTimeout = null;
      }, 1000);
    });
  }

  trackPerformanceMetrics() {
    // Métricas de carregamento da página
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          this.addPerformanceMetric('page_load', {
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            firstPaint: this.getFirstPaint(),
            page: window.location.pathname
          });
        }
      }, 1000);
    });
    
    // Observar mudanças de performance
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.addPerformanceMetric('lcp', {
                value: entry.startTime,
                page: window.location.pathname
              });
            }
          }
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('PerformanceObserver não suportado:', error);
      }
    }
  }

  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  sanitizeHeaders(headers) {
    if (!headers) return {};
    
    const sanitized = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  getResponseSize(response) {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addRequest(requestData) {
    this.requests.push(requestData);
    
    // Limitar número de requisições em memória
    if (this.requests.length > this.maxRequests) {
      this.requests = this.requests.slice(-this.maxRequests / 2);
    }
    
    // Log para requisições problemáticas
    if (!requestData.success || requestData.responseTime > 3000) {
      console.warn(`🚨 [Frontend Monitor] ${requestData.method} ${requestData.url} - ${requestData.statusCode} - ${requestData.responseTime}ms`);
    }
  }

  addPageView(path) {
    const pageView = {
      id: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      userRole: this.userRole,
      path,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    };
    
    this.pageViews.push(pageView);
    console.log(`📄 [Frontend Monitor] Page view: ${path}`);
  }

  addUserAction(action, data) {
    const userAction = {
      id: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      userRole: this.userRole,
      action,
      data
    };
    
    this.userActions.push(userAction);
  }

  addPerformanceMetric(metric, data) {
    const performanceData = {
      id: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      userRole: this.userRole,
      metric,
      data
    };
    
    this.userActions.push(performanceData);
    console.log(`⚡ [Frontend Monitor] Performance: ${metric}`, data);
  }

  startPeriodicSend() {
    if (!this.config.autoSend) {
      // console.log('🔍 [Frontend Monitor] Envio automático desabilitado');
      return;
    }
    
    // Não reiniciar se foi parado por erro de autenticação
    if (this.authErrorStopped) {
      // console.log('🔍 [Frontend Monitor] Envio automático não será reiniciado - parado por erro de autenticação');
      return;
    }
    
    this.sendInterval = setInterval(() => {
      this.sendDataToBackend();
    }, this.config.sendInterval);
  }

  stopPeriodicSend() {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
      this.authErrorStopped = true; // Marcar que foi parado por erro de autenticação
      console.log('🔍 [Frontend Monitor] Envio automático parado devido a erro de autenticação');
    }
  }

  setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      this.sendDataToBackend(true); // Envio síncrono
    });
  }

  async sendDataToBackend(sync = false) {
    if (!this.isEnabled || (!this.requests.length && !this.pageViews.length && !this.userActions.length)) {
      return;
    }
    
    const data = {
      sessionId: this.sessionId,
      userId: this.userId,
      userRole: this.userRole,
      timestamp: new Date().toISOString(),
      requests: this.requests.splice(0, this.config.maxBatchSize),
      pageViews: this.pageViews.splice(0, this.config.maxBatchSize),
      userActions: this.userActions.splice(0, this.config.maxBatchSize)
    };
    
    try {
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/monitoring/frontend-data`;
      
      if (sync && navigator.sendBeacon) {
        // Envio síncrono usando sendBeacon
        navigator.sendBeacon(url, JSON.stringify(data));
      } else {
        // Envio assíncrono normal
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        // Verificar se é erro de autenticação
        if (response.status === 401) {
          // console.warn('❌ [Frontend Monitor] Erro de autenticação - parando envio automático');
          this.stopPeriodicSend();
          return;
        }
      }
      
      // console.log(`📤 [Frontend Monitor] Dados enviados: ${data.requests.length} requests, ${data.pageViews.length} page views, ${data.userActions.length} actions`);
      
    } catch (error) {
      // console.error('❌ [Frontend Monitor] Erro ao enviar dados:', error);
      
      // Se for erro de autenticação, parar envio automático
      if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        this.stopPeriodicSend();
        return;
      }
      
      // Recolocar dados na fila em caso de erro
      this.requests.unshift(...data.requests);
      this.pageViews.unshift(...data.pageViews);
      this.userActions.unshift(...data.userActions);
    }
  }

  // Métodos públicos para controle
  enable() {
    this.isEnabled = true;
    // console.log('✅ [Frontend Monitor] Monitoramento habilitado');
  }

  disable() {
    this.isEnabled = false;
    // console.log('❌ [Frontend Monitor] Monitoramento desabilitado');
  }

  // Habilitar monitoramento completo (para página de admin)
  enableFullMonitoring() {
    this.config.enablePageTracking = true;
    this.config.enableUserActions = true;
    this.config.enablePerformanceMetrics = true;
    // Manter autoSend como false para evitar requisições automáticas desnecessárias
    this.config.autoSend = false;
    this.isEnabled = true;
    
    // Não iniciar envio periódico automático
    // if (!this.authErrorStopped) {
    //   this.startPeriodicSend();
    // }
    
    // console.log('🔍 [Frontend Monitor] Monitoramento completo habilitado');
  }

  // Desabilitar monitoramento completo
  disableFullMonitoring() {
    this.config.enablePageTracking = false;
    this.config.enableUserActions = false;
    this.config.enablePerformanceMetrics = false;
    this.config.autoSend = false;
    
    // console.log('🔍 [Frontend Monitor] Monitoramento completo desabilitado');
  }

  clearData() {
    this.requests = [];
    this.pageViews = [];
    this.userActions = [];
    console.log('🗑️ [Frontend Monitor] Dados limpos');
  }

  getStats() {
    return {
      requests: this.requests.length,
      pageViews: this.pageViews.length,
      userActions: this.userActions.length,
      sessionId: this.sessionId,
      userId: this.userId,
      isEnabled: this.isEnabled
    };
  }

  // Método para forçar envio imediato
  async flushData() {
    await this.sendDataToBackend();
  }
}

// Instância singleton
const frontendMonitor = new FrontendRequestMonitor();

// Exportar para uso global
window.frontendMonitor = frontendMonitor;

export default frontendMonitor;