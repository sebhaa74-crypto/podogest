import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { FootIcon } from './icons/FootIcon';
import { motion, AnimatePresence } from 'motion/react';

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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex items-stretch font-sans">
      {/* Left panel — visible on md+ */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/10 rounded-full translate-y-1/2 -translate-x-1/3" />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

        <div className="relative p-10 lg:p-16 flex flex-col justify-between h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
              <FootIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">PodoGest</span>
          </div>

          {/* Hero text */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-emerald-200 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Clínica Podológica Integrada
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
              Gestiona tu clínica<br />de forma inteligente
            </h1>
            <p className="text-emerald-200/80 text-lg leading-relaxed max-w-md">
              Agenda, pacientes, inventario y reportes contables en un solo lugar. Diseñado para profesionales de la podología.
            </p>

            <div className="grid grid-cols-2 gap-4 mt-10">
              {[
                { label: 'Agenda inteligente', desc: 'Gestión de citas con recordatorios automáticos' },
                { label: 'Historial clínico', desc: 'Ficha completa de cada paciente' },
                { label: 'Control de stock', desc: 'Inventario compartido entre especialistas' },
                { label: 'Reportes PDF', desc: 'Resumen contable mensual descargable' },
              ].map(f => (
                <div key={f.label} className="bg-white/10 border border-white/10 rounded-2xl p-4">
                  <p className="text-white font-bold text-sm">{f.label}</p>
                  <p className="text-emerald-200/70 text-xs mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-emerald-400/50 text-xs">© 2026 PodoGest · Todos los derechos reservados</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-100/40 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <FootIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl text-slate-800">PodoGest</span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">
            {isRegister ? 'Crear cuenta' : 'Bienvenido/a'}
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            {isRegister ? 'Completa tus datos para registrarte.' : 'Inicia sesión para continuar en PodoGest.'}
          </p>

          {/* Google Button — prominent at top */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md text-slate-700 font-bold py-3.5 px-5 rounded-2xl transition-all flex items-center justify-center gap-3 mb-5 disabled:opacity-50 active:scale-[0.98]"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">o con email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex gap-2.5 items-start"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Nombre Completo</label>
                <input
                  type="text" required placeholder="Dra. Ejemplo"
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 font-medium transition-all text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" required placeholder="profesional@ejemplo.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 font-medium transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'} required placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 font-medium transition-all text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full btn-glow-emerald text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? 'Crear cuenta' : 'Iniciar Sesión'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? '¿Ya tienes cuenta?' : '¿Eres nuevo especialista?'}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); setFullName(''); }}
              className="text-emerald-600 hover:text-emerald-700 font-bold ml-1.5 transition-colors"
            >
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
