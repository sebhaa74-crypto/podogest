import React, { useState } from 'react';
import { MessageSquare, Settings2, Clock, CheckCircle2, Bot, Phone, Play, Pause, Send, User, CalendarPlus, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppState } from '../store';
import { askMedicalAssistant } from '../gemini';

export function ChatbotView({ state }: { state: ReturnType<typeof useAppState> }) {
  const { patients, addAppointment } = state;
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'assistant' | 'booking'>('config');

  // Assistant State
  const [query, setQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', text: string}[]>([]);

  const [botConfig, setBotConfig] = useState({
    enabled: true,
    reminders: true,
    reminderTime: '24', // hours before
    followUp: true,
    followUpDays: '2', // days after
    greeting: true,
  });

  const [logs] = useState([
    {
      id: 1,
      patientId: '1',
      type: 'Recordatorio',
      message: 'Hola Juan, te recordamos tu cita mañana a las 10:00. ¿Confirmas tu asistencia?',
      status: 'Enviado',
      time: '10:30 AM'
    },
    {
      id: 2,
      patientId: '2',
      type: 'Seguimiento',
      message: 'Hola María, ¿cómo ha seguido tu pie después del tratamiento de hace 2 días?',
      status: 'Recibido (Confirmado)',
      time: '11:15 AM'
    },
    {
      id: 3,
      patientId: '1',
      type: 'Bienvenida',
      message: '¡Hola! Bienvenido a Clínica Podológica. Estamos agendando tu primera cita.',
      status: 'Enviado',
      time: '01:00 PM'
    }
  ]);

  // Simulated AI Booking Requests
  const [pendingBookings, setPendingBookings] = useState([
    {
      id: 'req-1',
      patientName: 'Carlos Pérez',
      patientPhone: '+56 9 8765 4321',
      date: '2026-05-26',
      time: '15:30',
      treatmentType: 'Consulta General',
      notes: 'Solicitado vía WhatsApp Bot AI'
    },
    {
      id: 'req-2',
      patientName: 'Ana Silva',
      patientPhone: '+56 9 1122 3344',
      date: '2026-05-27',
      time: '10:00',
      treatmentType: 'Tratamiento',
      notes: 'Dolor uña encarnada. Solicitado vía WhatsApp Bot AI'
    }
  ]);

  const handleAcceptBooking = async (req: typeof pendingBookings[0]) => {
    // Attempt to find existing patient by name or phone
    let patient = patients.find(p => p.name.toLowerCase() === req.patientName.toLowerCase() || p.phone === req.patientPhone);
    
    await addAppointment({
      patientId: patient ? patient.id : undefined,
      date: req.date,
      time: req.time,
      treatmentType: req.treatmentType as any,
      notes: req.notes,
      cost: 0 // Default cost
    }, patient ? undefined : {
      name: req.patientName,
      phone: req.patientPhone,
      email: '',
      notes: 'Paciente creado automáticamente por IA'
    });

    setPendingBookings(prev => prev.filter(p => p.id !== req.id));
    alert('Cita agendada automáticamente en el sistema.');
  };

  const handleRejectBooking = (id: string) => {
    setPendingBookings(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 min-h-full pb-24">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <Bot className="w-8 h-8 text-emerald-600" />
            Chatbot Automático
          </h2>
          <p className="text-slate-500 mt-1">
            Configura y supervisa los mensajes automáticos y reservas gestionadas por Inteligencia Artificial.
          </p>
        </div>
        <button 
          onClick={() => setBotConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
          className={cn(
            "px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all",
            botConfig.enabled 
              ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" 
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          )}
        >
          {botConfig.enabled ? (
            <><Pause className="w-5 h-5" /> Pausar Bot</>
          ) : (
            <><Play className="w-5 h-5" /> Activar Bot</>
          )}
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            "px-4 py-2.5 font-medium text-sm rounded-xl transition-colors flex items-center gap-2 shrink-0 border",
            activeTab === 'config' 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold" 
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-slate-100"
          )}
        >
          <Settings2 className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Reglas</span>
        </button>
        <button
          onClick={() => setActiveTab('booking')}
          className={cn(
            "px-4 py-2.5 font-medium text-sm rounded-xl transition-colors flex items-center gap-2 shrink-0 border",
            activeTab === 'booking' 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold" 
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-slate-100"
          )}
        >
          <CalendarPlus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Reservas IA</span>
          {pendingBookings.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {pendingBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            "px-4 py-2.5 font-medium text-sm rounded-xl transition-colors flex items-center gap-2 shrink-0 border",
            activeTab === 'logs' 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold" 
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-slate-100"
          )}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Mensajes</span>
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={cn(
            "px-4 py-2.5 font-medium text-sm rounded-xl transition-colors flex items-center gap-2 shrink-0 border",
            activeTab === 'assistant' 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold" 
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-slate-100"
          )}
        >
          <Bot className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Asistente Médico</span>
        </button>
      </div>

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Reglas de Automatización</h3>
            
            <div className={cn("p-4 rounded-xl border transition-all", botConfig.reminders ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Clock className={cn("w-5 h-5", botConfig.reminders ? "text-emerald-600" : "text-slate-400")} />
                  <h4 className="font-semibold text-slate-800">Recordatorios de Citas</h4>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={botConfig.reminders} onChange={() => setBotConfig(c => ({...c, reminders: !c.reminders}))} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <p className="text-sm text-slate-600 mb-3">Envía un mensaje para confirmar la asistencia del paciente antes de su cita.</p>
              {botConfig.reminders && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">Enviar</span>
                  <select 
                    value={botConfig.reminderTime} 
                    onChange={e => setBotConfig(c => ({...c, reminderTime: e.target.value}))}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="12">12 horas</option>
                    <option value="24">24 horas</option>
                    <option value="48">48 horas</option>
                  </select>
                  <span className="text-sm">antes de la cita</span>
                </div>
              )}
            </div>

            <div className={cn("p-4 rounded-xl border transition-all", botConfig.followUp ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={cn("w-5 h-5", botConfig.followUp ? "text-blue-600" : "text-slate-400")} />
                  <h4 className="font-semibold text-slate-800">Seguimiento Post-Tratamiento</h4>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={botConfig.followUp} onChange={() => setBotConfig(c => ({...c, followUp: !c.followUp}))} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
              <p className="text-sm text-slate-600 mb-3">Pregunta cómo se siente el paciente días después de una consulta completada.</p>
              {botConfig.followUp && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">Enviar</span>
                  <select 
                    value={botConfig.followUpDays} 
                    onChange={e => setBotConfig(c => ({...c, followUpDays: e.target.value}))}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="1">1 día</option>
                    <option value="2">2 días</option>
                    <option value="7">1 semana</option>
                  </select>
                  <span className="text-sm">después del tratamiento</span>
                </div>
              )}
            </div>
            
            <div className={cn("p-4 rounded-xl border transition-all", botConfig.greeting ? "bg-amber-50/50 border-amber-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Phone className={cn("w-5 h-5", botConfig.greeting ? "text-amber-600" : "text-slate-400")} />
                  <h4 className="font-semibold text-slate-800">Mensaje de Bienvenida</h4>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={botConfig.greeting} onChange={() => setBotConfig(c => ({...c, greeting: !c.greeting}))} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
              <p className="text-sm text-slate-600">Saluda al paciente inmediatamente cuando se registra por primera vez en el sistema.</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center items-center text-center space-y-4">
            <Bot className="w-16 h-16 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-700">Estado del Chatbot</h3>
            {botConfig.enabled ? (
              <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-medium inline-flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Bot Activo - Listo para funcionar
              </div>
            ) : (
              <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-medium inline-flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                Bot Pausado - No se enviarán mensajes
              </div>
            )}
            <p className="text-slate-500 text-sm max-w-sm mt-4">
              El asistente inteligente utilizará la API configurada de tu WhatsApp para mandar estos avisos y tomar reservas de forma automática.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'booking' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-emerald-900 font-bold">Gestión Autónoma de Reservas</h3>
              <p className="text-emerald-700 text-sm mt-1">
                El agente de IA atiende los mensajes de WhatsApp, revisa tu disponibilidad en la agenda y filtra a los pacientes. Solo te pregunta "Sí o No" antes de guardar la hora de forma automática en el sistema.
              </p>
            </div>
          </div>

          {pendingBookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
              <CalendarPlus className="w-12 h-12 text-slate-200 mb-3" />
              <h4 className="text-slate-700 font-bold">Sin reservas pendientes</h4>
              <p className="text-slate-500 text-sm mt-1">El asistente de IA no tiene nuevas solicitudes en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingBookings.map(req => (
                <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200">
                        NUEVA SOLICITUD IA
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Hace 2 min</span>
                  </div>

                  <div>
                    <p className="text-slate-600 text-sm">
                      <span className="font-bold text-slate-800">{req.patientName}</span> ({req.patientPhone}) quiere agendar una hora para <span className="font-semibold text-slate-800">{req.treatmentType}</span>.
                    </p>
                    <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {req.date} a las {req.time} hrs
                      </div>
                      <p className="text-xs text-slate-500 italic mt-2">Nota IA: "{req.notes}"</p>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      onClick={() => handleRejectBooking(req.id)}
                      className="flex-1 py-2.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Rechazar
                    </button>
                    <button 
                      onClick={() => handleAcceptBooking(req)}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      Aceptar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="flex flex-col gap-4">
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
                    <th className="p-4 font-medium">Hora</th>
                    <th className="p-4 font-medium">Paciente</th>
                    <th className="p-4 font-medium">Tipo</th>
                    <th className="p-4 font-medium">Mensaje</th>
                    <th className="p-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.map(log => {
                    const patient = patients.find(p => p.id === log.patientId);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-4 whitespace-nowrap text-slate-500">{log.time}</td>
                        <td className="p-4 font-medium text-slate-800">{patient?.name || 'Desconocido'}</td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border",
                            log.type === 'Recordatorio' && "bg-purple-50 text-purple-700 border-purple-200",
                            log.type === 'Seguimiento' && "bg-blue-50 text-blue-700 border-blue-200",
                            log.type === 'Bienvenida' && "bg-amber-50 text-amber-700 border-amber-200",
                          )}>
                            {log.type}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 max-w-xs truncate" title={log.message}>
                          {log.message}
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "flex items-center gap-1.5",
                            log.status.includes('Confirmado') ? "text-emerald-600" : "text-slate-500"
                          )}>
                            {log.status.includes('Confirmado') ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {logs.map(log => {
              const patient = patients.find(p => p.id === log.patientId);
              return (
                <div key={log.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">{log.time}</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
                      log.type === 'Recordatorio' && "bg-purple-50 text-purple-700 border-purple-200",
                      log.type === 'Seguimiento' && "bg-blue-50 text-blue-700 border-blue-200",
                      log.type === 'Bienvenida' && "bg-amber-50 text-amber-700 border-amber-200",
                    )}>
                      {log.type}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-800">Paciente: {patient?.name || 'Desconocido'}</h4>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    {log.message}
                  </p>
                  <div className="flex items-center gap-1 text-xs">
                    <span className={cn(
                      "flex items-center gap-1",
                      log.status.includes('Confirmado') ? "text-emerald-600 font-medium" : "text-slate-500"
                    )}>
                      {log.status.includes('Confirmado') ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {log.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'assistant' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-600 animate-pulse" />
              Consulta Clínica con IA
            </h3>
            <select 
              className="w-full sm:w-auto sm:ml-auto border border-slate-200 rounded-xl px-3 py-1.5 text-sm bg-white"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              <option value="">-- Consulta general (Sin paciente) --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Bot className="w-12 h-12 text-slate-200" />
                <p>Escribe tu consulta médica o solicita ayuda con un diagnóstico.</p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl whitespace-pre-wrap text-sm",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-slate-100 text-slate-800 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 text-slate-800 rounded-tl-none flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100">
            <form 
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!query.trim() || isLoading) return;
                
                const userMsg = query.trim();
                setQuery('');
                setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
                setIsLoading(true);
                
                try {
                  const patient = patients.find(p => p.id === selectedPatientId);
                  const response = await askMedicalAssistant(userMsg, patient?.name || '');
                  setChatHistory(prev => [...prev, { role: 'assistant', text: response }]);
                } catch (error: any) {
                  setChatHistory(prev => [...prev, { role: 'assistant', text: `Error: ${error.message}` }]);
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              <input 
                type="text"
                placeholder="Pregunta sobre tratamientos, diagnóstico o posología..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button 
                type="submit"
                disabled={isLoading || !query.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
