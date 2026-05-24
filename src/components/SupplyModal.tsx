import React, { useState, useEffect } from 'react';
import { X, Package, Tag } from 'lucide-react';
import { Supply } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface SupplyModalProps {
  supply?: Supply | null;
  onSave: (supply: Omit<Supply, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Supply>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function SupplyModal({ supply, onSave, onUpdate, onDelete, onClose }: SupplyModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'unidades',
    stock: 0,
    minStock: 0
  });

  useEffect(() => {
    if (supply) {
      setFormData({
        name: supply.name,
        unit: supply.unit,
        stock: supply.stock,
        minStock: supply.minStock
      });
    }
  }, [supply]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (supply) {
      onUpdate(supply.id, formData);
    } else {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {supply ? 'Editar Insumo' : 'Añadir Insumo Médico'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre del Insumo *</label>
            <input 
              required 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" 
              placeholder="Ej. Algodón, Bisturí N° 15, Guantes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de Unidad *</label>
            <select
              required
              value={formData.unit}
              onChange={e => setFormData({...formData, unit: e.target.value})}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="unidades">Unidades</option>
              <option value="pares">Pares</option>
              <option value="cajas">Cajas</option>
              <option value="ml">Mililitros (ml)</option>
              <option value="g">Gramos (g)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Stock Actual *</label>
              <input 
                required 
                type="number" 
                min="0"
                value={formData.stock || ''} 
                onChange={e => setFormData({...formData, stock: e.target.value === '' ? 0 : Number(e.target.value)})} 
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Stock Mínimo *</label>
              <input 
                required 
                type="number" 
                min="0"
                value={formData.minStock || ''} 
                onChange={e => setFormData({...formData, minStock: e.target.value === '' ? 0 : Number(e.target.value)})} 
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono" 
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">Alerta cuando el stock sea igual o menor.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            {supply && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-medium transition-colors"
              >
                Eliminar Insumo
              </button>
            ) : <div></div>}
            
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="text-slate-600 font-medium px-4 py-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                {supply ? 'Guardar Cambios' : 'Añadir Insumo'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {supply && onDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Eliminar Insumo"
          message={`¿Estás seguro que deseas eliminar el insumo "${supply.name}" del inventario? Esta acción no se puede deshacer.`}
          confirmText="Eliminar Insumo"
          onConfirm={() => {
            onDelete(supply.id);
            setShowDeleteConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
