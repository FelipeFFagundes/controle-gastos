import React, { useState } from 'react';
import { 
  Search, 
  Check, 
  Clock, 
  Trash2, 
  Edit3, 
  Layers, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter
} from 'lucide-react';

export function TransactionList({ 
  transactions = [], 
  accounts = [], 
  categories = [], 
  selectedAccountFilter = '',
  onSelectAccountFilter,
  onTogglePaid, 
  onEdit, 
  onDelete 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending'

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Filtragem
  const filteredTransactions = transactions.filter(t => {
    // Busca por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const descMatch = t.description.toLowerCase().includes(term);
      const catMatch = t.category.toLowerCase().includes(term);
      const accMatch = t.account.toLowerCase().includes(term);
      if (!descMatch && !catMatch && !accMatch) return false;
    }

    // Filtro por tipo
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;

    // Filtro por status
    if (statusFilter === 'paid' && !t.paid) return false;
    if (statusFilter === 'pending' && t.paid) return false;

    // Filtro por conta/cartão
    if (selectedAccountFilter && t.account !== selectedAccountFilter) return false;

    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Barra de Busca e Filtros */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por descrição, cartão ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros de Tipo e Status */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Tipo */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  typeFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  typeFilter === 'expense' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Despesas
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  typeFilter === 'income' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Receitas
              </button>
            </div>

            {/* Status */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  statusFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Status
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  statusFilter === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pagas
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  statusFilter === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pendentes
              </button>
            </div>
          </div>
        </div>

        {/* Indicador de Filtro Ativo */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>
            Mostrando <strong>{filteredTransactions.length}</strong> de <strong>{transactions.length}</strong> lançamentos
          </span>
          {selectedAccountFilter && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Filtrando por: <strong>{selectedAccountFilter}</strong>
              <button onClick={() => onSelectAccountFilter('')} className="hover:text-white">✕</button>
            </span>
          )}
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="overflow-x-auto">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">Nenhum lançamento encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Status</th>
                <th className="py-3 px-4">Descrição & Categoria</th>
                <th className="py-3 px-4">Conta / Cartão</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 w-20 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <tr 
                    key={tx.id} 
                    className={`hover:bg-slate-850/50 transition-colors group ${
                      tx.paid ? 'opacity-90' : ''
                    }`}
                  >
                    {/* Botão de Status (Pago / Pendente) */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onTogglePaid(tx.id)}
                        title={tx.paid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          tx.paid 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30' 
                            : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {tx.paid ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Clock className="w-3.5 h-3.5" />}
                      </button>
                    </td>

                    {/* Descrição & Categoria & Parcela */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${tx.paid ? 'text-slate-300' : 'text-white'}`}>
                          {tx.description}
                        </span>

                        {/* Badge de Parcela */}
                        {tx.installment && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {tx.installment.current}/{tx.installment.total}
                          </span>
                        )}

                        {/* Badge Categoria */}
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                          {tx.category}
                        </span>
                      </div>
                    </td>

                    {/* Conta / Cartão */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3 text-slate-500" />
                        {tx.account}
                      </span>
                    </td>

                    {/* Data */}
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>

                    {/* Valor */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className={`font-semibold text-sm ${
                        isIncome ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isIncome ? '+ ' : '- '}
                        {formatBRL(tx.amount)}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(tx)}
                          title="Editar"
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(tx.id)}
                          title="Excluir"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
