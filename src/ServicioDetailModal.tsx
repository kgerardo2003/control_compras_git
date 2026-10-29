/**
 * @license
 * Modal de Ficha Detallada del Servicio Contratado
 * Gerencia de Informática - Organismo Judicial de Guatemala
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ServicioContratado, 
  AttachedDocument 
} from '../../types';
import { 
  calcularMetricasServicio, 
  getSemaforoVigenciaVisual, 
  getNivelAlertaGestionVisual 
} from '../../utils/serviciosCalculations';
import { 
  X, 
  Edit3, 
  Trash2, 
  Mail, 
  Clock, 
  Calendar, 
  Building2, 
  ShieldAlert, 
  FileText, 
  Paperclip, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  ExternalLink,
  Tag,
  UserCheck
} from 'lucide-react';

export const ServicioDetailModal: React.FC = () => {
  const { 
    selectedServicio, 
    setSelectedServicio, 
    isServicioDetailModalOpen, 
    setIsServicioDetailModalOpen, 
    setServicioToEdit, 
    setIsServicioModalOpen, 
    deleteServicio,
    sendServicioAlertEmail,
    currentUser 
  } = useApp();

  const [previewDoc, setPreviewDoc] = useState<AttachedDocument | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isServicioDetailModalOpen || !selectedServicio) return null;

  const metricas = calcularMetricasServicio(selectedServicio);
  const semaforoVigenciaVisual = getSemaforoVigenciaVisual(metricas.semaforoVigencia);
  const semaforoGestionVisual = getNivelAlertaGestionVisual(metricas.nivelAlertaGestion);

  const handleEditClick = () => {
    setServicioToEdit(selectedServicio);
    setIsServicioDetailModalOpen(false);
    setIsServicioModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteServicio(selectedServicio.id);
      setIsConfirmDeleteOpen(false);
      setIsServicioDetailModalOpen(false);
      setSelectedServicio(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendAlert = async () => {
    setIsSendingEmail(true);
    setEmailSentSuccess(false);
    try {
      const res = await sendServicioAlertEmail(selectedServicio.id);
      if (res.success) {
        setEmailSentSuccess(true);
        setTimeout(() => setEmailSentSuccess(false), 4000);
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400">{selectedServicio.codigo}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-300 font-semibold">{selectedServicio.area}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                {selectedServicio.servicioContratado}
              </h2>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => { setIsServicioDetailModalOpen(false); setSelectedServicio(null); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Semáforos e Indicadores de Vigencia */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Semáforo de Vigencia:</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-xs ${semaforoVigenciaVisual.badgeBg} ${semaforoVigenciaVisual.badgeText} ${semaforoVigenciaVisual.badgeBorder}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${semaforoVigenciaVisual.dotColor}`} />
                {semaforoVigenciaVisual.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Alerta de Gestión ({selectedServicio.modalidad}):</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-xs ${semaforoGestionVisual.badgeBg} ${semaforoGestionVisual.badgeText} ${semaforoGestionVisual.badgeBorder} ${semaforoGestionVisual.pulse ? 'animate-pulse' : ''}`}>
                <Clock className="w-3.5 h-3.5" />
                {semaforoGestionVisual.label}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-600">
                Estatus: <strong className="text-slate-900">{selectedServicio.estatusActual}</strong>
              </span>
            </div>
          </div>

          {/* Barra de progreso de tiempo consumido */}
          <div className="space-y-1 mt-2">
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex items-center">
              <div 
                className={`h-full transition-all duration-300 ${
                  metricas.porcentajeConsumido >= 90 ? 'bg-rose-500' : (metricas.porcentajeConsumido >= 75 ? 'bg-amber-500' : 'bg-emerald-500')
                }`}
                style={{ width: `${metricas.porcentajeConsumido}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium text-slate-500">
              <span>Inicio: <strong>{selectedServicio.inicioVigencia}</strong></span>
              <span>{metricas.porcentajeConsumido}% tiempo consumido ({metricas.diasTranscurridos} de {metricas.duracionTotalDias} días)</span>
              <span>
                Fin: <strong className={metricas.esVencido ? 'text-rose-600' : 'text-slate-900'}>{selectedServicio.finVigencia}</strong>
                {' '}({metricas.esVencido ? `Vencido con ${metricas.diasDesfase}d desfase` : `${metricas.diasRestantes} días restantes`})
              </span>
            </div>
          </div>
        </div>

        {/* Contenido Principal de la Ficha */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Tarjeta de Notificación / Alerta Activa si aplica */}
          {metricas.requiereAlertaTemprana && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              metricas.nivelAlertaGestion === 'critico' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {metricas.nivelAlertaGestion === 'critico' ? 'Atención Inmediata Requerida' : 'Alerta Temprana de Gestión'}
                </h4>
                <p className="text-xs mt-1 font-medium">
                  {metricas.mensajeAlertaGestion}. Modalidad Guatecompras: <strong>{selectedServicio.modalidad}</strong> (umbral {metricas.diasUmbralAlerta} días).
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSendAlert}
                    disabled={isSendingEmail}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isSendingEmail ? 'Despachando...' : 'Enviar Alerta por Correo al Responsable'}</span>
                  </button>
                  {emailSentSuccess && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      ¡Notificación de alerta enviada con éxito!
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grid de Información Principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tarjeta: Datos Generales */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Información de Contratación
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">NOG / Expediente:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedServicio.nogExpediente}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Modalidad:</span>
                  <span className="font-bold text-slate-900">{selectedServicio.modalidad}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Proveedor Actual:</span>
                  <span className="font-semibold text-slate-800">{selectedServicio.proveedorActual}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Unidad Responsable:</span>
                  <span className="font-medium text-slate-700">{selectedServicio.departamento || selectedServicio.area}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Riesgo de Continuidad:</span>
                  <span className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                    selectedServicio.riesgoContinuidad === 'Alto' ? 'bg-rose-100 text-rose-800' : (selectedServicio.riesgoContinuidad === 'Medio' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                  }`}>
                    {selectedServicio.riesgoContinuidad}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Acción Requerida:</span>
                  <span className="font-bold text-blue-900">{selectedServicio.accionRequerida || 'No aplica'}</span>
                </div>
              </div>
            </div>

            {/* Tarjeta: Plazos y Responsable */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Vigencias y Cronograma Administrativo
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Fecha Inicio Vigencia:</span>
                  <span className="font-semibold text-slate-800">{selectedServicio.inicioVigencia}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Fecha Fin Vigencia:</span>
                  <span className="font-bold text-slate-900">{selectedServicio.finVigencia}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Fecha Inicio Nueva Gestión:</span>
                  <span className="font-semibold text-blue-900">{selectedServicio.fechaInicioGestion || 'Pendiente de programar'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Responsable de Seguimiento:</span>
                  <span className="font-bold text-slate-900">{selectedServicio.responsableSeguimiento}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400">Registrado por: {selectedServicio.creadoPor}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Objeto / Alcance Técnico */}
          {selectedServicio.objetoAlcance && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Objeto y Alcance Técnico Detallado
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedServicio.objetoAlcance}
              </p>
            </div>
          )}

          {/* Observaciones Técnicas */}
          {selectedServicio.observaciones && (
            <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200 shadow-2xs">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                Observaciones, Licenciamiento y Versiones
              </h3>
              <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-wrap">
                {selectedServicio.observaciones}
              </p>
            </div>
          )}

          {/* Módulo de Adjuntos y Documentos de Respaldo */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-amber-600" />
              Documentos de Respaldo Oficiales (4 Archivos)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              
              <DocumentDetailItem
                title="1. Especificaciones Técnicas"
                subtitle="TDRs / Bases"
                doc={selectedServicio.adjuntos?.especificacionesTecnicas}
                onPreview={(d) => setPreviewDoc(d)}
              />

              <DocumentDetailItem
                title="2. Formulario F56 / F56e"
                subtitle="Requerimiento DAF"
                doc={selectedServicio.adjuntos?.f56}
                onPreview={(d) => setPreviewDoc(d)}
              />

              <DocumentDetailItem
                title="3. Orden de Compra / Contrato"
                subtitle="Contrato Administrativo"
                doc={selectedServicio.adjuntos?.ordenCompra}
                onPreview={(d) => setPreviewDoc(d)}
              />

              <DocumentDetailItem
                title="4. Factura Electrónica"
                subtitle="Comprobante SAT"
                doc={selectedServicio.adjuntos?.factura}
                onPreview={(d) => setPreviewDoc(d)}
              />

            </div>
          </div>

        </div>

        {/* Pie con Acciones */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendAlert}
              disabled={isSendingEmail}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Disparar plantilla oficial de correo de vencimiento"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar Alerta por Correo</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEditClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Servicio</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 transition-colors cursor-pointer"
              title="Eliminar Servicio"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Confirmación de Eliminación */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  ¿Eliminar servicio contratado?
                </h3>
                <p className="text-xs font-semibold text-rose-700 mt-0.5">
                  {selectedServicio.codigo} • NOG: {selectedServicio.nogExpediente}
                </p>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  &ldquo;{selectedServicio.servicioContratado}&rdquo;
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
              <p className="font-semibold">Esta acción es irreversible:</p>
              <p className="text-[11px] text-rose-700">
                El registro será retirado permanentemente de la base de datos Firestore y del sistema central, registrándose en la bitácora de auditoría oficial.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Servicio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Previsualización */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm truncate">{previewDoc.nombre}</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-slate-100 min-h-[350px]">
              {previewDoc.dataUrl?.startsWith('data:image') ? (
                <img src={previewDoc.dataUrl} alt={previewDoc.nombre} className="max-w-full max-h-[70vh] rounded-lg shadow" />
              ) : previewDoc.dataUrl?.startsWith('data:application/pdf') ? (
                <iframe src={previewDoc.dataUrl} className="w-full h-[65vh] rounded-lg border border-slate-300" title={previewDoc.nombre} />
              ) : (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">{previewDoc.nombre}</p>
                  <a
                    href={previewDoc.dataUrl}
                    download={previewDoc.nombre}
                    className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-blue-900 text-white text-xs font-bold"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Archivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

interface DocumentDetailItemProps {
  title: string;
  subtitle: string;
  doc?: AttachedDocument;
  onPreview: (doc: AttachedDocument) => void;
}

const DocumentDetailItem: React.FC<DocumentDetailItemProps> = ({
  title,
  subtitle,
  doc,
  onPreview
}) => {
  return (
    <div className={`p-3 rounded-xl border ${
      doc ? 'bg-white border-emerald-300 shadow-2xs' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1">{title}</h4>
          <p className="text-[10px] text-slate-500">{subtitle}</p>
        </div>
        {doc ? (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Cargado
          </span>
        ) : (
          <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
            Pendiente
          </span>
        )}
      </div>

      <div className="mt-3">
        {doc ? (
          <div>
            <p className="text-[10px] font-medium text-slate-700 truncate" title={doc.nombre}>
              📎 {doc.nombre}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {doc.dataUrl && (
                <button
                  type="button"
                  onClick={() => onPreview(doc)}
                  className="p-1 px-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  Ver
                </button>
              )}
              {doc.dataUrl && (
                <a
                  href={doc.dataUrl}
                  download={doc.nombre}
                  className="p-1 px-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold inline-flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Descargar
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 italic">Documento no digitalizado aún.</p>
        )}
      </div>
    </div>
  );
};
