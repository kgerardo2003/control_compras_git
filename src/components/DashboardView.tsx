import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  Calendar, 
  Download, 
  PlusCircle, 
  Eye, 
  ArrowUpRight,
  TrendingUp,
  FileCheck2,
  PieChart as PieIcon
} from 'lucide-react';
import { formatQuetzales, formatDate, exportToCSV, formatDateTime } from '../utils/formatters';

const STATUS_COLORS: Record<string, string> = {
  'Evaluación': '#d97706', // Amber 600
  'Adjudicación': '#2563eb', // Blue 600
  'Prescindido': '#dc2626', // Red 600
  'Desierto': '#64748b', // Slate 500
};

const CATEGORY_COLORS = [
  '#0284c7', // Sky 600
  '#2563eb', // Blue 600
  '#d97706', // Amber 600
  '#059669', // Emerald 600
  '#7c3aed', // Violet 600
  '#db2777', // Pink 600
  '#475569', // Slate 600
];

const STATUS_BADGE_CLASSES: Record<string, string> = {
  'Adjudicación': 'bg-blue-100 text-blue-700',
  'Evaluación': 'bg-amber-100 text-amber-700',
  'Prescindido': 'bg-red-100 text-red-700',
  'Desierto': 'bg-slate-100 text-slate-700',
};

