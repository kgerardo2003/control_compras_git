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
  Clock
} from 'lucide-react';
import { formatQuetzales, formatDate, exportToCSV, getModalidadCompraByMonto } from '../utils/formatters';
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
import { PurchaseRecord } from '../types';

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
    'consolidado' | 'adjudicados' | 'git' | 'balance' | 'analitico'
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
      const lowerFilter = adminAreaFilter.toLowerCase();
      return purchases.filter(p => {
        const pArea = (p.areaSolicitante || '').toLowerCase();
        const pDep = (p.dependenciaSolicitante || '').toLowerCase();
        return pArea.includes(lowerFilter) || pDep.includes(lowerFilter);
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

  // Acciones de Impresión y Exportación
  const handlePrint = () => {
    window.print();
  };

  const handleExportFullCSV = () => {
    let rows: Record<string, any>[] = [];
    let filename = '';

    if (selectedReportType === 'consolidado') {
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

      {/* 3. Selector de Pestañas de Informe (5 Pestañas Completas) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
        
        {/* Pestaña 1: Consolidado General */}
        <button
          id="tab-report-consolidado"
          type="button"
          onClick={() => setSelectedReportType('consolidado')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'consolidado'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Consolidado General</span>
            <FileText className={`w-4 h-4 ${selectedReportType === 'consolidado' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p className={`text-[11px] mt-1 ${selectedReportType === 'consolidado' ? 'text-slate-300' : 'text-slate-400'}`}>
            {basePurchases.length} eventos • {formatQuetzales(totalMontoConsolidado)}
          </p>
        </button>

        {/* Pestaña 2: Adjudicados */}
        <button
          id="tab-report-adjudicados"
          type="button"
          onClick={() => setSelectedReportType('adjudicados')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'adjudicados'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Adjudicados</span>
            <CheckCircle2 className={`w-4 h-4 ${selectedReportType === 'adjudicados' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p className={`text-[11px] mt-1 ${selectedReportType === 'adjudicados' ? 'text-slate-300' : 'text-slate-400'}`}>
            {adjudicados.length} adjudicados • {formatQuetzales(totalMontoAdjudicado)}
          </p>
        </button>

        {/* Pestaña 3: Dictámenes Técnicos (GIT) */}
        <button
          id="tab-report-git"
          type="button"
          onClick={() => setSelectedReportType('git')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'git'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Dictámenes GIT</span>
            <FileCheck2 className={`w-4 h-4 ${selectedReportType === 'git' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p className={`text-[11px] mt-1 ${selectedReportType === 'git' ? 'text-slate-300' : 'text-slate-400'}`}>
            {evaluadosGIT.length} dictaminados • {formatQuetzales(totalMontoDictaminado)}
          </p>
        </button>

        {/* Pestaña 4: Balance Financiero */}
        <button
          id="tab-report-balance"
          type="button"
          onClick={() => setSelectedReportType('balance')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'balance'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Balance Financiero</span>
            <DollarSign className={`w-4 h-4 ${selectedReportType === 'balance' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p className={`text-[11px] mt-1 ${selectedReportType === 'balance' ? 'text-slate-300' : 'text-slate-400'}`}>
            Comprometido: {formatQuetzales(totalBalanceComprometido)}
          </p>
        </button>

        {/* Pestaña 5: Analítico por Grupo y Renglón (Solicitado por el usuario) */}
        <button
          id="tab-report-analitico"
          type="button"
          onClick={() => setSelectedReportType('analitico')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'analitico'
              ? 'bg-blue-900 text-white border-blue-900 shadow-xs ring-2 ring-blue-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Analítico Grupo/Renglón</span>
            <ListTree className={`w-4 h-4 ${selectedReportType === 'analitico' ? 'text-amber-400' : 'text-blue-600'}`} />
          </div>
          <p className={`text-[11px] mt-1 ${selectedReportType === 'analitico' ? 'text-blue-200' : 'text-slate-400'}`}>
            {isAdmin ? 'Todas las Áreas' : (userAssignedArea || 'Área Asignada')}
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
              {selectedReportType === 'balance' && '4. Balance Financiero y Ejecución Presupuestaria por Renglón'}
              {selectedReportType === 'analitico' && (
                isAdmin
                  ? '5. Desglose Analítico por Grupo y Renglón Presupuestario (Consolidado de Todas las Áreas)'
                  : `5. Desglose Analítico por Grupo y Renglón Presupuestario - Unidad: ${(userAssignedArea || 'ÁREA').toUpperCase()}`
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedReportType === 'consolidado' && 'Listado maestro de formularios F56-e, estatus del evento y montos de compra'}
              {selectedReportType === 'adjudicados' && 'Expedientes adjudicados a proveedores con detalle de montos y modalidades'}
              {selectedReportType === 'git' && 'Control de dictámenes técnicos elaborados conforme al Decreto 57-92 y normativas'}
              {selectedReportType === 'balance' && 'Disponibilidad presupuestaria vigente, comprometida, pagada y saldos reales'}
              {selectedReportType === 'analitico' && (
                isAdmin 
                  ? 'Estructura jerárquica por Grupo (100, 200, 300) y Renglón presupuestario con desglose comparativo por área'
                  : 'Estructura jerárquica por Grupo y Renglón presupuestario de las adquisiciones correspondientes a su unidad'
              )}
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
