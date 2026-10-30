import { RentalUnit, PaymentStatus, ExecutiveKPIs, DecisionAlert, PropertyLocation } from '../types/rents';

/**
 * Calcula el estado de pago de una unidad en base a las reglas financieras estrictas
 */
export function determinePaymentStatus(unit: {
  unitStatus: 'Occupied' | 'Vacant';
  actualCollected: number;
  scheduledRent: number;
  previousDebt: number;
}): PaymentStatus {
  if (unit.unitStatus === 'Vacant') {
    return 'Vacant';
  }
  const rentAndDebt = unit.scheduledRent + unit.previousDebt;
  
  if (unit.actualCollected >= rentAndDebt) {
    return 'Paid';
  }
  if (unit.actualCollected > 0 && unit.actualCollected < rentAndDebt) {
    return 'Partial';
  }
  return 'Delinquent';
}

/**
 * Recalcula campos dinámicos de una unidad (totalDue, carryoverBalance, paymentStatus)
 */
export function enrichUnit(unit: RentalUnit): RentalUnit {
  const lateFeeNet = Math.max(0, unit.lateFeesScheduled - unit.lateFeesPaid);
  const totalDue = Math.max(0, unit.scheduledRent + unit.previousDebt + lateFeeNet);
  const carryoverBalance = Math.max(0, totalDue - unit.actualCollected);
  const paymentStatus = determinePaymentStatus({
    unitStatus: unit.unitStatus,
    actualCollected: unit.actualCollected,
    scheduledRent: unit.scheduledRent,
    previousDebt: unit.previousDebt,
  });

  return {
    ...unit,
    totalDue,
    carryoverBalance,
    paymentStatus,
  };
}

/**
 * Desglosa en cascada cómo se amortiza un abono o pago:
 * 1. Primero amortiza la mora/deuda previa insoluta.
 * 2. El excedente se abona a la renta corriente mensual programada.
 * 3. El saldo restante amortiza cargos por mora o servicios.
 */
export function calculatePaymentAmortization(unit: RentalUnit, paymentAmount: number) {
  const amount = Math.max(0, paymentAmount);
  
  // 1. Amortizar deuda previa
  const amortizedDebt = Math.min(amount, unit.previousDebt);
  const remainder1 = amount - amortizedDebt;
  
  // 2. Amortizar renta corriente
  const amortizedRent = Math.min(remainder1, unit.scheduledRent);
  const remainder2 = remainder1 - amortizedRent;
  
  // 3. Amortizar recargos por mora pendientes
  const pendingLateFees = Math.max(0, unit.lateFeesScheduled - unit.lateFeesPaid);
  const amortizedLateFee = Math.min(remainder2, pendingLateFees);

  const projectedCollected = unit.actualCollected + amount;
  const projectedCarryover = Math.max(0, unit.totalDue - projectedCollected);
  
  const projectedStatus = determinePaymentStatus({
    unitStatus: unit.unitStatus,
    actualCollected: projectedCollected,
    scheduledRent: unit.scheduledRent,
    previousDebt: unit.previousDebt,
  });

  return {
    amortizedDebt,
    amortizedRent,
    amortizedLateFee,
    projectedCollected,
    projectedCarryover,
    projectedStatus,
  };
}

/**
 * Calcula dinámicamente los 10 KPIs ejecutivos para un conjunto de unidades
 */
