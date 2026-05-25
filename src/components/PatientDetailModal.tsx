import React, { useState } from 'react';
import { X, Calendar, User, Phone, Mail, FileText, ShoppingBag, Clock, Edit2, Save, MessageCircle, DollarSign, Trash2 } from 'lucide-react';
import { Patient, Appointment, Sale } from '../types';
import { formatCurrency, cn, formatTime } from '../lib/utils';
import { motion } from 'motion/react';
import { sendSMS } from '../services/smsService';
import { ConfirmDialog } from './ConfirmDialog';

interface PatientDetailModalProps {
  patient: Patient;
  appointments: Appointment[];
  sales: Sale[];
  onUpdate: (id: string, updates: Partial<Patient>) => void;
  onDelete?: (id: string) => void;
  onUpdateAppointment?: (id: string, updates: Partial<Appointment>) => void;
  onEditingChange?: (isEditing: boolean) => void;
  onClose: () => void;
}

export function PatientDetailModal({ patient, appointments, sales, onUpdate, onDelete, onUpdateAppointment, onEditingChange, onClose }: PatientDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  React.useEffect(() => {
    onEditingChange?.(true); // Siempre editable
    return () => onEditingChange?.(false);
  }, [onEditingChange]);
  
  const [editData, setEditData] = useState({
    name: patient.name,
    phone: patient.phone,
    email: patient.email || '',
    notes: patient.notes || ''
  });
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  const handleBlur = () => {
    onUpdate(patient.id, editData);
  };

  const patientAppointments = appointments
    .filter(a => a.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const patientSales = sales
    .filter(s => s.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date));

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
        className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-2xl">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <input 
                value={editData.name}
                onChange={e => setEditData({ ...editData, name: e.target.value })}
                onBlur={handleBlur}
                placeholder="Nombre del Paciente"
                className="text-2xl font-bold text-slate-800 bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 focus:bg-slate-50 focus:border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500 transition-all w-full md:w-80"
              />
              <p className="text-slate-500 text-sm ml-2">Desde el {new Date(patient.registeredAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-full transition-colors group"
                title="Eliminar paciente"
              >
                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Sidebar Info */}
          <div className="space-y-6">
            <section className="bg-slate-50 p-5 rounded-2xl space-y-4">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Información de Contacto</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-600 group">
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <input 
                    value={editData.phone}
                    onChange={e => setEditData({ ...editData, phone: e.target.value })}
                    onBlur={handleBlur}
                    placeholder="Teléfono"
                    className="text-sm font-medium bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-200 rounded px-2 py-1 flex-1 outline-none focus:ring-1 focus:ring-emerald-500 transition-colors hover:bg-white focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-3 text-slate-600 group">
                  <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                  <input 
                    value={editData.email}
                    onChange={e => setEditData({ ...editData, email: e.target.value })}
                    onBlur={handleBlur}
                    placeholder="Correo electrónico"
                    className="text-sm font-medium bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-200 rounded px-2 py-1 flex-1 outline-none focus:ring-1 focus:ring-emerald-500 transition-colors hover:bg-white focus:bg-white w-full"
                  />
                </div>
              </div>
              
              {patient.phone && (
                <button
                  disabled={isSendingWhatsApp || whatsappSent}
                  onClick={async () => {
                    const phone = patient.phone.replace(/[^0-9]/g, '');
                    const message = `Hola ${patient.name.split(' ')[0]}, te contactamos de PodoGest. ¿En qué podemos ayudarte?`;
                    
                    setIsSendingWhatsApp(true);
                    try {
                      await sendSMS(phone, message);
                      setWhatsappSent(true);
                      setTimeout(() => setWhatsappSent(false), 3000);
                    } catch (error) {
                      console.error("Error al enviar el mensaje:", error);
                      alert("Error al enviar el mensaje de WhatsApp");
                    } finally {
                      setIsSendingWhatsApp(false);
                    }
                  }}
                  className={cn(
                    "w-full mt-4 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all",
                    whatsappSent 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                      : "bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border-[#25D366]/20 disabled:opacity-50"
                  )}
                >
                  <MessageCircle className="w-4 h-4" /> 
                  {isSendingWhatsApp ? 'Enviando...' : whatsappSent ? '¡Mensaje Enviado!' : 'Contactar vía WhatsApp'}
                </button>
              )}
            </section>

            <section className="bg-slate-50 p-5 rounded-2xl space-y-4">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Notas Médicas</h4>
              <div className="flex gap-3 text-slate-600 text-sm">
                <FileText className="w-4 h-4 text-emerald-500 shrink-0 mt-2" />
                <textarea 
                  value={editData.notes}
                  onChange={e => setEditData({ ...editData, notes: e.target.value })}
                  onBlur={handleBlur}
                  className="w-full h-32 text-sm bg-white/50 hover:bg-white focus:bg-white border text-slate-700 border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none transition-all placeholder:text-slate-400"
                  placeholder="Escribe las notas médicas y antecedentes aquí..."
                />
              </div>
            </section>
          </div>

          {/* Main Content: History */}
          <div className="lg:col-span-2 space-y-8">
            {/* Appointments */}
            <section>
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" /> Historial de Citas
              </h4>
              <div className="space-y-3">
                {patientAppointments.length === 0 ? (
                  <p className="text-slate-400 text-sm italic py-4">No hay citas registradas.</p>
                ) : (
                  patientAppointments.map(appt => (
                    <div key={appt.id} className={cn(
                      "p-4 rounded-2xl border flex justify-between items-center",
                      appt.status === 'completed' ? "bg-emerald-50/30 border-emerald-100" : "bg-white border-slate-100"
                    )}>
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {formatTime(appt.time)} - {new Date(appt.date).toLocaleDateString()}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{appt.treatmentType}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        {onUpdateAppointment ? (
                          <>
                            <select 
                              value={appt.status}
                              onChange={(e) => onUpdateAppointment(appt.id, { status: e.target.value as any })}
                              className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-slate-100 border-none outline-none focus:ring-2 focus:ring-emerald-500 w-[100px] text-right cursor-pointer"
                            >
                              <option value="pending">Pendiente</option>
                              <option value="completed">Completada</option>
                              <option value="cancelled">Cancelada</option>
                            </select>
                            <label className="flex flex-col items-end gap-1 mt-1 cursor-pointer hover:opacity-80 transition-opacity">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold uppercase text-slate-600">Pagado:</span>
                                <input 
                                  type="checkbox" 
                                  checked={appt.paid} 
                                  onChange={(e) => onUpdateAppointment(appt.id, { paid: e.target.checked })}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer align-middle"
                                />
                              </div>
                            </label>
                            {appt.paid && (
                              <select 
                                value={appt.paymentMethod || 'cash'}
                                onChange={(e) => onUpdateAppointment(appt.id, { paymentMethod: e.target.value as any })}
                                className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-slate-100 border-none outline-none focus:ring-2 focus:ring-emerald-500 w-fit text-right cursor-pointer"
                              >
                                <option value="cash">Efectivo</option>
                                <option value="transfer">Trf.</option>
                              </select>
                            )}
                          </>
                        ) : (
                          <>
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded-md mb-1",
                              appt.status === 'completed' ? "bg-emerald-100 text-emerald-700" : 
                              appt.status === 'cancelled' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                            )}>
                              {appt.status}
                            </span>
                            {appt.paid ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-emerald-100/50 text-emerald-700 w-fit inline-block">
                                  Pagado
                                </span>
                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-slate-100 text-slate-600 w-fit inline-block">
                                  {appt.paymentMethod === 'transfer' ? 'Trf.' : 'Efectivo'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-amber-100/50 text-amber-700 w-fit inline-block">
                                Pendiente
                              </span>
                            )}
                          </>
                        )}
                        <div className="text-sm font-mono font-medium text-slate-800 mt-1">
                          {formatCurrency(appt.cost)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Payment History */}
            <section>
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" /> Historial de Pagos
              </h4>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4">
                <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Total Pagado Histórico</p>
                <p className="text-xl font-mono text-emerald-700">
                  {formatCurrency(patientSales.reduce((acc, curr) => acc + curr.total, 0))}
                </p>
              </div>

              <div className="space-y-3">
                {patientSales.length === 0 ? (
                  <p className="text-slate-400 text-sm italic py-4">No hay historial de ventas asociadas al paciente.</p>
                ) : (
                  patientSales.map(sale => (
                    <div key={sale.id} className="p-4 rounded-2xl border border-slate-100 bg-white flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-400">{new Date(sale.date).toLocaleDateString()}</p>
                        <p className="text-sm font-medium text-slate-800">{sale.items[0]?.description || 'Servicio'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-emerald-100/50 text-emerald-700 w-fit inline-block mb-1">
                          Completado
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-slate-100 text-slate-600 w-fit inline-block mb-1 ml-1">
                          {sale.paymentMethod === 'transfer' ? 'Trf.' : 'Efectivo'}
                        </span>
                        <div className="text-sm font-mono font-medium text-slate-800">
                          {formatCurrency(sale.total)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </motion.div>

      {onDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Eliminar Paciente"
          message="¿Estás seguro que deseas eliminar a este paciente? Las citas y ventas asociadas se borrarán y dejarán de aparecer en los reportes. Esta acción no se puede deshacer."
          confirmText="Eliminar Paciente"
          onConfirm={() => {
            onDelete(patient.id);
            setShowDeleteConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
