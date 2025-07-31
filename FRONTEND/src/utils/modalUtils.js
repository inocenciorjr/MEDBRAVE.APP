// Utilitário para detectar scroll e aplicar correções de modal apenas quando necessário

let scrollbarWidth = null;

/**
 * Calcula a largura da scrollbar do navegador
 */
function getScrollbarWidth() {
  if (scrollbarWidth !== null) {
    return scrollbarWidth;
  }

  // Criar elemento temporário para medir a scrollbar
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  outer.style.msOverflowStyle = 'scrollbar';
  outer.style.width = '100px';
  outer.style.height = '100px';
  document.body.appendChild(outer);

  const inner = document.createElement('div');
  inner.style.width = '100%';
  inner.style.height = '200px';
  outer.appendChild(inner);

  scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  document.body.removeChild(outer);

  return scrollbarWidth;
}

/**
 * Detecta se a página atual tem scroll
 */
function hasPageScroll() {
  return document.body.scrollHeight > window.innerHeight;
}

/**
 * Inicializa a detecção de scroll e scrollbar
 */
export function initScrollbarDetection() {
  // Calcular largura da scrollbar
  const width = getScrollbarWidth();
  
  // Definir variável CSS
  document.documentElement.style.setProperty('--scrollbar-width', `${width}px`);
  
  // Detectar se a página tem scroll
  const pageHasScroll = hasPageScroll();
  
  // Marcar o body se tem scroll
  if (pageHasScroll) {
    document.body.setAttribute('data-has-scroll', 'true');
  } else {
    document.body.setAttribute('data-has-scroll', 'false');
  }
  
  return { width, hasScroll: pageHasScroll };
}

/**
 * Atualiza a detecção de scroll (útil quando o conteúdo da página muda)
 */
export function updateScrollDetection() {
  const pageHasScroll = hasPageScroll();
  document.body.setAttribute('data-has-scroll', pageHasScroll ? 'true' : 'false');
  return pageHasScroll;
}

// Inicializar automaticamente quando o módulo é carregado
if (typeof window !== 'undefined') {
  // Aguardar o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollbarDetection);
  } else {
    initScrollbarDetection();
  }
  
  // Atualizar detecção quando a janela é redimensionada
  window.addEventListener('resize', updateScrollDetection);
} 