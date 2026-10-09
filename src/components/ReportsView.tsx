import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  Printer, 
  CheckCircle2, 
  DollarSign, 
  FileCheck2,
  FileSpreadsheet,
  Download,
  Building2,
  Filter,
  Eye,
  Layers,
  TrendingUp,
  PieChart as PieChartIcon,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  FolderTree,
  ListTree,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  BarChart3,
  AlertTriangle,
  XCircle,
  LayoutGrid,
  Table as TableIcon,
  Activity,
  Percent,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OJ_LOGO_DATA_URI } from '../utils/ojLogoAsset';
import { formatQuetzales, formatDate, exportToCSV, getModalidadCompraByMonto, formatDateTime } from '../utils/formatters';
import { generatePurchasesPDF } from '../utils/pdfExport';
import { calculateExecutiveKPIs } from '../utils/pdfChartRenderer';
import { 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend 
} from 'recharts';
import { 
  isUserGlobalAdmin, 
  getUserAssignedArea, 
  getVisiblePurchasesForUser, 
  TECHNICAL_AREAS_LIST,
  normalizeAreaName 
} from '../utils/rbacUtils';
import { InstitutionalReportModal } from './InstitutionalReportModal';
import { BudgetExecutionKPI } from './budget/BudgetExecutionKPI';
import { OFFICIAL_BUDGET_GROUPS, OFFICIAL_RENGLONES, getGrupoFullName } from '../data/budgetStandardCatalog';
import { PurchaseRecord, BudgetLineItem } from '../types';

export interface AnaliticoRenglonNode {
  renglon: string;
  nombreRenglon: string;
  compras: PurchaseRecord[];
  totalRenglon: number;
  desglosePorArea: Record<string, number>;
}

export interface AnaliticoGrupoNode {
  grupo: string;
  nombreGrupo: string;
  renglones: Record<string, AnaliticoRenglonNode>;
  totalGrupo: number;
  totalEventosGrupo: number;
}

