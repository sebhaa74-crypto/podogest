import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, Clock, User, DollarSign, Activity, ChevronDown } from 'lucide-react';
import { Appointment, Patient, Treatment } from '../types';
import { motion } from 'motion/react';
import { cn, formatTime } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';

interface AppointmentModalProps {
  appointment?: Appointment | null;
  patients: Patient[];
  treatments: Treatment[];
  appointments: Appointment[];
  specialists?: { id: string, name: string }[];
  onSave: (appointment: Omit<Appointment, 'id' | 'status'>, newPatientData?: Omit<Patient, 'id' | 'registeredAt'>) => void;
  onUpdate: (id: string, updates: Partial<Appointment>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  initialDate?: string;
  defaultIsNewPatient?: boolean;
}

export function AppointmentModal({ 
  appointment, 
  patients, 
  treatments,
  appointments,
  specialists = [],
  onSave, 
  onUpdate, 
  onDelete, 
  onClose,
  initialDate,
  defaultIsNewPatient = false
}: AppointmentModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(defaultIsNewPatient);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return {
      patientId: '',
      date: initialDate || todayStr,
      time: '',
      treatmentType: '',
      notes: '',
      cost: 0,
      paid: false,
      paymentMethod: 'cash' as 'cash' | 'transfer'
    };
  });

  const [newPatientData, setNewPatientData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  const [isCustomTreatment, setIsCustomTreatment] = useState(false);
  const [isCustomTime, setIsCustomTime] = useState(false);

  const generateAvailableTimes = () => {
    const times: { time: string, isAvailable: boolean, bookedBy?: string, bookedByInitials?: string }[] = [];
    let currentHour = 8;
    let currentMinute = 0;

    while (currentHour <= 21) {
      if (currentHour === 21 && currentMinute > 0) break;

      const h = currentHour.toString().padStart(2, '0');
      const m = currentMinute.toString().padStart(2, '0');
      const timeString = `${h}:${m}`;

      const conflicting = appointments.find(a =>
        a.id !== appointment?.id &&
        a.date === formData.date &&
        formatTime(a.time) === timeString &&
        a.status !== 'cancelled'
      );

      let bookedBy: string | undefined;
      let bookedByInitials: string | undefined;
      if (conflicting) {
        // Find who booked it
        const bookingPatient = patients.find(p => p.id === conflicting.patientId);
        const bookingSpecialist = specialists.find(s => s.id === conflicting.specialistId);
        bookedBy = bookingPatient?.name || 'Paciente';
        const specName = bookingSpecialist?.name || '';
        const parts = specName.split(' ').filter(Boolean);
        bookedByInitials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : specName.slice(0, 2) || 'Dr';
      }

      times.push({ time: timeString, isAvailable: !conflicting, bookedBy, bookedByInitials });

      currentMinute += 15;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
      }
    }
    return times;
  };

  const availableTimes = generateAvailableTimes();

  useEffect(() => {
    if (appointment) {
      setFormData({
        patientId: appointment.patientId,
        date: appointment.date,
        time: appointment.time,
        treatmentType: appointment.treatmentType,
        notes: appointment.notes,
        cost: appointment.cost,
        paid: appointment.paid,
        paymentMethod: (appointment as any).paymentMethod || 'cash'
      });
      setIsNewPatient(false);
      setIsCustomTreatment(!treatments.some(t => t.name === appointment.treatmentType));
      
      // Check if time is in availableTimes
      const isStandardTime = generateAvailableTimes().some(t => t.time === appointment.time);
      setIsCustomTime(!isStandardTime);
    }
  }, [appointment, treatments, appointments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    
    // Validar superposición de horarios
    // Busca si existe una cita en la misma fecha y hora
    const overlappingAppointment = appointments.find(a => 
      a.id !== appointment?.id && 
      a.date === formData.date && 
      formatTime(a.time) === formData.time &&
      a.status !== 'cancelled'
    );

    if (overlappingAppointment) {
      const otherPatient = patients.find(p => p.id === overlappingAppointment.patientId);
      const otherSpecialist = specialists.find(s => s.id === overlappingAppointment.specialistId);
      const specName = otherSpecialist ? otherSpecialist.name.split(' ')[0] : 'el profesional';
      const patName = otherPatient ? otherPatient.name.split(' ')[0] : 'un paciente';
      setErrorText(`⛔ Hora ${formData.time} ya está ocupada — ${specName} tiene a ${patName} agendado en este horario.`);
      return;
    }

    if (appointment) {
      onUpdate(appointment.id, formData);
    } else {
      if (isNewPatient) {
        if (!newPatientData.name || !newPatientData.phone) {
          setErrorText('Por favor complete el nombre y teléfono del nuevo paciente');
          return;
        }
        onSave(formData, newPatientData);
      } else {
        if (!formData.patientId) {
          setErrorText('Por favor seleccione un paciente');
          return;
        }
        onSave(formData);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <Calendar className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {appointment ? 'Editar Cita' : 'Programar Cita'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-auto max-h-[80vh] md:max-h-[85vh]">
          {errorText && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
              <X className="w-4 h-4" />
              {errorText}
            </div>
          )}

          {!appointment && (
            <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
              <button
                type="button"
                onClick={() => setIsNewPatient(false)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  !isNewPatient ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Paciente Existente
              </button>
              <button
                type="button"
                onClick={() => setIsNewPatient(true)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  isNewPatient ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Nuevo Paciente
              </button>
            </div>
          )}

          {isNewPatient && !appointment ? (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Nombre Completo *</span>
                </label>
                <input 
                  required 
                  value={newPatientData.name} 
                  onChange={e => setNewPatientData({...newPatientData, name: e.target.value})} 
                  className="w-full h-11 px-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-900 font-semibold text-sm shadow-sm" 
                  placeholder="Nombre del nuevo paciente"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Teléfono *</span>
                </label>
                <input 
                  required 
                  value={newPatientData.phone} 
                  onChange={e => setNewPatientData({...newPatientData, phone: e.target.value})} 
                  className="w-full h-11 px-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-900 font-semibold text-sm shadow-sm" 
                  placeholder="Ej. +569 1234 5678"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Correo Electrónico</span>
                </label>
                <input 
                  type="email"
                  value={newPatientData.email} 
                  onChange={e => setNewPatientData({...newPatientData, email: e.target.value})} 
                  className="w-full h-11 px-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-900 font-semibold text-sm shadow-sm" 
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Notas Médicas / Antecedentes</span>
                </label>
                <textarea 
                  value={newPatientData.notes} 
                  onChange={e => setNewPatientData({...newPatientData, notes: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none h-20 resize-none text-slate-900 font-medium text-sm shadow-sm" 
                  placeholder="Antecedentes médicos relevantes..."
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Paciente *</span>
              </label>
              <div className="relative">
                <select 
                  required 
                  value={formData.patientId} 
                  onChange={e => setFormData({...formData, patientId: e.target.value})} 
                  className="w-full h-11 pl-4 pr-10 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none appearance-none text-slate-900 font-semibold text-sm cursor-pointer shadow-sm"
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Fecha *</span>
              </label>
              <input 
                required 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
                type="date" 
                className="w-full h-11 px-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-900 font-semibold text-sm cursor-pointer shadow-sm" 
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Hora *</span>
              </label>

              {/* Selected time display */}
              {formData.time && !isCustomTime && (
                <div className="mb-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-black text-emerald-700">Hora seleccionada: {formData.time}</span>
                </div>
              )}

              {/* Visual time grid */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                {/* Compact legend */}
                <div className="flex items-center gap-4 px-3 py-2 border-b border-slate-100 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Referencias:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-500">Libre</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-500">Ocupado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-700 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-500">Elegido</span>
                  </div>
                </div>

                {/* Hour groups */}
                <div className="max-h-56 overflow-y-auto p-2 space-y-3">
                  {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => {
                    const hourSlots = availableTimes.filter(t => t.time.startsWith(`${hour.toString().padStart(2, '0')}:`));
                    if (hourSlots.length === 0) return null;
                    return (
                      <div key={hour}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-0.5">
                          {hour.toString().padStart(2, '0')}:00 hs
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {hourSlots.map(({ time, isAvailable, bookedBy, bookedByInitials }) => {
                            const isSelected = formData.time === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => {
                                  setIsCustomTime(false);
                                  setFormData({ ...formData, time });
                                }}
                                title={!isAvailable ? `Ocupado por: ${bookedBy || 'otro paciente'}` : `Agendar a las ${time}`}
                                className={cn(
                                  'flex flex-col items-center justify-center py-2 rounded-xl text-[11px] font-bold transition-all border select-none',
                                  isSelected
                                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-lg ring-2 ring-emerald-400 ring-offset-1'
                                    : isAvailable
                                      ? 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 active:scale-95'
                                      : 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed'
                                )}
                              >
                                <span className="leading-none">{time}</span>
                                {!isAvailable && (
                                  <span className="text-[8px] font-black mt-0.5 leading-none opacity-70">
                                    {bookedByInitials || '✕'}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-[9px] mt-0.5 leading-none">✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manual override toggle */}
              <button
                type="button"
                onClick={() => setIsCustomTime(!isCustomTime)}
                className="mt-2 text-xs font-semibold text-slate-400 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
              >
                <Clock className="w-3 h-3" />
                {isCustomTime ? '← Volver a la grilla' : 'Ingresar hora distinta'}
              </button>
              {isCustomTime && (
                <input
                  required
                  autoFocus
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  type="time"
                  className="w-full h-11 mt-2 px-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-900 font-semibold text-sm shadow-sm"
                />
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tratamiento / Servicio *</span>
            </label>
            <div className="relative">
              <select 
                required={!isCustomTreatment}
                value={isCustomTreatment ? 'OTRO' : formData.treatmentType} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'OTRO') {
                    setIsCustomTreatment(true);
                    setFormData({
                      ...formData,
                      treatmentType: ''
                    });
                  } else {
                    setIsCustomTreatment(false);
                    const selected = treatments.find(t => t.name === val);
                    setFormData({
                      ...formData, 
                      treatmentType: val,
                      cost: selected ? selected.cost : formData.cost
                    });
                  }
                }} 
                className="w-full h-11 pl-4 pr-10 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none appearance-none text-slate-900 font-semibold text-sm cursor-pointer shadow-sm"
              >
                <option value="">Seleccionar tratamiento...</option>
                {treatments.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                <option value="OTRO">Otro (Ingresar manualmente)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>
            </div>
            {isCustomTreatment && (
              <input 
                required 
                autoFocus
                value={formData.treatmentType}
                onChange={e => setFormData({...formData, treatmentType: e.target.value})} 
                type="text" 
                className="w-full h-11 mt-2 px-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-900 font-semibold text-sm shadow-sm" 
                placeholder="Escriba el nombre del tratamiento"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Costo Estimado (CLP) *</span>
              </label>
              <input 
                required 
                value={formData.cost || ''} 
                onChange={e => setFormData({...formData, cost: e.target.value === '' ? 0 : Number(e.target.value)})} 
                type="number" 
                className="w-full h-11 px-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-900 font-semibold text-sm shadow-sm" 
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Estado de Pago</span>
              </label>
              <div className="flex gap-2 items-center h-11 bg-slate-50 border border-slate-300 px-4 rounded-xl hover:bg-slate-100/70 transition-all shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer w-full">
                  <input 
                    type="checkbox" 
                    checked={formData.paid} 
                    onChange={e => setFormData({...formData, paid: e.target.checked})} 
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <span className="text-sm font-semibold text-slate-905">
                    {formData.paid ? 'Pagado' : 'Pendiente'}
                  </span>
                </label>
                {formData.paid && (
                  <select 
                    value={(formData as any).paymentMethod || 'cash'}
                    onChange={e => setFormData({...formData, paymentMethod: e.target.value as 'cash' | 'transfer'})}
                    className="ml-2 text-xs font-bold bg-white border border-slate-300 text-emerald-700 px-2.5 py-1 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 h-7 cursor-pointer"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Trf.</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Notas (Opcional)</span>
            </label>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none h-24 resize-none text-slate-900 font-medium text-sm shadow-sm"
              placeholder="Detalles adicionales sobre la cita o el paciente..."
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-3">
            {appointment && onDelete && (
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
              {appointment ? 'Actualizar' : 'Guardar Cita'}
            </button>
          </div>
        </form>
      </motion.div>

      {appointment && onDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Eliminar Cita"
          message="¿Estás seguro que deseas eliminar esta cita? Esta acción no se puede deshacer."
          confirmText="Eliminar Cita"
          onConfirm={() => {
            onDelete(appointment.id);
            setShowDeleteConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
