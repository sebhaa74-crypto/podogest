import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Info, Trash2, Smartphone, Calendar, DollarSign, Package, Settings, CheckCircle2, Filter } from 'lucide-react';
import { Notification as AppNotification } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onClearRead: () => void;
}

const CATEGORY_CONFIG = {
  appointment: { label: 'Citas', icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  payment:     { label: 'Pagos', icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  stock:       { label: 'Inventario', icon: <Package className="w-3.5 h-3.5" />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  system:      { label: 'Sistema', icon: <Settings className="w-3.5 h-3.5" />, color: 'text-slate-500', bg: 'bg-slate-500/10' },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  info:    <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
  alert:   <AlertCircle className="w-5 h-5 text-red-500" />,
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
};

const TYPE_BG: Record<string, string> = {
  info:    'bg-gradient-to-r from-blue-500/5 to-transparent border-l-blue-500',
  warning: 'bg-gradient-to-r from-amber-500/5 to-transparent border-l-amber-500',
  alert:   'bg-gradient-to-r from-red-500/5 to-transparent border-l-red-500',
  success: 'bg-gradient-to-r from-emerald-500/5 to-transparent border-l-emerald-500',
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

export function NotificationCenter({ notifications, onMarkRead, onClearRead }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [filterCat, setFilterCat] = useState<string>('all');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(window.Notification.permission);
    }
  }, [isOpen]);

  const requestPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      window.Notification.requestPermission().then(p => setPermission(p));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  // Limit rendered notifications to prevent freezing if there is an infinite loop history
  const filtered = notifications
    .filter(n => filterCat === 'all' || n.category === filterCat)
    .slice(0, 50);

  const categories = Array.from(new Set(notifications.map(n => n.category).filter(Boolean)));

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white/50 backdrop-blur-md border border-slate-200/50 text-slate-600 hover:bg-white hover:shadow-lg transition-all"
      >
        <Bell className={cn("w-5 h-5 transition-transform", isOpen && "text-emerald-600 scale-110")} />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 text-[10px] font-bold text-white shadow-md ring-2 ring-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute right-0 mt-4 w-[90vw] max-w-sm sm:w-96 z-50 bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white/40 shadow-2xl overflow-hidden -mr-2 lg:mr-0"
            >
              {/* Header Premium */}
              <div className="p-5 border-b border-slate-200/50 bg-white/50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    Notificaciones
                    {unreadCount > 0 && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    {notifications.some(n => n.read) && (
                      <button
                        onClick={onClearRead}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Limpiar leídas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {notifications.length > 0 && notifications.some(n => !n.read) && (
                      <button
                        onClick={() => notifications.filter(n => !n.read).forEach(n => onMarkRead(n.id))}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Marcar todas como leídas"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category filter pills */}
                {categories.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      onClick={() => setFilterCat('all')}
                      className={cn('shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all',
                        filterCat === 'all' ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      )}
                    >
                      Todas
                    </button>
                    {categories.map(cat => {
                      const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
                      if (!cfg) return null;
                      return (
                        <button
                          key={cat}
                          onClick={() => setFilterCat(cat!)}
                          className={cn('shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all',
                            filterCat === cat ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          )}
                        >
                          {cfg.icon} {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Permission banner */}
              {permission === 'default' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                      Activa las notificaciones del navegador para recibir alertas en tiempo real incluso si la app está cerrada.
                    </p>
                  </div>
                  <button
                    onClick={requestPermission}
                    className="w-full text-xs bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 font-bold py-2 px-3 rounded-xl transition-all shadow-sm"
                  >
                    Habilitar Permisos
                  </button>
                </div>
              )}

              {/* Notification list */}
              <div className="max-h-[400px] overflow-y-auto overflow-x-hidden no-scrollbar bg-white/50">
                {filtered.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="text-slate-700 font-bold mb-1">Todo al día</h4>
                    <p className="text-slate-400 text-sm">No tienes notificaciones pendientes.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filtered.map((notif) => {
                      const catCfg = notif.category ? CATEGORY_CONFIG[notif.category] : null;
                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={notif.id}
                          className={cn(
                            'p-4 transition-all relative group cursor-pointer hover:bg-white',
                            !notif.read ? 'bg-slate-50/50' : 'bg-transparent',
                            !notif.read && TYPE_BG[notif.type] ? `${TYPE_BG[notif.type]} border-l-[3px]` : 'border-l-[3px] border-transparent'
                          )}
                          onClick={() => !notif.read && onMarkRead(notif.id)}
                        >
                          <div className="flex gap-4">
                            <div className={cn('shrink-0 mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm', catCfg?.bg || 'bg-slate-100')}>
                              {catCfg ? catCfg.icon : TYPE_ICON[notif.type]}
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                              <p className={cn("text-sm mb-0.5", !notif.read ? "font-extrabold text-slate-800" : "font-semibold text-slate-600")}>
                                {notif.title}
                              </p>
                              <p className={cn("text-xs leading-relaxed", !notif.read ? "text-slate-600 font-medium" : "text-slate-500")}>
                                {notif.message}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-2 font-semibold tracking-wider uppercase">
                                {timeAgo(notif.timestamp)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Hover Action */}
                          {!notif.read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Footer Gradient */}
              <div className="h-6 w-full bg-gradient-to-t from-white to-transparent absolute bottom-0 pointer-events-none"></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
