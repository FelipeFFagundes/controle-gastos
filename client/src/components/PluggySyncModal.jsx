import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Key, ShieldCheck, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

export function PluggySyncModal({ isOpen, onClose, onSyncSuccess, currentMonth = '2026-10' }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Carrega credenciais salvas no navegador para comodidade
    const savedId = localStorage.getItem('pluggy_client_id') || '';
    const savedSecret = localStorage.getItem('pluggy_client_secret') || '';
    setClientId(savedId);
    setClientSecret(savedSecret);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSync = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Salva no localStorage para não precisar digitar de novo
    if (clientId) localStorage.setItem('pluggy_client_id', clientId);
    if (clientSecret) localStorage.setItem('pluggy_client_secret', clientSecret);

    try {
      const res = await fetch('/api/pluggy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          month: currentMonth
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao sincronizar com a Pluggy');
      }

      setResult(data);
      if (onSyncSuccess) {
        onSyncSuccess(data);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Falha na conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sincronizar Bancos (Pluggy)</h2>
              <span className="text-[11px] text-slate-400">Open Finance Brasil</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <form onSubmit={handleSync} className="p-6 space-y-4">
          <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Como funciona o plano gratuito:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Você pode usar o <strong>Meu Pluggy</strong> (<a href="https://meu.pluggy.ai" target="_blank" rel="noreferrer" className="text-blue-400 underline inline-flex items-center gap-0.5">meu.pluggy.ai <ExternalLink className="w-2.5 h-2.5" /></a>) para conectar gratuitamente até 5 contas reais (Itaú, Nubank, XP, etc.) e obter seu <code>Client ID</code> e <code>Client Secret</code>.
            </p>
          </div>

          {/* Feedback de Erro ou Sucesso */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{result.message}</span>
            </div>
          )}

          {/* Campos de Credenciais */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Pluggy Client ID
              </label>
              <input
                type="text"
                placeholder="Ex.: 34a2e58c-..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Pluggy Client Secret
              </label>
              <input
                type="password"
                placeholder="Ex.: 9f12d8a1-..."
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Suas credenciais são enviadas diretamente para a API oficial da Pluggy e salvas apenas localmente no seu dispositivo.
          </p>

          {/* Botões */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-all"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
