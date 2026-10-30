import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RentalUnit, ExecutiveKPIs, DecisionAlert, PropertyLocation, AppLanguage } from '../types/rents';
import { formatUSD } from './rentsCalculations';
import { RENT_TRANSLATIONS } from '../locales/rentsTranslations';

interface ExportRentScorecardOptions {
  units: RentalUnit[];
  kpis: ExecutiveKPIs;
  alerts: DecisionAlert[];
  location: PropertyLocation | 'Global';
  periodName: string;
  language: AppLanguage;
  auditorName?: string;
}

export function exportRentScorecardPdf({
  units,
  kpis,
  alerts,
  location,
  periodName,
  language,
  auditorName = 'Asset Management Directorate'
}: ExportRentScorecardOptions): string {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const t = RENT_TRANSLATIONS[language];
  const now = new Date();
  const dateStr = now.toLocaleDateString(language === 'es' ? 'es-GT' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString();

  // 1. BANNER INSTITUCIONAL EJECUTIVO
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, 8, 251, 24, 'F');
  
  // Acento de color según sede
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(14, 8, 4, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    language === 'es' 
      ? 'PORTAFOLIO GLOBAL DE RENTAS Y TABLERO DIRECTIVO EJECUTIVO' 
      : 'GLOBAL RENTAL PORTFOLIO & EXECUTIVE KPI SCORECARD',
    24, 15
  );

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    language === 'es'
      ? `Consolidación de Sedes: California (CA) • Oklahoma City (OKC) • Guatemala (GT) | Ciclo: ${periodName}`
      : `Cross-border Consolidation: California (CA) • Oklahoma City (OKC) • Guatemala (GT) | Cycle: ${periodName}`,
    24, 21
  );

  doc.text(
    language === 'es'
      ? `Filtro de Sede: ${location === 'Global' ? 'Consolidado Global' : location} | Fecha Emisión: ${dateStr} ${timeStr}`
      : `Location Filter: ${location} | Issued: ${dateStr} ${timeStr}`,
    24, 27
  );

  // Cuadro derecho con Auditoría
  doc.setTextColor(251, 191, 36); // amber-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    `AUDIT REF: RNT-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    260, 16,
    { align: 'right' }
  );
  doc.setTextColor(226, 232, 240);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Auditor: ${auditorName}`, 260, 22, { align: 'right' });
  doc.text(`Total Unidades: ${units.length}`, 260, 27, { align: 'right' });

  // 2. TABLA SCORECARD DE LOS 10 KPIS EJECUTIVOS
  let currentY = 36;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    language === 'es' ? 'I. SCORECARD DIRECTIVO DE 10 KPIS CLAVE' : 'I. EXECUTIVE 10-KPI SCORECARD & PERFORMANCE',
    14, currentY
  );

  const kpiRows = [
    [
      '1. Effective Collection Rate',
      `${kpis.effectiveCollectionRate.toFixed(1)}%`,
      '>= 95.0%',
      kpis.effectiveCollectionRate >= 95 ? 'OPTIMAL' : kpis.effectiveCollectionRate >= 88 ? 'WARNING' : 'CRITICAL',
      'Actual Collected vs Total Scheduled Rent + Prior Debt'
    ],
    [
      '2. Delinquency Rate',
      `${kpis.delinquencyRate.toFixed(1)}%`,
      '<= 5.0%',
      kpis.delinquencyRate <= 5 ? 'OPTIMAL' : kpis.delinquencyRate <= 10 ? 'WARNING' : 'CRITICAL',
      '% of active tenants in Delinquent or Partial status'
    ],
    [
      '3. Delinquency Amount',
      formatUSD(kpis.delinquencyAmount),
      '$0.00',
      kpis.delinquencyAmount === 0 ? 'OPTIMAL' : kpis.delinquencyAmount < 5000 ? 'WARNING' : 'CRITICAL',
      'Total unpaid carryover balance outstanding'
    ],
    [
      '4. Occupancy Rate',
      `${kpis.occupancyRate.toFixed(1)}%`,
      '>= 95.0%',
      kpis.occupancyRate >= 95 ? 'OPTIMAL' : kpis.occupancyRate >= 90 ? 'WARNING' : 'CRITICAL',
      'Occupied units relative to total inventory'
    ],
    [
      '5. Maintenance Resolution',
      `${kpis.maintenanceTime.toFixed(1)} days`,
      '<= 2.0 days',
      kpis.maintenanceTime <= 2.0 ? 'OPTIMAL' : kpis.maintenanceTime <= 3.5 ? 'WARNING' : 'CRITICAL',
      'Average turnaround time for service repair orders'
    ],
    [
      '6. Billing Accuracy',
      `${kpis.billingAccuracy.toFixed(1)}%`,
      '>= 98.0%',
      kpis.billingAccuracy >= 98 ? 'OPTIMAL' : 'WARNING',
      'Rent charges issued without tenant dispute or adjustment'
    ],
    [
      '7. Reporting Compliance',
      `${kpis.reportingCompliance.toFixed(1)}%`,
      '100.0%',
      kpis.reportingCompliance === 100 ? 'OPTIMAL' : 'WARNING',
      'Timely completion of regional monthly close'
    ],
    [
      '8. Tenant Retention Rate',
      `${kpis.tenantRetention.toFixed(1)}%`,
      '>= 80.0%',
      kpis.tenantRetention >= 80 ? 'OPTIMAL' : 'WARNING',
      'Annual lease renewals and tenant tenure stability'
    ],
    [
      '9. Total Vacancy Months',
      `${kpis.totalVacancyMonths} mos.`,
      '0 mos.',
      kpis.totalVacancyMonths === 0 ? 'OPTIMAL' : kpis.totalVacancyMonths < 4 ? 'WARNING' : 'CRITICAL',
      'Cumulative unoccupied months across inventory'
    ],
    [
      '10. Total Revenue MTD',
      formatUSD(kpis.totalRevenueMTD),
      'Target Pace',
      'OPTIMAL',
      'Actual cash funds deposited into escrow accounts'
    ]
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [[
      language === 'es' ? 'Indicador Clave (KPI)' : 'Key Performance Indicator',
      language === 'es' ? 'Valor Obtenido' : 'Actual Value',
      language === 'es' ? 'Meta / Umbral' : 'Target Benchmark',
      language === 'es' ? 'Semáforo' : 'Status',
      language === 'es' ? 'Descripción y Fórmula' : 'Operational Definition'
    ]],
    body: kpiRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 1.5
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 32, fontStyle: 'bold', halign: 'right' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const text = String(data.cell.raw);
        if (text === 'OPTIMAL') {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (text === 'WARNING') {
          data.cell.styles.textColor = [245, 158, 11];
        } else if (text === 'CRITICAL') {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    }
  });

  // 3. TABLA DEL PADRÓN DE UNIDADES (RENT ROLL DETALLADO)
  doc.addPage();
  currentY = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(14, currentY, 251, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    language === 'es' 
      ? `II. PADRÓN TRANSACCIONAL DE UNIDADES Y ARRENDATARIOS (${units.length} REGISTROS)`
      : `II. TRANSACTIONAL RENT ROLL & UNIT INVENTORY (${units.length} UNITS)`,
    18, currentY + 6.5
  );

  const unitRows = units.map(u => [
    u.id,
    `${u.address}, ${u.city}`,
    u.tenantName,
    u.location,
    u.unitStatus,
    formatUSD(u.scheduledRent),
    formatUSD(u.previousDebt),
    formatUSD(u.actualCollected),
    formatUSD(u.carryoverBalance),
    u.paymentStatus
  ]);

  const totalRent = units.reduce((acc, u) => acc + (u.scheduledRent || 0), 0);
  const totalDebt = units.reduce((acc, u) => acc + (u.previousDebt || 0), 0);
  const totalCollected = units.reduce((acc, u) => acc + (u.actualCollected || 0), 0);
  const totalCarryover = units.reduce((acc, u) => acc + (u.carryoverBalance || 0), 0);

  autoTable(doc, {
    startY: currentY + 12,
    head: [[
      'ID',
      language === 'es' ? 'Dirección' : 'Address',
      language === 'es' ? 'Inquilino / Cliente' : 'Tenant',
      language === 'es' ? 'Sede' : 'Location',
      language === 'es' ? 'Ocupación' : 'Occupancy',
      language === 'es' ? 'Renta Prog.' : 'Sched. Rent',
      language === 'es' ? 'Mora Previa' : 'Prev. Debt',
      language === 'es' ? 'Cobrado' : 'Collected',
      language === 'es' ? 'Saldo Arrastre' : 'Carryover',
      language === 'es' ? 'Estado' : 'Status'
    ]],
    body: unitRows,
    foot: [[
      'TOTAL',
      `${units.length} ${language === 'es' ? 'unidades' : 'units'}`,
      `${kpis.occupiedUnits} ${language === 'es' ? 'ocupadas' : 'occupied'} / ${kpis.vacantUnits} ${language === 'es' ? 'vacantes' : 'vacant'}`,
      location,
      `${kpis.occupancyRate.toFixed(1)}%`,
      formatUSD(totalRent),
      formatUSD(totalDebt),
      formatUSD(totalCollected),
      formatUSD(totalCarryover),
      `${kpis.effectiveCollectionRate.toFixed(1)}% Eff.`
    ]],
    theme: 'striped',
    headStyles: {
      fillColor: [49, 46, 129], // indigo-900
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.2
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 40 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 9) {
        const text = String(data.cell.raw);
        if (text === 'Paid') {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (text === 'Partial') {
          data.cell.styles.textColor = [245, 158, 11];
        } else if (text === 'Delinquent') {
          data.cell.styles.textColor = [239, 68, 68];
        } else if (text === 'Vacant') {
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
    }
  });

  // 4. FIRMAS EJECUTIVAS Y RESPONSABILIDADES
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  if (finalY < 170) {
    doc.setDrawColor(203, 213, 225);
    doc.line(30, finalY + 22, 110, finalY + 22);
    doc.line(160, finalY + 22, 240, finalY + 22);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(
      language === 'es' ? 'Dirección de Administración Inmobiliaria' : 'Director of Real Estate Asset Management',
      70, finalY + 26, { align: 'center' }
    );
    doc.text(
      language === 'es' ? 'Auditoría Financiera y Contraloría Interna' : 'Internal Financial Audit & Comptroller',
      200, finalY + 26, { align: 'center' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      language === 'es' ? 'Certificación de Cobranza y Arrastre' : 'Certified Portfolio Collections Ledger',
      70, finalY + 30, { align: 'center' }
    );
    doc.text(
      language === 'es' ? 'Cumplimiento Normativo y Prevención de Riesgos' : 'Risk Management & Regulatory Compliance',
      200, finalY + 30, { align: 'center' }
    );
  }

  const filename = `Scorecard_Rentas_${location}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
