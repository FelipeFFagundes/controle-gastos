// Atalhos de teclado para quem usa o app no computador.
// Ignorados quando o foco está num campo de texto, com Ctrl/Alt/⌘ pressionados, ou com um
// diálogo/painel aberto (aí as teclas pertencem a ele).
import { useEffect, useRef } from 'react';

function isTyping(target) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

// Diálogos, painéis e menus do MUI são "Modal"; os que ficam montados fechados levam MuiModal-hidden.
const overlayOpen = () => Boolean(document.querySelector('.MuiModal-root:not(.MuiModal-hidden)'));

// bindings: { 'n': fn, 'ArrowLeft': fn, '/': fn, ... }
export function useShortcuts(bindings, enabled = true) {
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (isTyping(e.target) || overlayOpen()) return;
      const action = ref.current[e.key] || ref.current[e.key.toLowerCase()];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
