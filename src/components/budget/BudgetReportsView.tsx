import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  DollarSign, 
  Building2, 
  ShoppingBag, 
  Check, 
  Clock,
  FileCheck,
  ShieldCheck,
  TrendingUp,
  PieChart as PieChartIcon,
  Sparkles,
  Percent,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BudgetLineItem, PurchaseRecord } from '../../types';
import { formatQuetzales, formatDateTime } from '../../utils/formatters';
import { OJ_LOGO_DATA_URI } from '../../utils/ojLogoAsset';

export type BudgetReportVariant = 
  | 'matriz_consolidada'
  | 'compras_por_renglon'
  | 'comprometido_pendiente'
  | 'pagado_devengado'
  | 'alertas_deficit'
  | 'gasto_grupo_renglon';

interface BudgetReportsViewProps {
  budgetAvailability: BudgetLineItem[];
  purchases: PurchaseRecord[];
}

export const BudgetReportsView: React.FC<BudgetReportsViewProps> = ({
  budgetAvailability,
  purchases
}) => {
  const [activeVariant, setActiveVariant] = useState<BudgetReportVariant>('matriz_consolidada');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRenglon, setFilterRenglon] = useState('todos');

  const now = new Date();
  const fechaEmision = formatDateTime(now.toISOString());

  // Renglones únicos
  const availableRenglones = useMemo(() => {
    return budgetAvailability.map(l => ({
      codigo: l.renglonPresupuestario,
      nombre: l.nombreRenglon
    }));
  }, [budgetAvailability]);

  // VARIANTES DE DATOS
  // 1. Matriz Consolidada
  const dataMatriz = useMemo(() => {
    return budgetAvailability.filter(l => {
      const matchSearch = searchTerm === '' || 
        l.renglonPresupuestario.includes(searchTerm) || 
        l.nombreRenglon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.grupoPresupuestario.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRenglon = filterRenglon === 'todos' || l.renglonPresupuestario === filterRenglon;
      return matchSearch && matchRenglon;
    });
  }, [budgetAvailability, searchTerm, filterRenglon]);

  // 2. Compras Vinculadas por Renglón
  const dataCompras = useMemo(() => {
    return purchases.filter(p => {
      const f56 = p.f56e || p.f56 || p.numeroSolicitud || '';
      const nog = p.nog || p.nogGuatecompras || '';
      const matchSearch = searchTerm === '' ||
        f56.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nog.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.proveedorAdjudicado || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchRenglon = filterRenglon === 'todos' || p.renglonPresupuestario === filterRenglon;
      return matchSearch && matchRenglon;
    });
  }, [purchases, searchTerm, filterRenglon]);

  // 3. Comprometido Pendiente de Pago
  const dataComprometido = useMemo(() => {
    return dataCompras.filter(p => p.estadoPago !== 'pagado' && p.estatusEvento !== 'Pagada');
  }, [dataCompras]);

  // 4. Pagado Devengado
  const dataPagado = useMemo(() => {
    return dataCompras.filter(p => p.estadoPago === 'pagado' || p.estatusEvento === 'Pagada');
  }, [dataCompras]);

  // 5. Alertas y Déficit
  const dataAlertas = useMemo(() => {
    return dataMatriz.filter(l => l.disponibleProyectado <= (l.presupuestoVigente * 0.15));
  }, [dataMatriz]);

  // 6. Gasto Consolidado por Grupo y Renglón Presupuestario
  const dataGastoGrupoRenglon = useMemo(() => {
    const filteredLines = budgetAvailability.filter(l => {
      const matchSearch = searchTerm === '' || 
        l.renglonPresupuestario.includes(searchTerm) || 
        l.nombreRenglon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.grupoPresupuestario.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRenglon = filterRenglon === 'todos' || l.renglonPresupuestario === filterRenglon;
      return matchSearch && matchRenglon;
    });

    const groupMap = new Map<string, {
      grupo: string;
      presupuestoInicial: number;
      modificaciones: number;
      presupuestoVigente: number;
      pagadoQueRebaja: number;
      comprometidoPendiente: number;
      gastoTotal: number;
      disponibleProyectado: number;
      comprasCount: number;
      renglones: Array<BudgetLineItem & { gastoTotal: number; porcentajeEjecucion: number; comprasCount: number }>;
    }>();

    filteredLines.forEach(l => {
      const grupoKey = l.grupoPresupuestario || 'Otros Grupos';
      if (!groupMap.has(grupoKey)) {
        groupMap.set(grupoKey, {
          grupo: grupoKey,
          presupuestoInicial: 0,
          modificaciones: 0,
          presupuestoVigente: 0,
          pagadoQueRebaja: 0,
          comprometidoPendiente: 0,
          gastoTotal: 0,
          disponibleProyectado: 0,
          comprasCount: 0,
          renglones: []
        });
      }

      const g = groupMap.get(grupoKey)!;
      const gastoTotalRenglon = (l.pagadoQueRebaja || 0) + (l.comprometidoPendiente || 0);
      const porcentajeEjec = l.presupuestoVigente > 0 ? (gastoTotalRenglon / l.presupuestoVigente) * 100 : 0;
      const countPurchases = purchases.filter(p => p.renglonPresupuestario === l.renglonPresupuestario).length;

      g.presupuestoInicial += (l.presupuestoInicial || 0);
      g.modificaciones += (l.modificacionesAprobadas || 0);
      g.presupuestoVigente += (l.presupuestoVigente || 0);
      g.pagadoQueRebaja += (l.pagadoQueRebaja || 0);
      g.comprometidoPendiente += (l.comprometidoPendiente || 0);
      g.gastoTotal += gastoTotalRenglon;
      g.disponibleProyectado += (l.disponibleProyectado || 0);
      g.comprasCount += countPurchases;

      g.renglones.push({
        ...l,
        gastoTotal: gastoTotalRenglon,
        porcentajeEjecucion: Math.round(porcentajeEjec * 10) / 10,
        comprasCount: countPurchases
      });
    });

    Array.from(groupMap.values()).forEach(g => {
      g.renglones.sort((a, b) => a.renglonPresupuestario.localeCompare(b.renglonPresupuestario));
    });

    return Array.from(groupMap.values()).sort((a, b) => a.grupo.localeCompare(b.grupo));
  }, [budgetAvailability, purchases, searchTerm, filterRenglon]);

  // Totales de la variante activa
  const variantTotals = useMemo(() => {
    if (activeVariant === 'matriz_consolidada' || activeVariant === 'alertas_deficit' || activeVariant === 'gasto_grupo_renglon') {
      const source = activeVariant === 'matriz_consolidada' ? dataMatriz : 
                     activeVariant === 'alertas_deficit' ? dataAlertas :
                     dataGastoGrupoRenglon.flatMap(g => g.renglones);
      return source.reduce((acc, l) => {
        acc.inicial += l.presupuestoInicial || 0;
        acc.modificaciones += l.modificacionesAprobadas || 0;
        acc.vigente += l.presupuestoVigente || 0;
        acc.pagado += l.pagadoQueRebaja || 0;
        acc.comprometido += l.comprometidoPendiente || 0;
        acc.disponibleReal += l.disponibleReal || 0;
        acc.disponibleProyectado += l.disponibleProyectado || 0;
        acc.totalGasto += ((l.pagadoQueRebaja || 0) + (l.comprometidoPendiente || 0));
        return acc;
      }, { inicial: 0, modificaciones: 0, vigente: 0, pagado: 0, comprometido: 0, disponibleReal: 0, disponibleProyectado: 0, totalGasto: 0 });
    } else {
      const source = activeVariant === 'compras_por_renglon' ? dataCompras :
                     activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado;
      const totalMonto = source.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
      return { totalMonto, cantidad: source.length };
    }
  }, [activeVariant, dataMatriz, dataAlertas, dataGastoGrupoRenglon, dataCompras, dataComprometido, dataPagado]);

  // Estadísticas analíticas por grupo presupuestario para la Matriz Consolidada
  const matrizGroupStats = useMemo(() => {
    const groups = [
      { id: '100', name: 'Grupo 100 - Servicios No Personales', short: 'G-100 Servicios' },
      { id: '200', name: 'Grupo 200 - Materiales y Suministros', short: 'G-200 Materiales' },
      { id: '300', name: 'Grupo 300 - Propiedad, Planta, Equipo e Intangibles', short: 'G-300 Activos/Equipo' }
    ];

    return groups.map(g => {
      const lines = dataMatriz.filter(l => l.grupoPresupuestario.includes(g.id) || l.renglonPresupuestario.startsWith(g.id[0]));
      const vigente = lines.reduce((sum, l) => sum + (l.presupuestoVigente || 0), 0);
      const pagado = lines.reduce((sum, l) => sum + (l.pagadoQueRebaja || 0), 0);
      const comprometido = lines.reduce((sum, l) => sum + (l.comprometidoPendiente || 0), 0);
      const totalGasto = pagado + comprometido;
      const disponible = lines.reduce((sum, l) => sum + (l.disponibleProyectado || 0), 0);
      const pct = vigente > 0 ? Math.round((totalGasto / vigente) * 1000) / 10 : 0;
      return {
        ...g,
        count: lines.length,
        vigente,
        pagado,
        comprometido,
        totalGasto,
        disponible,
        pct
      };
    });
  }, [dataMatriz]);

  // Semáforo de salud de partidas para la Matriz Consolidada
  const matrizHealthStats = useMemo(() => {
    const saludable = dataMatriz.filter(l => l.disponibleProyectado > (l.presupuestoVigente * 0.15)).length;
    const alerta = dataMatriz.filter(l => l.disponibleProyectado <= (l.presupuestoVigente * 0.15) && l.disponibleProyectado > 0).length;
    const deficit = dataMatriz.filter(l => l.disponibleProyectado <= 0).length;
    return { saludable, alerta, deficit, total: dataMatriz.length };
  }, [dataMatriz]);

  // 1. Matriz Consolidada - Datos de Gráficas de Círculo
  const matrizTechoChartData = useMemo(() => {
    if (!('vigente' in variantTotals) || variantTotals.vigente <= 0) return [];
    return [
      { name: 'Pagado Devengado', value: variantTotals.pagado, color: '#2563eb' },
      { name: 'Comprometido Trámite', value: variantTotals.comprometido, color: '#f59e0b' },
      { name: 'Saldo Disponible', value: Math.max(0, variantTotals.disponibleProyectado), color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [variantTotals]);

  const matrizGruposChartData = useMemo(() => {
    return matrizGroupStats.map(g => ({
      name: g.short,
      value: g.vigente,
      color: g.id === '100' ? '#3b82f6' : g.id === '200' ? '#8b5cf6' : '#ec4899'
    })).filter(d => d.value > 0);
  }, [matrizGroupStats]);

  const matrizSaludChartData = useMemo(() => {
    return [
      { name: 'Con Disponibilidad (>15%)', value: matrizHealthStats.saludable, color: '#10b981' },
      { name: 'Alerta Preventiva (≤15%)', value: matrizHealthStats.alerta, color: '#f59e0b' },
      { name: 'En Déficit / Sin Saldo', value: matrizHealthStats.deficit, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [matrizHealthStats]);

  // 2. Compras Vinculadas por Renglón - Estadísticas y Gráficas de Círculo
  const comprasKPIs = useMemo(() => {
    const totalMonto = dataCompras.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
    const pagadas = dataCompras.filter(p => p.estadoPago === 'pagado' || p.estatusEvento === 'Pagada');
    const comprometidas = dataCompras.filter(p => p.estadoPago !== 'pagado' && p.estatusEvento !== 'Pagada');
    const pagadasMonto = pagadas.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
    const comprometidasMonto = comprometidas.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
    const uniqueRenglones = new Set(dataCompras.map(p => p.renglonPresupuestario).filter(Boolean));
    return {
      totalMonto,
      totalCount: dataCompras.length,
      pagadasMonto,
      pagadasCount: pagadas.length,
      comprometidasMonto,
      comprometidasCount: comprometidas.length,
      renglonesAfectados: uniqueRenglones.size
    };
  }, [dataCompras]);

  const comprasEstadoChartData = useMemo(() => {
    return [
      { name: 'Pagado que Rebaja', value: comprasKPIs.pagadasMonto, color: '#2563eb' },
      { name: 'Comprometido en Trámite', value: comprasKPIs.comprometidasMonto, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [comprasKPIs]);

  const comprasTopRenglonesChartData = useMemo(() => {
    const map: Record<string, number> = {};
    dataCompras.forEach(p => {
      const r = p.renglonPresupuestario ? `R-${p.renglonPresupuestario}` : 'Sin Renglón';
      map[r] = (map[r] || 0) + (Number(p.monto) || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((sum, item) => sum + item[1], 0);
    const palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];
    const result = top5.map((item, idx) => ({
      name: item[0],
      value: item[1],
      color: palette[idx % palette.length]
    }));
    if (others > 0) {
      result.push({ name: 'Otros Renglones', value: others, color: '#94a3b8' });
    }
    return result;
  }, [dataCompras]);

  const comprasModalidadChartData = useMemo(() => {
    const map: Record<string, number> = {};
    dataCompras.forEach(p => {
      const m = p.modalidadCompra || p.tipoCompra || 'Compra Directa';
      map[m] = (map[m] || 0) + 1;
    });
    const palette = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];
    return Object.entries(map).map(([name, value], idx) => ({
      name,
      value,
      color: palette[idx % palette.length]
    }));
  }, [dataCompras]);

  // 3. Comprometido en Trámite
  const comprometidoKPIs = useMemo(() => {
    const totalMonto = dataComprometido.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
    const totalCount = dataComprometido.length;
    const promedio = totalCount > 0 ? totalMonto / totalCount : 0;
    const mayorMonto = totalCount > 0 ? Math.max(...dataComprometido.map(p => Number(p.monto) || 0)) : 0;
    const uniqueRenglones = new Set(dataComprometido.map(p => p.renglonPresupuestario).filter(Boolean));
    return {
      totalMonto,
      totalCount,
      promedio,
      mayorMonto,
      renglonesAfectados: uniqueRenglones.size
    };
  }, [dataComprometido]);

  const comprometidoGrupoChartData = useMemo(() => {
    const groups: Record<string, number> = { 'G-100 Servicios': 0, 'G-200 Materiales': 0, 'G-300 Activos': 0 };
    dataComprometido.forEach(p => {
      const r = String(p.renglonPresupuestario || '');
      if (r.startsWith('1')) groups['G-100 Servicios'] += Number(p.monto) || 0;
      else if (r.startsWith('2')) groups['G-200 Materiales'] += Number(p.monto) || 0;
      else if (r.startsWith('3')) groups['G-300 Activos'] += Number(p.monto) || 0;
    });
    const colors = { 'G-100 Servicios': '#3b82f6', 'G-200 Materiales': '#8b5cf6', 'G-300 Activos': '#ec4899' };
    return Object.entries(groups).map(([name, value]) => ({
      name,
      value,
      color: colors[name as keyof typeof colors]
    })).filter(d => d.value > 0);
  }, [dataComprometido]);

  const comprometidoTopRenglonesChartData = useMemo(() => {
    const map: Record<string, number> = {};
    dataComprometido.forEach(p => {
      const r = p.renglonPresupuestario ? `R-${p.renglonPresupuestario}` : 'Sin Renglón';
      map[r] = (map[r] || 0) + (Number(p.monto) || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const palette = ['#f59e0b', '#f97316', '#eab308', '#84cc16', '#06b6d4'];
    return sorted.map(([name, value], idx) => ({
      name,
      value,
      color: palette[idx % palette.length]
    }));
  }, [dataComprometido]);

  // 4. Pagado / Devengado
  const pagadoKPIs = useMemo(() => {
    const totalMonto = dataPagado.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
    const totalCount = dataPagado.length;
    const promedio = totalCount > 0 ? totalMonto / totalCount : 0;
    const mayorPago = totalCount > 0 ? Math.max(...dataPagado.map(p => Number(p.monto) || 0)) : 0;
    const uniqueRenglones = new Set(dataPagado.map(p => p.renglonPresupuestario).filter(Boolean));
    return {
      totalMonto,
      totalCount,
      promedio,
      mayorPago,
      renglonesAfectados: uniqueRenglones.size
    };
  }, [dataPagado]);

  const pagadoGrupoChartData = useMemo(() => {
    const groups: Record<string, number> = { 'G-100 Servicios': 0, 'G-200 Materiales': 0, 'G-300 Activos': 0 };
    dataPagado.forEach(p => {
      const r = String(p.renglonPresupuestario || '');
      if (r.startsWith('1')) groups['G-100 Servicios'] += Number(p.monto) || 0;
      else if (r.startsWith('2')) groups['G-200 Materiales'] += Number(p.monto) || 0;
      else if (r.startsWith('3')) groups['G-300 Activos'] += Number(p.monto) || 0;
    });
    const colors = { 'G-100 Servicios': '#2563eb', 'G-200 Materiales': '#7c3aed', 'G-300 Activos': '#db2777' };
    return Object.entries(groups).map(([name, value]) => ({
      name,
      value,
      color: colors[name as keyof typeof colors]
    })).filter(d => d.value > 0);
  }, [dataPagado]);

  const pagadoTopRenglonesChartData = useMemo(() => {
    const map: Record<string, number> = {};
    dataPagado.forEach(p => {
      const r = p.renglonPresupuestario ? `R-${p.renglonPresupuestario}` : 'Sin Renglón';
      map[r] = (map[r] || 0) + (Number(p.monto) || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const palette = ['#2563eb', '#3b82f6', '#0284c7', '#0891b2', '#0d9488'];
    return sorted.map(([name, value], idx) => ({
      name,
      value,
      color: palette[idx % palette.length]
    }));
  }, [dataPagado]);

  // 5. Alertas y Déficit
  const alertasKPIs = useMemo(() => {
    const totalAlertas = dataAlertas.length;
    const deficitCount = dataAlertas.filter(l => (l.disponibleProyectado || 0) <= 0).length;
    const preventivaCount = dataAlertas.filter(l => (l.disponibleProyectado || 0) > 0 && (l.disponibleProyectado || 0) <= (l.presupuestoVigente * 0.15)).length;
    const deficitMonto = dataAlertas.filter(l => (l.disponibleProyectado || 0) < 0).reduce((sum, l) => sum + Math.abs(l.disponibleProyectado), 0);
    const techoAfectado = dataAlertas.reduce((sum, l) => sum + (l.presupuestoVigente || 0), 0);
    return {
      totalAlertas,
      deficitCount,
      preventivaCount,
      deficitMonto,
      techoAfectado
    };
  }, [dataAlertas]);

  const alertasSeveridadChartData = useMemo(() => {
    const totalAll = budgetAvailability.length;
    const normales = Math.max(0, totalAll - alertasKPIs.totalAlertas);
    return [
      { name: 'Déficit Crítico (≤ Q 0)', value: alertasKPIs.deficitCount, color: '#ef4444' },
      { name: 'Alerta Preventiva (≤ 15%)', value: alertasKPIs.preventivaCount, color: '#f59e0b' },
      { name: 'Disponibilidad Normal', value: normales, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [alertasKPIs, budgetAvailability]);

  const alertasGrupoChartData = useMemo(() => {
    const map: Record<string, number> = { 'G-100 Servicios': 0, 'G-200 Materiales': 0, 'G-300 Activos': 0 };
    dataAlertas.forEach(l => {
      const r = String(l.renglonPresupuestario || '');
      if (r.startsWith('1')) map['G-100 Servicios'] += 1;
      else if (r.startsWith('2')) map['G-200 Materiales'] += 1;
      else if (r.startsWith('3')) map['G-300 Activos'] += 1;
    });
    const colors = { 'G-100 Servicios': '#f43f5e', 'G-200 Materiales': '#e11d48', 'G-300 Activos': '#be123c' };
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: colors[name as keyof typeof colors]
    })).filter(d => d.value > 0);
  }, [dataAlertas]);

  // 6. Gasto Consolidado por Grupo y Renglón
  const gastoGrupoKPIs = useMemo(() => {
    const totalVigente = dataGastoGrupoRenglon.reduce((sum, g) => sum + g.presupuestoVigente, 0);
    const totalGasto = dataGastoGrupoRenglon.reduce((sum, g) => sum + g.gastoTotal, 0);
    const totalDisponible = dataGastoGrupoRenglon.reduce((sum, g) => sum + g.disponibleProyectado, 0);
    const ejecucionPct = totalVigente > 0 ? (totalGasto / totalVigente) * 100 : 0;
    return {
      totalVigente,
      totalGasto,
      totalDisponible,
      ejecucionPct
    };
  }, [dataGastoGrupoRenglon]);

  const gastoGrupoVigenteChartData = useMemo(() => {
    const palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
    return dataGastoGrupoRenglon.map((g, idx) => ({
      name: g.grupo.replace('Grupo ', 'G-'),
      value: g.presupuestoVigente,
      color: palette[idx % palette.length]
    })).filter(d => d.value > 0);
  }, [dataGastoGrupoRenglon]);

  const gastoGrupoRealChartData = useMemo(() => {
    const palette = ['#2563eb', '#7c3aed', '#db2777', '#0891b2'];
    return dataGastoGrupoRenglon.map((g, idx) => ({
      name: g.grupo.replace('Grupo ', 'G-'),
      value: g.gastoTotal,
      color: palette[idx % palette.length]
    })).filter(d => d.value > 0);
  }, [dataGastoGrupoRenglon]);

  const gastoGrupoDisponibleChartData = useMemo(() => {
    const palette = ['#10b981', '#059669', '#047857', '#065f46'];
    return dataGastoGrupoRenglon.map((g, idx) => ({
      name: g.grupo.replace('Grupo ', 'G-'),
      value: Math.max(0, g.disponibleProyectado),
      color: palette[idx % palette.length]
    })).filter(d => d.value > 0);
  }, [dataGastoGrupoRenglon]);

  // EXPORTAR A EXCEL SEGÚN VARIANTE
  const handleExportExcel = () => {
    let wsData: any[] = [];
    let filename = '';

    if (activeVariant === 'gasto_grupo_renglon') {
      filename = `Reporte_Gasto_Grupo_Renglon_OJ_${now.toISOString().slice(0, 10)}.xlsx`;
      dataGastoGrupoRenglon.forEach(grp => {
        // Fila de Encabezado / Subtotal del Grupo
        wsData.push({
          'Grupo Presupuestario': grp.grupo.toUpperCase(),
          'Renglón': `SUBTOTAL ${grp.grupo.replace('Grupo ', 'G-')}`,
          'Nombre del Renglón': `(Consolidado de ${grp.renglones.length} renglones)`,
          'Presupuesto Inicial (Q)': grp.presupuestoInicial,
          'Modificaciones (+/-) (Q)': grp.modificaciones,
          'Presupuesto Vigente (Q)': grp.presupuestoVigente,
          'Pagado que Rebaja (Q)': grp.pagadoQueRebaja,
          'Disponible Real (Q)': grp.presupuestoVigente - grp.pagadoQueRebaja,
          'Comprometido Pendiente (Q)': grp.comprometidoPendiente,
          'Disponible Proyectado (Q)': grp.disponibleProyectado,
          '% Usado/Comprometido': grp.presupuestoVigente > 0 ? `${((grp.gastoTotal / grp.presupuestoVigente) * 100).toFixed(2)}%` : '0.00%',
          'Estatus Oficial': grp.disponibleProyectado <= 0 ? 'DÉFICIT' : (grp.gastoTotal > grp.presupuestoVigente * 0.85 ? 'ALERTA' : 'DISPONIBLE')
        });

        // Filas detalladas por renglón
        grp.renglones.forEach(l => {
          wsData.push({
            'Grupo Presupuestario': grp.grupo,
            'Renglón': l.renglonPresupuestario,
            'Nombre del Renglón': l.nombreRenglon,
            'Presupuesto Inicial (Q)': l.presupuestoInicial,
            'Modificaciones (+/-) (Q)': l.modificacionesAprobadas,
            'Presupuesto Vigente (Q)': l.presupuestoVigente,
            'Pagado que Rebaja (Q)': l.pagadoQueRebaja,
            'Disponible Real (Q)': l.disponibleReal,
            'Comprometido Pendiente (Q)': l.comprometidoPendiente,
            'Disponible Proyectado (Q)': l.disponibleProyectado,
            '% Usado/Comprometido': `${l.porcentajeEjecucion}%`,
            'Estatus Oficial': l.estatusDisponibilidad
          });
        });
      });

      if ('vigente' in variantTotals) {
        wsData.push({
          'Grupo Presupuestario': 'TOTALES GENERALES',
          'Renglón': `(${dataGastoGrupoRenglon.length} Grupos)`,
          'Nombre del Renglón': 'SUMATORIA GLOBAL DE GASTO EJECUTADO',
          'Presupuesto Inicial (Q)': Math.round(variantTotals.inicial * 100) / 100,
          'Modificaciones (+/-) (Q)': Math.round(variantTotals.modificaciones * 100) / 100,
          'Presupuesto Vigente (Q)': Math.round(variantTotals.vigente * 100) / 100,
          'Pagado que Rebaja (Q)': Math.round(variantTotals.pagado * 100) / 100,
          'Disponible Real (Q)': Math.round(variantTotals.disponibleReal * 100) / 100,
          'Comprometido Pendiente (Q)': Math.round(variantTotals.comprometido * 100) / 100,
          'Disponible Proyectado (Q)': Math.round(variantTotals.disponibleProyectado * 100) / 100,
          '% Usado/Comprometido': variantTotals.vigente > 0 ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(2)}%` : '0.00%',
          'Estatus Oficial': 'CONSOLIDADO'
        });
      }
    } else if (activeVariant === 'matriz_consolidada' || activeVariant === 'alertas_deficit') {
      const source = activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas;
      filename = activeVariant === 'matriz_consolidada' 
        ? `Matriz_Disponibilidad_OJ_${now.toISOString().slice(0, 10)}.xlsx`
        : `Reporte_Alertas_Presupuestarias_OJ_${now.toISOString().slice(0, 10)}.xlsx`;

      wsData = source.map(l => ({
        'Grupo Presupuestario': l.grupoPresupuestario,
        'Renglón': l.renglonPresupuestario,
        'Nombre del Renglón': l.nombreRenglon,
        'Presupuesto Inicial (Q)': l.presupuestoInicial,
        'Modificaciones (+/-) (Q)': l.modificacionesAprobadas,
        'Presupuesto Vigente (Q)': l.presupuestoVigente,
        'Pagado que Rebaja (Q)': l.pagadoQueRebaja,
        'Disponible Real (Q)': l.disponibleReal,
        'Comprometido Pendiente (Q)': l.comprometidoPendiente,
        'Disponible Proyectado (Q)': l.disponibleProyectado,
        '% Usado/Comprometido': `${l.porcentajeUsadoComprometido}%`,
        'Estatus Oficial': l.estatusDisponibilidad
      }));

      if ('vigente' in variantTotals) {
        wsData.push({
          'Grupo Presupuestario': 'TOTALES CONSOLIDADOS',
          'Renglón': `(${source.length} Renglones)`,
          'Nombre del Renglón': 'SUMATORIA CONSOLIDADA OFICIAL',
          'Presupuesto Inicial (Q)': Math.round(variantTotals.inicial * 100) / 100,
          'Modificaciones (+/-) (Q)': Math.round(variantTotals.modificaciones * 100) / 100,
          'Presupuesto Vigente (Q)': Math.round(variantTotals.vigente * 100) / 100,
          'Pagado que Rebaja (Q)': Math.round(variantTotals.pagado * 100) / 100,
          'Disponible Real (Q)': Math.round(variantTotals.disponibleReal * 100) / 100,
          'Comprometido Pendiente (Q)': Math.round(variantTotals.comprometido * 100) / 100,
          'Disponible Proyectado (Q)': Math.round(variantTotals.disponibleProyectado * 100) / 100,
          '% Usado/Comprometido': variantTotals.vigente > 0 ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(2)}%` : '0.00%',
          'Estatus Oficial': 'CONSOLIDADO'
        });
      }
    } else {
      const source = activeVariant === 'compras_por_renglon' ? dataCompras :
                     activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado;
      filename = activeVariant === 'compras_por_renglon'
        ? `Ejecucion_Compras_F56_Renglon_${now.toISOString().slice(0, 10)}.xlsx`
        : activeVariant === 'comprometido_pendiente'
          ? `Adquisiciones_Comprometido_Pendiente_${now.toISOString().slice(0, 10)}.xlsx`
          : `Adquisiciones_Pagado_Devengado_${now.toISOString().slice(0, 10)}.xlsx`;

      wsData = source.map(p => ({
        'No. Solicitud F56': p.f56e || p.f56 || p.numeroSolicitud || 'S/N',
        'NOG Guatecompras': p.nog || p.nogGuatecompras || 'S/N',
        'Descripción': p.descripcion,
        'Renglón Asignado': p.renglonPresupuestario || '158',
        'Nombre Renglón': p.nombreRenglon || '',
        'Monto (Q)': p.monto,
        'Estado del Gasto': p.estadoPago === 'pagado' ? 'Pagado que Rebaja' : 'Comprometido Pendiente',
        'Estatus Evento': p.estatusEvento || 'Registrada',
        'Proveedor Adjudicado': p.proveedorAdjudicado || 'N/A',
        'Fecha Solicitud': p.fechaSolicitud || '',
        'Fecha Pago/Adjudicación': p.fechaPago || p.fechaAdjudicacion || 'N/A'
      }));
    }

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Oficial');
    XLSX.writeFile(wb, filename);
  };

  // EXPORTAR A PDF INSTITUCIONAL CON JSPDF Y AUTOTABLE
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });

    const titleMap: Record<BudgetReportVariant, string> = {
      matriz_consolidada: 'INFORME DE PRESUPUESTO ANALÍTICO DE RENGLONES Y DISPONIBILIDADES PRESUPUESTARIAS',
      compras_por_renglon: 'EJECUCIÓN DE ADQUISICIONES INSTITUCIONALES (FORMA F56-E Y NOG) POR RENGLÓN',
      comprometido_pendiente: 'RELACIÓN DE ADQUISICIONES EN COMPROMETIDO PENDIENTE DE PAGO',
      pagado_devengado: 'INFORME DE ADQUISICIONES PAGADAS / DEVENGADAS CON IMPACTO EN DISPONIBLE REAL',
      alertas_deficit: 'DICTAMEN DE RENGLONES EN ALERTA DE DISPONIBILIDAD Y DÉFICIT PROYECTADO',
      gasto_grupo_renglon: 'INFORME OFICIAL CONSOLIDADO POR GRUPO PRESUPUESTARIO (GRUPOS 100, 200 Y 300)'
    };

    // Encabezado Institucional con Logo Oficial del Organismo Judicial
    try {
      // Cintilla Azul Oscuro Institucional
      doc.setFillColor(15, 23, 42); // slate-900 institucional (#0f172a)
      doc.rect(14, 6, 251, 23, 'F');
      doc.setFillColor(30, 64, 175); // blue-800 (#1e40af) acento azul institucional
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
      doc.text('GERENCIA DE INFORMÁTICA Y TELECOMUNICACIONES • DEPARTAMENTO ADMINISTRATIVO FINANCIERO', 43, 17);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(titleMap[activeVariant], 43, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(226, 232, 240);
      doc.text(`Fecha Emisión: ${fechaEmision} | Ejercicio Fiscal: 2026`, 260, 12, { align: 'right' });
      doc.text(`Filtro: ${filterRenglon === 'todos' ? 'Todos los Renglones' : `Renglón ${filterRenglon}`}`, 260, 17, { align: 'right' });
    } catch (e) {
      console.warn('Error al incrustar logo en reporte presupuestario', e);
      doc.setFillColor(15, 23, 42);
      doc.rect(14, 6, 251, 23, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ORGANISMO JUDICIAL DE GUATEMALA', 14, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('GERENCIA DE INFORMÁTICA Y TELECOMUNICACIONES • DEPARTAMENTO ADMINISTRATIVO FINANCIERO', 14, 16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(titleMap[activeVariant], 14, 22);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Fecha y Hora de Emisión: ${fechaEmision} | Ejercicio Fiscal: 2026`, 14, 26);
      doc.text(`Filtro Aplicado: ${filterRenglon === 'todos' ? 'Todos los Renglones' : `Renglón ${filterRenglon}`}`, 14, 30);
    }

    let head: string[][] = [];
    let body: any[][] = [];
    let foot: any[][] | undefined;

    if (activeVariant === 'gasto_grupo_renglon') {
      head = [[
        'Grupo / Renglón',
        'Descripción Presupuestaria',
        'P. Vigente (Q)',
        'Gasto Pagado (Q)',
        'Comprometido (Q)',
        'Gasto Total (Q)',
        'Disponible (Q)',
        '% Ejec.',
        'Eventos'
      ]];

      dataGastoGrupoRenglon.forEach(grp => {
        body.push([
          `>> ${grp.grupo.replace('Grupo ', 'G-')}`,
          `SUBTOTAL ${grp.grupo.toUpperCase()}`,
          grp.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.pagadoQueRebaja.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.comprometidoPendiente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.gastoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          `${grp.presupuestoVigente > 0 ? ((grp.gastoTotal / grp.presupuestoVigente) * 100).toFixed(1) : 0}%`,
          `${grp.comprasCount} f56/nog`
        ]);

        grp.renglones.forEach(l => {
          body.push([
            `    R-${l.renglonPresupuestario}`,
            l.nombreRenglon.slice(0, 38),
            l.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            l.pagadoQueRebaja.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            l.comprometidoPendiente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            l.gastoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            l.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            `${l.porcentajeEjecucion}%`,
            `${l.comprasCount}`
          ]);
        });
      });

      if ('vigente' in variantTotals) {
        foot = [[
          'TOTAL CONSOLIDADO',
          `Suma de ${dataGastoGrupoRenglon.length} Grupos Presupuestarios`,
          variantTotals.vigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.comprometido.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          (variantTotals.pagado + variantTotals.comprometido).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.vigente > 0 ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1)}%` : '0%',
          'TOTAL'
        ]];
      }
    } else if (activeVariant === 'matriz_consolidada' || activeVariant === 'alertas_deficit') {
      const source = activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas;
      head = [[
        'Renglón',
        'Nombre del Renglón',
        'Grupo',
        'Inicial',
        'Modif. (+/-)',
        'Vigente',
        'Pagado Rebaja',
        'Disponible Real',
        'Comprometido',
        'Disponible Proy.',
        '% Usado',
        'Estatus'
      ]];

      body = source.map(l => [
        l.renglonPresupuestario,
        l.nombreRenglon.slice(0, 30),
        l.grupoPresupuestario.replace('Grupo ', 'G-'),
        l.presupuestoInicial.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        (l.modificacionesAprobadas >= 0 ? '+' : '') + l.modificacionesAprobadas.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.pagadoQueRebaja.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.comprometidoPendiente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        `${l.porcentajeUsadoComprometido}%`,
        l.estatusDisponibilidad === 'Con Disponibilidad' ? 'DISPONIBLE' : (l.disponibleProyectado <= 0 ? 'DÉFICIT' : 'ALERTA')
      ]);

      if ('vigente' in variantTotals) {
        foot = [[
          'TOTALES',
          `Consolidado (${source.length} Renglones)`,
          '-',
          variantTotals.inicial.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          (variantTotals.modificaciones >= 0 ? '+' : '') + variantTotals.modificaciones.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.vigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.comprometido.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.vigente > 0 ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1)}%` : '0%',
          'CONSOLIDADO'
        ]];
      }
    } else {
      const source = activeVariant === 'compras_por_renglon' ? dataCompras :
                     activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado;
      head = [[
        'No. Solicitud F56',
        'NOG Guatecompras',
        'Descripción de la Compra',
        'Renglón',
        'Monto (GTQ)',
        'Estado del Gasto',
        'Estatus Evento',
        'Proveedor Adjudicado'
      ]];

      body = source.map(p => [
        p.f56e || p.f56 || p.numeroSolicitud || 'S/N',
        p.nog || p.nogGuatecompras || 'S/N',
        p.descripcion.slice(0, 45),
        `[${p.renglonPresupuestario || '158'}]`,
        Number(p.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        p.estadoPago === 'pagado' ? 'Pagado que Rebaja' : 'Comprometido Pendiente',
        p.estatusEvento || 'Registrada',
        (p.proveedorAdjudicado || 'N/A').slice(0, 25)
      ]);

      if ('totalMonto' in variantTotals) {
        foot = [[
          'TOTALES',
          `${source.length} Compras`,
          '-',
          '-',
          variantTotals.totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          '-',
          '-',
          '-'
        ]];
      }
    }

    let startMainTableY = 33;

    // Resumen Ejecutivo de KPIs para el informe PDF según la variante seleccionada
    let kpiHead: string[][] = [];
    let kpiBody: string[][] = [];

    if (activeVariant === 'matriz_consolidada' && 'vigente' in variantTotals) {
      kpiHead = [['P. VIGENTE INSTITUCIONAL', 'PAGADO DEVENGADO (% EJEC)', 'COMPROMETIDO EN TRÁMITE', 'GASTO TOTAL ACUMULADO', 'DISPONIBLE PROYECTADO']];
      kpiBody = [[
        `Q ${variantTotals.vigente.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `Q ${variantTotals.pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${variantTotals.vigente > 0 ? ((variantTotals.pagado / variantTotals.vigente) * 100).toFixed(1) : 0}%)`,
        `Q ${variantTotals.comprometido.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${variantTotals.vigente > 0 ? ((variantTotals.comprometido / variantTotals.vigente) * 100).toFixed(1) : 0}%)`,
        `Q ${(variantTotals.pagado + variantTotals.comprometido).toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${variantTotals.vigente > 0 ? (((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1) : 0}%)`,
        `Q ${variantTotals.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
      ]];
    } else if (activeVariant === 'compras_por_renglon') {
      kpiHead = [['TOTAL ADJUDICADO (Q)', 'TOTAL DE COMPRAS', 'PAGADO QUE REBAJA (Q)', 'COMPROMETIDO EN TRÁMITE (Q)', 'RENGLONES AFECTADOS']];
      kpiBody = [[
        `Q ${comprasKPIs.totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `${comprasKPIs.totalCount} trámites F56`,
        `Q ${comprasKPIs.pagadasMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${comprasKPIs.pagadasCount})`,
        `Q ${comprasKPIs.comprometidasMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${comprasKPIs.comprometidasCount})`,
        `${comprasKPIs.renglonesAfectados} renglones`
      ]];
    } else if (activeVariant === 'comprometido_pendiente') {
      kpiHead = [['TOTAL COMPROMETIDO (Q)', 'COMPRAS EN TRÁMITE', 'PROMEDIO POR COMPRA', 'MAYOR SOLICITUD EN CURSO', 'RENGLONES EN PROCESO']];
      kpiBody = [[
        `Q ${comprometidoKPIs.totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `${comprometidoKPIs.totalCount} trámites`,
        `Q ${comprometidoKPIs.promedio.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `Q ${comprometidoKPIs.mayorMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `${comprometidoKPIs.renglonesAfectados} renglones`
      ]];
    } else if (activeVariant === 'pagado_devengado') {
      kpiHead = [['TOTAL PAGADO DEVENGADO (Q)', 'COMPRAS PAGADAS', 'MAYOR DESEMBOLSO', 'PROMEDIO POR PAGO', 'RENGLONES EJECUTADOS']];
      kpiBody = [[
        `Q ${pagadoKPIs.totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `${pagadoKPIs.totalCount} facturas/pagos`,
        `Q ${pagadoKPIs.mayorPago.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `Q ${pagadoKPIs.promedio.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `${pagadoKPIs.renglonesAfectados} renglones`
      ]];
    } else if (activeVariant === 'alertas_deficit' && 'vigente' in variantTotals) {
      kpiHead = [['TOTAL PARTIDAS EN ALERTA', 'EN DÉFICIT CRÍTICO (≤ Q0)', 'EN ALERTA PREVENTIVA (≤ 15%)', 'DÉFICIT TOTAL ACUMULADO (Q)', 'TECHO VIGENTE EN RIESGO (Q)']];
      kpiBody = [[
        `${alertasKPIs.totalAlertas} partidas`,
        `${alertasKPIs.deficitCount} renglones`,
        `${alertasKPIs.preventivaCount} renglones`,
        `Q ${alertasKPIs.deficitMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `Q ${alertasKPIs.techoAfectado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
      ]];
    } else if (activeVariant === 'gasto_grupo_renglon' && 'vigente' in variantTotals) {
      kpiHead = [['P. VIGENTE TOTAL (Q)', 'GASTO TOTAL REAL (Q)', 'SALDO DISPONIBLE TOTAL (Q)', '% EJECUCIÓN GLOBAL', 'GRUPOS ANALIZADOS']];
      kpiBody = [[
        `Q ${gastoGrupoKPIs.totalVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `Q ${gastoGrupoKPIs.totalGasto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `Q ${gastoGrupoKPIs.totalDisponible.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
        `${gastoGrupoKPIs.ejecucionPct.toFixed(1)}%`,
        `${dataGastoGrupoRenglon.length} grupos presupuestarios`
      ]];
    }

    if (kpiHead.length > 0) {
      autoTable(doc, {
        startY: 32,
        head: kpiHead,
        body: kpiBody,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42], // Azul oscuro institucional
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42]
        },
        margin: { left: 14, right: 14 }
      });

      startMainTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 3.5 : 44;
    }

    autoTable(doc, {
      startY: startMainTableY,
      head,
      body,
      foot,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42], // Azul oscuro institucional
        textColor: [255, 255, 255],
        fontSize: activeVariant === 'matriz_consolidada' ? 6.8 : 7.5,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: activeVariant === 'matriz_consolidada' ? 6.5 : 7,
        cellPadding: 1.2
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // Firmas Institucionales de Responsabilidad
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`Página ${i} de ${pageCount} • Sistema Integrado de Control de Adquisiciones y Presupuesto GIT - Organismo Judicial`, 14, 205);

      if (i === pageCount) {
        doc.line(20, 185, 80, 185);
        doc.text('Elaborado: Analista Financiero GIT', 20, 189);

        doc.line(110, 185, 170, 185);
        doc.text('Revisado: Encargado de Compras IT', 110, 189);

        doc.line(200, 185, 260, 185);
        doc.text('Autorizado: Gerente de Informática', 200, 189);
      }
    }

    doc.save(`Reporte_Presupuesto_OJ_${activeVariant}_${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4" id="budget-reports-module">
      
      {/* Selector de Variantes de Reporte */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              Módulo de Reportes Financieros y Variantes de Auditoría Presupuestaria
            </h3>
            <p className="text-xs text-slate-500">
              Genere informes normativos, matrices cruzadas y análisis de saldos descargables en Excel y PDF con firmas institucionales.
            </p>
          </div>

          {/* Acciones Globales de Exportación */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Descargar datos actuales en Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Generar dictamen oficial en PDF con membrete y firmas"
            >
              <FileText className="w-3.5 h-3.5 text-blue-200" />
              <span>Generar PDF</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Imprimir vista actual"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Botones de Variantes */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveVariant('matriz_consolidada')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'matriz_consolidada'
                ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-blue-700 uppercase font-mono font-black">Variante 1</span>
            <span>Presupuesto Analítico</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Renglones y disponibilidades</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('gasto_grupo_renglon')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'gasto_grupo_renglon'
                ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-purple-700 uppercase font-mono font-black">Variante 2</span>
            <span>Reporte por Grupo</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Grupos 100, 200 y 300</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('compras_por_renglon')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'compras_por_renglon'
                ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-blue-700 uppercase font-mono font-black">Variante 3</span>
            <span>Compras F56 por Renglón</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Cruce F56 + NOG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('comprometido_pendiente')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'comprometido_pendiente'
                ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-amber-700 uppercase font-mono font-black">Variante 4</span>
            <span>Comprometido en Trámite</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Afecta Proyectado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('pagado_devengado')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'pagado_devengado'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-emerald-700 uppercase font-mono font-black">Variante 5</span>
            <span>Pagado / Devengado</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Rebaja Saldo Real</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('alertas_deficit')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'alertas_deficit'
                ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-rose-700 uppercase font-mono font-black">Variante 6</span>
            <span>Alertas y Déficit</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Sobregiro proyectado</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por renglón, F56, NOG o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={filterRenglon}
            onChange={(e) => setFilterRenglon(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="todos">Todos los Renglones</option>
            {availableRenglones.map(r => (
              <option key={r.codigo} value={r.codigo}>
                Renglón {r.codigo} - {r.nombre.slice(0, 30)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PANEL ANALÍTICO Y KPI PARA MATRIZ CONSOLIDADA (Reporte_Presupuesto_OJ_matriz_consolidada) */}
      {activeVariant === 'matriz_consolidada' && 'vigente' in variantTotals && (
        <div className="space-y-4 animate-in fade-in" id="analitico-kpi-matriz-consolidada">
          
          {/* Cintilla del Encabezado en Azul Oscuro */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-800/40 text-blue-200 border border-blue-700/50">
                  <Sparkles className="w-5 h-5 text-blue-300" />
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Panel Analítico y KPI — Reporte de Matriz Consolidada OJ
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-800/60 text-blue-100 border border-blue-600/50">
                  12 Columnas Oficiales
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl">
                Monitoreo consolidado del techo vigente, ejecución devengada que rebaja saldo real, adquisiciones comprometidas en trámite y saldo financiero disponible proyectado.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold self-start sm:self-auto text-white">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span>Ejercicio Fiscal 2026</span>
            </div>
          </div>

          {/* Tarjetas KPI de Ejecución de la Matriz Consolidada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* KPI 1: Techo Vigente */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Presupuesto Vigente</span>
                <span className="p-1 rounded-md bg-sky-50 text-sky-600">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black font-mono text-slate-900">
                {formatQuetzales(variantTotals.vigente)}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Inicial: {formatQuetzales(variantTotals.inicial)}</span>
                <span className={variantTotals.modificaciones >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                  {variantTotals.modificaciones >= 0 ? '+' : ''}{formatQuetzales(variantTotals.modificaciones)}
                </span>
              </div>
            </div>

            {/* KPI 2: Pagado Devengado */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Pagado Devengado</span>
                <span className="p-1 rounded-md bg-blue-50 text-blue-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black font-mono text-blue-900">
                {formatQuetzales(variantTotals.pagado)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                <span>Rebaja Saldo Real</span>
                <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-blue-100 text-blue-800">
                  {variantTotals.vigente > 0 ? ((variantTotals.pagado / variantTotals.vigente) * 100).toFixed(1) : 0}% Ejec.
                </span>
              </div>
            </div>

            {/* KPI 3: Comprometido Pendiente */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Comprometido Trámite</span>
                <span className="p-1 rounded-md bg-amber-50 text-amber-600">
                  <Clock className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black font-mono text-amber-900">
                {formatQuetzales(variantTotals.comprometido)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                <span>Afecta Proyectado</span>
                <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-amber-100 text-amber-800">
                  {variantTotals.vigente > 0 ? ((variantTotals.comprometido / variantTotals.vigente) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* KPI 4: Total Gasto */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Total Afectación</span>
                <span className="p-1 rounded-md bg-purple-50 text-purple-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black font-mono text-purple-950">
                {formatQuetzales(variantTotals.totalGasto)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                <span>Comprometido + Pagado</span>
                <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-purple-100 text-purple-800">
                  {variantTotals.vigente > 0 ? (((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* KPI 5: Disponible Proyectado */}
            <div className={`p-4 rounded-xl border shadow-2xs space-y-1 ${
              variantTotals.disponibleProyectado >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
            }`}>
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span className={variantTotals.disponibleProyectado >= 0 ? 'text-emerald-900' : 'text-rose-900'}>Disponible Proyectado</span>
                <span className={`p-1 rounded-md ${variantTotals.disponibleProyectado >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className={`text-xl font-black font-mono ${variantTotals.disponibleProyectado >= 0 ? 'text-emerald-950' : 'text-rose-950'}`}>
                {formatQuetzales(variantTotals.disponibleProyectado)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-slate-200/60">
                <span>Saldo Real: {formatQuetzales(variantTotals.disponibleReal)}</span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                  variantTotals.disponibleProyectado >= 0 ? 'bg-emerald-200/80 text-emerald-900' : 'bg-rose-200/80 text-rose-900'
                }`}>
                  {variantTotals.disponibleProyectado >= 0 ? 'Superávit' : 'Déficit'}
                </span>
              </div>
            </div>
          </div>

          {/* Gráficas de Círculo para la Matriz Consolidada */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Gráfica 1: Distribución del Techo Presupuestario */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                  Distribución del Techo Vigente
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                  {formatQuetzales(variantTotals.vigente)}
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                {matrizTechoChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={matrizTechoChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {matrizTechoChartData.map((entry, index) => (
                          <Cell key={`techo-cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto']}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-400">Sin datos vigentes</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                {matrizTechoChartData.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 truncate max-w-[80px]" title={d.name}>{d.name}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {variantTotals.vigente > 0 ? ((d.value / variantTotals.vigente) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfica 2: Asignación por Grupo */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-purple-600" />
                  Presupuesto por Grupos (100, 200, 300)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                  3 Grupos
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                {matrizGruposChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={matrizGruposChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {matrizGruposChartData.map((entry, index) => (
                          <Cell key={`grp-cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any) => [formatQuetzales(Number(val)), 'Techo Vigente']}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-400">Sin datos de grupos</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                {matrizGruposChartData.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 truncate max-w-[80px]" title={d.name}>{d.name}</span>
                    <span className="font-mono font-bold text-slate-900">{formatQuetzales(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfica 3: Semáforo de Salud de Partidas */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Salud y Disponibilidad de Partidas
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                  {matrizHealthStats.total} Renglones
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                {matrizSaludChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={matrizSaludChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {matrizSaludChartData.map((entry, index) => (
                          <Cell key={`salud-cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} Renglones`, 'Partidas']}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-400">Sin datos</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                {matrizSaludChartData.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 truncate max-w-[80px]" title={d.name}>{d.name}</span>
                    <span className="font-mono font-bold text-slate-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desglose Analítico por Grupos Presupuestarios (100, 200, 300) y Semáforo de Renglones */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5">
            {matrizGroupStats.map((grp) => (
              <div key={grp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="text-xs font-bold text-slate-900 truncate" title={grp.name}>
                      {grp.short}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {grp.count} Renglones
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Vigente:</span>
                    <span className="font-mono font-bold text-slate-900">{formatQuetzales(grp.vigente)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Gasto Total:</span>
                    <span className="font-mono font-semibold text-purple-950">{formatQuetzales(grp.totalGasto)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Disponible:</span>
                    <span className={`font-mono font-bold ${grp.disponible >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatQuetzales(grp.disponible)}
                    </span>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Ejecución Presupuestaria</span>
                    <span className="font-mono text-blue-700">{grp.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        grp.pct > 85 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, grp.pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Semáforo de Renglones */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Salud de Partidas ({matrizHealthStats.total})
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estatus</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-900 font-medium text-[11px]">Con Disponibilidad (&gt;15%)</span>
                  <span className="font-mono font-black text-emerald-950 px-1.5 rounded bg-emerald-100">
                    {matrizHealthStats.saludable}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-amber-900 font-medium text-[11px]">Alerta Preventiva (≤15%)</span>
                  <span className="font-mono font-black text-amber-950 px-1.5 rounded bg-amber-100">
                    {matrizHealthStats.alerta}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-rose-50 border border-rose-200">
                  <span className="text-rose-900 font-medium text-[11px]">En Déficit / Sin Saldo</span>
                  <span className="font-mono font-black text-rose-950 px-1.5 rounded bg-rose-100">
                    {matrizHealthStats.deficit}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* PANEL ANALÍTICO Y KPI: VARIANTE 2 - COMPRAS VINCULADAS POR RENGLÓN */}
      {activeVariant === 'compras_por_renglon' && (
        <div className="space-y-4 animate-in fade-in" id="analitico-kpi-compras-renglon">
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-800/40 text-blue-200 border border-blue-700/50">
                  <ShoppingBag className="w-5 h-5 text-blue-300" />
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Panel Analítico y KPI — Compras Vinculadas por Renglón Presupuestario
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-800/60 text-blue-100 border border-blue-600/50">
                  Cruce F56-e y NOG
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl">
                Monitoreo detallado de procesos de compra institucionales asociados directamente a partidas presupuestarias, discriminando entre compromisos y pagos definitivos.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold self-start sm:self-auto text-white">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span>{comprasKPIs.totalCount} Procesos F56-e</span>
            </div>
          </div>

          {/* Tarjetas KPI de Compras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monto Total Adjudicado</div>
              <div className="text-xl font-black font-mono text-slate-950">{formatQuetzales(comprasKPIs.totalMonto)}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">{comprasKPIs.totalCount} solicitudes registradas</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Pagado que Rebaja</div>
              <div className="text-xl font-black font-mono text-blue-900">{formatQuetzales(comprasKPIs.pagadasMonto)}</div>
              <div className="text-[10px] text-blue-700 pt-1 border-t border-blue-100 font-semibold">{comprasKPIs.pagadasCount} compras pagadas ({comprasKPIs.totalMonto > 0 ? ((comprasKPIs.pagadasMonto / comprasKPIs.totalMonto) * 100).toFixed(1) : 0}%)</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Comprometido en Trámite</div>
              <div className="text-xl font-black font-mono text-amber-900">{formatQuetzales(comprasKPIs.comprometidasMonto)}</div>
              <div className="text-[10px] text-amber-700 pt-1 border-t border-amber-100 font-semibold">{comprasKPIs.comprometidasCount} en proceso ({comprasKPIs.totalMonto > 0 ? ((comprasKPIs.comprometidasMonto / comprasKPIs.totalMonto) * 100).toFixed(1) : 0}%)</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Renglones Vinculados</div>
              <div className="text-xl font-black font-mono text-slate-900">{comprasKPIs.renglonesAfectados}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">Partidas con asignación</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Promedio por Solicitud</div>
              <div className="text-xl font-black font-mono text-purple-950">
                {formatQuetzales(comprasKPIs.totalCount > 0 ? comprasKPIs.totalMonto / comprasKPIs.totalCount : 0)}
              </div>
              <div className="text-[10px] text-purple-700 pt-1 border-t border-purple-100 font-semibold">Costo medio por trámite</div>
            </div>
          </div>

          {/* Gráficas de Círculo para Compras */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                  Estado del Gasto de Compras
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                {comprasEstadoChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={comprasEstadoChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                        {comprasEstadoChartData.map((entry, index) => (
                          <Cell key={`comp-est-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin datos de compras</span>}
              </div>
              <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                {comprasEstadoChartData.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 truncate max-w-[100px]">{d.name}</span>
                    <span className="font-mono font-bold text-slate-900">{formatQuetzales(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-purple-600" />
                  Top Renglones por Monto
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                {comprasTopRenglonesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={comprasTopRenglonesChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                        {comprasTopRenglonesChartData.map((entry, index) => (
                          <Cell key={`comp-top-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin compras asignadas</span>}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                {comprasTopRenglonesChartData.slice(0, 4).map((d, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Modalidades de Compra
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                {comprasModalidadChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={comprasModalidadChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                        {comprasModalidadChartData.map((entry, index) => (
                          <Cell key={`comp-mod-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [`${val} Compras`, 'Cantidad']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin datos</span>}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                {comprasModalidadChartData.slice(0, 3).map((d, idx) => (
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

      {/* PANEL ANALÍTICO Y KPI: VARIANTE 3 - COMPROMETIDO EN TRÁMITE */}
      {activeVariant === 'comprometido_pendiente' && (
        <div className="space-y-4 animate-in fade-in" id="analitico-kpi-comprometido">
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-800/40 text-amber-200 border border-amber-700/50">
                  <Clock className="w-5 h-5 text-amber-300" />
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Panel Analítico y KPI — Adquisiciones Comprometidas en Trámite
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-800/60 text-amber-100 border border-amber-600/50">
                  Afecta Saldo Proyectado
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl">
                Auditoría preventiva de montos reservados temporalmente que reducen el disponible proyectado previo al desembolso definitivo.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold self-start sm:self-auto text-white">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>{comprometidoKPIs.totalCount} Compras en Trámite</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Total Comprometido</div>
              <div className="text-xl font-black font-mono text-amber-950">{formatQuetzales(comprometidoKPIs.totalMonto)}</div>
              <div className="text-[10px] text-amber-700 pt-1 border-t border-amber-100 font-semibold">{comprometidoKPIs.totalCount} trámites en curso</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Promedio por Solicitud</div>
              <div className="text-xl font-black font-mono text-slate-900">{formatQuetzales(comprometidoKPIs.promedio)}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">Reserva promedio</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mayor Compromiso Individual</div>
              <div className="text-xl font-black font-mono text-purple-950">{formatQuetzales(comprometidoKPIs.mayorMonto)}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">Trámite más cuantioso</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Renglones Afectados</div>
              <div className="text-xl font-black font-mono text-blue-900">{comprometidoKPIs.renglonesAfectados}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">Partidas con reserva activa</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-amber-600" />
                  Compromisos por Grupo Presupuestario
                </span>
              </div>
              <div className="h-40 relative flex items-center justify-center">
                {comprometidoGrupoChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={comprometidoGrupoChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                        {comprometidoGrupoChartData.map((entry, index) => (
                          <Cell key={`comp-grp-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [formatQuetzales(Number(val)), 'Comprometido']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin compromisos pendientes</span>}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                {comprometidoGrupoChartData.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 truncate max-w-[90px]">{d.name}</span>
                    <span className="font-mono font-bold text-slate-900">{formatQuetzales(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-orange-600" />
                  Top Renglones con Mayor Compromiso
                </span>
              </div>
              <div className="h-40 relative flex items-center justify-center">
                {comprometidoTopRenglonesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={comprometidoTopRenglonesChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                        {comprometidoTopRenglonesChartData.map((entry, index) => (
                          <Cell key={`comp-topr-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [formatQuetzales(Number(val)), 'Comprometido']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin compromisos</span>}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                {comprometidoTopRenglonesChartData.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 font-mono font-semibold">{d.name}: {formatQuetzales(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL ANALÍTICO Y KPI: VARIANTE 4 - PAGADO / DEVENGADO */}
      {activeVariant === 'pagado_devengado' && (
        <div className="space-y-4 animate-in fade-in" id="analitico-kpi-pagado">
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-800/40 text-emerald-200 border border-emerald-700/50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Panel Analítico y KPI — Gasto Pagado y Devengado
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-800/60 text-emerald-100 border border-emerald-600/50">
                  Rebaja Saldo Real
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl">
                Auditoría financiera de pagos liquidados que impactan y disminuyen de manera irreversible el saldo real disponible institucional.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold self-start sm:self-auto text-white">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span>{pagadoKPIs.totalCount} Pagos Realizados</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Pagado Devengado</div>
              <div className="text-xl font-black font-mono text-emerald-950">{formatQuetzales(pagadoKPIs.totalMonto)}</div>
              <div className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-100 font-semibold">{pagadoKPIs.totalCount} facturas canceladas</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Promedio de Pago</div>
              <div className="text-xl font-black font-mono text-slate-900">{formatQuetzales(pagadoKPIs.promedio)}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">Desembolso promedio</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mayor Pago Registrado</div>
              <div className="text-xl font-black font-mono text-blue-950">{formatQuetzales(pagadoKPIs.mayorPago)}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">Mayor erogación</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Renglones Ejecutados</div>
              <div className="text-xl font-black font-mono text-slate-900">{pagadoKPIs.renglonesAfectados}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">Partidas con pago firme</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                  Pagos por Grupo Presupuestario
                </span>
              </div>
              <div className="h-40 relative flex items-center justify-center">
                {pagadoGrupoChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={pagadoGrupoChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                        {pagadoGrupoChartData.map((entry, index) => (
                          <Cell key={`pag-grp-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [formatQuetzales(Number(val)), 'Pagado Devengado']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin pagos registrados</span>}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                {pagadoGrupoChartData.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 truncate max-w-[90px]">{d.name}</span>
                    <span className="font-mono font-bold text-slate-900">{formatQuetzales(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Top Renglones con Mayor Desembolso
                </span>
              </div>
              <div className="h-40 relative flex items-center justify-center">
                {pagadoTopRenglonesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={pagadoTopRenglonesChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                        {pagadoTopRenglonesChartData.map((entry, index) => (
                          <Cell key={`pag-topr-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [formatQuetzales(Number(val)), 'Pagado Devengado']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin pagos</span>}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                {pagadoTopRenglonesChartData.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 font-mono font-semibold">{d.name}: {formatQuetzales(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL ANALÍTICO Y KPI: VARIANTE 5 - ALERTAS Y DÉFICIT */}
      {activeVariant === 'alertas_deficit' && (
        <div className="space-y-4 animate-in fade-in" id="analitico-kpi-alertas">
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-800/40 text-rose-200 border border-rose-700/50">
                  <AlertTriangle className="w-5 h-5 text-rose-300" />
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Panel Analítico y KPI — Alertas Presupuestarias y Déficit
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-800/60 text-rose-100 border border-rose-600/50">
                  Sobregiro Proyectado
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl">
                Detección oportuna de renglones en saldo rojo o con disponibilidad preventiva inferior al 15% que requieren modificaciones presupuestarias.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold self-start sm:self-auto text-white">
              <Calendar className="w-3.5 h-3.5 text-rose-300" />
              <span>{alertasKPIs.totalAlertas} Renglones en Alerta</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Partidas en Déficit Crítico</div>
              <div className="text-xl font-black font-mono text-rose-950">{alertasKPIs.deficitCount} renglones</div>
              <div className="text-[10px] text-rose-700 pt-1 border-t border-rose-100 font-semibold">Saldo disponible proyectado ≤ Q 0</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Alerta Preventiva (≤ 15%)</div>
              <div className="text-xl font-black font-mono text-amber-950">{alertasKPIs.preventivaCount} renglones</div>
              <div className="text-[10px] text-amber-700 pt-1 border-t border-amber-100 font-semibold">Riesgo inminente de agotamiento</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-300 bg-rose-50/40 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-900">Monto Déficit Total</div>
              <div className="text-xl font-black font-mono text-rose-950">{formatQuetzales(alertasKPIs.deficitMonto)}</div>
              <div className="text-[10px] text-rose-700 pt-1 border-t border-rose-200 font-semibold">Brecha presupuestaria acumulada</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Techo Total en Riesgo</div>
              <div className="text-xl font-black font-mono text-slate-900">{formatQuetzales(alertasKPIs.techoAfectado)}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">Presupuesto de partidas en alerta</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-rose-600" />
                  Severidad de la Disponibilidad
                </span>
              </div>
              <div className="h-40 relative flex items-center justify-center">
                {alertasSeveridadChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={alertasSeveridadChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                        {alertasSeveridadChartData.map((entry, index) => (
                          <Cell key={`alt-sev-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [`${val} Partidas`, 'Cantidad']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin datos</span>}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                {alertasSeveridadChartData.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 truncate max-w-[90px]">{d.name}</span>
                    <span className="font-mono font-bold text-slate-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-amber-600" />
                  Alertas por Grupo Presupuestario
                </span>
              </div>
              <div className="h-40 relative flex items-center justify-center">
                {alertasGrupoChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={alertasGrupoChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                        {alertasGrupoChartData.map((entry, index) => (
                          <Cell key={`alt-grp-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [`${val} Renglones en Alerta`, 'Alertas']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin alertas por grupo</span>}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                {alertasGrupoChartData.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 truncate max-w-[90px]">{d.name}</span>
                    <span className="font-mono font-bold text-slate-900">{d.value} alertas</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL ANALÍTICO Y KPI: VARIANTE 6 - GASTO POR GRUPO Y RENGLÓN */}
      {activeVariant === 'gasto_grupo_renglon' && (
        <div className="space-y-4 animate-in fade-in" id="analitico-kpi-gasto-grupo">
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-800/40 text-blue-200 border border-blue-700/50">
                  <Layers className="w-5 h-5 text-blue-300" />
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Panel Analítico y KPI — Gasto Consolidado por Grupo y Renglón
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-800/60 text-blue-100 border border-blue-600/50">
                  Estructura Jerárquica
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl">
                Consolidación presupuestaria por objeto del gasto (Grupos 100, 200 y 300) con desglose de renglones y ratios de ejecución global.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold self-start sm:self-auto text-white">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span>{dataGastoGrupoRenglon.length} Grupos Institucionales</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">P. Vigente Consolidado</div>
              <div className="text-xl font-black font-mono text-slate-950">{formatQuetzales(gastoGrupoKPIs.totalVigente)}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">Suma total de techos</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Gasto Total Real</div>
              <div className="text-xl font-black font-mono text-purple-950">{formatQuetzales(gastoGrupoKPIs.totalGasto)}</div>
              <div className="text-[10px] text-purple-700 pt-1 border-t border-purple-100 font-semibold">{gastoGrupoKPIs.ejecucionPct.toFixed(1)}% ejecutado global</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Saldo Disponible Consolidado</div>
              <div className="text-xl font-black font-mono text-emerald-950">{formatQuetzales(gastoGrupoKPIs.totalDisponible)}</div>
              <div className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-100 font-semibold">Remanente presupuestario</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Grupos Analizados</div>
              <div className="text-xl font-black font-mono text-blue-900">{dataGastoGrupoRenglon.length} Grupos</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">100 Servicios, 200 Mat., 300 Activos</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                  Presupuesto Vigente por Grupo
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                {gastoGrupoVigenteChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={gastoGrupoVigenteChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                        {gastoGrupoVigenteChartData.map((entry, index) => (
                          <Cell key={`gg-vig-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [formatQuetzales(Number(val)), 'Vigente']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin datos</span>}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                {gastoGrupoVigenteChartData.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-purple-600" />
                  Gasto Real por Grupo
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                {gastoGrupoRealChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={gastoGrupoRealChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                        {gastoGrupoRealChartData.map((entry, index) => (
                          <Cell key={`gg-real-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [formatQuetzales(Number(val)), 'Gasto Total']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin gasto</span>}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                {gastoGrupoRealChartData.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Saldo Disponible por Grupo
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                {gastoGrupoDisponibleChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={gastoGrupoDisponibleChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                        {gastoGrupoDisponibleChartData.map((entry, index) => (
                          <Cell key={`gg-disp-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [formatQuetzales(Number(val)), 'Disponible']} contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#0f172a', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400">Sin saldo disponible</span>}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                {gastoGrupoDisponibleChartData.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Datos de la Variante */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeVariant === 'gasto_grupo_renglon' ? (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Grupo / Renglón</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Descripción Presupuestaria</th>
                  <th className="px-3 py-2.5 text-right">P. Vigente (Q)</th>
                  <th className="px-3 py-2.5 text-right">Pagado Dev. (Q)</th>
                  <th className="px-3 py-2.5 text-right">Comprometido (Q)</th>
                  <th className="px-3 py-2.5 text-right">Total Gasto (Q)</th>
                  <th className="px-3 py-2.5 text-right">Disponible (Q)</th>
                  <th className="px-3 py-2.5 text-center">% Ejecución</th>
                  <th className="px-3 py-2.5 text-center">Compras</th>
                  <th className="px-3 py-2.5 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataGastoGrupoRenglon.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      No se encontraron registros de gasto para los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  dataGastoGrupoRenglon.map((grp) => {
                    const ejecucionGrupo = grp.presupuestoVigente > 0 
                      ? Math.min(100, Math.round((grp.gastoTotal / grp.presupuestoVigente) * 1000) / 10) 
                      : 0;

                    return (
                      <React.Fragment key={grp.grupo}>
                        {/* Fila Encabezado de Grupo */}
                        <tr className="bg-slate-100/95 font-bold border-t-2 border-slate-300 text-slate-900">
                          <td className="px-3 py-2.5 font-mono text-blue-950 uppercase text-[11px]">
                            {grp.grupo}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">
                            Subtotal Grupo ({grp.renglones.length} renglones)
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatQuetzales(grp.presupuestoVigente)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-blue-900">
                            {formatQuetzales(grp.pagadoQueRebaja)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-900">
                            {formatQuetzales(grp.comprometidoPendiente)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-black text-purple-950 bg-purple-50/50">
                            {formatQuetzales(grp.gastoTotal)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono font-bold ${
                            grp.disponibleProyectado <= 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {formatQuetzales(grp.disponibleProyectado)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-12 bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${ejecucionGrupo > 85 ? 'bg-amber-500' : 'bg-blue-600'}`} 
                                  style={{ width: `${ejecucionGrupo}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] font-bold">{ejecucionGrupo}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                            {grp.comprasCount}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              grp.disponibleProyectado <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {grp.disponibleProyectado <= 0 ? 'Déficit' : 'En Rango'}
                            </span>
                          </td>
                        </tr>

                        {/* Filas de Renglones del Grupo */}
                        {grp.renglones.map((line) => (
                          <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-1.5 pl-6 font-mono font-bold text-blue-900 whitespace-nowrap">
                              R-{line.renglonPresupuestario}
                            </td>
                            <td className="px-3 py-1.5 font-medium text-slate-800 max-w-xs truncate" title={line.nombreRenglon}>
                              {line.nombreRenglon}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                              {formatQuetzales(line.presupuestoVigente)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-blue-800">
                              {formatQuetzales(line.pagadoQueRebaja)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-amber-800">
                              {formatQuetzales(line.comprometidoPendiente)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                              {formatQuetzales(line.gastoTotal)}
                            </td>
                            <td className={`px-3 py-1.5 text-right font-mono font-semibold ${
                              line.disponibleProyectado <= 0 ? 'text-rose-600' : 'text-slate-900'
                            }`}>
                              {formatQuetzales(line.disponibleProyectado)}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                line.porcentajeEjecucion > 85 ? 'bg-amber-100 text-amber-800' : 'text-slate-700'
                              }`}>
                                {line.porcentajeEjecucion}%
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono text-slate-600">
                              {line.comprasCount}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                line.estatusDisponibilidad === 'Con Disponibilidad'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}>
                                {line.estatusDisponibilidad}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-900 font-black text-white text-xs">
                <tr>
                  <td colSpan={2} className="px-3 py-3 text-right uppercase tracking-wider">
                    Total Consolidado ({dataGastoGrupoRenglon.length} Grupos Presupuestarios):
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    {formatQuetzales('vigente' in variantTotals ? variantTotals.vigente : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-blue-300">
                    {formatQuetzales('pagado' in variantTotals ? variantTotals.pagado : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-amber-300">
                    {formatQuetzales('comprometido' in variantTotals ? variantTotals.comprometido : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-emerald-300">
                    {formatQuetzales('totalGasto' in variantTotals ? variantTotals.totalGasto : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    {formatQuetzales('disponibleProyectado' in variantTotals ? variantTotals.disponibleProyectado : 0)}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-amber-300">
                    {'vigente' in variantTotals && variantTotals.vigente > 0 
                      ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1)}%` 
                      : '0%'}
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-center text-slate-400 font-medium text-[10px]">
                    Presupuesto 2026
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : activeVariant === 'matriz_consolidada' || activeVariant === 'alertas_deficit' ? (
            <table className="w-full text-xs text-left border-collapse">
              <thead className={
                activeVariant === 'matriz_consolidada'
                  ? 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-b-2 border-blue-800 text-[10px] font-black uppercase tracking-wider shadow-xs'
                  : 'bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider'
              }>
                <tr>
                  <th className="px-3 py-2.5">Renglón</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Nombre del Renglón</th>
                  <th className="px-3 py-2.5">Grupo</th>
                  <th className="px-3 py-2.5 text-right">Inicial</th>
                  <th className="px-3 py-2.5 text-right">Modificaciones</th>
                  <th className="px-3 py-2.5 text-right">Vigente</th>
                  <th className="px-3 py-2.5 text-right">Pagado Rebaja</th>
                  <th className="px-3 py-2.5 text-right">Disponible Real</th>
                  <th className="px-3 py-2.5 text-right">Comprometido</th>
                  <th className="px-3 py-2.5 text-right">Disponible Proy.</th>
                  <th className="px-3 py-2.5 text-center">% Usado</th>
                  <th className="px-3 py-2.5 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas).length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                      No se encontraron renglones con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  (activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas).map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-blue-900 whitespace-nowrap">
                        {line.renglonPresupuestario}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900 max-w-xs truncate" title={line.nombreRenglon}>
                        {line.nombreRenglon}
                      </td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                        {line.grupoPresupuestario.replace('Grupo ', 'G-')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">
                        {formatQuetzales(line.presupuestoInicial)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                        {line.modificacionesAprobadas >= 0 ? '+' : ''}{formatQuetzales(line.modificacionesAprobadas)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-blue-950 bg-blue-50/30">
                        {formatQuetzales(line.presupuestoVigente)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-blue-800">
                        {formatQuetzales(line.pagadoQueRebaja)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/20">
                        {formatQuetzales(line.disponibleReal)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-amber-700">
                        {formatQuetzales(line.comprometidoPendiente)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900 bg-amber-50/30">
                        <span className={line.disponibleProyectado >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {formatQuetzales(line.disponibleProyectado)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                        {line.porcentajeUsadoComprometido}%
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          line.disponibleProyectado <= 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : line.disponibleProyectado < (line.presupuestoVigente * 0.15)
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {line.estatusDisponibilidad}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-right uppercase font-black text-slate-900 tracking-wider">
                    Totales Consolidados ({(activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas).length} Renglones):
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap">
                    {formatQuetzales('inicial' in variantTotals ? variantTotals.inicial : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap text-slate-800">
                    {'modificaciones' in variantTotals && variantTotals.modificaciones >= 0 ? '+' : ''}
                    {formatQuetzales('modificaciones' in variantTotals ? variantTotals.modificaciones : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-blue-950 bg-blue-100/60 whitespace-nowrap">
                    {formatQuetzales('vigente' in variantTotals ? variantTotals.vigente : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-blue-800 whitespace-nowrap">
                    {formatQuetzales('pagado' in variantTotals ? variantTotals.pagado : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-emerald-900 bg-emerald-100/40 whitespace-nowrap">
                    {formatQuetzales('disponibleReal' in variantTotals ? variantTotals.disponibleReal : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                    {formatQuetzales('comprometido' in variantTotals ? variantTotals.comprometido : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black bg-amber-100/60 whitespace-nowrap">
                    <span className={'disponibleProyectado' in variantTotals && variantTotals.disponibleProyectado >= 0 ? 'text-emerald-800' : 'text-rose-700'}>
                      {formatQuetzales('disponibleProyectado' in variantTotals ? variantTotals.disponibleProyectado : 0)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold whitespace-nowrap">
                    {'vigente' in variantTotals && variantTotals.vigente > 0
                      ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap text-[11px] font-bold text-slate-600">
                    {(activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas).filter(l => l.disponibleProyectado > 0).length} con saldo
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">No. Solicitud F56</th>
                  <th className="px-3 py-2.5">NOG Guatecompras</th>
                  <th className="px-4 py-2.5 min-w-[200px]">Descripción de la Adquisición</th>
                  <th className="px-3 py-2.5">Renglón</th>
                  <th className="px-3 py-2.5 text-right">Monto (GTQ)</th>
                  <th className="px-3 py-2.5 text-center">Estado del Gasto</th>
                  <th className="px-3 py-2.5 text-center">Estatus Ficha</th>
                  <th className="px-3 py-2.5">Proveedor Adjudicado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeVariant === 'compras_por_renglon' ? dataCompras :
                  activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No se encontraron adquisiciones con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  (activeVariant === 'compras_por_renglon' ? dataCompras :
                   activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado).map((purchase) => {
                    const isPaid = purchase.estadoPago === 'pagado' || purchase.estatusEvento === 'Pagada';
                    return (
                      <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {purchase.f56e || purchase.f56 || purchase.numeroSolicitud || 'S/N'}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-blue-900 whitespace-nowrap">
                          {purchase.nog || purchase.nogGuatecompras || 'S/N'}
                        </td>
                        <td className="px-4 py-2 text-slate-800 font-medium max-w-sm truncate" title={purchase.descripcion}>
                          {purchase.descripcion}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                            {purchase.renglonPresupuestario || '158'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatQuetzales(purchase.monto)}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isPaid ? 'Pagado que Rebaja' : 'Comprometido Pendiente'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {purchase.estatusEvento || 'Registrada'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={purchase.proveedorAdjudicado || 'N/A'}>
                          {purchase.proveedorAdjudicado || 'No Adjudicado'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-right uppercase font-black text-slate-900 tracking-wider">
                    Total Acumulado ({'cantidad' in variantTotals ? variantTotals.cantidad : 0} Adquisiciones):
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-blue-900 whitespace-nowrap">
                    {formatQuetzales('totalMonto' in variantTotals ? variantTotals.totalMonto : 0)}
                  </td>
                  <td colSpan={3} className="px-3 py-3 text-left text-slate-500 font-semibold text-[11px]">
                    Monto total calculado para la categoría activa
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
