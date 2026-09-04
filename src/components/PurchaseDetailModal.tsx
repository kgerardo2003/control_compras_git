import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Printer, 
  Calendar, 
  FileText, 
  Edit,
  Download,
  Paperclip,
  CheckCircle2
} from 'lucide-react';
import { formatQuetzales, formatDate, formatDateTime } from '../utils/formatters';
import { InstitutionalReportModal } from './InstitutionalReportModal';

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
    currentUser 
  } = useApp();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  if (!selectedPurchase) return null;

  const canEdit = currentUser?.rol === 'administrador' || currentUser?.rol === 'usuario_estandar';

  const handleEditFromDetail = () => {
    setPurchaseToEdit(selectedPurchase);
    setSelectedPurchase(null);
    setIsPurchaseModalOpen(true);
  };

  const badgeClass = STATUS_BADGE_CLASSES[selectedPurchase.estatusEvento] || 'bg-slate-100 text-slate-700';

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
                onClick={() => setIsReportModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black text-xs font-bold transition-all shadow-xs border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                title="Generar Boleta Oficial Imprimible"
              >
                <Printer className="w-3.5 h-3.5 text-black" />
                <span className="hidden sm:inline">Boleta Oficial</span>
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
            
            {/* Banner de Estado y Monto */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Monto Total Presupuestado (GTQ)
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {formatQuetzales(selectedPurchase.monto)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Estatus del Evento
                  </span>
                  <span className={`inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                    {selectedPurchase.estatusEvento}
                  </span>
                </div>
                <div className="text-right border-l border-slate-200 pl-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Evaluado por la GIT
                  </span>
                  <span className={`inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedPurchase.evaluadoGIT === 'Sí' 
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                      : 'text-slate-600 bg-slate-100 border border-slate-200'
                  }`}>
                    {selectedPurchase.evaluadoGIT === 'Sí' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Evaluado por la GIT (Sí)
                      </>
                    ) : (
                      'No evaluado por la GIT (No)'
                    )}
                  </span>
                </div>
              </div>
            </div>

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
                    {selectedPurchase.f56Documento.dataUrl && (
                      <a
                        href={selectedPurchase.f56Documento.dataUrl}
                        download={selectedPurchase.f56Documento.nombre}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-2xs shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar Documento F56
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>No se ha adjuntado aún el archivo digitalizado de la F56 física.</span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={handleEditFromDetail}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3" />
                        Adjuntar ahora en Edición
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cronología del Proceso de Adquisición */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Cronología de Fechas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-900 block">1. Solicitud</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{formatDate(selectedPurchase.fechaSolicitud)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-600 block">2. Vo.Bo.</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{formatDate(selectedPurchase.fechaVoBo)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-600 block">3. Autorizado</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{formatDate(selectedPurchase.fechaAutorizado)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-600 block">4. Publicación</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{formatDate(selectedPurchase.fechaPublicacion)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-600 block">5. Cierre Ofertas</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{formatDate(selectedPurchase.fechaOfertas)}</span>
                </div>
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
                  Evaluado por la GIT:
                </span>
                <div className="mt-0.5">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                    selectedPurchase.evaluadoGIT === 'Sí' 
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                      : 'text-slate-600 bg-slate-100 border border-slate-200'
                  }`}>
                    {selectedPurchase.evaluadoGIT === 'Sí' ? 'Sí (Evaluado por la GIT)' : 'No (No evaluado por la GIT)'}
                  </span>
                  {selectedPurchase.evaluadoGIT === 'Sí' && selectedPurchase.fechaDictamenGIT && (
                    <span className="block text-[11px] font-semibold text-slate-600 mt-1">
                      Fecha de Dictamen: <strong className="text-slate-900 font-mono">{formatDate(selectedPurchase.fechaDictamenGIT)}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Área Solicitante (GIT):
                </span>
                <span className="font-bold text-amber-700">{selectedPurchase.areaSolicitante || 'Soporte técnico'}</span>
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
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Modalidad de Contratación:
                </span>
                <span className="font-semibold text-slate-800">{selectedPurchase.modalidadCompra || 'Cotización'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Ofertas Recibidas:
                </span>
                <span className="font-bold text-slate-900">{selectedPurchase.cantidadOfertas} ofertas</span>
              </div>
              {selectedPurchase.proveedorAdjudicado && (
                <div className="sm:col-span-2 border-t border-slate-200 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Proveedor Adjudicado:
                  </span>
                  <span className="font-bold text-slate-900">{selectedPurchase.proveedorAdjudicado}</span>
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
          <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedPurchase(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>

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
