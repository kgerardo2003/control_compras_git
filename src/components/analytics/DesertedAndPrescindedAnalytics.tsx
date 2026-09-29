import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Ban, 
  Search, 
  Download, 
  Filter, 
  FileText, 
  Building2, 
  Layers, 
  TrendingDown, 
  HelpCircle, 
  ChevronRight, 
  ExternalLink, 
  Sparkles,
  RefreshCw,
  XCircle,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { PurchaseRecord } from '../../types';
import { formatQuetzales, exportToCSV, formatDate, getModalidadCompraByMonto } from '../../utils/formatters';

interface DesertedAndPrescindedAnalyticsProps {
  purchases: PurchaseRecord[];
  isAdmin: boolean;
  userAssignedArea?: string;
  onOpenModal?: (type: 'desiertos' | 'prescindidos', filter?: string) => void;
  onViewPurchase?: (purchase: PurchaseRecord) => void;
}

export const DesertedAndPrescindedAnalytics: React.FC<DesertedAndPrescindedAnalyticsProps> = ({
  purchases,
  isAdmin,
  userAssignedArea,
  onOpenModal,
  onViewPurchase,
}) => {
  const [filterType, setFilterType] = useState<'todos' | 'desiertos' | 'prescindidos' | 'sin_ofertas'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('todas');

  // 1. Filtrar eventos desiertos (o con 0 ofertas) y prescindidos
  const { 
    desiertosList, 
    prescindidosList, 
    sinOfertasList, 
    allFailedEvents, 
    stats 
  } = useMemo(() => {
    const desiertos: PurchaseRecord[] = [];
    const prescindidos: PurchaseRecord[] = [];
    const sinOfertas: PurchaseRecord[] = [];
    const combined: PurchaseRecord[] = [];

    let totalMontoDesiertos = 0;
    let totalMontoPrescindidos = 0;

    purchases.forEach((p) => {
      const est = (p.estatusEvento || '').toLowerCase();
      const numOfertas = Number(p.cantidadOfertas);
      const obs = (p.observaciones || '').toLowerCase();
      const isDesierto = est.includes('desierto') || obs.includes('desierto');
      const isPrescindido = est.includes('prescindido') || obs.includes('prescindido');
      const hasZeroOfertas = numOfertas === 0 || obs.includes('sin oferta') || obs.includes('no se presentaron ofertas');

      if (isDesierto || (hasZeroOfertas && est !== 'adjudicación' && est !== 'adjudicada')) {
        desiertos.push(p);
        totalMontoDesiertos += Number(p.monto) || 0;
        if (!combined.some(x => x.id === p.id)) combined.push(p);
      }

      if (isPrescindido) {
        prescindidos.push(p);
        totalMontoPrescindidos += Number(p.monto) || 0;
        if (!combined.some(x => x.id === p.id)) combined.push(p);
      }

      if (hasZeroOfertas) {
        sinOfertas.push(p);
      }
    });

    const totalCompras = purchases.length;
    const totalFallidos = combined.length;
    const totalMontoFallido = totalMontoDesiertos + totalMontoPrescindidos;
    const tasaDesercion = totalCompras > 0 ? (desiertos.length / totalCompras) * 100 : 0;
    const tasaPrescindidos = totalCompras > 0 ? (prescindidos.length / totalCompras) * 100 : 0;
    const tasaTotalFallidos = totalCompras > 0 ? (totalFallidos / totalCompras) * 100 : 0;

    return {
      desiertosList: desiertos,
      prescindidosList: prescindidos,
      sinOfertasList: sinOfertas,
      allFailedEvents: combined,
      stats: {
        totalCompras,
        totalFallidos,
        totalMontoFallido,
        desiertosCount: desiertos.length,
        desiertosMonto: totalMontoDesiertos,
        prescindidosCount: prescindidos.length,
        prescindidosMonto: totalMontoPrescindidos,
        sinOfertasCount: sinOfertas.length,
        tasaDesercion,
        tasaPrescindidos,
        tasaTotalFallidos,
      },
    };
  }, [purchases]);

  // 2. Desglose para gráfico de Barras por Área Solicitante
  const areaChartData = useMemo(() => {
    const map: Record<string, { area: string; desiertos: number; prescindidos: number; montoTotal: number }> = {};

    allFailedEvents.forEach((p) => {
      const area = p.areaSolicitante || p.dependenciaSolicitante || 'Otras Dependencias';
      if (!map[area]) {
        map[area] = { area, desiertos: 0, prescindidos: 0, montoTotal: 0 };
      }
      const est = (p.estatusEvento || '').toLowerCase();
      const numOfertas = Number(p.cantidadOfertas);
      if (est.includes('prescindido')) {
        map[area].prescindidos += 1;
      } else if (est.includes('desierto') || numOfertas === 0) {
        map[area].desiertos += 1;
      }
      map[area].montoTotal += Number(p.monto) || 0;
    });

    return Object.values(map)
      .sort((a, b) => (b.desiertos + b.prescindidos) - (a.desiertos + a.prescindidos))
      .slice(0, 6)
      .map(item => ({
        ...item,
        nombreCorto: item.area.length > 18 ? item.area.slice(0, 16) + '…' : item.area,
      }));
  }, [allFailedEvents]);

  // 3. Desglose para gráfico de Donut por Modalidad de Compra
  const modalidadChartData = useMemo(() => {
    const map: Record<string, { name: string; count: number; amount: number; color: string }> = {
      'Baja Cuantía': { name: 'Baja Cuantía', count: 0, amount: 0, color: '#059669' },
      'Compra Directa': { name: 'Compra Directa', count: 0, amount: 0, color: '#2563EB' },
      'Cotización': { name: 'Cotización', count: 0, amount: 0, color: '#D97706' },
      'Licitación': { name: 'Licitación', count: 0, amount: 0, color: '#7C3AED' },
    };

    allFailedEvents.forEach((p) => {
      const mod = p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre;
      if (!map[mod]) {
        map[mod] = { name: mod, count: 0, amount: 0, color: '#64748B' };
      }
      map[mod].count += 1;
      map[mod].amount += Number(p.monto) || 0;
    });

    return Object.values(map).filter(m => m.count > 0);
  }, [allFailedEvents]);

  // 4. Lista filtrada para la tabla de visualización
  const filteredEventsList = useMemo(() => {
    let list = allFailedEvents;

    if (filterType === 'desiertos') {
      list = desiertosList;
    } else if (filterType === 'prescindidos') {
      list = prescindidosList;
    } else if (filterType === 'sin_ofertas') {
      list = sinOfertasList;
    }

    if (selectedAreaFilter !== 'todas') {
      list = list.filter(p => (p.areaSolicitante || p.dependenciaSolicitante || '') === selectedAreaFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(p => 
        (p.nog || '').toLowerCase().includes(q) ||
        (p.f56e || '').toLowerCase().includes(q) ||
        (p.f56 || '').toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q) ||
        (p.areaSolicitante || '').toLowerCase().includes(q) ||
        (p.observaciones || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [allFailedEvents, desiertosList, prescindidosList, sinOfertasList, filterType, selectedAreaFilter, searchTerm]);

  // Lista de áreas únicas para el dropdown
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    allFailedEvents.forEach(p => {
      const a = p.areaSolicitante || p.dependenciaSolicitante;
      if (a) set.add(a);
    });
    return Array.from(set).sort();
  }, [allFailedEvents]);

  const handleExportFailedCSV = () => {
    const rows = filteredEventsList.map(p => ({
      NOG: p.nog || '-',
      'F56-e': p.f56e || '-',
      F56: p.f56 || '-',
      'Descripción': p.descripcion || '-',
      'Área Solicitante': p.areaSolicitante || p.dependenciaSolicitante || 'Soporte técnico',
      'Monto (GTQ)': p.monto || 0,
      'Estatus': p.estatusEvento || '-',
      'Ofertas Recibidas': p.cantidadOfertas !== undefined ? p.cantidadOfertas : '-',
      'Modalidad': p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre,
      'Fecha Solicitud': p.fechaSolicitud || '-',
      'Causa / Observaciones': p.observaciones || 'Sin registrar',
    }));
    exportToCSV(`Eventos_Desiertos_Prescindidos_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 z-50">
          <p className="font-bold border-b border-slate-700 pb-1">{data.area}</p>
          <div className="flex justify-between gap-4 font-mono text-[11px]">
            <span className="text-slate-400">Desiertos / 0 Ofertas:</span>
            <strong className="text-slate-200">{data.desiertos}</strong>
          </div>
          <div className="flex justify-between gap-4 font-mono text-[11px]">
            <span className="text-rose-400">Prescindidos:</span>
            <strong className="text-rose-300">{data.prescindidos}</strong>
          </div>
          <div className="flex justify-between gap-4 font-mono text-[11px] pt-1 border-t border-slate-800">
            <span className="text-amber-400">Monto Involucrado:</span>
            <strong className="text-amber-300">{formatQuetzales(data.montoTotal)}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border-2 border-slate-300/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
      
      {/* 1. Encabezado del Panel Analítico */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs shrink-0">
            <Ban className="w-5 h-5 text-rose-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Análisis de Eventos Desiertos (Sin Ofertas) y Prescindidos</span>
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                {stats.totalFallidos} eventos no concretados
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Fiscalización de convocatorias sin recepción de ofertas, plicas desiertas y cancelaciones administrativas en el Organismo Judicial
            </p>
          </div>
        </div>

        {/* Acciones y Exportación */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            onClick={handleExportFailedCSV}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="Exportar listado de eventos desiertos y prescindidos a CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          {onOpenModal && (
            <button
              type="button"
              onClick={() => onOpenModal('desiertos', 'todos')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Abrir explorador de NOGs desiertos"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver en Modal NOG</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Tarjetas Métricas Clave de Eventos No Concretados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Eventos Desiertos / 0 Ofertas */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Eventos Desiertos / 0 Ofertas</span>
            <AlertTriangle className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {stats.desiertosCount}
              </span>
              <span className="text-[11px] text-slate-500 font-bold">
                ({stats.tasaDesercion.toFixed(1)}% del total)
              </span>
            </div>
            <span className="text-[11px] text-slate-600 font-mono mt-0.5 block">
              Monto: <strong>{formatQuetzales(stats.desiertosMonto)}</strong>
            </span>
          </div>
        </div>

        {/* KPI 2: Eventos Prescindidos */}
        <div className="bg-rose-50/60 border border-rose-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Eventos Prescindidos</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-rose-900 font-mono">
                {stats.prescindidosCount}
              </span>
              <span className="text-[11px] text-rose-700 font-bold">
                ({stats.tasaPrescindidos.toFixed(1)}% del total)
              </span>
            </div>
            <span className="text-[11px] text-rose-800 font-mono mt-0.5 block">
              Monto: <strong>{formatQuetzales(stats.prescindidosMonto)}</strong>
            </span>
          </div>
        </div>

        {/* KPI 3: Presupuesto No Adjudicado (Liberado) */}
        <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Presupuesto No Adjudicado</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-amber-950 font-mono block">
              {formatQuetzales(stats.totalMontoFallido)}
            </span>
            <span className="text-[11px] text-amber-800 font-medium mt-0.5 block">
              Fondos liberados para replanteamiento
            </span>
          </div>
        </div>

        {/* KPI 4: Convocatorias sin Oferentes */}
        <div className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Sin Ofertas Recibidas</span>
            <RefreshCw className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-blue-900 font-mono">
                {stats.sinOfertasCount}
              </span>
              <span className="text-[11px] text-blue-700 font-bold">
                convocatorias
              </span>
            </div>
            <span className="text-[11px] text-blue-800 font-medium mt-0.5 block">
              Requieren revisión de especificaciones
            </span>
          </div>
        </div>

      </div>

      {/* 3. Cuadrícula de Gráficas Recharts: Por Área y por Modalidad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Gráfico de Barras: Desiertos vs Prescindidos por Área Solicitante */}
        <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-700" />
                <span>Desiertos vs. Prescindidos por Área Solicitante</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Top dependencias de TI con eventos no adjudicados
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold font-mono">
              Top 6 Áreas
            </span>
          </div>

          <div className="w-full h-56 pt-2">
            {areaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={areaChartData}
                  margin={{ top: 10, right: 15, left: 5, bottom: 25 }}
                >
                  <XAxis 
                    dataKey="nombreCorto" 
                    tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                    formatter={(val) => <span className="text-slate-700 font-semibold">{val}</span>}
                  />
                  <Bar 
                    dataKey="desiertos" 
                    name="Desiertos / 0 Ofertas" 
                    fill="#64748B" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar 
                    dataKey="prescindidos" 
                    name="Prescindidos" 
                    fill="#E11D48" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No hay registros de eventos desiertos o prescindidos en estas áreas
              </div>
            )}
          </div>
        </div>

        {/* Gráfico Donut: Distribución por Modalidad de Compra */}
        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-700" />
                <span>Distribución por Modalidad LCE</span>
              </h4>
              <p className="text-[10px] text-slate-500">
                Dónde se concentran los procesos fallidos
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold font-mono">
              LCE Art. 43
            </span>
          </div>

          <div className="w-full h-44 relative flex items-center justify-center">
            {modalidadChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modalidadChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                  >
                    {modalidadChartData.map((entry, index) => (
                      <Cell key={`fail-mod-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: any, item: any) => [
                      `${val} eventos (${formatQuetzales(item.payload.amount)})`, 
                      name
                    ]}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Sin datos de modalidades</div>
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-black font-mono text-slate-800">
                {stats.totalFallidos}
              </span>
              <span className="text-[8px] font-bold uppercase text-slate-400">
                No Concretados
              </span>
            </div>
          </div>

          {/* Desglose rápido con cifras claras */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200 text-[11px]">
            {modalidadChartData.map((m) => (
              <div key={m.name} className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="font-semibold">{m.name}:</span>
                </span>
                <span className="font-mono text-slate-900 font-bold">
                  {m.count} ev. <span className="text-slate-500 font-normal">({formatQuetzales(m.amount)})</span>
                </span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* 4. Tabla Detallada e Interactiva de Eventos Desiertos y Prescindidos */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        
        {/* Barra de Filtros y Búsqueda */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Selector de Tipo de Filtro */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'todos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({stats.totalFallidos})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('desiertos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'desiertos'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Desiertos ({stats.desiertosCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('prescindidos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'prescindidos'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Prescindidos ({stats.prescindidosCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('sin_ofertas')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'sin_ofertas'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              0 Ofertas ({stats.sinOfertasCount})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            {/* Filtro por Área */}
            {uniqueAreas.length > 0 && (
              <select
                value={selectedAreaFilter}
                onChange={(e) => setSelectedAreaFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer shrink-0"
              >
                <option value="todas">Todas las áreas ({uniqueAreas.length})</option>
                {uniqueAreas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            )}

            {/* Input de Búsqueda */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por NOG, F56, descripción..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Eventos */}
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 text-[11px] font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-3.5 py-2.5">NOG / F56-e</th>
                <th className="px-3.5 py-2.5">Descripción del Requerimiento</th>
                <th className="px-3.5 py-2.5">Área Solicitante</th>
                <th className="px-3.5 py-2.5 text-center">Estado / Ofertas</th>
                <th className="px-3.5 py-2.5 text-right">Monto (GTQ)</th>
                <th className="px-3.5 py-2.5">Causa / Observaciones</th>
                <th className="px-3.5 py-2.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEventsList.length > 0 ? (
                filteredEventsList.map((item) => {
                  const est = (item.estatusEvento || '').toLowerCase();
                  const numOfertas = Number(item.cantidadOfertas);
                  const isPrescindido = est.includes('prescindido');
                  const hasZeroOfertas = numOfertas === 0 || (item.observaciones || '').toLowerCase().includes('oferta');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 block">{item.nog || '-'}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">F56-e: {item.f56e || '-'}</span>
                      </td>

                      <td className="px-3.5 py-2.5 max-w-xs">
                        <p className="font-semibold text-slate-800 line-clamp-2" title={item.descripcion}>
                          {item.descripcion || '-'}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Modalidad: {item.modalidadCompra || getModalidadCompraByMonto(item.monto).nombre}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                        {item.areaSolicitante || item.dependenciaSolicitante || 'Soporte técnico'}
                      </td>

                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        {isPrescindido ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Prescindido
                          </span>
                        ) : hasZeroOfertas ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                            Desierto (0 Ofertas)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Desierto
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {numOfertas !== undefined ? `${numOfertas} ofertas recibidas` : 'Sin ofertas'}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatQuetzales(item.monto)}
                      </td>

                      <td className="px-3.5 py-2.5 max-w-xs text-[11px] text-slate-600">
                        <p className="line-clamp-2 italic" title={item.observaciones}>
                          {item.observaciones || 'Declarado desierto por la Junta Receptora según la LCE.'}
                        </p>
                      </td>

                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        {onViewPurchase && (
                          <button
                            type="button"
                            onClick={() => onViewPurchase(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer border border-slate-200"
                            title="Ver detalles de la adquisición"
                          >
                            Detalle
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                    No se encontraron eventos desiertos o prescindidos con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resumen al pie de la tabla */}
        <div className="p-3 bg-slate-50 text-xs border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-600">
          <span>Mostrando <strong>{filteredEventsList.length}</strong> de {stats.totalFallidos} eventos fallidos</span>
          <span className="font-mono">
            Monto total mostrado: <strong className="text-slate-900">{formatQuetzales(filteredEventsList.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}</strong>
          </span>
        </div>
      </div>

      {/* 5. Alerta Estratégica y Sugerencias de Mitigación */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-950">
            Recomendaciones Técnicas para Evitar Convocatorias Desiertas:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900 leading-relaxed">
            <li>
              <strong>Sondeo de Mercado Previo:</strong> Validar que los precios de referencia reflejen las condiciones actuales del mercado tecnológico para evitar que los proveedores se abstengan de ofertar.
            </li>
            <li>
              <strong>Revisión de Especificaciones Técnicas (F56-e):</strong> Garantizar que los términos de referencia no contengan requisitos restrictivos o marcas específicas que limiten la libre concurrencia según el Art. 20 de la LCE.
            </li>
            <li>
              <strong>Ampliación de Plazo de Recepción:</strong> Publicar con antelación suficiente para dar margen a los oferentes de preparar plicas y fianzas de sostenimiento de oferta.
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
};
