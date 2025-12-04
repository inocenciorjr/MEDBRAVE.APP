/**
 * Gerenciamento de timeout de sessão de autenticação
 * Desloga usuário após 1 hora de inatividade
 */

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora em ms
const LAST_ACTIVITY_KEY = 'auth_last_activity';
const CHECK_INTERVAL = 60 * 1000; // Verificar a cada 1 minuto

let checkIntervalId: NodeJS.Timeout | null = null;

export function updateLastActivity() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }
}

export function getLastActivity(): number | null {
  if (typeof window === 'undefined') return null;
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  return lastActivity ? parseInt(lastActivity) : null;
}

export function isSessionExpired(): boolean {
  const lastActivity = getLastActivity();
  
  // Se não tem registro de última atividade, não está expirado (é um novo login)
  if (!lastActivity) {
    console.log('[SessionTimeout] Sem registro de última atividade, sessão válida');
    return false;
  }
  
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivity;
  const isExpired = timeSinceLastActivity > INACTIVITY_TIMEOUT;
  
  if (isExpired) {
    console.log(`[SessionTimeout] Sessão expirada: ${Math.round(timeSinceLastActivity / 60000)} minutos de inatividade`);
  }
  
  return isExpired;
}

export async function checkAndClearExpiredSession() {
  if (isSessionExpired()) {
    console.log('⏰ [SessionTimeout] Sessão expirada por inatividade (1 hora)');
    
    // Limpar sessão do Supabase
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Limpar localStorage
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Mostrar mensagem e redirecionar
    if (typeof window !== 'undefined') {
      // Salvar mensagem no sessionStorage para mostrar após redirect
      sessionStorage.setItem('session_timeout_message', 'Sua sessão expirou por inatividade (1 hora). Faça login novamente.');
      window.location.href = '/login';
    }
    
    return true;
  }
  
  return false;
}

// Atualizar última atividade em eventos do usuário
export function setupActivityTracking() {
  if (typeof window === 'undefined') return;
  
  // IMPORTANTE: Verificar IMEDIATAMENTE se a sessão expirou ao carregar a página
  // Isso garante que mesmo após fechar e abrir o navegador, a sessão seja verificada
  checkAndClearExpiredSession();
  
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  
  const updateActivity = () => {
    updateLastActivity();
  };
  
  events.forEach(event => {
    window.addEventListener(event, updateActivity, { passive: true });
  });
  
  // Atualizar imediatamente (só se não expirou)
  if (!isSessionExpired()) {
    updateLastActivity();
  }
  
  // Verificar periodicamente se a sessão expirou
  if (checkIntervalId) {
    clearInterval(checkIntervalId);
  }
  
  checkIntervalId = setInterval(() => {
    checkAndClearExpiredSession();
  }, CHECK_INTERVAL);
}

// Limpar tracking ao desmontar
export function cleanupActivityTracking() {
  if (checkIntervalId) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
  }
}
