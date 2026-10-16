import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  CreditCard 
} from 'lucide-react';

export function SummaryCards({ summary, accounts, selectedAccountFilter, onSelectAccountFilter }) {
  if (!summary) return null;

  const {
    totalIncome = 0,
    totalExpense = 0,
    netBalance = 0,
    totalPaid = 0,
    totalPending = 0,
    expensesByAccount = {}
  } = summary;

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const paidPercentage = totalExpense > 0 ? Math.round((totalPaid / totalExpense) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Receitas do Mês</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-400">
              {formatBRL(totalIncome)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Salário, extras e rendimentos</p>
        </div>

        {/* Despesas Totais */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Total de Despesas</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-400">
              {formatBRL(totalExpense)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Faturas, compras e fixas</p>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Saldo Líquido</span>
            <div className={`p-2.5 rounded-xl ${netBalance >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              {formatBRL(netBalance)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {netBalance >= 0 ? 'Resultado superavitário' : 'Gastos superam receitas'}
          </p>
        </div>

        {/* Pagos vs Pendentes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Status dos Pagamentos</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pago: {formatBRL(totalPaid)}</span>
            </div>
            <div className="text-xs text-amber-400">
              Pendente: {formatBRL(totalPending)}
            </div>
          </div>
          {/* Barra de progresso */}
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${paidPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 text-right">{paidPercentage}% liquidado</p>
        </div>
      </div>

      {/* Cartões / Faturas do Mês */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Gastos por Conta / Cartão
            </h3>
          </div>
          {selectedAccountFilter && (
            <button
              onClick={() => onSelectAccountFilter('')}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Limpar filtro
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {accounts.map(acc => {
            const amount = expensesByAccount[acc.name] || 0;
            const isSelected = selectedAccountFilter === acc.name;
            return (
              <button
                key={acc.id}
                onClick={() => onSelectAccountFilter(isSelected ? '' : acc.name)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isSelected 
                    ? 'bg-blue-600/15 border-blue-500 shadow-sm' 
                    : 'bg-slate-800/60 border-slate-750 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 truncate max-w-[100px]">
                    {acc.name}
                  </span>
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: acc.color }} 
                  />
                </div>
                <div className="mt-1.5">
                  <span className="text-sm font-semibold text-white">
                    {formatBRL(amount)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
