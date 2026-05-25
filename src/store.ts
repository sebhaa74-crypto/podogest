import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Patient, Appointment, Sale, AppointmentStatus, Notification as AppNotification, Treatment, Supply } from './types';

export function useAppState() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState<boolean>(true);
  const [specialists, setSpecialists] = useState<{id: string, name: string}[]>([]);
  const [activeSpecialistId, setActiveSpecialistId] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();

    // Basic realtime setup
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, activeSpecialistId]);

  const fetchData = async () => {
    const fetchTable = async (table: string) => {
      let query = supabase.from(table).select('*');
      
      if (activeSpecialistId !== 'admin') {
        // Solo los pacientes y las ventas son estrictamente privados
        if (table === 'patients' || table === 'sales') {
          query = query.or(`specialist_id.eq.${activeSpecialistId},specialist_id.eq.admin,specialist_id.is.null`);
        }
      }
      
      const { data } = await query;
      return data || [];
    };

    const [pats, appts, sls, trts, sups, specs] = await Promise.all([
      fetchTable('patients'),
      fetchTable('appointments'),
      fetchTable('sales'),
      fetchTable('treatments'),
      fetchTable('supplies'),
      supabase.from('specialists').select('*')
    ]);

    // TEMPORARY INJECTION - Se ejecuta una vez si es admin
    if (activeSpecialistId === 'admin') {
      const checkYarella = await supabase.from('specialists').select('id').ilike('name', '%Yarella%');
      if (checkYarella.data && checkYarella.data.length === 0) {
        console.log("Injecting Yarella patients...");
        const yarellaId = 'esp-yarella-123';
        await supabase.from('specialists').insert({ id: yarellaId, name: 'Yarella' });
        
        const dataToInsert = [
          { name: 'Nelly', phone: '+56 9 8900 0230', time: '17:30' },
          { name: 'Carmen Gloria', phone: '+56 9 5987 7839', time: '16:45' },
          { name: 'Marioly Astete', phone: '+56 9 5678 5766', time: '16:00' },
          { name: 'Héctor gallardo', phone: '+56 9 6842 8699', time: '15:00' }
        ];

        for (const p of dataToInsert) {
          const pId = 'pat-yarella-' + p.time.replace(':','');
          await supabase.from('patients').insert({
            id: pId, name: p.name, phone: p.phone, email: '', notes: 'Añadido automáticamente', specialist_id: yarellaId
          });
          await supabase.from('appointments').insert({
            id: 'apt-yarella-' + p.time.replace(':',''), patient_id: pId, specialist_id: yarellaId,
            date: '2026-05-25', time: p.time, treatment_type: 'Consulta General', status: 'pending'
          });
        }
        console.log("Injection complete! Fetching again...");
        fetchTable('patients').then(res => setPatients(res.map((p: any) => ({ ...p, registeredAt: p.registered_at, lastVisit: p.last_visit, specialistId: p.specialist_id }))));
        fetchTable('appointments').then(res => setAppointments(res.map((a: any) => ({ ...a, patientId: a.patient_id, treatmentType: a.treatment_type, paymentMethod: a.payment_method, reminderSent: a.reminder_sent, reminder15mSent: a.reminder_15m_sent, unpaidReminderLevel: a.unpaid_reminder_level, specialistId: a.specialist_id }))));
      }
    }


    let specialistsData = specs.data || [];
    if (activeSpecialistId && activeSpecialistId !== 'admin' && !specialistsData.find((s: any) => s.id === activeSpecialistId)) {
       await supabase.from('specialists').insert({ id: activeSpecialistId, name: 'Especialista' });
       specialistsData.push({ id: activeSpecialistId, name: 'Especialista' });
    } else if (activeSpecialistId === 'admin' && !specialistsData.find((s: any) => s.id === 'admin')) {
       await supabase.from('specialists').insert({ id: 'admin', name: 'Administrador (Acceso Total)', is_admin_profile: true });
       specialistsData.push({ id: 'admin', name: 'Administrador (Acceso Total)' });
    }

    // Map snake_case to camelCase
    setPatients(pats.map((p: any) => ({ ...p, registeredAt: p.registered_at, lastVisit: p.last_visit, specialistId: p.specialist_id })));
    setAppointments(appts.map((a: any) => ({ ...a, patientId: a.patient_id, treatmentType: a.treatment_type, paymentMethod: a.payment_method, reminderSent: a.reminder_sent, reminder15mSent: a.reminder_15m_sent, unpaidReminderLevel: a.unpaid_reminder_level, specialistId: a.specialist_id })));
    setSales(sls.map((s: any) => ({ ...s, paymentMethod: s.payment_method, patientId: s.patient_id, specialistId: s.specialist_id, appointmentId: s.appointment_id })));
    setTreatments(trts.map((t: any) => ({ ...t, specialistId: t.specialist_id })));
    setSupplies(sups.map((s: any) => ({ ...s, minStock: s.min_stock, specialistId: s.specialist_id })));
    setSpecialists(specialistsData.map((s: any) => ({ id: s.id, name: s.name })));
  };

  const fireNativeNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'granted') {
        new window.Notification(title, { body });
      }
    }
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = { ...notif, id: Date.now().toString(), timestamp: new Date().toISOString(), read: false };
    setNotifications(prev => [newNotif, ...prev]);
    fireNativeNotification(newNotif.title, newNotif.message);
  };
  const markAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const clearRead = () => setNotifications(prev => prev.filter(n => !n.read));

  const addPatient = async (patient: any) => {
    await supabase.from('patients').insert({
      name: patient.name, phone: patient.phone, email: patient.email, notes: patient.notes,
      specialist_id: activeSpecialistId
    });
    await fetchData();
  };

  const updatePatient = async (id: string, updates: any) => {
    const snakeUpdates: any = {};
    if (updates.name) snakeUpdates.name = updates.name;
    if (updates.phone) snakeUpdates.phone = updates.phone;
    if (updates.email) snakeUpdates.email = updates.email;
    if (updates.notes) snakeUpdates.notes = updates.notes;
    await supabase.from('patients').update(snakeUpdates).eq('id', id);
    await fetchData();
  };

  const deletePatient = async (id: string) => {
    await supabase.from('patients').delete().eq('id', id);
    await fetchData();
  };

  const addAppointment = async (appointment: any, newPatient?: any) => {
    let finalPatientId = appointment.patientId;
    if (newPatient) {
      const { data } = await supabase.from('patients').insert({
        name: newPatient.name, phone: newPatient.phone, email: newPatient.email, notes: newPatient.notes,
        specialist_id: activeSpecialistId
      }).select();
      if (data && data[0]) finalPatientId = data[0].id;
    }
    await supabase.from('appointments').insert({
      patient_id: finalPatientId, date: appointment.date, time: appointment.time,
      treatment_type: appointment.treatmentType, notes: appointment.notes, cost: appointment.cost,
      specialist_id: activeSpecialistId
    });
    await fetchData();
  };

  const updateAppointment = async (id: string, updates: any) => {
    const snakeUpdates: any = {};
    if (updates.date) snakeUpdates.date = updates.date;
    if (updates.time) snakeUpdates.time = updates.time;
    if (updates.treatmentType) snakeUpdates.treatment_type = updates.treatmentType;
    if (updates.notes) snakeUpdates.notes = updates.notes;
    if (updates.cost) snakeUpdates.cost = updates.cost;
    await supabase.from('appointments').update(snakeUpdates).eq('id', id);
    await fetchData();
  };

  const deleteAppointment = async (id: string) => {
    await supabase.from('appointments').delete().eq('id', id);
    await fetchData();
  };

  const updateAppointmentStatus = async (id: string, status: AppointmentStatus, paid: boolean, paymentMethod?: string) => {
    await supabase.from('appointments').update({ status, paid, payment_method: paymentMethod }).eq('id', id);
    await fetchData();
  };

  const addSupply = async (supply: any) => {
    await supabase.from('supplies').insert({
      name: supply.name, stock: supply.stock, min_stock: supply.minStock, unit: supply.unit,
      specialist_id: activeSpecialistId
    });
    await fetchData();
  };

  const updateSupply = async (id: string, updates: any) => {
    await supabase.from('supplies').update({
      name: updates.name, stock: updates.stock, min_stock: updates.minStock, unit: updates.unit
    }).eq('id', id);
    await fetchData();
  };

  const deleteSupply = async (id: string) => {
    await supabase.from('supplies').delete().eq('id', id);
    await fetchData();
  };

  const updateSupplyStock = async (id: string, stock: number) => {
    await supabase.from('supplies').update({ stock }).eq('id', id);
    await fetchData();
  };

  const addTreatment = async (treatment: any) => {
    await supabase.from('treatments').insert({
      name: treatment.name, cost: treatment.cost, specialist_id: activeSpecialistId
    });
    await fetchData();
  };

  const updateTreatment = async (id: string, updates: any) => {
    await supabase.from('treatments').update(updates).eq('id', id);
    await fetchData();
  };

  const deleteTreatment = async (id: string) => {
    await supabase.from('treatments').delete().eq('id', id);
    await fetchData();
  };

  const addSale = async (sale: any) => {
    await supabase.from('sales').insert({
      total: sale.total, type: sale.type, payment_method: sale.paymentMethod, patient_id: sale.patientId,
      specialist_id: activeSpecialistId, appointment_id: sale.appointmentId
    });
    await fetchData();
  };

  const updateSpecialistName = async (id: string, name: string) => {
    await supabase.from('specialists').update({ name }).eq('id', id);
    await fetchData();
  };

  const addSpecialist = async (name: string) => {
    await supabase.from('specialists').insert({ id: `esp-${Date.now()}`, name });
    await fetchData();
  };

  const deleteSpecialist = async (id: string) => {
    const { error } = await supabase.from('specialists').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert(`No se pudo eliminar: ${error.message}`);
    } else {
      await fetchData();
    }
  };

  return {
    patients, addPatient, updatePatient, deletePatient,
    appointments, addAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus,
    supplies, addSupply, updateSupply, deleteSupply, updateSupplyStock,
    treatments, addTreatment, updateTreatment, deleteTreatment,
    sales, addSale,
    notifications, addNotification, markAsRead, clearRead,
    isEditingPatient, setIsEditingPatient,
    specialists, activeSpecialistId, setActiveSpecialistId,
    updateSpecialistName, addSpecialist, deleteSpecialist,
    autoRemindersEnabled, setAutoRemindersEnabled
  };
}
