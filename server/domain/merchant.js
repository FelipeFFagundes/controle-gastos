import { stripInstallmentSuffix } from './installments.js';

const MAX_WORDS = 3;

// Chave estável de "loja" a partir da descrição do banco, para lembrar a categoria escolhida.
// As descrições da Pluggy trazem ruído que muda a cada compra (data, hora, código, parcela):
//   "POP 21Out 08h50minSAO PAULO" e "POP 17Out 19h28minSAO PAULO" -> "pop paulo"
//   "NATURA PAY*0061 2/4"                                         -> "natura pay"
// Palavras com dígitos são descartadas; ficam as primeiras palavras restantes.
// Em Pix/transferências ("Transferência enviada pelo Pix|Fulano") o que identifica é o destinatário.
export function merchantKey(description) {
  const text = String(description || '');
  const subject = text.includes('|') ? text.slice(text.lastIndexOf('|') + 1) : text;
  const words = stripInstallmentSuffix(subject)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 1 && !/\d/.test(word));
  return words.slice(0, MAX_WORDS).join(' ');
}
