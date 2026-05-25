import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../store';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, XCircle, Plus, Edit2, MessageCircle, ChevronLeft, ChevronRight, DollarSign, Bell, Search, Filter, Trash2 } from 'lucide-react';
import { cn, formatCurrency, formatTime } from '../lib/utils';
import { AppointmentStatus, Appointment, Patient } from '../types';
import { AppointmentModal } from './AppointmentModal';
import { AnimatePresence } from 'motion/react';
import { format, isSameMonth, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addDays, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { sendSMS } from '../services/smsService';
import { ConfirmDialog } from './ConfirmDialog';

export function AgendaView({ state }: { state: ReturnType<typeof useAppState> }) {
  const { appointments, patients, treatments, addAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus, specialists, autoRemindersEnabled, setAutoRemindersEnabled, addNotification } = state;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingNewPatient, setIsAddingNewPatient] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');
  const [filterPatient, setFilterPatient] = useState('');
  const [filterTreatment, setFilterTreatment] = useState('');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Keep live refs so the interval can always read latest data WITHOUT restarting on every change
  const appointmentsRef = useRef(appointments);
  const patientsRef = useRef(patients);
  const addNotificationRef = useRef(addNotification);
  const updateAppointmentRef = useRef(updateAppointment);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { patientsRef.current = patients; }, [patients]);
  useEffect(() => { addNotificationRef.current = addNotification; }, [addNotification]);
  useEffect(() => { updateAppointmentRef.current = updateAppointment; }, [updateAppointment]);

  // Auto-send reminders — interval only restarts when autoRemindersEnabled toggles
  useEffect(() => {
    if (!autoRemindersEnabled) return;

    const checkReminders = () => {
      const now = new Date();
      appointmentsRef.current.forEach((appt) => {
        const apptDate = new Date(`${appt.date}T${formatTime(appt.time)}:00`);
        const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const minutesDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60);
        const patient = patientsRef.current.find(p => p.id === appt.patientId);

        if (!patient) return;

        // 1. Reminder 24 h before
        if (hoursDiff > 0 && hoursDiff <= 24 && !appt.reminderSent && appt.status === 'pending') {
          addNotificationRef.current({
            title: 'Cita Próxima (24h)',
            message: `Mañana a las ${formatTime(appt.time)} con ${patient.name} (${appt.treatmentType}).`,
            type: 'info',
            category: 'appointment'
          });
          updateAppointmentRef.current(appt.id, { ...appt, reminderSent: true });
        }

        // 2. Reminder 15 min before
        if (minutesDiff > 0 && minutesDiff <= 15 && !appt.reminder15mSent && appt.status === 'pending') {
          addNotificationRef.current({
            title: 'Cita en 15 minutos',
            message: `Atención: Cita con ${patient.name} a las ${formatTime(appt.time)} (${appt.treatmentType}).`,
            type: 'warning',
            category: 'appointment'
          });
          updateAppointmentRef.current(appt.id, { ...appt, reminder15mSent: true });
        }

        // 3. Unpaid reminder every 48 h
        if (appt.status === 'completed' && !appt.paid) {
          const hoursSinceCompletion = (now.getTime() - apptDate.getTime()) / (1000 * 60 * 60);
          const reminderLevel = Math.floor(hoursSinceCompletion / 48);
          const currentLevel = appt.unpaidReminderLevel || 0;
          if (reminderLevel > 0 && reminderLevel > currentLevel) {
            addNotificationRef.current({
              title: 'Pago Pendiente',
              message: `${patient.name} tiene un pago pendiente desde la cita del ${appt.date}.`,
              type: 'alert',
              category: 'payment'
            });
            updateAppointmentRef.current(appt.id, { ...appt, unpaidReminderLevel: reminderLevel });
          }
        }
      });
    };

    // First check happens after 60s, NOT immediately on mount, to avoid false positives on page load
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [autoRemindersEnabled]);
  
  const getReminderMessage = (patientName: string, treatmentType: string, time: string, type: '24h' | '15m' | 'manual' = 'manual') => {
    const name = (patientName || 'Paciente').split(' ')[0];
    const safeTreatmentType = treatmentType || 'Servicio';
    
    if (type === '15m') {
      return `Hola ${name}, te recordamos que en 15 minutos es tu cita de ${safeTreatmentType} a las ${time}. ¡Te esperamos!`;
    }
    
    if (safeTreatmentType.toLowerCase().includes('onicocriptosis')) {
      return `Hola ${name}, te recordamos tu cita para el tratamiento de Onicocriptosis mañana a las ${time}. Recuerda venir con el pie limpio y usar calzado amplio u holgado. ¡Nos vemos!`;
    }
    return `Hola ${name}, te recordamos tu cita de ${safeTreatmentType} para mañana a las ${time}. ¡Te esperamos!`;
  };

  const handleManualReminder = async (appt: Appointment) => {
    const patient = patients.find(p => p.id === appt.patientId);
    if (!patient || !patient.phone) {
      alert("El paciente no tiene un número de teléfono registrado.");
      return;
    }
    try {
      const message = getReminderMessage(patient.name, appt.treatmentType, appt.time);
      await sendSMS(patient.phone, message);
      updateAppointment(appt.id, { ...appt, reminderSent: true });
    } catch (error) {
      console.error('Error al enviar recordatorio manualmente', error);
    }
  };

  const handleStatusChange = (id: string, status: AppointmentStatus, currentCost: number, paid: boolean, appt: Appointment) => {
    updateAppointmentStatus(id, status, paid, appt.paymentMethod);
  };

  const handleTogglePaid = (appt: Appointment) => {
    updateAppointment(appt.id, { ...appt, paid: !appt.paid });
  };

  const filteredAppointments = appointments.filter(appt => {
    if (state.activeSpecialistId !== 'admin' && appt.specialistId && appt.specialistId !== state.activeSpecialistId && appt.specialistId !== 'admin') return false;
    const patient = patients.find(p => p.id === appt.patientId);
    
    if (filterStatus !== 'all' && appt.status !== filterStatus) return false;
    if (filterPatient && !(patient?.name || '').toLowerCase().includes(filterPatient.toLowerCase())) return false;
    if (filterTreatment && !(appt.treatmentType || '').toLowerCase().includes(filterTreatment.toLowerCase())) return false;
    if (filterPayment !== 'all') {
      const isPaid = filterPayment === 'paid';
      if (appt.paid !== isPaid) return false;
    }
    
    return true;
  });

  const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dailyAppointments = filteredAppointments
    .filter(a => a.date === currentDateStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // Calendar generation helpers
  const handlePrev = () => {
    if (viewMode === 'day') setSelectedDate(addDays(selectedDate, -1));
    if (viewMode === 'week') setSelectedDate(subWeeks(selectedDate, 1));
    if (viewMode === 'month') setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'day') setSelectedDate(addDays(selectedDate, 1));
    if (viewMode === 'week') setSelectedDate(addWeeks(selectedDate, 1));
    if (viewMode === 'month') setSelectedDate(addMonths(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const getMonthDays = () => {
    const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const renderMonthView = () => {
    const days = getMonthDays();
    return (
      <div className="bg-white border border-slate-200 rounded-xl flex flex-col min-h-[500px] md:min-h-[600px] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="p-2 md:p-3 text-center text-xs md:text-sm font-semibold text-slate-600">
              <span className="hidden sm:inline">{d}</span>
              <span className="inline sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr flex-1">
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayAppts = filteredAppointments.filter(a => a.date === dateStr);
            const isSelectedMonth = isSameMonth(day, selectedDate);
            return (
              <div 
                key={idx} 
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode('day');
                }}
                className={cn(
                  "border-b border-r border-slate-100 p-1 md:p-2 relative cursor-pointer hover:bg-slate-50 transition-colors flex flex-col gap-1 min-h-[60px] md:min-h-[90px]",
                  !isSelectedMonth && "text-slate-400 bg-slate-50/50",
                  isToday(day) && "bg-emerald-50/30"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className={cn(
                    "w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full text-xs md:text-sm font-medium",
                    isToday(day) ? "bg-emerald-600 text-white" : isSameDay(day, selectedDate) ? "bg-slate-800 text-white" : ""
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayAppts.length > 0 && (
                    <span className="hidden md:inline text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 rounded">{dayAppts.length} citas</span>
                  )}
                </div>
                <div className="overflow-x-hidden space-y-1 mt-1 no-scrollbar flex flex-col md:block items-center">
                  {/* Desktop chips (hidden on mobile) */}
                  <div className="hidden md:block space-y-1 w-full">
                    {dayAppts.slice(0, 3).map(a => {
                      const p = patients.find(p => p.id === a.patientId);
                      return (
                        <div key={a.id} className={cn(
                          "text-[10px] px-1.5 py-1 rounded truncate flex items-center gap-1",
                          a.status === 'completed' ? "bg-emerald-100 text-emerald-800" :
                          a.status === 'cancelled' ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                        )}>
                          <span className="font-semibold">{a.time}</span> {(p?.name || 'Privado').split(' ')[0]}
                        </div>
                      );
                    })}
                    {dayAppts.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-medium px-1">+{dayAppts.length - 3} más</div>
                    )}
                  </div>

                  {/* Mobile Dots (shown on small screens instead of chips) */}
                  <div className="flex md:hidden flex-wrap justify-center gap-1 mt-0.5">
                    {dayAppts.slice(0, 3).map(a => (
                      <div 
                        key={a.id} 
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          a.status === 'completed' ? "bg-emerald-500" :
                          a.status === 'cancelled' ? "bg-red-500" : "bg-blue-500"
                        )}
                        title={`${a.time} - ${a.treatmentType}`}
                      />
                    ))}
                    {dayAppts.length > 3 && (
                      <div className="text-[8px] leading-tight text-slate-400 font-bold">+</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getWeekDays();
    return (
      <div className="bg-white border border-slate-200 rounded-xl flex flex-col min-h-[500px] md:min-h-[600px] overflow-hidden">
        <div className="overflow-x-auto no-scrollbar flex-1 flex flex-col">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 min-w-[650px] md:min-w-full">
            {days.map((d, idx) => {
               const dayLabel = format(d, 'EEEE', { locale: es });
               const capitalizedLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1, 4);
               return (
                 <div 
                  key={idx} 
                  onClick={() => { setSelectedDate(d); setViewMode('day'); }}
                  className="p-1 md:p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors border-r last:border-0 border-slate-200"
                 >
                    <div className="text-[10px] md:text-sm font-semibold text-slate-600">
                      <span className="hidden sm:inline">{capitalizedLabel}</span>
                      <span className="inline sm:hidden">{capitalizedLabel.charAt(0)}</span>
                    </div>
                    <div className={cn(
                      "text-xs md:text-xl mt-1 font-bold inline-flex w-6 h-6 md:w-8 md:h-8 items-center justify-center rounded-full",
                      isToday(d) ? "bg-emerald-600 text-white" : isSameDay(d, selectedDate) ? "bg-slate-800 text-white" : "text-slate-800"
                    )}>
                      {format(d, 'd')}
                    </div>
                 </div>
               );
            })}
          </div>
          <div className="flex-1 relative">
            <div className="grid grid-cols-7 h-full min-h-[400px] md:min-h-[500px] divide-x divide-slate-100 min-w-[650px] md:min-w-full">
              {days.map((d, idx) => {
                const dateStr = format(d, 'yyyy-MM-dd');
                const dayAppts = filteredAppointments.filter(a => a.date === dateStr).sort((a,b) => (a.time || '').localeCompare(b.time || ''));
                return (
                  <div key={idx} className="p-1 md:p-2 space-y-1 md:space-y-2 relative min-w-0">
                    {dayAppts.map(appt => {
                       const patient = patients.find(p => p.id === appt.patientId);
                       return (
                         <div key={appt.id} 
                           onClick={() => {
                             setSelectedDate(d);
                             setViewMode('day');
                           }}
                           className={cn(
                           "p-1 md:p-2 rounded-lg text-[9px] md:text-xs border cursor-pointer hover:shadow-md transition-shadow min-w-0 break-words",
                           appt.status === 'completed' ? "bg-emerald-50 border-emerald-200" :
                           appt.status === 'cancelled' ? "bg-red-50 border-red-200" : "bg-white border-blue-200 shadow-sm"
                         )}>
                           <div className="font-bold flex items-center justify-between mb-1">
                             <span>{formatTime(appt.time)}</span>
                             {appt.paid && <DollarSign className="w-3 h-3 text-emerald-600" />}
                           </div>
                           <div className="font-semibold truncate text-[10px] md:text-xs">{(patient?.name || 'Privado').split(' ')[0]}</div>
                           <div className="hidden md:block text-[10px] text-slate-500 truncate">{appt.treatmentType}</div>
                         </div>
                       )
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
      {dailyAppointments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-4">
           <CalendarIcon className="w-16 h-16 text-slate-300" />
           <p>No hay citas programadas para esta fecha.</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {dailyAppointments.map(appt => {
            const patient = patients.find(p => p.id === appt.patientId);
            return (
              <div key={appt.id} className={cn(
                "border p-5 rounded-xl flex flex-col md:flex-row gap-6 shadow-sm",
                 appt.status === 'completed' ? "border-emerald-200 bg-emerald-50/30" :
                 appt.status === 'cancelled' ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white"
              )}>
                <div className="flex flex-row md:flex-col items-center justify-between md:justify-center w-full md:w-28 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-6 relative">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <span className="text-xl md:text-2xl font-bold text-slate-800">{formatTime(appt.time)}</span>
                  </div>
                  {appt.reminderSent && appt.status === 'pending' && (
                    <div className="flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 text-[10px] font-semibold animate-pulse">
                      <Bell className="w-3.5 h-3.5" /> Recordatorio enviado
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                     <User className="w-5 h-5 text-emerald-600" />
                     <h4 className="text-lg font-semibold text-slate-800">{patient?.name || 'Paciente Privado'}</h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                     <span className="text-slate-500 font-medium text-sm md:text-base">{appt.treatmentType}</span>
                     {appt.specialistId && (
                       <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                         {state.specialists.find(s => s.id === appt.specialistId)?.name || 'Especialista'}
                       </span>
                     )}
                  </div>
                  {appt.notes && <p className="text-sm text-slate-400 italic">Notas: {appt.notes}</p>}
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <p className="text-sm font-medium text-emerald-700 bg-emerald-100 w-fit px-2 py-0.5 rounded">
                      Costo: {formatCurrency(appt.cost)}
                    </p>
                    <button 
                      onClick={() => {
                        if (state.activeSpecialistId === 'admin' || !appt.specialistId || appt.specialistId === state.activeSpecialistId) {
                          handleTogglePaid(appt);
                        }
                      }}
                      className={cn(
                        "text-xs font-bold px-2 py-1 rounded w-fit flex items-center gap-1 transition-colors border",
                        appt.paid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200",
                        (state.activeSpecialistId === 'admin' || !appt.specialistId || appt.specialistId === state.activeSpecialistId) && "hover:bg-orange-100 cursor-pointer"
                      )}
                    >
                      {appt.paid ? <><CheckCircle className="w-3 h-3"/> Pagado</> : <><Clock className="w-3 h-3"/> Pago Pendiente</>}
                    </button>
                    {appt.paid && (
                      <select 
                        value={appt.paymentMethod || 'cash'}
                        onChange={(e) => updateAppointment(appt.id, { paymentMethod: e.target.value as 'cash' | 'transfer' })}
                        className="text-xs font-medium bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                      </select>
                    )}
                    {appt.reminderSent && !appt.paid && (
                       <span className="text-xs font-bold px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                         <MessageCircle className="w-3 h-3" /> WhatsApp Auto
                       </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 justify-center min-w-[200px]">
                   {state.activeSpecialistId !== 'admin' && appt.specialistId && appt.specialistId !== state.activeSpecialistId ? (
                     <div className="bg-slate-100 text-slate-500 font-medium px-4 py-3 rounded-xl text-center text-sm border border-slate-200 flex flex-col gap-1 items-center justify-center h-full">
                       <Clock className="w-5 h-5 opacity-50 mb-1" />
                       Solo lectura
                     </div>
                   ) : (
                     <>
                       {appt.status === 'pending' && (
                         <>
                           <button 
                              onClick={() => handleStatusChange(appt.id, 'completed', appt.cost, appt.paid, appt)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" /> Finalizar
                           </button>
                           {!appt.reminderSent ? (
                             <div className="flex gap-2">
                               <button 
                                  onClick={() => handleManualReminder(appt)}
                                  className="flex-1 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 px-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all text-center"
                                >
                                  <MessageCircle className="w-4 h-4 shrink-0" /> WhatsApp
                               </button>
                               <button 
                                  onClick={() => updateAppointment(appt.id, { reminderSent: true })}
                                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all text-center"
                                >
                                  Marcar Enviado
                               </button>
                             </div>
                           ) : (
                             <button 
                                onClick={() => updateAppointment(appt.id, { reminderSent: false })}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                              >
                                <XCircle className="w-4 h-4 shrink-0" /> Deshacer Recordatorio
                             </button>
                           )}
                           <div className="flex gap-2">
                             <button 
                                onClick={() => setSelectedAppointment(appt)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" /> Editar
                             </button>
                             <button 
                                onClick={() => setAppointmentToCancel(appt)}
                                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <XCircle className="w-3 h-3" /> Cancelar
                             </button>
                           </div>
                         </>
                       )}
                       {appt.status === 'completed' && (
                         <div className="flex flex-col gap-2">
                           <div className="text-emerald-700 text-sm font-medium flex items-center justify-center gap-1.5 bg-emerald-100 px-3 py-2 rounded-xl text-center">
                             <CheckCircle className="w-4 h-4 shrink-0" /> <span className="leading-tight">Tratamiento Finalizado</span>
                           </div>
                           <button
                             onClick={() => handleStatusChange(appt.id, 'pending', appt.cost, appt.paid, appt)}
                             className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                           >
                             <Clock className="w-3.5 h-3.5" /> Revertir
                           </button>
                           <button
                             onClick={() => setAppointmentToDelete(appt)}
                             className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                           >
                             <Trash2 className="w-3.5 h-3.5" /> Eliminar Registro
                           </button>
                         </div>
                       )}
                       {appt.status === 'cancelled' && (
                          <div className="flex flex-col gap-2">
                            <div className="text-red-700 font-medium flex items-center justify-center gap-2 bg-red-100 px-4 py-2 rounded-xl">
                              <XCircle className="w-5 h-5" /> Cita Cancelada
                            </div>
                            <button
                              onClick={() => setAppointmentToDelete(appt)}
                              className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar Registro
                            </button>
                          </div>
                        )}
                     </>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 min-h-full">
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm select-none gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 capitalize">
            {viewMode === 'day' && format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
            {viewMode === 'week' && `Semana del ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM")} al ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM")}`}
            {viewMode === 'month' && format(selectedDate, "MMMM yyyy", { locale: es })}
          </h2>
          <p className="text-slate-500 mt-1">Controla tus citas diarias y estado de tratamientos.</p>
        </div>
        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center w-full xl:w-auto mt-4 md:mt-0">
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button onClick={handlePrev} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex-1 sm:flex-none flex justify-center"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
              <button onClick={handleToday} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex-1 sm:flex-none">Hoy</button>
              <button onClick={handleNext} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex-1 sm:flex-none flex justify-center"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-auto justify-between sm:justify-start">
              <button onClick={() => setViewMode('day')} className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-colors flex-1 sm:flex-none text-center", viewMode === 'day' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Día</button>
              <button onClick={() => setViewMode('week')} className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-colors flex-1 sm:flex-none text-center", viewMode === 'week' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Semana</button>
              <button onClick={() => setViewMode('month')} className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-colors flex-1 sm:flex-none text-center", viewMode === 'month' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Mes</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 xl:ml-2 xl:border-l border-slate-200 xl:pl-6 w-full xl:w-auto pt-4 xl:pt-0 border-t xl:border-t-0">
            <button 
              onClick={() => {
                setIsAdding(true);
                setIsAddingNewPatient(false);
              }}
              className="bg-white border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-semibold flex flex-1 items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap"
            >
              <CalendarIcon className="w-5 h-5 shrink-0" /> Nueva Cita
            </button>
            <button 
              onClick={() => {
                setIsAdding(true);
                setIsAddingNewPatient(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex flex-1 items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap"
            >
              <User className="w-5 h-5 shrink-0" /> Nuevo Paciente
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            Filtros Avanzados
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paciente</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute ml-3 mt-2.5" />
              <input 
                type="text" 
                placeholder="Nombre del paciente..." 
                value={filterPatient}
                onChange={e => setFilterPatient(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tratamiento</label>
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute ml-3 mt-2.5" />
              <input 
                type="text" 
                placeholder="Tipo de tratamiento..." 
                value={filterTreatment}
                onChange={e => setFilterTreatment(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado de Cita</label>
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700"
            >
              <option value="all">Todas las citas</option>
              <option value="pending">Pendientes</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado de Pago</label>
            <select 
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700"
            >
              <option value="all">Todos los pagos</option>
              <option value="paid">Pagados</option>
              <option value="unpaid">Pendientes de pago</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-2">
          <MessageCircle className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Envío Automático de WhatsApp (Bot)</span>
          <button
            onClick={() => setAutoRemindersEnabled(!autoRemindersEnabled)}
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors ml-2 outline-none",
              autoRemindersEnabled ? "bg-emerald-500" : "bg-slate-300"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm",
                autoRemindersEnabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
          <span className="text-xs text-slate-500 ml-1">
            {autoRemindersEnabled ? "Activado (24h antes)" : "Desactivado"}
          </span>
        </div>
      </div>

      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Panel of pending appointments (all uncompleted or completed but unpaid) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mt-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-500" />
          Resumen de Citas Pendientes y No Pagadas
        </h3>
        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
          {filteredAppointments.filter(a => a.status === 'pending' || (a.status === 'completed' && !a.paid)).sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()).map(appt => {
            const patient = patients.find(p => p.id === appt.patientId);
            return (
              <div key={appt.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors gap-4">
                <div className="flex flex-col">
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    {patient?.name || 'Desconocido'} 
                    {appt.status === 'pending' ? (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Pendiente</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Falta Pago</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-1 flex gap-3 text-[11px] sm:text-sm">
                    <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {
                      (function() {
                        try {
                          return format(new Date(`${appt.date}T${formatTime(appt.time)}`), "dd MMM yyyy", { locale: es });
                        } catch (e) {
                          return appt.date || 'Sin fecha';
                        }
                      })()
                    }</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatTime(appt.time)}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{appt.treatmentType}</div>
                </div>
                
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="font-bold text-slate-700">{formatCurrency(appt.cost)}</div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        setSelectedDate(new Date(`${appt.date}T00:00:00`));
                        setViewMode('day');
                      }}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg w-full sm:w-auto transition-colors"
                    >
                      Ir al Día
                    </button>
                    {!appt.paid && appt.status === 'completed' && (
                      <button 
                         onClick={() => updateAppointment(appt.id, { paid: true, paymentMethod: 'cash' })}
                         className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold px-3 py-1.5 rounded-lg w-full sm:w-auto transition-colors whitespace-nowrap"
                      >
                         Marcar Pagado
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredAppointments.filter(a => a.status === 'pending' || (a.status === 'completed' && !a.paid)).length === 0 && (
             <div className="text-center text-slate-400 py-6 text-sm font-medium">
               Excelente, no hay citas pendientes ni deudas sin pagar.
             </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(isAdding || selectedAppointment) && (
          <AppointmentModal 
            appointment={selectedAppointment}
            patients={patients}
            treatments={treatments}
            appointments={appointments}
            specialists={specialists}
            onSave={addAppointment}
            onUpdate={updateAppointment}
            onDelete={deleteAppointment}
            onClose={() => {
              setIsAdding(false);
              setIsAddingNewPatient(false);
              setSelectedAppointment(null);
            }}
            initialDate={format(selectedDate, 'yyyy-MM-dd')}
            defaultIsNewPatient={isAddingNewPatient}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!appointmentToCancel}
        title="Cancelar Cita"
        message="¿Estás seguro que deseas cancelar esta cita? Esta acción no eliminará el registro, pero marcará la cita como cancelada."
        confirmText="Sí, Cancelar Cita"
        onConfirm={() => {
          if (appointmentToCancel) {
            handleStatusChange(appointmentToCancel.id, 'cancelled', appointmentToCancel.cost, appointmentToCancel.paid, appointmentToCancel);
          }
          setAppointmentToCancel(null);
        }}
        onCancel={() => setAppointmentToCancel(null)}
      />

      <ConfirmDialog
        isOpen={!!appointmentToDelete}
        title="Eliminar Registro de Cita"
        message="¿Estás seguro que deseas eliminar de forma permanente el registro de esta cita? Esta acción no se puede deshacer."
        confirmText="Eliminar Definitivamente"
        onConfirm={() => {
          if (appointmentToDelete) {
            deleteAppointment(appointmentToDelete.id);
          }
          setAppointmentToDelete(null);
        }}
        onCancel={() => setAppointmentToDelete(null)}
      />
    </div>
  );
}
