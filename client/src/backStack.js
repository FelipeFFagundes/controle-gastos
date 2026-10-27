// Botão "voltar" do Android (e gesto de voltar do navegador) fecha o painel ou diálogo do topo,
// em vez de sair do app.
//
// Cada camada aberta com useBackClose(open, onClose) ocupa uma entrada no histórico.
// - Voltar: o navegador dispara popstate e fechamos a camada do topo.
// - Fechar pela interface: removemos a entrada com history.go(-n).
// As mudanças são agrupadas e aplicadas juntas no fim do toque: se uma camada fecha e outra abre
// no mesmo clique (ex.: menu -> diálogo), a profundidade não muda e o histórico não é mexido.
import { useEffect, useRef } from 'react';

const stack = [];      // camadas abertas, da mais antiga para a do topo
let pushed = 0;        // entradas que este módulo colocou no histórico e ainda estão lá
let ignorePops = 0;    // popstate causados por nós mesmos (history.go)
let scheduled = false;

function reconcile() {
  scheduled = false;
  const desired = stack.length;
  while (pushed < desired) {
    pushed++;
    history.pushState({ ...history.state, overlayDepth: pushed }, '');
  }
  if (pushed > desired) {
    const extra = pushed - desired;
    pushed = desired;
    ignorePops++;
    history.go(-extra);
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(reconcile, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops--;
      return;
    }
    if (pushed === 0) return;
    pushed--;
    stack.pop()?.close();
  });
}

export function useBackClose(open, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const layer = { close: () => onCloseRef.current() };
    stack.push(layer);
    schedule();
    return () => {
      const index = stack.indexOf(layer);
      if (index === -1) return; // já fechada pelo botão voltar
      stack.splice(index, 1);
      schedule();
    };
  }, [open]);
}
