import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, AlertCircle, Sparkles, ChevronRight, Fingerprint } from 'lucide-react';
import { FootIcon } from './icons/FootIcon';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface LoginViewProps {
  onLoginSuccess: (userId: string, email: string, name: string) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error('Por favor, ingresa tu nombre completo.');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() } }
        });
        if (error) throw error;
        if (data.user) {
          const isAdminEmail = ['admin@podogest.cl', 'sebhaa74@gmail.com'].includes(email.trim().toLowerCase());
          await supabase.from('specialists').upsert({
            id: isAdminEmail ? 'admin' : `esp-${data.user.id}`,
            name: fullName.trim(), email: email.trim(), is_admin_profile: isAdminEmail
          });
          onLoginSuccess(data.user.id, data.user.email || '', fullName.trim());
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) {
          onLoginSuccess(data.user.id, data.user.email || '', data.user.user_metadata?.full_name || 'Profesional');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-stretch font-sans bg-slate-900 relative overflow-hidden">
      
      {/* --- MOBILE BACKGROUND EFFECTS (Ultra Premium) --- */}
      <div className="absolute inset-0 pointer-events-none md:hidden">
        <div className="absolute top-[-10%] left-[-20%] w-[70vw] h-[70vw] bg-emerald-500/20 rounded-full blur-[80px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-teal-600/20 rounded-full blur-[100px] mix-blend-screen" style={{ animation: 'pulse 8s infinite alternate' }}></div>
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* --- DESKTOP LEFT PANEL --- */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between relative overflow-hidden bg-slate-900 border-r border-white/10"
        style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 40%, #065f46 100%)' }}>
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

        <div className="relative p-12 lg:p-20 flex flex-col justify-between h-full z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl shadow-black/20">
              <FootIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="font-extrabold text-2xl text-white tracking-tight">PodoGest <span className="text-emerald-400">Pro</span></span>
          </div>

          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold px-4 py-2 rounded-full mb-8 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4" /> Next-Gen Clinic OS
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight"
            >
              El futuro de tu<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                clínica podológica
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="text-emerald-100/70 text-xl leading-relaxed max-w-lg font-light"
            >
              Inteligencia artificial, gestión financiera automatizada y fichas clínicas interactivas en la palma de tu mano.
            </motion.p>
          </div>

          <p className="text-emerald-500/50 text-sm font-medium tracking-wide">© 2026 PodoGest · Creado para verdaderos profesionales.</p>
        </div>
      </div>

      {/* --- RIGHT PANEL (Form) --- */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 relative z-10 w-full md:bg-white bg-transparent text-white md:text-slate-800">
        
        {/* Mobile Top Decor */}
        <div className="md:hidden flex flex-col items-center justify-center mb-10 mt-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, type: 'spring' }}
            className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 border border-white/20 mb-6 relative"
          >
            <div className="absolute inset-0 bg-white/20 rounded-3xl blur-md mix-blend-overlay"></div>
            <FootIcon className="w-10 h-10 text-white relative z-10" />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight text-white text-center"
          >
            PodoGest
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-emerald-200/80 mt-2 text-sm text-center"
          >
            Gestión Clínica Inteligente
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-md mx-auto md:bg-transparent md:border-none md:p-0 md:backdrop-blur-none bg-white/10 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl"
        >
          <div className="hidden md:block mb-10">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">
              {isRegister ? 'Únete al equipo' : 'Bienvenido de vuelta'}
            </h2>
            <p className="text-slate-500 font-medium">
              {isRegister ? 'Crea tu perfil profesional ahora.' : 'Ingresa a tu ecosistema clínico.'}
            </p>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={cn(
              "w-full font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 mb-6 disabled:opacity-50 active:scale-[0.98] group relative overflow-hidden",
              "md:bg-white md:border-2 md:border-slate-200 md:text-slate-700 md:hover:border-emerald-400", // Desktop
              "bg-white text-slate-800 shadow-xl shadow-black/10 hover:bg-slate-50" // Mobile
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <div className="relative flex items-center gap-4 mb-6">
            <div className="flex-1 h-px md:bg-slate-200 bg-white/20" />
            <span className="text-[11px] font-bold md:text-slate-400 text-white/50 uppercase tracking-widest">o usar email</span>
            <div className="flex-1 h-px md:bg-slate-200 bg-white/20" />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="p-4 bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl text-red-200 text-sm flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-xs font-bold md:text-slate-500 text-emerald-200 uppercase tracking-widest mb-2 block ml-1">Nombre Completo</label>
                <input
                  type="text" required placeholder="Ej: Dr. Pérez"
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-5 py-4 md:bg-white bg-black/20 md:border-slate-200 border-white/10 border md:text-slate-800 text-white placeholder-white/30 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-base font-medium"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold md:text-slate-500 text-emerald-200 uppercase tracking-widest mb-2 block ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 md:text-slate-400 text-white/40" />
                <input
                  type="email" required placeholder="profesional@clinica.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 md:bg-white bg-black/20 md:border-slate-200 border-white/10 border md:text-slate-800 text-white placeholder-white/30 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-base font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold md:text-slate-500 text-emerald-200 uppercase tracking-widest mb-2 block ml-1">Contraseña</label>
              <div className="relative">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 md:text-slate-400 text-white/40" />
                <input
                  type="password" required placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 md:bg-white bg-black/20 md:border-slate-200 border-white/10 border md:text-slate-800 text-white placeholder-white/30 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-base font-medium tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? 'Comenzar ahora' : 'Acceder a mi panel'}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="text-sm font-medium md:text-slate-500 text-white/70 hover:text-emerald-400 transition-colors"
            >
              {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿Clínica nueva? Regístrate aquí'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