export const ReportsView: React.FC = () => {
  const { purchases, logAudit, currentUser, showToast, budgetAvailability } = useApp();

  // Roles y Permisos de Área (RBAC)
  const isAdmin = isUserGlobalAdmin(currentUser);
  const userAssignedArea = getUserAssignedArea(currentUser);

  // Estado del tipo de informe activo
  const [selectedReportType, setSelectedReportType] = useState<
    'consolidado' | 'adjudicados' | 'git' | 'presupuesto_analitico' | 'reporte_grupo' | 'metricas_ejecucion' | 'balance' | 'analitico'
  >('consolidado');

  // Filtro de área específico (solo disponible para administradores)
  const [adminAreaFilter, setAdminAreaFilter] = useState<string>('todas');

  // Estado para visualización de boleta oficial de dictamen individual
  const [selectedDictamenPurchase, setSelectedDictamenPurchase] = useState<PurchaseRecord | null>(null);

  // 1. Filtrado RBAC base de adquisiciones según usuario
  const basePurchases = useMemo(() => {
    // Si no es administrador, filtrar estrictamente a su área asignada
    if (!isAdmin) {
      return getVisiblePurchasesForUser(purchases, currentUser);
    }
    // Si es administrador y seleccionó un filtro de área específico
    if (adminAreaFilter !== 'todas') {
      const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const lowerFilter = clean(adminAreaFilter);
      return purchases.filter(p => {
        const pArea = clean(p.areaSolicitante || '');
        const pDep = clean(p.dependenciaSolicitante || '');
        return pArea === lowerFilter || pDep === lowerFilter;
      });
    }
    // Administrador con todas las áreas
    return purchases;
  }, [purchases, currentUser, isAdmin, adminAreaFilter]);

  // 2. Datasets especializados según el tipo de informe
  const adjudicados = useMemo(() => {
    return basePurchases.filter(p => p.estatusEvento === 'Adjudicación');
  }, [basePurchases]);

  const evaluadosGIT = useMemo(() => {
    return basePurchases.filter(p => p.evaluadoGIT === 'Sí' || Boolean(p.fechaDictamenGIT));
  }, [basePurchases]);

  // 3. Totales y KPIs reactivos
  const totalMontoConsolidado = useMemo(() => {
    return basePurchases.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [basePurchases]);

  const totalMontoAdjudicado = useMemo(() => {
    return adjudicados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [adjudicados]);

  const totalMontoDictaminado = useMemo(() => {
    return evaluadosGIT.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [evaluadosGIT]);

  // Estado para alternar la visualización del panel de gráficas circulares en cada informe
  const [showConsolidadoCharts, setShowConsolidadoCharts] = useState(true);
  const [showAdjudicadosCharts, setShowAdjudicadosCharts] = useState(true);
  const [showGitCharts, setShowGitCharts] = useState(true);
  const [showBalanceCharts, setShowBalanceCharts] = useState(true);
  const [showAnaliticoCharts, setShowAnaliticoCharts] = useState(true);
  const [showPresupuestoAnaliticoCharts, setShowPresupuestoAnaliticoCharts] = useState(true);
  const [showReporteGrupoCharts, setShowReporteGrupoCharts] = useState(true);

  // Filtros interactivos para Presupuesto Analítico de Renglones
  const [budgetRenglonSearch, setBudgetRenglonSearch] = useState('');
  const [budgetGroupFilter, setBudgetGroupFilter] = useState('todos');
  const [budgetStatusFilter, setBudgetStatusFilter] = useState('todos');

  // Estado de grupos expandidos en Reporte por Grupo Presupuestario
  const [expandedReportGroups, setExpandedReportGroups] = useState<Record<string, boolean>>({
    '100': true,
    '200': true,
    '300': true
  });

  // Estados específicos para Dashboard de Métricas de Ejecución Presupuestaria (Gráficos de Dona)
  const [showMetricasCharts, setShowMetricasCharts] = useState(true);
  const [metricasSearch, setMetricasSearch] = useState('');
  const [metricasGroupFilter, setMetricasGroupFilter] = useState('todos');
  const [metricasTierFilter, setMetricasTierFilter] = useState('todos');
  const [metricasSortBy, setMetricasSortBy] = useState<'renglon' | 'mayor_ejecucion' | 'menor_ejecucion' | 'mayor_vigente' | 'mayor_disponible'>('renglon');
  const [metricasViewMode, setMetricasViewMode] = useState<'grid' | 'table'>('grid');

  // Datasets de Gráficas Circulares para Adjudicados
  const adjudicadosModalidadChartData = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    adjudicados.forEach(p => {
      const mod = p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre;
      if (!map[mod]) map[mod] = { count: 0, amount: 0 };
      map[mod].count += 1;
      map[mod].amount += Number(p.monto) || 0;
    });
    const palette = ['#1d4ed8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return Object.entries(map).map(([name, data], idx) => ({
      name,
      value: data.count,
      amount: data.amount,
      color: palette[idx % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [adjudicados]);

  const adjudicadosRenglonesChartData = useMemo(() => {
    const map: Record<string, number> = {};
    adjudicados.forEach(p => {
      const r = p.renglonPresupuestario ? `R-${p.renglonPresupuestario}` : 'Sin Renglón';
      map[r] = (map[r] || 0) + (Number(p.monto) || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const top4 = sorted.slice(0, 4);
    const others = sorted.slice(4).reduce((sum, item) => sum + item[1], 0);
    const palette = ['#2563eb', '#7c3aed', '#db2777', '#059669'];
    const result = top4.map((item, idx) => ({
      name: item[0],
      value: item[1],
      color: palette[idx % palette.length]
    }));
    if (others > 0) {
      result.push({ name: 'Otros Renglones', value: others, color: '#94a3b8' });
    }
    return result;
  }, [adjudicados]);

  // Datasets de Gráficas Circulares para Dictámenes Técnicos GIT
  const gitEstatusChartData = useMemo(() => {
    const conOficio = evaluadosGIT.filter(p => Boolean(p.fechaElaboracionOficioGIT)).length;
    const pendientesOficio = evaluadosGIT.length - conOficio;
    return [
      { name: 'Con Oficio Emitido', value: conOficio, color: '#10b981' },
      { name: 'En Trámite Técnico', value: pendientesOficio, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [evaluadosGIT]);

  const gitModalidadChartData = useMemo(() => {
    const map: Record<string, number> = {};
    evaluadosGIT.forEach(p => {
      const mod = p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre;
      map[mod] = (map[mod] || 0) + 1;
    });
    const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    return Object.entries(map).map(([name, value], idx) => ({
      name,
      value,
      color: palette[idx % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [evaluadosGIT]);

  // Cálculos de KPIs ejecutivos y datasets para gráficas circulares
  const { kpis, estatusChartData, modalidadChartData, dictamenChartData, areaChartData, recommendations } =
    useMemo(() => calculateExecutiveKPIs(basePurchases), [basePurchases]);

  const CustomReportPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-xl border border-slate-700 space-y-1 z-50">
          <p className="font-bold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: data.color }} />
            {data.name}
          </p>
          <p className="text-slate-300">
            Eventos: <strong className="text-white font-mono">{data.value}</strong>
            {data.percentage !== undefined && (
              <span className="ml-1 text-emerald-400 font-bold">({data.percentage}%)</span>
            )}
          </p>
          <p className="text-slate-300">
            Monto: <strong className="text-amber-300 font-mono">{formatQuetzales(data.amount)}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // 4. Datos estructurados para el informe de Balance Financiero
  const balanceData = useMemo(() => {
    // Agrupar compras visibles por renglón presupuestario
    const purchasesByRenglon: Record<string, { totalComprometido: number; totalPagado: number; count: number }> = {};
    
    basePurchases.forEach(p => {
      const renglon = p.renglonPresupuestario || '158';
      if (!purchasesByRenglon[renglon]) {
        purchasesByRenglon[renglon] = { totalComprometido: 0, totalPagado: 0, count: 0 };
      }
      const monto = Number(p.monto) || 0;
      purchasesByRenglon[renglon].totalComprometido += monto;
      purchasesByRenglon[renglon].count += 1;
      if (p.estadoPago === 'pagado') {
        purchasesByRenglon[renglon].totalPagado += monto;
      }
    });

    // Mapear renglones usando el catálogo estándar y budgetAvailability
    return OFFICIAL_RENGLONES.map(official => {
      const rKey = official.renglon;
      const budgetItem = budgetAvailability.find(b => b.renglonPresupuestario === rKey);
      const purchaseSummary = purchasesByRenglon[rKey] || { totalComprometido: 0, totalPagado: 0, count: 0 };

      // Presupuesto vigente: si el usuario es admin, toma el total institucional del renglón.
      // Si no es admin, muestra el asignado institucional o al menos el total comprometido de su área para contexto.
      const presupuestoVigente = budgetItem ? budgetItem.presupuestoVigente : (purchaseSummary.totalComprometido * 1.25 || 100000);
      const comprometido = purchaseSummary.totalComprometido;
      const pagado = purchaseSummary.totalPagado;
      const saldoDisponible = Math.max(0, presupuestoVigente - comprometido);
      const porcentajeEjecucion = presupuestoVigente > 0 ? (comprometido / presupuestoVigente) * 100 : 0;

      return {
        renglon: official.renglon,
        nombreRenglon: official.nombreRenglon,
        grupo: official.grupo,
        presupuestoVigente,
        comprometido,
        pagado,
        saldoDisponible,
        porcentajeEjecucion,
        eventosCount: purchaseSummary.count
      };
    }).filter(row => row.comprometido > 0 || row.presupuestoVigente > 0);
  }, [basePurchases, budgetAvailability]);

  const totalBalanceVigente = useMemo(() => balanceData.reduce((acc, r) => acc + r.presupuestoVigente, 0), [balanceData]);
  const totalBalanceComprometido = useMemo(() => balanceData.reduce((acc, r) => acc + r.comprometido, 0), [balanceData]);
  const totalBalancePagado = useMemo(() => balanceData.reduce((acc, r) => acc + r.pagado, 0), [balanceData]);
  const totalBalanceSaldo = useMemo(() => balanceData.reduce((acc, r) => acc + r.saldoDisponible, 0), [balanceData]);

  // Datasets de Gráficas Circulares para Balance Financiero
  const balanceDistribucionChartData = useMemo(() => {
    return [
      { name: 'Pagado Devengado', value: totalBalancePagado, color: '#7c3aed' },
      { name: 'Comprometido Trámite', value: Math.max(0, totalBalanceComprometido - totalBalancePagado), color: '#2563eb' },
      { name: 'Saldo Disponible', value: totalBalanceSaldo, color: '#059669' }
    ].filter(d => d.value > 0);
  }, [totalBalancePagado, totalBalanceComprometido, totalBalanceSaldo]);

  const balanceGrupoChartData = useMemo(() => {
    const map: Record<string, number> = { 'Grupo 100': 0, 'Grupo 200': 0, 'Grupo 300': 0 };
    balanceData.forEach(b => {
      const gKey = `Grupo ${b.grupo}`;
      map[gKey] = (map[gKey] || 0) + b.presupuestoVigente;
    });
    const colors: Record<string, string> = {
      'Grupo 100': '#3b82f6',
      'Grupo 200': '#10b981',
      'Grupo 300': '#f59e0b'
    };
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#64748b'
    })).filter(d => d.value > 0);
  }, [balanceData]);

  // 5. Datos estructurados para el "Analítico por Grupo y Renglón"
  // Para Administrador: desglosa analítico por grupo y renglón de TODAS las áreas.
  // Para demás roles: desglosa analítico por grupo y renglón SOLO del área que le corresponde.
  const analiticoTree = useMemo<AnaliticoGrupoNode[]>(() => {
    const groupsMap: Record<string, AnaliticoGrupoNode> = {
      '100': {
        grupo: '100',
        nombreGrupo: 'Grupo 100: Servicios No Personales',
        renglones: {},
        totalGrupo: 0,
        totalEventosGrupo: 0
      },
      '200': {
        grupo: '200',
        nombreGrupo: 'Grupo 200: Materiales y Suministros',
        renglones: {},
        totalGrupo: 0,
        totalEventosGrupo: 0
      },
      '300': {
        grupo: '300',
        nombreGrupo: 'Grupo 300: Propiedad, Planta, Equipo e Intangibles',
        renglones: {},
        totalGrupo: 0,
        totalEventosGrupo: 0
      }
    };

    basePurchases.forEach(p => {
      const renglonCode = p.renglonPresupuestario || '158';
      let grupoCode = '100';
      if (renglonCode.startsWith('2')) grupoCode = '200';
      else if (renglonCode.startsWith('3')) grupoCode = '300';

      if (!groupsMap[grupoCode]) {
        groupsMap[grupoCode] = {
          grupo: grupoCode,
          nombreGrupo: getGrupoFullName(grupoCode),
          renglones: {},
          totalGrupo: 0,
          totalEventosGrupo: 0
        };
      }

      const grp = groupsMap[grupoCode];
      if (!grp.renglones[renglonCode]) {
        const official = OFFICIAL_RENGLONES.find(r => r.renglon === renglonCode);
        grp.renglones[renglonCode] = {
          renglon: renglonCode,
          nombreRenglon: official?.nombreRenglon || `Renglón ${renglonCode}`,
          compras: [],
          totalRenglon: 0,
          desglosePorArea: {}
        };
      }

      const rng = grp.renglones[renglonCode];
      rng.compras.push(p);
      const monto = Number(p.monto) || 0;
      rng.totalRenglon += monto;
      grp.totalGrupo += monto;
      grp.totalEventosGrupo += 1;

      // Acumular desglose por área solicitante (clave para el Administrador)
      const area = p.areaSolicitante || p.dependenciaSolicitante || 'Área no especificada';
      rng.desglosePorArea[area] = (rng.desglosePorArea[area] || 0) + monto;
    });

    return Object.values(groupsMap).filter(g => g.totalEventosGrupo > 0);
  }, [basePurchases]);

  const granTotalAnaliticoMonto = useMemo(() => {
    return analiticoTree.reduce((acc, g) => acc + g.totalGrupo, 0);
  }, [analiticoTree]);

  const granTotalAnaliticoEventos = useMemo(() => {
    return analiticoTree.reduce((acc, g) => acc + g.totalEventosGrupo, 0);
  }, [analiticoTree]);

  // Datasets de Gráficas Circulares para Analítico Grupo/Renglón
  const analiticoGrupoChartData = useMemo(() => {
    const palette = ['#2563eb', '#10b981', '#f59e0b'];
    return analiticoTree.map((g, idx) => ({
      name: `G-${g.grupo}`,
      fullName: g.nombreGrupo,
      value: g.totalGrupo,
      eventos: g.totalEventosGrupo,
      color: palette[idx % palette.length]
    })).filter(d => d.value > 0);
  }, [analiticoTree]);

  const analiticoTopRenglonesChartData = useMemo(() => {
    const renglonesList: { name: string; value: number }[] = [];
    analiticoTree.forEach(g => {
      (Object.values(g.renglones) as AnaliticoRenglonNode[]).forEach(r => {
        renglonesList.push({
          name: `R-${r.renglon}`,
          value: r.totalRenglon
        });
      });
    });
    const sorted = renglonesList.sort((a, b) => b.value - a.value);
    const top4 = sorted.slice(0, 4);
    const others = sorted.slice(4).reduce((sum, item) => sum + item.value, 0);
    const palette = ['#1d4ed8', '#7c3aed', '#db2777', '#059669'];
    const result = top4.map((item, idx) => ({
      name: item.name,
      value: item.value,
      color: palette[idx % palette.length]
    }));
    if (others > 0) {
      result.push({ name: 'Otros Renglones', value: others, color: '#94a3b8' });
    }
    return result;
  }, [analiticoTree]);

  // ==========================================================
  // INFORME DE PRESUPUESTO ANALÍTICO (TODOS LOS RENGLONES Y DISPONIBILIDADES)
  // ==========================================================
  const analiticoRenglonesData = useMemo(() => {
    return budgetAvailability.filter(l => {
      const matchSearch = budgetRenglonSearch === '' ||
        l.renglonPresupuestario.includes(budgetRenglonSearch) ||
        l.nombreRenglon.toLowerCase().includes(budgetRenglonSearch.toLowerCase()) ||
        l.grupoPresupuestario.toLowerCase().includes(budgetRenglonSearch.toLowerCase());

      const matchGroup = budgetGroupFilter === 'todos' ||
        l.grupoPresupuestario.includes(budgetGroupFilter) ||
        l.renglonPresupuestario.startsWith(budgetGroupFilter[0]);

      const matchStatus = budgetStatusFilter === 'todos' || l.estatusDisponibilidad === budgetStatusFilter;

      return matchSearch && matchGroup && matchStatus;
    });
  }, [budgetAvailability, budgetRenglonSearch, budgetGroupFilter, budgetStatusFilter]);

  const analiticoRenglonesTotals = useMemo(() => {
    return analiticoRenglonesData.reduce((acc, l) => {
      acc.inicial += Number(l.presupuestoInicial) || 0;
      acc.modificaciones += Number(l.modificacionesAprobadas) || 0;
      acc.vigente += Number(l.presupuestoVigente) || 0;
      acc.pagado += Number(l.pagadoQueRebaja) || 0;
      acc.disponibleReal += Number(l.disponibleReal) || 0;
      acc.comprometido += Number(l.comprometidoPendiente) || 0;
      acc.disponibleProyectado += Number(l.disponibleProyectado) || 0;
      acc.totalGasto += (Number(l.pagadoQueRebaja) || 0) + (Number(l.comprometidoPendiente) || 0);
      return acc;
    }, {
      inicial: 0,
      modificaciones: 0,
      vigente: 0,
      pagado: 0,
      disponibleReal: 0,
      comprometido: 0,
      disponibleProyectado: 0,
      totalGasto: 0
    });
  }, [analiticoRenglonesData]);

  const analiticoSaludStats = useMemo(() => {
    const saludable = analiticoRenglonesData.filter(l => l.estatusDisponibilidad === 'Con Disponibilidad').length;
    const alerta = analiticoRenglonesData.filter(l => l.estatusDisponibilidad === 'Alerta Disponibilidad Baja').length;
    const deficit = analiticoRenglonesData.filter(l => l.estatusDisponibilidad === 'Sin Disponibilidad').length;
    return { saludable, alerta, deficit, total: analiticoRenglonesData.length };
  }, [analiticoRenglonesData]);

  const analiticoDistribucionChartData = useMemo(() => {
    if (analiticoRenglonesTotals.vigente <= 0) return [];
    return [
      { name: 'Pagado Devengado', value: analiticoRenglonesTotals.pagado, color: '#2563eb' },
      { name: 'Comprometido Trámite', value: analiticoRenglonesTotals.comprometido, color: '#f59e0b' },
      { name: 'Saldo Disponible', value: Math.max(0, analiticoRenglonesTotals.disponibleProyectado), color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [analiticoRenglonesTotals]);

  const analiticoSemaforoChartData = useMemo(() => {
    return [
      { name: 'Con Disponibilidad', value: analiticoSaludStats.saludable, color: '#10b981' },
      { name: 'Alerta Preventiva', value: analiticoSaludStats.alerta, color: '#f59e0b' },
      { name: 'Déficit / Sin Saldo', value: analiticoSaludStats.deficit, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [analiticoSaludStats]);

  // ==========================================================
  // INFORME CONSOLIDADO POR GRUPO PRESUPUESTARIO (GRUPOS 100, 200, 300)
  // ==========================================================
  const dataReporteGrupo = useMemo(() => {
    const groupDefinitions = [
      { id: '100', name: 'Grupo 100 - Servicios No Personales' },
      { id: '200', name: 'Grupo 200 - Materiales y Suministros' },
      { id: '300', name: 'Grupo 300 - Propiedad, Planta, Equipo e Intangibles' }
    ];

    const groupMap = new Map<string, {
      id: string;
      nombreGrupo: string;
      presupuestoInicial: number;
      modificaciones: number;
      presupuestoVigente: number;
      pagadoQueRebaja: number;
      comprometidoPendiente: number;
      gastoTotal: number;
      disponibleReal: number;
      disponibleProyectado: number;
      comprasCount: number;
      renglonesCount: number;
      ejecucionPct: number;
      renglones: Array<BudgetLineItem & { gastoTotal: number; comprasCount: number }>;
    }>();

    groupDefinitions.forEach(def => {
      groupMap.set(def.id, {
        id: def.id,
        nombreGrupo: def.name,
        presupuestoInicial: 0,
        modificaciones: 0,
        presupuestoVigente: 0,
        pagadoQueRebaja: 0,
        comprometidoPendiente: 0,
        gastoTotal: 0,
        disponibleReal: 0,
        disponibleProyectado: 0,
        comprasCount: 0,
        renglonesCount: 0,
        ejecucionPct: 0,
        renglones: []
      });
    });

    budgetAvailability.forEach(l => {
      let gId = '100';
      if (l.grupoPresupuestario.includes('200') || l.renglonPresupuestario.startsWith('2')) gId = '200';
      else if (l.grupoPresupuestario.includes('300') || l.renglonPresupuestario.startsWith('3')) gId = '300';
      else if (l.grupoPresupuestario.includes('100') || l.renglonPresupuestario.startsWith('1')) gId = '100';
      else gId = l.grupoPresupuestario.slice(0, 3) || '100';

      if (!groupMap.has(gId)) {
        groupMap.set(gId, {
          id: gId,
          nombreGrupo: l.grupoPresupuestario || `Grupo ${gId}`,
          presupuestoInicial: 0,
          modificaciones: 0,
          presupuestoVigente: 0,
          pagadoQueRebaja: 0,
          comprometidoPendiente: 0,
          gastoTotal: 0,
          disponibleReal: 0,
          disponibleProyectado: 0,
          comprasCount: 0,
          renglonesCount: 0,
          ejecucionPct: 0,
          renglones: []
        });
      }

      const g = groupMap.get(gId)!;
      const gastoRenglon = (Number(l.pagadoQueRebaja) || 0) + (Number(l.comprometidoPendiente) || 0);
      const comprasLinked = basePurchases.filter(p => p.renglonPresupuestario === l.renglonPresupuestario).length;

      g.presupuestoInicial += Number(l.presupuestoInicial) || 0;
      g.modificaciones += Number(l.modificacionesAprobadas) || 0;
      g.presupuestoVigente += Number(l.presupuestoVigente) || 0;
      g.pagadoQueRebaja += Number(l.pagadoQueRebaja) || 0;
      g.comprometidoPendiente += Number(l.comprometidoPendiente) || 0;
      g.gastoTotal += gastoRenglon;
      g.disponibleReal += Number(l.disponibleReal) || 0;
      g.disponibleProyectado += Number(l.disponibleProyectado) || 0;
      g.comprasCount += comprasLinked;
      g.renglonesCount += 1;

      g.renglones.push({
        ...l,
        gastoTotal: gastoRenglon,
        comprasCount: comprasLinked
      });
    });

    const result = Array.from(groupMap.values()).map(g => {
      g.ejecucionPct = g.presupuestoVigente > 0 ? (g.gastoTotal / g.presupuestoVigente) * 100 : 0;
      g.renglones.sort((a, b) => a.renglonPresupuestario.localeCompare(b.renglonPresupuestario));
      return g;
    }).filter(g => g.renglonesCount > 0);

    return result.sort((a, b) => a.id.localeCompare(b.id));
  }, [budgetAvailability, basePurchases]);

  const totalesReporteGrupos = useMemo(() => {
    return dataReporteGrupo.reduce((acc, g) => {
      acc.inicial += g.presupuestoInicial;
      acc.modificaciones += g.modificaciones;
      acc.vigente += g.presupuestoVigente;
      acc.pagado += g.pagadoQueRebaja;
      acc.comprometido += g.comprometidoPendiente;
      acc.gastoTotal += g.gastoTotal;
      acc.disponibleReal += g.disponibleReal;
      acc.disponibleProyectado += g.disponibleProyectado;
      acc.comprasCount += g.comprasCount;
      acc.renglonesCount += g.renglonesCount;
      return acc;
    }, {
      inicial: 0,
      modificaciones: 0,
      vigente: 0,
      pagado: 0,
      comprometido: 0,
      gastoTotal: 0,
      disponibleReal: 0,
      disponibleProyectado: 0,
      comprasCount: 0,
      renglonesCount: 0
    });
  }, [dataReporteGrupo]);

  const grupoVigenteChartData = useMemo(() => {
    const palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
    return dataReporteGrupo.map((g, idx) => ({
      name: `G-${g.id}`,
      fullName: g.nombreGrupo,
      value: g.presupuestoVigente,
      color: palette[idx % palette.length]
    })).filter(d => d.value > 0);
  }, [dataReporteGrupo]);

  const grupoGastoChartData = useMemo(() => {
    const palette = ['#2563eb', '#7c3aed', '#db2777', '#0891b2'];
    return dataReporteGrupo.map((g, idx) => ({
      name: `G-${g.id}`,
      fullName: g.nombreGrupo,
      value: g.gastoTotal,
      color: palette[idx % palette.length]
    })).filter(d => d.value > 0);
  }, [dataReporteGrupo]);

  // ==========================================================
  // DASHBOARD DE MÉTRICAS DE EJECUCIÓN PRESUPUESTARIA (GRÁFICOS DE DONA)
  // ==========================================================
  const rawMetricasEjecucionData = useMemo(() => {
    return budgetAvailability.map(l => {
      const inicial = Number(l.presupuestoInicial) || 0;
      const modificaciones = Number(l.modificacionesAprobadas) || 0;
      const vigente = Number(l.presupuestoVigente) || 0;
      const pagado = Number(l.pagadoQueRebaja) || 0;
      const comprometido = Number(l.comprometidoPendiente) || 0;
      const gastoTotal = pagado + comprometido;
      const disponibleReal = Number(l.disponibleReal) || 0;
      const disponibleProyectado = Number(l.disponibleProyectado) || 0;
      const disponibleConsolidado = Math.max(0, disponibleProyectado);
      
      const pctEjecucion = vigente > 0 ? (gastoTotal / vigente) * 100 : 0;
      const pctDisponible = vigente > 0 ? (disponibleConsolidado / vigente) * 100 : 0;
      const pctPagado = vigente > 0 ? (pagado / vigente) * 100 : 0;
      const pctComprometido = vigente > 0 ? (comprometido / vigente) * 100 : 0;

      const comprasLinked = basePurchases.filter(p => p.renglonPresupuestario === l.renglonPresupuestario);

      // Datos para gráfico de dona individual
      const donutData: Array<{ name: string; value: number; color: string; pct: number }> = [];
      if (vigente > 0) {
        if (pagado > 0) {
          donutData.push({
            name: 'Pagado (Devengado)',
            value: pagado,
            color: '#2563eb', // blue-600
            pct: pctPagado
          });
        }
        if (comprometido > 0) {
          donutData.push({
            name: 'Comprometido en Trámite',
            value: comprometido,
            color: '#f59e0b', // amber-500
            pct: pctComprometido
          });
        }
        if (disponibleProyectado > 0) {
          donutData.push({
            name: 'Disponible Consolidado',
            value: disponibleProyectado,
            color: '#10b981', // emerald-500
            pct: pctDisponible
          });
        } else if (disponibleProyectado < 0) {
          donutData.push({
            name: 'Déficit Presupuestario',
            value: Math.abs(disponibleProyectado),
            color: '#ef4444', // red-500
            pct: Math.abs((disponibleProyectado / vigente) * 100)
          });
        }
      }

      if (donutData.length === 0) {
        donutData.push({
          name: 'Sin Techo Asignado',
          value: 1,
          color: '#cbd5e1',
          pct: 0
        });
      }

      return {
        ...l,
        inicial,
        modificaciones,
        vigente,
        pagado,
        comprometido,
        gastoTotal,
        disponibleReal,
        disponibleProyectado,
        disponibleConsolidado,
        pctEjecucion,
        pctDisponible,
        pctPagado,
        pctComprometido,
        comprasCount: comprasLinked.length,
        comprasLinked,
        donutData
      };
    });
  }, [budgetAvailability, basePurchases]);

  // Filtros y ordenamiento aplicados a las Métricas de Ejecución
  const filteredMetricasEjecucionData = useMemo(() => {
    let result = rawMetricasEjecucionData.filter(item => {
      const matchSearch = metricasSearch === '' ||
        item.renglonPresupuestario.includes(metricasSearch) ||
        item.nombreRenglon.toLowerCase().includes(metricasSearch.toLowerCase()) ||
        item.grupoPresupuestario.toLowerCase().includes(metricasSearch.toLowerCase());

      const matchGroup = metricasGroupFilter === 'todos' ||
        item.grupoPresupuestario.includes(metricasGroupFilter) ||
        item.renglonPresupuestario.startsWith(metricasGroupFilter[0]);

      let matchTier = true;
      if (metricasTierFilter === 'alta') {
        matchTier = item.pctEjecucion > 85;
      } else if (metricasTierFilter === 'media') {
        matchTier = item.pctEjecucion >= 50 && item.pctEjecucion <= 85;
      } else if (metricasTierFilter === 'baja') {
        matchTier = item.pctEjecucion < 50;
      } else if (metricasTierFilter === 'alerta') {
        matchTier = item.estatusDisponibilidad !== 'Con Disponibilidad' || item.disponibleProyectado <= 0;
      }

      return matchSearch && matchGroup && matchTier;
    });

    result.sort((a, b) => {
      if (metricasSortBy === 'mayor_ejecucion') {
        return b.pctEjecucion - a.pctEjecucion;
      }
      if (metricasSortBy === 'menor_ejecucion') {
        return a.pctEjecucion - b.pctEjecucion;
      }
      if (metricasSortBy === 'mayor_vigente') {
        return b.vigente - a.vigente;
      }
      if (metricasSortBy === 'mayor_disponible') {
        return b.disponibleProyectado - a.disponibleProyectado;
      }
      return a.renglonPresupuestario.localeCompare(b.renglonPresupuestario);
    });

    return result;
  }, [rawMetricasEjecucionData, metricasSearch, metricasGroupFilter, metricasTierFilter, metricasSortBy]);

  // Totales institucionales consolidados para Métricas de Ejecución
  const totalesMetricasEjecucion = useMemo(() => {
    const sum = rawMetricasEjecucionData.reduce((acc, item) => {
      acc.inicial += item.inicial;
      acc.modificaciones += item.modificaciones;
      acc.vigente += item.vigente;
      acc.pagado += item.pagado;
      acc.comprometido += item.comprometido;
      acc.gastoTotal += item.gastoTotal;
      acc.disponibleReal += item.disponibleReal;
      acc.disponibleProyectado += item.disponibleProyectado;
      acc.comprasCount += item.comprasCount;
      return acc;
    }, {
      inicial: 0,
      modificaciones: 0,
      vigente: 0,
      pagado: 0,
      comprometido: 0,
      gastoTotal: 0,
      disponibleReal: 0,
      disponibleProyectado: 0,
      comprasCount: 0
    });

    const pctGlobalEjecucion = sum.vigente > 0 ? (sum.gastoTotal / sum.vigente) * 100 : 0;
    const pctGlobalDisponible = sum.vigente > 0 ? (Math.max(0, sum.disponibleProyectado) / sum.vigente) * 100 : 0;

    const donutGlobal: Array<{ name: string; value: number; color: string; pct: number }> = [];
    if (sum.vigente > 0) {
      if (sum.pagado > 0) {
        donutGlobal.push({ 
          name: 'Pagado (Devengado)', 
          value: sum.pagado, 
          color: '#2563eb',
          pct: (sum.pagado / sum.vigente) * 100 
        });
      }
      if (sum.comprometido > 0) {
        donutGlobal.push({ 
          name: 'Comprometido en Trámite', 
          value: sum.comprometido, 
          color: '#f59e0b',
          pct: (sum.comprometido / sum.vigente) * 100 
        });
      }
      if (sum.disponibleProyectado > 0) {
        donutGlobal.push({ 
          name: 'Disponible Consolidado', 
          value: sum.disponibleProyectado, 
          color: '#10b981',
          pct: pctGlobalDisponible 
        });
      } else if (sum.disponibleProyectado < 0) {
        donutGlobal.push({ 
          name: 'Déficit Presupuestario', 
          value: Math.abs(sum.disponibleProyectado), 
          color: '#ef4444',
          pct: Math.abs((sum.disponibleProyectado / sum.vigente) * 100) 
        });
      }
    }

    const renglonesAlta = rawMetricasEjecucionData.filter(i => i.pctEjecucion > 85).length;
    const renglonesMedia = rawMetricasEjecucionData.filter(i => i.pctEjecucion >= 50 && i.pctEjecucion <= 85).length;
    const renglonesBaja = rawMetricasEjecucionData.filter(i => i.pctEjecucion < 50).length;
    const renglonesAlerta = rawMetricasEjecucionData.filter(i => i.estatusDisponibilidad !== 'Con Disponibilidad' || i.disponibleProyectado <= 0).length;

    const semaforoDonutData = [
      { name: 'Baja Ejecución (<50%)', value: renglonesBaja, color: '#10b981' },
      { name: 'Media Ejecución (50-85%)', value: renglonesMedia, color: '#3b82f6' },
      { name: 'Alta Ejecución (>85%)', value: renglonesAlta, color: '#f59e0b' },
      { name: 'Alerta / Déficit', value: renglonesAlerta, color: '#ef4444' }
    ].filter(d => d.value > 0);

    return {
      ...sum,
      pctGlobalEjecucion,
      pctGlobalDisponible,
      donutGlobal,
      semaforoDonutData,
      renglonesAlta,
      renglonesMedia,
      renglonesBaja,
      renglonesAlerta,
      totalRenglones: rawMetricasEjecucionData.length
    };
  }, [rawMetricasEjecucionData]);

  // Acciones de Impresión y Exportación
  const handlePrint = () => {
    window.print();
  };

  const handleExportFullCSV = () => {
    let rows: Record<string, any>[] = [];
    let filename = '';

    if (selectedReportType === 'presupuesto_analitico') {
      filename = `Presupuesto_Analitico_Renglones_Disponibilidades_OJ_${new Date().toISOString().slice(0, 10)}`;
      rows = analiticoRenglonesData.map((l) => ({
        'Grupo Presupuestario': l.grupoPresupuestario,
        'Renglón': l.renglonPresupuestario,
        'Nombre del Renglón': l.nombreRenglon,
        'Presupuesto Inicial (GTQ)': l.presupuestoInicial,
        'Modificaciones (+/-) (GTQ)': l.modificacionesAprobadas,
        'Presupuesto Vigente (GTQ)': l.presupuestoVigente,
        'Pagado que Rebaja (GTQ)': l.pagadoQueRebaja,
        'Disponible Real (GTQ)': l.disponibleReal,
        'Comprometido Pendiente (GTQ)': l.comprometidoPendiente,
        'Disponible Proyectado (GTQ)': l.disponibleProyectado,
        '% Usado/Comprometido': `${l.porcentajeUsadoComprometido}%`,
        'Estatus Disponibilidad': l.estatusDisponibilidad,
      }));
      rows.push({
        'Grupo Presupuestario': 'TOTALES CONSOLIDADOS',
        'Renglón': `(${analiticoRenglonesData.length} Renglones)`,
        'Nombre del Renglón': 'SUMATORIA CONSOLIDADA DE DISPONIBILIDADES',
        'Presupuesto Inicial (GTQ)': analiticoRenglonesTotals.inicial,
        'Modificaciones (+/-) (GTQ)': analiticoRenglonesTotals.modificaciones,
        'Presupuesto Vigente (GTQ)': analiticoRenglonesTotals.vigente,
        'Pagado que Rebaja (GTQ)': analiticoRenglonesTotals.pagado,
        'Disponible Real (GTQ)': analiticoRenglonesTotals.disponibleReal,
        'Comprometido Pendiente (GTQ)': analiticoRenglonesTotals.comprometido,
        'Disponible Proyectado (GTQ)': analiticoRenglonesTotals.disponibleProyectado,
        '% Usado/Comprometido': analiticoRenglonesTotals.vigente > 0 ? `${((analiticoRenglonesTotals.totalGasto / analiticoRenglonesTotals.vigente) * 100).toFixed(1)}%` : '0%',
        'Estatus Disponibilidad': 'CONSOLIDADO',
      });
    } else if (selectedReportType === 'reporte_grupo') {
      filename = `Reporte_Ejecucion_Grupos_Presupuestarios_OJ_${new Date().toISOString().slice(0, 10)}`;
      dataReporteGrupo.forEach(grp => {
        rows.push({
          'Grupo Presupuestario': grp.nombreGrupo.toUpperCase(),
          'Renglón': `SUBTOTAL ${grp.id}`,
          'Descripción': `Consolidado de ${grp.renglonesCount} renglones`,
          'Presupuesto Inicial (GTQ)': grp.presupuestoInicial,
          'Modificaciones (+/-) (GTQ)': grp.modificaciones,
          'Presupuesto Vigente (GTQ)': grp.presupuestoVigente,
          'Pagado que Rebaja (GTQ)': grp.pagadoQueRebaja,
          'Comprometido Pendiente (GTQ)': grp.comprometidoPendiente,
          'Gasto Total (GTQ)': grp.gastoTotal,
          'Disponible Proyectado (GTQ)': grp.disponibleProyectado,
          '% Ejecución': `${grp.ejecucionPct.toFixed(1)}%`,
          'Eventos': grp.comprasCount
        });
        grp.renglones.forEach(l => {
          rows.push({
            'Grupo Presupuestario': grp.nombreGrupo,
            'Renglón': l.renglonPresupuestario,
            'Descripción': l.nombreRenglon,
            'Presupuesto Inicial (GTQ)': l.presupuestoInicial,
            'Modificaciones (+/-) (GTQ)': l.modificacionesAprobadas,
            'Presupuesto Vigente (GTQ)': l.presupuestoVigente,
            'Pagado que Rebaja (GTQ)': l.pagadoQueRebaja,
            'Comprometido Pendiente (GTQ)': l.comprometidoPendiente,
            'Gasto Total (GTQ)': l.gastoTotal,
            'Disponible Proyectado (GTQ)': l.disponibleProyectado,
            '% Ejecución': `${l.porcentajeUsadoComprometido}%`,
            'Eventos': l.comprasCount
          });
        });
      });
      rows.push({
        'Grupo Presupuestario': 'GRAN TOTAL INSTITUCIONAL',
        'Renglón': `(${dataReporteGrupo.length} Grupos)`,
        'Descripción': 'SUMATORIA GENERAL DE GRUPOS PRESUPUESTARIOS',
        'Presupuesto Inicial (GTQ)': totalesReporteGrupos.inicial,
        'Modificaciones (+/-) (GTQ)': totalesReporteGrupos.modificaciones,
        'Presupuesto Vigente (GTQ)': totalesReporteGrupos.vigente,
        'Pagado que Rebaja (GTQ)': totalesReporteGrupos.pagado,
        'Comprometido Pendiente (GTQ)': totalesReporteGrupos.comprometido,
        'Gasto Total (GTQ)': totalesReporteGrupos.gastoTotal,
        'Disponible Proyectado (GTQ)': totalesReporteGrupos.disponibleProyectado,
        '% Ejecución': totalesReporteGrupos.vigente > 0 ? `${((totalesReporteGrupos.gastoTotal / totalesReporteGrupos.vigente) * 100).toFixed(1)}%` : '0%',
        'Eventos': totalesReporteGrupos.comprasCount
      });
    } else if (selectedReportType === 'metricas_ejecucion') {
      filename = `Metricas_Ejecucion_Presupuestaria_Donas_OJ_${new Date().toISOString().slice(0, 10)}`;
      rows = filteredMetricasEjecucionData.map((l) => ({
        'Grupo Presupuestario': l.grupoPresupuestario,
        'Renglón': l.renglonPresupuestario,
        'Nombre del Renglón': l.nombreRenglon,
        'Presupuesto Inicial (GTQ)': l.inicial,
        'Modificaciones (+/-) (GTQ)': l.modificaciones,
        'Presupuesto Vigente (GTQ)': l.vigente,
        'Gasto Pagado Devengado (GTQ)': l.pagado,
        'Comprometido en Trámite (GTQ)': l.comprometido,
        'Gasto Total Ejecutado (GTQ)': l.gastoTotal,
        '% Ejecución': `${l.pctEjecucion.toFixed(1)}%`,
        'Disponible Real (GTQ)': l.disponibleReal,
        'Saldo Disponible Consolidado (GTQ)': l.disponibleProyectado,
        '% Disponible Consolidado': `${l.pctDisponible.toFixed(1)}%`,
        'Estatus Oficial': l.estatusDisponibilidad,
        'Adquisiciones Vinculadas (F56-e/NOG)': l.comprasCount
      }));
      rows.push({
        'Grupo Presupuestario': 'TOTALES CONSOLIDADOS',
        'Renglón': `(${filteredMetricasEjecucionData.length} Renglones)`,
        'Nombre del Renglón': 'SUMATORIA CONSOLIDADA DE MÉTRICAS DE EJECUCIÓN',
        'Presupuesto Inicial (GTQ)': totalesMetricasEjecucion.inicial,
        'Modificaciones (+/-) (GTQ)': totalesMetricasEjecucion.modificaciones,
        'Presupuesto Vigente (GTQ)': totalesMetricasEjecucion.vigente,
        'Gasto Pagado Devengado (GTQ)': totalesMetricasEjecucion.pagado,
        'Comprometido en Trámite (GTQ)': totalesMetricasEjecucion.comprometido,
        'Gasto Total Ejecutado (GTQ)': totalesMetricasEjecucion.gastoTotal,
        '% Ejecución': `${totalesMetricasEjecucion.pctGlobalEjecucion.toFixed(1)}%`,
        'Disponible Real (GTQ)': totalesMetricasEjecucion.disponibleReal,
        'Saldo Disponible Consolidado (GTQ)': totalesMetricasEjecucion.disponibleProyectado,
        '% Disponible Consolidado': `${totalesMetricasEjecucion.pctGlobalDisponible.toFixed(1)}%`,
        'Estatus Oficial': 'CONSOLIDADO INSTITUCIONAL',
        'Adquisiciones Vinculadas (F56-e/NOG)': totalesMetricasEjecucion.comprasCount
      });
    } else if (selectedReportType === 'consolidado') {
      filename = `Informe_Consolidado_Adquisiciones_OJ_${new Date().toISOString().slice(0, 10)}`;
      rows = basePurchases.map((p, idx) => ({
        '#': idx + 1,
        'NOG Guatecompras': p.nog,
        'Formulario F56-e': p.f56e,
        'Formulario F56 Físico': p.f56,
        'Área Solicitante': p.areaSolicitante || 'N/A',
        'Renglón Presupuestario': p.renglonPresupuestario || '158',
        'Descripción del Requerimiento': p.descripcion,
        'Fecha Solicitud': p.fechaSolicitud,
        'Modalidad de Compra': p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre,
        'Estatus Evento': p.estatusEvento,
        'Dictamen GIT': p.evaluadoGIT === 'Sí' ? 'Sí (Emitido)' : 'No',
        'Monto (GTQ)': p.monto,
      }));
      // Fila de totalización de montos
      rows.push({
        '#': 'TOTAL',
        'NOG Guatecompras': `TOTAL GENERAL (${basePurchases.length} EVENTOS)`,
        'Formulario F56-e': '',
        'Formulario F56 Físico': '',
        'Área Solicitante': '',
        'Renglón Presupuestario': '',
        'Descripción del Requerimiento': '',
        'Fecha Solicitud': '',
        'Modalidad de Compra': '',
        'Estatus Evento': '',
        'Dictamen GIT': '',
        'Monto (GTQ)': totalMontoConsolidado,
      });
    } else if (selectedReportType === 'adjudicados') {
      filename = `Informe_Eventos_Adjudicados_OJ_${new Date().toISOString().slice(0, 10)}`;
      rows = adjudicados.map((p, idx) => ({
        '#': idx + 1,
        'NOG Guatecompras': p.nog,
        'Formulario F56-e': p.f56e,
        'Área Solicitante': p.areaSolicitante || 'N/A',
        'Descripción': p.descripcion,
        'Proveedor Adjudicado': p.proveedorAdjudicado || 'N/A',
        'Fecha Adjudicación': p.fechaAdjudicacion || p.fechaSolicitud,
        'Modalidad de Compra': p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre,
        'Renglón': p.renglonPresupuestario || '158',
        'Monto Adjudicado (GTQ)': p.monto,
      }));
      rows.push({
        '#': 'TOTAL',
        'NOG Guatecompras': `TOTAL ADJUDICADO (${adjudicados.length} EVENTOS)`,
        'Formulario F56-e': '',
        'Área Solicitante': '',
        'Descripción': '',
        'Proveedor Adjudicado': '',
        'Fecha Adjudicación': '',
        'Modalidad de Compra': '',
        'Renglón': '',
        'Monto Adjudicado (GTQ)': totalMontoAdjudicado,
      });
    } else if (selectedReportType === 'git') {
      filename = `Informe_Dictamenes_GIT_OJ_${new Date().toISOString().slice(0, 10)}`;
      rows = evaluadosGIT.map((p, idx) => ({
        '#': idx + 1,
        'NOG': p.nog,
        'F56-e': p.f56e,
        'Área Solicitante': p.areaSolicitante || 'N/A',
        'Descripción Técnica': p.descripcion,
        'Fecha Dictamen GIT': p.fechaDictamenGIT || 'N/A',
        'Fecha Oficio GIT': p.fechaElaboracionOficioGIT || 'N/A',
        'Cantidad Ofertas Evaluadas': p.cantidadOfertas || 0,
        'Estatus Evento': p.estatusEvento,
        'Monto Dictaminado (GTQ)': p.monto,
      }));
      rows.push({
        '#': 'TOTAL',
        'NOG': `TOTAL DICTÁMENES (${evaluadosGIT.length} EXPEDIENTES)`,
        'F56-e': '',
        'Área Solicitante': '',
        'Descripción Técnica': '',
        'Fecha Dictamen GIT': '',
        'Fecha Oficio GIT': '',
        'Cantidad Ofertas Evaluadas': '',
        'Estatus Evento': '',
        'Monto Dictaminado (GTQ)': totalMontoDictaminado,
      });
    } else if (selectedReportType === 'balance') {
      filename = `Balance_Financiero_Presupuestario_OJ_${new Date().toISOString().slice(0, 10)}`;
      rows = balanceData.map((b) => ({
        'Renglón': b.renglon,
        'Nombre del Renglón': b.nombreRenglon,
        'Grupo Presupuestario': b.grupo,
        'Presupuesto Vigente (GTQ)': b.presupuestoVigente,
        'Comprometido (GTQ)': b.comprometido,
        'Pagado / Devengado (GTQ)': b.pagado,
        'Saldo Disponible (GTQ)': b.saldoDisponible,
        '% Ejecución': `${b.porcentajeEjecucion.toFixed(1)}%`,
        'Eventos': b.eventosCount
      }));
      rows.push({
        'Renglón': 'TOTAL',
        'Nombre del Renglón': 'TOTAL GENERAL BALANCE FINANCIERO',
        'Grupo Presupuestario': '',
        'Presupuesto Vigente (GTQ)': totalBalanceVigente,
        'Comprometido (GTQ)': totalBalanceComprometido,
        'Pagado / Devengado (GTQ)': totalBalancePagado,
        'Saldo Disponible (GTQ)': totalBalanceSaldo,
        '% Ejecución': totalBalanceVigente > 0 ? `${((totalBalanceComprometido / totalBalanceVigente) * 100).toFixed(1)}%` : '0%',
        'Eventos': basePurchases.length
      });
    } else if (selectedReportType === 'analitico') {
      filename = `Analitico_Grupo_Renglon_${isAdmin ? 'Todas_Areas' : normalizeAreaName(userAssignedArea || 'Area')}_${new Date().toISOString().slice(0, 10)}`;
      analiticoTree.forEach(g => {
        (Object.values(g.renglones) as AnaliticoRenglonNode[]).forEach(r => {
          r.compras.forEach((p) => {
            rows.push({
              'Grupo Presupuestario': g.nombreGrupo,
              'Renglón': `${r.renglon} - ${r.nombreRenglon}`,
              'NOG': p.nog,
              'F56-e': p.f56e,
              'Área Solicitante': p.areaSolicitante || 'N/A',
              'Descripción': p.descripcion,
              'Modalidad': p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre,
              'Estatus': p.estatusEvento,
              'Monto (GTQ)': p.monto,
            });
          });
          // Subtotal de Renglón
          rows.push({
            'Grupo Presupuestario': g.nombreGrupo,
            'Renglón': `SUBTOTAL RENGLÓN ${r.renglon}`,
            'NOG': `${r.compras.length} eventos`,
            'F56-e': '',
            'Área Solicitante': '',
            'Descripción': '',
            'Modalidad': '',
            'Estatus': '',
            'Monto (GTQ)': r.totalRenglon,
          });
        });
        // Subtotal de Grupo
        rows.push({
          'Grupo Presupuestario': `SUBTOTAL ${g.nombreGrupo}`,
          'Renglón': '',
          'NOG': `${g.totalEventosGrupo} eventos`,
          'F56-e': '',
          'Área Solicitante': '',
          'Descripción': '',
          'Modalidad': '',
          'Estatus': '',
          'Monto (GTQ)': g.totalGrupo,
        });
      });
      // Gran Total General
      rows.push({
        'Grupo Presupuestario': 'GRAN TOTAL GENERAL INSTITUCIONAL',
        'Renglón': '',
        'NOG': `${granTotalAnaliticoEventos} eventos`,
        'F56-e': '',
        'Área Solicitante': '',
        'Descripción': '',
        'Modalidad': '',
        'Estatus': '',
        'Monto (GTQ)': granTotalAnaliticoMonto,
      });
    }

    exportToCSV(filename, rows);
    logAudit('EXPORTAR_DATOS', 'Reportes', `Exportación de ${selectedReportType} con montos totalizados a CSV.`);
    showToast({
      type: 'success',
      title: 'Reporte CSV Exportado Exitosamente',
      message: `Se descargaron ${rows.length} filas con resumen totalizado al final del archivo.`,
      duration: 5000,
    });
  };

  const handleExportReportPDF = () => {
    if (selectedReportType === 'presupuesto_analitico') {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
      const nowStr = formatDateTime(new Date().toISOString());
      try {
        doc.setFillColor(15, 23, 42); // slate-900 institucional
        doc.rect(14, 6, 251, 23, 'F');
        doc.setFillColor(30, 64, 175); // blue-800 acento
        doc.rect(14, 6, 3.5, 23, 'F');
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(20, 7.5, 19, 19, 2, 2, 'F');
        doc.addImage(OJ_LOGO_DATA_URI, 'PNG', 21, 8.5, 17, 17);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('ORGANISMO JUDICIAL DE GUATEMALA', 43, 12);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(226, 232, 240);
        doc.text('GERENCIA DE INFORMÁTICA Y TELECOMUNICACIONES • AUDITORÍA Y CONTROL FINANCIERO', 43, 17);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('INFORME DE PRESUPUESTO ANALÍTICO DE RENGLONES Y DISPONIBILIDADES PRESUPUESTARIAS', 43, 23);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(226, 232, 240);
        doc.text(`Fecha Emisión: ${nowStr} | Ejercicio Fiscal: 2026`, 260, 12, { align: 'right' });
        doc.text(`Total Renglones: ${analiticoRenglonesData.length}`, 260, 17, { align: 'right' });
      } catch (e) {
        console.warn('Error insertando membrete en PDF analítico', e);
      }

      const head = [[
        'Renglón',
        'Nombre del Renglón Presupuestario',
        'Grupo',
        'Inicial (Q)',
        'Modif. (Q)',
        'Vigente (Q)',
        'Pagado (Q)',
        'Disp. Real (Q)',
        'Comprometido (Q)',
        'Disp. Proy. (Q)',
        '% Usado',
        'Estatus'
      ]];

      const body = analiticoRenglonesData.map(l => [
        l.renglonPresupuestario,
        l.nombreRenglon.slice(0, 32),
        l.grupoPresupuestario.replace('Grupo ', 'G-'),
        Number(l.presupuestoInicial).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        (Number(l.modificacionesAprobadas) >= 0 ? '+' : '') + Number(l.modificacionesAprobadas).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        Number(l.presupuestoVigente).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        Number(l.pagadoQueRebaja).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        Number(l.disponibleReal).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        Number(l.comprometidoPendiente).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        Number(l.disponibleProyectado).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        `${l.porcentajeUsadoComprometido}%`,
        l.estatusDisponibilidad === 'Con Disponibilidad' ? 'DISPONIBLE' : (l.disponibleProyectado <= 0 ? 'DÉFICIT' : 'ALERTA')
      ]);

      const foot = [[
        'TOTALES',
        `Consolidado Oficial (${analiticoRenglonesData.length} Renglones)`,
        '-',
        analiticoRenglonesTotals.inicial.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        (analiticoRenglonesTotals.modificaciones >= 0 ? '+' : '') + analiticoRenglonesTotals.modificaciones.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        analiticoRenglonesTotals.vigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        analiticoRenglonesTotals.pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        analiticoRenglonesTotals.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        analiticoRenglonesTotals.comprometido.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        analiticoRenglonesTotals.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        analiticoRenglonesTotals.vigente > 0 ? `${(((analiticoRenglonesTotals.pagado + analiticoRenglonesTotals.comprometido) / analiticoRenglonesTotals.vigente) * 100).toFixed(1)}%` : '0%',
        'CONSOLIDADO'
      ]];

      autoTable(doc, {
        startY: 33,
        head,
        body,
        foot,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 6.5, cellPadding: 1.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`Página ${i} de ${pageCount} • Presupuesto Analítico de Renglones y Disponibilidades • Organismo Judicial`, 14, 205);
        if (i === pageCount) {
          doc.line(20, 185, 80, 185);
          doc.text('Elaborado: Analista Financiero GIT', 20, 189);
          doc.line(110, 185, 170, 185);
          doc.text('Revisado: Encargado de Compras IT', 110, 189);
          doc.line(200, 185, 260, 185);
          doc.text('Autorizado: Gerente de Informática', 200, 189);
        }
      }

      const filename = `Presupuesto_Analitico_Renglones_OJ_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      logAudit('EXPORTAR_DATOS', 'Reportes', 'Exportación PDF de Informe de Presupuesto Analítico de Renglones.');
      showToast({
        type: 'success',
        title: 'Reporte PDF Generado Exitosamente',
        message: `Informe descargado con cabecera oficial y firmas: ${filename}`,
        duration: 5000,
      });
      return;
    }

    if (selectedReportType === 'reporte_grupo') {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
      const nowStr = formatDateTime(new Date().toISOString());
      try {
        doc.setFillColor(15, 23, 42);
        doc.rect(14, 6, 251, 23, 'F');
        doc.setFillColor(30, 64, 175);
        doc.rect(14, 6, 3.5, 23, 'F');
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(20, 7.5, 19, 19, 2, 2, 'F');
        doc.addImage(OJ_LOGO_DATA_URI, 'PNG', 21, 8.5, 17, 17);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('ORGANISMO JUDICIAL DE GUATEMALA', 43, 12);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(226, 232, 240);
        doc.text('GERENCIA DE INFORMÁTICA Y TELECOMUNICACIONES • AUDITORÍA Y CONTROL FINANCIERO', 43, 17);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('INFORME CONSOLIDADO POR GRUPO PRESUPUESTARIO (GRUPOS 100, 200 Y 300)', 43, 23);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(226, 232, 240);
        doc.text(`Fecha Emisión: ${nowStr} | Ejercicio Fiscal: 2026`, 260, 12, { align: 'right' });
        doc.text(`Grupos Analizados: ${dataReporteGrupo.length}`, 260, 17, { align: 'right' });
      } catch (e) {
        console.warn('Error insertando membrete en PDF de grupos', e);
      }

      const head = [[
        'Grupo / Renglón',
        'Descripción Presupuestaria',
        'P. Vigente (Q)',
        'Gasto Pagado (Q)',
        'Comprometido (Q)',
        'Gasto Total (Q)',
        'Disponible Proy. (Q)',
        '% Ejecución',
        'Eventos'
      ]];

      const body: any[][] = [];
      dataReporteGrupo.forEach(grp => {
        body.push([
          `>> ${grp.nombreGrupo.split('-')[0].trim()}`,
          `SUBTOTAL ${grp.nombreGrupo.toUpperCase()}`,
          grp.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.pagadoQueRebaja.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.comprometidoPendiente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.gastoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          `${grp.ejecucionPct.toFixed(1)}%`,
          `${grp.comprasCount} f56/nog`
        ]);

        grp.renglones.forEach(l => {
          body.push([
            `    R-${l.renglonPresupuestario}`,
            l.nombreRenglon.slice(0, 38),
            Number(l.presupuestoVigente).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            Number(l.pagadoQueRebaja).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            Number(l.comprometidoPendiente).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            l.gastoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            Number(l.disponibleProyectado).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            `${l.porcentajeUsadoComprometido}%`,
            `${l.comprasCount}`
          ]);
        });
      });

      const foot = [[
        'TOTAL INSTITUCIONAL',
        `Suma Consolidada de ${dataReporteGrupo.length} Grupos Presupuestarios`,
        totalesReporteGrupos.vigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        totalesReporteGrupos.pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        totalesReporteGrupos.comprometido.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        totalesReporteGrupos.gastoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        totalesReporteGrupos.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        totalesReporteGrupos.vigente > 0 ? `${((totalesReporteGrupos.gastoTotal / totalesReporteGrupos.vigente) * 100).toFixed(1)}%` : '0%',
        `${totalesReporteGrupos.comprasCount} Eventos`
      ]];

      autoTable(doc, {
        startY: 33,
        head,
        body,
        foot,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 6.5, cellPadding: 1.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`Página ${i} de ${pageCount} • Informe de Ejecución por Grupo Presupuestario • Organismo Judicial`, 14, 205);
        if (i === pageCount) {
          doc.line(20, 185, 80, 185);
          doc.text('Elaborado: Analista Financiero GIT', 20, 189);
          doc.line(110, 185, 170, 185);
          doc.text('Revisado: Encargado de Compras IT', 110, 189);
          doc.line(200, 185, 260, 185);
          doc.text('Autorizado: Gerente de Informática', 200, 189);
        }
      }

      const filename = `Reporte_Grupos_Presupuestarios_OJ_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      logAudit('EXPORTAR_DATOS', 'Reportes', 'Exportación PDF de Informe de Grupos Presupuestarios.');
      showToast({
        type: 'success',
        title: 'Reporte PDF Generado Exitosamente',
        message: `Informe descargado con cabecera oficial y firmas: ${filename}`,
        duration: 5000,
      });
      return;
    }

    if (selectedReportType === 'metricas_ejecucion') {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
      const nowStr = formatDateTime(new Date().toISOString());
      try {
        doc.setFillColor(15, 23, 42); // slate-900 institucional
        doc.rect(14, 6, 251, 23, 'F');
        doc.setFillColor(30, 64, 175); // blue-800 acento
        doc.rect(14, 6, 3.5, 23, 'F');
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(20, 7.5, 19, 19, 2, 2, 'F');
        doc.addImage(OJ_LOGO_DATA_URI, 'PNG', 21, 8.5, 17, 17);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('ORGANISMO JUDICIAL DE GUATEMALA', 43, 12);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(226, 232, 240);
        doc.text('GERENCIA DE INFORMÁTICA Y TELECOMUNICACIONES • CONTROL PRESUPUESTARIO Y AUDITORÍA', 43, 17);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('DASHBOARD DE MÉTRICAS DE EJECUCIÓN PRESUPUESTARIA (PORCENTAJE DE EJECUCIÓN VS DISPONIBLE)', 43, 23);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(226, 232, 240);
        doc.text(`Fecha Emisión: ${nowStr} | Ejercicio Fiscal: 2026`, 260, 12, { align: 'right' });
        doc.text(`Renglones Analizados: ${filteredMetricasEjecucionData.length}`, 260, 17, { align: 'right' });
      } catch (e) {
        console.warn('Error insertando membrete en PDF de métricas', e);
      }

      const head = [[
        'Renglón',
        'Nombre del Renglón Presupuestario',
        'Grupo',
        'P. Vigente (Q)',
        'Pagado (Q)',
        'Comprometido (Q)',
        'Total Ejecutado (Q)',
        '% Ejecución',
        'Disp. Consolidado (Q)',
        '% Disponible',
        'Estatus',
        'Compras'
      ]];

      const body = filteredMetricasEjecucionData.map(l => [
        l.renglonPresupuestario,
        l.nombreRenglon.slice(0, 32),
        l.grupoPresupuestario.replace('Grupo ', 'G-'),
        Number(l.vigente).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        Number(l.pagado).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        Number(l.comprometido).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        Number(l.gastoTotal).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        `${l.pctEjecucion.toFixed(1)}%`,
        Number(l.disponibleProyectado).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        `${l.pctDisponible.toFixed(1)}%`,
        l.estatusDisponibilidad === 'Con Disponibilidad' ? 'DISPONIBLE' : (l.disponibleProyectado <= 0 ? 'DÉFICIT' : 'ALERTA'),
        `${l.comprasCount}`
      ]);

      const foot = [[
        'TOTALES',
        `Consolidado Institucional (${filteredMetricasEjecucionData.length} Renglones)`,
        '-',
        totalesMetricasEjecucion.vigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        totalesMetricasEjecucion.pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        totalesMetricasEjecucion.comprometido.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        totalesMetricasEjecucion.gastoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        `${totalesMetricasEjecucion.pctGlobalEjecucion.toFixed(1)}%`,
        totalesMetricasEjecucion.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        `${totalesMetricasEjecucion.pctGlobalDisponible.toFixed(1)}%`,
        'CONSOLIDADO',
        `${totalesMetricasEjecucion.comprasCount}`
      ]];

      autoTable(doc, {
        startY: 33,
        head,
        body,
        foot,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 6.5, cellPadding: 1.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`Página ${i} de ${pageCount} • Dashboard de Métricas de Ejecución Presupuestaria • Organismo Judicial`, 14, 205);
        if (i === pageCount) {
          doc.line(20, 185, 80, 185);
          doc.text('Elaborado: Analista Financiero GIT', 20, 189);
          doc.line(110, 185, 170, 185);
          doc.text('Revisado: Encargado de Compras IT', 110, 189);
          doc.line(200, 185, 260, 185);
          doc.text('Autorizado: Gerente de Informática', 200, 189);
        }
      }

      const filename = `Metricas_Ejecucion_Presupuestaria_OJ_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      logAudit('EXPORTAR_DATOS', 'Reportes', 'Exportación PDF de Dashboard de Métricas de Ejecución Presupuestaria.');
      showToast({
        type: 'success',
        title: 'Reporte PDF Generado Exitosamente',
        message: `Dashboard descargado con cabecera oficial y firmas: ${filename}`,
        duration: 5000,
      });
      return;
    }

    let dataset = basePurchases;
    let reportTitle = 'CONSOLIDADO GENERAL DE ADQUISICIONES';
    let subtitle = isAdmin 
      ? 'Control Institucional Consolidado • Todas las Áreas Técnicas' 
      : `Reporte de Área Técnica Autorizada: ${userAssignedArea || 'Área Asignada'}`;

    if (selectedReportType === 'adjudicados') {
      dataset = adjudicados;
      reportTitle = 'INFORME OFICIAL DE EVENTOS ADJUDICADOS';
    } else if (selectedReportType === 'git') {
      dataset = evaluadosGIT;
      reportTitle = 'INFORME DE DICTÁMENES Y EVALUACIONES TÉCNICAS (GIT)';
    } else if (selectedReportType === 'balance') {
      reportTitle = 'BALANCE FINANCIERO Y EJECUCIÓN PRESUPUESTARIA';
    } else if (selectedReportType === 'analitico') {
      reportTitle = isAdmin 
        ? 'ANALÍTICO PRESUPUESTARIO POR GRUPO Y RENGLÓN (TODAS LAS ÁREAS)'
        : `ANALÍTICO POR GRUPO Y RENGLÓN - UNIDAD: ${(userAssignedArea || 'ÁREA').toUpperCase()}`;
    }

    try {
      const filename = generatePurchasesPDF({
        purchases: dataset,
        title: reportTitle,
        subtitle: `${subtitle} • Organismo Judicial de Guatemala`,
        filterInfo: {
          area: !isAdmin ? userAssignedArea : (adminAreaFilter !== 'todas' ? adminAreaFilter : undefined),
          status: selectedReportType === 'adjudicados' ? 'Adjudicación' : undefined,
        },
        currentUser,
        filenamePrefix: `Informe_${selectedReportType}_${!isAdmin ? 'Area' : 'Admin'}`,
        includeCharts: true,
      });

      logAudit('EXPORTAR_DATOS', 'Reportes', `Exportación PDF oficial de "${reportTitle}".`);
      showToast({
        type: 'success',
        title: 'Reporte PDF Generado Exitosamente',
        message: `Informe descargado con cabecera de auditoría y montos totalizados: ${filename}`,
        duration: 5000,
      });
    } catch (err) {
      console.error('Error generando PDF de reporte:', err);
      showToast({
        type: 'error',
        title: 'Error al Generar Reporte PDF',
        message: 'No se pudo generar el documento PDF.',
        duration: 5000,
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Encabezado Oficial y Barra de Herramientas */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Reportes, Dictámenes y Analíticos Institucionales
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Ejercicio Fiscal 2026
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Fiscalización, dictámenes técnicos de TI, ejecución presupuestaria y analíticos por grupo y renglón
          </p>
        </div>

        {/* Acciones de Exportación e Impresión */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-report-pdf"
            type="button"
            onClick={handleExportReportPDF}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-rose-700 border border-rose-200 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer hover:border-rose-300"
            title="Exportar informe con cabecera oficial de auditoría y totalización"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Exportar PDF</span>
          </button>
          
          <button
            id="btn-print-report"
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimir</span>
          </button>

          <button
            id="btn-export-full-report-csv"
            type="button"
            onClick={handleExportFullCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer hover:border-emerald-300"
            title="Descargar matriz con totalización de montos"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Control de Acceso RBAC por Área */}
      {!isAdmin ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs print:hidden">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Vista Restringida a su Área Técnica Autorizada: </span>
              <span className="font-semibold underline decoration-amber-400">
                {userAssignedArea || 'Unidad Técnica no definida'}
              </span>
              <span className="text-amber-700 block text-[11px] sm:inline sm:ml-2">
                • Los informes, dictámenes y desgloses analíticos se filtran automáticamente a su unidad.
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-mono text-[10px] font-bold shrink-0">
            RBAC ACTIVO
          </span>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-800 shadow-2xs print:hidden">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900">Rol Administrador General: </span>
              <span className="text-slate-600">
                Acceso irrestricto a todas las áreas institucionales y analíticos completos.
              </span>
            </div>
          </div>

          {/* Selector de Área para Administrador */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <label htmlFor="select-admin-area-filter" className="font-semibold text-slate-700 text-xs">
              Filtrar por Área:
            </label>
            <select
              id="select-admin-area-filter"
              value={adminAreaFilter}
              onChange={(e) => setAdminAreaFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="todas">Todas las Áreas Técnicas ({purchases.length} eventos)</option>
              {TECHNICAL_AREAS_LIST.map((areaName) => (
                <option key={areaName} value={areaName}>
                  {areaName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Componente de KPI: Porcentaje de Ejecución Presupuestaria Actual vs Presupuesto Asignado */}
      <BudgetExecutionKPI
        purchases={basePurchases}
        budgetAvailability={budgetAvailability}
        isAdmin={isAdmin}
        userAssignedArea={userAssignedArea}
      />

      {/* 3. Selector de Pestañas de Informe */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 print:hidden">
        
        {/* Pestaña 1: Consolidado General */}
        <button
          id="tab-report-consolidado"
          type="button"
          onClick={() => setSelectedReportType('consolidado')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'consolidado'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-800'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Consolidado General</span>
            <FileText className={`w-3.5 h-3.5 ${selectedReportType === 'consolidado' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p className={`text-[10px] mt-1 truncate ${selectedReportType === 'consolidado' ? 'text-slate-300' : 'text-slate-400'}`}>
            {basePurchases.length} eventos • {formatQuetzales(totalMontoConsolidado)}
          </p>
        </button>

        {/* Pestaña 2: Adjudicados */}
        <button
          id="tab-report-adjudicados"
          type="button"
          onClick={() => setSelectedReportType('adjudicados')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'adjudicados'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-800'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Adjudicados</span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${selectedReportType === 'adjudicados' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p className={`text-[10px] mt-1 truncate ${selectedReportType === 'adjudicados' ? 'text-slate-300' : 'text-slate-400'}`}>
            {adjudicados.length} adjudicados • {formatQuetzales(totalMontoAdjudicado)}
          </p>
        </button>

        {/* Pestaña 3: Dictámenes Técnicos (GIT) */}
        <button
          id="tab-report-git"
          type="button"
          onClick={() => setSelectedReportType('git')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'git'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-800'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Dictámenes GIT</span>
            <FileCheck2 className={`w-3.5 h-3.5 ${selectedReportType === 'git' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p className={`text-[10px] mt-1 truncate ${selectedReportType === 'git' ? 'text-slate-300' : 'text-slate-400'}`}>
            {evaluadosGIT.length} expedientes • {formatQuetzales(totalMontoDictaminado)}
          </p>
        </button>

        {/* Pestaña 4: Presupuesto Analítico (Renglones y Disponibilidades) */}
        <button
          id="tab-report-presupuesto-analitico"
          type="button"
          onClick={() => setSelectedReportType('presupuesto_analitico')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'presupuesto_analitico'
              ? 'bg-blue-900 text-white border-blue-900 shadow-xs ring-2 ring-blue-500'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 group-hover:text-blue-700" style={{ color: selectedReportType === 'presupuesto_analitico' ? '#fff' : '#1e3a8a' }}>
              Presupuesto Analítico
            </span>
            <Layers className={`w-3.5 h-3.5 ${selectedReportType === 'presupuesto_analitico' ? 'text-amber-400' : 'text-blue-600'}`} />
          </div>
          <p className={`text-[10px] mt-1 truncate ${selectedReportType === 'presupuesto_analitico' ? 'text-blue-200' : 'text-slate-400'}`}>
            {budgetAvailability.length} Renglones • Disponibilidades
          </p>
        </button>

        {/* Pestaña 5: Reporte por Grupo Presupuestario */}
        <button
          id="tab-report-grupo"
          type="button"
          onClick={() => setSelectedReportType('reporte_grupo')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'reporte_grupo'
              ? 'bg-purple-900 text-white border-purple-900 shadow-xs ring-2 ring-purple-500'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: selectedReportType === 'reporte_grupo' ? '#fff' : '#581c87' }}>
              Reporte por Grupo
            </span>
            <FolderTree className={`w-3.5 h-3.5 ${selectedReportType === 'reporte_grupo' ? 'text-amber-400' : 'text-purple-600'}`} />
          </div>
          <p className={`text-[10px] mt-1 truncate ${selectedReportType === 'reporte_grupo' ? 'text-purple-200' : 'text-slate-400'}`}>
            {dataReporteGrupo.length} Grupos (100, 200, 300)
          </p>
        </button>

        {/* Pestaña 6: Dashboard de Métricas de Ejecución (Gráficos de Dona) */}
        <button
          id="tab-report-metricas-ejecucion"
          type="button"
          onClick={() => setSelectedReportType('metricas_ejecucion')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'metricas_ejecucion'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-xs ring-2 ring-emerald-500'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: selectedReportType === 'metricas_ejecucion' ? '#fff' : '#065f46' }}>
              Métricas de Ejecución
            </span>
            <PieChartIcon className={`w-3.5 h-3.5 ${selectedReportType === 'metricas_ejecucion' ? 'text-amber-400' : 'text-emerald-600'}`} />
          </div>
          <p className={`text-[10px] mt-1 truncate ${selectedReportType === 'metricas_ejecucion' ? 'text-emerald-200' : 'text-slate-400'}`}>
            Donas % Ejecución vs Disponible
          </p>
        </button>

        {/* Pestaña 7: Analítico de Compras por Renglón */}
        <button
          id="tab-report-analitico"
          type="button"
          onClick={() => setSelectedReportType('analitico')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'analitico'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-800'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Compras por Renglón</span>
            <ListTree className={`w-3.5 h-3.5 ${selectedReportType === 'analitico' ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <p className={`text-[10px] mt-1 truncate ${selectedReportType === 'analitico' ? 'text-slate-300' : 'text-slate-400'}`}>
            Jerarquía F56-e y NOG
          </p>
        </button>

      </div>

      {/* 4. Documento Oficial Imprimible y Detallado */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 text-slate-900">
        
        {/* Membrete Oficial del Organismo Judicial con Cintilla Azul Oscuro Institucional */}
        <div 
          className="rounded-xl p-4 sm:p-5 mb-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center text-white font-black text-sm shadow-inner">
              OJ
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Organismo Judicial de Guatemala
              </h2>
              <p className="text-xs font-medium text-blue-100 mt-0.5">
                Gerencia de Informática • Dirección de Auditoría y Fiscalización
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-blue-100 border-t sm:border-t-0 sm:border-l border-white/15 pt-2 sm:pt-0 sm:pl-4">
            <p><strong className="text-white">Fecha de Emisión:</strong> {formatDate(new Date().toISOString().slice(0, 10))}</p>
            <p><strong className="text-white">Período Fiscal:</strong> 2026</p>
            <p>
              <strong className="text-white">Alcance: </strong>
              <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded ml-1 inline-block">
                {isAdmin ? (adminAreaFilter === 'todas' ? 'Institucional (Todas las Áreas)' : adminAreaFilter) : (userAssignedArea || 'Área Asignada')}
              </span>
            </p>
          </div>
        </div>

        {/* Título Oficial del Informe Seleccionado */}
        <div className="mb-6 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              {selectedReportType === 'consolidado' && '1. Informe Consolidado General de Adquisiciones y Eventos NOG'}
              {selectedReportType === 'adjudicados' && '2. Informe Oficial de Eventos Resueltos y Adjudicados'}
              {selectedReportType === 'git' && '3. Registro Institucional de Dictámenes y Evaluaciones Técnicas GIT'}
              {selectedReportType === 'presupuesto_analitico' && '4. Informe de Presupuesto Analítico de Renglones y Disponibilidades Presupuestarias'}
              {selectedReportType === 'reporte_grupo' && '5. Informe Consolidado de Ejecución por Grupo Presupuestario (Grupos 100, 200 y 300)'}
              {selectedReportType === 'metricas_ejecucion' && '6. Dashboard de Métricas de Ejecución Presupuestaria (% Ejecución vs Disponible Consolidado)'}
              {selectedReportType === 'analitico' && (
                isAdmin
                  ? '7. Desglose Analítico de Compras por Grupo y Renglón Presupuestario (Todas las Áreas)'
                  : `7. Desglose Analítico de Compras por Grupo y Renglón Presupuestario - Unidad: ${(userAssignedArea || 'ÁREA').toUpperCase()}`
              )}
              {selectedReportType === 'balance' && '8. Balance Financiero y Ejecución Presupuestaria'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedReportType === 'consolidado' && 'Listado maestro de formularios F56-e, estatus del evento y montos de compra'}
              {selectedReportType === 'adjudicados' && 'Expedientes adjudicados a proveedores con detalle de montos y modalidades'}
              {selectedReportType === 'git' && 'Control de dictámenes técnicos elaborados conforme al Decreto 57-92 y normativas'}
              {selectedReportType === 'presupuesto_analitico' && 'Matriz analítica de disponibilidad: Presupuesto inicial, modificaciones (+/-), vigente, pagado, comprometido y disponibilidades real y proyectada'}
              {selectedReportType === 'reporte_grupo' && 'Consolidado comparativo por Grupo 100 Servicios, Grupo 200 Materiales y Grupo 300 Activos con desglose de renglones'}
              {selectedReportType === 'metricas_ejecucion' && 'Visualización analítica mediante gráficos de dona interactivos que contrastan la tasa de ejecución frente al saldo disponible consolidado por cada renglón presupuestario'}
              {selectedReportType === 'analitico' && (
                isAdmin 
                  ? 'Estructura jerárquica por Grupo (100, 200, 300) y Renglón presupuestario con desglose comparativo por área'
                  : 'Estructura jerárquica por Grupo y Renglón presupuestario de las adquisiciones correspondientes a su unidad'
              )}
              {selectedReportType === 'balance' && 'Disponibilidad presupuestaria vigente, comprometida, pagada y saldos reales'}
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VISTA 1: CONSOLIDADO GENERAL */}
        {/* ========================================================= */}
        {selectedReportType === 'consolidado' && (
          <div className="space-y-6">
            
            {/* PANEL EJECUTIVO DE KPIS Y GRÁFICAS CIRCULARES PARA TOMA DE DECISIONES */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              
              {/* Encabezado del Panel con Botón de Alternar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Panel Ejecutivo de Decisión & Gráficas Circulares
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {basePurchases.length} Adquisiciones
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Indicadores de desempeño (KPIs), modalidades de compra y gobernanza técnica para análisis estratégico
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConsolidadoCharts(!showConsolidadoCharts)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shadow-2xs"
                >
                  {showConsolidadoCharts ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ocultar Gráficas</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Gráficas y KPIs</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contenido Desplegable de Gráficas y KPIs */}
              {showConsolidadoCharts && (
                <div className="space-y-5 pt-1">
                  
                  {/* Fila de 4 Tarjetas de KPIs Ejecutivos */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    
                    {/* KPI 1: Presupuesto Total */}
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Presupuesto Total Analizado
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                        {formatQuetzales(kpis.totalAmount)}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {kpis.totalPurchases} eventos registrados
                      </span>
                    </div>

                    {/* KPI 2: Tasa de Adjudicación */}
                    <div className="bg-white border border-blue-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                        Efectividad en Adjudicación
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-base sm:text-lg font-black text-blue-800 font-mono">
                          {kpis.adjudicationRate.toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-blue-600 font-medium">
                          ({kpis.adjudicatedCount} resueltas)
                        </span>
                      </div>
                      <div className="w-full bg-blue-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, kpis.adjudicationRate)}%` }}
                        />
                      </div>
                    </div>

                    {/* KPI 3: Cobertura Dictamen GIT */}
                    <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                        Cobertura Dictamen Técnico GIT
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                          {kpis.dictamenRate.toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-emerald-600 font-medium">
                          ({kpis.dictamenCount} aprobadas)
                        </span>
                      </div>
                      <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, kpis.dictamenRate)}%` }}
                        />
                      </div>
                    </div>

                    {/* KPI 4: Ticket Promedio y Modalidad Predominante */}
                    <div className="bg-white border border-amber-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                        Ticket Medio / Modalidad
                      </span>
                      <span className="text-sm sm:text-base font-black text-amber-900 font-mono block mt-0.5">
                        {formatQuetzales(kpis.averageTicket)}
                      </span>
                      <span className="text-[11px] text-amber-800 font-medium mt-1 block truncate">
                        Predomina: <strong>{kpis.modalidadPredominante}</strong>
                      </span>
                    </div>

                  </div>

                  {/* Cuadrícula de 4 Gráficas Circulares Amplias con Desglose Nítido y Proporciones Espaciosas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    
                    {/* Gráfica 1: Estatus */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                      <div className="border-b border-slate-100 pb-2.5 mb-3 flex items-center justify-between">
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                            1. Estatus del Evento
                          </h5>
                          <p className="text-[11px] text-slate-400">Adjudicación vs Trámite vs Desiertos</p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold font-mono">
                          {kpis.totalPurchases} Total
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                          {estatusChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={estatusChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={46}
                                  outerRadius={68}
                                  paddingAngle={3}
                                >
                                  {estatusChartData.map((entry, index) => (
                                    <Cell key={`rep-est-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip content={<CustomReportPieTooltip />} />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">Sin datos</div>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-sm font-black font-mono text-slate-800">{kpis.totalPurchases}</span>
                            <span className="text-[8px] font-bold uppercase text-slate-400">Eventos</span>
                          </div>
                        </div>

                        <div className="sm:col-span-7 space-y-1.5 overflow-y-auto max-h-48 pr-1">
                          {estatusChartData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                              <div className="flex items-center gap-2 min-w-0 pr-1">
                                <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                                <span className="font-semibold text-slate-800 truncate" title={item.name}>{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-white border border-slate-200 text-slate-700">
                                  {item.value} ({item.percentage}%)
                                </span>
                                <span className="font-bold font-mono text-slate-900 text-xs whitespace-nowrap">
                                  {formatQuetzales(item.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gráfica 2: Modalidades LCE */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                      <div className="border-b border-slate-100 pb-2.5 mb-3 flex items-center justify-between">
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                            2. Modalidades de Compra
                          </h5>
                          <p className="text-[11px] text-slate-400">Ley de Contrataciones del Estado</p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 text-xs font-bold font-mono">
                          LCE Art. 43
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                          {modalidadChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={modalidadChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={46}
                                  outerRadius={68}
                                  paddingAngle={3}
                                >
                                  {modalidadChartData.map((entry, index) => (
                                    <Cell key={`rep-mod-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip content={<CustomReportPieTooltip />} />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">Sin datos</div>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-sm font-black font-mono text-slate-800">{modalidadChartData.length}</span>
                            <span className="text-[8px] font-bold uppercase text-slate-400">Tipos</span>
                          </div>
                        </div>

                        <div className="sm:col-span-7 space-y-1.5 overflow-y-auto max-h-48 pr-1">
                          {modalidadChartData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                              <div className="flex items-center gap-2 min-w-0 pr-1">
                                <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                                <span className="font-semibold text-slate-800 truncate" title={item.name}>{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-white border border-slate-200 text-slate-700">
                                  {item.value} ({item.percentage}%)
                                </span>
                                <span className="font-bold font-mono text-slate-900 text-xs whitespace-nowrap">
                                  {formatQuetzales(item.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gráfica 3: Dictamen Técnico GIT */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                      <div className="border-b border-slate-100 pb-2.5 mb-3 flex items-center justify-between">
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                            3. Dictamen Técnico GIT
                          </h5>
                          <p className="text-[11px] text-slate-400">Fiscalización e Idoneidad Técnica</p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-bold font-mono">
                          {kpis.dictamenRate.toFixed(0)}% Conforme
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                          {dictamenChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={dictamenChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={46}
                                  outerRadius={68}
                                  paddingAngle={4}
                                >
                                  {dictamenChartData.map((entry, index) => (
                                    <Cell key={`rep-git-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip content={<CustomReportPieTooltip />} />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">Sin datos</div>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-sm font-black font-mono text-emerald-700">{kpis.dictamenRate.toFixed(0)}%</span>
                            <span className="text-[8px] font-bold uppercase text-slate-400">Cobertura</span>
                          </div>
                        </div>

                        <div className="sm:col-span-7 space-y-1.5 overflow-y-auto max-h-48 pr-1">
                          {dictamenChartData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                              <div className="flex items-center gap-2 min-w-0 pr-1">
                                <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                                <span className="font-semibold text-slate-800 truncate" title={item.name}>{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-white border border-slate-200 text-slate-700">
                                  {item.value} ({item.percentage}%)
                                </span>
                                <span className="font-bold font-mono text-slate-900 text-xs whitespace-nowrap">
                                  {formatQuetzales(item.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gráfica 4: Inversión por Área */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                      <div className="border-b border-slate-100 pb-2.5 mb-3 flex items-center justify-between">
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                            4. Inversión por Área
                          </h5>
                          <p className="text-[11px] text-slate-400">Concentración por Dependencia</p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-bold font-mono">
                          Top Áreas
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                          {areaChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={areaChartData}
                                  dataKey="amount"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={46}
                                  outerRadius={68}
                                  paddingAngle={3}
                                >
                                  {areaChartData.map((entry, index) => (
                                    <Cell key={`rep-area-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip content={<CustomReportPieTooltip />} />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">Sin datos</div>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs font-black font-mono text-slate-800">{formatQuetzales(kpis.totalAmount).split('.')[0]}</span>
                            <span className="text-[8px] font-bold uppercase text-slate-400">Total GTQ</span>
                          </div>
                        </div>

                        <div className="sm:col-span-7 space-y-1.5 overflow-y-auto max-h-48 pr-1">
                          {areaChartData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                              <div className="flex items-center gap-2 min-w-0 pr-1">
                                <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                                <span className="font-semibold text-slate-800 truncate" title={item.name}>{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-white border border-slate-200 text-slate-700">
                                  {item.value} ({item.percentage}%)
                                </span>
                                <span className="font-bold font-mono text-slate-900 text-xs whitespace-nowrap">
                                  {formatQuetzales(item.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bloque de Recomendaciones y Decisiones de Compra */}
                  {recommendations.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {recommendations.map((rec, rIdx) => (
                        <div 
                          key={`con-rec-${rIdx}`}
                          className={`p-3 rounded-xl border text-xs space-y-1 ${
                            rec.type === 'warning'
                              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                              : rec.type === 'success'
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : 'bg-blue-50/70 border-blue-200 text-blue-900'
                          }`}
                        >
                          <p className="font-bold flex items-center gap-1.5">
                            {rec.type === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                            {rec.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            {rec.type === 'info' && <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                            {rec.title}
                          </p>
                          <p className="text-[11px] leading-relaxed text-slate-700">
                            {rec.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Tabla Detallada */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white font-bold uppercase text-[10px] border-b-2 border-blue-800 shadow-xs">
                  <tr>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center w-8 text-white">#</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">NOG Guatecompras</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">F56-e / F56</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Área Solicitante</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">Renglón</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Descripción del Requerimiento</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Fecha Sol.</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Modalidad</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">Estatus</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">Dictamen GIT</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-right font-mono text-white">Monto (GTQ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {basePurchases.length > 0 ? (
                    basePurchases.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{p.nog}</td>
                        <td className="p-2.5 font-mono">
                          <span className="font-semibold block text-slate-900">{p.f56e}</span>
                          <span className="text-[10px] text-slate-400">{p.f56}</span>
                        </td>
                        <td className="p-2.5 font-medium text-slate-700 whitespace-nowrap">{p.areaSolicitante || 'Soporte técnico'}</td>
                        <td className="p-2.5 text-center font-mono font-semibold text-slate-800">{p.renglonPresupuestario || '158'}</td>
                        <td className="p-2.5 max-w-xs">{p.descripcion}</td>
                        <td className="p-2.5 whitespace-nowrap text-slate-600">{formatDate(p.fechaSolicitud)}</td>
                        <td className="p-2.5 whitespace-nowrap text-slate-600">{p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre}</td>
                        <td className="p-2.5 text-center font-bold uppercase text-[10px] whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full ${
                            p.estatusEvento === 'Adjudicación' ? 'bg-blue-100 text-blue-800' :
                            p.estatusEvento === 'Evaluación' ? 'bg-amber-100 text-amber-800' :
                            p.estatusEvento === 'Prescindido' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {p.estatusEvento}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-bold whitespace-nowrap">
                          {p.evaluadoGIT === 'Sí' ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                              Sí (GIT)
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                          {formatQuetzales(p.monto)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400">
                        No se encontraron registros de adquisiciones para el área seleccionada.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* TOTALIZACIÓN AL FINAL DEL INFORME CONSOLIDADO (Requisito de usuario) */}
                <tfoot className="bg-slate-900 text-white font-bold">
                  <tr>
                    <td colSpan={6} className="p-3 text-left">
                      TOTAL CONSOLIDADO ({basePurchases.length} ADQUISICIONES LISTADAS)
                    </td>
                    <td className="p-3 text-center text-slate-300 font-normal">
                      {basePurchases.length} eventos
                    </td>
                    <td className="p-3 text-center text-slate-300 font-normal">
                      --
                    </td>
                    <td className="p-3 text-center text-amber-400">
                      {adjudicados.length} Adjudicadas
                    </td>
                    <td className="p-3 text-center text-emerald-400">
                      {evaluadosGIT.length} Dictámenes
                    </td>
                    <td className="p-3 text-right font-mono text-amber-400 text-sm whitespace-nowrap">
                      {formatQuetzales(totalMontoConsolidado)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Tarjeta de Resumen Final de Montos */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Totalización Institucional del Informe Consolidado
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Suma total certificada para auditoría y control de compromisos presupuestarios
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total General Acumulado</span>
                <span className="text-lg font-bold font-mono text-slate-900">{formatQuetzales(totalMontoConsolidado)}</span>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA 2: ADJUDICADOS */}
        {/* ========================================================= */}
        {selectedReportType === 'adjudicados' && (
          <div className="space-y-6">
            
            {/* PANEL EJECUTIVO DE KPIS Y GRÁFICAS CIRCULARES PARA ADJUDICACIONES */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              
              {/* Encabezado del Panel con Botón de Alternar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Panel Ejecutivo de Decisión & Gráficas Circulares — Adjudicaciones
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {adjudicados.length} Expedientes Resueltos
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Métricas de efectividad contractual, distribución por modalidad de compra y concentración por renglón
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdjudicadosCharts(!showAdjudicadosCharts)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shadow-2xs"
                >
                  {showAdjudicadosCharts ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ocultar Gráficas</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Gráficas y KPIs</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contenido Desplegable de Gráficas y KPIs */}
              {showAdjudicadosCharts && (
                <div className="space-y-5 pt-1">
                  
                  {/* Tarjetas KPI Adjudicados */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Total Adjudicaciones Resueltas
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                        {adjudicados.length} expedientes
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">Contratos u órdenes firmes</span>
                    </div>

                    <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-2xs bg-emerald-50/20">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Monto Total Adjudicado
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-800 font-mono block mt-0.5">
                        {formatQuetzales(totalMontoAdjudicado)}
                      </span>
                      <span className="text-[11px] text-emerald-600 mt-1 block">Obligación firme del período</span>
                    </div>

                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Promedio por Adjudicación
                      </span>
                      <span className="text-base sm:text-lg font-black text-blue-900 font-mono block mt-0.5">
                        {adjudicados.length > 0 ? formatQuetzales(totalMontoAdjudicado / adjudicados.length) : 'Q 0.00'}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">Costo unitario adjudicado</span>
                    </div>

                    <div className="bg-white border border-blue-200 p-3.5 rounded-xl shadow-2xs bg-blue-50/20">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                        Eficacia de Adjudicación
                      </span>
                      <span className="text-base sm:text-lg font-black text-blue-800 font-mono block mt-0.5">
                        {basePurchases.length > 0 ? ((adjudicados.length / basePurchases.length) * 100).toFixed(1) : 0}%
                      </span>
                      <span className="text-[11px] text-blue-600 mt-1 block">{adjudicados.length} de {basePurchases.length} eventos totales</span>
                    </div>
                  </div>

                  {/* Fila de 2 Gráficas Circulares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gráfica 1: Modalidades de Compra */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                          Adjudicaciones por Modalidad de Compra
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {adjudicados.length} eventos
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {adjudicadosModalidadChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={adjudicadosModalidadChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {adjudicadosModalidadChartData.map((entry, index) => (
                                  <Cell key={`adj-mod-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [`${val} Adjudicaciones`, 'Cantidad']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                        {adjudicadosModalidadChartData.slice(0, 4).map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600">{d.name} ({d.value})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gráfica 2: Concentración por Renglón */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                          Concentración de Monto Adjudicado por Renglón
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          {formatQuetzales(totalMontoAdjudicado)}
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {adjudicadosRenglonesChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={adjudicadosRenglonesChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {adjudicadosRenglonesChartData.map((entry, index) => (
                                  <Cell key={`adj-rng-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                        {adjudicadosRenglonesChartData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 font-mono">{d.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Tabla Detallada de Adjudicaciones */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white font-bold uppercase text-[10px] border-b-2 border-blue-800 shadow-xs">
                  <tr>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center w-8 text-white">#</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">NOG</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">F56-e</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Área Solicitante</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Descripción del Bien o Servicio</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Proveedor Adjudicado</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Fecha Adjudicación</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Modalidad</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">Renglón</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-right font-mono text-white">Monto Adjudicado (GTQ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {adjudicados.length > 0 ? (
                    adjudicados.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{p.nog}</td>
                        <td className="p-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap">{p.f56e}</td>
                        <td className="p-2.5 font-medium text-slate-700 whitespace-nowrap">{p.areaSolicitante || 'Soporte técnico'}</td>
                        <td className="p-2.5 max-w-xs">{p.descripcion}</td>
                        <td className="p-2.5 font-semibold text-blue-900 whitespace-nowrap">
                          {p.proveedorAdjudicado || 'Proveedor adjudicado en Guatecompras'}
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-slate-600">
                          {formatDate(p.fechaAdjudicacion || p.fechaSolicitud)}
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-slate-600">{p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre}</td>
                        <td className="p-2.5 text-center font-mono font-semibold text-slate-800">{p.renglonPresupuestario || '158'}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700 font-mono whitespace-nowrap">
                          {formatQuetzales(p.monto)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400">
                        No se registran eventos adjudicados en el área o filtro seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* TOTALIZACIÓN AL FINAL DEL INFORME DE ADJUDICADOS (Requisito de usuario) */}
                <tfoot className="bg-slate-900 text-white font-bold">
                  <tr>
                    <td colSpan={8} className="p-3 text-left">
                      TOTAL GENERAL DE EVENTOS ADJUDICADOS ({adjudicados.length} EXPEDIENTES RESUELTOS)
                    </td>
                    <td className="p-3 text-center text-slate-300 font-normal">
                      --
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 text-sm whitespace-nowrap">
                      {formatQuetzales(totalMontoAdjudicado)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Resumen Final de Adjudicaciones */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wide">
                    Totalización Oficial de Adjudicaciones
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Monto total comprometido en contratos y órdenes de compra adjudicadas
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Adjudicado en Quetzales</span>
                <span className="text-lg font-bold font-mono text-emerald-900">{formatQuetzales(totalMontoAdjudicado)}</span>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA 3: DICTÁMENES TÉCNICOS (GIT) */}
        {/* ========================================================= */}
        {selectedReportType === 'git' && (
          <div className="space-y-6">
            
            {/* PANEL EJECUTIVO DE KPIS Y GRÁFICAS CIRCULARES PARA DICTÁMENES GIT */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              
              {/* Encabezado del Panel con Botón de Alternar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Panel Ejecutivo de Decisión & Gráficas Circulares — Dictámenes GIT
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        {evaluadosGIT.length} Dictámenes Evaluados
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Gobernanza técnica, emisión de oficios conforme al Decreto 57-92 y distribución por modalidades de compra
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGitCharts(!showGitCharts)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shadow-2xs"
                >
                  {showGitCharts ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ocultar Gráficas</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Gráficas y KPIs</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contenido Desplegable de Gráficas y KPIs */}
              {showGitCharts && (
                <div className="space-y-5 pt-1">
                  
                  {/* Tarjetas KPI Dictámenes */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Dictámenes Emitidos
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                        {evaluadosGIT.length} expedientes
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">Supervisión técnica de TI</span>
                    </div>

                    <div className="bg-white border border-amber-200 p-3.5 rounded-xl shadow-2xs bg-amber-50/20">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        Monto Total Dictaminado
                      </span>
                      <span className="text-base sm:text-lg font-black text-amber-800 font-mono block mt-0.5">
                        {formatQuetzales(totalMontoDictaminado)}
                      </span>
                      <span className="text-[11px] text-amber-600 mt-1 block">Valor evaluado institucional</span>
                    </div>

                    <div className="bg-white border border-blue-200 p-3.5 rounded-xl shadow-2xs bg-blue-50/20">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                        Ofertas Técnicas Analizadas
                      </span>
                      <span className="text-base sm:text-lg font-black text-blue-900 font-mono block mt-0.5">
                        {evaluadosGIT.reduce((acc, p) => acc + (p.cantidadOfertas || 0), 0)} ofertas
                      </span>
                      <span className="text-[11px] text-blue-600 mt-1 block">Propuestas técnicas evaluadas</span>
                    </div>

                    <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-2xs bg-emerald-50/20">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Con Oficio Emitido GIT
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-800 font-mono block mt-0.5">
                        {evaluadosGIT.filter(p => Boolean(p.fechaElaboracionOficioGIT)).length} emitidos
                      </span>
                      <span className="text-[11px] text-emerald-600 mt-1 block">Oficios formales registrados</span>
                    </div>
                  </div>

                  {/* Fila de 2 Gráficas Circulares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gráfica 1: Estado del Dictamen */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                          Estado de Dictámenes Técnicos
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {evaluadosGIT.length} dictámenes
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {gitEstatusChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={gitEstatusChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {gitEstatusChartData.map((entry, index) => (
                                  <Cell key={`git-est-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [`${val} Dictámenes`, 'Cantidad']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                        {gitEstatusChartData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600">{d.name} ({d.value})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gráfica 2: Dictámenes por Modalidad */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-amber-600" />
                          Dictámenes por Modalidad de Compra
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                          {formatQuetzales(totalMontoDictaminado)}
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {gitModalidadChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={gitModalidadChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {gitModalidadChartData.map((entry, index) => (
                                  <Cell key={`git-mod-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [`${val} Dictámenes`, 'Cantidad']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                        {gitModalidadChartData.slice(0, 4).map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600">{d.name} ({d.value})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Tabla Detallada de Dictámenes Técnicos */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white font-bold uppercase text-[10px] border-b-2 border-blue-800 shadow-xs">
                  <tr>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center w-8 text-white">#</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">NOG</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">F56-e / F56</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Área Solicitante</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Descripción Técnica</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Fecha Dictamen</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Fecha Oficio GIT</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">Ofertas</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">Estatus</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-right font-mono text-white">Monto (GTQ)</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center print:hidden text-white">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {evaluadosGIT.length > 0 ? (
                    evaluadosGIT.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{p.nog}</td>
                        <td className="p-2.5 font-mono">
                          <span className="font-semibold block text-slate-900">{p.f56e}</span>
                          <span className="text-[10px] text-slate-400">{p.f56}</span>
                        </td>
                        <td className="p-2.5 font-medium text-slate-700 whitespace-nowrap">{p.areaSolicitante || 'Soporte técnico'}</td>
                        <td className="p-2.5 max-w-xs">{p.descripcion}</td>
                        <td className="p-2.5 whitespace-nowrap font-medium text-emerald-800">
                          {formatDate(p.fechaDictamenGIT || p.fechaSolicitud)}
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-slate-600">
                          {p.fechaElaboracionOficioGIT ? formatDate(p.fechaElaboracionOficioGIT) : 'Pendiente oficio'}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-800">
                          {p.cantidadOfertas || 0}
                        </td>
                        <td className="p-2.5 text-center font-bold uppercase text-[10px] whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full ${
                            p.estatusEvento === 'Adjudicación' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.estatusEvento}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                          {formatQuetzales(p.monto)}
                        </td>
                        <td className="p-2.5 text-center print:hidden whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedDictamenPurchase(p)}
                            className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Ver e imprimir boleta oficial de dictamen F56-e"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Boleta</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400">
                        No se registran dictámenes técnicos para el área seleccionada.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* TOTALIZACIÓN AL FINAL DEL INFORME DE DICTÁMENES (Requisito de usuario) */}
                <tfoot className="bg-slate-900 text-white font-bold">
                  <tr>
                    <td colSpan={9} className="p-3 text-left">
                      TOTAL GENERAL DE DICTÁMENES TÉCNICOS ({evaluadosGIT.length} EXPEDIENTES DICTAMINADOS)
                    </td>
                    <td className="p-3 text-right font-mono text-amber-400 text-sm whitespace-nowrap">
                      {formatQuetzales(totalMontoDictaminado)}
                    </td>
                    <td className="p-3 text-center print:hidden">--</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Resumen Final de Dictámenes */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wide">
                    Totalización de Dictámenes Técnicos de Informática
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Suma total dictaminada conforme a especificaciones técnicas y bases de cotización/licitación
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Total Dictaminado en Quetzales</span>
                <span className="text-lg font-bold font-mono text-amber-950">{formatQuetzales(totalMontoDictaminado)}</span>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA 4: BALANCE FINANCIERO Y EJECUCIÓN PRESUPUESTARIA */}
        {/* ========================================================= */}
        {selectedReportType === 'balance' && (
          <div className="space-y-6">
            
            {/* PANEL EJECUTIVO DE KPIS Y GRÁFICAS CIRCULARES PARA BALANCE FINANCIERO */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              
              {/* Encabezado del Panel con Botón de Alternar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Panel Ejecutivo de Decisión & Gráficas Circulares — Balance Financiero
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                        {balanceData.length} Renglones con Movimiento
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Disponibilidad presupuestaria vigente, afectaciones comprometidas, desembolsos pagados y saldo disponible
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBalanceCharts(!showBalanceCharts)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shadow-2xs"
                >
                  {showBalanceCharts ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ocultar Gráficas</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Gráficas y KPIs</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contenido Desplegable de Gráficas y KPIs */}
              {showBalanceCharts && (
                <div className="space-y-5 pt-1">
                  
                  {/* Tarjetas KPI de Balance Financiero */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Presupuesto Vigente (GTQ)
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                        {formatQuetzales(totalBalanceVigente)}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">Techo financiero consolidado</span>
                    </div>

                    <div className="bg-white border border-blue-200 p-3.5 rounded-xl shadow-2xs bg-blue-50/20">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                        Comprometido en Trámite
                      </span>
                      <span className="text-base sm:text-lg font-black text-blue-900 font-mono block mt-0.5">
                        {formatQuetzales(totalBalanceComprometido)}
                      </span>
                      <span className="text-[11px] text-blue-600 mt-1 block">
                        {totalBalanceVigente > 0 ? ((totalBalanceComprometido / totalBalanceVigente) * 100).toFixed(1) : 0}% reservado
                      </span>
                    </div>

                    <div className="bg-white border border-purple-200 p-3.5 rounded-xl shadow-2xs bg-purple-50/20">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                        Total Pagado / Devengado
                      </span>
                      <span className="text-base sm:text-lg font-black text-purple-900 font-mono block mt-0.5">
                        {formatQuetzales(totalBalancePagado)}
                      </span>
                      <span className="text-[11px] text-purple-600 mt-1 block">Erogación ejecutada en firme</span>
                    </div>

                    <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-2xs bg-emerald-50/20">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Saldo Neto Disponible
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-800 font-mono block mt-0.5">
                        {formatQuetzales(totalBalanceSaldo)}
                      </span>
                      <span className="text-[11px] text-emerald-600 mt-1 block">
                        {totalBalanceVigente > 0 ? ((totalBalanceSaldo / totalBalanceVigente) * 100).toFixed(1) : 0}% remanente libre
                      </span>
                    </div>
                  </div>

                  {/* Fila de 2 Gráficas Circulares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gráfica 1: Distribución del Techo Presupuestario */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                          Distribución de Ejecución Presupuestaria
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          {formatQuetzales(totalBalanceVigente)}
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {balanceDistribucionChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={balanceDistribucionChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {balanceDistribucionChartData.map((entry, index) => (
                                  <Cell key={`bal-dist-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                        {balanceDistribucionChartData.map((d, idx) => (
                          <div key={idx} className="flex flex-col items-center text-center">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 truncate max-w-[85px]">{d.name}</span>
                            <span className="font-mono font-bold text-slate-900">{formatQuetzales(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gráfica 2: Distribución por Grupo Presupuestario */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                          Techo Presupuestario por Grupo (100, 200, 300)
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {balanceData.length} renglones
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {balanceGrupoChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={balanceGrupoChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {balanceGrupoChartData.map((entry, index) => (
                                  <Cell key={`bal-grp-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatQuetzales(Number(val)), 'Vigente']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                        {balanceGrupoChartData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 font-medium">{d.name}: {formatQuetzales(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Matriz Financiera por Renglón Presupuestario */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white font-bold uppercase text-[10px] border-b-2 border-blue-800 shadow-xs">
                  <tr>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">Renglón</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-white">Nombre del Renglón Presupuestario</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">Grupo</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-right font-mono text-white">Presupuesto Vigente</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-right font-mono text-white">Comprometido</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-right font-mono text-white">Pagado (Devengado)</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-right font-mono text-white">Saldo Disponible</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">% Ejecución</th>
                    <th className="border-b border-indigo-900/60 p-2.5 text-center text-white">Eventos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {balanceData.length > 0 ? (
                    balanceData.map((b) => (
                      <tr key={b.renglon} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center font-mono font-bold text-slate-900">{b.renglon}</td>
                        <td className="p-2.5 font-medium text-slate-800">{b.nombreRenglon}</td>
                        <td className="p-2.5 text-center font-semibold text-slate-600">Grupo {b.grupo}</td>
                        <td className="p-2.5 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                          {formatQuetzales(b.presupuestoVigente)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                          {formatQuetzales(b.comprometido)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-purple-700 whitespace-nowrap">
                          {formatQuetzales(b.pagado)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatQuetzales(b.saldoDisponible)}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                            b.porcentajeEjecucion > 85 ? 'bg-rose-100 text-rose-800' :
                            b.porcentajeEjecucion > 50 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {b.porcentajeEjecucion.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-semibold text-slate-600">
                          {b.eventosCount}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">
                        No hay movimientos registrados para el cálculo del balance presupuestario.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* TOTALIZACIÓN AL FINAL DEL INFORME DE BALANCE FINANCIERO (Requisito de usuario) */}
                <tfoot className="bg-slate-900 text-white font-bold">
                  <tr>
                    <td colSpan={3} className="p-3 text-left">
                      TOTAL CONSOLIDADO BALANCE FINANCIERO ({balanceData.length} RENGLONES)
                    </td>
                    <td className="p-3 text-right font-mono text-white text-xs whitespace-nowrap">
                      {formatQuetzales(totalBalanceVigente)}
                    </td>
                    <td className="p-3 text-right font-mono text-blue-300 text-xs whitespace-nowrap">
                      {formatQuetzales(totalBalanceComprometido)}
                    </td>
                    <td className="p-3 text-right font-mono text-purple-300 text-xs whitespace-nowrap">
                      {formatQuetzales(totalBalancePagado)}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 text-xs whitespace-nowrap">
                      {formatQuetzales(totalBalanceSaldo)}
                    </td>
                    <td className="p-3 text-center text-amber-400 text-xs">
                      {totalBalanceVigente > 0 ? `${((totalBalanceComprometido / totalBalanceVigente) * 100).toFixed(1)}%` : '0%'}
                    </td>
                    <td className="p-3 text-center text-slate-300 text-xs">
                      {basePurchases.length}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Resumen Final de Balance */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Totalización General de Balance Presupuestario
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Suma total de techos vigentes, compromisos preventivos y saldo neto disponible
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Comprometido</span>
                  <span className="text-base font-bold font-mono text-blue-700">{formatQuetzales(totalBalanceComprometido)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Saldo Total Disponible</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">{formatQuetzales(totalBalanceSaldo)}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA: PRESUPUESTO ANALÍTICO (TODOS LOS RENGLONES Y DISPONIBILIDADES) */}
        {/* ========================================================= */}
        {selectedReportType === 'presupuesto_analitico' && (
          <div className="space-y-6">
            
            {/* Panel Ejecutivo de KPIs y Gráficas Circulares */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Panel Ejecutivo de Disponibilidad Presupuestaria Analítica
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                        {analiticoRenglonesData.length} Renglones Institucionales
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Disponibilidad presupuestaria en tiempo real de todos los renglones de TI conforme al Decreto 57-92
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPresupuestoAnaliticoCharts(!showPresupuestoAnaliticoCharts)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shadow-2xs"
                >
                  {showPresupuestoAnaliticoCharts ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ocultar Gráficas</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Gráficas y KPIs</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contenido Desplegable de Gráficas y KPIs */}
              {showPresupuestoAnaliticoCharts && (
                <div className="space-y-5 pt-1">
                  
                  {/* Tarjetas KPI de Resumen Financiero */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Presupuesto Vigente Total
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                        {formatQuetzales(analiticoRenglonesTotals.vigente)}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Inicial: {formatQuetzales(analiticoRenglonesTotals.inicial)}
                      </span>
                    </div>

                    <div className="bg-white border border-blue-200 p-3.5 rounded-xl shadow-2xs bg-blue-50/20">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                        Pagado que Rebaja
                      </span>
                      <span className="text-base sm:text-lg font-black text-blue-900 font-mono block mt-0.5">
                        {formatQuetzales(analiticoRenglonesTotals.pagado)}
                      </span>
                      <span className="text-[11px] text-blue-600 mt-1 block">
                        Rebaja directamente el saldo real
                      </span>
                    </div>

                    <div className="bg-white border border-amber-200 p-3.5 rounded-xl shadow-2xs bg-amber-50/20">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        Comprometido en Trámite
                      </span>
                      <span className="text-base sm:text-lg font-black text-amber-900 font-mono block mt-0.5">
                        {formatQuetzales(analiticoRenglonesTotals.comprometido)}
                      </span>
                      <span className="text-[11px] text-amber-600 mt-1 block">
                        Expedientes F56-e en adjudicación
                      </span>
                    </div>

                    <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-2xs bg-emerald-50/20">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Disponible Proyectado Libre
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-900 font-mono block mt-0.5">
                        {formatQuetzales(analiticoRenglonesTotals.disponibleProyectado)}
                      </span>
                      <span className="text-[11px] text-emerald-600 mt-1 block">
                        {analiticoRenglonesTotals.vigente > 0 ? `${(((analiticoRenglonesTotals.pagado + analiticoRenglonesTotals.comprometido) / analiticoRenglonesTotals.vigente) * 100).toFixed(1)}% usado global` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Fila de 2 Gráficas Circulares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gráfica 1: Distribución Financiera */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                          Distribución Financiera de Techo Presupuestario
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          {formatQuetzales(analiticoRenglonesTotals.vigente)}
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {analiticoDistribucionChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={analiticoDistribucionChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {analiticoDistribucionChartData.map((entry, index) => (
                                  <Cell key={`an-dst-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 pt-1 border-t border-slate-100 text-[10px]">
                        {analiticoDistribucionChartData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 font-medium">{d.name}: {formatQuetzales(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gráfica 2: Semáforo de Renglones */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Semáforo Oficial de Salud Presupuestaria
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {analiticoSaludStats.total} Renglones
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {analiticoSemaforoChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={analiticoSemaforoChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {analiticoSemaforoChartData.map((entry, index) => (
                                  <Cell key={`an-sem-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [`${val} Renglones`, 'Estado']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 pt-1 border-t border-slate-100 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-slate-600 font-medium">Disponibles: {analiticoSaludStats.saludable}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-slate-600 font-medium">Alerta Preventiva: {analiticoSaludStats.alerta}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-slate-600 font-medium">Sin Saldo / Déficit: {analiticoSaludStats.deficit}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Barra de Filtros y Búsqueda en Tiempo Real */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs print:hidden">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar renglón por código o nombre..."
                  value={budgetRenglonSearch}
                  onChange={(e) => setBudgetRenglonSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  value={budgetGroupFilter}
                  onChange={(e) => setBudgetGroupFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="todos">Todos los Grupos Presupuestarios</option>
                  <option value="100">Grupo 100 - Servicios No Personales</option>
                  <option value="200">Grupo 200 - Materiales y Suministros</option>
                  <option value="300">Grupo 300 - Propiedad, Planta y Equipo</option>
                </select>

                <select
                  value={budgetStatusFilter}
                  onChange={(e) => setBudgetStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="Con Disponibilidad">Con Disponibilidad</option>
                  <option value="Alerta Disponibilidad Baja">Alerta Disponibilidad</option>
                  <option value="Sin Disponibilidad">Sin Disponibilidad</option>
                </select>

                <span className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-mono font-bold text-slate-700 shrink-0">
                  {analiticoRenglonesData.length} renglones
                </span>
              </div>
            </div>

            {/* Matriz Completa de Disponibilidad Presupuestaria Analítica */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white font-bold uppercase text-[9.5px] border-b-2 border-blue-800 shadow-xs">
                  <tr>
                    <th className="p-2 border-b border-indigo-900/60 text-center text-white">Renglón</th>
                    <th className="p-2 border-b border-indigo-900/60 text-white">Nombre del Renglón</th>
                    <th className="p-2 border-b border-indigo-900/60 text-center text-white">Grupo</th>
                    <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">P. Inicial</th>
                    <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Modif. (±)</th>
                    <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">P. Vigente</th>
                    <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Pagado Rebaja</th>
                    <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Disp. Real</th>
                    <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Comprometido</th>
                    <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Disp. Proyectado</th>
                    <th className="p-2 border-b border-indigo-900/60 text-center text-white">% Usado</th>
                    <th className="p-2 border-b border-indigo-900/60 text-center text-white">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {analiticoRenglonesData.length > 0 ? (
                    analiticoRenglonesData.map((l) => {
                      const countPurchases = basePurchases.filter(p => p.renglonPresupuestario === l.renglonPresupuestario).length;
                      return (
                        <tr key={l.id || l.renglonPresupuestario} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                              R-{l.renglonPresupuestario}
                            </span>
                          </td>
                          <td className="p-2 font-medium text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{l.nombreRenglon}</span>
                              {countPurchases > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono font-normal">
                                  {countPurchases} {countPurchases === 1 ? 'compra' : 'compras'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-center text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                            {l.grupoPresupuestario.replace('Grupo ', 'G-')}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatQuetzales(l.presupuestoInicial)}
                          </td>
                          <td className={`p-2 text-right font-mono whitespace-nowrap font-medium ${
                            l.modificacionesAprobadas > 0 ? 'text-emerald-700' : l.modificacionesAprobadas < 0 ? 'text-rose-700' : 'text-slate-500'
                          }`}>
                            {l.modificacionesAprobadas > 0 ? `+${formatQuetzales(l.modificacionesAprobadas)}` : formatQuetzales(l.modificacionesAprobadas)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap bg-slate-50/50">
                            {formatQuetzales(l.presupuestoVigente)}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold text-blue-700 whitespace-nowrap">
                            {formatQuetzales(l.pagadoQueRebaja)}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatQuetzales(l.disponibleReal)}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold text-amber-700 whitespace-nowrap">
                            {formatQuetzales(l.comprometidoPendiente)}
                          </td>
                          <td className={`p-2 text-right font-mono font-bold whitespace-nowrap ${
                            l.disponibleProyectado <= 0 ? 'text-rose-700 bg-rose-50/50' : 'text-emerald-700 bg-emerald-50/30'
                          }`}>
                            {formatQuetzales(l.disponibleProyectado)}
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10.5px] ${
                              l.porcentajeUsadoComprometido > 85 ? 'bg-rose-100 text-rose-800' :
                              l.porcentajeUsadoComprometido > 50 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {l.porcentajeUsadoComprometido}%
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              l.estatusDisponibilidad === 'Con Disponibilidad' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              l.disponibleProyectado <= 0 ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {l.estatusDisponibilidad === 'Con Disponibilidad' ? 'DISPONIBLE' : (l.disponibleProyectado <= 0 ? 'DÉFICIT' : 'ALERTA')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400">
                        No se encontraron renglones presupuestarios que coincidan con los criterios de búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold text-[11px] border-t-2 border-blue-800">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-left uppercase tracking-wide">
                      TOTAL CONSOLIDADO OFICIAL ({analiticoRenglonesData.length} RENGLONES)
                    </td>
                    <td className="p-2.5 text-right font-mono whitespace-nowrap text-slate-200">
                      {formatQuetzales(analiticoRenglonesTotals.inicial)}
                    </td>
                    <td className="p-2.5 text-right font-mono whitespace-nowrap text-slate-200">
                      {analiticoRenglonesTotals.modificaciones >= 0 ? `+${formatQuetzales(analiticoRenglonesTotals.modificaciones)}` : formatQuetzales(analiticoRenglonesTotals.modificaciones)}
                    </td>
                    <td className="p-2.5 text-right font-mono whitespace-nowrap text-white text-xs">
                      {formatQuetzales(analiticoRenglonesTotals.vigente)}
                    </td>
                    <td className="p-2.5 text-right font-mono whitespace-nowrap text-blue-300 text-xs">
                      {formatQuetzales(analiticoRenglonesTotals.pagado)}
                    </td>
                    <td className="p-2.5 text-right font-mono whitespace-nowrap text-slate-200">
                      {formatQuetzales(analiticoRenglonesTotals.disponibleReal)}
                    </td>
                    <td className="p-2.5 text-right font-mono whitespace-nowrap text-amber-300 text-xs">
                      {formatQuetzales(analiticoRenglonesTotals.comprometido)}
                    </td>
                    <td className="p-2.5 text-right font-mono whitespace-nowrap text-emerald-400 text-xs">
                      {formatQuetzales(analiticoRenglonesTotals.disponibleProyectado)}
                    </td>
                    <td className="p-2.5 text-center font-mono text-amber-300">
                      {analiticoRenglonesTotals.vigente > 0 ? `${(((analiticoRenglonesTotals.pagado + analiticoRenglonesTotals.comprometido) / analiticoRenglonesTotals.vigente) * 100).toFixed(1)}%` : '0%'}
                    </td>
                    <td className="p-2.5 text-center text-slate-300 text-[10px]">
                      CONSOLIDADO
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Banner Informativo y Resumen */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide">
                    Certificación de Disponibilidad Presupuestaria
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Saldos auditables emitidos por la Gerencia de Informática con respaldo de las formas F56-e y NOG institucionales.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Gasto Afectado</span>
                  <span className="text-sm font-bold font-mono text-blue-700">{formatQuetzales(analiticoRenglonesTotals.totalGasto)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Saldo Libre Proyectado</span>
                  <span className="text-base font-bold font-mono text-emerald-800">{formatQuetzales(analiticoRenglonesTotals.disponibleProyectado)}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA: REPORTE POR GRUPO PRESUPUESTARIO (GRUPOS 100, 200, 300) */}
        {/* ========================================================= */}
        {selectedReportType === 'reporte_grupo' && (
          <div className="space-y-6">
            
            {/* Panel Ejecutivo de Decisión por Grupo Presupuestario */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                    <FolderTree className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Informe Consolidado por Grupo Presupuestario
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                        {dataReporteGrupo.length} Grupos Institucionales
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Consolidación jerárquica de techos, gasto pagado, compromisos y saldos proyectados por Grupo Oficial
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReporteGrupoCharts(!showReporteGrupoCharts)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shadow-2xs"
                >
                  {showReporteGrupoCharts ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ocultar Gráficas</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Gráficas y KPIs</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contenido Desplegable de Gráficas y KPIs */}
              {showReporteGrupoCharts && (
                <div className="space-y-5 pt-1">
                  
                  {/* Tarjetas KPI de Resumen de Grupos */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Techo Vigente Consolidado
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                        {formatQuetzales(totalesReporteGrupos.vigente)}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {totalesReporteGrupos.renglonesCount} Renglones en total
                      </span>
                    </div>

                    <div className="bg-white border border-purple-200 p-3.5 rounded-xl shadow-2xs bg-purple-50/20">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                        Gasto Total Ejecutado
                      </span>
                      <span className="text-base sm:text-lg font-black text-purple-900 font-mono block mt-0.5">
                        {formatQuetzales(totalesReporteGrupos.gastoTotal)}
                      </span>
                      <span className="text-[11px] text-purple-600 mt-1 block">
                        Pagado: {formatQuetzales(totalesReporteGrupos.pagado)}
                      </span>
                    </div>

                    <div className="bg-white border border-amber-200 p-3.5 rounded-xl shadow-2xs bg-amber-50/20">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        Comprometido en Proceso
                      </span>
                      <span className="text-base sm:text-lg font-black text-amber-900 font-mono block mt-0.5">
                        {formatQuetzales(totalesReporteGrupos.comprometido)}
                      </span>
                      <span className="text-[11px] text-amber-600 mt-1 block">
                        {totalesReporteGrupos.comprasCount} Eventos de compra
                      </span>
                    </div>

                    <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-2xs bg-emerald-50/20">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Saldo Disponible Proyectado
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-900 font-mono block mt-0.5">
                        {formatQuetzales(totalesReporteGrupos.disponibleProyectado)}
                      </span>
                      <span className="text-[11px] text-emerald-600 mt-1 block">
                        {totalesReporteGrupos.vigente > 0 ? `${((totalesReporteGrupos.gastoTotal / totalesReporteGrupos.vigente) * 100).toFixed(1)}% ejecutado` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Fila de 2 Gráficas Circulares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gráfica 1: Techo Vigente por Grupo */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                          Techo Presupuestario Vigente por Grupo
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          {formatQuetzales(totalesReporteGrupos.vigente)}
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {grupoVigenteChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={grupoVigenteChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {grupoVigenteChartData.map((entry, index) => (
                                  <Cell key={`grp-vig-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatQuetzales(Number(val)), 'Techo Vigente']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 pt-1 border-t border-slate-100 text-[10px]">
                        {grupoVigenteChartData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 font-medium">{d.fullName.split('-')[0].trim()}: {formatQuetzales(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gráfica 2: Gasto Total Ejecutado por Grupo */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-purple-600" />
                          Gasto Total Ejecutado por Grupo
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                          {formatQuetzales(totalesReporteGrupos.gastoTotal)}
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {grupoGastoChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={grupoGastoChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {grupoGastoChartData.map((entry, index) => (
                                  <Cell key={`grp-gst-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatQuetzales(Number(val)), 'Gasto Total']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 pt-1 border-t border-slate-100 text-[10px]">
                        {grupoGastoChartData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 font-medium">{d.fullName.split('-')[0].trim()}: {formatQuetzales(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Tabla Comparativa Consolidada de Grupos Presupuestarios */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white font-bold uppercase text-[9.5px] border-b-2 border-blue-800 shadow-xs">
                  <tr>
                    <th className="p-2.5 border-b border-indigo-900/60 text-white">Grupo Presupuestario</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-center text-white">Renglones</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-right font-mono text-white">P. Inicial</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-right font-mono text-white">Modificaciones (±)</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-right font-mono text-white">P. Vigente</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-right font-mono text-white">Pagado Rebaja</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-right font-mono text-white">Comprometido</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-right font-mono text-white">Gasto Total</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-right font-mono text-white">Disp. Proyectado</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-center text-white">% Ejecución</th>
                    <th className="p-2.5 border-b border-indigo-900/60 text-center text-white">Eventos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11.5px]">
                  {dataReporteGrupo.map((grp) => (
                    <tr key={grp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <FolderTree className="w-4 h-4 text-purple-600" />
                          <span>{grp.nombreGrupo}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                        {grp.renglonesCount}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatQuetzales(grp.presupuestoInicial)}
                      </td>
                      <td className={`p-2.5 text-right font-mono whitespace-nowrap font-medium ${
                        grp.modificaciones > 0 ? 'text-emerald-700' : grp.modificaciones < 0 ? 'text-rose-700' : 'text-slate-500'
                      }`}>
                        {grp.modificaciones > 0 ? `+${formatQuetzales(grp.modificaciones)}` : formatQuetzales(grp.modificaciones)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap bg-slate-50/50">
                        {formatQuetzales(grp.presupuestoVigente)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-blue-700 whitespace-nowrap">
                        {formatQuetzales(grp.pagadoQueRebaja)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-amber-700 whitespace-nowrap">
                        {formatQuetzales(grp.comprometidoPendiente)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-purple-900 whitespace-nowrap bg-purple-50/30">
                        {formatQuetzales(grp.gastoTotal)}
                      </td>
                      <td className={`p-2.5 text-right font-mono font-bold whitespace-nowrap ${
                        grp.disponibleProyectado <= 0 ? 'text-rose-700 bg-rose-50/50' : 'text-emerald-700 bg-emerald-50/30'
                      }`}>
                        {formatQuetzales(grp.disponibleProyectado)}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          grp.ejecucionPct > 85 ? 'bg-rose-100 text-rose-800' :
                          grp.ejecucionPct > 50 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {grp.ejecucionPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-600">
                        {grp.comprasCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-purple-800">
                  <tr>
                    <td className="p-3 text-left uppercase tracking-wide">
                      GRAN TOTAL INSTITUCIONAL ({dataReporteGrupo.length} GRUPOS)
                    </td>
                    <td className="p-3 text-center font-mono text-purple-300">
                      {totalesReporteGrupos.renglonesCount}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap text-slate-200">
                      {formatQuetzales(totalesReporteGrupos.inicial)}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap text-slate-200">
                      {totalesReporteGrupos.modificaciones >= 0 ? `+${formatQuetzales(totalesReporteGrupos.modificaciones)}` : formatQuetzales(totalesReporteGrupos.modificaciones)}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap text-white text-sm">
                      {formatQuetzales(totalesReporteGrupos.vigente)}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap text-blue-300">
                      {formatQuetzales(totalesReporteGrupos.pagado)}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap text-amber-300">
                      {formatQuetzales(totalesReporteGrupos.comprometido)}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap text-purple-300 text-sm">
                      {formatQuetzales(totalesReporteGrupos.gastoTotal)}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap text-emerald-400 text-sm">
                      {formatQuetzales(totalesReporteGrupos.disponibleProyectado)}
                    </td>
                    <td className="p-3 text-center font-mono text-amber-400">
                      {totalesReporteGrupos.vigente > 0 ? `${((totalesReporteGrupos.gastoTotal / totalesReporteGrupos.vigente) * 100).toFixed(1)}%` : '0%'}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-300">
                      {totalesReporteGrupos.comprasCount}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Desglose Jerárquico Expandible por Grupo Presupuestario */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ListTree className="w-4 h-4 text-purple-600" />
                  Desglose Detallado de Renglones por Grupo Presupuestario
                </h4>
                <span className="text-[11px] text-slate-500">
                  Haga clic en cada grupo para expandir o contraer sus renglones y disponibilidades
                </span>
              </div>

              {dataReporteGrupo.map((grp) => {
                const isExpanded = expandedReportGroups[grp.id] !== false;
                return (
                  <div key={grp.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    {/* Cabecera del Grupo Expandible */}
                    <div
                      onClick={() => setExpandedReportGroups(prev => ({ ...prev, [grp.id]: !isExpanded }))}
                      className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 flex items-center justify-between border-b-2 border-purple-800 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <FolderTree className="w-4 h-4 text-purple-300" />
                        <span className="font-bold text-sm tracking-wide text-white">
                          {grp.nombreGrupo}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 font-mono">
                          {grp.renglones.length} renglones • {grp.comprasCount} compras
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-purple-200 block">P. Vigente / Disp. Proyectado</span>
                          <span className="font-mono font-bold text-white text-xs">
                            {formatQuetzales(grp.presupuestoVigente)} / <span className="text-emerald-400">{formatQuetzales(grp.disponibleProyectado)}</span>
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-purple-300" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-purple-300" />
                        )}
                      </div>
                    </div>

                    {/* Tabla de Renglones del Grupo */}
                    {isExpanded && (
                      <div className="overflow-x-auto bg-white">
                        <table className="w-full text-left text-xs text-slate-800 border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9.5px] border-b border-slate-200">
                            <tr>
                              <th className="p-2 text-center">Renglón</th>
                              <th className="p-2">Nombre del Renglón</th>
                              <th className="p-2 text-right font-mono">P. Vigente</th>
                              <th className="p-2 text-right font-mono">Pagado Rebaja</th>
                              <th className="p-2 text-right font-mono">Comprometido</th>
                              <th className="p-2 text-right font-mono">Gasto Total</th>
                              <th className="p-2 text-right font-mono">Disp. Proyectado</th>
                              <th className="p-2 text-center">% Usado</th>
                              <th className="p-2 text-center">Estatus</th>
                              <th className="p-2 text-center">Compras</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {grp.renglones.map((l) => (
                              <tr key={l.id || l.renglonPresupuestario} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200">
                                    R-{l.renglonPresupuestario}
                                  </span>
                                </td>
                                <td className="p-2 font-medium text-slate-800">
                                  {l.nombreRenglon}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {formatQuetzales(l.presupuestoVigente)}
                                </td>
                                <td className="p-2 text-right font-mono font-semibold text-blue-700 whitespace-nowrap">
                                  {formatQuetzales(l.pagadoQueRebaja)}
                                </td>
                                <td className="p-2 text-right font-mono font-semibold text-amber-700 whitespace-nowrap">
                                  {formatQuetzales(l.comprometidoPendiente)}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-purple-900 whitespace-nowrap bg-purple-50/20">
                                  {formatQuetzales(l.gastoTotal)}
                                </td>
                                <td className={`p-2 text-right font-mono font-bold whitespace-nowrap ${
                                  l.disponibleProyectado <= 0 ? 'text-rose-700 bg-rose-50/50' : 'text-emerald-700 bg-emerald-50/30'
                                }`}>
                                  {formatQuetzales(l.disponibleProyectado)}
                                </td>
                                <td className="p-2 text-center whitespace-nowrap">
                                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10.5px] ${
                                    l.porcentajeUsadoComprometido > 85 ? 'bg-rose-100 text-rose-800' :
                                    l.porcentajeUsadoComprometido > 50 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {l.porcentajeUsadoComprometido}%
                                  </span>
                                </td>
                                <td className="p-2 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    l.estatusDisponibilidad === 'Con Disponibilidad' ? 'bg-emerald-100 text-emerald-800' :
                                    l.disponibleProyectado <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {l.estatusDisponibilidad === 'Con Disponibilidad' ? 'DISPONIBLE' : (l.disponibleProyectado <= 0 ? 'DÉFICIT' : 'ALERTA')}
                                  </span>
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-slate-600">
                                  {l.comprasCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 font-bold text-[11px] border-t border-slate-200">
                            <tr>
                              <td colSpan={2} className="p-2 text-left text-slate-700">
                                SUBTOTAL {grp.nombreGrupo.toUpperCase()} ({grp.renglones.length} RENGLONES):
                              </td>
                              <td className="p-2 text-right font-mono text-slate-900 whitespace-nowrap">
                                {formatQuetzales(grp.presupuestoVigente)}
                              </td>
                              <td className="p-2 text-right font-mono text-blue-700 whitespace-nowrap">
                                {formatQuetzales(grp.pagadoQueRebaja)}
                              </td>
                              <td className="p-2 text-right font-mono text-amber-700 whitespace-nowrap">
                                {formatQuetzales(grp.comprometidoPendiente)}
                              </td>
                              <td className="p-2 text-right font-mono text-purple-900 whitespace-nowrap">
                                {formatQuetzales(grp.gastoTotal)}
                              </td>
                              <td className="p-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                                {formatQuetzales(grp.disponibleProyectado)}
                              </td>
                              <td className="p-2 text-center font-mono text-slate-800">
                                {grp.ejecucionPct.toFixed(1)}%
                              </td>
                              <td className="p-2 text-center text-slate-600 text-[10px]">
                                SUBTOTAL
                              </td>
                              <td className="p-2 text-center font-mono text-slate-700">
                                {grp.comprasCount}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA: DASHBOARD DE MÉTRICAS DE EJECUCIÓN PRESUPUESTARIA (GRÁFICOS DE DONA) */}
        {/* ========================================================= */}
        {selectedReportType === 'metricas_ejecucion' && (
          <div className="space-y-6">
            
            {/* Panel Ejecutivo Superior con KPIs y Donas Globales */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Dashboard de Métricas de Ejecución Presupuestaria
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {totalesMetricasEjecucion.totalRenglones} Renglones Institucionales
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Visualización analítica mediante gráficos de dona del porcentaje de ejecución versus el disponible consolidado por cada renglón presupuestario
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMetricasCharts(!showMetricasCharts)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shadow-2xs"
                >
                  {showMetricasCharts ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ocultar Resumen Global</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Resumen Global & Donas</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contenido Desplegable Global */}
              {showMetricasCharts && (
                <div className="space-y-5 pt-1">
                  
                  {/* Tarjetas KPI de Resumen Institucional */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Techo Vigente Consolidado
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                        {formatQuetzales(totalesMetricasEjecucion.vigente)}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Inicial: {formatQuetzales(totalesMetricasEjecucion.inicial)}
                      </span>
                    </div>

                    <div className="bg-white border border-blue-200 p-3.5 rounded-xl shadow-2xs bg-blue-50/20">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                        Total Ejecutado Consolidado
                      </span>
                      <span className="text-base sm:text-lg font-black text-blue-900 font-mono block mt-0.5">
                        {formatQuetzales(totalesMetricasEjecucion.gastoTotal)}
                      </span>
                      <span className="text-[11px] text-blue-600 mt-1 block font-semibold">
                        {totalesMetricasEjecucion.pctGlobalEjecucion.toFixed(1)}% tasa de ejecución global
                      </span>
                    </div>

                    <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-2xs bg-emerald-50/20">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Saldo Disponible Consolidado
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-900 font-mono block mt-0.5">
                        {formatQuetzales(totalesMetricasEjecucion.disponibleProyectado)}
                      </span>
                      <span className="text-[11px] text-emerald-600 mt-1 block font-semibold">
                        {totalesMetricasEjecucion.pctGlobalDisponible.toFixed(1)}% saldo libre proyectado
                      </span>
                    </div>

                    <div className="bg-white border border-purple-200 p-3.5 rounded-xl shadow-2xs bg-purple-50/20">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                        Gobernanza de Adquisiciones
                      </span>
                      <span className="text-base sm:text-lg font-black text-purple-900 font-mono block mt-0.5">
                        {totalesMetricasEjecucion.comprasCount} Eventos
                      </span>
                      <span className="text-[11px] text-purple-600 mt-1 block">
                        {totalesMetricasEjecucion.totalRenglones} renglones evaluados
                      </span>
                    </div>
                  </div>

                  {/* Fila de 2 Gráficos de Dona Consolidados */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dona 1: Ejecución Presupuestaria Consolidada */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                          Ejecución Presupuestaria Consolidada
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          {totalesMetricasEjecucion.pctGlobalEjecucion.toFixed(1)}% Ejecutado
                        </span>
                      </div>

                      <div className="h-44 relative flex items-center justify-center">
                        {totalesMetricasEjecucion.donutGlobal.length > 0 ? (
                          <>
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={totalesMetricasEjecucion.donutGlobal}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={42}
                                  outerRadius={64}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {totalesMetricasEjecucion.donutGlobal.map((entry, index) => (
                                    <Cell key={`global-donut-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto']}
                                  contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-lg font-black font-mono text-slate-900 leading-none">
                                {totalesMetricasEjecucion.pctGlobalEjecucion.toFixed(1)}%
                              </span>
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">
                                Ejecutado
                              </span>
                            </div>
                          </>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>

                      <div className="flex flex-wrap justify-center gap-3 pt-1 border-t border-slate-100 text-[10px]">
                        {totalesMetricasEjecucion.donutGlobal.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 font-medium">
                              {d.name}: {formatQuetzales(d.value)} ({d.pct?.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dona 2: Semáforo de Renglones por Nivel de Ejecución */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <Activity className="w-3.5 h-3.5 text-emerald-600" />
                          Distribución de Renglones por Nivel de Ejecución
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {totalesMetricasEjecucion.totalRenglones} Renglones
                        </span>
                      </div>

                      <div className="h-44 relative flex items-center justify-center">
                        {totalesMetricasEjecucion.semaforoDonutData.length > 0 ? (
                          <>
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={totalesMetricasEjecucion.semaforoDonutData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={42}
                                  outerRadius={64}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {totalesMetricasEjecucion.semaforoDonutData.map((entry, index) => (
                                    <Cell key={`sem-donut-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  formatter={(val: any) => [`${val} Renglones`, 'Cantidad']}
                                  contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-lg font-black font-mono text-slate-900 leading-none">
                                {totalesMetricasEjecucion.totalRenglones}
                              </span>
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">
                                Renglones
                              </span>
                            </div>
                          </>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>

                      <div className="flex flex-wrap justify-center gap-3 pt-1 border-t border-slate-100 text-[10px]">
                        {totalesMetricasEjecucion.semaforoDonutData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 font-medium">
                              {d.name}: {d.value} ({((d.value / totalesMetricasEjecucion.totalRenglones) * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Barra de Herramientas, Filtros Dinámicos y Controles de Vista */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs print:hidden">
              <div className="flex items-center gap-2 flex-1 w-full lg:w-auto">
                {/* Búsqueda en Vivo */}
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar renglón (ej. 158, informática)..."
                    value={metricasSearch}
                    onChange={(e) => setMetricasSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {metricasSearch && (
                    <button
                      type="button"
                      onClick={() => setMetricasSearch('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filtro por Grupo */}
                <select
                  value={metricasGroupFilter}
                  onChange={(e) => setMetricasGroupFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="todos">Todos los Grupos</option>
                  <option value="100">Grupo 100 - Servicios</option>
                  <option value="200">Grupo 200 - Materiales</option>
                  <option value="300">Grupo 300 - Activos</option>
                </select>

                {/* Filtro por Rango de Ejecución */}
                <select
                  value={metricasTierFilter}
                  onChange={(e) => setMetricasTierFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer hidden sm:block"
                >
                  <option value="todos">Todos los Niveles</option>
                  <option value="alta">Alta Ejecución (&gt; 85%)</option>
                  <option value="media">Media Ejecución (50 - 85%)</option>
                  <option value="baja">Baja Ejecución (&lt; 50%)</option>
                  <option value="alerta">Con Alerta o Déficit</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 justify-between lg:justify-end flex-wrap sm:flex-nowrap">
                {/* Selector de Ordenamiento */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={metricasSortBy}
                    onChange={(e: any) => setMetricasSortBy(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="renglon">Por Renglón (Ascendente)</option>
                    <option value="mayor_ejecucion">Mayor % Ejecución</option>
                    <option value="menor_ejecucion">Menor % Ejecución</option>
                    <option value="mayor_vigente">Mayor Techo Vigente</option>
                    <option value="mayor_disponible">Mayor Saldo Disponible</option>
                  </select>
                </div>

                {/* Conmutador de Modo de Vista */}
                <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setMetricasViewMode('grid')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                      metricasViewMode === 'grid'
                        ? 'bg-emerald-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Vista en cuadrícula de donas individuales"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Donas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricasViewMode('table')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                      metricasViewMode === 'table'
                        ? 'bg-emerald-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Vista en tabla comparativa con micro donas"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Tabla</span>
                  </button>
                </div>

                <span className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-mono font-bold text-slate-700 shrink-0">
                  {filteredMetricasEjecucionData.length} renglones
                </span>
              </div>
            </div>

            {/* VISTA 1: CUADRÍCULA DE DONAS POR CADA RENGLÓN PRESUPUESTARIO */}
            {metricasViewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMetricasEjecucionData.length > 0 ? (
                  filteredMetricasEjecucionData.map((item) => (
                    <div
                      key={item.renglonPresupuestario}
                      className="bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all p-4 flex flex-col justify-between"
                    >
                      {/* Cabecera de la Tarjeta */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200">
                              R-{item.renglonPresupuestario}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.grupoPresupuestario.replace('Grupo ', 'G-')}
                            </span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold flex items-center gap-1 ${
                            item.estatusDisponibilidad === 'Con Disponibilidad' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            item.disponibleProyectado <= 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              item.estatusDisponibilidad === 'Con Disponibilidad' ? 'bg-emerald-500' :
                              item.disponibleProyectado <= 0 ? 'bg-rose-500' : 'bg-amber-500'
                            }`} />
                            {item.estatusDisponibilidad === 'Con Disponibilidad' ? 'Disponible' : (item.disponibleProyectado <= 0 ? 'Déficit' : 'Alerta')}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-800 line-clamp-2 min-h-[32px] leading-tight" title={item.nombreRenglon}>
                          {item.nombreRenglon}
                        </h4>
                      </div>

                      {/* Gráfico de Dona con Porcentaje Central */}
                      <div className="my-3 relative flex items-center justify-center">
                        <div className="w-full h-36 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={item.donutData}
                                cx="50%"
                                cy="50%"
                                innerRadius={36}
                                outerRadius={52}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {item.donutData.map((entry, index) => (
                                  <Cell key={`donut-${item.renglonPresupuestario}-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '5px 8px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>

                          {/* Centro de la Dona: Porcentaje de Ejecución */}
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-base font-black font-mono tracking-tight leading-none ${
                              item.pctEjecucion > 85 ? 'text-rose-600' :
                              item.pctEjecucion > 50 ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {item.pctEjecucion.toFixed(1)}%
                            </span>
                            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">
                              Ejecutado
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Métricas Clave y Comparativa Ejecución vs Disponible */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                        {/* Comparativa Directa */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                              <span className="truncate">Ejecutado:</span>
                              <strong className="text-slate-900 font-mono">{formatQuetzales(item.gastoTotal)}</strong>
                            </span>
                            <span className="font-bold font-mono text-blue-700 shrink-0">
                              {item.pctEjecucion.toFixed(1)}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${item.disponibleProyectado <= 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              <span className="truncate">Disponible:</span>
                              <strong className={`font-mono ${item.disponibleProyectado <= 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                                {formatQuetzales(item.disponibleProyectado)}
                              </strong>
                            </span>
                            <span className={`font-bold font-mono shrink-0 ${item.disponibleProyectado <= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {item.pctDisponible.toFixed(1)}%
                            </span>
                          </div>

                          {/* Barra de progreso comparativa dual apilada */}
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            <div 
                              className="h-full bg-blue-600 transition-all" 
                              style={{ width: `${Math.min(100, item.pctEjecucion)}%` }} 
                              title={`Ejecutado: ${item.pctEjecucion.toFixed(1)}%`}
                            />
                            <div 
                              className={`h-full transition-all ${item.disponibleProyectado <= 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${Math.min(100 - Math.min(100, item.pctEjecucion), Math.max(0, item.pctDisponible))}%` }} 
                              title={`Disponible: ${item.pctDisponible.toFixed(1)}%`}
                            />
                          </div>
                        </div>

                        {/* Desglose Contable */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                          <div>
                            <span className="text-[9px] font-normal text-slate-400 block font-sans">P. Vigente</span>
                            <span className="font-bold text-slate-800">{formatQuetzales(item.vigente)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-normal text-slate-400 block font-sans">Disp. Real</span>
                            <span className="font-semibold text-slate-700">{formatQuetzales(item.disponibleReal)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-normal text-blue-600 block font-sans">Pagado</span>
                            <span className="font-medium text-blue-700">{formatQuetzales(item.pagado)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-normal text-amber-600 block font-sans">Comprometido</span>
                            <span className="font-medium text-amber-700">{formatQuetzales(item.comprometido)}</span>
                          </div>
                        </div>

                        {/* Pie de Tarjeta con Adquisiciones Asociadas */}
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                          <span className="font-mono text-slate-600">
                            {item.comprasCount} {item.comprasCount === 1 ? 'adquisición F56-e' : 'adquisiciones F56-e'}
                          </span>
                          <span className="font-medium text-slate-600">
                            Inicial: {formatQuetzales(item.inicial)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full p-10 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                    No se encontraron renglones presupuestarios con los criterios seleccionados.
                  </div>
                )}
              </div>
            )}

            {/* VISTA 2: TABLA COMPARATIVA CON MINI DONAS EN CADA FILA */}
            {metricasViewMode === 'table' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs text-slate-800 border-collapse">
                  <thead className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white font-bold uppercase text-[9.5px] border-b-2 border-emerald-600 shadow-xs">
                    <tr>
                      <th className="p-2 border-b border-indigo-900/60 text-center text-white">Renglón</th>
                      <th className="p-2 border-b border-indigo-900/60 text-white">Nombre del Renglón</th>
                      <th className="p-2 border-b border-indigo-900/60 text-center text-white">Grupo</th>
                      <th className="p-2 border-b border-indigo-900/60 text-center text-white">Gráfico Dona</th>
                      <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">P. Vigente</th>
                      <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Pagado Devengado</th>
                      <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Comprometido</th>
                      <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Total Ejecutado</th>
                      <th className="p-2 border-b border-indigo-900/60 text-center text-white">% Ejecución</th>
                      <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Disp. Consolidado</th>
                      <th className="p-2 border-b border-indigo-900/60 text-center text-white">% Disponible</th>
                      <th className="p-2 border-b border-indigo-900/60 text-center text-white">Proporción</th>
                      <th className="p-2 border-b border-indigo-900/60 text-center text-white">Estatus</th>
                      <th className="p-2 border-b border-indigo-900/60 text-center text-white">Eventos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] bg-white">
                    {filteredMetricasEjecucionData.length > 0 ? (
                      filteredMetricasEjecucionData.map((item) => (
                        <tr key={item.renglonPresupuestario} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                              R-{item.renglonPresupuestario}
                            </span>
                          </td>
                          <td className="p-2 font-medium text-slate-900 max-w-xs truncate" title={item.nombreRenglon}>
                            {item.nombreRenglon}
                          </td>
                          <td className="p-2 text-center text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                            {item.grupoPresupuestario.replace('Grupo ', 'G-')}
                          </td>
                          
                          {/* Columna con Mini Gráfico de Dona SVG */}
                          <td className="p-2 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center relative w-10 h-10">
                              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                                {/* Círculo de fondo */}
                                <path
                                  className="text-slate-100"
                                  strokeWidth="4"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                {/* Arco de Ejecución */}
                                <path
                                  className={item.pctEjecucion > 85 ? 'text-rose-500' : item.pctEjecucion > 50 ? 'text-amber-500' : 'text-blue-600'}
                                  strokeDasharray={`${Math.min(100, item.pctEjecucion)}, 100`}
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <span className="absolute font-mono text-[9px] font-bold text-slate-800">
                                {item.pctEjecucion.toFixed(0)}%
                              </span>
                            </div>
                          </td>

                          <td className="p-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatQuetzales(item.vigente)}
                          </td>
                          <td className="p-2 text-right font-mono text-blue-700 whitespace-nowrap">
                            {formatQuetzales(item.pagado)}
                          </td>
                          <td className="p-2 text-right font-mono text-amber-700 whitespace-nowrap">
                            {formatQuetzales(item.comprometido)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-purple-900 whitespace-nowrap bg-purple-50/20">
                            {formatQuetzales(item.gastoTotal)}
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10.5px] ${
                              item.pctEjecucion > 85 ? 'bg-rose-100 text-rose-800' :
                              item.pctEjecucion > 50 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.pctEjecucion.toFixed(1)}%
                            </span>
                          </td>
                          <td className={`p-2 text-right font-mono font-bold whitespace-nowrap ${
                            item.disponibleProyectado <= 0 ? 'text-rose-700 bg-rose-50/50' : 'text-emerald-700 bg-emerald-50/30'
                          }`}>
                            {formatQuetzales(item.disponibleProyectado)}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {item.pctDisponible.toFixed(1)}%
                          </td>
                          <td className="p-2 text-center whitespace-nowrap w-24">
                            <div className="h-2 w-20 bg-slate-100 rounded-full overflow-hidden flex mx-auto">
                              <div 
                                className="h-full bg-blue-600" 
                                style={{ width: `${Math.min(100, item.pctEjecucion)}%` }} 
                              />
                              <div 
                                className={`h-full ${item.disponibleProyectado <= 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${Math.min(100 - Math.min(100, item.pctEjecucion), Math.max(0, item.pctDisponible))}%` }} 
                              />
                            </div>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.estatusDisponibilidad === 'Con Disponibilidad' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              item.disponibleProyectado <= 0 ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {item.estatusDisponibilidad === 'Con Disponibilidad' ? 'DISPONIBLE' : (item.disponibleProyectado <= 0 ? 'DÉFICIT' : 'ALERTA')}
                            </span>
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-600">
                            {item.comprasCount}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={14} className="p-8 text-center text-slate-400">
                          No se encontraron renglones presupuestarios coincidentes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold text-[11px] border-t-2 border-emerald-600">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-left uppercase tracking-wide">
                        TOTAL CONSOLIDADO ({filteredMetricasEjecucionData.length} RENGLONES)
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap text-white text-xs">
                        {formatQuetzales(totalesMetricasEjecucion.vigente)}
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap text-blue-300">
                        {formatQuetzales(totalesMetricasEjecucion.pagado)}
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap text-amber-300">
                        {formatQuetzales(totalesMetricasEjecucion.comprometido)}
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap text-purple-300 text-xs">
                        {formatQuetzales(totalesMetricasEjecucion.gastoTotal)}
                      </td>
                      <td className="p-2.5 text-center font-mono text-amber-300">
                        {totalesMetricasEjecucion.pctGlobalEjecucion.toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap text-emerald-400 text-xs">
                        {formatQuetzales(totalesMetricasEjecucion.disponibleProyectado)}
                      </td>
                      <td className="p-2.5 text-center font-mono text-emerald-300">
                        {totalesMetricasEjecucion.pctGlobalDisponible.toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-center text-slate-300 text-[10px]">
                        GLOBAL
                      </td>
                      <td className="p-2.5 text-center text-slate-300 text-[10px]">
                        CONSOLIDADO
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-200">
                        {totalesMetricasEjecucion.comprasCount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Banner Oficial Informativo y de Auditoría */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-bold">
                  <PieChartIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide">
                    Certificación de Métricas de Ejecución vs Disponibilidad
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Porcentajes y disponibilidades calculados automáticamente en base a las asignaciones oficiales y el cruce con los formularios F56-e y NOG.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tasa Global Ejecutada</span>
                  <span className="text-base font-bold font-mono text-blue-700">{totalesMetricasEjecucion.pctGlobalEjecucion.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Saldo Libre Proyectado</span>
                  <span className="text-base font-bold font-mono text-emerald-800">{formatQuetzales(totalesMetricasEjecucion.disponibleProyectado)}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA 5: ANALÍTICO POR GRUPO Y RENGLÓN (Requisito Explícito) */}
        {/* ========================================================= */}
        {selectedReportType === 'analitico' && (
          <div className="space-y-6">
            
            {/* PANEL EJECUTIVO DE KPIS Y GRÁFICAS CIRCULARES PARA ANALÍTICO GRUPO/RENGLÓN */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              
              {/* Encabezado del Panel con Botón de Alternar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Panel Ejecutivo de Decisión & Gráficas Circulares — Analítico de Gasto
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                        {granTotalAnaliticoEventos} Adquisiciones Analizadas
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Estructura jerárquica por grupo presupuestario (100, 200, 300) y concentración de gasto por renglón
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAnaliticoCharts(!showAnaliticoCharts)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shadow-2xs"
                >
                  {showAnaliticoCharts ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ocultar Gráficas</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Gráficas y KPIs</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contenido Desplegable de Gráficas y KPIs */}
              {showAnaliticoCharts && (
                <div className="space-y-5 pt-1">
                  
                  {/* Tarjetas KPI de Gasto Analítico */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Gasto Total Analizado
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                        {formatQuetzales(granTotalAnaliticoMonto)}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">Consolidado general analítico</span>
                    </div>

                    <div className="bg-white border border-blue-200 p-3.5 rounded-xl shadow-2xs bg-blue-50/20">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                        Eventos Procesados
                      </span>
                      <span className="text-base sm:text-lg font-black text-blue-900 font-mono block mt-0.5">
                        {granTotalAnaliticoEventos} trámites
                      </span>
                      <span className="text-[11px] text-blue-600 mt-1 block">Solicitudes F56-e y NOG</span>
                    </div>

                    <div className="bg-white border border-amber-200 p-3.5 rounded-xl shadow-2xs bg-amber-50/20">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        Grupos Presupuestarios
                      </span>
                      <span className="text-base sm:text-lg font-black text-amber-900 font-mono block mt-0.5">
                        {analiticoTree.length} Grupos
                      </span>
                      <span className="text-[11px] text-amber-600 mt-1 block">100 Servicios, 200 Mat., 300 Activos</span>
                    </div>

                    <div className="bg-white border border-purple-200 p-3.5 rounded-xl shadow-2xs bg-purple-50/20">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                        Promedio por Adquisición
                      </span>
                      <span className="text-base sm:text-lg font-black text-purple-900 font-mono block mt-0.5">
                        {formatQuetzales(granTotalAnaliticoEventos > 0 ? granTotalAnaliticoMonto / granTotalAnaliticoEventos : 0)}
                      </span>
                      <span className="text-[11px] text-purple-600 mt-1 block">Valor medio institucional</span>
                    </div>
                  </div>

                  {/* Fila de 2 Gráficas Circulares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gráfica 1: Distribución por Grupo Presupuestario */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                          Gasto por Grupo Presupuestario
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          {formatQuetzales(granTotalAnaliticoMonto)}
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {analiticoGrupoChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={analiticoGrupoChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {analiticoGrupoChartData.map((entry, index) => (
                                  <Cell key={`an-grp-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatQuetzales(Number(val)), 'Gasto Total']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                        {analiticoGrupoChartData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 font-medium">{d.fullName.split(':')[0]}: {formatQuetzales(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gráfica 2: Top Renglones por Concentración */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <PieChartIcon className="w-3.5 h-3.5 text-purple-600" />
                          Top Renglones con Mayor Concentración
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                          {granTotalAnaliticoEventos} Eventos
                        </span>
                      </div>
                      <div className="h-44 relative flex items-center justify-center">
                        {analiticoTopRenglonesChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={analiticoTopRenglonesChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {analiticoTopRenglonesChartData.map((entry, index) => (
                                  <Cell key={`an-rng-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto']}
                                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : <span className="text-xs text-slate-400">Sin datos</span>}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                        {analiticoTopRenglonesChartData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600 font-mono font-medium">{d.name}: {formatQuetzales(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Banner Descriptivo de Alcance Analítico */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <h4 className="font-bold text-sm">
                  {isAdmin 
                    ? 'Reporte Analítico General por Grupo y Renglón de TODAS las Áreas Técnicas'
                    : `Reporte Analítico por Grupo y Renglón de su Unidad: ${userAssignedArea || 'Área Asignada'}`}
                </h4>
              </div>
              <p className="text-blue-800 text-[11px]">
                {isAdmin
                  ? 'Como Administrador General, visualiza el desglose integral de cada Grupo y Renglón presupuestario, con subtotales específicos por Área Técnica Solicitante y consolidación global.'
                  : 'Este informe desglosa jerárquicamente las adquisiciones por Grupo y Renglón presupuestario correspondientes de forma exclusiva a su área técnica.'}
              </p>
            </div>

            {/* Estructura Jerárquica: Grupos -> Renglones -> Eventos / Desglose por Área */}
            {analiticoTree.length > 0 ? (
              analiticoTree.map((grp) => (
                <div key={grp.grupo} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  
                  {/* Encabezado de Grupo Presupuestario en Azul Oscuro */}
                  <div 
                    className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 flex items-center justify-between border-b-2 border-blue-800"
                  >
                    <div className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-blue-300" />
                      <span className="font-bold text-sm uppercase tracking-wide text-white">
                        {grp.nombreGrupo}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-blue-200 block">Subtotal Grupo</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {formatQuetzales(grp.totalGrupo)}
                      </span>
                    </div>
                  </div>

                  {/* Detalle de cada Renglón dentro del Grupo */}
                  <div className="p-4 space-y-5 bg-white">
                    {(Object.values(grp.renglones) as AnaliticoRenglonNode[]).map((rng) => (
                      <div key={rng.renglon} className="border border-slate-200 rounded-lg overflow-hidden">
                        
                        {/* Cabecera del Renglón */}
                        <div className="bg-slate-50 p-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-bold text-xs">
                              Renglón {rng.renglon}
                            </span>
                            <span className="font-bold text-xs text-slate-800">
                              {rng.nombreRenglon}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({rng.compras.length} {rng.compras.length === 1 ? 'evento' : 'eventos'})
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-medium mr-1.5">Subtotal Renglón:</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {formatQuetzales(rng.totalRenglon)}
                            </span>
                          </div>
                        </div>

                        {/* Desglose por Área Solicitante para Rol Administrador */}
                        {isAdmin && Object.keys(rng.desglosePorArea).length > 1 && (
                          <div className="bg-blue-50/50 p-2 border-b border-blue-100 flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="font-bold text-blue-900 shrink-0">Desglose por Áreas:</span>
                            {(Object.entries(rng.desglosePorArea) as [string, number][]).map(([areaName, areaMonto]) => (
                              <span 
                                key={areaName} 
                                className="px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-800 font-medium"
                              >
                                {areaName}: <strong className="font-mono">{formatQuetzales(areaMonto)}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Tabla de Eventos del Renglón */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-800 border-collapse">
                            <thead className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white font-bold uppercase text-[9.5px] border-b-2 border-blue-800 shadow-xs">
                              <tr>
                                <th className="p-2 border-b border-indigo-900/60 text-white">NOG</th>
                                <th className="p-2 border-b border-indigo-900/60 text-white">F56-e</th>
                                {isAdmin && <th className="p-2 border-b border-indigo-900/60 text-white">Área Solicitante</th>}
                                <th className="p-2 border-b border-indigo-900/60 text-white">Descripción</th>
                                <th className="p-2 border-b border-indigo-900/60 text-white">Modalidad</th>
                                <th className="p-2 border-b border-indigo-900/60 text-center text-white">Estatus</th>
                                <th className="p-2 border-b border-indigo-900/60 text-right font-mono text-white">Monto (GTQ)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11.5px]">
                              {rng.compras.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                  <td className="p-2 font-mono font-bold text-slate-900 whitespace-nowrap">{p.nog}</td>
                                  <td className="p-2 font-mono text-slate-700 whitespace-nowrap">{p.f56e}</td>
                                  {isAdmin && (
                                    <td className="p-2 font-semibold text-slate-700 whitespace-nowrap">
                                      {p.areaSolicitante || 'N/A'}
                                    </td>
                                  )}
                                  <td className="p-2 max-w-sm text-slate-800">{p.descripcion}</td>
                                  <td className="p-2 whitespace-nowrap text-slate-600">{p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre}</td>
                                  <td className="p-2 text-center whitespace-nowrap">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      p.estatusEvento === 'Adjudicación' ? 'bg-blue-100 text-blue-800' :
                                      p.estatusEvento === 'Evaluación' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {p.estatusEvento}
                                    </span>
                                  </td>
                                  <td className="p-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                    {formatQuetzales(p.monto)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-semibold text-[11px] border-t border-slate-200">
                              <tr>
                                <td colSpan={isAdmin ? 6 : 5} className="p-2 text-right text-slate-600">
                                  Subtotal Renglón {rng.renglon} ({rng.compras.length} eventos):
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {formatQuetzales(rng.totalRenglon)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                      </div>
                    ))}
                  </div>

                  {/* Subtotal del Grupo Presupuestario */}
                  <div className="bg-slate-100 p-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>
                      SUBTOTAL {grp.nombreGrupo.toUpperCase()} ({grp.totalEventosGrupo} EVENTOS)
                    </span>
                    <span className="font-mono text-sm text-slate-950">
                      {formatQuetzales(grp.totalGrupo)}
                    </span>
                  </div>

                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                No hay adquisiciones registradas para generar el reporte analítico por grupo y renglón.
              </div>
            )}

            {/* GRAN TOTALIZACIÓN AL FINAL DEL INFORME ANALÍTICO (Requisito de usuario) */}
            <div className="bg-slate-950 text-white rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <ListTree className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-white">
                      Gran Totalización Analítica General
                    </h4>
                    <p className="text-xs text-slate-400">
                      {isAdmin 
                        ? `Consolidación de ${granTotalAnaliticoEventos} adquisiciones en todas las unidades institucionales`
                        : `Consolidación de ${granTotalAnaliticoEventos} adquisiciones de la unidad técnica asignada`}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs font-semibold text-slate-400 block uppercase">
                    Monto General Totalizado
                  </span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {formatQuetzales(granTotalAnaliticoMonto)}
                  </span>
                </div>
              </div>

              {/* Desglose Sintético de Subtotales por Grupo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {analiticoTree.map((g) => (
                  <div key={g.grupo} className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {g.nombreGrupo}
                    </span>
                    <span className="font-mono font-bold text-white text-sm block mt-0.5">
                      {formatQuetzales(g.totalGrupo)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {g.totalEventosGrupo} eventos ({Math.round((g.totalGrupo / (granTotalAnaliticoMonto || 1)) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 5. Cierre Institucional de Firmas y Responsabilidades */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-slate-300 mb-2 h-12" />
            <p className="font-bold text-slate-900">
              {isAdmin 
                ? (currentUser?.nombreCompleto || 'Administrador General')
                : (currentUser?.nombreCompleto || 'Encargado de Área')}
            </p>
            <p className="text-[11px] text-slate-500">
              {isAdmin ? 'Gerencia de Informática • Organismo Judicial' : `Unidad Técnica: ${userAssignedArea || 'Área Asignada'}`}
            </p>
          </div>
          <div>
            <div className="border-b border-slate-300 mb-2 h-12" />
            <p className="font-bold text-slate-900">Dirección de Auditoría Interna</p>
            <p className="text-[11px] text-slate-500">Fiscalización y Control Institucional Conforme a la Ley</p>
          </div>
        </div>

      </div>

      {/* Modal Individual de Boleta Oficial de Dictamen (F56-e) */}
      {selectedDictamenPurchase && (
        <InstitutionalReportModal
          purchase={selectedDictamenPurchase}
          onClose={() => setSelectedDictamenPurchase(null)}
        />
      )}

    </div>
  );
};
