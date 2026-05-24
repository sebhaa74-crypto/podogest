import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../store';
import { supabase } from '../supabase';
import { User, Mail, Shield, Clock, CalendarDays, DollarSign, Users, Star, Edit2, Check, X, Camera, LogOut, Upload, Trash2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileViewProps {
  state: ReturnType<typeof useAppState>;
}

const AVATAR_KEY = 'podogest_avatar_';

export function ProfileView({ state }: ProfileViewProps) {
  const [userData, setUserData] = useState<{ name: string; email: string; avatar: string; provider: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [showLogout, setShowLogout] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string>('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const email = user.email || '';
        const emailLower = email.toLowerCase();
        const admin = emailLower === 'admin@podogest.cl' || emailLower === 'sebhaa74@gmail.com';
        setIsAdmin(admin);
        const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Especialista';
        const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
        const provider = user.app_metadata?.provider || 'email';
        setUserData({ name, email, avatar, provider });
        setEditName(name);
        // Load local override avatar
        const local = localStorage.getItem(AVATAR_KEY + user.id);
        if (local) setLocalAvatar(local);
      }
    });
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('La imagen debe ser menor a 2MB.'); return; }
    setAvatarLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setLocalAvatar(base64);
      const user = (await supabase.auth.getUser()).data.user;
      if (user) localStorage.setItem(AVATAR_KEY + user.id, base64);
      setAvatarLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setLocalAvatar('');
    const user = (await supabase.auth.getUser()).data.user;
    if (user) localStorage.removeItem(AVATAR_KEY + user.id);
  };

  const displayAvatar = localAvatar || userData?.avatar || '';

  const myAppointments = state.appointments.filter(a => a.specialistId === state.activeSpecialistId);
  const myPatients = state.patients.filter(p => p.specialistId === state.activeSpecialistId);
  const completedAppts = myAppointments.filter(a => a.status === 'completed');
  const totalRevenue = completedAppts.filter(a => a.paid).reduce((sum, a) => sum + (a.cost || 0), 0);
  const pendingRevenue = completedAppts.filter(a => !a.paid).reduce((sum, a) => sum + (a.cost || 0), 0);
  const activeSpecialist = state.specialists.find(s => s.id === state.activeSpecialistId);

  const handleSaveName = async () => {
    if (editName.trim()) {
      const newName = editName.trim();
      await state.updateSpecialistName(state.activeSpecialistId, newName);
      await supabase.auth.updateUser({ data: { full_name: newName } });
      setUserData(prev => prev ? { ...prev, name: newName } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setIsEditingName(false);
  };

  const statCards = [
    { label: 'Mis Pacientes', value: myPatients.length, icon: <Users className="w-5 h-5" />, color: 'blue' },
    { label: 'Citas Realizadas', value: completedAppts.length, icon: <CalendarDays className="w-5 h-5" />, color: 'violet' },
    { label: 'Ingresos Cobrados', value: formatCurrency(totalRevenue), icon: <DollarSign className="w-5 h-5" />, color: 'emerald' },
    { label: 'Por Cobrar', value: formatCurrency(pendingRevenue), icon: <Clock className="w-5 h-5" />, color: 'amber' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 min-h-full">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Mi Perfil</h2>
        <p className="text-slate-400 mt-1 text-sm">Gestiona tu información personal y estadísticas.</p>
      </div>

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden shadow-xl"
      >
        {/* BG */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 70% 20%, rgba(255,255,255,0.15) 0%, transparent 60%), radial-gradient(circle at 10% 80%, rgba(16,185,129,0.3) 0%, transparent 50%)' }} />
        
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar with upload */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white/20 shadow-xl bg-emerald-700">
              {avatarLoading ? (
                <div className="w-full h-full flex items-center justify-center animate-shimmer" />
              ) : displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-14 h-14 text-emerald-300/70" />
                </div>
              )}
            </div>
            {/* Upload overlay */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            >
              <Upload className="w-6 h-6 text-white mb-1" />
              <span className="text-white text-[10px] font-bold">Cambiar</span>
            </div>
            {/* Remove local avatar */}
            {localAvatar && (
              <button
                onClick={handleRemoveAvatar}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md transition-colors z-10"
                title="Eliminar foto personalizada"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            )}
            {/* Provider badge */}
            {userData?.provider === 'google' && (
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-lg">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    className="bg-white/10 border border-white/30 rounded-xl px-3 py-1.5 text-white text-xl font-bold outline-none focus:ring-2 focus:ring-white/40 w-48"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"><Check className="w-4 h-4 text-white" /></button>
                  <button onClick={() => setIsEditingName(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><X className="w-4 h-4 text-white" /></button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    {activeSpecialist?.name || userData?.name || 'Especialista'}
                  </h3>
                  <button onClick={() => setIsEditingName(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 text-white/70" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-200/80 text-sm mb-3">
              <Mail className="w-4 h-4" />
              <span>{userData?.email}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {isAdmin && (
                <span className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-bold px-3 py-1 rounded-full">
                  <Shield className="w-3 h-3" /> Administrador
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                <Star className="w-3 h-3 text-emerald-300" /> Podólogo/a
              </span>
            </div>

            {/* Upload hint */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 text-xs font-semibold px-4 py-2 rounded-xl transition-all mx-auto md:mx-0 w-fit"
            >
              <Camera className="w-3.5 h-3.5" /> Cambiar foto de perfil
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={() => setShowLogout(true)}
            className="shrink-0 flex items-center gap-2 bg-white/10 hover:bg-rose-500/20 border border-white/20 hover:border-rose-400/50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all self-start"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-sm font-bold px-5 py-2 rounded-xl flex items-center gap-2 shadow-lg"
            >
              <Check className="w-4 h-4" /> ¡Nombre guardado!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn(
              "kpi-" + stat.color,
              "premium-card rounded-2xl p-5 border flex flex-col gap-3"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              stat.color === 'emerald' ? 'bg-emerald-200/80 text-emerald-700' :
              stat.color === 'blue' ? 'bg-blue-200/80 text-blue-700' :
              stat.color === 'amber' ? 'bg-amber-200/80 text-amber-700' :
              'bg-violet-200/80 text-violet-700'
            )}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-800">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-semibold">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Admin Team Overview */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" /> Resumen del Equipo
          </h3>
          <div className="space-y-3">
            {state.specialists.map(sp => {
              const spAppts = state.appointments.filter(a => a.specialistId === sp.id && a.status === 'completed');
              const spRevenue = spAppts.filter(a => a.paid).reduce((s, a) => s + (a.cost || 0), 0);
              const spPatients = state.patients.filter(p => p.specialistId === sp.id).length;
              const pct = state.patients.length ? Math.round(spPatients / state.patients.length * 100) : 0;
              return (
                <div key={sp.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate text-sm">{sp.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">{spPatients} pac.</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <div>
                      <p className="font-extrabold text-emerald-700 text-sm">{formatCurrency(spRevenue)}</p>
                      <p className="text-[10px] text-slate-400">{spAppts.length} citas</p>
                    </div>
                    {sp.id !== 'admin' && sp.id !== state.activeSpecialistId && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`¿Seguro que deseas eliminar al especialista ${sp.name}?`)) {
                            await state.deleteSpecialist(sp.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                        title="Eliminar especialista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <ConfirmDialog
        isOpen={showLogout}
        title="Cerrar Sesión"
        message="¿Seguro que deseas cerrar tu sesión en PodoGest?"
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        onConfirm={async () => { await supabase.auth.signOut(); }}
        onCancel={() => setShowLogout(false)}
        isDestructive
      />
    </div>
  );
}
