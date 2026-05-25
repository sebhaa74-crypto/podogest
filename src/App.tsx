import React, { useState, useEffect, useCallback, memo } from 'react';
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
  FileText, Bot, Activity, User, Menu, X, ChevronRight
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

const ALL_VIEWS = [...BOTTOM_NAV, ...MORE_VIEWS];

const VIEW_LABELS: Record<ViewState, string> = {
  dashboard: 'Panel Principal', agenda: 'Agenda', patients: 'Pacientes',
  inventory: 'Inventario', chatbot: 'Chatbot IA', reports: 'Reportes',
  profile: 'Mi Perfil', billing: 'Facturación',
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Track which views have been mounted at least once — never unmount them after
  const [mountedViews, setMountedViews] = useState<Set<ViewState>>(new Set(['dashboard']));
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
              const defaultName = isAdminUser ? 'Administrador' : (session.user?.user_metadata?.full_name || 'Especialista');
              supabase.from('specialists').insert({
                id: matchedId, name: defaultName,
                email: session.user?.email, is_admin_profile: isAdminUser
              }).then();
            }
          });
        }
      } catch (err) {
        console.error('Auth change error:', err);
      }
    });

    return () => subscription.unsubscribe();
  }, [appState.setActiveSpecialistId]);

  const navigate = useCallback((view: ViewState) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
    setShowMoreMenu(false);
    // Mount this view if it hasn't been before
    setMountedViews(prev => {
      if (prev.has(view)) return prev;
      const next = new Set(prev);
      next.add(view);
      return next;
    });
  }, []);

  const isEditingPatient = appState.isEditingPatient;
  const unreadCount = appState.notifications.filter(n => !n.read).length;

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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* ── DESKTOP SIDEBAR ─────────────────────────────── */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar currentView={currentView} onChangeView={navigate} appState={appState} />
      </div>

      {/* ── MOBILE SIDEBAR DRAWER ───────────────────────── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 h-full"
            >
              <Sidebar currentView={currentView} onChangeView={navigate}
                isMobileMenuOpen={isSidebarOpen} setIsMobileMenuOpen={setIsSidebarOpen} appState={appState} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT AREA ───────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* ── MOBILE TOP BAR ──────────────────────────── */}
        {!isEditingPatient && (
          <header className="lg:hidden flex items-center justify-between px-4 py-3 shrink-0 z-30 sidebar-gradient">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl bg-white/10 active:bg-white/25 text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                  <FootIcon className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-white tracking-tight text-[15px]">{VIEW_LABELS[currentView]}</span>
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

        {/* ── PAGE CONTENT — visibility-based, no unmounting ── */}
        <main className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Always render once mounted, toggle visibility — instant tab switching */}
          {ALL_VIEWS.map(({ id }) => {
            if (!mountedViews.has(id)) return null;
            return (
              <div
                key={id}
                style={{ display: currentView === id ? 'block' : 'none' }}
                className="min-h-full"
              >
                {id === 'dashboard' && <DashboardView state={appState} onChangeView={navigate} />}
                {id === 'patients'  && <PatientsView  state={appState} />}
                {id === 'agenda'    && <AgendaView    state={appState} />}
                {id === 'inventory' && <InventoryView state={appState} />}
                {id === 'chatbot'   && <ChatbotView   state={appState} />}
                {id === 'reports'   && <ReportsView   state={appState} />}
                {id === 'profile'   && <ProfileView   state={appState} />}
                {id === 'billing'   && <BillingView   state={appState} />}
              </div>
            );
          })}
        </main>

        {/* ── MOBILE BOTTOM NAV — iOS-style premium ───────── */}
        {!isEditingPatient && (
          <nav className="lg:hidden shrink-0 z-30 relative">
            {/* More menu popup */}
            <AnimatePresence>
              {showMoreMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-30"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.92 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-full left-3 right-3 mb-3 bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/50 shadow-2xl p-4 z-40 grid grid-cols-3 gap-2"
                  >
                    <div className="col-span-3 flex items-center justify-between mb-1 px-1">
                      <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Más opciones</span>
                      <button onClick={() => setShowMoreMenu(false)} className="p-1 rounded-full bg-slate-100 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {MORE_VIEWS.map(item => (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all font-bold text-xs active:scale-95",
                          currentView === item.id
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
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

            {/* Bottom Tab Bar — Premium iOS style */}
            <div
              className="bg-white/90 backdrop-blur-xl border-t border-slate-200/60 flex items-stretch"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
            >
              {BOTTOM_NAV.map(item => {
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setShowMoreMenu(false); navigate(item.id); }}
                    className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-90"
                  >
                    <div className={cn(
                      "relative flex items-center justify-center w-10 h-7 rounded-2xl transition-all duration-200",
                      active ? "bg-emerald-100" : ""
                    )}>
                      <span className={cn("transition-colors duration-200", active ? "text-emerald-600" : "text-slate-400")}>
                        {item.icon}
                      </span>
                      {item.id === 'profile' && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold leading-none transition-colors duration-200",
                      active ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {item.label}
                    </span>
                    {/* Active indicator pill */}
                    {active && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 w-6 h-0.5 bg-emerald-500 rounded-full"
                      />
                    )}
                  </button>
                );
              })}
              {/* More button */}
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-90",
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-2xl transition-all duration-200",
                  showMoreMenu || MORE_VIEWS.some(v => v.id === currentView) ? "bg-emerald-100" : ""
                )}>
                  <span className={cn(
                    "transition-colors duration-200",
                    showMoreMenu || MORE_VIEWS.some(v => v.id === currentView) ? "text-emerald-600" : "text-slate-400"
                  )}>
                    {showMoreMenu
                      ? <X className="w-5 h-5" />
                      : <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/>
                        </svg>
                    }
                  </span>
                </div>
                <span className={cn(
                  "text-[10px] font-bold leading-none transition-colors duration-200",
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