export function calculateExecutiveKPIs(units: RentalUnit[]): ExecutiveKPIs {
  const totalUnits = units.length;
  if (totalUnits === 0) {
    return {
      effectiveCollectionRate: 0,
      delinquencyRate: 0,
      delinquencyAmount: 0,
      occupancyRate: 0,
      maintenanceTime: 0,
      billingAccuracy: 100,
      reportingCompliance: 100,
      tenantRetention: 100,
      totalVacancyMonths: 0,
      totalRevenueMTD: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      totalScheduledRent: 0,
      totalPreviousDebt: 0,
      totalDueSum: 0,
    };
  }

  let occupiedCount = 0;
  let vacantCount = 0;
  let delinquentOrPartialCount = 0;
  
  let totalScheduledRent = 0;
  let totalPreviousDebt = 0;
  let totalCollected = 0;
  let totalCarryover = 0;
  let totalDueSum = 0;
  let totalVacancyMonths = 0;
  
  let totalMaintenanceDays = 0;
  let maintenanceCount = 0;
  let totalBillingAccuracy = 0;
  let totalRetention = 0;

  units.forEach(u => {
    const enriched = enrichUnit(u);
    if (enriched.unitStatus === 'Occupied') {
      occupiedCount += 1;
      if (enriched.paymentStatus === 'Delinquent' || enriched.paymentStatus === 'Partial') {
        delinquentOrPartialCount += 1;
      }
    } else {
      vacantCount += 1;
      totalVacancyMonths += (enriched.vacantMonths || 0);
    }

    totalScheduledRent += enriched.scheduledRent;
    totalPreviousDebt += enriched.previousDebt;
    totalCollected += enriched.actualCollected;
    totalCarryover += enriched.carryoverBalance;
    totalDueSum += enriched.totalDue;

    if (enriched.maintenanceDaysAvg) {
      totalMaintenanceDays += enriched.maintenanceDaysAvg;
      maintenanceCount += 1;
    }
    if (enriched.billingAccuracyRate) {
      totalBillingAccuracy += enriched.billingAccuracyRate;
    }
    if (enriched.tenantRetentionRate) {
      totalRetention += enriched.tenantRetentionRate;
    }
  });

  // 1. Effective Collection Rate: (Collected / (Scheduled + Previous Debt)) * 100
  const collectionBase = totalScheduledRent + totalPreviousDebt;
  const effectiveCollectionRate = collectionBase > 0 ? (totalCollected / collectionBase) * 100 : 0;

  // 2. Delinquency Rate: (Delinquent + Partial units / Occupied units) * 100
  const delinquencyRate = occupiedCount > 0 ? (delinquentOrPartialCount / occupiedCount) * 100 : 0;

  // 3. Delinquency Amount: Sum of Carryover Balances
  const delinquencyAmount = totalCarryover;

  // 4. Occupancy Rate: (Occupied / Total Units) * 100
  const occupancyRate = (occupiedCount / totalUnits) * 100;

  // 5. Maintenance Time: Avg days for ticket resolution
  const maintenanceTime = maintenanceCount > 0 ? totalMaintenanceDays / maintenanceCount : 1.8;

  // 6. Billing Accuracy Rate: default 98.4%
  const billingAccuracy = totalUnits > 0 ? totalBillingAccuracy / totalUnits || 98.4 : 98.4;

  // 7. Reporting Compliance: 99.1%
  const reportingCompliance = 99.1;

  // 8. Tenant Retention Rate: default 88.5%
  const tenantRetention = totalUnits > 0 ? totalRetention / totalUnits || 88.5 : 88.5;

  // 9. Total Vacancy Months: sum of vacantMonths
  // 10. Total Revenue MTD: totalCollected

  return {
    effectiveCollectionRate: Math.round(effectiveCollectionRate * 10) / 10,
    delinquencyRate: Math.round(delinquencyRate * 10) / 10,
    delinquencyAmount: Math.round(delinquencyAmount),
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    maintenanceTime: Math.round(maintenanceTime * 10) / 10,
    billingAccuracy: Math.round(billingAccuracy * 10) / 10,
    reportingCompliance,
    tenantRetention: Math.round(tenantRetention * 10) / 10,
    totalVacancyMonths,
    totalRevenueMTD: Math.round(totalCollected),
    totalUnits,
    occupiedUnits: occupiedCount,
    vacantUnits: vacantCount,
    totalScheduledRent,
    totalPreviousDebt,
    totalDueSum,
  };
}

/**
 * Genera alertas directivas automáticas basadas en umbrales de negocio
 */
