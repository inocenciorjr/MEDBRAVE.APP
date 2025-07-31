/**
 * 🚀 INICIALIZAÇÃO DO SISTEMA DE MONITORAMENTO
 * 
 * Este arquivo configura e inicializa o sistema de monitoramento do frontend,
 * integrando com o sistema de autenticação e configurações da aplicação.
 */

import frontendMonitor from '../services/requestMonitor.js';
import { auth } from '../config/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

class MonitoringInitializer {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
  }

  /**
   * Inicializa o sistema de monitoramento
   */
  init() {
    if (this.initialized) {
      // console.log('🔍 [Monitoring] Sistema já inicializado');
      return;
    }

    // console.log('🚀 [Monitoring] Inicializando sistema de monitoramento...');

    // Configurar monitoramento baseado no ambiente
    this.configureEnvironment();

    // Configurar autenticação
    this.setupAuthListener();

    // Configurar eventos globais
    this.setupGlobalEvents();

    // Configurar interceptação de erros
    this.setupErrorHandling();

    this.initialized = true;
    // console.log('✅ [Monitoring] Sistema de monitoramento inicializado com sucesso');
  }

  /**
   * Configura o monitoramento baseado no ambiente
   */
  configureEnvironment() {
    const isDevelopment = import.meta.env.DEV;
    const isProduction = import.meta.env.PROD;

    // Configurações específicas do ambiente
    if (isDevelopment) {
      // Em desenvolvimento, monitorar mais detalhadamente
      frontendMonitor.config = {
        ...frontendMonitor.config,
        sendInterval: 10000, // Enviar a cada 10 segundos
        maxBatchSize: 20,
        enablePageTracking: true,
        enableUserActions: true,
        enablePerformanceMetrics: true
      };
      // console.log('🔧 [Monitoring] Configurado para ambiente de desenvolvimento');
    } else if (isProduction) {
      // Em produção, ser mais conservador
      frontendMonitor.config = {
        ...frontendMonitor.config,
        sendInterval: 60000, // Enviar a cada 1 minuto
        maxBatchSize: 100,
        enablePageTracking: true,
        enableUserActions: false, // Desabilitar ações detalhadas em produção
        enablePerformanceMetrics: true
      };
      // console.log('🔧 [Monitoring] Configurado para ambiente de produção');
    }
  }

  /**
   * Configura o listener de autenticação
   */
  setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuário logado
        try {
          const token = await user.getIdTokenResult();
          const userRole = token.claims.role || 'USER';
          
          frontendMonitor.setUser(user.uid, userRole);
          
          // console.log(`👤 [Monitoring] Usuário autenticado: ${user.uid} (${userRole})`);
          
          // Registrar evento de login
          frontendMonitor.addUserAction('user_login', {
            userId: user.uid,
            userRole: userRole,
            email: user.email,
            loginMethod: user.providerData[0]?.providerId || 'unknown'
          });
          
        } catch (error) {
          // console.error('❌ [Monitoring] Erro ao obter dados do usuário:', error);
          frontendMonitor.setUser(user.uid, 'USER');
        }
      } else {
        // Usuário deslogado
        if (this.currentUser) {
          // Registrar evento de logout apenas se havia um usuário logado
          frontendMonitor.addUserAction('user_logout', {
            userId: this.currentUser,
            timestamp: new Date().toISOString()
          });
        }
        
        frontendMonitor.setUser(null, null);
        // console.log('👤 [Monitoring] Usuário desautenticado');
      }
      
      this.currentUser = user?.uid || null;
    });
  }

  /**
   * Configura eventos globais da aplicação
   */
  setupGlobalEvents() {
    // Monitorar mudanças de visibilidade da página
    document.addEventListener('visibilitychange', () => {
      frontendMonitor.addUserAction('page_visibility_change', {
        hidden: document.hidden,
        visibilityState: document.visibilityState
      });
    });

    // Monitorar mudanças de conexão
    window.addEventListener('online', () => {
      frontendMonitor.addUserAction('connection_change', {
        status: 'online',
        timestamp: new Date().toISOString()
      });
    });

    window.addEventListener('offline', () => {
      frontendMonitor.addUserAction('connection_change', {
        status: 'offline',
        timestamp: new Date().toISOString()
      });
    });

    // Monitorar redimensionamento da janela
    let resizeTimeout;
    window.addEventListener('resize', () => {
      if (resizeTimeout) return;
      
      resizeTimeout = setTimeout(() => {
        frontendMonitor.addUserAction('window_resize', {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        });
        resizeTimeout = null;
      }, 1000);
    });
  }

  /**
   * Configura interceptação de erros globais
   */
  setupErrorHandling() {
    // Erros JavaScript não capturados
    window.addEventListener('error', (event) => {
      frontendMonitor.addUserAction('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        page: window.location.pathname,
        userAgent: navigator.userAgent
      });
    });

    // Promises rejeitadas não capturadas
    window.addEventListener('unhandledrejection', (event) => {
      frontendMonitor.addUserAction('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
        page: window.location.pathname,
        userAgent: navigator.userAgent
      });
    });

    // Erros de recursos (imagens, scripts, etc.)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        frontendMonitor.addUserAction('resource_error', {
          tagName: event.target.tagName,
          source: event.target.src || event.target.href,
          page: window.location.pathname
        });
      }
    }, true);
  }

  /**
   * Métodos públicos para controle do monitoramento
   */
  enable() {
    frontendMonitor.enable();
  }

  disable() {
    frontendMonitor.disable();
  }

  getStats() {
    return frontendMonitor.getStats();
  }

  async flushData() {
    await frontendMonitor.flushData();
  }

  clearData() {
    frontendMonitor.clearData();
  }
}

// Criar instância singleton
const monitoringInitializer = new MonitoringInitializer();

// Exportar para uso global
window.monitoringInitializer = monitoringInitializer;

export default monitoringInitializer;

// Auto-inicializar se não estiver em modo de teste
if (typeof window !== 'undefined' && !window.location.href.includes('test')) {
  // Aguardar um pouco para garantir que outros sistemas estejam carregados
  setTimeout(() => {
    monitoringInitializer.init();
  }, 1000);
}