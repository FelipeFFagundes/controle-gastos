// Tradução dos dados da Pluggy (Open Finance) para o modelo do app. Funções puras.
import { isValidInstallment, parseInstallmentFromDescription } from './installments.js';

// Movimentações entre contas próprias: não são gasto nem receita.
const TRANSFER_DESCRIPTION_RE = new RegExp([
  'pagamento.*(fatura|recebido|efetuado)',
  'pgto.*fatura',
  'fatura paga',
  'aplic(a[cç][aã]o)?\\s+aut',
  'apl\\s+aplic',
  'resgate\\s+aut',
  'res\\s+aplic'
].join('|'), 'i');

const TRANSFER_CATEGORY_RE = /same person transfer|credit card payment/i;

export function isCreditAccount(pluggyAccount) {
  return pluggyAccount.type === 'CREDIT' || pluggyAccount.subtype === 'CREDIT_CARD';
}

export function classifyPluggyTransaction(ptx, { isCredit }) {
  const description = (ptx.description || '').trim() || (isCredit ? 'Compra no Cartão' : 'Lançamento');
  const rawAmount = Number(ptx.amount) || 0;

  let type = rawAmount < 0 || ptx.type === 'DEBIT' ? 'expense' : 'income';
  if (TRANSFER_DESCRIPTION_RE.test(description) || TRANSFER_CATEGORY_RE.test(ptx.category || '')) {
    type = 'transfer';
  }

  return {
    pluggyId: ptx.id,
    description,
    amount: Math.abs(rawAmount),
    type,
    category: type === 'income' ? 'Salário & Entradas' : mapPluggyCategory(ptx.category),
    date: String(ptx.date).slice(0, 10),
    installment: isCredit ? extractInstallment(ptx) : null
  };
}

// Prefere os metadados estruturados do cartão; a descrição é só o plano B.
function extractInstallment(ptx) {
  const meta = ptx.creditCardMetadata;
  if (meta) {
    const current = Number(meta.installmentNumber);
    const total = Number(meta.totalInstallments);
    if (isValidInstallment(current, total)) return { current, total };
  }
  return parseInstallmentFromDescription(ptx.description);
}

const CATEGORY_RULES = [
  [/food|restaurant|groceries|supermarket|restaurante|refei|mercado|alimenta|delivery/, 'Alimentação'],
  [/transport|taxi|ride|uber|gas station|fuel|posto|combust|veiculo|vehicle|bike|parking|toll/, 'Transporte & Bike'],
  [/shopping|clothing|electronics|compra|vestuario|roupa|eletronico/, 'Compras & Vestuário'],
  [/education|book|educa|livro|curso/, 'Educação & Livros'],
  [/health|pharmacy|saude|farmacia|medic|drogaria|hospital|dentist/, 'Saúde & Farmácia'],
  [/invest|reserva|poupanca|savings/, 'Investimento & Reserva'],
  [/telecom|internet|phone|utilities|electricity|water|rent|housing|insurance|taxes|tarifa|fees/, 'Contas & Fixas']
];

export function mapPluggyCategory(pluggyCategory) {
  if (!pluggyCategory) return 'Outros';
  const text = pluggyCategory.toLowerCase();
  const rule = CATEGORY_RULES.find(([re]) => re.test(text));
  return rule ? rule[1] : 'Outros';
}

// Nome, cor e fechamento padrão para uma conta vinda da Pluggy. Usado só na criação:
// depois disso o usuário pode renomear e configurar à vontade, e o sync não sobrescreve.
export function defaultAccountFromPluggy(pluggyAccount) {
  const isCredit = isCreditAccount(pluggyAccount);
  const raw = (pluggyAccount.name || pluggyAccount.marketingName || '').trim();
  const lower = raw.toLowerCase();

  let name = raw || (isCredit ? 'Cartão de Crédito' : 'Conta Bancária');
  let color = isCredit ? '#BF8418' : '#4A82D6';
  let closingDay = null;

  if (lower === 'platinum' || lower.includes('nubank') || lower.includes('nu pagamentos')) {
    name = isCredit || lower === 'platinum' ? 'Cartão Nubank' : 'Conta Nubank';
    color = '#9E6AD3';
    if (isCredit) closingDay = 28;
  } else if (lower.includes('latam')) {
    name = isCredit ? 'Cartão Itaú LATAM Pass' : raw;
    color = '#ec7000';
    if (isCredit) closingDay = 29;
  } else if (lower.includes('itau') || lower.includes('itaú')) {
    name = isCredit || lower.includes('multiplo') || lower.includes('múltiplo') ? 'Cartão Itaú Múltiplo' : 'Conta Itaú';
    color = '#ec7000';
    if (isCredit) closingDay = 29;
  }

  return {
    name,
    type: isCredit ? 'credit_card' : 'bank_account',
    color,
    closingDay,
    monthOffset: 0,
    pluggyAccountId: pluggyAccount.id
  };
}
