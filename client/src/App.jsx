import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Layers, 
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { InstallmentsTracker } from './components/InstallmentsTracker';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { PluggySyncModal } from './components/PluggySyncModal';

export default function App() {
  const [currentMonth, setCurrentMonth] = useState('2026-10');
  const [availableMonths, setAvailableMonths] = useState(['2026-10']);
  const [data, setData] = useState({
    categories: [],
    accounts: [],
    transactions: [],
    summary: {}
  });
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'installments'
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPluggyModalOpen, setIsPluggyModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Toast / Mensagens de feedback
  const [feedback, setFeedback] = useState(null);

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Carrega lista de meses
  const fetchMonths = async () => {
    try {
      const res = await fetch('/api/months');
      const json = await res.json();
      if (json.months && json.months.length > 0) {
        setAvailableMonths(json.months);
      }
    } catch (err) {
      console.error('Erro ao buscar meses:', err);
    }
  };

  // Carrega dados do mês ativo
  const fetchData = async (month) => {
    setLoading(true);
    try {
      const targetMonth = month || currentMonth;
      const [resData, resInst] = await Promise.all([
        fetch(`/api/data?month=${targetMonth}`),
        fetch(`/api/installments?month=${targetMonth}`)
      ]);

      const jsonData = await resData.json();
      const jsonInst = await resInst.json();

      setData(jsonData);
      setInstallments(jsonInst.installments || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      showToast('Erro ao carregar dados do servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonths();
    fetchData('2026-10');
  }, []);

  // Navegar entre meses
  const changeMonth = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
    fetchData(newMonth);
  };

  const handleSelectMonth = (newMonth) => {
    setCurrentMonth(newMonth);
    fetchData(newMonth);
  };

  // Formata o nome do mês (ex: Outubro de 2026)
  const formatMonthTitle = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
  };

  // Salvar nova transação ou edição
  const handleSaveTransaction = async (formData) => {
    try {
      if (editingTransaction) {
        const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Falha ao atualizar');
        showToast('Lançamento atualizado com sucesso!');
      } else {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Falha ao criar');
        showToast('Nova compra/gasto registrado com sucesso!');
      }

      setIsModalOpen(false);
      setEditingTransaction(null);
      await fetchMonths();
      await fetchData(currentMonth);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar lançamento.', 'error');
    }
  };

  // Alternar status pago/pendente
  const handleTogglePaid = async (id) => {
    try {
      const res = await fetch(`/api/transactions/${id}/toggle-paid`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Falha ao alterar status');
      fetchData(currentMonth);
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  // Deletar transação
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este lançamento?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
      showToast('Lançamento removido.');
      fetchData(currentMonth);
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir lançamento.', 'error');
    }
  };

  // Restaurar dados originais da planilha
  const handleResetSeed = async () => {
    if (!window.confirm('Atenção: isso restaurará os dados originais da sua planilha de Outubro 2026. Deseja continuar?')) {
      return;
    }
    try {
      const res = await fetch('/api/reset-seed', { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao resetar');
      showToast('Dados restaurados com base na Planilha Controle!');
      setCurrentMonth('2026-10');
      await fetchMonths();
      await fetchData('2026-10');
    } catch (err) {
      console.error(err);
      showToast('Erro ao restaurar dados.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast de Feedback */}
      {feedback && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium ${
            feedback.type === 'error' 
              ? 'bg-rose-950/90 text-rose-200 border-rose-800' 
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
          }`}>
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Header Superior */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo e Título */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Controle de Gastos
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal border border-slate-700">
                  v1.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Gerencie compras, faturas e parcelamentos do mês
              </p>
            </div>
          </div>

          {/* Navegação de Mês */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => changeMonth(-1)}
              title="Mês Anterior"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={currentMonth}
              onChange={(e) => handleSelectMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white px-2 py-1 focus:outline-none cursor-pointer"
            >
              {availableMonths.map(m => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {formatMonthTitle(m)}
                </option>
              ))}
            </select>

            <button
              onClick={() => changeMonth(1)}
              title="Próximo Mês"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSeed}
              title="Restaurar dados originais da planilha"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors hidden md:flex items-center gap-1.5 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Planilha</span>
            </button>

            <button
              onClick={() => setIsPluggyModalOpen(true)}
              title="Sincronizar com Open Finance (Pluggy)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sincronizar Bancos</span>
            </button>

            <button
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Compra</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6 w-full">
        {/* Seletor de Abas */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Visão do Mês ({formatMonthTitle(currentMonth)})</span>
            </button>

            <button
              onClick={() => setActiveTab('installments')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'installments'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Parcelamentos Ativos</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-bold">
                {installments.length}
              </span>
            </button>
          </div>

          <span className="text-xs text-slate-500 hidden sm:block">
            {data.transactions?.length || 0} lançamentos registrados
          </span>
        </div>

        {/* Visualização de Abas */}
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            {/* Cards de Resumo Financeiro */}
            <SummaryCards 
              summary={data.summary} 
              accounts={data.accounts}
              selectedAccountFilter={selectedAccountFilter}
              onSelectAccountFilter={setSelectedAccountFilter}
            />

            {/* Grid Principal: Lista de Transações + Distribuição por Categoria */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2">
                <TransactionList 
                  transactions={data.transactions || []}
                  accounts={data.accounts || []}
                  categories={data.categories || []}
                  selectedAccountFilter={selectedAccountFilter}
                  onSelectAccountFilter={setSelectedAccountFilter}
                  onTogglePaid={handleTogglePaid}
                  onEdit={(tx) => {
                    setEditingTransaction(tx);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDeleteTransaction}
                />
              </div>

              {/* Barra Lateral: Categorias */}
              <div className="space-y-4">
                <CategoryBreakdown 
                  expensesByCategory={data.summary?.expensesByCategory || {}}
                  categories={data.categories || []}
                  totalExpense={data.summary?.totalExpense || 0}
                />

                {/* Card de Dica Rápida */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
                  <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                    💡 Dicas de Uso
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-400 text-[11px]">
                    <li>Clique no ícone de relógio na tabela para marcar um gasto como <strong>Pago</strong>.</li>
                    <li>Ao registrar compras parceladas (ex: 6x), o sistema pode gerar automaticamente as parcelas dos próximos meses.</li>
                    <li>Clique em qualquer cartão no topo para filtrar a tabela apenas por ele.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Aba de Parcelamentos */
          <InstallmentsTracker 
            installments={installments} 
            currentMonth={currentMonth} 
          />
        )}
      </main>

      {/* Modal de Criação / Edição */}
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        categories={data.categories || []}
        accounts={data.accounts || []}
        currentMonth={currentMonth}
        editTransaction={editingTransaction}
      />
      {/* Modal de Sincronização Pluggy (Open Finance) */}
      <PluggySyncModal
        isOpen={isPluggyModalOpen}
        onClose={() => setIsPluggyModalOpen(false)}
        currentMonth={currentMonth}
        onSyncSuccess={() => {
          showToast('Bancos sincronizados com sucesso!');
          fetchMonths();
          fetchData(currentMonth);
        }}
      />
    </div>
  );
}
