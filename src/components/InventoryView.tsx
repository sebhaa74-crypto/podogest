import React, { useState } from 'react';
import { useAppState } from '../store';
import { Package, Plus, Search, AlertTriangle, Edit2, X } from 'lucide-react';
import { Supply } from '../types';
import { cn } from '../lib/utils';
import { SupplyModal } from './SupplyModal';
import { AnimatePresence, motion } from 'motion/react';

export function InventoryView({ state }: { state: ReturnType<typeof useAppState> }) {
  const { supplies, addSupply, updateSupply, deleteSupply, updateSupplyStock } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);

  const filtered = supplies.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const lowStockCount = supplies.filter(s => s.stock <= s.minStock).length;

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Inventario</h2>
          <p className="text-slate-400 text-sm mt-0.5">{supplies.length} insumos registrados</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-glow-emerald text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* Stats & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar insumo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-700">{supplies.reduce((acc, s) => acc + s.stock, 0)} items</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("w-4 h-4", lowStockCount > 0 ? "text-amber-500" : "text-slate-300")} />
            <span className={cn("text-sm font-bold", lowStockCount > 0 ? "text-amber-600" : "text-slate-400")}>
              {lowStockCount} alertas
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-14 h-14 text-slate-200 mb-3" />
          <p className="text-slate-500 font-semibold">No se encontraron insumos</p>
          <p className="text-slate-300 text-sm mt-1">Añade insumos para empezar a controlar tu stock.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((supply, i) => {
            const isLow = supply.stock <= supply.minStock;
            return (
              <motion.div
                key={supply.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "premium-card bg-white rounded-2xl p-4 flex flex-col gap-4 border",
                  isLow ? "border-amber-200 shadow-amber-100/50" : "border-slate-200"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isLow ? "bg-amber-100" : "bg-emerald-50"
                    )}>
                      <Package className={cn("w-5 h-5", isLow ? "text-amber-600" : "text-emerald-600")} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{supply.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Mínimo: {supply.minStock} {supply.unit}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSupply(supply)}
                    className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-50/50 rounded-xl p-2 border border-slate-100">
                  <div className="flex flex-col ml-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock ({supply.unit})</span>
                    {isLow && <span className="text-[9px] font-bold text-amber-600">¡Bajo!</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateSupplyStock(supply.id, Math.max(0, supply.stock - 1))}
                      className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 flex items-center justify-center active:scale-95 transition-transform"
                    >−</button>
                    <span className={cn(
                      "font-mono font-extrabold text-lg w-8 text-center",
                      isLow ? "text-amber-600" : "text-slate-800"
                    )}>{supply.stock}</span>
                    <button
                      onClick={() => updateSupplyStock(supply.id, supply.stock + 1)}
                      className="w-9 h-9 rounded-lg bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 flex items-center justify-center active:scale-95 transition-transform shadow-sm"
                    >+</button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {(isAdding || selectedSupply) && (
          <SupplyModal
            supply={selectedSupply}
            onSave={addSupply}
            onUpdate={updateSupply}
            onDelete={deleteSupply}
            onClose={() => { setIsAdding(false); setSelectedSupply(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
