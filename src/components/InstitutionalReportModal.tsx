import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseRecord } from '../types';
import { formatQuetzales, formatDate, formatDateTime, getModalidadCompraByMonto } from '../utils/formatters';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  ExternalLink, 
  History, 
  RefreshCw, 
  Eye, 
  CheckCircle2, 
  ChevronDown, 
  AlertTriangle,
  Tag,
  Edit,
  Save,
  Check
} from 'lucide-react';
import { OJLogo } from './OJLogo';
import { getPurchaseTimeline } from '../utils/timelineUtils';
import { getPurchaseObservaciones } from '../utils/movementUtils';
import { getIndividualPurchasePDFBlob, downloadPdfBlob } from '../utils/pdfExport';
import { useApp } from '../context/AppContext';
import { getCategoriesForArea, getSuggestedCategoryForArea, isCategoryCoherentWithArea } from '../utils/areaCategoryMapping';
import { getSystemAreas } from '../utils/rbacUtils';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface InstitutionalReportModalProps {
  purchase: PurchaseRecord;
  onClose: () => void;
  allPurchases?: PurchaseRecord[];
  onSelectPurchase?: (p: PurchaseRecord) => void;
}

type TabFicha = 'hojaInstitucional' | 'visorPdf' | 'bitacora';

export const InstitutionalReportModal: React.FC<InstitutionalReportModalProps> = ({ 
  purchase, 
  onClose,
  allPurchases,
  onSelectPurchase
}) => {
  const { currentUser, showToast, updatePurchase, catalogs, purchases } = useApp();
  
  // Por defecto 'hojaInstitucional' para garantizar visualización inmediata sin bloqueos de Chrome
  const [activeTab, setActiveTab] = useState<TabFicha>('hojaInstitucional');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfData, setPdfData] = useState<{
    blob: Blob;
    blobUrl: string;
    dataUri: string;
    filename: string;
  } | null>(null);

  // Estados para corrección rápida de Área y Categoría Tecnológica
  const [isEditingClassification, setIsEditingClassification] = useState(false);
  const [editArea, setEditArea] = useState(purchase.areaSolicitante || 'Soporte Técnico');
  const [editCategory, setEditCategory] = useState(purchase.categoriaTecnologica || '');
  const [editDependencia, setEditDependencia] = useState(purchase.dependenciaSolicitante || 'Gerencia de Informática');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const modalidadLCE = getModalidadCompraByMonto(purchase.monto, purchase.modalidadCompra);
  const timelineEvents = getPurchaseTimeline(purchase);
  const observaciones = getPurchaseObservaciones(purchase);

  const systemAreas = useMemo(() => {
    return getSystemAreas(catalogs, purchases);
  }, [catalogs, purchases]);

  const { recomendadas: areaRecommendedCats, otras: otherCats } = useMemo(() => {
    return getCategoriesForArea(editArea, catalogs);
  }, [editArea, catalogs]);

  // Sincronizar estados locales al cambiar de adquisición
  useEffect(() => {
    const area = purchase.areaSolicitante || 'Soporte Técnico';
    setEditArea(area);
    const cat = purchase.categoriaTecnologica || getSuggestedCategoryForArea(area);
    setEditCategory(cat);
    setEditDependencia(purchase.dependenciaSolicitante || 'Gerencia de Informática');
    setIsEditingClassification(false);
    setIsCustomCategory(false);
  }, [purchase.id, purchase.areaSolicitante, purchase.categoriaTecnologica]);

  // Generar el Blob y URL del PDF cada vez que cambie la adquisición
  useEffect(() => {
    let currentBlobUrl = '';
    setIsGeneratingPdf(true);
    try {
      const data = getIndividualPurchasePDFBlob(purchase, currentUser);
      currentBlobUrl = data.blobUrl;
      setPdfData({
        blob: data.blob,
        blobUrl: data.blobUrl,
        dataUri: data.dataUri,
        filename: data.filename
      });
    } catch (err) {
      console.error('Error al generar PDF de la ficha de adquisición:', err);
      showToast({
        title: 'Aviso de PDF',
        message: 'Visualizando en modo Hoja Institucional garantizada.',
        type: 'info',
      });
      setActiveTab('hojaInstitucional');
    } finally {
      setIsGeneratingPdf(false);
    }

    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [purchase.id, purchase.nog, purchase.categoriaTecnologica, purchase.areaSolicitante, currentUser]);

  const handleAreaChange = (newArea: string) => {
    setEditArea(newArea);
    if (!editCategory || !isCategoryCoherentWithArea(newArea, editCategory)) {
      const suggested = getSuggestedCategoryForArea(newArea);
      setEditCategory(suggested);
      setIsCustomCategory(false);
    }
  };

  const handleSaveClassification = () => {
    const finalCategory = isCustomCategory ? customCategoryInput.trim() || editCategory : editCategory;
    
    updatePurchase(purchase.id, {
      areaSolicitante: editArea,
      categoriaTecnologica: finalCategory,
      dependenciaSolicitante: editDependencia,
    });

    purchase.areaSolicitante = editArea;
    purchase.categoriaTecnologica = finalCategory;
    purchase.dependenciaSolicitante = editDependencia;

    setIsEditingClassification(false);

    // Regenerar el PDF con los datos actualizados
    try {
      const updatedData = getIndividualPurchasePDFBlob(purchase, currentUser);
      setPdfData({
        blob: updatedData.blob,
        blobUrl: updatedData.blobUrl,
        dataUri: updatedData.dataUri,
        filename: updatedData.filename
      });
    } catch (e) {
      console.warn('Error regenerando PDF tras actualizar clasificación:', e);
    }

    showToast({
      type: 'success',
      title: 'Clasificación Corregida y Guardada',
      message: `Se asoció el Área "${editArea}" con la Categoría Tecnológica "${finalCategory}".`,
      duration: 5000
    });
  };

  const handleDownloadPdf = () => {
    try {
      setIsDownloadingPdf(true);
      if (pdfData?.blob && pdfData?.filename) {
        downloadPdfBlob(pdfData.blob, pdfData.filename);
        showToast({
          title: 'Ficha Técnica Descargada',
          message: `Se descargó exitosamente el documento oficial "${pdfData.filename}".`,
          type: 'success',
        });
      } else {
        const freshData = getIndividualPurchasePDFBlob(purchase, currentUser);
        downloadPdfBlob(freshData.blob, freshData.filename);
        showToast({
          title: 'Ficha Técnica Descargada',
          message: `Se descargó exitosamente el documento oficial "${freshData.filename}".`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Error al descargar ficha técnica en PDF:', err);
      showToast({
        title: 'Error al Descargar Ficha',
        message: 'No fue posible exportar la ficha técnica en PDF.',
        type: 'error',
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleOpenPdfNewTab = () => {
    if (!pdfData?.blobUrl) {
      handleDownloadPdf();
      return;
    }
    try {
      const win = window.open(pdfData.blobUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        showToast({
          type: 'info',
          title: 'Bloqueador de Ventanas Activo',
          message: 'Chrome bloqueó la pestaña emergente. El documento oficial se descargó directamente en su equipo.',
          duration: 6000
        });
        handleDownloadPdf();
      }
    } catch (err) {
      console.warn('window.open bloqueado, procediendo a descarga directa:', err);
      showToast({
        type: 'info',
        title: 'Bloqueador de Ventanas Activo',
        message: 'Descargando el documento oficial directamente en su equipo.',
        duration: 5000
      });
      handleDownloadPdf();
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('window.print no disponible, generando PDF directo:', err);
      handleDownloadPdf();
    }
  };

  const isCoherent = isCategoryCoherentWithArea(purchase.areaSolicitante || '', purchase.categoriaTecnologica || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      {/* Estilos para impresión en formato oficial */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 8mm;
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

      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col h-[94vh] max-h-[94vh]">
        
        {/* Barra Superior con Pestañas y Acciones Principales */}
        <div className="px-4 sm:px-6 py-2.5 text-white flex flex-wrap items-center justify-between gap-3 border-b border-blue-900 shadow-sm bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 shrink-0 no-print">
          
          {/* Identificación y Pestañas */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <FileText className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-xs sm:text-sm block leading-none">
                  Ficha Técnica Oficial de Adquisición (F56-e)
                </span>
                <span className="text-[10px] text-slate-300 font-mono">
                  NOG: {purchase.nog} • Formulario: {purchase.f56e}
                </span>
              </div>
            </div>

            {/* Pestañas de Navegación (Hoja Institucional Primero) */}
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('hojaInstitucional')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'hojaInstitucional'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Vista oficial formateada del Organismo Judicial garantizada y lista para consultar o imprimir"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-700" />
                <span>Hoja Ficha Oficial</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('visorPdf')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'visorPdf'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Previsualización de archivo PDF generado"
              >
                <Eye className="w-3.5 h-3.5 text-blue-700" />
                <span>Visor PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bitacora')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'bitacora'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Ver registro cronológico de acciones y observaciones técnicas"
              >
                <History className="w-3.5 h-3.5 text-amber-600" />
                <span>Bitácora ({observaciones.length})</span>
              </button>
            </div>
          </div>

          {/* Selector de Otra Adquisición y Botones de Acción */}
          <div className="flex items-center gap-2">
            {allPurchases && allPurchases.length > 1 && onSelectPurchase && (
              <div className="relative hidden lg:block">
                <select
                  value={purchase.id}
                  onChange={(e) => {
                    const found = allPurchases.find(p => p.id === e.target.value);
                    if (found) onSelectPurchase(found);
                  }}
                  className="bg-black/40 text-white text-xs border border-white/20 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-hidden cursor-pointer"
                  title="Cambiar de adquisición para ver su ficha técnica"
                >
                  {allPurchases.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      NOG {p.nog} - {(p.descripcion || p.categoriaTecnologica || 'Evento').slice(0, 32)}...
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            )}

            <button
              id="btn-corregir-clasificacion-modal"
              type="button"
              onClick={() => setIsEditingClassification(!isEditingClassification)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isEditingClassification
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Corregir o asociar el Área Solicitante y la Categoría Tecnológica correcta"
            >
              <Tag className="w-3.5 h-3.5 text-amber-300" />
              <span>{isEditingClassification ? 'Ocultar Corrección' : 'Corregir Categoría / Área'}</span>
            </button>

            <button
              id="btn-descargar-ficha-pdf-modal"
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
              title="Descargar archivo PDF oficial de la Ficha Técnica de Adquisición"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>{isDownloadingPdf ? 'Descargando...' : 'Descargar PDF'}</span>
            </button>

            {pdfData?.blobUrl && (
              <button
                type="button"
                onClick={handleOpenPdfNewTab}
                className="hidden sm:flex px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Abrir el documento PDF en pestaña o visor independiente de Chrome"
              >
                <ExternalLink className="w-3.5 h-3.5 text-white" />
                <span>Abrir PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Imprimir documento oficial"
            >
              <Printer className="w-3.5 h-3.5 text-slate-900" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer ml-1"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PANEL DESPLEGABLE: CORRECCIÓN DE CATEGORÍA TECNOLÓGICA Y ÁREA SOLICITANTE */}
        {isEditingClassification && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 p-4 border-b border-blue-200 shadow-inner no-print shrink-0 animate-in fade-in duration-200">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-900 text-white flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                      Asociar Categoría Tecnológica Coherente al Área Solicitante
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Selecciona el área requirente para ver y aplicar las categorías tecnológicas recomendadas por la Gerencia de Informática.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveClassification}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar y Actualizar Ficha</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingClassification(false)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                {/* 1. Selector de Área */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Área Solicitante
                  </label>
                  <select
                    value={editArea}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full p-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-blue-500"
                  >
                    {systemAreas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Al cambiar el área se sugieren las categorías afines.
                  </p>
                </div>

                {/* 2. Selector de Categoría Coherente */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Categoría Tecnológica
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(!isCustomCategory)}
                      className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
                    >
                      {isCustomCategory ? 'Ver catálogo' : '+ Personalizada'}
                    </button>
                  </div>

                  {isCustomCategory ? (
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => {
                        setCustomCategoryInput(e.target.value);
                        setEditCategory(e.target.value);
                      }}
                      placeholder="Escriba categoría..."
                      className="w-full p-2 text-xs font-semibold border border-blue-400 rounded-lg text-slate-900"
                    />
                  ) : (
                    <select
                      value={editCategory}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomCategory(true);
                          setCustomCategoryInput('');
                        } else {
                          setEditCategory(e.target.value);
                        }
                      }}
                      className="w-full p-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-blue-500"
                    >
                      {areaRecommendedCats.length > 0 && (
                        <optgroup label={`⭐ Coherentes con ${editArea}`}>
                          {areaRecommendedCats.map(cat => (
                            <option key={`rec-${cat}`} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherCats.length > 0 && (
                        <optgroup label="📁 Otras Categorías">
                          {otherCats.map(cat => (
                            <option key={`oth-${cat}`} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__CUSTOM__">✍️ + Escribir otra personalizada...</option>
                    </select>
                  )}

                  <div className="mt-1">
                    {isCategoryCoherentWithArea(editArea, editCategory) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Coherente con {editArea}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Categoría vinculada a otra área
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Dependencia Solicitante */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Dependencia Solicitante
                  </label>
                  <input
                    type="text"
                    value={editDependencia}
                    onChange={(e) => setEditDependencia(e.target.value)}
                    placeholder="ej. Centro de Cómputo Principal"
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg text-slate-900"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Unidad requirente institucional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 1: HOJA DE CONTROL INSTITUCIONAL FORMATEADA (VISTA PRINCIPAL GARANTIZADA) */}
        {activeTab === 'hojaInstitucional' && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 text-xs font-sans print:p-0 print:overflow-visible">
            
            {/* Membrete Oficial */}
            <div className="border-b border-slate-300 pb-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OJLogo size="md" variant="full" lightMode={true} />
              </div>

              <div className="text-right border-l-2 border-indigo-900 pl-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Formulario Control</span>
                <span className="text-sm font-mono font-bold text-slate-900 block">{purchase.f56e}</span>
                <span className="text-[10px] font-mono text-slate-500 block">F56: {purchase.f56 || 'Sin especificar'}</span>
              </div>
            </div>

            {/* Título del Documento */}
            <div className="text-center my-4 bg-slate-50 py-2 border-y border-slate-200">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                DICTAMEN Y HOJA DE CONTROL DE ADQUISICIÓN TECNOLÓGICA (F56-e)
              </h2>
              <p className="text-[10px] text-slate-500 italic mt-0.5">
                Conforme a la Ley de Contrataciones del Estado y Normativa de la Gerencia de Informática
              </p>
            </div>

            {/* Bloque 1: Datos Generales y NOG */}
            <div className="space-y-4 my-5">
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <tbody>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-2 font-bold w-1/4 text-slate-700">NOG Guatecompras:</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-slate-900 w-1/4">{purchase.nog}</td>
                    <td className="border border-slate-300 p-2 font-bold w-1/4 text-slate-700">Estatus del Evento:</td>
                    <td className="border border-slate-300 p-2 font-bold w-1/4 uppercase text-slate-900">{purchase.estatusEvento}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold text-slate-700">Formulario F56-e:</td>
                    <td className="border border-slate-300 p-2 font-mono font-semibold">{purchase.f56e}</td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-700">Formulario F56 Físico:</td>
                    <td className="border border-slate-300 p-2 font-mono font-semibold">
                      {purchase.f56 || 'Sin especificar'}
                      {purchase.f56Documento && (
                        <span className="ml-2 text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block">
                          Adjunto: {purchase.f56Documento.nombre}
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-2 font-bold text-slate-700">Monto Estimado / Adjudicado:</td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-900 font-mono text-sm">{formatQuetzales(purchase.monto)}</td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-700">Evaluado Área Técnica (GIT):</td>
                    <td className="border border-slate-300 p-2 font-bold">
                      {purchase.evaluadoGIT === 'Sí' 
                        ? `SÍ (Dictamen Favorable${purchase.fechaDictamenGIT ? ` - Fecha: ${formatDate(purchase.fechaDictamenGIT)}` : ''}${purchase.fechaElaboracionOficioGIT ? ` - Oficio GIT: ${formatDate(purchase.fechaElaboracionOficioGIT)}` : ''})` 
                        : 'NO'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold text-slate-700">Modalidad de Compra (LCE):</td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-900" colSpan={3}>
                      <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded font-bold mr-2 text-slate-900">
                        {modalidadLCE.nombre}
                      </span>
                      <span className="text-slate-700 font-normal">
                        ({modalidadLCE.descripcionRango} — {modalidadLCE.fundamentoLegal})
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-2 font-bold text-slate-700">Área Solicitante:</td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-900" colSpan={3}>
                      <div className="flex items-center justify-between">
                        <span>{purchase.areaSolicitante || 'Soporte Técnico'}</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingClassification(true)}
                          className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 no-print cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Cambiar Área</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold text-slate-700">Dependencia Solicitante:</td>
                    <td className="border border-slate-300 p-2" colSpan={3}>{purchase.dependenciaSolicitante || 'Gerencia de Informática'}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-2 font-bold text-slate-700">Categoría Tecnológica:</td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-900" colSpan={3}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-50 text-indigo-950 px-2 py-0.5 rounded border border-indigo-200">
                            {purchase.categoriaTecnologica || 'Estaciones de Trabajo y Periféricos'}
                          </span>
                          {isCoherent ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Coherente con {purchase.areaSolicitante || 'Área'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1" title="Esta categoría no coincide habitualmente con el área solicitante seleccionada">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Categoría no habitual para esta área
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsEditingClassification(true)}
                          className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 no-print cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Corregir Categoría</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold text-slate-700">Renglón Presupuestario:</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-blue-900" colSpan={3}>
                      {purchase.renglonPresupuestario || '158'} {purchase.nombreRenglon ? `— ${purchase.nombreRenglon}` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bloque 2: Descripción Técnica */}
            <div className="my-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                Descripción y Justificación Técnica del Requerimiento:
              </h3>
              <div className="p-3 border border-slate-300 rounded-lg bg-slate-50/50 leading-relaxed text-justify">
                {purchase.descripcion || 'Sin descripción técnica registrada en el expediente de adquisición.'}
              </div>
            </div>

            {/* Bloque 3: Cronología Institucional */}
            <div className="my-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                Cronograma y Fechas Clave del Proceso:
              </h3>
              <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="border border-slate-300 p-2">Fecha Solicitud</th>
                    <th className="border border-slate-300 p-2">Fecha Vo.Bo.</th>
                    <th className="border border-slate-300 p-2">Fecha Autorizado</th>
                    <th className="border border-slate-300 p-2">Fecha Publicación</th>
                    <th className="border border-slate-300 p-2">Fecha Ofertas</th>
                    <th className="border border-slate-300 p-2">Postores</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2">{formatDate(purchase.fechaSolicitud)}</td>
                    <td className="border border-slate-300 p-2">{formatDate(purchase.fechaVoBo)}</td>
                    <td className="border border-slate-300 p-2">{formatDate(purchase.fechaAutorizado)}</td>
                    <td className="border border-slate-300 p-2">{formatDate(purchase.fechaPublicacion)}</td>
                    <td className="border border-slate-300 p-2">{formatDate(purchase.fechaOfertas)}</td>
                    <td className="border border-slate-300 p-2 font-bold">{purchase.cantidadOfertas || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bloque 4: Tracking y Línea de Tiempo del Estatus del Evento */}
            {timelineEvents.length > 0 && (
              <div className="my-5">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                  Línea de Tiempo y Tracking del Estatus del Evento:
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead className="bg-slate-100 font-bold text-center">
                    <tr>
                      <th className="border border-slate-300 p-1.5 w-24">Fecha</th>
                      <th className="border border-slate-300 p-1.5 text-left">Hito / Estatus</th>
                      <th className="border border-slate-300 p-1.5 text-left">Fase</th>
                      <th className="border border-slate-300 p-1.5 text-left">Responsable / Unidad</th>
                      <th className="border border-slate-300 p-1.5">No. Documento / Ref.</th>
                      <th className="border border-slate-300 p-1.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelineEvents.map((evt, idx) => (
                      <tr key={evt.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px] whitespace-nowrap">
                          {formatDate(evt.fecha)}
                          {evt.hora && <span className="block text-[10px] text-slate-400 font-normal">{evt.hora}</span>}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-semibold text-slate-900">
                          {evt.titulo}
                          {evt.observaciones && (
                            <span className="block font-normal text-[10px] text-slate-500 mt-0.5">
                              {evt.observaciones}
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-slate-700 text-[11px]">
                          {evt.fase || 'Gestión'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-slate-700 text-[11px]">
                          {evt.responsable || 'GIT'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px]">
                          {evt.documentoReferencia || '—'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center text-[10px] font-bold">
                          <span className={`px-1.5 py-0.5 rounded ${
                            evt.estado === 'completado' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : evt.estado === 'en_proceso' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {evt.estado === 'completado' ? 'Completado' : evt.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bloque 5: Proveedor y Observaciones */}
            {purchase.proveedorAdjudicado && (
              <div className="my-4 p-3 border border-slate-300 bg-slate-50/50 rounded-lg">
                <strong className="text-slate-900">Proveedor Adjudicado: </strong>
                <span className="text-slate-800">{purchase.proveedorAdjudicado}</span>
              </div>
            )}

            {purchase.observaciones && (
              <div className="my-4 p-3 border border-slate-300 rounded-lg bg-slate-50/50">
                <strong className="text-slate-700">Observaciones Técnicas: </strong>
                <span className="text-slate-800">{purchase.observaciones}</span>
              </div>
            )}

            {/* Bloque 6: Firmas y Sellos Oficiales */}
            <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-[11px]">
              <div>
                <div className="border-b border-slate-400 mb-2 h-14" />
                <p className="font-bold text-slate-800">Elaborado por:</p>
                <p className="text-slate-600">{purchase.creadoPor || 'Analista de Adquisiciones GIT'}</p>
                <p className="text-[10px] text-slate-400">Gerencia de Informática - OJ</p>
              </div>

              <div>
                <div className="border-b border-slate-400 mb-2 h-14" />
                <p className="font-bold text-slate-800">Visto Bueno (Vo.Bo.):</p>
                <p className="text-slate-600">Subgerencia de Informática</p>
                <p className="text-[10px] text-slate-400">Dictamen Técnico Aprobado</p>
              </div>

              <div>
                <div className="border-b border-slate-400 mb-2 h-14" />
                <p className="font-bold text-slate-800">Autorizado por:</p>
                <p className="text-slate-600">Gerente de Informática</p>
                <p className="text-[10px] text-slate-400">Organismo Judicial de Guatemala</p>
              </div>
            </div>

            <div className="mt-8 text-center text-[9px] text-slate-400">
              Documento emitido el {formatDateTime(new Date().toISOString())} a través del Sistema de Control de Compras GIT - Organismo Judicial.
            </div>

          </div>
        )}

        {/* PESTAÑA 2: VISOR PDF (CON MANEJO SEGURO DE BLOQUEOS DE CHROME) */}
        {activeTab === 'visorPdf' && (
          <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
            
            {/* Banner Informativo sobre Políticas de Previsualización en Chrome */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Aviso de Navegador:</strong> Si Chrome bloquea la previsualización en este marco, utiliza <strong>"Descargar PDF"</strong> o <strong>"Abrir PDF"</strong> para ver el archivo original, o regresa a la <strong>"Hoja Ficha Oficial"</strong>.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('hojaInstitucional')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-950 font-bold rounded border border-indigo-200 shadow-2xs cursor-pointer text-xs"
                >
                  Ver Hoja Oficial
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs cursor-pointer text-xs"
                >
                  Descargar PDF
                </button>
                {pdfData?.blobUrl && (
                  <button
                    type="button"
                    onClick={handleOpenPdfNewTab}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-2xs cursor-pointer text-xs flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir en Pestaña</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cintilla Resumen de la Adquisición sobre el Visor */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-700">NOG:</span>
                <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {purchase.nog}
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-700">Categoría:</span>
                <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {purchase.categoriaTecnologica || 'Estaciones de Trabajo y Periféricos'}
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-700">Monto:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {formatQuetzales(purchase.monto)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                  purchase.estatusEvento?.toLowerCase().includes('adjudic')
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : purchase.estatusEvento === 'Evaluación'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {purchase.estatusEvento || 'En Proceso'}
                </span>

                {purchase.evaluadoGIT === 'Sí' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Evaluado Área Técnica
                  </span>
                )}
              </div>
            </div>

            {/* Contenedor del PDF Embebido */}
            <div className="flex-1 relative w-full h-full p-2 bg-slate-800 overflow-hidden flex flex-col items-center justify-center">
              {isGeneratingPdf ? (
                <div className="flex flex-col items-center justify-center p-8 text-white text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-3" />
                  <p className="font-bold text-sm">Generando Ficha Técnica Oficial en PDF...</p>
                  <p className="text-xs text-slate-300 mt-1">Incrustando logotipo institucional, metadatos y código de auditoría...</p>
                </div>
              ) : pdfData?.blob ? (
                <div className="w-full h-full flex flex-col overflow-auto">
                  <PdfCanvasViewer
                    pdfBlob={pdfData.blob}
                    filename={pdfData.filename}
                    purchase={purchase}
                    title={`Ficha Técnica Oficial NOG ${purchase.nog}`}
                  />
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-slate-300 max-w-md">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 text-sm">Ficha Técnica Lista</h4>
                  <p className="text-xs text-slate-500 my-2">
                    Puedes visualizar los detalles en la pestaña "Hoja Ficha Oficial" o descargar directamente el PDF.
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('hojaInstitucional')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                    >
                      Ver Hoja Oficial
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      Descargar PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: BITÁCORA Y OBSERVACIONES DE LA ADQUISICIÓN */}
        {activeTab === 'bitacora' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-xs">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-700" />
                  <span>Bitácora de Acciones y Observaciones Registradas ({observaciones.length})</span>
                </h3>
                <p className="text-slate-500 text-xs">
                  Historial de seguimiento técnico, anotaciones y dictámenes vinculados a esta adquisición.
                </p>
              </div>

              {observaciones.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-500">
                  <p>No hay observaciones adicionales registradas en la bitácora de esta adquisición.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {observaciones.map((obs, idx) => (
                    <div key={obs.id || idx} className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            Acción #{obs.numeroAccion || idx + 1}
                          </span>
                          <span className="font-bold text-slate-800">{obs.titulo || 'Anotación'}</span>
                        </div>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {formatDate(obs.fecha)} {obs.hora || ''}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-xs whitespace-pre-wrap">{obs.texto}</p>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Registrado por: <strong className="text-slate-700">{obs.autor || 'Usuario GIT'}</strong> ({obs.rolUsuario || 'GIT'})</span>
                        {obs.area && <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px]">{obs.area}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
