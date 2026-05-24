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
  appointment: { label: 'Citas', icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-blue-500', bg: 'bg-blue-50' },
  payment:     { label: 'Pagos', icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  stock:       { label: 'Inventario', icon: <Package className="w-3.5 h-3.5" />, color: 'text-amber-500', bg: 'bg-amber-50' },
  system:      { label: 'Sistema', icon: <Settings className="w-3.5 h-3.5" />, color: 'text-slate-500', bg: 'bg-slate-50' },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  info:    <Info className="w-4 h-4 text-blue-500" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-500" />,
  alert:   <AlertCircle className="w-4 h-4 text-red-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};

const TYPE_BG: Record<string, string> = {
  info:    'bg-blue-50/50',
  warning: 'bg-amber-50/50',
  alert:   'bg-red-50/50',
  success: 'bg-emerald-50/50',
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

  const filtered = notifications.filter(n =>
    filterCat === 'all' || n.category === filterCat
  );

  const categories = Array.from(new Set(notifications.map(n => n.category).filter(Boolean)));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Bell className={cn("w-5 h-5 transition-all", isOpen && "text-emerald-600")} />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-[90vw] max-w-sm sm:w-96 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden -mr-2 lg:mr-0"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-600" />
                    Notificaciones
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    {notifications.some(n => n.read) && (
                      <button
                        onClick={onClearRead}
                        className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Limpiar
                      </button>
                    )}
                    {notifications.length > 0 && notifications.some(n => !n.read) && (
                      <button
                        onClick={() => notifications.filter(n => !n.read).forEach(n => onMarkRead(n.id))}
                        className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium transition-colors"
                      >
                        <Check className="w-3 h-3" /> Leer todas
                      </button>
                    )}
                  </div>
                </div>

                {/* Category filter pills */}
                {categories.length > 0 && (
                  <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5">
                    <button
                      onClick={() => setFilterCat('all')}
                      className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all',
                        filterCat === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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
                          className={cn('shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all',
                            filterCat === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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
                <div className="bg-blue-50 p-3 border-b border-blue-100 flex flex-col gap-2">
                  <p className="text-xs text-blue-800">
                    Activa las notificaciones del navegador para recibir alertas en tiempo real.
                  </p>
                  <button
                    onClick={requestPermission}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Habilitar Permisos
                  </button>
                </div>
              )}

              {/* Notification list */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No hay notificaciones.</p>
                  </div>
                ) : (
                  filtered.map((notif) => {
                    const catCfg = notif.category ? CATEGORY_CONFIG[notif.category] : null;
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'p-4 transition-colors relative',
                          !notif.read ? TYPE_BG[notif.type] || 'bg-white' : 'bg-white',
                        )}
                      >
                        {!notif.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 rounded-full" />
                        )}
                        <div className="flex gap-3">
                          <div className={cn('shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center', catCfg?.bg || 'bg-slate-50')}>
                            {catCfg ? (
                              <span className={catCfg.color}>{catCfg.icon}</span>
                            ) : (
                              TYPE_ICON[notif.type] || <Info className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-0.5">
                              <p className={cn(
                                'text-sm font-semibold leading-tight',
                                !notif.read ? 'text-slate-800' : 'text-slate-400'
                              )}>
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <button
                                  onClick={() => onMarkRead(notif.id)}
                                  className="shrink-0 text-emerald-600 hover:text-emerald-700 p-0.5 rounded-full hover:bg-emerald-50 transition-colors"
                                  title="Marcar leída"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <p className="text-[10px] text-slate-400">{timeAgo(notif.timestamp)}</p>
                              {catCfg && (
                                <span className={cn('flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', catCfg.bg, catCfg.color)}>
                                  {catCfg.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
