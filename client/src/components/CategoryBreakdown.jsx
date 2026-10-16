import React from 'react';
import { PieChart, Tag } from 'lucide-react';

export function CategoryBreakdown({ expensesByCategory = {}, categories = [], totalExpense = 0 }) {
  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const categoryEntries = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);

  if (categoryEntries.length === 0 || totalExpense === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Distribuição por Categoria
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          {categoryEntries.length} categorias ativas
        </span>
      </div>

      <div className="space-y-3">
        {categoryEntries.map(([catName, amount]) => {
          const categoryObj = categories.find(c => c.name === catName);
          const color = categoryObj?.color || '#3b82f6';
          const percentage = Math.round((amount / totalExpense) * 100);

          return (
            <div key={catName} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: color }} 
                  />
                  {catName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{formatBRL(amount)}</span>
                  <span className="text-[11px] text-slate-500 font-medium w-8 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${percentage}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
