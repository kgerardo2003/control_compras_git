import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  RentalUnit, 
  PropertyLocation, 
  PaymentStatus, 
  AppLanguage, 
  PaymentMethod 
} from '../../types/rents';
import { INITIAL_RENTAL_UNITS } from '../../data/mockRentsData';
import { 
  calculateExecutiveKPIs, 
  generateDecisionAlerts, 
  simulateMonthClose, 
  formatUSD, 
  enrichUnit 
} from '../../utils/rentsCalculations';
import { RENT_TRANSLATIONS } from '../../locales/rentsTranslations';
import { RentPaymentModal } from './RentPaymentModal';
import { MonthCloseModal } from './MonthCloseModal';
import { ClientUnitModal } from './ClientUnitModal';
import { exportRentScorecardPdf } from '../../utils/rentsScorecardPdfExport';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import {
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck2,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  RefreshCw,
  Download,
  Languages,
  CreditCard,
  Percent,
  Home,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Flame,
  CheckCircle,
  XCircle,
  ExternalLink,
  Sparkles,
  Coins,
  PlusCircle,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';

const STORAGE_KEY = 'app_rental_portfolio_units';

export const RentManagementDashboard: React.FC = () => {
  // Estado de idioma (EN / ES)
  const [language, setLanguage] = useState<AppLanguage>('es');
  const t = RENT_TRANSLATIONS[language];

  // Estado del portafolio de unidades con persistencia local
  const [units, setUnits] = useState<RentalUnit[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(enrichUnit);
        }
      }
    } catch (e) {
      console.warn('Error loading rental units from storage:', e);
    }
    return INITIAL_RENTAL_UNITS.map(enrichUnit);
  });

  // Guardar en localStorage ante cualquier modificación
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
    } catch (e) {
      console.warn('Error saving rental units to storage:', e);
    }
  }, [units]);

  // Modales de clientes y unidades
  const [isClientUnitModalOpen, setIsClientUnitModalOpen] = useState<boolean>(false);
  const [unitToEdit, setUnitToEdit] = useState<RentalUnit | null>(null);
  
  // Filtros activos
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | 'Global'>('Global');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Ciclo / Periodo actual
  const [periodIndex, setPeriodIndex] = useState<number>(0);
  const periods = [
    { en: 'October 2026 (Current Cycle)', es: 'Octubre 2026 (Ciclo Actual)' },
    { en: 'November 2026 (Simulated Rollover)', es: 'Noviembre 2026 (Ciclo Simulado)' },
    { en: 'December 2026 (Simulated Rollover)', es: 'Diciembre 2026 (Ciclo Simulado)' },
    { en: 'January 2027 (Simulated Rollover)', es: 'Enero 2027 (Ciclo Simulado)' }
  ];
  const currentPeriodName = periods[periodIndex][language];
  const nextPeriodName = periods[Math.min(periods.length - 1, periodIndex + 1)][language];

  // Modales
  const [selectedUnitForPayment, setSelectedUnitForPayment] = useState<RentalUnit | null>(null);
  const [isMonthCloseModalOpen, setIsMonthCloseModalOpen] = useState<boolean>(false);
  const [activeAlertActionNotice, setActiveAlertActionNotice] = useState<string | null>(null);

  // Paginación de tabla
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Filtrado de unidades según Sede
  const locationFilteredUnits = useMemo(() => {
    if (selectedLocation === 'Global') return units;
    return units.filter(u => u.location === selectedLocation);
  }, [units, selectedLocation]);

  // Cálculo de los 10 KPIs ejecutivos
  const kpis = useMemo(() => {
    return calculateExecutiveKPIs(locationFilteredUnits);
  }, [locationFilteredUnits]);

  // Alertas directivas
  const alerts = useMemo(() => {
    return generateDecisionAlerts(units, selectedLocation);
  }, [units, selectedLocation]);

  // Filtrado para la tabla de registros (Búsqueda + Estado)
  const tableFilteredUnits = useMemo(() => {
    return locationFilteredUnits.filter(u => {
      // Filtro de estado
      if (statusFilter !== 'ALL' && u.paymentStatus !== statusFilter) {
        return false;
      }
      // Filtro de texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchId = u.id.toLowerCase().includes(query);
        const matchTenant = u.tenantName.toLowerCase().includes(query);
        const matchAddress = u.address.toLowerCase().includes(query);
        const matchCity = u.city.toLowerCase().includes(query);
        return matchId || matchTenant || matchAddress || matchCity;
      }
      return true;
    });
  }, [locationFilteredUnits, statusFilter, searchQuery]);

  // Paginación
  const totalPages = Math.ceil(tableFilteredUnits.length / itemsPerPage) || 1;
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableFilteredUnits.slice(start, start + itemsPerPage);
  }, [tableFilteredUnits, currentPage]);

  // Handlers
  const handleToggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'es' : 'en');
  };

  const handleRecordPayment = (unitId: string, paymentData: any) => {
    setUnits(prev => prev.map(u => {
      if (u.id === unitId) {
        const updatedCollected = u.actualCollected + paymentData.amount;
        const newTransaction = {
          id: `tx-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          amount: paymentData.amount,
          amortizedDebt: paymentData.amortizedDebt,
          amortizedRent: paymentData.amortizedRent,
          amortizedLateFee: paymentData.amortizedLateFee,
          paymentMethod: paymentData.paymentMethod,
          referenceNumber: paymentData.referenceNumber,
          notes: paymentData.notes,
          recordedBy: 'Administrador de Rentas',
        };
        const updatedUnit: RentalUnit = {
          ...u,
          actualCollected: updatedCollected,
          paymentHistory: [newTransaction, ...u.paymentHistory]
        };
        return enrichUnit(updatedUnit);
      }
      return u;
    }));

    setSelectedUnitForPayment(null);
    setActiveAlertActionNotice(t.paymentSuccessToast);
    setTimeout(() => setActiveAlertActionNotice(null), 4000);
  };

  const handleExecuteMonthClose = (lateFeeAmount: number) => {
    const rolled = simulateMonthClose(units, lateFeeAmount);
    setUnits(rolled);
    setPeriodIndex(prev => Math.min(periods.length - 1, prev + 1));
    setIsMonthCloseModalOpen(false);
    setActiveAlertActionNotice(t.monthCloseSuccessToast);
    setTimeout(() => setActiveAlertActionNotice(null), 4000);
  };

  const handleResetSimulation = () => {
    const fresh = INITIAL_RENTAL_UNITS.map(enrichUnit);
    setUnits(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Error clearing storage:', e);
    }
    setPeriodIndex(0);
    setActiveAlertActionNotice(t.resetCycleSuccessToast);
    setTimeout(() => setActiveAlertActionNotice(null), 4000);
  };

  const handleSaveClientUnit = (savedUnit: RentalUnit) => {
    setUnits(prev => {
      const exists = prev.some(u => u.id === savedUnit.id);
      if (exists) {
        return prev.map(u => u.id === savedUnit.id ? enrichUnit(savedUnit) : u);
      }
      return [enrichUnit(savedUnit), ...prev];
    });
    setIsClientUnitModalOpen(false);
    setUnitToEdit(null);
    setActiveAlertActionNotice(t.unitSavedToast);
    setTimeout(() => setActiveAlertActionNotice(null), 4000);
  };

  const handleDeleteUnit = (unitId: string) => {
    setUnits(prev => prev.filter(u => u.id !== unitId));
    setIsClientUnitModalOpen(false);
    setUnitToEdit(null);
    setActiveAlertActionNotice(t.unitDeletedToast);
    setTimeout(() => setActiveAlertActionNotice(null), 4000);
  };

  const handleExportPdf = () => {
    try {
      const filename = exportRentScorecardPdf({
        units: locationFilteredUnits,
        kpis,
        alerts,
        location: selectedLocation,
        periodName: currentPeriodName,
        language
      });
      setActiveAlertActionNotice(`${t.scorecardPdfSuccessToast} (${filename})`);
      setTimeout(() => setActiveAlertActionNotice(null), 5000);
    } catch (err) {
      console.error('Error exporting rent scorecard pdf:', err);
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Address', 'Tenant', 'Location', 'UnitStatus', 'ScheduledRent', 'PreviousDebt', 'ActualCollected', 'CarryoverBalance', 'PaymentStatus', 'UtilitiesScheduled', 'UtilitiesPaid'];
    const rows = locationFilteredUnits.map(u => [
      u.id,
      `"${u.address}, ${u.city}"`,
      `"${u.tenantName}"`,
      u.location,
      u.unitStatus,
      u.scheduledRent,
      u.previousDebt,
      u.actualCollected,
      u.carryoverBalance,
      u.paymentStatus,
      u.utilitiesScheduled,
      u.utilitiesPaid
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Rentas_${selectedLocation}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // DATOS PARA GRÁFICAS DONUT (RECHARTS)
  // 1. Estados de Cobranza
  const collectionStatusChartData = useMemo(() => {
    let paid = 0;
    let partial = 0;
    let delinquent = 0;
    let vacant = 0;

    locationFilteredUnits.forEach(u => {
      if (u.paymentStatus === 'Paid') paid += 1;
      else if (u.paymentStatus === 'Partial') partial += 1;
      else if (u.paymentStatus === 'Delinquent') delinquent += 1;
      else if (u.paymentStatus === 'Vacant') vacant += 1;
    });

    return [
      { name: t.statusPaid, value: paid, color: '#10b981' },
      { name: t.statusPartial, value: partial, color: '#f59e0b' },
      { name: t.statusDelinquent, value: delinquent, color: '#ef4444' },
      { name: t.statusVacant, value: vacant, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [locationFilteredUnits, t]);

  // 2. Distribución de Ingresos por Sede
  const revenueShareChartData = useMemo(() => {
    let caRev = 0;
    let okcRev = 0;
    let gtRev = 0;

    units.forEach(u => {
      if (u.location === 'CA') caRev += u.actualCollected;
      else if (u.location === 'OKC') okcRev += u.actualCollected;
      else if (u.location === 'GT') gtRev += u.actualCollected;
    });

    return [
      { name: 'California (CA)', value: Math.round(caRev), color: '#3b82f6' },
      { name: 'Oklahoma City (OKC)', value: Math.round(okcRev), color: '#8b5cf6' },
      { name: 'Guatemala (GT)', value: Math.round(gtRev), color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [units]);

  // 3. Composición de Facturación vs Cartera Vencida
  const portfolioCompChartData = useMemo(() => {
    let totalCollected = 0;
    let totalCarryover = 0;
    let totalLateFees = 0;

    locationFilteredUnits.forEach(u => {
      totalCollected += u.actualCollected;
      totalCarryover += u.carryoverBalance;
      totalLateFees += (u.lateFeesScheduled - u.lateFeesPaid);
    });

    return [
      { name: t.collectedAmount, value: Math.round(totalCollected), color: '#10b981' },
      { name: t.pendingBalance, value: Math.round(totalCarryover), color: '#ef4444' },
      { name: t.lateFees, value: Math.round(Math.max(0, totalLateFees)), color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [locationFilteredUnits, t]);

  // Helper para insignias de estado
  const renderStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {t.statusPaid}
          </span>
        );
      case 'Partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            {t.statusPartial}
          </span>
        );
      case 'Delinquent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            {t.statusDelinquent}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            {t.statusVacant}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-slate-800 pb-12">
      
      {/* Toast Informativo / Alerta de Acción */}
      {activeAlertActionNotice && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-medium">{activeAlertActionNotice}</span>
          <button
            type="button"
            onClick={() => setActiveAlertActionNotice(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ENCABEZADO PRINCIPAL & CONTROLES GLOBALES */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-blue-900 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-500 text-slate-950">
              Executive Suite
            </span>
            <span className="text-xs text-blue-200 font-mono">
              3 Global Sedes • 88 Properties
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t.moduleTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            {t.moduleSubtitle}
          </p>
        </div>

        {/* Barra de Acciones y Switch de Idioma */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          
          {/* Switch de Idioma Reactivo EN / ES */}
          <button
            type="button"
            onClick={handleToggleLanguage}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            title="Cambiar idioma entre Español e Inglés"
          >
            <Languages className="w-4 h-4 text-amber-400" />
            <span>{t.switchLanguage}</span>
          </button>

          {/* Botón Registrar Nuevo Inquilino / Unidad */}
          <button
            type="button"
            onClick={() => {
              setUnitToEdit(null);
              setIsClientUnitModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Registrar nuevo cliente, contrato de arrendamiento y parámetros de unidad"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            <span>{t.btnNewClientUnit}</span>
          </button>

          {/* Exportar Scorecard PDF */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            title="Exportar informe oficial de Scorecard de 10 KPIs y Rent Roll en PDF"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t.exportScorecardPdfBtn}</span>
          </button>

          {/* Exportar CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            title="Descargar padrón en archivo CSV"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">{t.exportCsvBtn}</span>
          </button>

          {/* Restablecer Simulación */}
          {periodIndex > 0 && (
            <button
              type="button"
              onClick={handleResetSimulation}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
              title="Restaurar datos iniciales del ciclo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.resetSimulationBtn}</span>
            </button>
          )}

          {/* Botón Simular Cierre de Mes */}
          <button
            type="button"
            onClick={() => setIsMonthCloseModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Cerrar el ciclo mensual y trasladar los saldos pendientes a mora previa"
          >
            <Calendar className="w-4 h-4" />
            <span>{t.closeMonthBtn}</span>
          </button>
        </div>
      </div>

      {/* BARRA DE FILTRADO POR SEDE Y PERIODO */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Pestañas de Sedes: Global, CA, OKC, GT */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'Global', label: t.locationAll, count: units.length },
            { id: 'CA', label: 'California (CA)', count: units.filter(u => u.location === 'CA').length },
            { id: 'OKC', label: 'Oklahoma City (OKC)', count: units.filter(u => u.location === 'OKC').length },
            { id: 'GT', label: 'Guatemala (GT)', count: units.filter(u => u.location === 'GT').length }
          ].map(loc => (
            <button
              key={loc.id}
              type="button"
              onClick={() => {
                setSelectedLocation(loc.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                selectedLocation === loc.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{loc.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedLocation === loc.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {loc.count}
              </span>
            </button>
          ))}
        </div>

        {/* Indicador de Periodo Actual */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t.currentPeriod}:
          </span>
          <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentPeriodName}</span>
          </span>
        </div>
      </div>

      {/* SECCIÓN 1: SCORECARD DIRECTIVO DE 10 KPIS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>{t.scorecardTitle}</span>
            </h2>
            <p className="text-xs text-slate-500">{t.scorecardSubtitle}</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {locationFilteredUnits.length} {t.paginationUnits}
          </span>
        </div>

        {/* Grid de las 10 Métricas Clave */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* 1. Effective Collection Rate */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiEffectiveCollectionRate}</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className={`text-xl sm:text-2xl font-black font-mono ${
              kpis.effectiveCollectionRate >= 90 ? 'text-emerald-700' : kpis.effectiveCollectionRate >= 80 ? 'text-amber-700' : 'text-rose-700'
            }`}>
              {kpis.effectiveCollectionRate}%
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate" title={t.kpiEffectiveCollectionRateDesc}>
              {t.kpiEffectiveCollectionRateDesc}
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">
              {t.targetBenchmark}: <span className="text-slate-700 font-mono">≥ 95.0%</span>
            </div>
          </div>

          {/* 2. Delinquency Rate */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiDelinquencyRate}</span>
              <Flame className="w-4 h-4 text-rose-600" />
            </div>
            <p className={`text-xl sm:text-2xl font-black font-mono ${
              kpis.delinquencyRate > 10 ? 'text-rose-700' : kpis.delinquencyRate > 5 ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {kpis.delinquencyRate}%
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate" title={t.kpiDelinquencyRateDesc}>
              {t.kpiDelinquencyRateDesc}
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">
              {t.targetBenchmark}: <span className="text-slate-700 font-mono">≤ 5.0%</span>
            </div>
          </div>

          {/* 3. Delinquency Amount */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiDelinquencyAmount}</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
              {formatUSD(kpis.delinquencyAmount)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate" title={t.kpiDelinquencyAmountDesc}>
              {t.kpiDelinquencyAmountDesc}
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">
              {t.targetBenchmark}: <span className="text-slate-700 font-mono">$0 USD</span>
            </div>
          </div>

          {/* 4. Occupancy Rate */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiOccupancyRate}</span>
              <Home className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-blue-900 font-mono">
              {kpis.occupancyRate}%
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate">
              {kpis.occupiedUnits} / {kpis.totalUnits} {t.paginationUnits}
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">
              {t.targetBenchmark}: <span className="text-slate-700 font-mono">≥ 95.0%</span>
            </div>
          </div>

          {/* 5. Maintenance Time */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiMaintenanceTime}</span>
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {kpis.maintenanceTime} <span className="text-xs font-sans font-bold text-slate-500">días</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate" title={t.kpiMaintenanceTimeDesc}>
              {t.kpiMaintenanceTimeDesc}
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">
              {t.targetBenchmark}: <span className="text-slate-700 font-mono">≤ 2.0 días</span>
            </div>
          </div>

          {/* 6. Billing Accuracy */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiBillingAccuracy}</span>
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {kpis.billingAccuracy}%
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate" title={t.kpiBillingAccuracyDesc}>
              {t.kpiBillingAccuracyDesc}
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">
              {t.targetBenchmark}: <span className="text-slate-700 font-mono">≥ 99.0%</span>
            </div>
          </div>

          {/* 7. Reporting Compliance */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiReportingCompliance}</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-blue-900 font-mono">
              {kpis.reportingCompliance}%
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate" title={t.kpiReportingComplianceDesc}>
              {t.kpiReportingComplianceDesc}
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">
              {t.targetBenchmark}: <span className="text-slate-700 font-mono">100.0%</span>
            </div>
          </div>

          {/* 8. Tenant Retention */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiTenantRetention}</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-900 font-mono">
              {kpis.tenantRetention}%
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate" title={t.kpiTenantRetentionDesc}>
              {t.kpiTenantRetentionDesc}
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">
              {t.targetBenchmark}: <span className="text-slate-700 font-mono">≥ 90.0%</span>
            </div>
          </div>

          {/* 9. Total Vacancy Months */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiTotalVacancyMonths}</span>
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <p className={`text-xl sm:text-2xl font-black font-mono ${
              kpis.totalVacancyMonths > 4 ? 'text-amber-700' : 'text-slate-900'
            }`}>
              {kpis.totalVacancyMonths} <span className="text-xs font-sans font-bold text-slate-500">meses</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate" title={t.kpiTotalVacancyMonthsDesc}>
              {t.kpiTotalVacancyMonthsDesc}
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">
              {t.targetBenchmark}: <span className="text-slate-700 font-mono">≤ 2 meses</span>
            </div>
          </div>

          {/* 10. Total Revenue MTD */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white p-3.5 sm:p-4 rounded-xl border border-emerald-300 shadow-xs">
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.kpiTotalRevenueMTD}</span>
              <Coins className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-800 font-mono">
              {formatUSD(kpis.totalRevenueMTD)}
            </p>
            <p className="text-[10px] text-emerald-700 font-medium mt-1 truncate">
              {t.kpiTotalRevenueMTDDesc}
            </p>
            <div className="mt-2 text-[10px] font-bold text-emerald-800">
              Total Due: <span className="font-mono">{formatUSD(kpis.totalDueSum)}</span>
            </div>
          </div>

        </div>
      </div>

      {/* SECCIÓN 2: TRES GRÁFICAS CIRCULARES DONUT INTERACTIVAS (RECHARTS) */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            <span>{t.chartsTitle}</span>
          </h2>
          <p className="text-xs text-slate-500">{t.chartsSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Gráfica 1: Estados de Cobranza y Pago */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                {t.chartCollectionStatusTitle}
              </h3>
              <p className="text-[11px] text-slate-500 mb-2">
                {t.chartCollectionStatusSub}
              </p>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={collectionStatusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {collectionStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} unidades`, name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-[11px] text-slate-700 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica 2: Distribución de Ingresos por Sede */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                {t.chartRevenueShareTitle}
              </h3>
              <p className="text-[11px] text-slate-500 mb-2">
                {t.chartRevenueShareSub}
              </p>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueShareChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueShareChartData.map((entry, index) => (
                      <Cell key={`cell-rev-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [formatUSD(Number(value)), name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-[11px] text-slate-700 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica 3: Facturación Cobrada vs Cartera Vencida */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                {t.chartPortfolioCompTitle}
              </h3>
              <p className="text-[11px] text-slate-500 mb-2">
                {t.chartPortfolioCompSub}
              </p>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioCompChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {portfolioCompChartData.map((entry, index) => (
                      <Cell key={`cell-comp-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [formatUSD(Number(value)), name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-[11px] text-slate-700 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* SECCIÓN 3: BANDEJA DE ALERTAS CRÍTICAS Y TOMA DE DECISIONES */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>{t.alertsTitle}</span>
          </h2>
          <p className="text-xs text-slate-500">{t.alertsSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {alerts.map(alert => {
            const isCrit = alert.severity === 'critical';
            const isWarn = alert.severity === 'warning';
            const isOpt = alert.severity === 'optimal';

            const cardBg = isCrit 
              ? 'bg-rose-50/70 border-rose-300' 
              : isWarn 
              ? 'bg-amber-50/70 border-amber-300' 
              : 'bg-emerald-50/70 border-emerald-300';

            const tagColor = isCrit
              ? 'bg-rose-600 text-white'
              : isWarn
              ? 'bg-amber-600 text-white'
              : 'bg-emerald-600 text-white';

            const tagLabel = isCrit ? t.criticalNotice : isWarn ? t.warningNotice : t.optimalNotice;
            const alertTitle = (t as any)[alert.titleKey] || alert.titleKey;
            const alertDesc = (t as any)[alert.descriptionKey] || alert.descriptionKey;
            const alertAction = (t as any)[alert.actionKey] || alert.actionKey;

            return (
              <div key={alert.id} className={`p-4 rounded-xl border ${cardBg} shadow-xs flex flex-col justify-between space-y-3`}>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tagColor}`}>
                      {tagLabel}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white/70 px-2 py-0.5 rounded border border-black/5">
                      {alert.location} • {alert.metricValue}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 pt-1">
                    {alertTitle}
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {alertDesc}
                  </p>
                </div>

                {/* Caja de Acción Recomendada */}
                <div className="p-3 bg-white/80 rounded-lg border border-black/5 flex items-start gap-2.5">
                  <ExternalLink className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t.recommendedAction}:
                    </span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {alertAction}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAlertActionNotice(`Protocolo ejecutado: ${alertTitle}`);
                      setTimeout(() => setActiveAlertActionNotice(null), 4000);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    {t.takeActionBtn}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 4: GESTOR DE REGISTROS (TABLA INTERACTIVA) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Cabecera y Filtros de la Tabla */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>{t.tableTitle}</span>
            </h2>
            <p className="text-xs text-slate-500">{t.tableSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Buscador */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t.searchPlaceholder}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Filtro de Estado */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">{t.allStatuses}</option>
              <option value="Paid">{t.statusPaid}</option>
              <option value="Partial">{t.statusPartial}</option>
              <option value="Delinquent">{t.statusDelinquent}</option>
              <option value="Vacant">{t.statusVacant}</option>
            </select>
          </div>
        </div>

        {/* Tabla Responsive */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 sm:px-4">{t.colId}</th>
                <th className="py-3 px-3 sm:px-4">{t.colAddress}</th>
                <th className="py-3 px-3 sm:px-4">{t.colTenant}</th>
                <th className="py-3 px-3 sm:px-4 text-center">{t.colLocation}</th>
                <th className="py-3 px-3 sm:px-4 text-right">{t.colScheduledRent}</th>
                <th className="py-3 px-3 sm:px-4 text-right">{t.colPrevDebt}</th>
                <th className="py-3 px-3 sm:px-4 text-right">{t.colCollected}</th>
                <th className="py-3 px-3 sm:px-4 text-right">{t.colCarryover}</th>
                <th className="py-3 px-3 sm:px-4 text-center">{t.colPaymentStatus}</th>
                <th className="py-3 px-3 sm:px-4 text-center">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm">{t.noRecordsFound}</p>
                  </td>
                </tr>
              ) : (
                paginatedUnits.map(unit => {
                  const hasDebt = unit.carryoverBalance > 0;
                  return (
                    <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* ID Unidad */}
                      <td className="py-3 px-3 sm:px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                        {unit.id}
                        <span className="block text-[10px] text-slate-400 font-sans font-normal">{unit.unitNumber}</span>
                      </td>

                      {/* Dirección */}
                      <td className="py-3 px-3 sm:px-4">
                        <span className="font-semibold text-slate-900 block truncate max-w-[180px]" title={unit.address}>
                          {unit.address}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{unit.city}</span>
                      </td>

                      {/* Inquilino */}
                      <td className="py-3 px-3 sm:px-4">
                        <span className={`font-semibold block ${unit.unitStatus === 'Vacant' ? 'italic text-slate-400' : 'text-slate-800'}`}>
                          {unit.tenantName}
                        </span>
                        {unit.tenantPhone && (
                          <span className="text-[10px] text-slate-400 block">{unit.tenantPhone}</span>
                        )}
                      </td>

                      {/* Sede */}
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          unit.location === 'CA' ? 'bg-blue-100 text-blue-800' :
                          unit.location === 'OKC' ? 'bg-purple-100 text-purple-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {unit.location}
                        </span>
                      </td>

                      {/* Renta Programada */}
                      <td className="py-3 px-3 sm:px-4 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {formatUSD(unit.scheduledRent)}
                      </td>

                      {/* Mora Previa */}
                      <td className="py-3 px-3 sm:px-4 text-right font-mono font-semibold whitespace-nowrap">
                        <span className={unit.previousDebt > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                          {formatUSD(unit.previousDebt)}
                        </span>
                      </td>

                      {/* Cobrado Efectivo */}
                      <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatUSD(unit.actualCollected)}
                      </td>

                      {/* Saldo Arrastrado (Carryover) */}
                      <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={hasDebt ? 'text-rose-700 font-black' : 'text-slate-400'}>
                          {formatUSD(unit.carryoverBalance)}
                        </span>
                      </td>

                      {/* Estado de Pago */}
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        {renderStatusBadge(unit.paymentStatus)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {unit.unitStatus === 'Occupied' && (
                            <button
                              type="button"
                              onClick={() => setSelectedUnitForPayment(unit)}
                              className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
                              title="Registrar abono o pago parcial/total para esta unidad"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="hidden xl:inline">{t.btnRecordPayment}</span>
                            </button>
                          )}

                          {/* Botón Editar Cliente / Unidad */}
                          <button
                            type="button"
                            onClick={() => {
                              setUnitToEdit(unit);
                              setIsClientUnitModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-300 hover:border-indigo-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                            title={t.editUnitBtn}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar Unidad */}
                          <button
                            type="button"
                            onClick={() => {
                              setUnitToEdit(unit);
                              setIsClientUnitModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                            title={t.deleteUnitBtn}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación Inferior */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>{t.paginationShowing} </span>
            <strong className="text-slate-800">
              {tableFilteredUnits.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, tableFilteredUnits.length)}
            </strong>
            <span> {t.paginationOf} </span>
            <strong className="text-slate-800">{tableFilteredUnits.length}</strong>
            <span> {t.paginationUnits}</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-bold text-slate-700">
              {t.paginationPage} {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* MODAL DE REGISTRO / EDICIÓN DE CLIENTE Y UNIDAD */}
      <ClientUnitModal
        isOpen={isClientUnitModalOpen}
        onClose={() => {
          setIsClientUnitModalOpen(false);
          setUnitToEdit(null);
        }}
        onSave={handleSaveClientUnit}
        onDelete={handleDeleteUnit}
        unitToEdit={unitToEdit}
        defaultLocation={selectedLocation}
        language={language}
      />

      {/* MODAL DE REGISTRO DE PAGO / ABONO */}
      {selectedUnitForPayment && (
        <RentPaymentModal
          unit={selectedUnitForPayment}
          language={language}
          onClose={() => setSelectedUnitForPayment(null)}
          onConfirmPayment={handleRecordPayment}
        />
      )}

      {/* MODAL DE CIERRE DE MES Y SIMULACIÓN DE ARRASTRE */}
      {isMonthCloseModalOpen && (
        <MonthCloseModal
          units={units}
          currentPeriodName={currentPeriodName}
          nextPeriodName={nextPeriodName}
          language={language}
          onClose={() => setIsMonthCloseModalOpen(false)}
          onConfirmCloseMonth={handleExecuteMonthClose}
        />
      )}

    </div>
  );
};
