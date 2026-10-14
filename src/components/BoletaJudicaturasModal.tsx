import React, { useState } from 'react';
import { JudicaturaRecord } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';
import {
  Printer,
  X,
  CheckCircle2,
  XCircle,
  Download,
  Building2,
  Calendar,
  Clock,
  Star,
  FileText,
  ShieldCheck,
  Monitor,
  Volume2,
  Network,
  Wifi,
  FileCheck,
  ChevronRight,
  ArrowLeft,
  FolderOpen,
  History
} from 'lucide-react';
import { OJLogo } from './OJLogo';
import {
  getJudicaturaComputoInfo,
  getJudicaturaAudioInfo,
  getJudicaturaRedInfo,
  getJudicaturaEnlaceInfo,
  getComponentStatusBadgeClass,
  getJudicaturaComponentMetrics
} from '../utils/judicaturaComponentUtils';
import { generateIndividualJudicaturaPDF } from '../utils/judicaturasPdfExport';
import { useApp } from '../context/AppContext';

interface BoletaJudicaturasModalProps {
  judicatura: JudicaturaRecord;
  onClose: () => void;
}

type TabFicha = 'ficha' | 'observaciones' | 'documentos';

export const BoletaJudicaturasModal: React.FC<BoletaJudicaturasModalProps> = ({ judicatura, onClose }) => {
  const { currentUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<TabFicha>('ficha');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      setIsDownloadingPdf(true);
      const filename = generateIndividualJudicaturaPDF(judicatura, currentUser);
      showToast({
        title: 'Ficha Técnica Descargada',
        message: `Se descargó el documento oficial "${filename}".`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error al descargar ficha técnica en PDF:', err);
      showToast({
        title: 'Error al generar PDF',
        message: 'No fue posible exportar la ficha técnica.',
        type: 'error'
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const camaraNombre =
    judicatura.tipoRamo === 'Penal'
      ? 'Cámara Penal'
      : judicatura.tipoRamo === 'Civil'
      ? 'Cámara Civil'
      : 'Cámara Amparos';

  const estado = judicatura.estadoInauguracion || (judicatura.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');

  // Calcular días de adecuación
  let diasAdecuacion = 0;
  if (judicatura.fechaInicioAdecuaciones && judicatura.fechaFinAdecuaciones) {
    const start = new Date(judicatura.fechaInicioAdecuaciones);
    const end = new Date(judicatura.fechaFinAdecuaciones);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      diasAdecuacion = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const codigoJud = `JUD-${(judicatura.id || '000000').slice(-6).toUpperCase()}`;
  const metrics = getJudicaturaComponentMetrics(judicatura);
  const compInfo = metrics.computo;
  const audioInfo = metrics.audio;
  const redInfo = metrics.red;
  const enlaceInfo = metrics.enlace;

  const totalObservaciones = (judicatura.observaciones || []).length;
  const totalDocumentos = (judicatura.documentos || []).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      {/* Estilos para impresión apaisada (Landscape) */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Contenedor Modal Panorámico Horizontal */}
      <div className="relative w-full max-w-[96vw] xl:max-w-[1360px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[96vh]">
        
        {/* Barra Superior con Pestañas y Acciones Principales */}
        <div className="px-4 sm:px-6 py-2.5 text-white flex flex-wrap items-center justify-between gap-3 border-b border-blue-900 shadow-sm bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 shrink-0 no-print">
          
          {/* Selector de Pestañas para Separar la Ficha de las Observaciones y Documentos */}
          <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('ficha')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ficha'
                  ? 'bg-white text-blue-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-800" />
              <span>Ficha Técnica Oficial</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('observaciones')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'observaciones'
                  ? 'bg-white text-blue-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-700" />
              <span>Bitácora de Acciones ({totalObservaciones})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('documentos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'documentos'
                  ? 'bg-white text-blue-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Expediente y Documentos ({totalDocumentos})</span>
            </button>
          </div>

          {/* Acciones de Exportación e Impresión */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Descargar Ficha en PDF"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>{isDownloadingPdf ? 'Generando...' : 'Descargar PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Imprimir vista actual en formato horizontal"
            >
              <Printer className="w-3.5 h-3.5 text-slate-900" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="Cerrar Ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: FICHA TÉCNICA INSTITUCIONAL (100% VISIBLE EN UNA SOLA VISTA)   */}
        {/* ========================================================================= */}
        {activeTab === 'ficha' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-white text-slate-900 text-xs font-sans print:p-0 print:overflow-visible">
            
            {/* Membrete Oficial Compacto */}
            <div className="border-b-2 border-slate-300 pb-2.5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <OJLogo size="sm" variant="full" lightMode={true} />
                <div className="hidden sm:block border-l border-slate-300 pl-3">
                  <h1 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Dictamen y Hoja de Control de Judicatura e Infraestructura
                  </h1>
                  <p className="text-[9.5px] text-slate-500">
                    Dirección de Servicios de Información y Telecomunicaciones • Gerencia de Informática
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-right">
                <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">Código</span>
                  <span className="text-xs font-mono font-black text-slate-900">{codigoJud}</span>
                </div>
                <div className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  <span className="text-[8.5px] uppercase font-bold text-blue-600 block tracking-wider">Cámara</span>
                  <span className="text-xs font-bold text-blue-950">{camaraNombre}</span>
                </div>
              </div>
            </div>

            {/* Panel Principal Horizontal: 2 Columnas Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-3.5 items-stretch">
              
              {/* COLUMNA IZQUIERDA (5 columnas): IDENTIFICACIÓN Y PARÁMETROS OPERATIVOS */}
              <div className="lg:col-span-5 bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between space-y-2.5">
                
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-800" />
                      Sede Judicial
                    </span>
                    <div className="flex items-center gap-1.5">
                      {judicatura.priorizado === 'Si' && (
                        <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                          Alta Prioridad
                        </span>
                      )}
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase border ${
                        estado === 'Inaugurado' || estado === 'Finalizado'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : estado === 'Reprogramado'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {estado}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-sm sm:text-[15px] font-black text-slate-900 leading-snug">
                    {judicatura.nombreJudicatura}
                  </h2>
                </div>

                {/* Grid Compacto de Parámetros de Sede */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[9.5px] font-bold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-700" />
                      Inauguración Oficial
                    </span>
                    <span className="font-bold text-slate-900 block mt-0.5 text-xs font-mono">
                      {judicatura.fechaInauguracion ? formatDate(judicatura.fechaInauguracion) : 'Pendiente Definir'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[9.5px] font-bold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-700" />
                      Período Adecuaciones
                    </span>
                    <span className="font-semibold text-slate-800 block mt-0.5 text-[11px]">
                      {diasAdecuacion > 0 ? `${diasAdecuacion} días calendario` : 'En curso'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono block">
                      {formatDate(judicatura.fechaInicioAdecuaciones)} al {formatDate(judicatura.fechaFinAdecuaciones)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[9.5px] font-bold text-slate-500 block">Registrado Por</span>
                    <span className="font-semibold text-slate-800 block truncate mt-0.5 text-[10.5px]">
                      {judicatura.creadoPor || 'Gerencia de Informática'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[9.5px] font-bold text-slate-500 block">Fecha Registro</span>
                    <span className="font-mono text-slate-700 block mt-0.5 text-[10.5px]">
                      {judicatura.fechaCreacion ? formatDate(judicatura.fechaCreacion) : '—'}
                    </span>
                  </div>
                </div>

                {/* Dictamen Institucional */}
                <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-[10px] text-slate-700 leading-relaxed">
                  <span className="font-bold text-blue-900 uppercase tracking-wider block text-[9px] mb-0.5 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-800" />
                    Dictamen y Certificación Técnica Institucional:
                  </span>
                  Se hace constar que la sede cuenta con estatus operativo <strong className="text-slate-900">"{estado}"</strong>. Los servicios de cómputo, audio, cableado y enlace han sido evaluados y certificados por el personal de la Gerencia de Informática según normativas vigentes.
                </div>

              </div>

              {/* COLUMNA DERECHA (7 columnas): MATRIZ DE COMPONENTES TIC E INSTALACIÓN */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between space-y-2">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-slate-200">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">
                      Matriz de Infraestructura TIC y Certificación de Instalación
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Disponibilidad de equipamiento y verificación de montaje físico en sede.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] shrink-0">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-900 border border-blue-200">
                      Disponibles: <strong className="font-mono">{metrics.disponiblesCount}/4</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                      Instalados en Sede: <strong className="font-mono">{metrics.instaladosCount}/4</strong>
                    </span>
                  </div>
                </div>

                {/* Tabla de 4 Componentes */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-200 text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                      <tr>
                        <th className="border border-slate-200 p-1.5 text-left w-36">Componente TIC</th>
                        <th className="border border-slate-200 p-1.5 w-32">Estatus</th>
                        <th className="border border-slate-200 p-1.5 w-32">¿Instalado en Sede?</th>
                        <th className="border border-slate-200 p-1.5 text-left">Especificación Técnica Institucional</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      
                      {/* 1. Cómputo */}
                      <tr>
                        <td className="border border-slate-200 p-1.5 font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                            <span>Cómputo (PC)</span>
                          </div>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-0.2 rounded text-[9.5px] border ${getComponentStatusBadgeClass(compInfo.status)}`}>
                            {compInfo.status}
                          </span>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-black border ${
                            compInfo.instalado === 'Si'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {compInfo.instalado === 'Si' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : <XCircle className="w-2.5 h-2.5 text-amber-600" />}
                            {compInfo.instalado === 'Si' ? 'SÍ (Instalado)' : 'NO (Sin Instalar)'}
                          </span>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-slate-600 text-[10px]">
                          Estaciones de trabajo de escritorio, monitores e impresoras según estándar OJ.
                        </td>
                      </tr>

                      {/* 2. Audio */}
                      <tr className="bg-slate-50/50">
                        <td className="border border-slate-200 p-1.5 font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-purple-800 shrink-0" />
                            <span>Audio de Sala</span>
                          </div>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-0.2 rounded text-[9.5px] border ${getComponentStatusBadgeClass(audioInfo.status)}`}>
                            {audioInfo.status}
                          </span>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-black border ${
                            audioInfo.instalado === 'Si'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {audioInfo.instalado === 'Si' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : <XCircle className="w-2.5 h-2.5 text-amber-600" />}
                            {audioInfo.instalado === 'Si' ? 'SÍ (Instalado)' : 'NO (Sin Instalar)'}
                          </span>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-slate-600 text-[10px]">
                          Consolas de audio, microfonía fija y sistema digital de grabación de audiencias.
                        </td>
                      </tr>

                      {/* 3. Red */}
                      <tr>
                        <td className="border border-slate-200 p-1.5 font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Network className="w-3.5 h-3.5 text-teal-800 shrink-0" />
                            <span>Cableado Red</span>
                          </div>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-0.2 rounded text-[9.5px] border ${getComponentStatusBadgeClass(redInfo.status)}`}>
                            {redInfo.status}
                          </span>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-black border ${
                            redInfo.instalado === 'Si'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {redInfo.instalado === 'Si' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : <XCircle className="w-2.5 h-2.5 text-amber-600" />}
                            {redInfo.instalado === 'Si' ? 'SÍ (Terminado)' : 'NO (Pendiente)'}
                          </span>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-slate-600 text-[10px]">
                          Puntos Cat 6A certificados, patch panels, gabinete rack y rotulación.
                        </td>
                      </tr>

                      {/* 4. Enlace */}
                      <tr className="bg-slate-50/50">
                        <td className="border border-slate-200 p-1.5 font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Wifi className="w-3.5 h-3.5 text-cyan-800 shrink-0" />
                            <span>Enlace de Datos</span>
                          </div>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-0.2 rounded text-[9.5px] border ${getComponentStatusBadgeClass(enlaceInfo.status)}`}>
                            {enlaceInfo.status}
                          </span>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-black border ${
                            enlaceInfo.instalado === 'Si'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {enlaceInfo.instalado === 'Si' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : <XCircle className="w-2.5 h-2.5 text-amber-600" />}
                            {enlaceInfo.instalado === 'Si' ? 'SÍ (Instalado)' : 'NO (Sin Instalar)'}
                          </span>
                        </td>
                        <td className="border border-slate-200 p-1.5 text-slate-600 text-[10px]">
                          Conectividad WAN/VPN corporativa directa con el Data Center central del Organismo Judicial.
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>

                {/* Nota de Aclaración de Control Institucional */}
                <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[9.5px] text-slate-600 italic flex items-center gap-1.5">
                  <span className="font-bold text-blue-900 not-italic shrink-0">ⓘ Control TIC:</span>
                  <span>
                    Disponer del equipo acredita inventario; la columna <em>"¿Instalado en Sede?"</em> certifica de forma específica la instalación física y operatividad.
                  </span>
                </div>

              </div>

            </div>

            {/* ========================================================================= */}
            {/* BARRA DE TRAZABILIDAD Y ACCESO A REGISTROS SEPARADOS (SIN SOBRECARGAR)    */}
            {/* ========================================================================= */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-blue-800" />
                  Trazabilidad y Expediente:
                </span>
                <span className="text-[10.5px] text-slate-500">
                  Los detalles completos se gestionan en apartados dedicados para mantener limpia la ficha oficial.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('observaciones')}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-indigo-900 border border-slate-300 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Ver bitácora cronológica completa"
                >
                  <History className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Bitácora ({totalObservaciones} acciones)</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('documentos')}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-amber-950 border border-slate-300 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Ver expedientes y documentos oficiales"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>Expediente ({totalDocumentos} archivos)</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>

            </div>

            {/* Firmas Oficiales de Validación Institucional */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
              <span className="font-bold text-[9.5px] uppercase tracking-wider text-slate-500 block mb-2 text-center">
                Firmas Oficiales de Validación Institucional
              </span>
              <div className="grid grid-cols-3 gap-6 text-center text-[10px]">
                <div>
                  <div className="border-b border-slate-400 mb-1.5 h-8" />
                  <p className="font-bold text-slate-800">Elaborado por:</p>
                  <p className="text-slate-600 text-[9px] truncate">{judicatura.creadoPor || 'Gerencia de Informática'}</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 mb-1.5 h-8" />
                  <p className="font-bold text-slate-800">Vo.Bo.:</p>
                  <p className="text-slate-600 text-[9px]">Subgerencia de Informática</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 mb-1.5 h-8" />
                  <p className="font-bold text-slate-800">Autorizado:</p>
                  <p className="text-slate-600 text-[9px]">Gerente de Informática</p>
                </div>
              </div>
            </div>

            <div className="mt-2 text-center text-[8.5px] text-slate-400">
              Documento emitido el {formatDateTime(new Date().toISOString())} a través del Sistema de Control de Judicaturas e Infraestructura TI • Organismo Judicial de Guatemala
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: BITÁCORA DE OBSERVACIONES Y ACCIONES TÉCNICAS (VISTA SEPARADA) */}
        {/* ========================================================================= */}
        {activeTab === 'observaciones' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white text-slate-900 text-xs">
            
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('ficha')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Volver a la Ficha Técnica"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Ficha</span>
                </button>
                <div>
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-700" />
                    Bitácora Cronológica de Acciones Técnicas y Seguimiento
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Historial cronológico de intervenciones y avances para {judicatura.nombreJudicatura}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                {totalObservaciones} Acciones Registradas
              </span>
            </div>

            {(!judicatura.observaciones || judicatura.observaciones.length === 0) ? (
              <div className="p-12 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">Sin acciones técnicas registradas</p>
                <p className="text-slate-500 text-xs mt-1">
                  Esta judicatura aún no cuenta con anotaciones en su bitácora cronológica oficial.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-800 text-left">
                    <tr>
                      <th className="border-b border-slate-200 p-2.5 w-14 text-center">Acción</th>
                      <th className="border-b border-slate-200 p-2.5 w-32">Fecha y Hora</th>
                      <th className="border-b border-slate-200 p-2.5 w-52">Funcionario / Responsable</th>
                      <th className="border-b border-slate-200 p-2.5">Detalle de la Intervención Técnica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {judicatura.observaciones.map((obs, idx) => (
                      <tr key={obs.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2.5 text-center font-bold text-slate-700 font-mono text-[11px]">
                          #{obs.numeroAccion || idx + 1}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600">
                          {formatDateTime(obs.fecha)}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-900 text-[11.5px]">
                          {obs.autor || 'Funcionario GIT'}
                        </td>
                        <td className="p-2.5 text-slate-700 text-[11.5px] leading-relaxed">
                          {obs.texto}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: EXPEDIENTE DIGITAL Y DOCUMENTOS ADJUNTOS (VISTA SEPARADA)      */}
        {/* ========================================================================= */}
        {activeTab === 'documentos' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white text-slate-900 text-xs">
            
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('ficha')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Volver a la Ficha Técnica"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Ficha</span>
                </button>
                <div>
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-amber-600" />
                    Expediente Digital y Documentación Oficial Adjunta
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Actas de entrega, certificaciones de red y dictámenes técnicos para {judicatura.nombreJudicatura}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                {totalDocumentos} Archivos Digitalizados
              </span>
            </div>

            {(!judicatura.documentos || judicatura.documentos.length === 0) ? (
              <div className="p-12 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">Sin expedientes digitalizados adjuntos</p>
                <p className="text-slate-500 text-xs mt-1">
                  Puede adjuntar expedientes y actas técnicas desde la vista de detalle de judicatura.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-800 text-left">
                    <tr>
                      <th className="border-b border-slate-200 p-2.5 w-12 text-center">#</th>
                      <th className="border-b border-slate-200 p-2.5 w-40">Categoría</th>
                      <th className="border-b border-slate-200 p-2.5">Nombre de Archivo y Descripción</th>
                      <th className="border-b border-slate-200 p-2.5 w-36">Fecha de Carga</th>
                      <th className="border-b border-slate-200 p-2.5 w-44">Subido Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {judicatura.documentos.map((doc, idx) => (
                      <tr key={doc.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2.5 text-center font-bold text-slate-700 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            {doc.categoria || 'Acta Oficial'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-800">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11.5px]">
                            <FileText className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                            <span>{doc.nombre}</span>
                          </div>
                          {doc.descripcion && (
                            <p className="text-[10.5px] text-slate-500 italic mt-0.5 ml-5">
                              {doc.descripcion}
                            </p>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600">
                          {doc.fechaSubida ? formatDateTime(doc.fechaSubida) : 'N/D'}
                        </td>
                        <td className="p-2.5 text-slate-700 text-[11px]">
                          {doc.subidoPor || 'Operador GIT'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
