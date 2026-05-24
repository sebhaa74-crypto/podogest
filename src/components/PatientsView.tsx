import React, { useState } from 'react';
import { useAppState } from '../store';
import { Search, Plus, User, Phone, Mail, Calendar, FileText, X, SlidersHorizontal, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { PatientDetailModal } from './PatientDetailModal';
import { AnimatePresence, motion } from 'motion/react';

export function PatientsView({ state }: { state: ReturnType<typeof useAppState> }) {
  const { patients, addPatient, updatePatient, deletePatient, appointments, sales } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', email: '', notes: '' });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm);
    let matchStatus = true;
    if (filterStatus !== 'all') {
      const appts = appointments.filter(a => a.patientId === p.id);
      matchStatus = filterStatus === 'completed'
        ? appts.some(a => a.status === 'completed')
        : appts.some(a => a.status === 'pending');
    }
    return matchSearch && matchStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPatient(newPatient);
    setNewPatient({ name: '', phone: '', email: '', notes: '' });
    setIsAdding(false);
  };

  const totalAppts = (id: string) => appointments.filter(a => a.patientId === id).length;
  const lastVisit = (id: string) => {
    const appts = appointments.filter(a => a.patientId === id && a.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));
    return appts[0]?.date || null;
  };

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Pacientes</h2>
          <p className="text-slate-400 text-sm mt-0.5">{patients.length} registrados en total</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-glow-emerald text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
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
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
        >
          <option value="all">Todos</option>
          <option value="completed">Con citas</option>
          <option value="pending">Pendientes</option>
        </select>
      </div>

      {/* Stats pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { label: 'Total', value: patients.length, active: filterStatus === 'all', onClick: () => setFilterStatus('all') },
          { label: 'Con historial', value: patients.filter(p => appointments.some(a => a.patientId === p.id && a.status === 'completed')).length, active: filterStatus === 'completed', onClick: () => setFilterStatus('completed') },
          { label: 'Cita pendiente', value: patients.filter(p => appointments.some(a => a.patientId === p.id && a.status === 'pending')).length, active: filterStatus === 'pending', onClick: () => setFilterStatus('pending') },
        ].map(pill => (
          <button
            key={pill.label}
            onClick={pill.onClick}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
              pill.active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'
            )}
          >
            {pill.label}
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-extrabold', pill.active ? 'bg-white/20' : 'bg-slate-100')}>
              {pill.value}
            </span>
          </button>
        ))}
      </div>

      {/* Patient Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-14 h-14 text-slate-200 mb-3" />
          <p className="text-slate-500 font-semibold">No se encontraron pacientes</p>
          <p className="text-slate-300 text-sm mt-1">Prueba cambiando el filtro o agrega uno nuevo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((patient, i) => {
            const nAppts = totalAppts(patient.id);
            const last = lastVisit(patient.id);
            const hasPending = appointments.some(a => a.patientId === patient.id && a.status === 'pending');
            return (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedPatientId(patient.id)}
                className="premium-card premium-card-clickable bg-white rounded-2xl p-4 border border-slate-200 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shrink-0">
                    <span className="text-emerald-700 font-extrabold text-lg">
                      {patient.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{patient.name}</h4>
                      {hasPending && (
                        <span className="shrink-0 text-[9px] font-extrabold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                          PENDIENTE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {patient.phone}
                    </p>
                    {patient.email && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="w-3 h-3 shrink-0" /> {patient.email}
                      </p>
                    )}
                  </div>
                </div>

                {patient.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 line-clamp-2 border border-slate-100 italic">
                    {patient.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                    <Calendar className="w-3.5 h-3.5" /> {nAppts} cita{nAppts !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-slate-400">
                    {last ? `Última: ${last}` : 'Sin visitas'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Patient Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsAdding(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-slate-800">Nuevo Paciente</h3>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Nombre *</label>
                    <input required value={newPatient.name} onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                      placeholder="Nombre completo"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Teléfono *</label>
                    <input required value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                      type="tel" placeholder="+56 9 1234 5678"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Correo Electrónico</label>
                  <input value={newPatient.email} onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
                    type="email" placeholder="opcional@ejemplo.com"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Antecedentes / Notas</label>
                  <textarea value={newPatient.notes} onChange={e => setNewPatient({ ...newPatient, notes: e.target.value })}
                    rows={3} placeholder="Condiciones, alergias, observaciones..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setIsAdding(false)}
                    className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="flex-1 btn-glow-emerald text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {selectedPatient && (
          <PatientDetailModal
            patient={selectedPatient}
            appointments={appointments}
            sales={sales}
            onUpdate={updatePatient}
            onDelete={deletePatient}
            onUpdateAppointment={state.updateAppointment}
            onEditingChange={state.setIsEditingPatient}
            onClose={() => { state.setIsEditingPatient(false); setSelectedPatientId(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