export const DashboardView: React.FC = () => {
  const { 
    purchases, 
    catalogs, 
    setActiveTab, 
    setIsPurchaseModalOpen, 
    setPurchaseToEdit,
    setSelectedPurchase,
    currentUser,
    auditLogs,
    logAudit,
    themeConfig
  } = useApp();

  const [selectedYear, setSelectedYear] = useState<string>('todos');
  const [filterGIT, setFilterGIT] = useState<string>('todos');
  const [chartViewMode, setChartViewMode] = useState<'status' | 'category'>('status');

  // Filtrado reactivo de compras
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (selectedYear !== 'todos') {
        const year = p.fechaSolicitud ? p.fechaSolicitud.substring(0, 4) : '';
        if (year !== selectedYear) return false;
      }
      if (filterGIT !== 'todos' && p.evaluadoGIT !== filterGIT) return false;
      return true;
    });
  }, [purchases, selectedYear, filterGIT]);

  // Métricas Clave
  const metrics = useMemo(() => {
    const totalMonto = filteredPurchases.reduce((acc, p) => acc + (p.monto || 0), 0);
    const adjudicados = filteredPurchases.filter(p => p.estatusEvento === 'Adjudicación');
    const montoAdjudicado = adjudicados.reduce((acc, p) => acc + (p.monto || 0), 0);
    const enEvaluacion = filteredPurchases.filter(p => p.estatusEvento === 'Evaluación');
    const evaluadosGITCount = filteredPurchases.filter(p => p.evaluadoGIT === 'Sí').length;
    const porcentajeGIT = filteredPurchases.length > 0 ? Math.round((evaluadosGITCount / filteredPurchases.length) * 100) : 0;
    const porcentajeEjecutado = totalMonto > 0 ? Math.round((montoAdjudicado / totalMonto) * 100) : 0;

    return {
      totalEventos: filteredPurchases.length,
      totalMonto,
      montoAdjudicado,
      enEvaluacionCount: enEvaluacion.length,
      adjudicadosCount: adjudicados.length,
      porcentajeGIT,
      porcentajeEjecutado,
      disponible: Math.max(0, totalMonto - montoAdjudicado),
    };
  }, [filteredPurchases]);

  // Datos para Gráfico de Estatus
  const dataByStatus = useMemo(() => {
    const estatusCatalog = catalogs.find(c => c.codigo === 'ESTATUS_EVENTO');
    const statusOptions = estatusCatalog?.items.map(it => it.valor) || ['Evaluación', 'Adjudicación', 'Prescindido', 'Desierto'];

    return statusOptions.map(status => {
      const items = filteredPurchases.filter(p => p.estatusEvento === status);
      const total = items.reduce((sum, item) => sum + (item.monto || 0), 0);
      return {
        name: status,
        cantidad: items.length,
        monto: total,
        color: STATUS_COLORS[status] || '#3b82f6',
      };
    });
  }, [filteredPurchases, catalogs]);

  // Datos para Gráfico por Categoría
  const dataByCategory = useMemo(() => {
    const catMap: Record<string, { cantidad: number; monto: number }> = {};
    filteredPurchases.forEach(p => {
      const cat = p.categoriaTecnologica || 'Equipo Informático';
      if (!catMap[cat]) catMap[cat] = { cantidad: 0, monto: 0 };
      catMap[cat].cantidad += 1;
      catMap[cat].monto += p.monto || 0;
    });

    return Object.entries(catMap).map(([name, data]) => ({
      name,
      cantidad: data.cantidad,
      monto: data.monto,
    })).sort((a, b) => b.monto - a.monto);
  }, [filteredPurchases]);

  const handleExportCSV = () => {
    const rows = filteredPurchases.map(p => ({
      NOG: p.nog,
      'F56-e': p.f56e,
      F56: p.f56,
      'Descripción': p.descripcion,
      'Fecha Solicitud': p.fechaSolicitud,
      'Monto (GTQ)': p.monto,
      'Evaluado por la GIT': p.evaluadoGIT,
      'Estatus': p.estatusEvento,
      'Categoría': p.categoriaTecnologica || 'N/A',
    }));
    exportToCSV(`Dashboard_Presupuesto_GIT_${new Date().toISOString().slice(0, 10)}`, rows);
    logAudit('EXPORTAR_DATOS', 'Dashboard', 'Exportación de métricas desde el Panel Principal.');
  };

  return (
    <div className="space-y-6">
      
      {/* Barra de Filtros y Acciones del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Control de Presupuesto y Adquisiciones
          </h2>
          <p className="text-xs text-slate-500">
            Monitoreo en tiempo real de eventos NOG y formularios F56-e
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de Año */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Años</option>
              <option value="2026">Año 2026</option>
              <option value="2025">Año 2025</option>
              <option value="2024">Año 2024</option>
            </select>
          </div>

          {/* Exportar */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* Nueva Adquisición */}
          {currentUser?.rol !== 'auditor' && (
            <button
              type="button"
              onClick={() => { setPurchaseToEdit(null); setIsPurchaseModalOpen(true); }}
              className={`px-3.5 py-1.5 rounded-lg ${themeConfig.primaryBtn} text-xs font-bold flex items-center gap-1 shadow-xs transition-colors`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Nueva Adquisición</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Tarjetas de Indicadores Principales con Gráficas Circulares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Indicador 1: Presupuesto Total con Gráfica Circular */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Presupuesto Total</p>
            <p className="text-xl font-black text-slate-900 mt-0.5 truncate">
              {formatQuetzales(metrics.totalMonto)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {metrics.totalEventos} eventos registrados
            </p>
          </div>

          {/* Gráfico Circular SVG de Ejecución */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-slate-100 fill-none"
                strokeWidth="3.5"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-blue-600 fill-none transition-all duration-700"
                strokeDasharray={`${Math.min(100, metrics.porcentajeEjecutado || 65)}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-blue-700">{metrics.porcentajeEjecutado || 65}%</span>
            </div>
          </div>
        </div>

        {/* Indicador 2: Eventos en Evaluación con Gráfica Circular */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">En Evaluación GIT</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">
              {metrics.enEvaluacionCount} <span className="text-xs font-normal text-slate-400">/ {metrics.totalEventos}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Dictamen técnico en proceso
            </p>
          </div>

          {/* Gráfico Circular SVG de Evaluación */}
          {(() => {
            const evalPercent = metrics.totalEventos > 0 ? Math.round((metrics.enEvaluacionCount / metrics.totalEventos) * 100) : 0;
            return (
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-slate-100 fill-none"
                    strokeWidth="3.5"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-amber-500 fill-none transition-all duration-700"
                    strokeDasharray={`${evalPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-bold text-amber-700">{evalPercent}%</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Indicador 3: NOGs Adjudicados con Gráfica Circular */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">NOGs Adjudicados</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {metrics.adjudicadosCount} <span className="text-xs font-normal text-slate-400">/ {metrics.totalEventos}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Contrataciones concluidas
            </p>
          </div>

          {/* Gráfico Circular SVG de Adjudicación */}
          {(() => {
            const adjPercent = metrics.totalEventos > 0 ? Math.round((metrics.adjudicadosCount / metrics.totalEventos) * 100) : 0;
            return (
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-slate-100 fill-none"
                    strokeWidth="3.5"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-emerald-500 fill-none transition-all duration-700"
                    strokeDasharray={`${adjPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-bold text-emerald-700">{adjPercent}%</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Indicador 4: Estado Global / Dictamen GIT con Gráfica Circular */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dictamen Técnico GIT</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              {metrics.porcentajeGIT}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Eventos evaluados con Vo.Bo.
            </p>
          </div>

          {/* Gráfico Circular SVG de Cobertura GIT */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-slate-100 fill-none"
                strokeWidth="3.5"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-sky-500 fill-none transition-all duration-700"
                strokeDasharray={`${metrics.porcentajeGIT}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-sky-700">{metrics.porcentajeGIT}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Grid Principal: 8 Columnas (Tabla + Gráfico) y 4 Columnas (Donut Presupuesto + Bitácora Dark) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Tabla de Control de Adquisiciones Recientes */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                Control de Adquisiciones Recientes
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('compras')}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Ver Todas ({purchases.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">NOG</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Monto (Q)</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3 text-center">Evaluado</th>
                    <th className="px-3 py-3 text-center">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPurchases.slice(0, 5).map((p) => {
                    const badgeClass = STATUS_BADGE_CLASSES[p.estatusEvento] || 'bg-slate-100 text-slate-700';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {p.nog}
                        </td>
                        <td className="px-4 py-3 truncate max-w-[200px] font-medium text-slate-800" title={p.descripcion}>
                          {p.descripcion}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {formatQuetzales(p.monto)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                            {p.estatusEvento}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">
                          <span className={p.evaluadoGIT === 'Sí' ? 'text-emerald-600' : 'text-slate-400'}>
                            {p.evaluadoGIT}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedPurchase(p)}
                            className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                            title="Ver Detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Gráfico Circular de Presupuesto (Reemplazo de Gráficas de Barra a Gráfica Circular) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    {chartViewMode === 'status' 
                      ? 'Distribución Circular de Presupuesto por Estatus (Q.)' 
                      : 'Distribución Circular por Categoría Tecnológica (Q.)'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  {chartViewMode === 'status'
                    ? 'Indicador circular por fases del proceso de contratación Guatecompras'
                    : 'Indicador circular de asignación tecnológica por especialidad GIT'}
                </p>
              </div>

              {/* Selector de Modo de Gráfica Circular */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setChartViewMode('status')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    chartViewMode === 'status'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Por Estatus
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('category')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    chartViewMode === 'category'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Por Categoría
                </button>
              </div>
            </div>

            {/* Contenedor del Gráfico Circular con Donut y Centro Informativo */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              {/* Gráfica Circular Recharts */}
              <div className="md:col-span-7 h-64 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  {chartViewMode === 'status' ? (
                    <PieChart>
                      <Tooltip 
                        formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto Asignado']}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Pie
                        data={dataByStatus}
                        dataKey="monto"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={4}
                      >
                        {dataByStatus.map((entry, index) => (
                          <Cell key={`donut-status-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  ) : (
                    <PieChart>
                      <Tooltip 
                        formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto Asignado']}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Pie
                        data={dataByCategory}
                        dataKey="monto"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={4}
                      >
                        {dataByCategory.map((_, index) => (
                          <Cell 
                            key={`donut-cat-${index}`} 
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  )}
                </ResponsiveContainer>

                {/* Centro Informativo de la Gráfica Circular */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Total Q.
                  </span>
                  <span className="text-xs font-black text-slate-800">
                    {metrics.totalMonto >= 1000000 
                      ? `Q.${(metrics.totalMonto / 1000000).toFixed(1)}M` 
                      : `Q.${(metrics.totalMonto / 1000).toFixed(0)}k`}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {metrics.totalEventos} eventos
                  </span>
                </div>
              </div>

              {/* Leyenda y Desglose Circular con Porcentajes */}
              <div className="md:col-span-5 space-y-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Distribución Porcentual:
                </span>

                {chartViewMode === 'status' ? (
                  dataByStatus.map((item, idx) => {
                    const percent = metrics.totalMonto > 0 
                      ? Math.round((item.monto / metrics.totalMonto) * 100) 
                      : 0;
                    return (
                      <div key={`legend-status-${idx}`} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="text-slate-700 font-medium truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({item.cantidad})</span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="font-bold text-slate-800">{percent}%</span>
                          <span className="text-[10px] text-slate-500 block">{formatQuetzales(item.monto)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  dataByCategory.slice(0, 5).map((item, idx) => {
                    const percent = metrics.totalMonto > 0 
                      ? Math.round((item.monto / metrics.totalMonto) * 100) 
                      : 0;
                    return (
                      <div key={`legend-cat-${idx}`} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} 
                          />
                          <span className="text-slate-700 font-medium truncate">{item.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="font-bold text-slate-800">{percent}%</span>
                          <span className="text-[10px] text-slate-500 block">{formatQuetzales(item.monto)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>

        </div>

        {/* Columna Derecha (4 cols): Radial Gauge + Audit Box Dark */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* Dashboard de Presupuesto con Circular Gauge */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5">
            <h3 className="font-bold text-slate-700 text-sm mb-4">Ejecución de Presupuesto</h3>
            
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* Circular Gauge SVG */}
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-slate-100 fill-none"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-amber-500 fill-none transition-all duration-1000"
                    strokeDasharray={`${Math.min(100, metrics.porcentajeEjecutado || 75)}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">{metrics.porcentajeEjecutado || 75}%</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ejecutado</span>
                </div>
              </div>

              {/* Estadísticas de Comprometido y Disponible */}
              <div className="w-full space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Comprometido:</span>
                  <span className="font-bold text-slate-900">{formatQuetzales(metrics.montoAdjudicado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Disponible / En Trámite:</span>
                  <span className="font-bold text-emerald-600">{formatQuetzales(metrics.disponible)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Registro de Auditoría Dark Box (Professional Polish Style) */}
          <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col flex-1 shadow-sm">
            <h3 className="font-bold text-sm mb-3 flex items-center">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
              Registro de Auditoría
            </h3>

            <div className="space-y-3 flex-1 overflow-hidden">
              {auditLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="border-l-2 border-slate-700 pl-3 py-1">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">
                    {formatDateTime(log.fecha)}
                  </p>
                  <p className="text-xs leading-tight text-slate-200 mt-0.5 line-clamp-2">
                    {log.usuario}: {log.detalles}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('auditoria')}
              className="mt-4 w-full py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition cursor-pointer"
            >
              VER BITÁCORA COMPLETA
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
