import React from "react";
import { useAppState } from "../store";
import { formatCurrency, cn, formatTime } from "../lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  Users, DollarSign, Calendar, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, ArrowRight, Package, Zap
} from "lucide-react";
import { ViewState } from "../types";
import { startOfWeek, addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "motion/react";

export function DashboardView({
  state, onChangeView,
}: {
  state: ReturnType<typeof useAppState>;
  onChangeView: (view: ViewState) => void;
}) {
  const { patients, appointments, sales, supplies } = state;

  const todayDateLocal = new Date();
  const todayStr = format(todayDateLocal, "yyyy-MM-dd");

  const isMyAppt = (a: any) =>
    state.activeSpecialistId === "admin" ||
    a.specialistId === state.activeSpecialistId ||
    a.specialistId === "admin";

  const pendingAppts = appointments.filter(a => a.status === "pending" && isMyAppt(a));
  const todayAppts = pendingAppts.filter(a => a.date === todayStr);
  const completedToday = appointments.filter(a => a.status === "completed" && a.date === todayStr && isMyAppt(a));
  const lowStockSupplies = supplies.filter(s => s.stock <= s.minStock);

  const todayRevenue = sales
    .filter(s => {
      const d = s.date?.includes("T") ? format(new Date(s.date), "yyyy-MM-dd") : (s.date || "");
      return d === todayStr;
    })
    .reduce((sum, s) => sum + s.total, 0);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

  // Weekly chart
  const startOfCurrentWeek = startOfWeek(todayDateLocal, { weekStartsOn: 1 });
  const currentWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(startOfCurrentWeek, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const name = format(d, "EEE", { locale: es });
    return { name: name.charAt(0).toUpperCase() + name.slice(1), ingresos: 0, citas: 0, date: dateStr };
  });

  sales.forEach(s => {
    const dateStr = s.date?.includes("T") ? format(new Date(s.date), "yyyy-MM-dd") : (s.date || "");
    const day = currentWeek.find(w => w.date === dateStr);
    if (day) day.ingresos += s.total;
  });
  appointments.filter(a => a.status === "completed").forEach(a => {
    const day = currentWeek.find(w => w.date === a.date);
    if (day) day.citas++;
  });

  const greetingHour = todayDateLocal.getHours();
  const greeting = greetingHour < 12 ? "Buenos días" : greetingHour < 18 ? "Buenas tardes" : "Buenas noches";
  const specialistName = state.specialists.find(s => s.id === state.activeSpecialistId)?.name?.split(' ')[0] || "Doctor";

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-emerald-600 font-semibold text-sm">{greeting} 👋</p>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
            {specialistName}
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {format(todayDateLocal, "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <button
          onClick={() => onChangeView("agenda")}
          className="btn-glow-emerald text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4" /> Ver Agenda <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { title: "Ingresos Hoy", value: formatCurrency(todayRevenue), icon: <DollarSign className="w-5 h-5" />, color: "emerald", trend: "+12%", trendUp: true, view: "reports" },
          { title: "Pacientes", value: patients.length, icon: <Users className="w-5 h-5" />, color: "blue", view: "patients" },
          { title: "Citas Hoy", value: todayAppts.length, icon: <Calendar className="w-5 h-5" />, color: "amber", view: "agenda" },
          { title: "Completadas", value: completedToday.length, icon: <CheckCircle2 className="w-5 h-5" />, color: "violet", view: "agenda" },
          { title: "Stock Crítico", value: lowStockSupplies.length, icon: <AlertTriangle className="w-5 h-5" />, color: "red", alert: lowStockSupplies.length > 0, view: "inventory" },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onChangeView(card.view as ViewState)}
            className={cn(
              "kpi-" + card.color,
              "premium-card premium-card-clickable rounded-2xl p-4 md:p-5 flex flex-col gap-3 border"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide leading-none">{card.title}</p>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                card.color === "emerald" ? "bg-emerald-200/80 text-emerald-700" :
                card.color === "blue" ? "bg-blue-200/80 text-blue-700" :
                card.color === "amber" ? "bg-amber-200/80 text-amber-700" :
                card.color === "violet" ? "bg-violet-200/80 text-violet-700" :
                "bg-red-200/80 text-red-700"
              )}>
                {card.icon}
              </div>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-none">{card.value}</p>
              {card.trend && (
                <p className={cn("text-xs font-semibold mt-1 flex items-center gap-1", card.trendUp ? "text-emerald-600" : "text-red-500")}>
                  {card.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {card.trend} esta semana
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 glass-card rounded-2xl p-5 md:p-6"
        >
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Ingresos Semanales</h3>
              <p className="text-xs text-slate-400 mt-0.5">Semana actual</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(totalRevenue)}</p>
              <p className="text-[11px] text-slate-400">total acumulado</p>
            </div>
          </div>
          <div className="h-52 md:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentWeek} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", fontSize: 13 }}
                  formatter={(v: any) => [formatCurrency(v), "Ingresos"]}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2.5} fill="url(#colorIngresos)" dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#059669" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="glass-card rounded-2xl p-5 md:p-6 flex flex-col"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Citas de Hoy</h3>
              <p className="text-xs text-slate-400 mt-0.5">{todayAppts.length} pendientes</p>
            </div>
            <button
              onClick={() => onChangeView("agenda")}
              className="text-xs text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-0.5 transition-colors"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 space-y-2.5 overflow-auto">
            {todayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-200 mb-2" />
                <p className="text-sm text-slate-400 font-medium">Sin citas pendientes</p>
                <p className="text-xs text-slate-300 mt-0.5">¡Buen trabajo!</p>
              </div>
            ) : (
              todayAppts.slice(0, 5).sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(appt => {
                const patient = patients.find(p => p.id === appt.patientId);
                const spec = state.specialists.find(s => s.id === appt.specialistId);
                return (
                  <div
                    key={appt.id}
                    onClick={() => onChangeView("agenda")}
                    className="flex gap-3 p-3 rounded-xl bg-white border border-slate-100 cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group shadow-sm"
                  >
                    <div className="w-12 shrink-0 text-center">
                      <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100 px-1.5 py-1 rounded-lg block">{formatTime(appt.time)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{patient?.name || "Privado"}</p>
                      <p className="text-xs text-slate-400 truncate">{appt.treatmentType}</p>
                      {spec && <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 truncate">{spec.name}</p>}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 self-center" />
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* Low Stock Alert */}
      {lowStockSupplies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => onChangeView("inventory")}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">Stock Crítico</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {lowStockSupplies.slice(0, 3).map(s => s.name).join(", ")}
              {lowStockSupplies.length > 3 && ` y ${lowStockSupplies.length - 3} más`}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
        </motion.div>
      )}
    </div>
  );
}
