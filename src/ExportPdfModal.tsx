import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseRecord, User } from '../types';
import { generatePurchasesPDF } from '../utils/pdfExport';
import { formatQuetzales } from '../utils/formatters';
import { 
  FileText, 
  X, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  AlertTriangle, 
  Sliders, 
  FileCheck2, 
  Layers, 
  Check, 
  HelpCircle,
  BarChart3,
  DollarSign,
  Building2,
  Sparkles,
  Files
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateExecutiveKPIs } from '../utils/pdfChartRenderer';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

interface ExportPdfModalProps {
  purchases: PurchaseRecord[];
  allPurchases?: PurchaseRecord[];
  currentUser: User | null;
  filterInfo?: {
    search?: string;
    status?: string;
    area?: string;
    category?: string;
  };
  initialSelectedArea?: string;
  initialTab?: 'porArea' | 'graficas' | 'configuracion';
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (filename: string) => void;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  purchases,
  allPurchases,
  currentUser,
  filterInfo,
  initialSelectedArea,
  initialTab,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'porArea' | 'graficas' | 'configuracion'>('porArea');
  const [selectedArea, setSelectedArea] = useState<string>('todas');
  const [documentTitle, setDocumentTitle] = useState('REPORTE OFICIAL DE ADQUISICIONES TECNOLÓGICAS');
  const [documentSubtitle, setDocumentSubtitle] = useState('Control institucional de eventos NOG, formularios F56-e y dictámenes técnicos de TI');
  const [includeChartsInPdf, setIncludeChartsInPdf] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentArea: string } | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Colección total disponible para calcular el listado de áreas
  const allAvailablePurchases = useMemo(() => {
    return allPurchases && allPurchases.length > 0 ? allPurchases : purchases;
  }, [allPurchases, purchases]);

  // Desglose de todas las áreas con su conteo y presupuesto
  const availableAreas = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    allAvailablePurchases.forEach(p => {
      const a = (p.areaSolicitante || '').trim() || 'Soporte Técnico';
      if (!map[a]) map[a] = { count: 0, amount: 0 };
      map[a].count += 1;
      map[a].amount += (Number(p.monto) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [allAvailablePurchases]);

  const totalGlobalAmount = useMemo(() => {
    return allAvailablePurchases.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [allAvailablePurchases]);

  // Sincronizar selección inicial de área y pestaña al abrir el modal
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else if (initialSelectedArea && initialSelectedArea !== 'todas') {
        setActiveTab('porArea');
      } else {
        setActiveTab('porArea');
      }

      let areaToSet = initialSelectedArea || (filterInfo?.area && filterInfo.area !== 'todos' && filterInfo.area !== 'todas' ? filterInfo.area : '');
      if (!areaToSet && availableAreas.length > 0) {
        areaToSet = availableAreas[0][0];
      }
      if (!areaToSet) areaToSet = 'todas';

      setSelectedArea(areaToSet);
      if (areaToSet !== 'todas') {
        setDocumentTitle(`REPORTE OFICIAL DE ADQUISICIONES • ${areaToSet.toUpperCase()}`);
        setDocumentSubtitle(`Control institucional de eventos NOG y dictámenes técnicos • Área: ${areaToSet}`);
      } else {
        setDocumentTitle('REPORTE OFICIAL DE ADQUISICIONES TECNOLÓGICAS');
        setDocumentSubtitle('Control institucional de eventos NOG, formularios F56-e y dictámenes técnicos de TI');
      }
    }
  }, [isOpen, initialSelectedArea, initialTab, filterInfo?.area, availableAreas]);

  // Adquisiciones activas según el filtro de área seleccionado en el modal
  const activePurchases = useMemo(() => {
    if (activeTab === 'graficas' || selectedArea === 'todas') {
      return (purchases && purchases.length > 0) ? purchases : allAvailablePurchases;
    }
    const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const target = clean(selectedArea);
    return allAvailablePurchases.filter(p => {
      const a = clean(p.areaSolicitante || '');
      return a === target;
    });
  }, [activeTab, allAvailablePurchases, purchases, selectedArea]);

  // Cálculos de KPIs y datos para gráficas de círculo sobre las adquisiciones activas
  const { kpis, estatusChartData, modalidadChartData, dictamenChartData, areaChartData, categoryChartData, recommendations } =
    useMemo(() => calculateExecutiveKPIs(activePurchases), [activePurchases]);

  if (!isOpen) return null;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleAreaChange = (newArea: string) => {
    setSelectedArea(newArea);
    if (newArea === 'todas') {
      setDocumentTitle('REPORTE OFICIAL DE ADQUISICIONES TECNOLÓGICAS');
      setDocumentSubtitle('Control institucional de eventos NOG, formularios F56-e y dictámenes técnicos de TI');
    } else {
      setDocumentTitle(`REPORTE OFICIAL DE ADQUISICIONES • ${newArea.toUpperCase()}`);
      setDocumentSubtitle(`Control institucional de eventos NOG y dictámenes técnicos • Área: ${newArea}`);
    }
  };

  const handleDownloadSingleArea = (areaName: string) => {
    handleAreaChange(areaName);
    const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const target = clean(areaName);
    const areaPurchases = allAvailablePurchases.filter(p => {
      const a = clean(p.areaSolicitante || '');
      return a === target;
    });

    if (areaPurchases.length === 0) {
      showToast({
        type: 'warning',
        title: 'Sin Adquisiciones',
        message: `El área "${areaName}" no registra adquisiciones disponibles.`,
        duration: 4000,
      });
      return;
    }

    try {
      const cleanArea = areaName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = generatePurchasesPDF({
        purchases: areaPurchases,
        title: `REPORTE OFICIAL DE ADQUISICIONES • ${areaName.toUpperCase()}`,
        subtitle: `Control institucional de eventos NOG y dictámenes técnicos • Área: ${areaName}`,
        filterInfo: { ...filterInfo, area: areaName },
        currentUser,
        filenamePrefix: `Reporte_Adquisiciones_${cleanArea}_OJ`,
        includeCharts: includeChartsInPdf,
      });
      setDownloadSuccess(filename);
      onSuccess?.(filename);
      showToast({
        type: 'success',
        title: 'Reporte del Área Descargado',
        message: `Se descargó el reporte oficial para ${areaName} con portada ejecutiva, KPIs y gráficas circulares (${filename}).`,
        duration: 5000,
      });
    } catch (err) {
      console.error('Error generando PDF de área:', err);
      showToast({
        type: 'error',
        title: 'Error al Generar PDF',
        message: `Ocurrió un inconveniente al generar el reporte de ${areaName}.`,
        duration: 5000,
      });
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      const cleanArea = selectedArea !== 'todas'
        ? selectedArea.replace(/[^a-zA-Z0-9]/g, '_')
        : 'GIT';
      const filename = generatePurchasesPDF({
        purchases: activePurchases,
        title: documentTitle,
        subtitle: documentSubtitle,
        filterInfo: {
          ...filterInfo,
          area: selectedArea !== 'todas' ? selectedArea : undefined,
        },
        currentUser,
        filenamePrefix: `Reporte_Adquisiciones_${cleanArea}_OJ`,
        includeCharts: includeChartsInPdf,
      });
      setDownloadSuccess(filename);
      onSuccess?.(filename);
      showToast({
        type: 'success',
        title: 'Reporte PDF Generado',
        message: includeChartsInPdf
          ? selectedArea !== 'todas'
            ? `Se descargó el reporte oficial para ${selectedArea} con portada ejecutiva y gráficas (${filename}).`
            : `Se descargó el reporte oficial consolidado con portada y gráficas (${filename}).`
          : `Se descargó el reporte oficial de adquisiciones (${filename}).`,
        duration: 5000,
      });
    } catch (err) {
      console.error('Error generando PDF:', err);
      showToast({
        type: 'error',
        title: 'Error al Generar PDF',
        message: 'Ocurrió un inconveniente al compilar el documento PDF oficial.',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchExportAllAreas = async () => {
    if (availableAreas.length === 0) return;
    setIsBatchExporting(true);
    try {
      let exportedCount = 0;
      for (let i = 0; i < availableAreas.length; i++) {
        const [areaName] = availableAreas[i];
        setBatchProgress({ current: i + 1, total: availableAreas.length, currentArea: areaName });
        const clean = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const s = clean(areaName);
        const areaPurchases = allAvailablePurchases.filter(p => {
          const a = clean(p.areaSolicitante || '');
          return a === s;
        });

        if (areaPurchases.length > 0) {
          const cleanArea = areaName.replace(/[^a-zA-Z0-9]/g, '_');
          generatePurchasesPDF({
            purchases: areaPurchases,
            title: `REPORTE OFICIAL DE ADQUISICIONES • ${areaName.toUpperCase()}`,
            subtitle: `Control institucional de adquisiciones y dictámenes técnicos • Área: ${areaName}`,
            filterInfo: { area: areaName },
            currentUser,
            filenamePrefix: `Reporte_Adquisiciones_${cleanArea}_OJ`,
            includeCharts: includeChartsInPdf,
          });
          exportedCount++;
          await new Promise(res => setTimeout(res, 600));
        }
      }
      showToast({
        type: 'success',
        title: 'Reportes por Área Descargados',
        message: `Se descargaron ${exportedCount} reportes oficiales independientes con portada ejecutiva y gráficas.`,
        duration: 6000,
      });
    } catch (err) {
      console.error('Error en exportación por lote:', err);
      showToast({
        type: 'error',
        title: 'Error en Exportación Masiva',
        message: 'Ocurrió un inconveniente durante la descarga por lote de reportes.',
        duration: 5000,
      });
    } finally {
      setIsBatchExporting(false);
      setBatchProgress(null);
    }
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-4 max-h-[94vh]">
        
        {/* Encabezado del Modal con Cintilla Azul Oscuro Institucional */}
        <div 
          className="p-4 text-white flex items-center justify-between border-b border-blue-900 shadow-sm shrink-0 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 text-white border border-white/20 shadow-inner">
              <PieChartIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  REPORTE OFICIAL DE ADQUISICIONES TECNOLÓGICAS
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/15 text-amber-300 border border-white/20">
                  Panel & KPIs
                </span>
              </div>
              <p className="text-[11px] text-indigo-100">
                Organismo Judicial • Gerencia de Informática • Análisis con gráficas de círculo y decisiones de compra
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas Superiores de Navegación del Modal */}
        <div className="bg-slate-100/80 px-4 sm:px-6 py-2 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('porArea');
                if (selectedArea === 'todas' && availableAreas.length > 0) {
                  handleAreaChange(availableAreas[0][0]);
                }
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'porArea'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeTab === 'porArea' ? 'text-amber-300' : 'text-blue-700'}`} />
              <span>Exportar por Área ({availableAreas.length} Áreas)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('graficas');
                handleAreaChange('todas');
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'graficas'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <PieChartIcon className={`w-3.5 h-3.5 ${activeTab === 'graficas' ? 'text-amber-300' : 'text-slate-400'}`} />
              <span>Consolidado Global ({allAvailablePurchases.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('configuracion')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'configuracion'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Sliders className={`w-3.5 h-3.5 ${activeTab === 'configuracion' ? 'text-amber-300' : 'text-slate-400'}`} />
              <span>Configuración</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <input
                type="checkbox"
                checked={includeChartsInPdf}
                onChange={(e) => setIncludeChartsInPdf(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="hidden sm:inline">Incluir Gráficas Circulares en el PDF</span>
              <span className="sm:hidden">Gráficas en PDF</span>
            </label>
          </div>
        </div>

        {/* Contenido Dinámico con Scroll */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">

          {/* ============================================================== */}
          {/* PESTAÑA 1: EXPORTACIÓN EXCLUSIVA POR ÁREA SOLICITANTE        */}
          {/* ============================================================== */}
          {activeTab === 'porArea' && (
            <div className="space-y-6">

              {/* Panel Superior de Selección y Exportación por Área */}
              <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/80 rounded-2xl p-4 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Reporte de Adquisiciones por Área Solicitante
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                          {selectedArea !== 'todas' ? `Área: ${selectedArea}` : 'Seleccione un área'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Genere el informe oficial individual para cada área de TI o descargue un archivo independiente por cada dependencia para enviarles su balance de adquisiciones, con portada ejecutiva, KPIs y gráficas circulares.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {availableAreas.length > 1 && (
                      <button
                        type="button"
                        onClick={handleBatchExportAllAreas}
                        disabled={isGenerating || isBatchExporting}
                        className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Generar y descargar un PDF independiente para cada área técnica automáticamente"
                      >
                        <Files className="w-4 h-4 text-white" />
                        <span>
                          {isBatchExporting 
                            ? `Exportando ${batchProgress?.current}/${batchProgress?.total} (${batchProgress?.currentArea})...`
                            : `Exportar Todas las Áreas (${availableAreas.length} PDFs)`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Directorio de Áreas Técnicas en Tarjetas Interactivas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Directorio de Dependencias Técnicas Registradas ({availableAreas.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Haga clic para previsualizar o descargar directamente
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {availableAreas.map(([areaName, data]) => {
                      const isSelected = selectedArea === areaName;
                      return (
                        <div
                          key={`card-area-${areaName}`}
                          onClick={() => handleAreaChange(areaName)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600/30 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-950 font-black' : 'text-slate-800'}`} title={areaName}>
                                {areaName}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white shrink-0">
                                Activa
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
                            <span className="text-slate-500 text-[11px]">
                              {data.count} {data.count === 1 ? 'adquisición' : 'adquisiciones'}
                            </span>
                            <span className="font-bold font-mono text-slate-900 text-xs">
                              {formatQuetzales(data.amount)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                              {isSelected ? '✓ Viendo panel y gráficas' : 'Seleccionar'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadSingleArea(areaName);
                              }}
                              className="px-2 py-1 rounded bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                              title={`Descargar PDF oficial exclusivo para ${areaName}`}
                            >
                              <Download className="w-3 h-3 text-blue-600" />
                              <span>Descargar PDF</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selector rápido alternativo */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 items-center">
                  <div className="md:col-span-8">
                    <label htmlFor="select-export-area-modal" className="sr-only">Área Solicitante</label>
                    <div className="relative">
                      <select
                        id="select-export-area-modal"
                        value={selectedArea}
                        onChange={(e) => handleAreaChange(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl border border-blue-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                      >
                        {availableAreas.map(([areaName, data]) => (
                          <option key={areaName} value={areaName}>
                            🏢 {areaName} ({data.count} {data.count === 1 ? 'adquisición' : 'adquisiciones'} • {formatQuetzales(data.amount)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex items-center justify-end gap-2 text-xs">
                    <span className="text-slate-500 font-medium text-[11px]">Expedientes en este reporte:</span>
                    <span className="px-3 py-1 rounded-lg bg-blue-900 text-white font-mono font-bold text-xs shadow-2xs">
                      {activePurchases.length} {activePurchases.length === 1 ? 'evento' : 'eventos'} ({formatQuetzales(activePurchases.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))})
                    </span>
                  </div>
                </div>
              </div>

              {/* Indicador de Visualización Activa para el Área */}
              <div className="p-3 rounded-xl bg-blue-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-bold">
                    Panel Ejecutivo y Gráficas de Círculo: <strong className="text-amber-300 uppercase">{selectedArea}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-indigo-200 text-[11px]">Total: {formatQuetzales(kpis.totalAmount)} ({kpis.totalPurchases} eventos)</span>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || activePurchases.length === 0}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Reporte PDF del Área</span>
                  </button>
                </div>
              </div>

              {/* 1. Tarjetas de KPIs Ejecutivos para Toma de Decisiones */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* KPI 1: Presupuesto Total */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Presupuesto del Área</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-base sm:text-lg font-black text-slate-900 font-mono block">
                      {formatQuetzales(kpis.totalAmount)}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {kpis.totalPurchases} adquisiciones registradas
                    </span>
                  </div>
                </div>

                {/* KPI 2: Tasa de Adjudicación */}
                <div className="bg-blue-50/50 border border-blue-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between text-blue-700 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Efectividad Adjudicación</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg sm:text-xl font-black text-blue-800 font-mono">
                        {kpis.adjudicationRate.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-blue-600 font-bold">
                        ({kpis.adjudicatedCount} resueltas)
                      </span>
                    </div>
                    <div className="w-full bg-blue-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, kpis.adjudicationRate)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* KPI 3: Cobertura Dictamen GIT */}
                <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between text-emerald-700 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Dictámenes Técnicos GIT</span>
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg sm:text-xl font-black text-emerald-800 font-mono">
                        {kpis.dictamenRate.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-emerald-600 font-bold">
                        ({kpis.dictamenCount} con dictamen)
                      </span>
                    </div>
                    <div className="w-full bg-emerald-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, kpis.dictamenRate)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* KPI 4: Ticket Promedio / Área Asignada */}
                <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between text-amber-700 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Unidad / Ticket Promedio
                    </span>
                    <Building2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-black text-amber-900 font-mono block truncate" title={selectedArea}>
                      {selectedArea}
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium mt-0.5 block truncate">
                      Ticket promedio: {formatQuetzales(kpis.averageTicket)}
                    </span>
                  </div>
                </div>

              </div>

              {/* 2. Cuadrícula de 4 Gráficas Circulares Amplias y con Desglose Nítido */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Gráfica 1: Estatus del Evento */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        1. Distribución por Estatus del Evento
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Adjudicados vs Evaluación vs Prescindidos vs Desiertos de esta unidad
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold font-mono">
                      {kpis.totalPurchases} Total
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Gráfica Donut */}
                    <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                      {estatusChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
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
                                <Cell key={`cell-estatus-area-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-slate-400">Sin datos</div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-black font-mono text-slate-800">{kpis.totalPurchases}</span>
                        <span className="text-[8px] font-bold uppercase text-slate-400">Eventos</span>
                      </div>
                    </div>

                    {/* Desglose Nítido y Legible */}
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
                            <span className="font-bold font-mono text-blue-950 text-xs whitespace-nowrap">
                              {formatQuetzales(item.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Gráfica 2: Modalidad de Compra LCE */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        2. Modalidades de Compra (Ley Contrataciones)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Distribución oficial según Ley de Contrataciones del Estado (LCE)
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 text-xs font-bold font-mono">
                      LCE Art. 43
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Gráfica Donut */}
                    <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                      {modalidadChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
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
                                <Cell key={`cell-mod-area-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-slate-400">Sin datos</div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-black font-mono text-slate-800">{modalidadChartData.length}</span>
                        <span className="text-[8px] font-bold uppercase text-slate-400">Modalidades</span>
                      </div>
                    </div>

                    {/* Desglose Nítido y Legible */}
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
                            <span className="font-bold font-mono text-purple-950 text-xs whitespace-nowrap">
                              {formatQuetzales(item.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Gráfica 3: Cobertura Dictamen Técnico GIT */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        3. Cobertura de Dictamen Técnico GIT
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Auditoría y control de cumplimiento tecnológico
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-bold font-mono">
                      {kpis.dictamenRate.toFixed(0)}% Conforme
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Gráfica Donut */}
                    <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                      {dictamenChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
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
                                <Cell key={`cell-git-area-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-slate-400">Sin datos</div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-black font-mono text-emerald-700">{kpis.dictamenRate.toFixed(0)}%</span>
                        <span className="text-[8px] font-bold uppercase text-slate-400">Cobertura</span>
                      </div>
                    </div>

                    {/* Desglose Nítido y Legible */}
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

                {/* Gráfica 4: Categorías Tecnológicas de la Unidad */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        {`4. Categorías Tecnológicas (${selectedArea})`}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Distribución presupuestaria por tipo de bien o servicio de esta unidad
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-bold font-mono">
                      {categoryChartData.length} Categorías
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Gráfica Donut */}
                    <div className="sm:col-span-5 h-56 relative flex items-center justify-center">
                      {categoryChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryChartData}
                              dataKey="amount"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={46}
                              outerRadius={68}
                              paddingAngle={3}
                            >
                              {categoryChartData.map((entry, index) => (
                                <Cell key={`cell-fourth-area-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-slate-400">Sin datos</div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-black font-mono text-slate-800">{formatQuetzales(kpis.totalAmount).split('.')[0]}</span>
                        <span className="text-[8px] font-bold uppercase text-slate-400">Total GTQ</span>
                      </div>
                    </div>

                    {/* Desglose Nítido y Legible */}
                    <div className="sm:col-span-7 space-y-1.5 overflow-y-auto max-h-56 pr-1">
                      {categoryChartData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                            <span className="font-semibold text-slate-800 truncate" title={item.name}>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-white border border-slate-200 text-slate-700">
                              {item.value} ({item.percentage}%)
                            </span>
                            <span className="font-bold font-mono text-indigo-950 text-xs whitespace-nowrap">
                              {formatQuetzales(item.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. Panel de Hallazgos y Sugerencias de Toma de Decisiones */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Hallazgos y Observaciones Técnicas para {selectedArea}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendations.map((rec, rIdx) => (
                    <div 
                      key={`rec-area-${rIdx}`}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        rec.type === 'warning'
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : rec.type === 'success'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-blue-50/70 border-blue-200 text-blue-900'
                      }`}
                    >
                      <p className="font-bold flex items-center gap-1.5">
                        {rec.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
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
              </div>

              {/* 4. Previsualización de Adquisiciones de esta Unidad */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Adquisiciones Incluidas en el Reporte de {selectedArea} ({activePurchases.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Página 2+ de la exportación PDF oficial
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">NOG</th>
                        <th className="px-3 py-2">F56-e</th>
                        <th className="px-3 py-2">Descripción</th>
                        <th className="px-3 py-2">Dictamen</th>
                        <th className="px-3 py-2">Estatus</th>
                        <th className="px-3 py-2 text-right">Monto (GTQ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activePurchases.slice(0, 5).map((p, idx) => (
                        <tr key={`prev-${p.id || idx}`} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-blue-900">{p.nog || '-'}</td>
                          <td className="px-3 py-2 text-slate-700">{p.f56e || p.f56 || '-'}</td>
                          <td className="px-3 py-2 text-slate-800 max-w-xs truncate" title={p.descripcion}>{p.descripcion || '-'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              (p.evaluadoGIT === 'Sí' || p.fechaDictamenGIT) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {(p.evaluadoGIT === 'Sí' || p.fechaDictamenGIT) ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              {p.estatusEvento || 'Evaluación'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {formatQuetzales(p.monto || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {activePurchases.length > 5 && (
                  <p className="text-[11px] text-slate-500 text-center italic">
                    Mostrando las primeras 5 adquisiciones de {activePurchases.length}. El reporte oficial en PDF compilará todas las adquisiciones con foliación y firma de auditoría.
                  </p>
                )}
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 2: CONSOLIDADO GLOBAL INSTITUCIONAL                    */}
          {/* ============================================================== */}
          {activeTab === 'graficas' && (
            <div className="space-y-6">

              {/* Banner Institucional Global */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <PieChartIcon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                      Consolidado Global de Adquisiciones Institucionales
                    </h4>
                    <p className="text-[11px] text-indigo-200">
                      Análisis macro y balance institucional consolidando todas las {allAvailablePurchases.length} adquisiciones registradas en el Organismo Judicial.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-white/10 text-amber-300 font-mono font-bold text-xs border border-white/20">
                    {formatQuetzales(totalGlobalAmount)}
                  </span>
                </div>
              </div>

              {/* 1. Tarjetas de KPIs Ejecutivos Globales */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* KPI 1: Presupuesto Total */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Presupuesto Analizado</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-base sm:text-lg font-black text-slate-900 font-mono block">
                      {formatQuetzales(kpis.totalAmount)}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {kpis.totalPurchases} adquisiciones totales
                    </span>
                  </div>
                </div>

                {/* KPI 2: Tasa de Adjudicación */}
                <div className="bg-blue-50/50 border border-blue-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between text-blue-700 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Efectividad Adjudicación</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg sm:text-xl font-black text-blue-800 font-mono">
                        {kpis.adjudicationRate.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-blue-600 font-bold">
                        ({kpis.adjudicatedCount} resueltas)
                      </span>
                    </div>
                    <div className="w-full bg-blue-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, kpis.adjudicationRate)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* KPI 3: Cobertura Dictamen GIT */}
                <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between text-emerald-700 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Dictámenes Técnicos GIT</span>
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg sm:text-xl font-black text-emerald-800 font-mono">
                        {kpis.dictamenRate.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-emerald-600 font-bold">
                        ({kpis.dictamenCount} dictaminadas)
                      </span>
                    </div>
                    <div className="w-full bg-emerald-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, kpis.dictamenRate)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* KPI 4: Ticket Promedio / Área Asignada */}
                <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between text-amber-700 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Ticket Medio / Modalidad
                    </span>
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-black text-amber-900 font-mono block truncate">
                      {formatQuetzales(kpis.averageTicket)}
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium mt-0.5 block truncate">
                      Predomina: {kpis.modalidadPredominante}
                    </span>
                  </div>
                </div>

              </div>

              {/* 2. Cuadrícula de 4 Gráficas Circulares Globales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Gráfica 1: Estatus del Evento */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        1. Distribución por Estatus del Evento
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Adjudicados vs Evaluación vs Prescindidos vs Desiertos
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold font-mono">
                      {kpis.totalPurchases} Total
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                      {estatusChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
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
                                <Cell key={`cell-estatus-glob-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-slate-400">Sin datos</div>
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
                            <span className="font-bold font-mono text-blue-950 text-xs whitespace-nowrap">
                              {formatQuetzales(item.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Gráfica 2: Modalidad de Compra LCE */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        2. Modalidades de Compra (Ley Contrataciones)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Distribución oficial según Ley de Contrataciones del Estado (LCE)
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 text-xs font-bold font-mono">
                      LCE Art. 43
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                      {modalidadChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
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
                                <Cell key={`cell-mod-glob-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-slate-400">Sin datos</div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-black font-mono text-slate-800">{modalidadChartData.length}</span>
                        <span className="text-[8px] font-bold uppercase text-slate-400">Modalidades</span>
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
                            <span className="font-bold font-mono text-purple-950 text-xs whitespace-nowrap">
                              {formatQuetzales(item.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Gráfica 3: Cobertura Dictamen Técnico GIT */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        3. Cobertura de Dictamen Técnico GIT
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Auditoría y control de cumplimiento tecnológico
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-bold font-mono">
                      {kpis.dictamenRate.toFixed(0)}% Conforme
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
                      {dictamenChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
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
                                <Cell key={`cell-git-glob-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-slate-400">Sin datos</div>
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

                {/* Gráfica 4: Concentración Presupuestaria por Área */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        4. Inversión por Área Solicitante de TI
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Concentración del gasto en tecnología por unidad
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-bold font-mono">
                      {areaChartData.length} Áreas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5 h-56 relative flex items-center justify-center">
                      {areaChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
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
                                <Cell key={`cell-fourth-glob-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-slate-400">Sin datos</div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-black font-mono text-slate-800">{formatQuetzales(kpis.totalAmount).split('.')[0]}</span>
                        <span className="text-[8px] font-bold uppercase text-slate-400">Total GTQ</span>
                      </div>
                    </div>

                    <div className="sm:col-span-7 space-y-1.5 overflow-y-auto max-h-56 pr-1">
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
                            <span className="font-bold font-mono text-indigo-950 text-xs whitespace-nowrap">
                              {formatQuetzales(item.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. Panel de Hallazgos Globales */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Hallazgos Clave para Toma de Decisiones Estratégicas Institucionales
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendations.map((rec, rIdx) => (
                    <div 
                      key={`rec-glob-${rIdx}`}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        rec.type === 'warning'
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : rec.type === 'success'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-blue-50/70 border-blue-200 text-blue-900'
                      }`}
                    >
                      <p className="font-bold flex items-center gap-1.5">
                        {rec.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
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
              </div>

            </div>
          )}

          {activeTab === 'configuracion' && (
            <div className="space-y-4">
              
              {/* Vista previa de Cabecera Institucional */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div 
                  className="p-3.5 text-white flex items-center justify-between border-b border-indigo-900"
                  style={{ backgroundColor: '#0A0A69' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center border border-white/20 shrink-0">
                      <img
                        src="/organismo_judicial_logo.png"
                        alt="Logo Organismo Judicial"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-wide text-white uppercase">Organismo Judicial de Guatemala</h4>
                      <p className="text-[10px] font-bold text-white">Gerencia de Informática</p>
                      <p className="text-[9px] text-indigo-100">Sistema Integral de Control de Adquisiciones de TI</p>
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <span className="text-[9px] uppercase font-bold text-white block">Control de Auditoría</span>
                    <span className="text-xs font-mono font-bold text-amber-300 block">AUD-OJ-2026-OFICIAL</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 text-xs space-y-1.5 border-b border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Fecha de Emisión: <strong className="text-slate-900">{dateFormatted}, {timeFormatted}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Auditor / Emisor: <strong className="text-slate-900">{currentUser?.nombreCompleto || 'Auditor GIT'} ({currentUser?.rol || 'Administrador'})</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulario de parámetros */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Parámetros del Documento Oficial</h4>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título Institucional del Reporte
                  </label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subtítulo / Objeto del Documento
                  </label>
                  <input
                    type="text"
                    value={documentSubtitle}
                    onChange={(e) => setDocumentSubtitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeChartsInPdf}
                      onChange={(e) => setIncludeChartsInPdf(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Incluir Página de Análisis Ejecutivo con Gráficas Circulares (Pág. 1)
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Incrusta 4 gráficos circulares de alta definición con distribución de estatus, modalidades LCE, dictámenes GIT y concentración presupuestaria por área, más tabla de decisiones.
                      </span>
                    </div>
                  </label>
                </div>

                {filterInfo && (
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">Filtros actualmente aplicados: </span>
                    {filterInfo.status && filterInfo.status !== 'todos' ? `Estatus: ${filterInfo.status}, ` : ''}
                    {filterInfo.area && filterInfo.area !== 'todas' ? `Área: ${filterInfo.area}, ` : ''}
                    {filterInfo.search ? `Búsqueda: "${filterInfo.search}"` : 'Sin filtros de texto'}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Aviso de confirmación de descarga */}
          {downloadSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">¡PDF institucional generado y descargado exitosamente!</p>
                <p className="text-[10px] font-mono text-emerald-700 mt-0.5">{downloadSuccess}</p>
              </div>
            </div>
          )}

        </div>

        {/* Barra de Acciones Inferior */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Documento certificado para fiscalización y auditoría</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            {availableAreas.length > 1 && (
              <button
                type="button"
                onClick={handleBatchExportAllAreas}
                disabled={isGenerating || isBatchExporting}
                className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Genera y descarga un archivo PDF oficial para cada departamento de forma individual"
              >
                <Files className="w-4 h-4 text-white" />
                <span>
                  {isBatchExporting 
                    ? (batchProgress ? `Exportando ${batchProgress.current}/${batchProgress.total} (${batchProgress.currentArea})...` : 'Exportando Lote...') 
                    : 'Exportar Todas las Áreas'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || activePurchases.length === 0}
              className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGenerating
                  ? 'Generando PDF Oficial...'
                  : includeChartsInPdf
                  ? selectedArea !== 'todas'
                    ? `Descargar Reporte PDF (${selectedArea})`
                    : 'Descargar Reporte PDF Global'
                  : selectedArea !== 'todas'
                    ? `Descargar Reporte (${selectedArea})`
                    : 'Descargar Reporte PDF'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
