import React, { useState, useMemo } from 'react';
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
  Sparkles
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
  currentUser: User | null;
  filterInfo?: {
    search?: string;
    status?: string;
    area?: string;
    category?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (filename: string) => void;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  purchases,
  currentUser,
  filterInfo,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'graficas' | 'configuracion'>('graficas');
  const [documentTitle, setDocumentTitle] = useState('REPORTE OFICIAL DE ADQUISICIONES TECNOLÓGICAS');
  const [documentSubtitle, setDocumentSubtitle] = useState('Control institucional de eventos NOG, formularios F56-e y dictámenes técnicos de TI');
  const [includeChartsInPdf, setIncludeChartsInPdf] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Cálculos de KPIs y datos para gráficas de círculo
  const { kpis, estatusChartData, modalidadChartData, dictamenChartData, areaChartData, recommendations } =
    useMemo(() => calculateExecutiveKPIs(purchases), [purchases]);

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

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      const filename = generatePurchasesPDF({
        purchases,
        title: documentTitle,
        subtitle: documentSubtitle,
        filterInfo,
        currentUser,
        filenamePrefix: 'Reporte_Adquisiciones_GIT_OJ',
        includeCharts: includeChartsInPdf,
      });
      setDownloadSuccess(filename);
      onSuccess?.(filename);
      showToast({
        type: 'success',
        title: 'Reporte PDF Generado',
        message: includeChartsInPdf
          ? `Se descargó el reporte oficial con portada ejecutiva y gráficas circulares (${filename}).`
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
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('graficas')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'graficas'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <PieChartIcon className={`w-3.5 h-3.5 ${activeTab === 'graficas' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Gráficas de Círculo & KPIs ({purchases.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('configuracion')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'configuracion'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Sliders className={`w-3.5 h-3.5 ${activeTab === 'configuracion' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Configuración del Reporte</span>
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

          {activeTab === 'graficas' && (
            <div className="space-y-6">

              {/* 1. Tarjetas de KPIs Ejecutivos para Toma de Decisiones */}
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

                {/* KPI 4: Ticket Promedio & Modalidad */}
                <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between text-amber-700 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Ticket Medio / Modalidad</span>
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-black text-amber-900 font-mono block">
                      {formatQuetzales(kpis.averageTicket)}
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium mt-0.5 block truncate">
                      Predomina: <strong>{kpis.modalidadPredominante}</strong>
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
                        Adjudicados vs Evaluación vs Prescindidos vs Desiertos
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
                                <Cell key={`cell-estatus-${index}`} fill={entry.color} />
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
                                <Cell key={`cell-mod-${index}`} fill={entry.color} />
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
                                <Cell key={`cell-git-${index}`} fill={entry.color} />
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
                      Top Áreas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Gráfica Donut */}
                    <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
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
                                <Cell key={`cell-area-${index}`} fill={entry.color} />
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
                    Hallazgos Clave para Toma de Decisiones Estratégicas
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendations.map((rec, rIdx) => (
                    <div 
                      key={`rec-${rIdx}`}
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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || purchases.length === 0}
              className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGenerating
                  ? 'Generando PDF Oficial...'
                  : includeChartsInPdf
                  ? 'Descargar Reporte PDF con Gráficas'
                  : 'Descargar Reporte PDF'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
