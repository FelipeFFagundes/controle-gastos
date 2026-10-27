// Transição entre telas com a View Transitions API. As barras fixas têm view-transition-name
// próprio (index.css) e ficam paradas; só o conteúdo desliza.
// Sem suporte no navegador, ou com "reduzir movimento" ligado, a troca é imediata.
import { flushSync } from 'react-dom';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// direction: 'forward' (próxima aba / próximo mês) ou 'back'.
export function withViewTransition(update, direction = 'forward') {
  if (!document.startViewTransition || reducedMotion()) {
    update();
    return;
  }
  document.documentElement.dataset.navDirection = direction;
  let updated = false;
  const transition = document.startViewTransition(() => {
    updated = true;
    flushSync(update);
  });
  // A troca de tela nunca pode depender da animação: se o navegador não desenhar o quadro
  // (aba em segundo plano, aparelho sobrecarregado), pula a transição e aplica a mudança direto.
  setTimeout(() => {
    if (!updated) transition.skipTransition();
  }, 400);
  transition.finished.finally(() => {
    delete document.documentElement.dataset.navDirection;
  });
}
