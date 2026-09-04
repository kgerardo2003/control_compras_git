import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  Download, 
  PlusCircle, 
  Eye, 
  CheckCircle2,
  ShieldCheck,
  Clock,
  History,
  Search,
  FileSpreadsheet,
  ArrowRight,
  User,
  ExternalLink,
  Filter
} from 'lucide-react';
import { formatQuetzales, formatDate, exportToCSV, formatDateTime } from '../utils/formatters';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  'Adjudicación': 'bg-blue-100 text-blue-700',
  'Evaluación': 'bg-amber-100 text-amber-700',
  'Prescindido': 'bg-red-100 text-red-700',
  'Desierto': 'bg-slate-100 text-slate-700',
};

const ACTION_BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'LOGIN': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'LOGOUT': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  'CREAR_COMPRA': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'EDITAR_COMPRA': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'CAMBIO_ESTATUS': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'ELIMINAR_COMPRA': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'CREAR_CATALOGO': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'EDITAR_CATALOGO': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'CREAR_USUARIO': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'EDITAR_USUARIO': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'EXPORTAR_DATOS': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  'RESTAURAR_DATOS': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
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
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('todos');

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

  // Métricas Clave para los 3 Indicadores Principales
  const metrics = useMemo(() => {
    const totalEventos = filteredPurchases.length;
    const totalMonto = filteredPurchases.reduce((acc, p) => acc + (p.monto || 0), 0);

    // 1. Indicador de NOG adjudicados
    const adjudicados = filteredPurchases.filter(p => p.estatusEvento === 'Adjudicación');
    const adjudicadosCount = adjudicados.length;
    const adjudicadosMonto = adjudicados.reduce((acc, p) => acc + (p.monto || 0), 0);
    const adjudicadosPorcentaje = totalEventos > 0 ? Math.round((adjudicadosCount / totalEventos) * 100) : 0;

    // 2. Indicador de dictámenes técnicos por la GIT
    const dictamenesGIT = filteredPurchases.filter(p => p.evaluadoGIT === 'Sí');
    const dictamenesGITCount = dictamenesGIT.length;
    const dictamenesGITMonto = dictamenesGIT.reduce((acc, p) => acc + (p.monto || 0), 0);
    const dictamenesGITPorcentaje = totalEventos > 0 ? Math.round((dictamenesGITCount / totalEventos) * 100) : 0;

    // 3. Indicador de NOG en evaluación
    const enEvaluacion = filteredPurchases.filter(p => p.estatusEvento === 'Evaluación');
    const enEvaluacionCount = enEvaluacion.length;
    const enEvaluacionMonto = enEvaluacion.reduce((acc, p) => acc + (p.monto || 0), 0);
    const enEvaluacionPorcentaje = totalEventos > 0 ? Math.round((enEvaluacionCount / totalEventos) * 100) : 0;

    return {
      totalEventos,
      totalMonto,
      adjudicadosCount,
      adjudicadosMonto,
      adjudicadosPorcentaje,
      dictamenesGITCount,
      dictamenesGITMonto,
      dictamenesGITPorcentaje,
      enEvaluacionCount,
      enEvaluacionMonto,
      enEvaluacionPorcentaje,
    };
  }, [filteredPurchases]);

  // Filtrado reactivo para la Bitácora de Auditoría en el Dashboard
  const filteredDashboardLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchUser = log.usuario?.toLowerCase().includes(q);
        const matchDetalles = log.detalles?.toLowerCase().includes(q);
        const matchIp = log.ip?.includes(q);
        const matchModulo = log.modulo?.toLowerCase().includes(q);
        if (!matchUser && !matchDetalles && !matchIp && !matchModulo) return false;
      }
      if (auditActionFilter !== 'todos' && log.accion !== auditActionFilter) return false;
      return true;
    });
  }, [auditLogs, auditSearch, auditActionFilter]);

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
    logAudit('EXPORTAR_DATOS', 'Dashboard', 'Exportación de adquisiciones desde el Panel Principal.');
  };

  const handleExportAuditCSV = () => {
    const rows = filteredDashboardLogs.map(l => ({
      ID: l.id,
      'Fecha y Hora': formatDateTime(l.fecha),
      Usuario: l.usuario,
      Rol: l.rol,
      Acción: l.accion,
      Módulo: l.modulo,
      Detalles: l.detalles,
      'ID Registro': l.registroId || 'N/A',
      'Dirección IP': l.ip,
    }));
    exportToCSV(`Bitacora_Auditoria_GIT_OJ_${new Date().toISOString().slice(0, 10)}`, rows);
    logAudit('EXPORTAR_DATOS', 'Auditoría', 'Exportación de bitácora de auditoría desde el Panel Principal.');
  };

  return (
    <div className="space-y-6">
      
      {/* Barra Superior con Control de Presupuesto Global, Filtros y Acciones */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1c39bb] animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Control de Presupuesto y Adquisiciones
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo en tiempo real de eventos NOG y formularios F56-e de la Gerencia de Informática
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Indicador Rápido de Presupuesto Global */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Presupuesto Global</span>
            <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">{formatQuetzales(metrics.totalMonto)}</span>
          </div>

          {/* Selector de Año */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Años</option>
              <option value="2026">Año 2026</option>
              <option value="2025">Año 2025</option>
              <option value="2024">Año 2024</option>
            </select>
          </div>

          {/* Botón Exportar CSV (Blanco con letras negras) */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>Exportar CSV</span>
          </button>

          {/* Botón Nueva Adquisición (Blanco con letras negras) */}
          {currentUser?.rol !== 'auditor' && (
            <button
              type="button"
              onClick={() => { setPurchaseToEdit(null); setIsPurchaseModalOpen(true); }}
              className={`px-4 py-2 rounded-xl ${themeConfig.primaryBtn} text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95`}
            >
              <PlusCircle className="w-4 h-4 text-black" />
              <span>+ Nueva Adquisición</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Paneles e Indicadores de Avance de Gran Visibilidad y Alto Contraste Profesional */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* PANEL 1: Indicador de NOG Adjudicados */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-emerald-500 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
                    NOG Adjudicados
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Contrataciones Aprobadas
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-700 text-white shadow-xs">
                {metrics.adjudicadosPorcentaje}% del Total
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-black text-slate-950 tracking-tight font-mono">
                    {metrics.adjudicadosCount}
                  </span>
                  <span className="text-base font-bold text-slate-500">
                    / {metrics.totalEventos}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 mt-1.5 leading-snug">
                  Eventos finalizados y adjudicados
                </p>
              </div>

              {/* Medidor Circular de Alto Contraste */}
              <div className="relative w-22 h-22 sm:w-24 sm:h-24 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-slate-200 fill-none"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-emerald-600 fill-none transition-all duration-700"
                    strokeDasharray={`${metrics.adjudicadosPorcentaje}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                    {metrics.adjudicadosPorcentaje}%
                  </span>
                  <span className="text-[9px] font-black text-emerald-800 uppercase tracking-tighter">
                    Tasa Éxito
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto Adjudicado</span>
            <span className="text-sm sm:text-base font-black font-mono text-emerald-400">
              {formatQuetzales(metrics.adjudicadosMonto)}
            </span>
          </div>
        </div>

        {/* PANEL 2: Indicador de Dictámenes Técnicos por la GIT */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-[#1c39bb] shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-[#1c39bb] border border-blue-300">
                  <ShieldCheck className="w-5 h-5 text-[#1c39bb]" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-blue-950 block">
                    Dictámenes Técnicos GIT
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Evaluación y Respaldo Técnico
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#1c39bb] text-white shadow-xs">
                {metrics.dictamenesGITPorcentaje}% Cobertura
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-black text-slate-950 tracking-tight font-mono">
                    {metrics.dictamenesGITCount}
                  </span>
                  <span className="text-base font-bold text-slate-500">
                    / {metrics.totalEventos}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 mt-1.5 leading-snug">
                  Dictámenes emitidos y avalados por la GIT
                </p>
              </div>

              {/* Medidor Circular de Alto Contraste */}
              <div className="relative w-22 h-22 sm:w-24 sm:h-24 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-slate-200 fill-none"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-[#1c39bb] fill-none transition-all duration-700"
                    strokeDasharray={`${metrics.dictamenesGITPorcentaje}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-blue-950 font-mono">
                    {metrics.dictamenesGITPorcentaje}%
                  </span>
                  <span className="text-[9px] font-black text-blue-800 uppercase tracking-tighter">
                    Con Dictamen
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto Dictaminado</span>
            <span className="text-sm sm:text-base font-black font-mono text-cyan-300">
              {formatQuetzales(metrics.dictamenesGITMonto)}
            </span>
          </div>
        </div>

        {/* PANEL 3: Indicador de NOG en Evaluación */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-amber-500 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-950 block">
                    NOG en Evaluación
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Procesos en Trámite Activo
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-600 text-white shadow-xs">
                {metrics.enEvaluacionPorcentaje}% en Trámite
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-black text-slate-950 tracking-tight font-mono">
                    {metrics.enEvaluacionCount}
                  </span>
                  <span className="text-base font-bold text-slate-500">
                    / {metrics.totalEventos}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 mt-1.5 leading-snug">
                  Plicas y ofertas en etapa de análisis técnico
                </p>
              </div>

              {/* Medidor Circular de Alto Contraste */}
              <div className="relative w-22 h-22 sm:w-24 sm:h-24 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-slate-200 fill-none"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-amber-600 fill-none transition-all duration-700"
                    strokeDasharray={`${metrics.enEvaluacionPorcentaje}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
                    {metrics.enEvaluacionPorcentaje}%
                  </span>
                  <span className="text-[9px] font-black text-amber-800 uppercase tracking-tighter">
                    En Proceso
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto en Trámite</span>
            <span className="text-sm sm:text-base font-black font-mono text-amber-400">
              {formatQuetzales(metrics.enEvaluacionMonto)}
            </span>
          </div>
        </div>

      </div>

      {/* Sección 1: Control de Adquisiciones Recientes (Full-Width, Professional Contrast) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-sm">
                  Control de Adquisiciones Recientes
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredPurchases.length} registradas
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Últimos procesos registrados y gestionados en el sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('compras')}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Ver Listado Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase sticky top-0 border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">NOG</th>
                <th className="px-4 py-3">Formularios</th>
                <th className="px-4 py-3">Descripción del Proceso</th>
                <th className="px-4 py-3">Monto (Q)</th>
                <th className="px-4 py-3">Estatus Evento</th>
                <th className="px-4 py-3 text-center">Dictamen GIT</th>
                <th className="px-4 py-3">Fecha Solicitud</th>
                <th className="px-3 py-3 text-center">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron adquisiciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredPurchases.slice(0, 6).map((p) => {
                  const badgeClass = STATUS_BADGE_CLASSES[p.estatusEvento] || 'bg-slate-100 text-slate-700';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {p.nog}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {p.f56e || p.f56 || '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <p className="font-medium text-slate-800 truncate" title={p.descripcion}>
                          {p.descripcion}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap font-mono">
                        {formatQuetzales(p.monto)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${badgeClass}`}>
                          {p.estatusEvento}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.evaluadoGIT === 'Sí' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.evaluadoGIT === 'Sí' ? <ShieldCheck className="w-3 h-3 text-emerald-600" /> : null}
                          {p.evaluadoGIT === 'Sí' ? 'Con Dictamen' : 'Sin Dictamen'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDate(p.fechaSolicitud)}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedPurchase(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Ver Ficha Técnica Completa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 2: Bitácora y Registro de Auditoría Institucional con Mayor Visibilidad */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Encabezado Principal de Auditoría */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <History className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Bitácora y Registro Oficial de Auditoría
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 font-mono">
                  {auditLogs.length} Registros Inmutables
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Tiempo Real
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Trazabilidad inmutable de todas las operaciones, modificaciones de adquisiciones, transacciones y accesos al sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportAuditCSV}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-black" />
              <span>Exportar Bitácora CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('auditoria')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver Módulo Completo</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtrado de la Bitácora */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-8 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Buscar en bitácora por usuario, detalle, módulo o dirección IP..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-700"
            >
              <option value="todos">Todas las Acciones ({auditLogs.length})</option>
              <option value="LOGIN">LOGIN</option>
              <option value="CREAR_COMPRA">CREAR COMPRA</option>
              <option value="EDITAR_COMPRA">EDITAR COMPRA</option>
              <option value="CAMBIO_ESTATUS">CAMBIO ESTATUS</option>
              <option value="ELIMINAR_COMPRA">ELIMINAR COMPRA</option>
              <option value="CREAR_CATALOGO">CATÁLOGOS</option>
              <option value="CREAR_USUARIO">USUARIOS</option>
            </select>
            {auditSearch || auditActionFilter !== 'todos' ? (
              <button
                type="button"
                onClick={() => { setAuditSearch(''); setAuditActionFilter('todos'); }}
                className="px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl whitespace-nowrap cursor-pointer hover:bg-slate-100"
                title="Limpiar filtros"
              >
                Limpiar
              </button>
            ) : null}
          </div>
        </div>

        {/* Tabla de Bitácora de Alto Impacto Visual */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">Fecha y Hora</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Usuario Responsable</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Acción Ejecutada</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Módulo</th>
                <th className="px-4 py-3.5">Detalles de la Operación Realizada</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Terminal / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs bg-white">
              {filteredDashboardLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No se encontraron registros de auditoría que coincidan con los filtros de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredDashboardLogs.slice(0, 8).map((log) => {
                  const actionStyle = ACTION_BADGE_STYLES[log.accion] || { 
                    bg: 'bg-slate-100', 
                    text: 'text-slate-800', 
                    border: 'border-slate-200' 
                  };

                  return (
                    <tr key={log.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* Fecha y Hora */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] font-bold text-slate-700">
                        {formatDateTime(log.fecha)}
                      </td>

                      {/* Usuario */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px]">
                            {log.usuario ? log.usuario.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {log.usuario}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">
                              {log.rol || 'Operador'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}>
                          {log.accion}
                        </span>
                      </td>

                      {/* Módulo */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.modulo}
                        </span>
                      </td>

                      {/* Detalles */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800 leading-snug break-words max-w-xl">
                          {log.detalles}
                        </p>
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {log.ip || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de Tabla con Resumen y Acceso Directo */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span className="font-medium">
            Mostrando <strong>{Math.min(filteredDashboardLogs.length, 8)}</strong> de <strong>{filteredDashboardLogs.length}</strong> eventos registrados
            {filteredDashboardLogs.length !== auditLogs.length && ` (filtrado de ${auditLogs.length} en total)`}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('auditoria')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Ver historial completo e inmutable en el Módulo de Auditoría</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
