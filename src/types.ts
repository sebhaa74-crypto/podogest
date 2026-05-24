export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  registeredAt: string;
  notes: string;
  lastVisit?: string;
  specialistId?: string;
}

export type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  treatmentType: string;
  notes: string;
  cost: number;
  paid: boolean;
  paymentMethod?: 'cash' | 'transfer';
  status: AppointmentStatus;
  reminderSent?: boolean;
  reminder15mSent?: boolean;
  unpaidReminderLevel?: number;
  specialistId?: string;
}

export interface Treatment {
  id: string;
  name: string;
  cost: number;
  specialistId?: string;
}

export interface SaleItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  date: string; // ISO string
  items: SaleItem[];
  total: number;
  type: 'treatment';
  paymentMethod?: 'cash' | 'transfer';
  patientId?: string;
  specialistId?: string;
  appointmentId?: string;
}

export interface Supply {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  specialistId?: string;
}

export type ViewState = 'dashboard' | 'patients' | 'agenda' | 'inventory' | 'chatbot' | 'reports' | 'profile' | 'billing';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  category?: 'appointment' | 'payment' | 'stock' | 'system';
  timestamp: string;
  read: boolean;
  link?: ViewState;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  number: string;
  patientId: string;
  patientName: string;
  specialistId: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  notes?: string;
  paymentMethod?: 'cash' | 'transfer';
  paidAt?: string;
}
