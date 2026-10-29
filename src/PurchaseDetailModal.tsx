import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Printer, 
  Calendar, 
  FileText, 
  Edit,
  Download,
  Paperclip,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
  LayoutGrid,
  GitBranch,
  FolderTree,
  ChevronRight,
  Tag,
  Save
} from 'lucide-react';
import { formatQuetzales, formatDate, formatDateTime, getModalidadCompraByMonto } from '../utils/formatters';
import { InstitutionalReportModal } from './InstitutionalReportModal';
import { DocumentPreview } from './DocumentPreview';
import { downloadDocumentFile } from '../utils/documentUtils';
import { PurchaseBitacoraView } from './PurchaseBitacoraView';
import { PurchaseActionTree } from './PurchaseActionTree';
import { getPurchaseObservaciones } from '../utils/movementUtils';
import { getAttachmentWithDataUrl } from '../utils/attachmentStorage';
import { History } from 'lucide-react';
import { canUserEditPurchase, canUserDeletePurchase, getCanonicalAreaName, getSystemAreas } from '../utils/rbacUtils';
import { generateIndividualPurchasePDF, getIndividualPurchasePDFBlob, downloadPdfBlob } from '../utils/pdfExport';
import { OJLogo } from './OJLogo';
import { PdfCanvasViewer } from './PdfCanvasViewer';
import { getPurchaseTimeline } from '../utils/timelineUtils';
import { getCategoriesForArea, getSuggestedCategoryForArea, isCategoryCoherentWithArea } from '../utils/areaCategoryMapping';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  'Adjudicación': 'bg-blue-100 text-blue-700',
  'Evaluación': 'bg-amber-100 text-amber-700',
  'Prescindido': 'bg-red-100 text-red-700',
  'Desierto': 'bg-slate-100 text-slate-700',
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PurchaseDetailModal: React.FC = () => {
  const { 
    selectedPurchase, 
    setSelectedPurchase, 
    setIsPurchaseModalOpen, 
    setPurchaseToEdit,
    deletePurchase,
    updatePurchase,
    showToast,
    currentUser,
    catalogs 
  } = useApp();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(true);
  // Por defecto 'fichaPdf' para que se visualice la ficha técnica PDF inmediatamente con Canvas
  const [activeTab, setActiveTab] = useState<'general' | 'ficha' | 'fichaPdf' | 'arbol' | 'bitacora' | 'documento'>('fichaPdf');
  const [isEditingFechaAdj, setIsEditingFechaAdj] = useState(false);
  const [inlineFechaAdj, setInlineFechaAdj] = useState('');

  // Estados de PDF generado en memoria para visualización directa y descarga
  const [pdfData, setPdfData] = useState<{
    blob: Blob;
    blobUrl: string;
    dataUri: string;
    filename: string;
  } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Estados de edición rápida de Área y Categoría Tecnológica
  const [isEditingClassification, setIsEditingClassification] = useState(false);
  const [editArea, setEditArea] = useState(selectedPurchase?.areaSolicitante || 'Soporte Técnico');
  const [editCategory, setEditCategory] = useState(selectedPurchase?.categoriaTecnologica || '');
  const [editDependencia, setEditDependencia] = useState(selectedPurchase?.dependenciaSolicitante || 'Gerencia de Informática');

  const systemAreas = useMemo(() => {
    return getSystemAreas(catalogs);
  }, [catalogs]);

  const { recomendadas: areaRecommendedCats, otras: otherCats } = useMemo(() => {
    return getCategoriesForArea(editArea, catalogs);
  }, [editArea, catalogs]);

  // Generación reactiva del PDF oficial con jsPDF
  useEffect(() => {
    if (!selectedPurchase) return;
    let localBlobUrl = '';
    setIsGeneratingPdf(true);
    try {
      const data = getIndividualPurchasePDFBlob(selectedPurchase, currentUser);
      localBlobUrl = data.blobUrl;
      setPdfData({
        blob: data.blob,
        blobUrl: data.blobUrl,
        dataUri: data.dataUri,
        filename: data.filename
      });
    } catch (err) {
      console.warn('Error generando documento PDF con jsPDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }

    return () => {
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [selectedPurchase?.id, selectedPurchase?.nog, selectedPurchase?.monto, selectedPurchase?.areaSolicitante, selectedPurchase?.categoriaTecnologica, selectedPurchase?.fechaAdjudicacion, currentUser]);

  useEffect(() => {
    if (selectedPurchase) {
      setEditArea(selectedPurchase.areaSolicitante || 'Soporte Técnico');
      setEditCategory(selectedPurchase.categoriaTecnologica || getSuggestedCategoryForArea(selectedPurchase.areaSolicitante || 'Soporte Técnico'));
      setEditDependencia(selectedPurchase.dependenciaSolicitante || 'Gerencia de Informática');
      setIsEditingClassification(false);
    }
  }, [selectedPurchase?.id, selectedPurchase?.areaSolicitante, selectedPurchase?.categoriaTecnologica]);

  const handleSaveClassification = () => {
    if (!selectedPurchase) return;
    updatePurchase(selectedPurchase.id, {
      areaSolicitante: editArea,
      categoriaTecnologica: editCategory,
      dependenciaSolicitante: editDependencia
    });
    setSelectedPurchase({
      ...selectedPurchase,
      areaSolicitante: editArea,
      categoriaTecnologica: editCategory,
      dependenciaSolicitante: editDependencia
    });
    setIsEditingClassification(false);

    // Regenerar el PDF con la clasificación actualizada
    try {
      const updatedData = getIndividualPurchasePDFBlob({
        ...selectedPurchase,
        areaSolicitante: editArea,
        categoriaTecnologica: editCategory,
        dependenciaSolicitante: editDependencia
      }, currentUser);
      setPdfData({
        blob: updatedData.blob,
        blobUrl: updatedData.blobUrl,
        dataUri: updatedData.dataUri,
        filename: updatedData.filename
      });
    } catch (e) {
      console.warn('Error regenerando PDF tras clasificación:', e);
    }

    showToast({
      type: 'success',
      title: 'Clasificación Actualizada',
      message: `Se asoció el Área "${editArea}" con la Categoría Tecnológica "${editCategory}".`
    });
  };

  useEffect(() => {
    if (selectedPurchase?.fechaAdjudicacion) {
      setInlineFechaAdj(selectedPurchase.fechaAdjudicacion);
    } else {
      setInlineFechaAdj(new Date().toISOString().slice(0, 10));
    }
    setIsEditingFechaAdj(false);
  }, [selectedPurchase?.id, selectedPurchase?.fechaAdjudicacion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPurchase(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedPurchase]);

  const handleSaveFechaAdjudicacion = () => {
    if (!selectedPurchase || !inlineFechaAdj) return;
    updatePurchase(selectedPurchase.id, {
      fechaAdjudicacion: inlineFechaAdj
    });
    setSelectedPurchase({
      ...selectedPurchase,
      fechaAdjudicacion: inlineFechaAdj
    });
    setIsEditingFechaAdj(false);
    showToast({
      type: 'success',
      title: 'Fecha de Adjudicación Guardada',
      message: `Se grabó la fecha ${formatDate(inlineFechaAdj)} en la adquisición NOG ${selectedPurchase.nog}.`
    });
  };

  const handleDownloadFichaPdf = () => {
    if (!selectedPurchase) return;
    try {
      if (pdfData?.blob && pdfData?.filename) {
        downloadPdfBlob(pdfData.blob, pdfData.filename);
        showToast({
          type: 'success',
          title: 'Ficha Técnica Descargada',
          message: `Se descargó exitosamente la Ficha Técnica Oficial "${pdfData.filename}".`,
          duration: 5000,
        });
      } else {
        const data = getIndividualPurchasePDFBlob(selectedPurchase, currentUser);
        downloadPdfBlob(data.blob, data.filename);
        showToast({
          type: 'success',
          title: 'Ficha Técnica Descargada',
          message: `Se descargó exitosamente la Ficha Técnica Oficial "${data.filename}".`,
          duration: 5000,
        });
      }
    } catch (err) {
      console.error('Error generando ficha técnica en PDF:', err);
      showToast({
        type: 'error',
        title: 'Error al Generar Ficha',
        message: 'No fue posible generar la ficha técnica en PDF.',
        duration: 5000,
      });
    }
  };

  const handleOpenPdfNewTab = () => {
    if (!selectedPurchase) return;
    try {
      const targetBlob = pdfData?.blob || getIndividualPurchasePDFBlob(selectedPurchase, currentUser).blob;
      const targetFilename = pdfData?.filename || `Ficha_Tecnica_NOG_${selectedPurchase.nog}.pdf`;
      const url = pdfData?.blobUrl || URL.createObjectURL(targetBlob);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      
      // Detección de bloqueador de pop-ups en Chrome
      if (!win || win.closed || typeof win.closed === 'undefined') {
        showToast({
          type: 'info',
          title: 'Bloqueador de Ventanas Activo',
          message: 'Chrome bloqueó la ventana emergente. Descargando directamente el PDF a su equipo.',
          duration: 6000
        });
        downloadPdfBlob(targetBlob, targetFilename);
      }
    } catch (err) {
      console.warn('window.open bloqueado por el navegador, procediendo a descarga directa:', err);
      handleDownloadFichaPdf();
    }
  };

  useEffect(() => {
    if (
      selectedPurchase?.id && 
      selectedPurchase.f56Documento && 
      (!selectedPurchase.f56Documento.dataUrl || selectedPurchase.f56Documento.dataUrl.length < 100)
    ) {
      let isMounted = true;
      getAttachmentWithDataUrl(selectedPurchase.id, selectedPurchase.f56Documento).then(fullDoc => {
        if (isMounted && fullDoc?.dataUrl && fullDoc.dataUrl !== selectedPurchase.f56Documento?.dataUrl) {
          setSelectedPurchase({
            ...selectedPurchase,
            f56Documento: fullDoc
          });
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [selectedPurchase?.id, selectedPurchase?.f56Documento?.dataUrl]);

  if (!selectedPurchase) return null;

  const canEdit = canUserEditPurchase(currentUser, selectedPurchase);
  const canDelete = true;

  const handleEditFromDetail = () => {
    setPurchaseToEdit(selectedPurchase);
    setSelectedPurchase(null);
    setIsPurchaseModalOpen(true);
  };

  const handleConfirmDelete = () => {
    deletePurchase(selectedPurchase.id);
    setIsConfirmDeleteOpen(false);
    setSelectedPurchase(null);
  };

  const badgeClass = STATUS_BADGE_CLASSES[selectedPurchase.estatusEvento] || 'bg-slate-100 text-slate-700';
  const modalidadLCE = getModalidadCompraByMonto(selectedPurchase.monto, selectedPurchase.modalidadCompra);

  const observaciones = React.useMemo(() => {
    return getPurchaseObservaciones(selectedPurchase);
  }, [selectedPurchase?.observacionesList, selectedPurchase?.movimientos, selectedPurchase?.observaciones, selectedPurchase]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
          
          {/* Cabecera Institucional del Modal (Professional Polish) */}
          <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-slate-900 font-bold text-xs">
                OJ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    NOG: {selectedPurchase.nog}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    • F56-e: {selectedPurchase.f56e}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Ficha Oficial de Adquisición
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('fichaPdf')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  activeTab === 'fichaPdf'
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title="Visualizar la Ficha Oficial en PDF (jsPDF) con Canvas directo"
              >
                <Eye className="w-3.5 h-3.5 text-white" />
                <span>Ver Ficha PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Abrir el visor en modal ampliado"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Visor Ampliado</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadFichaPdf}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Descargar directamente el archivo PDF de la Ficha Técnica"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Descargar PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cuerpo de la Ficha */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-800 text-xs sm:text-sm">
            
            {/* Pestañas de Navegación de la Ficha */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('fichaPdf')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'fichaPdf'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-900 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200'
                }`}
                title="Visualizar la Ficha Oficial en PDF (jsPDF) en pantalla sin bloqueos"
              >
                <Eye className="w-3.5 h-3.5 text-blue-700" />
                <span>Ficha PDF Oficial (jsPDF)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ficha')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'ficha'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Ver Hoja Oficial de Ficha y Dictamen F56-e en formato web"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-700" />
                <span>Hoja F56-e (HTML)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'general'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Ficha General y Detalles</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('arbol')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'arbol'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Árbol de Observaciones</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-700 text-white">
                  {observaciones.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bitacora')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'bitacora'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Bitácora de Cambios</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                  {selectedPurchase.bitacoraCambios?.length || 1}
                </span>
              </button>

              {selectedPurchase.f56Documento && (
                <button
                  type="button"
                  onClick={() => setActiveTab('documento')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'documento'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Documento Adjunto (F56)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </button>
              )}
            </div>

            {/* Banner de Estado y Monto */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Monto Total Presupuestado (GTQ)
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {formatQuetzales(selectedPurchase.monto)}
                </span>
                {/* Modalidad de Compra Oficial (LCE) calculada según el monto */}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${modalidadLCE.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${modalidadLCE.badgeDotColor}`} />
                    Modalidad: {modalidadLCE.nombre}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({modalidadLCE.descripcionRango})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Último Estatus
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('arbol')}
                      title="Ver ruta en forma de árbol"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeClass} cursor-pointer hover:opacity-90 transition-opacity`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {selectedPurchase.estatusEvento}
                    </button>
                  </div>
                </div>
                <div className="text-right border-l border-slate-200 pl-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Evaluado por el Área Técnica
                  </span>
                  <span className={`inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedPurchase.evaluadoGIT === 'Sí' 
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                      : 'text-slate-600 bg-slate-100 border border-slate-200'
                  }`}>
                    {selectedPurchase.evaluadoGIT === 'Sí' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Evaluado por el Área Técnica (Sí)
                      </>
                    ) : (
                      'Sin evaluar (No)'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Vista: Árbol Cronológico de Observaciones */}
            {activeTab === 'arbol' && (
              <div className="pt-1 space-y-3">
                <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-white p-3.5 rounded-xl border border-amber-800 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Árbol Cronológico de Observaciones del Expediente
                      </h4>
                      <p className="text-[11px] text-amber-200/80">
                        NOG: <span className="font-mono font-bold text-white">{selectedPurchase.nog}</span> • F56-e: <span className="font-mono font-bold text-white">{selectedPurchase.f56e}</span> • <span className="text-white font-medium">{observaciones.length} {observaciones.length === 1 ? 'observación' : 'observaciones'}</span> (del más reciente al más antiguo)
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
                    {selectedPurchase.estatusEvento}
                  </span>
                </div>

                <PurchaseActionTree 
                  purchase={selectedPurchase} 
                  initialFilterState="todos"
                />
              </div>
            )}

            {/* Vista 0: Ficha Técnica Oficial en PDF (jsPDF con Canvas nativo sin iframe) */}
            {activeTab === 'fichaPdf' && (
              <div className="space-y-3 pt-1">
                {/* Barra de Controles Rápidos de la Ficha PDF */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-3 sm:p-4 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-blue-900">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <span>Ficha Técnica Oficial en PDF (jsPDF)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                          Renderizado Canvas Directo
                        </span>
                      </h4>
                      <p className="text-[11px] text-blue-200/80">
                        NOG: <span className="font-mono font-bold text-white">{selectedPurchase.nog}</span> • Formulario F56-e: <span className="font-mono font-bold text-white">{selectedPurchase.f56e}</span> • Monto: <span className="font-mono font-bold text-emerald-300">{formatQuetzales(selectedPurchase.monto)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingClassification(!isEditingClassification)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 border border-white/20 transition-colors cursor-pointer"
                      title="Corregir o verificar el área y categoría tecnológica de la ficha"
                    >
                      <Tag className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isEditingClassification ? 'Ocultar Clasificación' : 'Corregir Clasificación'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('ficha')}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 border border-white/20 transition-colors cursor-pointer"
                      title="Alternar a la versión de hoja web oficial (HTML)"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Ver Hoja HTML</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenPdfNewTab}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title="Abrir en pestaña nueva con respaldo de descarga automática si Chrome tiene bloqueador"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pestaña Nueva</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadFichaPdf}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer active:scale-95"
                      title="Descargar el archivo PDF oficial generado por jsPDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar PDF</span>
                    </button>
                  </div>
                </div>

                {/* Editor de Clasificación Rápida si está activo */}
                {isEditingClassification && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-950 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <span className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Tag className="w-4 h-4 text-amber-600" />
                        Corrección Rápida de Área y Categoría Tecnológica
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveClassification}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Cambios</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Área Solicitante:</label>
                        <select
                          value={editArea}
                          onChange={(e) => {
                            const a = e.target.value;
                            setEditArea(a);
                            if (!editCategory || !isCategoryCoherentWithArea(a, editCategory)) {
                              setEditCategory(getSuggestedCategoryForArea(a));
                            }
                          }}
                          className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                        >
                          {systemAreas.map((area) => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Categoría Tecnológica:</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                        >
                          <optgroup label="⭐ Coherentes con el área">
                            {areaRecommendedCats.map(cat => (
                              <option key={cat} value={cat}>⭐ {cat}</option>
                            ))}
                          </optgroup>
                          {otherCats.length > 0 && (
                            <optgroup label="📁 Otras categorías">
                              {otherCats.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Dependencia Solicitante:</label>
                        <input
                          type="text"
                          value={editDependencia}
                          onChange={(e) => setEditDependencia(e.target.value)}
                          className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Visor Directo con HTML5 Canvas sin iframe */}
                {isGeneratingPdf ? (
                  <div className="p-12 bg-slate-900 rounded-xl text-center text-white flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="font-bold text-sm">Generando Ficha Oficial con jsPDF...</p>
                    <p className="text-xs text-slate-400 mt-1">Preparando membrete institucional y código de auditoría...</p>
                  </div>
                ) : (
                  <PdfCanvasViewer
                    pdfBlob={pdfData?.blob}
                    filename={pdfData?.filename}
                    purchase={selectedPurchase}
                    title={`Ficha Técnica Oficial NOG ${selectedPurchase.nog}`}
                  />
                )}
              </div>
            )}

            {/* Vista 1: Hoja Ficha Oficial F56-e (Visualización Completa y Descarga PDF) */}
            {activeTab === 'ficha' && (
              <div className="space-y-4 pt-1">
                {/* Barra de Controles de la Ficha */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-3 sm:p-4 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-blue-900">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Ficha Técnica y Dictamen Oficial de Adquisición Tecnológica
                      </h4>
                      <p className="text-[11px] text-blue-200/80">
                        NOG: <span className="font-mono font-bold text-white">{selectedPurchase.nog}</span> • Formulario F56-e: <span className="font-mono font-bold text-white">{selectedPurchase.f56e}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('fichaPdf')}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
                      title="Ver el documento PDF oficial generado con jsPDF directamente en pantalla"
                    >
                      <Eye className="w-3.5 h-3.5 text-white" />
                      <span>Ver Ficha en PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadFichaPdf}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
                      title="Generar y Descargar Ficha Técnica en PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Descargar Ficha PDF</span>
                    </button>
                  </div>
                </div>

                {/* Hoja de Ficha Oficial Estilizada */}
                <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-5 sm:p-8 space-y-5 text-slate-900">
                  {/* Membrete Oficial */}
                  <div className="border-b border-slate-300 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <OJLogo size="md" variant="full" lightMode={true} />
                    </div>
                    <div className="text-left sm:text-right border-l-2 border-indigo-900 pl-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Formulario Control</span>
                      <span className="text-sm font-mono font-bold text-slate-900 block">{selectedPurchase.f56e}</span>
                      <span className="text-[10px] font-mono text-slate-500 block">F56: {selectedPurchase.f56 || 'Sin asignar'}</span>
                    </div>
                  </div>

                  {/* Título de la Ficha */}
                  <div className="text-center py-2 bg-slate-50 border-y border-slate-200">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                      DICTAMEN Y HOJA DE CONTROL DE ADQUISICIÓN TECNOLÓGICA
                    </h3>
                    <p className="text-[10px] text-slate-500 italic mt-0.5">
                      Gerencia de Informática • Organismo Judicial de Guatemala
                    </p>
                  </div>

                  {/* Tabla de Parámetros Principales */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 text-xs">
                      <tbody>
                        <tr className="bg-slate-50">
                          <td className="border border-slate-300 p-2 font-bold w-1/4 text-slate-700">NOG Guatecompras:</td>
                          <td className="border border-slate-300 p-2 font-mono font-bold text-blue-900 w-1/4">{selectedPurchase.nog}</td>
                          <td className="border border-slate-300 p-2 font-bold w-1/4 text-slate-700">Estatus del Evento:</td>
                          <td className="border border-slate-300 p-2 font-bold w-1/4 uppercase">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}`}>
                              {selectedPurchase.estatusEvento}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2 font-bold text-slate-700">Formulario F56-e:</td>
                          <td className="border border-slate-300 p-2 font-mono">{selectedPurchase.f56e}</td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-700">Formulario F56 Físico:</td>
                          <td className="border border-slate-300 p-2 font-mono">{selectedPurchase.f56 || 'No especificado'}</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="border border-slate-300 p-2 font-bold text-slate-700">Monto Estimado / Adjudicado:</td>
                          <td className="border border-slate-300 p-2 font-bold text-emerald-800 font-mono text-sm">{formatQuetzales(selectedPurchase.monto)}</td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-700">Evaluado Área Técnica (GIT):</td>
                          <td className="border border-slate-300 p-2 font-bold">
                            {selectedPurchase.evaluadoGIT === 'Sí' ? (
                              <span className="text-emerald-700">SÍ (Evaluado y Dictaminado)</span>
                            ) : (
                              <span className="text-slate-500">NO</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2 font-bold text-slate-700">Modalidad de Compra (LCE):</td>
                          <td className="border border-slate-300 p-2" colSpan={3}>
                            <span className="font-bold text-slate-900 mr-2">{modalidadLCE.nombre}</span>
                            <span className="text-slate-600 text-[11px]">({modalidadLCE.descripcionRango} — {modalidadLCE.fundamentoLegal})</span>
                          </td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="border border-slate-300 p-2 font-bold text-slate-700">Área Solicitante:</td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-900" colSpan={3}>
                            {isEditingClassification ? (
                              <div className="space-y-1">
                                <select
                                  value={editArea}
                                  onChange={(e) => {
                                    const a = e.target.value;
                                    setEditArea(a);
                                    if (!editCategory || !isCategoryCoherentWithArea(a, editCategory)) {
                                      setEditCategory(getSuggestedCategoryForArea(a));
                                    }
                                  }}
                                  className="w-full p-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900"
                                >
                                  {systemAreas.map((area) => (
                                    <option key={area} value={area}>{area}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span>{getCanonicalAreaName(selectedPurchase.areaSolicitante, catalogs) || 'Soporte Técnico'}</span>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingClassification(true)}
                                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Cambiar</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2 font-bold text-slate-700">Dependencia Solicitante:</td>
                          <td className="border border-slate-300 p-2" colSpan={3}>
                            {isEditingClassification ? (
                              <input
                                type="text"
                                value={editDependencia}
                                onChange={(e) => setEditDependencia(e.target.value)}
                                className="w-full p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                              />
                            ) : (
                              <span>{selectedPurchase.dependenciaSolicitante || 'Gerencia de Informática'}</span>
                            )}
                          </td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="border border-slate-300 p-2 font-bold text-slate-700">Categoría Tecnológica:</td>
                          <td className="border border-slate-300 p-2 font-bold" colSpan={3}>
                            {isEditingClassification ? (
                              <div className="space-y-2">
                                <select
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                  className="w-full p-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900"
                                >
                                  {areaRecommendedCats.length > 0 && (
                                    <optgroup label={`⭐ Categorías Coherentes con ${editArea}`}>
                                      {areaRecommendedCats.map(cat => (
                                        <option key={`rec-${cat}`} value={cat}>{cat}</option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {otherCats.length > 0 && (
                                    <optgroup label="📁 Otras Categorías">
                                      {otherCats.map(cat => (
                                        <option key={`oth-${cat}`} value={cat}>{cat}</option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setIsEditingClassification(false)}
                                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveClassification}
                                    className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-2xs cursor-pointer"
                                  >
                                    Guardar Clasificación
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {selectedPurchase.categoriaTecnologica || 'Estaciones de Trabajo y Periféricos'}
                                  </span>
                                  {isCategoryCoherentWithArea(selectedPurchase.areaSolicitante || '', selectedPurchase.categoriaTecnologica || '') ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Coherente con {selectedPurchase.areaSolicitante || 'Área'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                      Categoría no habitual para esta área
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingClassification(true)}
                                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Corregir Categoría</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {selectedPurchase.proveedorAdjudicado && (
                          <tr>
                            <td className="border border-slate-300 p-2 font-bold text-slate-700">Proveedor Adjudicado:</td>
                            <td className="border border-slate-300 p-2 font-bold text-slate-900" colSpan={3}>
                              {selectedPurchase.proveedorAdjudicado}
                              {selectedPurchase.fechaAdjudicacion && (
                                <span className="ml-2 text-slate-500 font-normal">
                                  (Adjudicado el {formatDate(selectedPurchase.fechaAdjudicacion)})
                                </span>
                              )}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="border border-slate-300 p-2 font-bold text-slate-700">Imputación Presupuestaria:</td>
                          <td className="border border-slate-300 p-2" colSpan={3}>
                            Renglón: <strong>{selectedPurchase.renglonPresupuestario || '158'}</strong> {selectedPurchase.nombreRenglon && `(${selectedPurchase.nombreRenglon})`} • Estado: <strong>{selectedPurchase.estadoPago === 'pagado' ? 'Pagado que Rebaja' : 'Comprometido (Pendiente de Pago)'}</strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Descripción del Requerimiento */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-1.5">
                      Descripción y Justificación Técnica del Requerimiento:
                    </h4>
                    <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/70 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {selectedPurchase.descripcion}
                    </div>
                  </div>

                  {/* Observaciones Técnicas si existen */}
                  {selectedPurchase.observaciones && (
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-1.5">
                        Observaciones Registradas en el Expediente:
                      </h4>
                      <div className="p-3 border border-amber-200 rounded-xl bg-amber-50/50 text-xs text-amber-950 leading-relaxed">
                        {selectedPurchase.observaciones}
                      </div>
                    </div>
                  )}

                  {/* Firmas Institucionales */}
                  <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
                    <div className="space-y-1">
                      <div className="border-b border-slate-400 pb-1 mb-2"></div>
                      <p className="font-bold text-slate-800 text-[11px]">ELABORÓ</p>
                      <p className="text-slate-600 text-[10.5px]">{selectedPurchase.creadoPor || 'Analista de Compras GIT'}</p>
                      <p className="text-[9.5px] text-slate-400">Gerencia de Informática</p>
                    </div>
                    <div className="space-y-1">
                      <div className="border-b border-slate-400 pb-1 mb-2"></div>
                      <p className="font-bold text-slate-800 text-[11px]">VO. BO. TÉCNICO</p>
                      <p className="text-slate-600 text-[10.5px]">Subgerencia de Informática</p>
                      <p className="text-[9.5px] text-slate-400">Dictamen Técnico Validado</p>
                    </div>
                    <div className="space-y-1">
                      <div className="border-b border-slate-400 pb-1 mb-2"></div>
                      <p className="font-bold text-slate-800 text-[11px]">AUTORIZADO</p>
                      <p className="text-slate-600 text-[10.5px]">Gerente de Informática</p>
                      <p className="text-[9.5px] text-slate-400">Organismo Judicial de Guatemala</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vista 1: Bitácora de Cambios de la Ficha */}
            {activeTab === 'bitacora' && (
              <div className="pt-1">
                <PurchaseBitacoraView purchase={selectedPurchase} canEdit={canEdit} />
              </div>
            )}

            {/* Vista 2: Solo Documento F56 */}
            {activeTab === 'documento' && selectedPurchase.f56Documento && (
              <div className="space-y-3 pt-1">
                <DocumentPreview
                  document={selectedPurchase.f56Documento}
                  purchase={selectedPurchase}
                  title="Documento Oficial F56-e"
                  onClose={() => setActiveTab('general')}
                />
              </div>
            )}

            {/* Vista 3: Ficha General Completa */}
            {activeTab === 'general' && (
              <>
                {/* Descripción Completa */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    Descripción del Requerimiento
                  </h3>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium text-xs">
                    {selectedPurchase.descripcion}
                  </div>
                </div>

            {/* SECCIÓN DE IDENTIFICADORES Y DOCUMENTO DE LA F56 */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    NOG Guatecompras
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900">{selectedPurchase.nog}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Formulario F56-e (Electrónico)
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900">{selectedPurchase.f56e}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Máscara: 000000-0000</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Formulario F56 (Físico)
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900">{selectedPurchase.f56}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Máscara: 000000</span>
                </div>
              </div>

              {/* Documento Adjunto de la F56 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                    Documento de la F56
                  </span>
                  {selectedPurchase.f56Documento && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Documento Adjunto
                    </span>
                  )}
                </div>

                {selectedPurchase.f56Documento ? (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate" title={selectedPurchase.f56Documento.nombre}>
                            {selectedPurchase.f56Documento.nombre}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatFileSize(selectedPurchase.f56Documento.tamano)} • Subido: {selectedPurchase.f56Documento.fechaSubida ? new Date(selectedPurchase.f56Documento.fechaSubida).toLocaleDateString() : 'Registrado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setShowDocumentPreview(!showDocumentPreview)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          {showDocumentPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {showDocumentPreview ? 'Ocultar Vista' : 'Vista Previa'}
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadDocumentFile(selectedPurchase.f56Documento!, selectedPurchase)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-2xs shrink-0 cursor-pointer"
                          title="Descargar documento oficial"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar
                        </button>
                      </div>
                    </div>

                    {showDocumentPreview && (
                      <DocumentPreview
                        document={selectedPurchase.f56Documento}
                        purchase={selectedPurchase}
                        title="Documento Oficial F56-e"
                        onClose={() => setShowDocumentPreview(false)}
                      />
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/80 via-slate-50 to-amber-50/50 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-800 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Ficha Técnica Oficial del Expediente F56-e Generada
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Puede visualizar la ficha oficial en pantalla o descargarla directamente en PDF.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab('ficha')}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-blue-900 border border-blue-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Ver Ficha Oficial en pantalla"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-700" />
                        <span>Ver Ficha</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadFichaPdf}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                        title="Descargar Ficha Técnica Oficial en PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span>Descargar PDF</span>
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={handleEditFromDetail}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1 ml-1 cursor-pointer"
                        >
                          <Paperclip className="w-3 h-3" />
                          Adjuntar F56
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Clasificación y Detalles Técnicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Estatus del Evento:
                </span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${badgeClass}`}>
                  {selectedPurchase.estatusEvento}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Evaluado por el Área Técnica Correspondiente:
                </span>
                <div className="mt-0.5">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                    selectedPurchase.evaluadoGIT === 'Sí' 
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                      : 'text-slate-600 bg-slate-100 border border-slate-200'
                  }`}>
                    {selectedPurchase.evaluadoGIT === 'Sí' ? 'Sí (Evaluado por el Área Técnica)' : 'No (No evaluado)'}
                  </span>
                  {selectedPurchase.evaluadoGIT === 'Sí' && selectedPurchase.fechaDictamenGIT && (
                    <span className="block text-[11px] font-semibold text-slate-600 mt-1">
                      Fecha de Dictamen: <strong className="text-slate-900 font-mono">{formatDate(selectedPurchase.fechaDictamenGIT)}</strong>
                    </span>
                  )}
                  {selectedPurchase.evaluadoGIT === 'Sí' && selectedPurchase.fechaElaboracionOficioGIT && (
                    <span className="block text-[11px] font-semibold text-slate-600 mt-1">
                      Elaboración Oficio GIT: <strong className="text-slate-900 font-mono">{formatDate(selectedPurchase.fechaElaboracionOficioGIT)}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Área Solicitante:
                </span>
                <span className="font-bold text-amber-700">{getCanonicalAreaName(selectedPurchase.areaSolicitante, catalogs) || 'Soporte Técnico'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Categoría Tecnológica:
                </span>
                <span className="font-semibold text-slate-800">{selectedPurchase.categoriaTecnologica || 'Equipo Informático'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Dependencia Solicitante:
                </span>
                <span className="font-semibold text-slate-800">{selectedPurchase.dependenciaSolicitante || 'Gerencia de Informática'}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Modalidad de Compra (LCE):
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border ${modalidadLCE.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${modalidadLCE.badgeDotColor}`} />
                    {modalidadLCE.nombre}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-600">
                  <span className="font-semibold text-slate-700">{modalidadLCE.descripcionRango}</span>
                  <span className="block text-slate-500 italic mt-0.5">{modalidadLCE.fundamentoLegal}</span>
                </div>
              </div>

              {/* Afectación Presupuestaria IT */}
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                    Imputación Presupuestaria (Informática)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedPurchase.estadoPago === 'pagado'
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}>
                    {selectedPurchase.estadoPago === 'pagado' ? 'Pagado que Rebaja' : 'Comprometido Pendiente'}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Renglón Presupuestario:</span>
                    <strong className="font-mono text-blue-950 font-bold">
                      {selectedPurchase.renglonPresupuestario || '158'}
                    </strong>
                    {selectedPurchase.nombreRenglon && (
                      <span className="text-slate-600 text-[11px] ml-1.5">({selectedPurchase.nombreRenglon})</span>
                    )}
                  </div>
                  {selectedPurchase.grupoPresupuestario && (
                    <div>
                      <span className="text-[10px] text-slate-500 block">Grupo Presupuestario:</span>
                      <strong className="font-bold text-slate-800">{selectedPurchase.grupoPresupuestario}</strong>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Ofertas Recibidas:
                </span>
                <span className="font-bold text-slate-900">{selectedPurchase.cantidadOfertas} ofertas</span>
              </div>
              {(selectedPurchase.estatusEvento?.toLowerCase().includes('adjudic') || selectedPurchase.proveedorAdjudicado || selectedPurchase.fechaAdjudicacion) && (
                <div className="sm:col-span-2 border-t border-slate-200 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/70 p-3 rounded-lg border border-amber-300">
                  <div>
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                      Fecha de Adjudicación Oficial:
                    </span>
                    {selectedPurchase.fechaAdjudicacion && !isEditingFechaAdj ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-slate-900 bg-white px-2.5 py-1 rounded border border-amber-200">
                          {formatDate(selectedPurchase.fechaAdjudicacion)}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setIsEditingFechaAdj(true)}
                            className="text-xs text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                          >
                            Modificar
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          type="date"
                          value={inlineFechaAdj}
                          onChange={(e) => setInlineFechaAdj(e.target.value)}
                          className="px-2 py-1 text-xs border border-amber-300 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSaveFechaAdjudicacion}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          Grabar Fecha
                        </button>
                        {selectedPurchase.fechaAdjudicacion && (
                          <button
                            type="button"
                            onClick={() => setIsEditingFechaAdj(false)}
                            className="px-2 py-1 text-slate-600 hover:text-slate-800 text-xs cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                    {!selectedPurchase.fechaAdjudicacion && !isEditingFechaAdj && (
                      <p className="text-[10px] text-amber-800 font-medium mt-1">
                        * Evento adjudicado pendiente de asignarle fecha oficial. Ingrésela y haga clic en Grabar.
                      </p>
                    )}
                  </div>

                  {selectedPurchase.proveedorAdjudicado && (
                    <div>
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                        Proveedor / Empresa Adjudicada:
                      </span>
                      <span className="font-bold text-xs text-slate-900 bg-white px-2.5 py-1 rounded border border-amber-200 block">
                        {selectedPurchase.proveedorAdjudicado}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Observaciones */}
            {selectedPurchase.observaciones && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">Observaciones Técnicas:</span>
                <p className="text-amber-950">{selectedPurchase.observaciones}</p>
              </div>
            )}

            {/* Tarjeta Resumen del Último Estatus */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Último Estatus del Evento
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${badgeClass}`}>
                      {selectedPurchase.estatusEvento}
                    </span>
                    {selectedPurchase.proveedorAdjudicado && selectedPurchase.estatusEvento === 'Adjudicación' && (
                      <span className="text-xs text-slate-600">
                        Adjudicado a: <strong className="text-slate-800">{selectedPurchase.proveedorAdjudicado}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('arbol')}
                  className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Ver Ruta en Árbol</span>
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('bitacora')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Ver Bitácora</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sección Árbol de Observaciones dentro de Ficha General */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Árbol de Observaciones Recientes
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Registro cronológico del más reciente al más antiguo ({observaciones.length} {observaciones.length === 1 ? 'observación' : 'observaciones'})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('arbol')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver Árbol Completo ({observaciones.length})</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <PurchaseActionTree 
                purchase={selectedPurchase} 
                compact={true}
                initialFilterState="todos"
                onNavigateToFullTree={() => setActiveTab('arbol')}
              />
            </div>
          </>
        )}

        {/* Metadatos */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
              <div>
                <strong>Registrado por:</strong> {selectedPurchase.creadoPor} ({formatDateTime(selectedPurchase.fechaCreacion)})
              </div>
              {selectedPurchase.modificadoPor && (
                <div>
                  <strong>Última modificación:</strong> {selectedPurchase.modificadoPor} ({formatDateTime(selectedPurchase.fechaModificacion)})
                </div>
              )}
            </div>

          </div>

          {/* Barra Inferior */}
          <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelectedPurchase(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadFichaPdf}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Descargar Ficha Técnica Oficial en PDF"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Descargar Ficha PDF</span>
              </button>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 shadow-xs text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Eliminar</span>
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={handleEditFromDetail}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 shadow-xs text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Edit className="w-3.5 h-3.5 text-black" />
                  <span>Editar Adquisición</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal Confirmación de Eliminación */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              ¿Eliminar NOG {selectedPurchase.nog}?
            </h3>
            <p className="text-xs text-slate-500">
              Esta acción eliminará el registro de adquisición de la base de datos y quedará asentada en la bitácora de auditoría.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Boleta Imprimible */}
      {isReportModalOpen && (
        <InstitutionalReportModal
          purchase={selectedPurchase}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </>
  );
};
