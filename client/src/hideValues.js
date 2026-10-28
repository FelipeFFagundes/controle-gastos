// Ocultar valores: troca todo valor em reais por "R$ •••••" (ver formatBRL), para mostrar o app a
// alguém sem expor os gastos. A escolha fica guardada no aparelho, como o tema.
import { useState } from 'react';
import { setValuesHidden } from './format';

const STORAGE_KEY = 'hide-values';

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// Usado só pelo App: ao trocar, o App se redesenha e leva junto todas as telas.
export function useHideValues() {
  const [hidden, setHidden] = useState(readStored);
  // Antes dos filhos renderizarem, para nenhum valor sair na forma errada.
  setValuesHidden(hidden);

  const toggle = () => setHidden(prev => {
    const next = !prev;
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Sem armazenamento (aba anônima): vale só nesta sessão.
    }
    return next;
  });

  return { hidden, toggle };
}
