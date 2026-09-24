import React, { useState } from 'react';
import { JudicaturaRecord, User } from '../types';
import { generateConsolidatedJudicaturasPDF } from '../utils/judicaturasPdfExport';
import { OJ_LOGO_DATA_URI } from '../utils/ojLogoAsset';
import {
  FileText,
  X,
  Download,
  CheckCircle2,
  ShieldCheck,
  Scale,
  BarChart2,
  Table,
  Layers,
  Calendar,
  Sparkles,
  Info,
  Check,
  Building2,
  FolderTree,
} from 'lucide-react';

interface ConsolidatedJudicaturasPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  allJudicaturas: JudicaturaRecord[];
  filteredJudicaturas: JudicaturaRecord[];
  currentUser: User | null;
  filterInfo?: {
    search?: string;
    ramo?: string;
    equipamiento?: string;
    estadoInauguracion?: string;
  };
  onSuccess?: (filename: string) => void;
}

export const ConsolidatedJudicaturasPdfModal: React.FC<ConsolidatedJudicaturasPdfModalProps> = ({
  isOpen,
  onClose,
  allJudicaturas,
  filteredJudicaturas,
  currentUser,
  filterInfo,
  onSuccess,
}) => {
  const { showToast } = useApp();

  // Tipo de reporte: Consolidado con cámaras separadas o específico por cámara
  const [reportType, setReportType] = useState<'consolidado' | 'penal' | 'civil'>('consolidado');
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  const [includeTable, setIncludeTable] = useState(true);
  const [includeGantt, setIncludeGantt] = useState(true);
  const [includeStatusMatrix, setIncludeStatusMatrix] = useState(true);
  const [groupByRamo, setGroupByRamo] = useState(true);

  const [documentTitle, setDocumentTitle] = useState(
    'REPORTE CONSOLIDADO DE CONTROL DE JUDICATURAS POR INAUGURAR'
  );
  const [documentSubtitle, setDocumentSubtitle] = useState(
    'Gerencia de Informática • Seguimiento Integral con Separación Analítica por Cámara Jurisdiccional'
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseJudicaturas = scope === 'filtered' ? filteredJudicaturas : allJudicaturas;
  const penalCount = baseJudicaturas.filter((j) => j.tipoRamo === 'Penal').length;
  const civilCount = baseJudicaturas.filter((j) => j.tipoRamo === 'Civil').length;

  const targetJudicaturas =
    reportType === 'penal'
      ? baseJudicaturas.filter((j) => j.tipoRamo === 'Penal')
      : reportType === 'civil'
      ? baseJudicaturas.filter((j) => j.tipoRamo === 'Civil')
      : baseJudicaturas;

  const equip100Count = targetJudicaturas.filter(
    (j) =>
      j.equipoComputo === 'Si' &&
      j.equipoAudio === 'Si' &&
      j.cableadoEstructurado === 'Si' &&
      j.enlaceDatos === 'Si'
  ).length;
  const inauguradasCount = targetJudicaturas.filter((j) => j.estadoInauguracion === 'Inaugurado').length;

  const handleGenerate = (targetTypeOverride?: 'consolidado' | 'penal' | 'civil') => {
    const selectedType = targetTypeOverride || reportType;
    let listToExport = baseJudicaturas;
    let titleToUse = 'REPORTE CONSOLIDADO DE CONTROL DE JUDICATURAS POR INAUGURAR';
    let subtitleToUse = 'Gerencia de Informática • Seguimiento Integral con Separación Analítica por Cámara Jurisdiccional';
    let effectiveGroupByRamo = groupByRamo;
    let prefix = 'Reporte_Consolidado_Judicaturas_Penal_y_Civil';

    if (selectedType === 'penal') {
      listToExport = baseJudicaturas.filter((j) => j.tipoRamo === 'Penal');
      titleToUse = 'REPORTE OFICIAL DE JUDICATURAS: CÁMARA PENAL';
      subtitleToUse = 'Gerencia de Informática • Órganos Jurisdiccionales del Ramo Penal en Adecuación y Apertura';
      effectiveGroupByRamo = false;
      prefix = 'Reporte_Judicaturas_Camara_Penal';
    } else if (selectedType === 'civil') {
      listToExport = baseJudicaturas.filter((j) => j.tipoRamo === 'Civil');
      titleToUse = 'REPORTE OFICIAL DE JUDICATURAS: CÁMARA PAZ CIVIL';
      subtitleToUse = 'Gerencia de Informática • Órganos Jurisdiccionales del Ramo Paz y Civil en Adecuación y Apertura';
      effectiveGroupByRamo = false;
      prefix = 'Reporte_Judicaturas_Camara_Paz_Civil';
    } else {
      effectiveGroupByRamo = true;
      titleToUse = documentTitle.trim() || 'REPORTE CONSOLIDADO DE CONTROL DE JUDICATURAS POR INAUGURAR';
      subtitleToUse = documentSubtitle.trim() || 'Gerencia de Informática • Seguimiento Integral con Separación Analítica por Cámara Jurisdiccional';
      prefix = 'Reporte_Consolidado_Judicaturas_Penal_y_Civil';
    }

    if (listToExport.length === 0) {
      showToast({
        title: 'Sin Registros',
        message: `No hay judicaturas disponibles para exportar en ${
          selectedType === 'penal' ? 'Cámara Penal' : selectedType === 'civil' ? 'Cámara Paz Civil' : 'el consolidado'
        }.`,
        type: 'warning',
      });
      return;
    }

    setIsGenerating(true);
    setDownloadSuccess(null);

    try {
      const filename = generateConsolidatedJudicaturasPDF({
        judicaturas: listToExport,
        title: titleToUse,
        subtitle: subtitleToUse,
        includeTable,
        includeGantt,
        includeStatusMatrix,
        groupByRamo: effectiveGroupByRamo,
        filterInfo:
          scope === 'filtered'
            ? {
                ...filterInfo,
                ramo: selectedType === 'penal' ? 'Penal' : selectedType === 'civil' ? 'Civil' : filterInfo?.ramo,
              }
            : undefined,
        currentUser,
        filenamePrefix: prefix,
      });

      setDownloadSuccess(filename);

      showToast({
        title: selectedType === 'consolidado' ? 'Reporte Consolidado Descargado' : 'Reporte de Cámara Descargado',
        message: `Se descargó "${filename}" con la cabecera y membrete oficial del Organismo Judicial.`,
        type: 'success',
      });

      if (onSuccess) {
        onSuccess(filename);
      }
    } catch (err) {
      console.error('Error al generar PDF:', err);
      showToast({
        title: 'Error al Generar Reporte',
        message: 'Ocurrió un inconveniente durante la compilación del PDF.',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal con Logotipo Institucional */}
        <div 
          className="text-white px-5 py-4 border-b border-indigo-900 flex items-center justify-between shrink-0 relative overflow-hidden shadow-xs"
          style={{ backgroundColor: '#0A0A69' }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center border border-white/20 shrink-0 shadow-xs">
              <img
                src={OJ_LOGO_DATA_URI}
                alt="Organismo Judicial de Guatemala"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-100 font-bold">
                  ORGANISMO JUDICIAL • GERENCIA DE INFORMÁTICA
                </span>
                <span className="px-2 py-0.2 rounded text-[9px] font-black uppercase bg-white/15 text-white border border-white/25">
                  Consolidado Oficial
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Reporte Consolidado en PDF (Tabla, Estados y Gantt)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-xs">
          {/* Garantía Institucional: Logotipo en todas las páginas */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>Garantía de Validez Oficial y Membrete Institucional</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 rounded-full font-black uppercase">
                  Todas las Páginas
                </span>
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                El documento se genera con el <strong>logotipo oficial del Organismo Judicial</strong> en el membrete
                superior de <strong>todas y cada una de las hojas</strong>, acompañado del código de auditoría digital,
                metadatos de emisión y paginación secuencial estandarizada.
              </p>
            </div>
          </div>

          {/* 1. Modalidad del Reporte Oficial */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                1. Modalidad del Reporte a Descargar
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {targetJudicaturas.length} judicaturas seleccionadas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Opción 1: Reporte Consolidado con Cámaras Separadas */}
              <button
                type="button"
                onClick={() => setReportType('consolidado')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                  reportType === 'consolidado'
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/25 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <FolderTree className="w-4 h-4 text-indigo-700 shrink-0" />
                      <span>Consolidado General</span>
                    </div>
                    {reportType === 'consolidado' ? (
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase bg-indigo-100 text-indigo-800">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-snug">
                    Reporte integral con <strong>Cámaras Penal y Civil separadas</strong> en secciones independientes, cuadro comparativo y Gantt agrupado.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-indigo-100 flex items-center justify-between text-[10px] font-mono font-bold text-indigo-900">
                  <span>Penal ({penalCount})</span>
                  <span>•</span>
                  <span>Civil ({civilCount})</span>
                </div>
              </button>

              {/* Opción 2: Solo Cámara Penal */}
              <button
                type="button"
                onClick={() => setReportType('penal')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                  reportType === 'penal'
                    ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-500/25 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <Scale className="w-4 h-4 text-purple-700 shrink-0" />
                      <span>Solo Cámara Penal</span>
                    </div>
                    {reportType === 'penal' ? (
                      <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase bg-purple-100 text-purple-800 font-mono">
                        {penalCount} sedes
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-snug">
                    Informe oficial especializado exclusivo de órganos jurisdiccionales del Ramo Penal.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-purple-100 flex items-center justify-between text-[10px] font-mono font-bold text-purple-900">
                  <span>Cámara Penal</span>
                  <span>{penalCount} Judicaturas</span>
                </div>
              </button>

              {/* Opción 3: Solo Cámara Paz Civil */}
              <button
                type="button"
                onClick={() => setReportType('civil')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                  reportType === 'civil'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/25 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>Solo Cámara Paz Civil</span>
                    </div>
                    {reportType === 'civil' ? (
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase bg-blue-100 text-blue-800 font-mono">
                        {civilCount} sedes
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-snug">
                    Informe oficial especializado exclusivo de órganos jurisdiccionales del Ramo Paz y Civil.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-blue-100 flex items-center justify-between text-[10px] font-mono font-bold text-blue-900">
                  <span>Cámara Paz Civil</span>
                  <span>{civilCount} Judicaturas</span>
                </div>
              </button>
            </div>
          </div>

          {/* Configuración de Alcance */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
              2. Alcance de Judicaturas a Exportar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-3 rounded-xl border text-left flex items-start justify-between cursor-pointer transition-all ${
                  scope === 'filtered'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-xs">Judicaturas Filtradas</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                      {filteredJudicaturas.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Aplica la búsqueda y filtros activos en la pantalla actual
                  </p>
                </div>
                {scope === 'filtered' && (
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left flex items-start justify-between cursor-pointer transition-all ${
                  scope === 'all'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-xs">Todas las Judicaturas</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px]">
                      {allJudicaturas.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Consolidado de todo el padrón de judicaturas sin restricciones
                  </p>
                </div>
                {scope === 'all' && (
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Secciones a Incluir en el Consolidado */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
              2. Secciones del Reporte Consolidado
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Sección 1: Tabla de Judicaturas y Resumen */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  includeTable
                    ? 'border-indigo-400 bg-indigo-50/50'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeTable}
                  onChange={(e) => setIncludeTable(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center gap-1 text-slate-900 font-bold text-xs">
                    <Table className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Tabla de Judicaturas</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    Resumen ejecutivo, fechas de adecuación e hitos de apertura
                  </p>
                </div>
              </label>

              {/* Sección 2: Diagrama de Gantt Cronológico */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  includeGantt
                    ? 'border-purple-400 bg-purple-50/50'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeGantt}
                  onChange={(e) => setIncludeGantt(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="flex items-center gap-1 text-slate-900 font-bold text-xs">
                    <BarChart2 className="w-3.5 h-3.5 text-purple-700" />
                    <span>Diagrama de Gantt</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    Cronograma semanal visual con barras de adecuación e hitos
                  </p>
                </div>
              </label>

              {/* Sección 3: Matriz de Estado TIC */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  includeStatusMatrix
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeStatusMatrix}
                  onChange={(e) => setIncludeStatusMatrix(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-1 text-slate-900 font-bold text-xs">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Estado de Cada Una</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    Matriz técnica: Cómputo, Audio, Red y Enlace de Telecomunicaciones
                  </p>
                </div>
              </label>
            </div>

            {/* Opción de Separar y Agrupar por Ramo */}
            <div className="pt-1">
              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  groupByRamo
                    ? 'border-indigo-300 bg-gradient-to-r from-purple-50/50 via-blue-50/50 to-indigo-50/50 ring-1 ring-indigo-400'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={groupByRamo}
                  onChange={(e) => setGroupByRamo(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-800"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-700" />
                      Separar y Agrupar Reporte por Ramo (Penal y Civil)
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                      Recomendado para análisis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Genera cuadro comparativo ejecutivo y secciones divididas para <strong>Cámara Penal ({penalCount})</strong> y <strong>Cámara Paz Civil ({civilCount})</strong> con subtotales específicos y análisis por cada ramo.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Tarjeta de Estadísticas del Reporte a Descargar */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Datos a Incluir en el Documento:
              </span>
              <span className="font-mono text-xs font-black text-blue-900">
                {targetJudicaturas.length} Judicatura{targetJudicaturas.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Cámara Penal:</span>
                <span className="font-bold text-purple-700 font-mono">{penalCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Cámara Paz Civil:</span>
                <span className="font-bold text-blue-700 font-mono">{civilCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Equipamiento TIC 100%:</span>
                <span className="font-bold text-emerald-700 font-mono">{equip100Count}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Inauguradas:</span>
                <span className="font-bold text-slate-800 font-mono">{inauguradasCount}</span>
              </div>
            </div>
          </div>

          {/* Mensaje de Éxito si ya se descargó */}
          {downloadSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-2.5 text-emerald-900 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-xs block">Descarga Completada</span>
                <span className="text-[11px] text-emerald-700 truncate block">
                  Archivo generado: <strong>{downloadSuccess}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción en el Pie del Modal */}
        <div className="bg-slate-100 px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Formato: PDF A4 Horizontal (Landscape) de alta definición</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            {/* Descarga Rápida Solo Penal */}
            <button
              type="button"
              onClick={() => handleGenerate('penal')}
              disabled={isGenerating || penalCount === 0}
              className="px-3 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-100 font-bold text-xs border border-purple-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Descargar reporte oficial exclusivo de Cámara Penal"
            >
              <Scale className="w-3.5 h-3.5 text-amber-300" />
              <span>Solo Penal</span>
            </button>

            {/* Descarga Rápida Solo Civil */}
            <button
              type="button"
              onClick={() => handleGenerate('civil')}
              disabled={isGenerating || civilCount === 0}
              className="px-3 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-blue-100 font-bold text-xs border border-blue-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Descargar reporte oficial exclusivo de Cámara Paz Civil"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Solo Civil</span>
            </button>

            {/* Descarga Principal Consolidada (Penal y Civil Separadas) */}
            <button
              type="button"
              onClick={() => handleGenerate('consolidado')}
              disabled={isGenerating || baseJudicaturas.length === 0 || (!includeTable && !includeGantt && !includeStatusMatrix)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md border border-amber-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Descargar Reporte Consolidado completo con Cámaras Penal y Civil separadas"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>{isGenerating ? 'Generando...' : 'Descargar Consolidado (Penal + Civil)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
