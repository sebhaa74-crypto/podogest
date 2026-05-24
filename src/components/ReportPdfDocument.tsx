import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Color Palette ────────────────────────────────────────
const C = {
  emerald900: '#064e3b',
  emerald700: '#047857',
  emerald600: '#059669',
  emerald100: '#d1fae5',
  emerald50:  '#ecfdf5',
  indigo600:  '#4f46e5',
  indigo50:   '#eef2ff',
  slate800:   '#1e293b',
  slate700:   '#334155',
  slate600:   '#475569',
  slate500:   '#64748b',
  slate400:   '#94a3b8',
  slate200:   '#e2e8f0',
  slate100:   '#f1f5f9',
  slate50:    '#f8fafc',
  white:      '#ffffff',
  amber50:    '#fffbeb',
  amber700:   '#b45309',
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: C.white,
    paddingTop: 0,
    paddingBottom: 50,
    paddingHorizontal: 0,
    fontFamily: 'Helvetica',
  },

  // ── Header Band ──
  headerBand: {
    backgroundColor: C.emerald900,
    padding: 28,
    paddingTop: 24,
    paddingBottom: 24,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerBrand: {
    color: C.white,
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  headerTagline: {
    color: C.emerald100,
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 1,
  },
  headerDocType: {
    color: C.emerald100,
    fontSize: 10,
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  headerDocTitle: {
    color: C.white,
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    marginTop: 3,
  },
  headerMonth: {
    color: '#6ee7b7',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // ── Green accent bar ──
  accentBar: {
    backgroundColor: C.emerald600,
    height: 4,
    marginBottom: 20,
  },

  // ── Content wrapper ──
  content: {
    paddingHorizontal: 28,
  },

  // ── Section ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionDot: {
    width: 8,
    height: 8,
    backgroundColor: C.emerald600,
    borderRadius: 4,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.slate700,
    letterSpacing: 0.3,
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
    marginBottom: 12,
  },

  // ── KPI Grid ──
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  kpiEmerald: {
    backgroundColor: C.emerald50,
    borderColor: C.emerald100,
  },
  kpiIndigo: {
    backgroundColor: C.indigo50,
    borderColor: '#c7d2fe',
  },
  kpiSlate: {
    backgroundColor: C.slate50,
    borderColor: C.slate200,
  },
  kpiLabel: {
    fontSize: 8,
    color: C.slate500,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.slate800,
  },
  kpiSub: {
    fontSize: 7,
    color: C.slate400,
    marginTop: 2,
  },

  // ── Payment Summary ──
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  paymentBox: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paymentLabel: {
    fontSize: 9,
    color: C.slate500,
  },
  paymentAmount: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.slate800,
  },
  paymentPct: {
    fontSize: 8,
    color: C.slate400,
  },

  // ── Table ──
  table: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.slate200,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.slate800,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    color: C.white,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
  },
  tableRowAlt: {
    backgroundColor: C.slate50,
  },
  tableCell: {
    fontSize: 8,
    color: C.slate600,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.slate800,
  },
  tableCellGreen: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.emerald700,
  },

  // Column widths
  colDate:    { width: '13%' },
  colPatient: { width: '24%' },
  colTreat:   { width: '30%' },
  colSpec:    { width: '18%' },
  colPay:     { width: '9%' },
  colAmt:     { width: '13%', textAlign: 'right' },

  // ── Totals Row ──
  totalsRow: {
    flexDirection: 'row',
    backgroundColor: C.emerald900,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  totalsLabel: {
    color: C.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  totalsValue: {
    color: '#6ee7b7',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Note box ──
  noteBox: {
    backgroundColor: C.amber50,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
    flexDirection: 'row',
    gap: 6,
  },
  noteText: {
    fontSize: 8,
    color: C.amber700,
    flex: 1,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.slate200,
  },
  footerText: {
    fontSize: 7,
    color: C.slate400,
  },
  footerBrand: {
    fontSize: 7,
    color: C.emerald600,
    fontFamily: 'Helvetica-Bold',
  },
});

interface Props {
  monthStr: string;
  monthKey: string;
  totalIncomeMonth: number;
  cashIncome: number;
  transferIncome: number;
  totalIncomeAllTime: number;
  avgTicket: number;
  totalAppointmentsMonth: number;
  totalAppointmentsAllTime: number;
  appointments: any[];
  patients: any[];
  specialists?: any[];
}

export const ReportPdfDocument: React.FC<Props> = ({
  monthStr, monthKey,
  totalIncomeMonth, cashIncome, transferIncome,
  totalIncomeAllTime, avgTicket,
  totalAppointmentsMonth, totalAppointmentsAllTime,
  appointments, patients, specialists = [],
}) => {
  const generatedAt = format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es });
  const paidAppts = appointments.filter(a => a.status === 'completed' && a.paid);
  const cashPct = totalIncomeMonth > 0 ? Math.round(cashIncome / totalIncomeMonth * 100) : 0;
  const transferPct = 100 - cashPct;

  return (
    <Document title={`Reporte Contable — ${monthStr}`} author="PodoGest" subject="Resumen Mensual">
      <Page size="A4" style={styles.page}>

        {/* ── HEADER ── */}
        <View style={styles.headerBand}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerBrand}>PodoGest</Text>
              <Text style={styles.headerTagline}>SISTEMA DE GESTIÓN DE CLÍNICA PODOLÓGICA</Text>
            </View>
            <View>
              <Text style={styles.headerDocType}>RESUMEN CONTABLE MENSUAL</Text>
              <Text style={styles.headerDocTitle}>{monthStr.toUpperCase()}</Text>
              <Text style={styles.headerMonth}>Período: {monthKey}</Text>
            </View>
          </View>
        </View>
        <View style={styles.accentBar} />

        <View style={styles.content}>

          {/* ── KPI SUMMARY ── */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>RESUMEN EJECUTIVO DEL MES</Text>
          </View>
          <View style={styles.sectionDivider} />

          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, styles.kpiEmerald]}>
              <Text style={styles.kpiLabel}>INGRESOS DEL MES</Text>
              <Text style={styles.kpiValue}>{formatCurrency(totalIncomeMonth)}</Text>
              <Text style={styles.kpiSub}>{totalAppointmentsMonth} atenciones cobradas</Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiSlate]}>
              <Text style={styles.kpiLabel}>INGRESOS HISTÓRICOS</Text>
              <Text style={styles.kpiValue}>{formatCurrency(totalIncomeAllTime)}</Text>
              <Text style={styles.kpiSub}>{totalAppointmentsAllTime} atenciones totales</Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiSlate]}>
              <Text style={styles.kpiLabel}>TICKET PROMEDIO</Text>
              <Text style={styles.kpiValue}>{formatCurrency(avgTicket)}</Text>
              <Text style={styles.kpiSub}>Por atención pagada</Text>
            </View>
          </View>

          {/* ── PAYMENT BREAKDOWN ── */}
          <View style={[styles.sectionHeader, { marginTop: 14 }]}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>DESGLOSE POR MEDIO DE PAGO</Text>
          </View>
          <View style={styles.sectionDivider} />

          <View style={styles.paymentRow}>
            <View style={[styles.paymentBox, styles.kpiEmerald]}>
              <View style={[styles.paymentDot, { backgroundColor: C.emerald600 }]} />
              <View>
                <Text style={styles.paymentLabel}>EFECTIVO</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(cashIncome)}</Text>
                <Text style={styles.paymentPct}>{cashPct}% del total del mes</Text>
              </View>
            </View>
            <View style={[styles.paymentBox, styles.kpiIndigo]}>
              <View style={[styles.paymentDot, { backgroundColor: C.indigo600 }]} />
              <View>
                <Text style={styles.paymentLabel}>TRANSFERENCIA</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(transferIncome)}</Text>
                <Text style={styles.paymentPct}>{transferPct}% del total del mes</Text>
              </View>
            </View>
          </View>

          {/* ── APPOINTMENTS TABLE ── */}
          <View style={[styles.sectionHeader, { marginTop: 14 }]}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>DETALLE DE ATENCIONES COBRADAS</Text>
          </View>
          <View style={styles.sectionDivider} />

          {paidAppts.length === 0 ? (
            <View style={[styles.noteBox, { backgroundColor: C.slate50, borderColor: C.slate200 }]}>
              <Text style={[styles.noteText, { color: C.slate500 }]}>No hay atenciones cobradas registradas para este período.</Text>
            </View>
          ) : (
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colDate]}>FECHA</Text>
                <Text style={[styles.tableHeaderCell, styles.colPatient]}>PACIENTE</Text>
                <Text style={[styles.tableHeaderCell, styles.colTreat]}>TRATAMIENTO</Text>
                <Text style={[styles.tableHeaderCell, styles.colSpec]}>ESPECIALISTA</Text>
                <Text style={[styles.tableHeaderCell, styles.colPay]}>PAGO</Text>
                <Text style={[styles.tableHeaderCell, styles.colAmt]}>MONTO</Text>
              </View>

              {/* Rows */}
              {paidAppts
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((appt, i) => {
                  const patient = patients.find(p => p.id === appt.patientId);
                  const spec = specialists.find(s => s.id === appt.specialistId);
                  const isAlt = i % 2 !== 0;
                  return (
                    <View key={appt.id || i} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                      <Text style={[styles.tableCell, styles.colDate]}>{appt.date}</Text>
                      <Text style={[styles.tableCellBold, styles.colPatient]}>{patient?.name || 'Desconocido'}</Text>
                      <Text style={[styles.tableCell, styles.colTreat]}>{appt.treatmentType || 'No especificado'}</Text>
                      <Text style={[styles.tableCell, styles.colSpec]}>{spec?.name || '—'}</Text>
                      <Text style={[styles.tableCell, styles.colPay]}>{appt.paymentMethod === 'cash' ? 'Efec.' : 'Trans.'}</Text>
                      <Text style={[styles.tableCellGreen, styles.colAmt]}>{formatCurrency(appt.cost || 0)}</Text>
                    </View>
                  );
                })}

              {/* Totals row */}
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>TOTAL DEL MES ({paidAppts.length} atenciones)</Text>
                <Text style={styles.totalsValue}>{formatCurrency(totalIncomeMonth)}</Text>
              </View>
            </View>
          )}

          {/* ── NOTA LEGAL ── */}
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              ⚠️  Este documento es un resumen interno generado por PodoGest con fines de control contable y gestión clínica. 
              No constituye una factura legal ni un documento tributario oficial. Para declaraciones de impuestos, consulte a un contador autorizado.
            </Text>
          </View>

        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>PodoGest · Sistema de Gestión de Clínica</Text>
          <Text style={styles.footerText}>Generado el {generatedAt}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
};

export default ReportPdfDocument;
