import React, { useState, useMemo } from 'react';
import { useAppState } from '../store';
import { formatCurrency, cn } from '../lib/utils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, Activity, DollarSign, Calendar, Edit2, Plus, Download,
  CheckCircle2, CreditCard, Banknote, ChevronDown, ChevronUp, Users, Receipt
} from 'lucide-react';
import { TreatmentModal } from './TreatmentModal';
import { format, isSameMonth, subMonths } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { Treatment } from '../types';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportPdfDocument } from './ReportPdfDocument';
import { es } from 'date-fns/locale';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function getMonthKey(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return format(new Date(dateStr), 'yyyy-MM');
  return dateStr.substring(0, 7);
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}
function monthShort(key: string): string {
  const [, m] = key.split('-');
  return MONTH_SHORT[parseInt(m) - 1];
}

export function ReportsView({ state }: { state: ReturnType<typeof useAppState> }) {
  const { appointments, treatments, patients, sales, addTreatment, updateTreatment, deleteTreatment } = state;
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));

  const today = new Date();

  // ── CORE CALCULATION: income from completed+paid appointments ──
  // This is the source of truth for all revenue numbers
  const paidAppts = useMemo(() =>
    appointments.filter(a => a.status === 'completed' && a.paid && a.cost > 0),
    [appointments]
  );

  // Monthly stats map
  const monthlyStats = useMemo(() => {
    const map: Record<string, {
      key: string; ingresos: number; efectivo: number;
      transferencia: number; citas: number; appts: typeof paidAppts;
    }> = {};

    paidAppts.forEach(a => {
      const k = getMonthKey(a.date);
      if (!k) return;
      if (!map[k]) map[k] = { key: k, ingresos: 0, efectivo: 0, transferencia: 0, citas: 0, appts: [] };
      map[k].ingresos += a.cost || 0;
      map[k].citas += 1;
      map[k].appts.push(a);
      if (a.paymentMethod === 'cash') map[k].efectivo += a.cost || 0;
      else map[k].transferencia += a.cost || 0;
    });

    return map;
  }, [paidAppts]);

  // All months sorted descending
  const allMonths = useMemo(() =>
    Object.values(monthlyStats).sort((a, b) => b.key.localeCompare(a.key)),
    [monthlyStats]
  );

  // Summary totals
  const totalRevenue = paidAppts.reduce((s, a) => s + (a.cost || 0), 0);
  const cashRevenue = paidAppts.filter(a => a.paymentMethod === 'cash').reduce((s, a) => s + (a.cost || 0), 0);
  const transferRevenue = totalRevenue - cashRevenue;
  const avgTicket = paidAppts.length > 0 ? totalRevenue / paidAppts.length : 0;

  const currentMonthKey = format(today, 'yyyy-MM');
  const currentMonth = monthlyStats[currentMonthKey] || { ingresos: 0, efectivo: 0, transferencia: 0, citas: 0, appts: [] };
  const prevMonthKey = format(subMonths(today, 1), 'yyyy-MM');
  const prevMonth = monthlyStats[prevMonthKey] || { ingresos: 0 };
  const growthPct = prevMonth.ingresos > 0
    ? Math.round(((currentMonth.ingresos - prevMonth.ingresos) / prevMonth.ingresos) * 100)
    : null;

  // Chart: last 6 months
  const chartData = useMemo(() => Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(today, 5 - i);
    const k = format(d, 'yyyy-MM');
    const s = monthlyStats[k] || { efectivo: 0, transferencia: 0, ingresos: 0, citas: 0 };
    return { month: monthShort(k), efectivo: s.efectivo, transferencia: s.transferencia, total: s.ingresos, citas: s.citas };
  }), [monthlyStats]);

  // Pie data
  const pieData = [
    { name: 'Efectivo', value: cashRevenue, color: '#10b981' },
    { name: 'Transferencia', value: transferRevenue, color: '#6366f1' },
  ].filter(d => d.value > 0);

  // Treatment stats from paid appointments
  const treatmentCounts: Record<string, { count: number; total: number }> = {};
  paidAppts.forEach(a => {
    if (!treatmentCounts[a.treatmentType]) treatmentCounts[a.treatmentType] = { count: 0, total: 0 };
    treatmentCounts[a.treatmentType].count++;
    treatmentCounts[a.treatmentType].total += a.cost || 0;
  });

  // Selected month for PDF
  const selectedMonthData = monthlyStats[selectedMonth] || { ingresos: 0, efectivo: 0, transferencia: 0, citas: 0, appts: [] };
  const selectedMonthLabel = monthLabel(selectedMonth);

  // Months available for selector
  const availableMonths = useMemo(() => {
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      months.push(format(subMonths(today, i), 'yyyy-MM'));
    }
    return months;
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Reportes</h2>
          <p className="text-slate-400 text-sm mt-0.5">Resumen contable y análisis de rentabilidad</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setIsAdding(true)}
            className="btn-glow-emerald text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tratamiento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Este Mes', value: formatCurrency(currentMonth.ingresos),
            sub: growthPct !== null ? `${growthPct >= 0 ? '+' : ''}${growthPct}% vs mes anterior` : `${currentMonth.citas} atenciones`,
            icon: <DollarSign className="w-5 h-5" />, color: 'emerald', up: growthPct !== null ? growthPct >= 0 : true
          },
          {
            label: 'Total Histórico', value: formatCurrency(totalRevenue),
            sub: `${paidAppts.length} atenciones cobradas`,
            icon: <Activity className="w-5 h-5" />, color: 'violet', up: true
          },
          {
            label: 'Ticket Promedio', value: formatCurrency(avgTicket),
            sub: 'Por atención pagada',
            icon: <TrendingUp className="w-5 h-5" />, color: 'blue', up: true
          },
          {
            label: 'Pacientes', value: patients.length.toString(),
            sub: `${appointments.filter(a => a.status === 'completed').length} citas completadas`,
            icon: <Users className="w-5 h-5" />, color: 'amber', up: true
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn('kpi-' + card.color, 'premium-card rounded-2xl p-4 border flex flex-col gap-2')}
          >
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              card.color === 'emerald' ? 'bg-emerald-200/80 text-emerald-700' :
              card.color === 'violet' ? 'bg-violet-200/80 text-violet-700' :
              card.color === 'blue' ? 'bg-blue-200/80 text-blue-700' :
              'bg-amber-200/80 text-amber-700'
            )}>{card.icon}</div>
            <div>
              <p className="text-xl font-extrabold text-slate-800 leading-none">{card.value}</p>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">{card.label}</p>
              <p className={cn('text-[10px] font-bold mt-0.5', card.up ? 'text-emerald-600' : 'text-red-500')}>{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <h3 className="font-bold text-slate-800 mb-1">Evolución de Ingresos</h3>
          <p className="text-xs text-slate-400 mb-4">Últimos 6 meses (citas cobradas)</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="gEfectivo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gTransfer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
                  formatter={(v: any, name: string) => [formatCurrency(v), name === 'efectivo' ? 'Efectivo' : 'Transferencia']}
                />
                <Area type="monotone" dataKey="efectivo" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#gEfectivo)" />
                <Area type="monotone" dataKey="transferencia" stackId="1" stroke="#6366f1" strokeWidth={2} fill="url(#gTransfer)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card rounded-2xl p-5 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-1">Medio de Pago</h3>
          <p className="text-xs text-slate-400 mb-3">Distribución histórica</p>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-300 text-sm">Sin datos</div>
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-slate-600 font-medium">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* PDF Download Section */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" /> Reporte Contable Mensual (PDF)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Descarga el resumen completo de cualquier mes</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <PDFDownloadLink
              document={
                <ReportPdfDocument
                  monthStr={selectedMonthLabel}
                  monthKey={selectedMonth}
                  totalIncomeMonth={selectedMonthData.ingresos}
                  cashIncome={selectedMonthData.efectivo}
                  transferIncome={selectedMonthData.transferencia}
                  totalIncomeAllTime={totalRevenue}
                  avgTicket={avgTicket}
                  totalAppointmentsMonth={selectedMonthData.citas}
                  totalAppointmentsAllTime={paidAppts.length}
                  appointments={selectedMonthData.appts || []}
                  patients={patients}
                  specialists={state.specialists}
                />
              }
              fileName={`Reporte_Contable_${selectedMonthLabel.replace(' ', '_')}.pdf`}
              className="btn-glow-emerald text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap"
            >
              {({ loading }) => loading
                ? <><Download className="w-4 h-4 animate-bounce" /> Generando...</>
                : <><Download className="w-4 h-4" /> Descargar PDF</>
              }
            </PDFDownloadLink>
          </div>
        </div>

        {/* Month preview */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Total Mes', value: formatCurrency(selectedMonthData.ingresos), icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Efectivo', value: formatCurrency(selectedMonthData.efectivo), icon: <Banknote className="w-4 h-4" />, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Transferencia', value: formatCurrency(selectedMonthData.transferencia), icon: <CreditCard className="w-4 h-4" />, color: 'text-indigo-700 bg-indigo-50' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-xl p-3 flex flex-col gap-1', s.color.split(' ')[1])}>
              <div className={cn('flex items-center gap-1 text-xs font-bold', s.color.split(' ')[0])}>
                {s.icon} {s.label}
              </div>
              <p className="font-extrabold text-slate-800 text-sm">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly History */}
      <div className="premium-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Historial de Ingresos por Mes</h3>
          <p className="text-xs text-slate-400 mt-0.5">Calculado desde citas completadas y cobradas</p>
        </div>

        {allMonths.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay ingresos registrados todavía.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {allMonths.map(ms => {
              const expanded = expandedMonth === ms.key;
              return (
                <div key={ms.key}>
                  <button
                    onClick={() => setExpandedMonth(expanded ? null : ms.key)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-extrabold',
                      ms.key === currentMonthKey ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    )}>
                      {monthShort(ms.key)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm capitalize">{monthLabel(ms.key)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{ms.citas} atenciones cobradas</p>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <p className="font-extrabold text-emerald-700 text-sm">{formatCurrency(ms.ingresos)}</p>
                      <div className="flex gap-1 justify-end mt-1">
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">E: {formatCurrency(ms.efectivo)}</span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">T: {formatCurrency(ms.transferencia)}</span>
                      </div>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-slate-50/80 border-t border-slate-100 divide-y divide-slate-100">
                          {ms.appts.sort((a, b) => a.date.localeCompare(b.date)).map(appt => {
                            const patient = patients.find(p => p.id === appt.patientId);
                            return (
                              <div key={appt.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-700 truncate">{patient?.name || 'Paciente'}</p>
                                  <p className="text-xs text-slate-400 truncate">{appt.treatmentType} · {appt.date}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-slate-800">{formatCurrency(appt.cost || 0)}</p>
                                  <p className="text-[10px] text-slate-400">{appt.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Treatments Catalog */}
      <div className="premium-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800">Catálogo de Servicios</h3>
            <p className="text-xs text-slate-400 mt-0.5">Rentabilidad por tipo de tratamiento</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {treatments.length === 0 && (
            <p className="p-6 text-center text-slate-400 text-sm">Sin tratamientos en catálogo.</p>
          )}
          {treatments.map(t => {
            const stats = treatmentCounts[t.name] || { count: 0, total: 0 };
            const pct = totalRevenue > 0 ? (stats.total / totalRevenue * 100) : 0;
            return (
              <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{t.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-24">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{stats.count} veces · {pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-emerald-700 text-sm">{formatCurrency(stats.total)}</p>
                  <p className="text-[10px] text-slate-400">Precio: {formatCurrency(t.cost)}</p>
                </div>
                <button
                  onClick={() => setSelectedTreatment(t)}
                  className="p-2 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-lg transition-all shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {(isAdding || selectedTreatment) && (
          <TreatmentModal
            treatment={selectedTreatment}
            onSave={addTreatment}
            onUpdate={updateTreatment}
            onDelete={deleteTreatment}
            onClose={() => { setIsAdding(false); setSelectedTreatment(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
