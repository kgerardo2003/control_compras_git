import React, { useState, useMemo } from 'react';
import { PurchaseRecord, User } from '../types';
import { formatQuetzales, formatDate, formatDateTime, getModalidadCompraByMonto } from '../utils/formatters';
import { generatePurchasesPDF } from '../utils/pdfExport';
import { exportPurchasesToExcel } from '../utils/purchasesExcelExport';
import { 
  Printer, 
  X, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  Award, 
  Building2, 
  FileText, 
  Tag, 
  ShieldCheck, 
  Layers,
  Filter,
  Search
} from 'lucide-react';
import { OJLogo } from './OJLogo';
import { useApp } from '../context/AppContext';

interface AdjudicadosEvaluacionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: PurchaseRecord[];
  currentUser: User | null;
  initialFilter?: 'todos' | 'adjudicados' | 'evaluacion' | 'prescindidos';
}

export const AdjudicadosEvaluacionReportModal: React.FC<AdjudicadosEvaluacionReportModalProps> = ({
  isOpen,
  onClose,
  purchases,
  currentUser,
  initialFilter = 'todos'
}) => {
  const { logAudit, showToast } = useApp();

  // Filtro de visualización dentro del informe: Todos, Adjudicados, En Evaluación, Prescindidos
  const [filterMode, setFilterMode] = useState<'todos' | 'adjudicados' | 'evaluacion' | 'prescindidos'>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Eventos Adjudicados
  const adjudicados = useMemo(() => {
    return purchases.filter(p => {
      const st = (p.estatusEvento || '').toLowerCase().trim();
      return st === 'adjudicación' || st === 'adjudicacion' || st === 'adjudicada' || st === 'adjudicado';
    });
  }, [purchases]);

  // 2. Eventos en Evaluación
  const enEvaluacion = useMemo(() => {
    return purchases.filter(p => {
      const st = (p.estatusEvento || '').toLowerCase().trim();
      return st === 'evaluación' || st === 'evaluacion' || st.includes('evalua');
    });
  }, [purchases]);

  // 3. Eventos Prescindidos / Anulados
  const prescindidos = useMemo(() => {
    return purchases.filter(p => {
      const st = (p.estatusEvento || '').toLowerCase().trim();
      return st.includes('prescind') || st.includes('precind') || st.includes('anula') || st.includes('rechaz');
    });
  }, [purchases]);

  // Totales financieros
  const totalMontoAdjudicado = useMemo(() => {
    return adjudicados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [adjudicados]);

  const totalMontoEvaluacion = useMemo(() => {
    return enEvaluacion.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [enEvaluacion]);

  const totalMontoPrescindido = useMemo(() => {
    return prescindidos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [prescindidos]);

  const totalAllPurchases = purchases.length;
  const totalMontoAll = useMemo(() => {
    return purchases.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [purchases]);

  // Filtrado reactivo por término de búsqueda
  const filterList = (list: PurchaseRecord[]) => {
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter(p => 
      (p.nog && p.nog.toLowerCase().includes(q)) ||
      (p.f56e && p.f56e.toLowerCase().includes(q)) ||
      (p.f56 && p.f56.toLowerCase().includes(q)) ||
      (p.areaSolicitante && p.areaSolicitante.toLowerCase().includes(q)) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
      (p.proveedorAdjudicado && p.proveedorAdjudicado.toLowerCase().includes(q)) ||
      (p.renglonPresupuestario && p.renglonPresupuestario.toLowerCase().includes(q)) ||
      (p.estatusEvento && p.estatusEvento.toLowerCase().includes(q))
    );
  };

  const filteredAdjudicados = useMemo(() => filterList(adjudicados), [adjudicados, searchTerm]);
  const filteredEvaluacion = useMemo(() => filterList(enEvaluacion), [enEvaluacion, searchTerm]);
  const filteredPrescindidos = useMemo(() => filterList(prescindidos), [prescindidos, searchTerm]);
  const filteredAll = useMemo(() => filterList(purchases), [purchases, searchTerm]);

  // Código único de trazabilidad de auditoría
  const [auditCode] = useState(() => {
    const now = new Date();
    const d = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `AUD-OJ-ESTATUS-${d}-${rand}`;
  });

  const [generationDate] = useState(() => formatDateTime(new Date().toISOString()));

  if (!isOpen) return null;

  const handlePrint = () => {
    logAudit('EXPORTAR_DATOS', 'Reportes', `Impresión de informe oficial de adquisiciones (Filtro: ${filterMode}) con Logo OJ.`);
    window.print();
  };

  const handleDownloadPdf = () => {
    let targetList: PurchaseRecord[] = [];
    let reportTitle = '';
    let statusLabel = '';

    if (filterMode === 'adjudicados') {
      targetList = filteredAdjudicados;
      reportTitle = 'INFORME OFICIAL DE ADQUISICIONES ADJUDICADAS';
      statusLabel = 'Solo Adjudicadas';
    } else if (filterMode === 'evaluacion') {
      targetList = filteredEvaluacion;
      reportTitle = 'INFORME OFICIAL DE ADQUISICIONES EN EVALUACIÓN';
      statusLabel = 'Solo en Evaluación';
    } else if (filterMode === 'prescindidos') {
      targetList = filteredPrescindidos;
      reportTitle = 'INFORME OFICIAL DE ADQUISICIONES PRESCINDIDAS';
      statusLabel = 'Solo Prescindidas / Anuladas';
    } else {
      targetList = filteredAll;
      reportTitle = 'INFORME OFICIAL DE ADQUISICIONES - TODOS LOS ESTATUS';
      statusLabel = 'Todos los Estatus';
    }

    try {
      const filename = generatePurchasesPDF({
        purchases: targetList,
        title: reportTitle,
        subtitle: `Consulta Oficial por Estatus: ${statusLabel} • Organismo Judicial de Guatemala`,
        filterInfo: {
          status: statusLabel,
        },
        currentUser,
        filenamePrefix: `Informe_OJ_${filterMode}`,
        includeCharts: true,
      });

      logAudit('EXPORTAR_DATOS', 'Reportes', `Exportación PDF oficial de informe por estatus (${statusLabel}): ${filename}`);
      showToast({
        type: 'success',
        title: 'Reporte PDF Generado',
        message: `El archivo "${filename}" se descargó exitosamente con el logo oficial del Organismo Judicial.`
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Generando PDF',
        message: err?.message || 'No se pudo generar el documento PDF.'
      });
    }
  };

  const handleDownloadExcel = () => {
    let targetList: PurchaseRecord[] = [];
    if (filterMode === 'adjudicados') targetList = filteredAdjudicados;
    else if (filterMode === 'evaluacion') targetList = filteredEvaluacion;
    else if (filterMode === 'prescindidos') targetList = filteredPrescindidos;
    else targetList = filteredAll;

    try {
      exportPurchasesToExcel(targetList, `Reporte_OJ_${filterMode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      logAudit('EXPORTAR_DATOS', 'Reportes', `Exportación Excel de adquisiciones (${filterMode}).`);
      showToast({
        type: 'success',
        title: 'Excel Generado',
        message: 'Archivo de Microsoft Excel descargado con los registros seleccionados.'
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Exportando Excel',
        message: err?.message || 'No se pudo generar el archivo Excel.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden my-4 flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:my-0 print:w-full print:max-w-none">
        
        {/* ========================================================================= */}
        {/* BARRA SUPERIOR DE ACCIONES (NO IMPRIMIBLE)                                 */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden border-b border-blue-900 shadow-md bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-white">
                  Informe Oficial por Estatus: Adjudicadas, En Evaluación, Prescindidas y Todos
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Logo Institucional OJ
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {totalAllPurchases} adquisiciones totales registradas • Cartera Consolidada: {formatQuetzales(totalMontoAll)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {/* Botón Imprimir / Boleta */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Imprimir documento oficial o guardar como PDF del navegador"
            >
              <Printer className="w-3.5 h-3.5 text-blue-950" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            {/* Botón Descargar PDF con jsPDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-blue-600"
              title="Descargar documento PDF oficial con membrete y logo del Organismo Judicial"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Descargar PDF</span>
            </button>

            {/* Botón Exportar Excel */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-emerald-600"
              title="Exportar registros a archivo Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Excel</span>
            </button>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros Rápidos dentro del Modal (NO IMPRIMIBLE) */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              Estatus:
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('todos')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                filterMode === 'todos'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              Todos los Estatus ({totalAllPurchases})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('adjudicados')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                filterMode === 'adjudicados'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              Adjudicadas ({adjudicados.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('evaluacion')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                filterMode === 'evaluacion'
                  ? 'bg-blue-800 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              En Evaluación ({enEvaluacion.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('prescindidos')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                filterMode === 'prescindidos'
                  ? 'bg-rose-800 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              Prescindidas / Anuladas ({prescindidos.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en el informe (NOG, F56-e, área...)"
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUERPO DEL INFORME OFICIAL IMPRIMIBLE                                      */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          
          {/* MEMBRETE INSTITUCIONAL CON LOGO DEL ORGANISMO JUDICIAL DE GUATEMALA */}
          <div className="border-b-2 border-indigo-950 pb-4 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* LOGOTIPO OFICIAL DEL ORGANISMO JUDICIAL */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center shrink-0">
                {/* Imagen del Escudo / Logotipo Oficial de Guatemala */}
                <img 
                  src="/organismo_judicial_logo.svg" 
                  alt="Logo del Organismo Judicial de Guatemala"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback a PNG si el navegador tuviera alguna restricción con SVG
                    (e.target as HTMLImageElement).src = '/organismo_judicial_logo.png';
                  }}
                />
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                  REPÚBLICA DE GUATEMALA
                </span>
                <h1 className="text-base sm:text-lg font-black tracking-wide text-slate-950 uppercase font-serif">
                  ORGANISMO JUDICIAL
                </h1>
                <h2 className="text-xs sm:text-sm font-bold text-blue-950 uppercase">
                  GERENCIA DE INFORMÁTICA
                </h2>
                <p className="text-[10px] text-slate-600 font-medium">
                  SISTEMA OFICIAL DE CONTROL DE ADQUISICIONES Y EXPEDIENTES TECNOLÓGICOS (F56-e)
                </p>
              </div>
            </div>

            {/* CUADRO OFICIAL DE CONTROL Y AUDITORÍA */}
            <div className="text-right border-l-2 border-indigo-950 pl-4 py-1 self-stretch sm:self-auto flex flex-col justify-center">
              <div className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block mb-1">
                <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">
                  CONTROL DE FISCALIZACIÓN
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 block">
                {auditCode}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Emisión: {generationDate}
              </span>
              {currentUser && (
                <span className="text-[10px] font-medium text-slate-600 block">
                  Por: <strong>{currentUser.nombreCompleto}</strong> ({currentUser.rol})
                </span>
              )}
            </div>
          </div>

          {/* TÍTULO PRINCIPAL DEL INFORME */}
          <div className="text-center my-4 py-3 bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 border-y border-slate-300">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950 font-serif">
              {filterMode === 'adjudicados' && 'INFORME OFICIAL DE ADQUISICIONES ADJUDICADAS'}
              {filterMode === 'evaluacion' && 'INFORME OFICIAL DE ADQUISICIONES EN EVALUACIÓN TÉCNICA'}
              {filterMode === 'prescindidos' && 'INFORME OFICIAL DE ADQUISICIONES PRESCINDIDAS Y ANULADAS'}
              {filterMode === 'todos' && 'INFORME OFICIAL CONSOLIDADO DE ADQUISICIONES POR ESTATUS'}
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5 max-w-2xl mx-auto">
              Expedientes tramitados conforme a la Ley de Contrataciones del Estado (Decreto 57-92 del Congreso de la República) y Normativa Interna de la Gerencia de Informática.
            </p>
          </div>

          {/* CUADRO RESUMEN DE KPIS EJECUTIVOS (4 CATEGORÍAS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
            {/* KPI 1: Adjudicados */}
            <div className={`p-3 rounded-xl border transition-all cursor-pointer ${filterMode === 'adjudicados' ? 'bg-emerald-100/90 border-emerald-500 ring-2 ring-emerald-500/30' : 'bg-emerald-50/80 border-emerald-200'}`} onClick={() => setFilterMode('adjudicados')}>
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                1. Eventos Adjudicados
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-950 font-mono block mt-0.5">
                {adjudicados.length}
              </span>
              <span className="text-xs font-bold text-emerald-900 font-mono block mt-1">
                {formatQuetzales(totalMontoAdjudicado)}
              </span>
              <span className="text-[9px] text-emerald-700 mt-0.5 block">
                Resueltos y contratados
              </span>
            </div>

            {/* KPI 2: En Evaluación */}
            <div className={`p-3 rounded-xl border transition-all cursor-pointer ${filterMode === 'evaluacion' ? 'bg-blue-100/90 border-blue-500 ring-2 ring-blue-500/30' : 'bg-blue-50/80 border-blue-200'}`} onClick={() => setFilterMode('evaluacion')}>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                2. En Evaluación Técnica
              </span>
              <span className="text-lg sm:text-xl font-black text-blue-950 font-mono block mt-0.5">
                {enEvaluacion.length}
              </span>
              <span className="text-xs font-bold text-blue-900 font-mono block mt-1">
                {formatQuetzales(totalMontoEvaluacion)}
              </span>
              <span className="text-[9px] text-blue-700 mt-0.5 block">
                En calificación y dictamen GIT
              </span>
            </div>

            {/* KPI 3: Prescindidos */}
            <div className={`p-3 rounded-xl border transition-all cursor-pointer ${filterMode === 'prescindidos' ? 'bg-rose-100/90 border-rose-500 ring-2 ring-rose-500/30' : 'bg-rose-50/80 border-rose-200'}`} onClick={() => setFilterMode('prescindidos')}>
              <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">
                3. Prescindidos / Anulados
              </span>
              <span className="text-lg sm:text-xl font-black text-rose-950 font-mono block mt-0.5">
                {prescindidos.length}
              </span>
              <span className="text-xs font-bold text-rose-900 font-mono block mt-1">
                {formatQuetzales(totalMontoPrescindido)}
              </span>
              <span className="text-[9px] text-rose-700 mt-0.5 block">
                Eventos sin efecto legal
              </span>
            </div>

            {/* KPI 4: Total General */}
            <div className={`p-3 rounded-xl border transition-all cursor-pointer ${filterMode === 'todos' ? 'bg-slate-200 border-slate-600 ring-2 ring-slate-500/30' : 'bg-slate-100 border-slate-300'}`} onClick={() => setFilterMode('todos')}>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                4. Total Cartera Registrada
              </span>
              <span className="text-lg sm:text-xl font-black text-slate-900 font-mono block mt-0.5">
                {totalAllPurchases}
              </span>
              <span className="text-xs font-bold text-slate-950 font-mono block mt-1">
                {formatQuetzales(totalMontoAll)}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                Todos los estatus
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN I: EVENTOS RESUELTOS Y ADJUDICADOS                                */}
          {/* ========================================================================= */}
          {(filterMode === 'todos' || filterMode === 'adjudicados') && (
            <div className="my-6 space-y-3">
              <div className="flex items-center justify-between border-b-2 border-blue-900 pb-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-900" />
                  <h3 className="text-xs sm:text-sm font-black uppercase text-blue-950 tracking-wide font-serif">
                    SECCIÓN I: EVENTOS OFICIALMENTE RESUELTOS Y ADJUDICADOS ({filteredAdjudicados.length})
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-blue-950 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-300">
                  Subtotal: {formatQuetzales(filteredAdjudicados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}
                </span>
              </div>

              {filteredAdjudicados.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                  No se encontraron eventos adjudicados con los criterios actuales.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-blue-950 text-white font-bold">
                        <th className="border border-blue-900 p-2 text-center w-12">#</th>
                        <th className="border border-blue-900 p-2 text-left w-24">NOG</th>
                        <th className="border border-blue-900 p-2 text-left w-20">F56-e</th>
                        <th className="border border-blue-900 p-2 text-left">Área Solicitante</th>
                        <th className="border border-blue-900 p-2 text-left">Descripción del Bien o Servicio</th>
                        <th className="border border-blue-900 p-2 text-left">Proveedor Adjudicado</th>
                        <th className="border border-blue-900 p-2 text-center w-20">Fecha Adj.</th>
                        <th className="border border-blue-900 p-2 text-left w-24">Modalidad</th>
                        <th className="border border-blue-900 p-2 text-center w-14">Renglón</th>
                        <th className="border border-blue-900 p-2 text-right font-mono w-28">Monto (GTQ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredAdjudicados.map((p, idx) => (
                        <tr key={p.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'}>
                          <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-900">{p.nog}</td>
                          <td className="border border-slate-300 p-1.5 font-mono text-slate-700">{p.f56e}</td>
                          <td className="border border-slate-300 p-1.5 font-semibold text-slate-800">{p.areaSolicitante}</td>
                          <td className="border border-slate-300 p-1.5 text-slate-900 max-w-xs">{p.descripcion}</td>
                          <td className="border border-slate-300 p-1.5 font-semibold text-blue-950">
                            {p.proveedorAdjudicado || 'Adjudicación Confirmada'}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-600 whitespace-nowrap">
                            {formatDate(p.fechaAdjudicacion || p.fechaSolicitud)}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-slate-700 whitespace-nowrap">
                            {p.modalidadCompra || getModalidadCompraByMonto(p.monto, p.modalidadCompra).nombre}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-slate-800">
                            {p.renglonPresupuestario || '158'}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                            {formatQuetzales(p.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-100 font-black text-blue-950">
                        <td colSpan={9} className="border border-slate-300 p-2 text-right uppercase tracking-wider">
                          TOTAL SECCIÓN I - ADJUDICACIONES ({filteredAdjudicados.length} EVENTOS):
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono text-xs text-blue-950 whitespace-nowrap">
                          {formatQuetzales(filteredAdjudicados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECCIÓN II: EVENTOS EN FASE DE EVALUACIÓN TÉCNICA Y DICTAMEN               */}
          {/* ========================================================================= */}
          {(filterMode === 'todos' || filterMode === 'evaluacion') && (
            <div className="my-6 space-y-3">
              <div className="flex items-center justify-between border-b-2 border-amber-600 pb-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs sm:text-sm font-black uppercase text-amber-950 tracking-wide font-serif">
                    SECCIÓN II: EVENTOS EN FASE DE EVALUACIÓN TÉCNICA Y CALIFICACIÓN ({filteredEvaluacion.length})
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                  Subtotal: {formatQuetzales(filteredEvaluacion.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}
                </span>
              </div>

              {filteredEvaluacion.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                  No se encontraron eventos en fase de evaluación con los criterios actuales.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-amber-900 text-white font-bold">
                        <th className="border border-amber-800 p-2 text-center w-12">#</th>
                        <th className="border border-amber-800 p-2 text-left w-24">NOG</th>
                        <th className="border border-amber-800 p-2 text-left w-20">F56-e</th>
                        <th className="border border-amber-800 p-2 text-left">Área Solicitante</th>
                        <th className="border border-amber-800 p-2 text-left">Descripción del Requerimiento</th>
                        <th className="border border-amber-800 p-2 text-center w-16">Ofertas</th>
                        <th className="border border-amber-800 p-2 text-center w-20">Fecha Sol.</th>
                        <th className="border border-amber-800 p-2 text-left w-24">Modalidad</th>
                        <th className="border border-amber-800 p-2 text-center w-14">Renglón</th>
                        <th className="border border-amber-800 p-2 text-right font-mono w-28">Monto Estimado (GTQ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredEvaluacion.map((p, idx) => (
                        <tr key={p.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'}>
                          <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-900">{p.nog}</td>
                          <td className="border border-slate-300 p-1.5 font-mono text-slate-700">{p.f56e}</td>
                          <td className="border border-slate-300 p-1.5 font-semibold text-slate-800">{p.areaSolicitante}</td>
                          <td className="border border-slate-300 p-1.5 text-slate-900 max-w-xs">{p.descripcion}</td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-amber-900">
                            {p.cantidadOfertas ?? 0}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-600 whitespace-nowrap">
                            {formatDate(p.fechaSolicitud)}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-slate-700 whitespace-nowrap">
                            {p.modalidadCompra || getModalidadCompraByMonto(p.monto, p.modalidadCompra).nombre}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-slate-800">
                            {p.renglonPresupuestario || '158'}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                            {formatQuetzales(p.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-amber-100 font-black text-amber-950">
                        <td colSpan={9} className="border border-slate-300 p-2 text-right uppercase tracking-wider">
                          TOTAL SECCIÓN II - EN EVALUACIÓN ({filteredEvaluacion.length} EVENTOS):
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono text-xs text-amber-950 whitespace-nowrap">
                          {formatQuetzales(filteredEvaluacion.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECCIÓN III: EVENTOS PRESCINDIDOS Y ANULADOS                              */}
          {/* ========================================================================= */}
          {(filterMode === 'todos' || filterMode === 'prescindidos') && (
            <div className="my-6 space-y-3">
              <div className="flex items-center justify-between border-b-2 border-rose-700 pb-1.5">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-700" />
                  <h3 className="text-xs sm:text-sm font-black uppercase text-rose-950 tracking-wide font-serif">
                    SECCIÓN III: EVENTOS PRESCINDIDOS Y ANULADOS ({filteredPrescindidos.length})
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-rose-950 bg-rose-100 px-2.5 py-0.5 rounded border border-rose-300">
                  Subtotal: {formatQuetzales(filteredPrescindidos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}
                </span>
              </div>

              {filteredPrescindidos.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                  No se encontraron eventos prescindidos o anulados con los criterios actuales.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-rose-900 text-white font-bold">
                        <th className="border border-rose-800 p-2 text-center w-12">#</th>
                        <th className="border border-rose-800 p-2 text-left w-24">NOG</th>
                        <th className="border border-rose-800 p-2 text-left w-20">F56-e</th>
                        <th className="border border-rose-800 p-2 text-left">Área Solicitante</th>
                        <th className="border border-rose-800 p-2 text-left">Descripción del Requerimiento</th>
                        <th className="border border-rose-800 p-2 text-center w-20">Fecha Sol.</th>
                        <th className="border border-rose-800 p-2 text-left w-24">Estatus</th>
                        <th className="border border-rose-800 p-2 text-center w-14">Renglón</th>
                        <th className="border border-rose-800 p-2 text-right font-mono w-28">Monto (GTQ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredPrescindidos.map((p, idx) => (
                        <tr key={p.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-rose-50/20'}>
                          <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-900">{p.nog}</td>
                          <td className="border border-slate-300 p-1.5 font-mono text-slate-700">{p.f56e}</td>
                          <td className="border border-slate-300 p-1.5 font-semibold text-slate-800">{p.areaSolicitante}</td>
                          <td className="border border-slate-300 p-1.5 text-slate-900 max-w-xs">{p.descripcion}</td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-600 whitespace-nowrap">
                            {formatDate(p.fechaSolicitud)}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-rose-800 font-bold whitespace-nowrap">
                            {p.estatusEvento || 'Prescindido'}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-slate-800">
                            {p.renglonPresupuestario || '158'}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-rose-950 whitespace-nowrap">
                            {formatQuetzales(p.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-rose-100 font-black text-rose-950">
                        <td colSpan={8} className="border border-slate-300 p-2 text-right uppercase tracking-wider">
                          TOTAL SECCIÓN III - PRESCINDIDOS ({filteredPrescindidos.length} EVENTOS):
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono text-xs text-rose-950 whitespace-nowrap">
                          {formatQuetzales(filteredPrescindidos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* GRAN TOTAL CONSOLIDADO DE LA CARTERA                                       */}
          {/* ========================================================================= */}
          <div className="my-6 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                ORGANISMO JUDICIAL • GERENCIA DE INFORMÁTICA
              </span>
              <h4 className="text-sm font-black text-white uppercase font-serif">
                {filterMode === 'adjudicados' && `TOTAL EVENTOS ADJUDICADOS (${filteredAdjudicados.length})`}
                {filterMode === 'evaluacion' && `TOTAL EVENTOS EN EVALUACIÓN (${filteredEvaluacion.length})`}
                {filterMode === 'prescindidos' && `TOTAL EVENTOS PRESCINDIDOS (${filteredPrescindidos.length})`}
                {filterMode === 'todos' && `GRAN TOTAL CONSOLIDADO (${totalAllPurchases} EVENTOS)`}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {filterMode === 'todos' 
                  ? `${adjudicados.length} adjudicados • ${enEvaluacion.length} en evaluación • ${prescindidos.length} prescindidos • ${totalAllPurchases} totales`
                  : `Total acumulado según filtro activo en la Gerencia de Informática`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono block">
                {formatQuetzales(
                  filterMode === 'adjudicados' ? totalMontoAdjudicado :
                  filterMode === 'evaluacion' ? totalMontoEvaluacion :
                  filterMode === 'prescindidos' ? totalMontoPrescindido :
                  totalMontoAll
                )}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {filterMode === 'todos' 
                  ? `${adjudicados.length} adj. • ${enEvaluacion.length} eval. • ${prescindidos.length} presc.`
                  : `${filterMode.toUpperCase()}`}
              </span>
            </div>
          </div>

          {/* NOTA INSTITUCIONAL DE AUDITORÍA Y CUMPLIMIENTO */}
          <div className="my-6 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
            <p>
              <strong>Fundamento Institucional y Legal:</strong> El presente informe oficial constituye un registro formal para control de auditoría interna y fiscalización de la Contraloría General de Cuentas, emitido conforme a las facultades técnicas de la Gerencia de Informática del Organismo Judicial y en estricta observancia de los Artículos 9, 17, 38, 43 y conexos de la Ley de Contrataciones del Estado (Decreto 57-92) y su Reglamento.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN OFICIAL DE FIRMAS Y SELLOS (IMPRIMIBLE)                            */}
          {/* ========================================================================= */}
          <div className="pt-8 mt-8 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs">
            <div className="space-y-1">
              <div className="border-b border-slate-400 pb-1 mb-1 min-h-[45px] flex items-end justify-center">
                <span className="text-[10px] text-slate-400 italic">Firma y Sello</span>
              </div>
              <span className="font-bold text-slate-900 block">
                {currentUser?.nombreCompleto || 'Especialista Técnico GIT'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {currentUser?.cargo || 'Especialista de Sistemas / Redes'}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Elaborado por (GIT)
              </span>
            </div>

            <div className="space-y-1">
              <div className="border-b border-slate-400 pb-1 mb-1 min-h-[45px] flex items-end justify-center">
                <span className="text-[10px] text-slate-400 italic">Firma y Sello</span>
              </div>
              <span className="font-bold text-slate-900 block">
                Jefatura de Área Requirente
              </span>
              <span className="text-[10px] text-slate-500 block">
                Unidad Solicitante Institucional
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Revisado por Jefatura
              </span>
            </div>

            <div className="space-y-1">
              <div className="border-b border-slate-400 pb-1 mb-1 min-h-[45px] flex items-end justify-center">
                <span className="text-[10px] text-slate-400 italic">Firma y Sello</span>
              </div>
              <span className="font-bold text-slate-900 block">
                Gerente de Informática
              </span>
              <span className="text-[10px] text-slate-500 block">
                Organismo Judicial de Guatemala
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Vo.Bo. / Autorizado
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
