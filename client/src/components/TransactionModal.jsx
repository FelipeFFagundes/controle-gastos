import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Layers, Calendar, CreditCard, Tag, DollarSign } from 'lucide-react';

export function TransactionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  categories = [], 
  accounts = [], 
  currentMonth = '2026-10',
  editTransaction = null 
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [date, setDate] = useState('');
  const [paid, setPaid] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [currentInstallment, setCurrentInstallment] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(2);
  const [generateFutureMonths, setGenerateFutureMonths] = useState(true);

  useEffect(() => {
    if (editTransaction) {
      setDescription(editTransaction.description || '');
      setAmount(editTransaction.amount ? String(editTransaction.amount) : '');
      setType(editTransaction.type || 'expense');
      setCategory(editTransaction.category || (categories[0]?.name || 'Outros'));
      setAccount(editTransaction.account || (accounts[0]?.name || 'Fatura XP'));
      setDate(editTransaction.date || `${currentMonth}-15`);
      setPaid(Boolean(editTransaction.paid));
      if (editTransaction.installment) {
        setIsInstallment(true);
        setCurrentInstallment(editTransaction.installment.current || 1);
        setTotalInstallments(editTransaction.installment.total || 2);
        setGenerateFutureMonths(false);
      } else {
        setIsInstallment(false);
        setCurrentInstallment(1);
        setTotalInstallments(2);
      }
    } else {
      // Novo lançamento
      setDescription('');
      setAmount('');
      setType('expense');
      setCategory(categories[0]?.name || 'Outros');
      setAccount(accounts[0]?.name || 'Fatura XP');
      setDate(`${currentMonth}-15`);
      setPaid(false);
      setIsInstallment(false);
      setCurrentInstallment(1);
      setTotalInstallments(2);
      setGenerateFutureMonths(true);
    }
  }, [editTransaction, isOpen, currentMonth, categories, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount) {
      alert('Por favor, informe a descrição e o valor.');
      return;
    }

    const payload = {
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      category,
      account,
      date,
      paid,
      isInstallment,
      currentInstallment: parseInt(currentInstallment, 10),
      totalInstallments: parseInt(totalInstallments, 10),
      generateFutureMonths: isInstallment && !editTransaction ? generateFutureMonths : false
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              {editTransaction ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <h2 className="text-lg font-bold text-white">
              {editTransaction ? 'Editar Lançamento' : 'Nova Compra / Lançamento'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo: Despesa vs Receita */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                type === 'expense' 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Despesa (Gasto)
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                type === 'income' 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Receita (Entrada)
            </button>
          </div>

          {/* Descrição & Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Descrição</label>
              <input
                type="text"
                placeholder="Ex.: Discos, Supermercado, Farm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Valor (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Conta/Cartão & Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Conta / Cartão
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.name}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Seção de Parcelamento */}
          {type === 'expense' && (
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInstallment}
                    onChange={(e) => setIsInstallment(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 bg-slate-900 border-slate-700"
                  />
                  <span>Compra Parcelada (ex: 1/6)</span>
                </label>
                {isInstallment && (
                  <span className="text-[11px] text-blue-400 font-medium">
                    Parcela {currentInstallment} de {totalInstallments}
                  </span>
                )}
              </div>

              {isInstallment && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400">Parcela Atual</label>
                    <input
                      type="number"
                      min="1"
                      max={totalInstallments}
                      value={currentInstallment}
                      onChange={(e) => setCurrentInstallment(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Total de Parcelas</label>
                    <input
                      type="number"
                      min="2"
                      max="48"
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>
                  {!editTransaction && (
                    <div className="col-span-2 pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generateFutureMonths}
                          onChange={(e) => setGenerateFutureMonths(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-blue-500"
                        />
                        <span>Gerar parcelas futuras automaticamente nos próximos meses</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status: Já pago? */}
          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
              <span className="font-medium">Já está pago / liquidado?</span>
            </label>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              paid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {paid ? 'Pago' : 'Pendente'}
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{editTransaction ? 'Salvar Alterações' : 'Registrar Compra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
