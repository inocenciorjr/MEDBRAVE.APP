import { useEffect } from 'react';

/**
 * Hook para detectar e enviar o timezone do usuário
 * Adiciona o timezone em todas as requisições via header
 */
export function useTimezone() {
  useEffect(() => {
    // Detectar timezone do navegador
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Salvar no localStorage para uso posterior
    if (timezone) {
      localStorage.setItem('userTimezone', timezone);
    }
  }, []);

  return {
    timezone: typeof window !== 'undefined' 
      ? Intl.DateTimeFormat().resolvedOptions().timeZone 
      : 'America/Sao_Paulo'
  };
}

/**
 * Função helper para adicionar timezone nos headers das requisições
 */
export function getTimezoneHeader(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  const timezone = localStorage.getItem('userTimezone') || 
                   Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    'X-User-Timezone': timezone
  };
}
