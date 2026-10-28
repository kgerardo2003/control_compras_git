import { AppLanguage } from '../types/rents';

export interface RentTranslationDictionary {
  // Navigation & Header
  moduleTitle: string;
  moduleSubtitle: string;
  switchLanguage: string;
  locationAll: string;
  locationCA: string;
  locationOKC: string;
  locationGT: string;
  currentPeriod: string;
  closeMonthBtn: string;
  resetSimulationBtn: string;
  exportCsvBtn: string;
  
  // Executive Scorecard (10 KPIs)
  scorecardTitle: string;
  scorecardSubtitle: string;
  kpiEffectiveCollectionRate: string;
  kpiEffectiveCollectionRateDesc: string;
  kpiDelinquencyRate: string;
  kpiDelinquencyRateDesc: string;
  kpiDelinquencyAmount: string;
  kpiDelinquencyAmountDesc: string;
  kpiOccupancyRate: string;
  kpiOccupancyRateDesc: string;
  kpiMaintenanceTime: string;
  kpiMaintenanceTimeDesc: string;
  kpiBillingAccuracy: string;
  kpiBillingAccuracyDesc: string;
  kpiReportingCompliance: string;
  kpiReportingComplianceDesc: string;
  kpiTenantRetention: string;
  kpiTenantRetentionDesc: string;
  kpiTotalVacancyMonths: string;
  kpiTotalVacancyMonthsDesc: string;
  kpiTotalRevenueMTD: string;
  kpiTotalRevenueMTDDesc: string;
  targetBenchmark: string;
  
  // Charts Section
  chartsTitle: string;
  chartsSubtitle: string;
  chartCollectionStatusTitle: string;
  chartCollectionStatusSub: string;
  chartRevenueShareTitle: string;
  chartRevenueShareSub: string;
  chartPortfolioCompTitle: string;
  chartPortfolioCompSub: string;
  collectedAmount: string;
  pendingBalance: string;
  lateFees: string;
  
  // Statuses
  statusPaid: string;
  statusPartial: string;
  statusDelinquent: string;
  statusVacant: string;
  statusOccupied: string;
  
  // Decision-Making Alerts
  alertsTitle: string;
  alertsSubtitle: string;
  criticalNotice: string;
  warningNotice: string;
  optimalNotice: string;
  recommendedAction: string;
  takeActionBtn: string;
  alertHighDelinquencyTitle: string;
  alertHighDelinquencyDesc: string;
  alertHighDelinquencyAction: string;
  alertVacancyDelayTitle: string;
  alertVacancyDelayDesc: string;
  alertVacancyDelayAction: string;
  alertRetentionWatchTitle: string;
  alertRetentionWatchDesc: string;
  alertRetentionWatchAction: string;
  alertOptimalPerformanceTitle: string;
  alertOptimalPerformanceDesc: string;
  alertOptimalPerformanceAction: string;

  // Records Table
  tableTitle: string;
  tableSubtitle: string;
  searchPlaceholder: string;
  filterByStatus: string;
  allStatuses: string;
  colId: string;
  colAddress: string;
  colTenant: string;
  colLocation: string;
  colUnitStatus: string;
  colScheduledRent: string;
  colPrevDebt: string;
  colCollected: string;
  colCarryover: string;
  colPaymentStatus: string;
  colUtilities: string;
  colActions: string;
  btnRecordPayment: string;
  btnViewHistory: string;
  noRecordsFound: string;
  paginationShowing: string;
  paginationOf: string;
  paginationUnits: string;
  paginationPage: string;
  
  // Payment Modal
  paymentModalTitle: string;
  paymentModalSubtitle: string;
  unitSummary: string;
  totalDueLabel: string;
  scheduledRentLabel: string;
  previousDebtLabel: string;
  lateFeesLabel: string;
  paymentAmountLabel: string;
  paymentMethodLabel: string;
  referenceLabel: string;
  notesLabel: string;
  quickPresets: string;
  presetFullBalance: string;
  presetRentOnly: string;
  presetDebtOnly: string;
  amortizationBreakdown: string;
  amortizedDebtLabel: string;
  amortizedRentLabel: string;
  newCarryoverBalanceLabel: string;
  newProjectedStatusLabel: string;
  confirmPaymentBtn: string;
  cancelBtn: string;
  paymentSuccessToast: string;
  
