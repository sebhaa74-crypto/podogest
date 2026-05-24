import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Activity } from 'lucide-react';
import { Treatment } from '../types';
import { motion } from 'motion/react';
import { ConfirmDialog } from './ConfirmDialog';

interface TreatmentModalProps {
  treatment?: Treatment | null;
  onSave: (treatment: Omit<Treatment, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Treatment>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function TreatmentModal({ treatment, onSave, onUpdate, onDelete, onClose }: TreatmentModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cost: 0
  });

  useEffect(() => {
    if (treatment) {
      setFormData({
        name: treatment.name,
        cost: treatment.cost
      });
    }
  }, [treatment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (treatment) {
      onUpdate(treatment.id, formData);
    } else {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {treatment ? 'Editar Tratamiento' : 'Añadir Tratamiento'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre del Tratamiento *</label>
            <input 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              type="text" 
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" 
              placeholder="Ej. Servicio Podológico Integral"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Costo (CLP) *</label>
            <input 
              required 
              value={formData.cost || ''} 
              onChange={e => setFormData({...formData, cost: e.target.value === '' ? 0 : Number(e.target.value)})} 
              type="number" 
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" 
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-3">
            {treatment && onDelete && (
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500 hover:text-red-700 p-2 font-medium flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-5 h-5" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button 
              type="submit" 
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {treatment ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>

      {treatment && onDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Eliminar Tratamiento"
          message={`¿Estás seguro que deseas eliminar el tratamiento "${treatment.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar Tratamiento"
          onConfirm={() => {
            onDelete(treatment.id);
            setShowDeleteConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
