import React, { useState, useMemo, useRef } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  User, 
  Calendar, 
  Award, 
  Paperclip, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Upload, 
  X, 
  ExternalLink,
  Filter,
  FileCheck,
  Building2,
  Tag,
  Maximize2
} from 'lucide-react';
import { PurchaseRecord, PurchaseMovement, AttachedDocument } from '../types';
import { formatDate, formatDateTime, formatQuetzales } from '../utils/formatters';
import { getPurchaseMovements, MOVEMENT_TYPES } from '../utils/movementUtils';
import { downloadDocumentFile } from '../utils/documentUtils';
import { useApp } from '../context/AppContext';
import { DocumentPreview } from './DocumentPreview';
import { canUserEditPurchase } from '../utils/rbacUtils';

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface PurchaseActionTreeProps {
  purchase: Partial<PurchaseRecord>;
  onSelectAction?: (movement: PurchaseMovement) => void;
  compact?: boolean;
  initialFilterState?: 'todos' | 'con_documento' | 'observaciones' | 'hitos';
  onNavigateToFullTree?: () => void;
}

export const PurchaseActionTree: React.FC<PurchaseActionTreeProps> = ({
  purchase,
  compact = false,
  initialFilterState = 'todos',
  onNavigateToFullTree
}) => {
  const { 
    addPurchaseMovement, 
    deletePurchaseMovement, 
    attachDocumentToMovement, 
    updatePurchase, 
    currentUser, 
    showToast 
  } = useApp();

  const canEdit = canUserEditPurchase(currentUser);

  // Estados de control
  const [filterType, setFilterType] = useState<'todos' | 'con_documento' | 'observaciones' | 'hitos'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingMovement, setIsAddingMovement] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<AttachedDocument | null>(null);
  const [targetMovementForDoc, setTargetMovementForDoc] = useState<string | null>(null);
  const [expandedMovements, setExpandedMovements] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(true);

  // Estados del Formulario de Nuevo Movimiento
  const [newTitulo, setNewTitulo] = useState('Observación Técnica');
  const [newTipo, setNewTipo] = useState('observacion');
  const [newFecha, setNewFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [newHora, setNewHora] = useState(() => new Date().toTimeString().slice(0, 5));
  const [newResponsable, setNewResponsable] = useState(purchase?.areaSolicitante || 'Gerencia de Informática');
  const [newObservaciones, setNewObservaciones] = useState('');
  const [newEstatusCambio, setNewEstatusCambio] = useState('');
  const [newAttachedDoc, setNewAttachedDoc] = useState<AttachedDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Referencias para file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const movementAttachInputRef = useRef<HTMLInputElement>(null);

  // Obtener lista completa de movimientos ordenados cronológicamente (más reciente al más antiguo)
  const allMovements = useMemo(() => {
    return getPurchaseMovements(purchase);
  }, [purchase?.movimientos, purchase]);

  // Filtrado y búsqueda de movimientos
  const filteredMovements = useMemo(() => {
    let list = [...allMovements];

    if (filterType === 'con_documento') {
      list = list.filter(m => Boolean(m.documento?.nombre));
    } else if (filterType === 'observaciones') {
      list = list.filter(m => m.tipoAccion === 'observacion' || !m.automatico);
    } else if (filterType === 'hitos') {
      list = list.filter(m => m.tipoAccion === 'avance' || m.tipoAccion === 'adjudicacion' || m.tipoAccion === 'pago');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m => 
        m.titulo.toLowerCase().includes(q) ||
        m.observaciones.toLowerCase().includes(q) ||
        m.usuario.toLowerCase().includes(q) ||
        (m.responsable && m.responsable.toLowerCase().includes(q)) ||
        (m.documento?.nombre && m.documento.nombre.toLowerCase().includes(q)) ||
        m.fecha.includes(q)
      );
    }

    return list;
  }, [allMovements, filterType, searchQuery]);

  // Movimientos a mostrar (en modo compacto solo los primeros 4)
  const displayMovements = useMemo(() => {
    if (compact) {
      return filteredMovements.slice(0, 4);
    }
    return filteredMovements;
  }, [filteredMovements, compact]);

  // Conteo de documentos adjuntos
  const totalDocumentsCount = useMemo(() => {
    return allMovements.filter(m => Boolean(m.documento?.nombre)).length;
  }, [allMovements]);

  // Manejador de carga de archivo para nuevo movimiento
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast({
        type: 'alerta',
        title: 'Archivo Demasiado Grande',
        message: 'El tamaño máximo permitido es de 25 MB.'
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setNewAttachedDoc({
        nombre: file.name,
        tamano: file.size,
        tipo: file.type || 'application/pdf',
        fechaSubida: new Date().toISOString(),
        dataUrl
      });
      setIsUploading(false);
      showToast({
        type: 'info',
        title: 'Documento Cargado',
        message: `Archivo "${file.name}" preparado para adjuntar a la observación.`
      });
    };
    reader.onerror = () => {
      setIsUploading(false);
      showToast({
        type: 'error',
        title: 'Error de Lectura',
        message: 'No se pudo leer el archivo seleccionado.'
      });
    };
    reader.readAsDataURL(file);
  };

  // Manejador de adjuntar documento a movimiento existente
  const handleAttachToExistingMovement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetMovementForDoc || !purchase.id) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast({
        type: 'alerta',
        title: 'Archivo Demasiado Grande',
        message: 'El tamaño máximo permitido es de 25 MB.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const doc: AttachedDocument = {
        nombre: file.name,
        tamano: file.size,
        tipo: file.type || 'application/pdf',
        fechaSubida: new Date().toISOString(),
        dataUrl: reader.result as string
      };
      attachDocumentToMovement(purchase.id!, targetMovementForDoc, doc);
      setTargetMovementForDoc(null);
    };
    reader.readAsDataURL(file);
  };

  // Guardar nuevo movimiento
  const handleSaveMovement = () => {
    if (!purchase.id) {
      showToast({
        type: 'alerta',
        title: 'No se puede registrar',
        message: 'La ficha aún no ha sido creada o guardada en el sistema.'
      });
      return;
    }

    if (!newTitulo.trim()) {
      showToast({
        type: 'alerta',
        title: 'Título Obligatorio',
        message: 'Por favor ingrese el título de la acción u observación.'
      });
      return;
    }

    if (!newObservaciones.trim()) {
      showToast({
        type: 'alerta',
        title: 'Observación Obligatoria',
        message: 'Por favor redacte el detalle u observación a asentar en el árbol.'
      });
      return;
    }

    addPurchaseMovement(purchase.id, {
      titulo: newTitulo.trim(),
      tipoAccion: newTipo,
      fecha: newFecha,
      hora: newHora,
      observaciones: newObservaciones.trim(),
      responsable: newResponsable.trim(),
      usuario: currentUser ? currentUser.nombreCompleto : 'Operador GIT',
      rolUsuario: currentUser?.rol,
      estatusAlMomento: newEstatusCambio || purchase.estatusEvento,
      documento: newAttachedDoc || undefined,
      automatico: false
    });

    // Resetear formulario
    setNewTitulo('Observación Técnica');
    setNewTipo('observacion');
    setNewObservaciones('');
    setNewEstatusCambio('');
    setNewAttachedDoc(null);
    setIsAddingMovement(false);
  };

  // Alternar expansión de observación en un nodo
  const toggleExpand = (id: string) => {
    setExpandedMovements(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const newMap: Record<string, boolean> = {};
    allMovements.forEach(m => {
      newMap[m.id] = nextState;
    });
    setExpandedMovements(newMap);
  };

  // Sugerencias de títulos rápidos
  const TITLE_SUGGESTIONS = [
    { label: 'Observación Técnica', tipo: 'observacion' },
    { label: 'Oficio a Dirección de Compras', tipo: 'oficio' },
    { label: 'Dictamen Técnico Aprobado', tipo: 'dictamen' },
    { label: 'Revisión de Especificaciones', tipo: 'observacion' },
    { label: 'Recepción de Muestra / Prueba', tipo: 'avance' },
    { label: 'Acta de Junta Calificadora', tipo: 'adjudicacion' },
    { label: 'Requerimiento de Documentación', tipo: 'documento' },
    { label: 'Trámite de Liquidación Contable', tipo: 'pago' }
  ];

  return (
    <div className="space-y-4">
      {/* Input oculto para adjuntar archivo a movimiento existente */}
      <input 
        type="file" 
        ref={movementAttachInputRef}
        onChange={handleAttachToExistingMovement}
        className="hidden" 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
      />

      {/* Barra Superior de Control del Árbol */}
      {!compact && (
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-bold shrink-0">
                <GitBranch className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Árbol Cronológico de Movimientos y Acciones
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                    {allMovements.length} {allMovements.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Orden cronológico: del más reciente al más antiguo con soporte para documentos adjuntos por observación.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsAddingMovement(prev => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                    isAddingMovement 
                      ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' 
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {isAddingMovement ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Cerrar Formulario</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Registrar Acción / Observación</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={toggleAll}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                title="Expandir o contraer todas las observaciones"
              >
                {allExpanded ? 'Contraer Todo' : 'Expandir Todo'}
              </button>
            </div>
          </div>

          {/* Filtros rápidos y Barra de Búsqueda */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterType('todos')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'todos' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({allMovements.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('con_documento')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  filterType === 'con_documento' 
                    ? 'bg-sky-600 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Paperclip className="w-3 h-3" />
                <span>Con Documento ({totalDocumentsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('observaciones')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'observaciones' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Observaciones
              </button>
              <button
                type="button"
                onClick={() => setFilterType('hitos')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'hitos' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hitos y Estatus
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar acción, usuario, fecha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulario Interactivo para Registrar Acción / Observación */}
      {isAddingMovement && !compact && (
        <div className="bg-amber-50/60 rounded-xl border border-amber-300 p-4 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Registrar Nuevo Movimiento u Observación en el Árbol
                </h4>
                <p className="text-[11px] text-amber-800">
                  Se insertará en el orden cronológico correspondiente y quedará asentado en el expediente.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingMovement(false)}
              className="p-1 rounded text-amber-700 hover:text-amber-950 hover:bg-amber-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sugerencias Rápidas */}
          <div>
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
              Plantillas Rápidas de Acción:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TITLE_SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNewTitulo(sug.label);
                    setNewTipo(sug.tipo);
                  }}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Título de la acción */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Título del Movimiento / Acción *
              </label>
              <input
                type="text"
                value={newTitulo}
                onChange={(e) => setNewTitulo(e.target.value)}
                placeholder="Ej: Observación Técnica sobre Especificaciones"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>

            {/* Tipo de Acción */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tipo de Acción
              </label>
              <select
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              >
                {Object.values(MOVEMENT_TYPES).map(t => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Fecha del Movimiento
              </label>
              <input
                type="date"
                value={newFecha}
                onChange={(e) => setNewFecha(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            {/* Hora */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Hora
              </label>
              <input
                type="time"
                value={newHora}
                onChange={(e) => setNewHora(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            {/* Área / Responsable */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Dependencia / Responsable
              </label>
              <input
                type="text"
                value={newResponsable}
                onChange={(e) => setNewResponsable(e.target.value)}
                placeholder="Ej: Gerencia de Informática - GIT"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Observaciones Detalladas */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Observación Técnica / Descripción Detallada *
            </label>
            <textarea
              rows={3}
              value={newObservaciones}
              onChange={(e) => setNewObservaciones(e.target.value)}
              placeholder="Describa ampliamente los antecedentes, resultados, justificaciones o detalles de esta observación institucional..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed font-normal"
            />
          </div>

          {/* Opciones Adicionales: Cambio de Estatus y Adjuntar Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Actualizar Estatus de la Adquisición */}
            <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Actualizar Estatus del Evento (Opcional):
              </label>
              <select
                value={newEstatusCambio}
                onChange={(e) => setNewEstatusCambio(e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Mantener estatus actual ({purchase.estatusEvento || 'Vigente'})</option>
                <option value="Evaluación">Cambiar a: Evaluación</option>
                <option value="Adjudicación">Cambiar a: Adjudicación</option>
                <option value="Vigente">Cambiar a: Vigente</option>
                <option value="Prescindido">Cambiar a: Prescindido</option>
                <option value="Desierto">Cambiar a: Desierto</option>
              </select>
              <p className="text-[10px] text-slate-500">
                Si esta acción cambia la etapa de la compra, puede asignarlo directamente aquí.
              </p>
            </div>

            {/* Adjuntar Documento Digital a la Observación */}
            <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-amber-700" />
                  Adjuntar Documento a la Observación
                </span>
                <span className="text-[10px] text-slate-400 font-normal">PDF, DOC, XLS, IMG (Máx 25MB)</span>
              </label>

              {newAttachedDoc ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold block truncate">{newAttachedDoc.nombre}</span>
                      <span className="text-[10px] text-emerald-700">{formatFileSize(newAttachedDoc.tamano)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewAttachedDoc(null)}
                    className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded cursor-pointer"
                    title="Quitar archivo adjunto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 px-3 border border-dashed border-amber-400 rounded-lg bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-700" />
                    <span>{isUploading ? 'Procesando archivo...' : 'Seleccionar Documento para Adjuntar'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={() => setIsAddingMovement(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveMovement}
              className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Guardar en el Árbol Cronológico</span>
            </button>
          </div>
        </div>
      )}

      {/* ÁRBOL CRONOLÓGICO VISUAL (DEL MÁS RECIENTE AL MÁS ANTIGUO) */}
      <div className="relative pl-6 sm:pl-8 space-y-4">
        {/* Tronco Central del Árbol */}
        <div className="absolute left-2.5 sm:left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-600 via-amber-400 to-slate-300" />

        {displayMovements.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
            <GitBranch className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-slate-700">Sin movimientos que coincidan</h4>
            <p className="text-xs text-slate-400 mt-1">
              No se encontraron registros para los filtros seleccionados.
            </p>
          </div>
        ) : (
          displayMovements.map((mov, index) => {
            const typeConfig = MOVEMENT_TYPES[mov.tipoAccion] || MOVEMENT_TYPES.otro;
            const isExpanded = expandedMovements[mov.id] ?? allExpanded;
            const isLatest = index === 0;

            return (
              <div 
                key={mov.id || index}
                className="relative group transition-all"
              >
                {/* Nodo en el Tronco del Árbol */}
                <div className={`absolute -left-6 sm:-left-8 top-3 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 z-10 ${
                  isLatest ? 'border-amber-600 ring-2 ring-amber-300' : 'border-slate-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${typeConfig.dotColor}`} />
                </div>

                {/* Rama Conectora */}
                <div className="absolute -left-2 top-5 w-2 h-0.5 bg-slate-300" />

                {/* Tarjeta del Movimiento / Observación */}
                <div className={`rounded-xl border transition-all ${
                  isLatest 
                    ? 'bg-amber-50/40 border-amber-300 shadow-xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                } p-3.5 space-y-2`}>
                  
                  {/* Encabezado del Nodo: Fecha, Tipo y Estatus */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Badge Cronológico */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatDate(mov.fecha)} {mov.hora ? `• ${mov.hora}` : ''}
                      </span>

                      {isLatest && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white shadow-2xs">
                          Más Reciente
                        </span>
                      )}

                      {/* Tipo de Acción */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${typeConfig.badgeBg} ${typeConfig.badgeText}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dotColor}`} />
                        {typeConfig.label}
                      </span>

                      {mov.estatusAlMomento && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Estatus: {mov.estatusAlMomento}
                        </span>
                      )}
                    </div>

                    {/* Acciones Rápidas en la Cabecera */}
                    <div className="flex items-center gap-1.5">
                      {mov.documento && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          <Paperclip className="w-2.5 h-2.5" />
                          Doc Adjunto
                        </span>
                      )}

                      {!compact && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(mov.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title={isExpanded ? 'Contraer detalle' : 'Expandir detalle'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Título Principal de la Acción */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {mov.titulo}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                        {mov.responsable && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <strong>Área:</strong> {mov.responsable}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <strong>Por:</strong> {mov.usuario} {mov.rolUsuario ? `(${mov.rolUsuario})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo de la Observación / Detalle Técnico */}
                  {isExpanded && (
                    <div className="pt-1 space-y-2">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-normal">
                        {mov.observaciones}
                      </div>

                      {/* DOCUMENTO ADJUNTO A ESTE MOVIMIENTO */}
                      {mov.documento ? (
                        <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-sky-950 block truncate">
                                {mov.documento.nombre}
                              </span>
                              <span className="text-[10px] text-sky-700 block">
                                Tamaño: {formatFileSize(mov.documento.tamano)} • Subido: {formatDate(mov.documento.fechaSubida || mov.fecha)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewDocument(mov.documento!)}
                              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver Documento</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadDocumentFile(mov.documento!, purchase)}
                              className="p-1 rounded bg-white hover:bg-slate-100 border border-sky-200 text-slate-700 cursor-pointer"
                              title="Descargar archivo adjunto"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {canEdit && purchase.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Remover documento de este movimiento
                                  const updated = allMovements.map(m => m.id === mov.id ? { ...m, documento: undefined } : m);
                                  updatePurchase(purchase.id!, { movimientos: updated });
                                  showToast({
                                    type: 'info',
                                    title: 'Documento Removido',
                                    message: 'Se desvinculó el archivo adjunto de esta observación.'
                                  });
                                }}
                                className="p-1 rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer"
                                title="Quitar archivo adjunto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Opción para adjuntar documento a este movimiento si aún no lo tiene
                        canEdit && purchase.id && !compact && (
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setTargetMovementForDoc(mov.id);
                                movementAttachInputRef.current?.click();
                              }}
                              className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer hover:underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>+ Adjuntar documento a esta observación</span>
                            </button>
                          </div>
                        )
                      )}

                      {/* Botón para eliminar movimiento manual (si no es automático de inicio) */}
                      {canEdit && purchase.id && !mov.automatico && !compact && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => deletePurchaseMovement(purchase.id!, mov.id)}
                            className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Eliminar esta anotación</span>
                          </button>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pie del Modo Compacto: Botón para Ir a la Pestaña Completa */}
      {compact && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500 font-medium">
            Mostrando las 4 acciones más recientes de un total de {allMovements.length}.
          </span>
          {onNavigateToFullTree && (
            <button
              type="button"
              onClick={onNavigateToFullTree}
              className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver Árbol Completo y Registrar Acciones</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Modal de Previsualización de Documento */}
      {previewDocument && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-amber-400" />
                <span className="text-xs sm:text-sm font-bold truncate max-w-md">
                  {previewDocument.nombre}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({formatFileSize(previewDocument.tamano)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadDocumentFile(previewDocument, purchase)}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[420px]">
              <DocumentPreview
                document={previewDocument}
                purchase={purchase}
                title={previewDocument.nombre}
                isInline={false}
                onClose={() => setPreviewDocument(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