  // Month Close Simulation Modal
  monthCloseTitle: string;
  monthCloseSubtitle: string;
  simulationWarning: string;
  currentCycle: string;
  nextCycle: string;
  lateFeeConfigLabel: string;
  lateFeeConfigHint: string;
  unitsToCarryoverCount: string;
  totalCarryoverSum: string;
  applyCycleClosingBtn: string;
  monthCloseSuccessToast: string;
  resetCycleSuccessToast: string;
}

export const RENT_TRANSLATIONS: Record<AppLanguage, RentTranslationDictionary> = {
  en: {
    // Navigation & Header
    moduleTitle: 'Global Rent Management & Executive Scorecard',
    moduleSubtitle: 'Cross-border property portfolio consolidation across California (CA), Oklahoma City (OKC), and Guatemala (GT)',
    switchLanguage: 'Español',
    locationAll: 'Global (All Locations)',
    locationCA: 'California (CA)',
    locationOKC: 'Oklahoma City (OKC)',
    locationGT: 'Guatemala (GT)',
    currentPeriod: 'Period',
    closeMonthBtn: 'Close Month / Next Cycle',
    resetSimulationBtn: 'Reset Simulation',
    exportCsvBtn: 'Export CSV',
    
    // Executive Scorecard (10 KPIs)
    scorecardTitle: 'Executive Scorecard & Strategic Indicators',
    scorecardSubtitle: 'Real-time performance metrics tracking operational efficiency, risk mitigation, and cash flow',
    kpiEffectiveCollectionRate: 'Effective Collection Rate',
    kpiEffectiveCollectionRateDesc: 'Collected vs. Total Scheduled Rent + Prior Debt',
    kpiDelinquencyRate: 'Delinquency Rate',
    kpiDelinquencyRateDesc: '% of tenants in Delinquent or Partial status',
    kpiDelinquencyAmount: 'Overdue Portfolio',
    kpiDelinquencyAmountDesc: 'Total outstanding carryover balance',
    kpiOccupancyRate: 'Occupancy Rate',
    kpiOccupancyRateDesc: 'Occupied units relative to total inventory',
    kpiMaintenanceTime: 'Avg. Maintenance Resolution',
    kpiMaintenanceTimeDesc: 'Turnaround time for service tickets',
    kpiBillingAccuracy: 'Billing Accuracy',
    kpiBillingAccuracyDesc: 'Invoices issued without disputes/adjustments',
    kpiReportingCompliance: 'Reporting Compliance',
    kpiReportingComplianceDesc: 'On-time delivery of financial statements',
    kpiTenantRetention: 'Tenant Retention Rate',
    kpiTenantRetentionDesc: 'Annual lease renewals and tenure stability',
    kpiTotalVacancyMonths: 'Cumulative Vacancy Months',
    kpiTotalVacancyMonthsDesc: 'Unoccupied months across vacant units',
    kpiTotalRevenueMTD: 'Revenue Collected MTD',
    kpiTotalRevenueMTDDesc: 'Actual cash inflows deposited in period',
    targetBenchmark: 'Target',
    
    // Charts Section
    chartsTitle: 'Portfolio Analytics & Visualizations',
    chartsSubtitle: 'Interactive multi-dimension breakdown of collection status, revenue contribution, and capital composition',
    chartCollectionStatusTitle: 'Payment & Collection Status',
    chartCollectionStatusSub: 'Tenant distribution by payment standing',
    chartRevenueShareTitle: 'Revenue Contribution by Sede',
    chartRevenueShareSub: 'Cash collection share: CA vs OKC vs GT',
    chartPortfolioCompTitle: 'Billed vs Overdue Capital',
    chartPortfolioCompSub: 'Collected funds vs outstanding debt vs fees',
    collectedAmount: 'Collected Funds',
    pendingBalance: 'Pending Carryover',
    lateFees: 'Late Fees & Penalties',
    
    // Statuses
    statusPaid: 'Paid (Current)',
    statusPartial: 'Partial Payment',
    statusDelinquent: 'Delinquent',
    statusVacant: 'Vacant',
    statusOccupied: 'Occupied',
    
    // Decision-Making Alerts
    alertsTitle: 'Critical Executive Alerts & Decision Support',
    alertsSubtitle: 'Automated policy triggers and recommended managerial interventions',
    criticalNotice: 'Critical Action Required',
    warningNotice: 'Strategic Watchlist',
    optimalNotice: 'Optimal Performance Benchmark',
    recommendedAction: 'Recommended Action',
    takeActionBtn: 'Execute Protocol',
    alertHighDelinquencyTitle: 'Excess Delinquency Threshold (>10%) in California',
    alertHighDelinquencyDesc: 'Delinquency in the CA region has reached 15.5%, exceeding the board-approved ceiling of 10.0%. Outstanding carryover poses working capital risk.',
    alertHighDelinquencyAction: 'Initiate formal legal cure notices / 3-day eviction protocol for delinquent tenants; offer structured payment plans for partials.',
    alertVacancyDelayTitle: 'Extended Vacancy in Oklahoma Portfolio (>2 Months)',
    alertVacancyDelayDesc: 'Two units in OKC have remained vacant for over 60 days, accumulating 5 vacancy-months and generating zero revenue.',
    alertVacancyDelayAction: 'Trigger digital listing syndication, evaluate 5% seasonal rent discount or promotional move-in concession to accelerate lease-up.',
    alertRetentionWatchTitle: 'Upcoming Lease Expirations in Q4 Watchlist',
    alertRetentionWatchDesc: '12 leases in CA and OKC are expiring within 45 days. Retention benchmark requires proactive renewal outreach.',
    alertRetentionWatchAction: 'Dispatch automated renewal incentive packets with early-bird renewal freeze on current scheduled rate.',
    alertOptimalPerformanceTitle: 'Guatemala Hub Operating at 100% On-Time Compliance',
    alertOptimalPerformanceDesc: 'The GT portfolio demonstrates a 0.0% delinquency rate with 100% on-schedule collections and zero tenant disputes.',
    alertOptimalPerformanceAction: 'Maintain current lease underwriting model; benchmark customer service workflow as regional best practice.',

    // Records Table
    tableTitle: 'Property & Rent Roster Manager',
    tableSubtitle: 'Unit-by-unit transactional ledger showing scheduled rents, arrears, payments, and carryovers',
    searchPlaceholder: 'Search by Unit ID, Address, or Tenant Name...',
    filterByStatus: 'Filter by Status',
    allStatuses: 'All Statuses',
    colId: 'Unit ID',
    colAddress: 'Address & City',
    colTenant: 'Tenant',
    colLocation: 'Sede',
    colUnitStatus: 'Unit Status',
    colScheduledRent: 'Sched. Rent',
    colPrevDebt: 'Prev. Arrears',
    colCollected: 'Collected',
    colCarryover: 'Carryover Bal.',
    colPaymentStatus: 'Payment Status',
    colUtilities: 'Utilities',
    colActions: 'Actions',
    btnRecordPayment: 'Record Payment',
    btnViewHistory: 'History',
    noRecordsFound: 'No units match the selected filters or search criteria.',
    paginationShowing: 'Showing',
    paginationOf: 'of',
    paginationUnits: 'properties',
    paginationPage: 'Page',
    
    // Payment Modal
    paymentModalTitle: 'Record Rent Payment / Abono',
    paymentModalSubtitle: 'Apply cash inflows with strict prior debt amortization waterfall',
    unitSummary: 'Unit Summary',
    totalDueLabel: 'Total Outstanding Balance Due',
    scheduledRentLabel: 'Scheduled Monthly Rent',
    previousDebtLabel: 'Previous Debt (Arrears)',
    lateFeesLabel: 'Late Fees Balance',
    paymentAmountLabel: 'Payment Amount Received (USD)',
    paymentMethodLabel: 'Payment Method',
    referenceLabel: 'Transaction Reference / Check #',
    notesLabel: 'Administrative Notes',
    quickPresets: 'Quick Fill Presets',
    presetFullBalance: 'Pay Total Due',
    presetRentOnly: 'Pay Sched. Rent Only',
    presetDebtOnly: 'Pay Prev. Arrears Only',
    amortizationBreakdown: 'Waterfall Amortization Breakdown (Live Simulation)',
    amortizedDebtLabel: 'Amortizes Previous Debt First:',
    amortizedRentLabel: 'Applies to Current Monthly Rent:',
    newCarryoverBalanceLabel: 'Remaining Unpaid Balance to Carry Over:',
    newProjectedStatusLabel: 'Projected Updated Status:',
    confirmPaymentBtn: 'Confirm & Post Payment',
    cancelBtn: 'Cancel',
    paymentSuccessToast: 'Payment recorded successfully! Ledger balances updated.',
    
    // Month Close Simulation Modal
    monthCloseTitle: 'Cycle Rollover & Month-End Simulation',
    monthCloseSubtitle: 'Advance to the next monthly cycle, transfer unpaid balances to previous debt, and apply late fees',
    simulationWarning: 'This simulation calculates the carryover balances for all active units, transfers unpaid balances to the next month previous debt, and applies late penalties to Delinquent and Partial units.',
    currentCycle: 'Closing Cycle',
    nextCycle: 'Next Starting Cycle',
    lateFeeConfigLabel: 'Late Fee Policy on Overdue Units ($USD):',
    lateFeeConfigHint: 'Applied automatically to all Delinquent and Partial tenants upon rollover',
    unitsToCarryoverCount: 'Units with Pending Debt to Roll Over:',
    totalCarryoverSum: 'Total Overdue Debt to Be Carried Forward:',
    applyCycleClosingBtn: 'Execute Month Close & Advance Cycle',
    monthCloseSuccessToast: 'Month closed! Arrears carried forward and late fees applied.',
    resetCycleSuccessToast: 'Portfolio state restored to initial baseline.'
  },
  es: {
    // Navigation & Header
    moduleTitle: 'Gestión Global de Rentas y Tablero de Control Ejecutivo',
    moduleSubtitle: 'Consolidación del portafolio inmobiliario en tres sedes: California (CA), Oklahoma City (OKC) y Guatemala (GT)',
    switchLanguage: 'English',
    locationAll: 'Global (Todas las Sedes)',
    locationCA: 'California (CA)',
    locationOKC: 'Oklahoma City (OKC)',
    locationGT: 'Guatemala (GT)',
    currentPeriod: 'Periodo',
    closeMonthBtn: 'Cerrar Mes / Próximo Ciclo',
    resetSimulationBtn: 'Restablecer Simulación',
    exportCsvBtn: 'Exportar CSV',
    
    // Executive Scorecard (10 KPIs)
    scorecardTitle: 'Tablero de Control Ejecutivo (Scorecard de 10 KPIs)',
    scorecardSubtitle: 'Métricas de desempeño en tiempo real para optimización operativa, control de riesgo y flujo de caja',
    kpiEffectiveCollectionRate: 'Tasa Efectiva de Cobranza',
    kpiEffectiveCollectionRateDesc: 'Recaudado vs Renta Programada + Deuda Previa',
    kpiDelinquencyRate: 'Tasa de Morosidad',
    kpiDelinquencyRateDesc: '% de inquilinos en estado Mora o Pago Parcial',
    kpiDelinquencyAmount: 'Cartera Vencida Total',
    kpiDelinquencyAmountDesc: 'Suma de saldos pendientes de arrastre',
    kpiOccupancyRate: 'Tasa de Ocupación',
    kpiOccupancyRateDesc: 'Unidades habitadas respecto al total',
    kpiMaintenanceTime: 'Tiempo Prom. de Mantenimiento',
    kpiMaintenanceTimeDesc: 'Resolución promedio de tickets de servicio',
    kpiBillingAccuracy: 'Precisión de Facturación',
    kpiBillingAccuracyDesc: 'Emisiones de cobro sin disputas ni ajustes',
    kpiReportingCompliance: 'Cumplimiento de Reportes',
    kpiReportingComplianceDesc: 'Entrega a tiempo de estados financieros',
    kpiTenantRetention: 'Retención de Inquilinos',
    kpiTenantRetentionDesc: 'Renovaciones de contrato y permanencia',
    kpiTotalVacancyMonths: 'Meses Acumulados Vacantes',
    kpiTotalVacancyMonthsDesc: 'Meses sin percibir renta en unidades vacías',
    kpiTotalRevenueMTD: 'Recaudación Real MTD',
    kpiTotalRevenueMTDDesc: 'Ingreso real percibido y depositado en USD',
    targetBenchmark: 'Meta',
    
    // Charts Section
    chartsTitle: 'Visualizaciones Gráficas del Portafolio',
    chartsSubtitle: 'Desglose multidimensional interactivo de estados de cobranza, aportes por sede y composición de capital',
    chartCollectionStatusTitle: 'Estados de Cobranza y Pago',
    chartCollectionStatusSub: 'Distribución de inquilinos por condición de pago',
    chartRevenueShareTitle: 'Distribución de Ingresos por Sede',
    chartRevenueShareSub: 'Aporte de recaudación en USD: CA vs OKC vs GT',
    chartPortfolioCompTitle: 'Composición de Facturación vs Cartera',
    chartPortfolioCompSub: 'Cobrado efectivo vs saldos arrastrados vs recargos',
    collectedAmount: 'Monto Cobrado Efectivo',
    pendingBalance: 'Saldo Pendiente Arrastrado',
    lateFees: 'Cargos por Mora',
    
    // Statuses
    statusPaid: 'Pagado (Al día)',
    statusPartial: 'Pago Parcial',
    statusDelinquent: 'En Mora',
    statusVacant: 'Vacante',
    statusOccupied: 'Ocupado',
    
    // Decision-Making Alerts
    alertsTitle: 'Bandeja de Alertas Críticas y Soporte a Decisiones',
    alertsSubtitle: 'Alertas automatizadas por umbrales y recomendaciones de acción inmediata',
    criticalNotice: 'Acción Crítica Requerida',
    warningNotice: 'Monitoreo Estratégico',
    optimalNotice: 'Desempeño Óptimo Destacado',
    recommendedAction: 'Acción Sugerida',
    takeActionBtn: 'Ejecutar Protocolo',
    alertHighDelinquencyTitle: 'Morosidad Superior al Límite (>10%) en California',
    alertHighDelinquencyDesc: 'La morosidad en la sede CA se ubica en 15.5%, superando el techo institucional del 10.0%. El saldo deudor genera riesgo de flujo de caja.',
    alertHighDelinquencyAction: 'Iniciar requerimiento formal de cobro o trámite legal de desalojo en casos morosos reincidentes; convenios de pago para parciales.',
    alertVacancyDelayTitle: 'Desocupación Prolongada en Oklahoma City (>2 Meses)',
    alertVacancyDelayDesc: 'Dos unidades en OKC superan los 60 días sin inquilino, acumulando 5 meses-vacancia con costo de oportunidad y cero ingresos.',
    alertVacancyDelayAction: 'Lanzar pauta digital inmobiliaria o aplicar bonificación del 5% en el primer mes de arrendamiento para acelerar colocación.',
    alertRetentionWatchTitle: 'Contratos con Vencimiento Próximo en Q4',
    alertRetentionWatchDesc: '12 contratos en CA y OKC concluyen en los próximos 45 días. Se requiere plan de fidelización para mantener la meta de retención.',
    alertRetentionWatchAction: 'Enviar cartas de oferta de renovación con congelamiento de canon de renta para retener a los buenos inquilinos.',
    alertOptimalPerformanceTitle: 'Sede Guatemala con 100% de Cumplimiento Impecable',
    alertOptimalPerformanceDesc: 'El portafolio en GT reporta 0.0% de morosidad, pagos al día antes de la fecha límite y cero quejas administrativas.',
    alertOptimalPerformanceAction: 'Mantener la política de selección de arrendatarios y documentar el proceso de atención como modelo para las otras sedes.',

    // Records Table
    tableTitle: 'Padrón Detallado de Propiedades y Unidades',
    tableSubtitle: 'Control transaccional por unidad: renta programada, moras previas, pagos recibidos y saldos arrastrados',
    searchPlaceholder: 'Buscar por ID de Unidad, Dirección o Inquilino...',
    filterByStatus: 'Filtrar por Estado',
    allStatuses: 'Todos los Estados',
    colId: 'ID Unidad',
    colAddress: 'Dirección y Ciudad',
    colTenant: 'Inquilino',
    colLocation: 'Sede',
    colUnitStatus: 'Ocupación',
    colScheduledRent: 'Renta Prog.',
    colPrevDebt: 'Mora Previa',
    colCollected: 'Cobrado',
    colCarryover: 'Saldo Arrastre',
    colPaymentStatus: 'Estado de Pago',
    colUtilities: 'Servicios',
    colActions: 'Acciones',
    btnRecordPayment: 'Registrar Abono',
    btnViewHistory: 'Historial',
    noRecordsFound: 'No se encontraron unidades con los filtros o término de búsqueda ingresado.',
    paginationShowing: 'Mostrando',
    paginationOf: 'de',
    paginationUnits: 'propiedades',
    paginationPage: 'Página',
    
    // Payment Modal
    paymentModalTitle: 'Registrar Abono / Pago de Renta',
    paymentModalSubtitle: 'Aplicación estricta de fondos con amortización previa de deuda insoluta',
    unitSummary: 'Resumen de la Unidad',
    totalDueLabel: 'Total Adeudado a la Fecha',
    scheduledRentLabel: 'Renta Mensual Programada',
    previousDebtLabel: 'Saldo Previo Arrastrado (Deuda)',
    lateFeesLabel: 'Cargos por Mora Pendientes',
    paymentAmountLabel: 'Monto del Pago Recibido (USD)',
    paymentMethodLabel: 'Método de Pago',
    referenceLabel: 'No. de Cheque / Transferencia / Ref.',
    notesLabel: 'Notas / Observaciones del Abono',
    quickPresets: 'Completar Monto Rápidamente',
    presetFullBalance: 'Pagar Total Adeudado',
    presetRentOnly: 'Pagar Solo Renta Mes',
    presetDebtOnly: 'Pagar Solo Deuda Previa',
    amortizationBreakdown: 'Desglose en Cascada de la Amortización (Tiempo Real)',
    amortizedDebtLabel: 'Amortiza Deuda Previa Primero:',
    amortizedRentLabel: 'Abona a la Renta Corriente del Mes:',
    newCarryoverBalanceLabel: 'Nuevo Saldo Pendiente que se Arrastrará:',
    newProjectedStatusLabel: 'Nuevo Estado Proyectado:',
    confirmPaymentBtn: 'Registrar y Aplicar Pago',
    cancelBtn: 'Cancelar',
    paymentSuccessToast: '¡Abono registrado con éxito! El estado y saldo de la unidad se han actualizado.',
    
    // Month Close Simulation Modal
    monthCloseTitle: 'Simulador de Cierre de Mes y Transición de Ciclo',
    monthCloseSubtitle: 'Traspaso de saldos insolutos a deuda previa y aplicación de cargos por mora',
    simulationWarning: 'Este simulador traslada el saldo pendiente (Carryover Balance) de cada unidad al campo "Mora Previa" del nuevo mes, reinicia lo recaudado y aplica el cargo por mora configurado a quienes finalizaron en Mora o Pago Parcial.',
    currentCycle: 'Ciclo que se Cierra',
    nextCycle: 'Nuevo Ciclo que Inicia',
    lateFeeConfigLabel: 'Recargo por Mora a Unidades Impagas ($USD):',
    lateFeeConfigHint: 'Se cargará automáticamente a las unidades con estatus En Mora o Pago Parcial',
    unitsToCarryoverCount: 'Unidades con Saldo Pendiente de Arrastre:',
    totalCarryoverSum: 'Monto Total de Cartera Vencida que se Arrastrará:',
    applyCycleClosingBtn: 'Cerrar Mes y Trasladar Saldos',
    monthCloseSuccessToast: '¡Mes cerrado con éxito! Saldos trasladados y recargos aplicados.',
    resetCycleSuccessToast: 'Datos del portafolio restaurados a los valores iniciales.'
  }
};