export function generateDecisionAlerts(allUnits: RentalUnit[], activeLocation: PropertyLocation | 'Global'): DecisionAlert[] {
  const alerts: DecisionAlert[] = [];
  
  // Analizar unidades de CA
  const caUnits = allUnits.filter(u => u.location === 'CA');
  const caKpis = calculateExecutiveKPIs(caUnits);
  if (caKpis.delinquencyRate > 10.0 && (activeLocation === 'Global' || activeLocation === 'CA')) {
    alerts.push({
      id: 'alert-ca-delinquency',
      severity: 'critical',
      location: 'CA',
      titleKey: 'alertHighDelinquencyTitle',
      metricValue: `${caKpis.delinquencyRate.toFixed(1)}% (Límite: 10.0%)`,
      descriptionKey: 'alertHighDelinquencyDesc',
      actionKey: 'alertHighDelinquencyAction',
    });
  }

  // Analizar unidades de OKC
  const okcUnits = allUnits.filter(u => u.location === 'OKC');
  const okcVacantLong = okcUnits.filter(u => u.unitStatus === 'Vacant' && (u.vacantMonths || 0) >= 2);
  if (okcVacantLong.length > 0 && (activeLocation === 'Global' || activeLocation === 'OKC')) {
    alerts.push({
      id: 'alert-okc-vacancy',
      severity: 'warning',
      location: 'OKC',
      titleKey: 'alertVacancyDelayTitle',
      metricValue: `${okcVacantLong.length} unidades (>60 días)`,
      descriptionKey: 'alertVacancyDelayDesc',
      actionKey: 'alertVacancyDelayAction',
    });
  }

  // Alerta de retención o contratos próximos
  if (activeLocation === 'Global' || activeLocation === 'CA' || activeLocation === 'OKC') {
    alerts.push({
      id: 'alert-lease-expirations',
      severity: 'warning',
      location: 'Global',
      titleKey: 'alertRetentionWatchTitle',
      metricValue: '12 contratos por expirar',
      descriptionKey: 'alertRetentionWatchDesc',
      actionKey: 'alertRetentionWatchAction',
    });
  }

  // Analizar unidades de GT
  const gtUnits = allUnits.filter(u => u.location === 'GT');
  const gtKpis = calculateExecutiveKPIs(gtUnits);
  if (gtKpis.delinquencyRate <= 2.0 && (activeLocation === 'Global' || activeLocation === 'GT')) {
    alerts.push({
      id: 'alert-gt-optimal',
      severity: 'optimal',
      location: 'GT',
      titleKey: 'alertOptimalPerformanceTitle',
      metricValue: '100% Cobranza / 0% Mora',
      descriptionKey: 'alertOptimalPerformanceDesc',
      actionKey: 'alertOptimalPerformanceAction',
    });
  }

  return alerts;
}

/**
 * Simula el Cierre de Mes (Month-End Carryover Rollover)
 * Traslada el carryoverBalance a previousDebt del nuevo ciclo, reinicia recaudado a 0
 * y aplica recargo por mora configurable a Delinquent y Partial
 */
export function simulateMonthClose(
  units: RentalUnit[],
  lateFeeConfig: number = 50
): RentalUnit[] {
  return units.map(u => {
    const enriched = enrichUnit(u);
    
    // Si la unidad está vacante, incrementa el conteo de meses vacantes
    if (enriched.unitStatus === 'Vacant') {
      return {
        ...enriched,
        vacantMonths: enriched.vacantMonths + 1,
        previousDebt: 0,
        actualCollected: 0,
        lateFeesScheduled: 0,
        lateFeesPaid: 0,
        utilitiesPaid: 0,
        paymentStatus: 'Vacant',
        totalDue: 0,
        carryoverBalance: 0,
      };
    }

    // Nuevo saldo insoluto que se convierte en deuda previa
    const newPreviousDebt = enriched.carryoverBalance;
    
    // Aplicar cargo por mora a quienes no completaron su pago
    const isUnpaid = enriched.paymentStatus === 'Delinquent' || enriched.paymentStatus === 'Partial';
    const newLateFee = isUnpaid ? lateFeeConfig : 0;

    const rolledUnit: RentalUnit = {
      ...enriched,
      previousDebt: newPreviousDebt,
      actualCollected: 0,
      lateFeesScheduled: newLateFee,
      lateFeesPaid: 0,
      utilitiesPaid: 0,
      paymentHistory: [
        ...enriched.paymentHistory,
        {
          id: `rollover-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          date: new Date().toISOString().slice(0, 10),
          amount: 0,
          amortizedDebt: 0,
          amortizedRent: 0,
          amortizedLateFee: 0,
          paymentMethod: 'ACH',
          referenceNumber: 'MONTH-CLOSE-ROLLOVER',
          notes: `Cierre de mes: Saldo arrastrado a deuda previa $${newPreviousDebt.toLocaleString()} ${isUnpaid ? `con recargo $${newLateFee}` : ''}`,
          recordedBy: 'Sistema Ejecutivo',
        }
      ]
    };

    return enrichUnit(rolledUnit);
  });
}

/**
 * Formatea valores a moneda USD ($)
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
