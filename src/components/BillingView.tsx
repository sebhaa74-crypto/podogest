import React, { useState, useMemo } from 'react';
import { useAppState } from '../store';
import { Invoice, InvoiceItem, InvoiceStatus } from '../types';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, X, Check, Clock, AlertCircle, Send,
  DollarSign, TrendingUp, Filter, Search, Printer, ChevronDown, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BillingViewProps {
  state: ReturnType<typeof useAppState>;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:   { label: 'Borrador',  color: 'bg-slate-100 text-slate-600 border-slate-200',   icon: <FileText className="w-3 h-3" /> },
  sent:    { label: 'Enviada',   color: 'bg-blue-100 text-blue-700 border-blue-200',      icon: <Send className="w-3 h-3" /> },
  paid:    { label: 'Pagada',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <Check className="w-3 h-3" /> },
  overdue: { label: 'Vencida',   color: 'bg-red-100 text-red-700 border-red-200',         icon: <AlertCircle className="w-3 h-3" /> },
};

let invoiceCounter = 1000;

function generateInvoiceNumber() {
  invoiceCounter++;
  return `FAC-${invoiceCounter}`;
}

export function BillingView({ state }: BillingViewProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formPatientId, setFormPatientId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTax, setFormTax] = useState(0);
  const [formItems, setFormItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setFormItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.total = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const addItem = () => setFormItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const removeItem = (idx: number) => setFormItems(prev => prev.filter((_, i) => i !== idx));

  const formSubtotal = formItems.reduce((s, i) => s + i.total, 0);
  const formTotal = formSubtotal + (formSubtotal * formTax / 100);

  const handleCreateInvoice = () => {
    if (!formPatientId || !formDueDate || formItems.some(i => !i.description || i.total === 0)) return;
    const patient = state.patients.find(p => p.id === formPatientId);
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      number: generateInvoiceNumber(),
      patientId: formPatientId,
      patientName: patient?.name || 'Paciente',
      specialistId: state.activeSpecialistId,
      date: today,
      dueDate: formDueDate,
      items: formItems,
      subtotal: formSubtotal,
      tax: formTax,
      total: formTotal,
      status: 'draft',
      notes: formNotes,
    };
    setInvoices(prev => [newInvoice, ...prev]);
    // Reset
    setShowForm(false);
    setFormPatientId('');
    setFormDueDate('');
    setFormNotes('');
    setFormTax(0);
    setFormItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const updateStatus = (id: string, status: InvoiceStatus) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? {
      ...inv,
      status,
      paidAt: status === 'paid' ? new Date().toISOString() : inv.paidAt
    } : inv));
  };

  const deleteInvoice = (id: string) => setInvoices(prev => prev.filter(inv => inv.id !== id));

  const filtered = useMemo(() => invoices
    .filter(inv => filterStatus === 'all' || inv.status === filterStatus)
    .filter(inv => !search || inv.patientName.toLowerCase().includes(search.toLowerCase()) || inv.number.toLowerCase().includes(search.toLowerCase())),
    [invoices, filterStatus, search]
  );

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0);

  const handlePrint = (inv: Invoice) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Factura ${inv.number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
        h1 { color: #065f46; } table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 13px; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .total { font-size: 20px; font-weight: bold; color: #065f46; text-align: right; margin-top: 20px; }
        .meta { display: flex; justify-content: space-between; margin: 20px 0; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        @media print { button { display: none; } }
      </style></head><body>
      <h1>PodoGest — Factura ${inv.number}</h1>
      <div class="meta">
        <div><b>Paciente:</b> ${inv.patientName}<br><b>Fecha:</b> ${inv.date}<br><b>Vencimiento:</b> ${inv.dueDate}</div>
        <div><b>Estado:</b> <span class="badge">${STATUS_CONFIG[inv.status].label}</span></div>
      </div>
      <table><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th></tr></thead>
      <tbody>${inv.items.map(it => `<tr><td>${it.description}</td><td>${it.quantity}</td><td>$${it.unitPrice.toLocaleString('es-CL')}</td><td>$${it.total.toLocaleString('es-CL')}</td></tr>`).join('')}
      </tbody></table>
      <div class="total">Total: $${inv.total.toLocaleString('es-CL')}</div>
      ${inv.notes ? `<p style="color:#64748b;margin-top:20px"><i>Notas: ${inv.notes}</i></p>` : ''}
      <button onclick="window.print()" style="margin-top:30px;padding:10px 20px;background:#065f46;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimir</button>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Facturación</h2>
          <p className="text-slate-500 mt-1">Genera y gestiona facturas para tus pacientes.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nueva Factura
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Cobrado', value: totalPaid, icon: <Check className="w-5 h-5" />, color: 'emerald' },
          { label: 'Pendiente', value: totalPending, icon: <Clock className="w-5 h-5" />, color: 'amber' },
          { label: 'Vencido', value: totalOverdue, icon: <AlertCircle className="w-5 h-5" />, color: 'red' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              card.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
              card.color === 'amber' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            )}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(card.value)}</p>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por paciente o número..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                filterStatus === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {s === 'all' ? 'Todas' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-14 h-14 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No hay facturas aún.</p>
          <p className="text-slate-300 text-sm mt-1">Crea tu primera factura con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => {
            const statusCfg = STATUS_CONFIG[inv.status];
            const isExpanded = expandedId === inv.id;
            return (
              <motion.div
                key={inv.id}
                layout
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">{inv.number}</p>
                        <span className={cn('flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border', statusCfg.color)}>
                          {statusCfg.icon} {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">{inv.patientName} · Vence: {inv.dueDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(inv.total)}</p>
                    <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', isExpanded && 'rotate-180')} />
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        {/* Items table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="text-left p-3 text-slate-500 font-semibold text-xs">Descripción</th>
                                <th className="text-right p-3 text-slate-500 font-semibold text-xs">Cant.</th>
                                <th className="text-right p-3 text-slate-500 font-semibold text-xs">Precio</th>
                                <th className="text-right p-3 text-slate-500 font-semibold text-xs">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {inv.items.map((item, i) => (
                                <tr key={i}>
                                  <td className="p-3 text-slate-700">{item.description}</td>
                                  <td className="p-3 text-right text-slate-500">{item.quantity}</td>
                                  <td className="p-3 text-right text-slate-500">{formatCurrency(item.unitPrice)}</td>
                                  <td className="p-3 text-right font-semibold text-slate-800">{formatCurrency(item.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                          <div className="text-sm text-slate-500 space-y-1">
                            <p>Subtotal: <span className="font-semibold text-slate-700">{formatCurrency(inv.subtotal)}</span></p>
                            {inv.tax > 0 && <p>IVA ({inv.tax}%): <span className="font-semibold text-slate-700">{formatCurrency(inv.subtotal * inv.tax / 100)}</span></p>}
                            <p className="text-base font-bold text-slate-800">Total: {formatCurrency(inv.total)}</p>
                            {inv.notes && <p className="italic text-slate-400 mt-1">"{inv.notes}"</p>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {inv.status === 'draft' && (
                              <button onClick={() => updateStatus(inv.id, 'sent')} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                                <Send className="w-3.5 h-3.5" /> Marcar Enviada
                              </button>
                            )}
                            {(inv.status === 'sent' || inv.status === 'overdue') && (
                              <button onClick={() => updateStatus(inv.id, 'paid')} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                                <Check className="w-3.5 h-3.5" /> Marcar Pagada
                              </button>
                            )}
                            {inv.status === 'sent' && (
                              <button onClick={() => updateStatus(inv.id, 'overdue')} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-xl transition-colors border border-red-200">
                                <AlertCircle className="w-3.5 h-3.5" /> Marcar Vencida
                              </button>
                            )}
                            <button onClick={() => handlePrint(inv)} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                              <Printer className="w-3.5 h-3.5" /> Imprimir
                            </button>
                            <button onClick={() => deleteInvoice(inv.id)} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-xl transition-colors border border-red-200">
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New Invoice Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-xl"><FileText className="w-6 h-6 text-emerald-600" /></div>
                  <h3 className="text-xl font-bold text-slate-800">Nueva Factura</h3>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2.5 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Patient & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Paciente *</label>
                    <select
                      value={formPatientId}
                      onChange={e => setFormPatientId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      <option value="">Seleccionar paciente...</option>
                      {state.patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Fecha de Vencimiento *</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={e => setFormDueDate(e.target.value)}
                      min={today}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ítems *</label>
                    <button onClick={addItem} className="text-xs text-emerald-600 font-bold flex items-center gap-1 hover:text-emerald-700">
                      <Plus className="w-3 h-3" /> Agregar ítem
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                          placeholder="Descripción"
                          className="col-span-5 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                          min={1}
                          className="col-span-2 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-center"
                        />
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                          min={0}
                          placeholder="Precio"
                          className="col-span-3 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <div className="col-span-1 text-xs font-bold text-slate-600 text-right">{formatCurrency(item.total)}</div>
                        {formItems.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="col-span-1 text-slate-300 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tax & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">IVA (%)</label>
                    <input
                      type="number"
                      value={formTax}
                      onChange={e => setFormTax(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Notas</label>
                    <input
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder="Notas adicionales..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Total preview */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center">
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>Subtotal: <span className="font-semibold">{formatCurrency(formSubtotal)}</span></p>
                    {formTax > 0 && <p>IVA ({formTax}%): <span className="font-semibold">{formatCurrency(formSubtotal * formTax / 100)}</span></p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-600 font-semibold">TOTAL</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(formTotal)}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white sticky bottom-0">
                <button onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={!formPatientId || !formDueDate || formItems.some(i => !i.description || i.total === 0)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl transition-all"
                >
                  <FileText className="w-4 h-4" /> Crear Factura
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
