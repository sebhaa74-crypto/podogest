import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, CalendarDays, Package, Activity, Bot,
  UserCircle, Pencil, Check, Plus, Trash2, X as CloseIcon,
  LogOut, LifeBuoy, FileText, User, ChevronRight
} from 'lucide-react';
import { FootIcon } from './icons/FootIcon';
import { ViewState } from '../types';
import { cn } from '../lib/utils';
import { useAppState } from '../store';
import { supabase } from '../supabase';
import { ConfirmDialog } from './ConfirmDialog';
import { SupportModal } from './SupportModal';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
  appState: ReturnType<typeof useAppState>;
}

export function Sidebar({ currentView, onChangeView, isMobileMenuOpen, setIsMobileMenuOpen, appState }: SidebarProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>('');

  const [userEmail, setUserEmail] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        const emailLower = user.email.toLowerCase();
        setIsAdmin(emailLower === 'admin@podogest.cl' || emailLower === 'sebhaa74@gmail.com');
        const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
        setUserAvatar(avatar);
      }
    });
  }, []);

  const activeSpecialist = appState.specialists.find(s => s.id === appState.activeSpecialistId);
  const activeSpecialistName = activeSpecialist?.name || 'Especialista';

  const mainNav: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Panel Principal', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
    { id: 'patients', label: 'Pacientes', icon: <Users className="w-[18px] h-[18px]" /> },
    { id: 'inventory', label: 'Inventario', icon: <Package className="w-[18px] h-[18px]" /> },
    { id: 'billing', label: 'Facturación', icon: <FileText className="w-[18px] h-[18px]" /> },
  ];
  const bottomNav: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'chatbot', label: 'Chatbot IA', icon: <Bot className="w-[18px] h-[18px]" /> },
    { id: 'reports', label: 'Reportes', icon: <Activity className="w-[18px] h-[18px]" /> },
    { id: 'profile', label: 'Mi Perfil', icon: <User className="w-[18px] h-[18px]" /> },
  ];

  const handleEditStart = () => {
    const current = appState.specialists.find(s => s.id === appState.activeSpecialistId);
    if (current) { setEditingName(current.name); setIsEditingProfile(true); }
  };
  const handleEditSave = () => {
    if (editingName.trim()) appState.updateSpecialistName(appState.activeSpecialistId, editingName.trim());
    setIsEditingProfile(false);
  };
  const handleAddSave = () => {
    if (newProfileName.trim()) appState.addSpecialist(newProfileName.trim());
    setNewProfileName(''); setIsAddingProfile(false);
  };
  const navigate = (view: ViewState) => {
    onChangeView(view);
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const NavItem = ({ item }: { item: { id: ViewState; label: string; icon: React.ReactNode } }) => {
    const active = currentView === item.id;
    return (
      <button
        onClick={() => navigate(item.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left text-sm font-semibold relative group",
          active
            ? "nav-active text-white"
            : "text-emerald-200/80 hover:text-white hover:bg-white/10"
        )}
      >
        <span className={cn("transition-all", active ? "text-emerald-300" : "text-emerald-400/70 group-hover:text-emerald-300")}>
          {item.icon}
        </span>
        <span>{item.label}</span>
        {active && (
          <motion.span
            layoutId="nav-pill"
            className="absolute right-2 w-1.5 h-1.5 bg-emerald-300 rounded-full"
          />
        )}
      </button>
    );
  };

  return (
    <aside className={cn(
      "w-64 flex flex-col h-full relative z-50 shrink-0",
      "sidebar-gradient",
      "fixed lg:static inset-y-0 left-0 transform transition-transform duration-300 lg:translate-x-0",
      isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -translate-y-20 translate-x-20 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-32 h-32 bg-emerald-300/5 rounded-full -translate-x-16 pointer-events-none" />

      {/* Logo */}
      <div className="hidden lg:flex p-5 items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30">
          <FootIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight text-white leading-none">PodoGest</h1>
          <p className="text-emerald-400/70 text-[10px] font-medium tracking-widest uppercase">Clínica Pro</p>
        </div>
      </div>

      {/* Specialist Selector */}
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest mb-2">Perfil Activo</p>
        {isAdmin ? (
          isEditingProfile ? (
            <div className="flex items-center gap-1">
              <input
                type="text" value={editingName}
                onChange={e => setEditingName(e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg px-2 py-1.5 text-sm border border-white/20 focus:ring-1 focus:ring-emerald-400 outline-none"
                autoFocus onKeyDown={e => e.key === 'Enter' && handleEditSave()}
              />
              <button onClick={handleEditSave} className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-300"><Check className="w-4 h-4" /></button>
              <button onClick={() => setIsEditingProfile(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-rose-300"><CloseIcon className="w-4 h-4" /></button>
            </div>
          ) : isAddingProfile ? (
            <div className="flex items-center gap-1">
              <input
                type="text" placeholder="Nombre del especialista..."
                value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg px-2 py-1.5 text-sm border border-white/20 focus:ring-1 focus:ring-emerald-400 outline-none placeholder:text-emerald-300/40"
                autoFocus onKeyDown={e => e.key === 'Enter' && handleAddSave()}
              />
              <button onClick={handleAddSave} className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-300"><Check className="w-4 h-4" /></button>
              <button onClick={() => setIsAddingProfile(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-rose-300"><CloseIcon className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <select
                value={appState.activeSpecialistId}
                onChange={e => appState.setActiveSpecialistId(e.target.value)}
                className="flex-1 bg-white/10 text-white text-sm rounded-xl border border-white/20 px-2 py-2 cursor-pointer focus:ring-1 focus:ring-emerald-500 appearance-none outline-none min-w-0"
              >
                {appState.specialists.map(sp => (
                  <option key={sp.id} value={sp.id} style={{ background: '#064e3b' }}>{sp.name}</option>
                ))}
              </select>
              <button onClick={handleEditStart} className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-300/70 hover:text-emerald-200 transition-colors shrink-0" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setNewProfileName(''); setIsAddingProfile(true); }} className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-300/70 hover:text-emerald-200 transition-colors shrink-0" title="Agregar"><Plus className="w-3.5 h-3.5" /></button>
              {appState.specialists.length > 1 && (
                <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 hover:bg-white/10 rounded-lg text-rose-300/70 hover:text-rose-300 transition-colors shrink-0" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          )
        ) : (
          <div className="flex items-center gap-2.5 bg-white/10 border border-white/10 rounded-xl px-3 py-2">
            {userAvatar ? (
              <img src={userAvatar} className="w-6 h-6 rounded-full object-cover" alt={activeSpecialistName} />
            ) : (
              <UserCircle className="w-5 h-5 text-emerald-300 shrink-0" />
            )}
            <span className="text-sm font-semibold text-white truncate">{activeSpecialistName}</span>
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 pt-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        <p className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest px-1 mb-2">Principal</p>
        {mainNav.map(item => <NavItem key={item.id} item={item} />)}
        
        <p className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest px-1 mb-2 pt-4">Herramientas</p>
        {bottomNav.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-2 border-t border-white/10 space-y-0.5">
        <button
          onClick={() => { setShowSupportModal(true); if (setIsMobileMenuOpen) setIsMobileMenuOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-emerald-300/70 hover:text-white hover:bg-white/10 transition-all text-left text-sm font-semibold"
        >
          <LifeBuoy className="w-[18px] h-[18px]" />
          <span>Soporte</span>
        </button>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-300/70 hover:text-rose-200 hover:bg-rose-500/10 transition-all text-left text-sm font-semibold"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <div className="px-4 pb-3 text-[10px] text-emerald-400/30 text-center font-medium tracking-wider">
        PODOGEST v1.0 · 2026
      </div>

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} userEmail={userEmail} />

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas cerrar tu sesión en PodoGest?"
        confirmText="Cerrar Sesión" cancelText="Cancelar"
        onConfirm={async () => { setShowLogoutConfirm(false); await supabase.auth.signOut(); }}
        onCancel={() => setShowLogoutConfirm(false)}
        isDestructive={true}
      />
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="¿Eliminar Especialista?"
        message={`¿Deseas eliminar el perfil de "${appState.specialists.find(s => s.id === appState.activeSpecialistId)?.name || 'Especialista'}"?`}
        confirmText="Eliminar" cancelText="Cancelar"
        onConfirm={() => { appState.deleteSpecialist(appState.activeSpecialistId); setShowDeleteConfirm(false); }}
        onCancel={() => setShowDeleteConfirm(false)}
        isDestructive={true}
      />
    </aside>
  );
}
