import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PatientsView } from './components/PatientsView';
import { AgendaView } from './components/AgendaView';
import { InventoryView } from './components/InventoryView';
import { ChatbotView } from './components/ChatbotView';
import { ReportsView } from './components/ReportsView';
import { NotificationCenter } from './components/NotificationCenter';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { useAppState } from './store';
import { ViewState } from './types';
import { 
  LayoutDashboard, CalendarDays, Users, Package, 
  FileText, Bot, Activity, User, Menu, X
} from 'lucide-react';
import { FootIcon } from './components/icons/FootIcon';
import { cn } from './lib/utils';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { LoginView } from './components/LoginView';
import { ProfileView } from './components/ProfileView';
import { BillingView } from './components/BillingView';
import { motion, AnimatePresence } from 'motion/react';

// Bottom nav items (shown on mobile)
const BOTTOM_NAV: { id: ViewState; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',  label: 'Inicio',      icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'agenda',     label: 'Agenda',      icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'patients',   label: 'Pacientes',   icon: <Users className="w-5 h-5" /> },
  { id: 'inventory',  label: 'Inventario',  icon: <Package className="w-5 h-5" /> },
  { id: 'profile',    label: 'Perfil',      icon: <User className="w-5 h-5" /> },
];

// Extra views accessible via "Más" menu or sidebar
const MORE_VIEWS: { id: ViewState; label: string; icon: React.ReactNode }[] = [
  { id: 'billing',  label: 'Facturación', icon: <FileText className="w-5 h-5" /> },
  { id: 'chatbot',  label: 'Chatbot IA',  icon: <Bot className="w-5 h-5" /> },
  { id: 'reports',  label: 'Reportes',    icon: <Activity className="w-5 h-5" /> },
];

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const appState = useAppState();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      try {
        setUser(session?.user ?? null);
        if (session?.user) {
          const emailLower = session.user.email?.toLowerCase() ?? '';
          const isAdminUser = emailLower === 'admin@podogest.cl' || emailLower === 'sebhaa74@gmail.com';
          const matchedId = isAdminUser ? 'admin' : `esp-${session.user.id}`;
          appState.setActiveSpecialistId(matchedId);
          
          // Solo inicializamos si no existe, para no pisar el nombre guardado en Profile
          supabase.from('specialists').select('name, is_admin_profile').eq('id', matchedId).single().then(({ data }) => {
            if (!data) {
              const defaultName = isAdminUser ? 'Administrador' : (session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Especialista');
              supabase.from('specialists').insert({
                id: matchedId, name: defaultName,
                email: session.user.email, is_admin_profile: isAdminUser
              }).then(({ error }) => { if (error) console.error('Insert error:', error); });
            } else if (isAdminUser && !data.is_admin_profile) {
              supabase.from('specialists').update({ is_admin_profile: true }).eq('id', matchedId).then();
            }
          });
        }
      } catch (err) {
        console.error('Session error:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        setUser(session?.user ?? null);
        if (session?.user) {
          const emailLower = session.user.email?.toLowerCase() ?? '';
          const isAdminUser = emailLower === 'admin@podogest.cl' || emailLower === 'sebhaa74@gmail.com';
          const matchedId = isAdminUser ? 'admin' : `esp-${session.user.id}`;
          appState.setActiveSpecialistId(matchedId);
          
          supabase.from('specialists').select('name, is_admin_profile').eq('id', matchedId).single().then(({ data }) => {
            if (!data) {
              const defaultName = isAdminUser ? 'Administrador' : (session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Especialista');
              supabase.from('specialists').insert({
                id: matchedId, name: defaultName,
                email: session.user.email, is_admin_profile: isAdminUser
              }).then(({ error }) => { if (error) console.error('Insert error:', error); });
            } else if (isAdminUser && !data.is_admin_profile) {
              supabase.from('specialists').update({ is_admin_profile: true }).eq('id', matchedId).then();
            }
          });
        }
      } catch (err) {
        console.error('Auth change error:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [appState.setActiveSpecialistId]);

  const navigate = (view: ViewState) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
    setShowMoreMenu(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView state={appState} onChangeView={navigate} />;
      case 'patients':  return <PatientsView state={appState} />;
      case 'agenda':    return <AgendaView state={appState} />;
      case 'inventory': return <InventoryView state={appState} />;
      case 'chatbot':   return <ChatbotView state={appState} />;
      case 'reports':   return <ReportsView state={appState} />;
      case 'profile':   return <ProfileView state={appState} />;
      case 'billing':   return <BillingView state={appState} />;
      default:          return <DashboardView state={appState} onChangeView={navigate} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
        <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 shadow-xl">
          <FootIcon className="w-8 h-8 text-white animate-pulse" />
        </div>
        <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-white/70 text-sm font-semibold tracking-widest uppercase">Cargando PodoGest...</p>
      </div>
    );
  }

  if (!user) return <LoginView onLoginSuccess={() => {}} />;

  const isEditingPatient = appState.isEditingPatient;
  const unreadCount = appState.notifications.filter(n => !n.read).length;
  const VIEW_LABELS: Record<ViewState, string> = {
    dashboard: 'Panel Principal', agenda: 'Agenda', patients: 'Pacientes',
    inventory: 'Inventario', chatbot: 'Chatbot IA', reports: 'Reportes',
    profile: 'Mi Perfil', billing: 'Facturación',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* ── DESKTOP SIDEBAR ─────────────────────────────── */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar
          currentView={currentView}
          onChangeView={navigate}
          appState={appState}
        />
      </div>

      {/* ── MOBILE SIDEBAR DRAWER ───────────────────────── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 h-full"
            >
              <Sidebar
                currentView={currentView}
                onChangeView={navigate}
                isMobileMenuOpen={isSidebarOpen}
                setIsMobileMenuOpen={setIsSidebarOpen}
                appState={appState}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT AREA ───────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* ── MOBILE TOP BAR ──────────────────────────── */}
        {!isEditingPatient && (
          <header className="lg:hidden flex items-center justify-between px-4 py-3 shrink-0 z-30 sidebar-gradient shadow-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                  <FootIcon className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-white tracking-tight">{VIEW_LABELS[currentView]}</span>
              </div>
            </div>
            <NotificationCenter
              notifications={appState.notifications}
              onMarkRead={appState.markAsRead}
              onClearRead={appState.clearRead}
            />
          </header>
        )}

        {/* ── DESKTOP TOP BAR ─────────────────────────── */}
        {!isEditingPatient && (
          <header className="hidden lg:flex items-center justify-between px-8 py-4 shrink-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
            <div>
              <h1 className="font-extrabold text-xl text-slate-800">{VIEW_LABELS[currentView]}</h1>
              <p className="text-xs text-slate-400 font-medium">PodoGest · Sistema de Gestión de Clínica</p>
            </div>
            <NotificationCenter
              notifications={appState.notifications}
              onMarkRead={appState.markAsRead}
              onClearRead={appState.clearRead}
            />
          </header>
        )}

        {/* ── PAGE CONTENT ────────────────────────────── */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── MOBILE BOTTOM NAV ───────────────────────── */}
        {!isEditingPatient && (
          <nav className="lg:hidden shrink-0 z-30">
            {/* More menu popup */}
            <AnimatePresence>
              {showMoreMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-30"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.95 }}
                    className="absolute bottom-full left-0 right-0 mx-4 mb-2 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 z-40 grid grid-cols-3 gap-2"
                  >
                    {MORE_VIEWS.map(item => (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all font-semibold text-xs",
                          currentView === item.id
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Bottom Tab Bar */}
            <div className="bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] flex items-stretch safe-area-pb"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {BOTTOM_NAV.map(item => {
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setShowMoreMenu(false); navigate(item.id); }}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all active:scale-95",
                      active ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <div className={cn(
                      "relative flex items-center justify-center w-8 h-8 rounded-xl transition-all",
                      active ? "bg-emerald-100" : ""
                    )}>
                      {item.icon}
                      {item.id === 'profile' && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-bold leading-none", active ? "text-emerald-600" : "text-slate-400")}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
              {/* More button */}
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all active:scale-95 relative",
                  showMoreMenu || MORE_VIEWS.some(v => v.id === currentView) ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-xl transition-all",
                  showMoreMenu || MORE_VIEWS.some(v => v.id === currentView) ? "bg-emerald-100" : ""
                )}>
                  {showMoreMenu
                    ? <X className="w-5 h-5" />
                    : <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                      </svg>
                  }
                </div>
                <span className={cn(
                  "text-[10px] font-bold leading-none",
                  showMoreMenu || MORE_VIEWS.some(v => v.id === currentView) ? "text-emerald-600" : "text-slate-400"
                )}>
                  {MORE_VIEWS.some(v => v.id === currentView)
                    ? MORE_VIEWS.find(v => v.id === currentView)?.label
                    : 'Más'}
                </span>
              </button>
            </div>
          </nav>
        )}
      </div>

      <PWAInstallPrompt />
    </div>
  );
}
