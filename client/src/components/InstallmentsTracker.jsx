import React from 'react';
import { Layers, Calendar, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';

export function InstallmentsTracker({ installments = [], currentMonth = '2026-10' }) {
  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (!installments || installments.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
        <Layers className="w-10 h-10 mx-auto mb-2 text-slate-600" />
        <p className="text-sm font-medium">Nenhum parcelamento ativo encontrado.</p>
        <p className="text-xs text-slate-600 mt-1">Ao registrar compras parceladas (ex: 1/10), elas aparecerão aqui automaticamente.</p>
      </div>
    );
  }

  // Estatísticas gerais de parcelamentos
  const totalInstallmentsDebt = installments.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalMonthlyCommitment = installments.reduce((acc, curr) => acc + (curr.amountPerInstallment || 0), 0);

  return (
    <div className="space-y-4">
      {/* Resumo dos Parcelamentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Impacto Mensal dos Parcelamentos</span>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {formatBRL(totalMonthlyCommitment)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Soma das parcelas que caem este mês</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Valor Total Contratado em Parcelas</span>
            <div className="text-xl font-bold text-indigo-400 mt-1">
              {formatBRL(totalInstallmentsDebt)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{installments.length} compras parceladas ativas</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Cards de Cada Parcela */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {installments.map((item, idx) => {
          const current = item.currentInstallment || 1;
          const total = item.totalInstallments || 1;
          const percentage = Math.min(100, Math.round((current / total) * 100));
          const remaining = Math.max(0, total - current);
          const paidSoFar = item.amountPerInstallment * current;
          const remainingDebt = item.amountPerInstallment * remaining;

          return (
            <div 
              key={idx} 
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-white text-sm">{item.description}</h4>
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      {item.account} • {item.category}
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
                    Parcela {current} de {total}
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Progresso de Pagamento</span>
                    <span className="font-semibold text-white">{percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Detalhes Financeiros */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Valor da Parcela</span>
                  <span className="font-semibold text-white">{formatBRL(item.amountPerInstallment)}</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-500 block text-[11px]">Restam</span>
                  <span className="font-semibold text-amber-400">{remaining} {remaining === 1 ? 'mês' : 'meses'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">Saldo Devedor</span>
                  <span className="font-semibold text-slate-300">{formatBRL(remainingDebt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
