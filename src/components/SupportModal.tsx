import React, { useState } from 'react';
import { Mail, X, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

export function SupportModal({ isOpen, onClose, userEmail }: SupportModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    
    setIsSending(true);
    try {
      await supabase.from('supportTickets').insert({
        subject,
        message,
        userEmail: userEmail || 'unknown',
        createdAt: new Date().toISOString(),
        status: 'open'
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSubject('');
        setMessage('');
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error sending support ticket:", err);
      // Fallback to auto-open email client if Firebase fails
      window.location.href = `mailto:Sebhaa74@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />

          {/* Slide-over panel */}
          <motion.div 
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="bg-white w-full max-w-md h-full shadow-2xl relative z-10 flex flex-col"
          >
            {/* Header Area */}
            <div className="bg-emerald-700/95 flex-shrink-0 p-6 relative overflow-hidden text-emerald-50">
              <div className="absolute -bottom-10 -right-10 opacity-10">
                <Mail className="w-48 h-48 transform rotate-12" />
              </div>
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Soporte Técnico</h2>
                    <p className="text-emerald-100/90 text-sm mt-0.5">Estamos aquí para ayudarte</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 -mr-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  aria-label="Cerrar soporte"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Scrollable Content Form Section */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col bg-slate-50">
              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center py-12 flex-1"
                >
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border-8 border-emerald-50 mb-6 shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">¡Recibido con éxito!</h3>
                  <p className="text-slate-500 mt-2 max-w-[250px] mx-auto text-sm leading-relaxed">
                    Hemos registrado tu solicitud. Nos pondremos en contacto contigo a la brevedad.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSend} className="space-y-5 flex-1 flex flex-col">
                  
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-2">
                    <p className="text-emerald-800 text-sm leading-relaxed">
                      ¿Tienes dudas, problemas técnicos o sugerencias? Déjanos un mensaje y te responderemos pronto.
                    </p>
                  </div>

                  <div className="space-y-1.5 flex-shrink-0">
                    <label className="text-sm font-bold text-slate-700 tracking-tight">Asunto</label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ej. Problema con los reportes..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-800 font-medium shadow-sm bg-white"
                    />
                  </div>
                  
                  <div className="space-y-1.5 flex-1 flex flex-col min-h-[200px]">
                    <label className="text-sm font-bold text-slate-700 tracking-tight">Mensaje</label>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe de forma detallada tu problema o sugerencia..."
                      className="w-full flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-800 font-medium resize-none shadow-sm bg-white"
                    />
                  </div>

                  <div className="pt-4 flex-shrink-0 pb-safe">
                    <button
                      type="submit"
                      disabled={isSending || !subject.trim() || !message.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isSending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Enviando...
                        </span>
                      ) : (
                        <>
                          <Send className="w-5 h-5" /> Enviar Mensaje
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
