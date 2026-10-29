import React, { useState, useMemo, useRef } from 'react';
import { 
  GitBranch, 
  Clock, 
  FileText, 
  User, 
  Calendar, 
  Paperclip, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Upload, 
  X, 
  Building2,
  Tag,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Send,
  Sparkles
} from 'lucide-react';
import { PurchaseRecord, PurchaseObservacion, AttachedDocument } from '../types';
import { formatDate, formatDateTime, formatFileSize } from '../utils/formatters';
import { getPurchaseObservaciones } from '../utils/movementUtils';
import { downloadDocumentFile } from '../utils/documentUtils';
import { useApp } from '../context/AppContext';
import { DocumentPreview } from './DocumentPreview';
import { canUserEditPurchase } from '../utils/rbacUtils';

interface PurchaseActionTreeProps {
  purchase: Partial<PurchaseRecord>;
  onSelectAction?: (observacion: PurchaseObservacion) => void;
  compact?: boolean;
  initialFilterState?: 'todos' | 'con_documento';
  onNavigateToFullTree?: () => void;
  defaultOpenForm?: boolean;
}

const CATEGORIAS_OBSERVACION = [
  'Observación Técnica',
  'Seguimiento de Expediente',
  'Dictamen y Viabilidad',
  'Aclaración Presupuestaria',
  'Requerimiento de Compras',
  'Oficio / Remisión',
  'Resolución Administrativa',
  'Otro'
];

export const PurchaseActionTree: React.FC<PurchaseActionTreeProps> = ({
  purchase,
  compact = false,
  initialFilterState = 'todos',
  onNavigateToFullTree,
  defaultOpenForm = true
}) => {
  const { 
    addPurchaseObservation, 
    deletePurchaseObservation, 
    currentUser, 
    showToast 
  } = useApp();

  const canEdit = canUserEditPurchase(currentUser);

  // Estados de control
  const [filterWithDoc, setFilterWithDoc] = useState(initialFilterState === 'con_documento');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingObservation, setIsAddingObservation] = useState(!compact && defaultOpenForm);
  const [previewDocument, setPreviewDocument] = useState<AttachedDocument | null>(null);
  const [expandedObs, setExpandedObs] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Estados del Formulario de Nueva Observación
  const [newTitulo, setNewTitulo] = useState('Observación Técnica');
  const [newTexto, setNewTexto] = useState('');
  const [newFecha, setNewFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [newHora, setNewHora] = useState(() => new Date().toTimeString().slice(0, 5));
  const [newArea, setNewArea] = useState(purchase?.areaSolicitante || 'Gerencia de Informática');
  const [newAttachedDoc, setNewAttachedDoc] = useState<AttachedDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Referencia para file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtener lista de observaciones ordenadas estrictamente del MÁS RECIENTE al MÁS ANTIGUO
  const allObservations = useMemo(() => {
    return getPurchaseObservaciones(purchase);
  }, [purchase?.observacionesList, purchase?.movimientos, purchase?.observaciones, purchase]);

  // Filtrado y búsqueda de observaciones
  const filteredObservations = useMemo(() => {
    let list = [...allObservations];

    if (filterWithDoc) {
      list = list.filter(o => Boolean(o.documento?.nombre));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o => 
        o.texto.toLowerCase().includes(q) ||
        (o.titulo && o.titulo.toLowerCase().includes(q)) ||
        o.autor.toLowerCase().includes(q) ||
        (o.area && o.area.toLowerCase().includes(q)) ||
        (o.documento?.nombre && o.documento.nombre.toLowerCase().includes(q)) ||
        o.fecha.includes(q)
      );
    }

    return list;
  }, [allObservations, filterWithDoc, searchQuery]);

  // Observaciones a mostrar en modo compacto (solo las 3 más recientes)
  const displayObservations = useMemo(() => {
    if (compact) {
      return filteredObservations.slice(0, 3);
    }
    return filteredObservations;
  }, [filteredObservations, compact]);

  // Manejador de subida de archivo para la observación
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast({
        type: 'error',
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
        message: `Archivo "${file.name}" listo para adjuntar a la observación.`
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

  // Guardar nueva observación y permitir continuar ingresando varias observaciones
  const handleSaveObservation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!purchase.id) {
      showToast({
        type: 'error',
        title: 'Expediente no guardado',
        message: 'Debe guardar la adquisición antes de asentar observaciones en el árbol.'
      });
      return;
    }

    if (!newTexto.trim()) {
      showToast({
        type: 'error',
        title: 'Observación Requerida',
        message: 'Por favor ingrese el contenido o detalle de la observación técnica.'
      });
      return;
    }

    addPurchaseObservation(purchase.id, {
      texto: newTexto.trim(),
      titulo: newTitulo.trim() || 'Observación Técnica',
      autor: currentUser ? currentUser.nombreCompleto : 'Operador GIT',
      area: newArea.trim() || purchase.areaSolicitante || 'Gerencia de Informática',
      fecha: newFecha,
      hora: newHora,
      documento: newAttachedDoc || undefined
    });

    // Resetear formulario para poder agregar de inmediato la siguiente observación
    setNewTexto('');
    setNewAttachedDoc(null);
    const now = new Date();
    setNewFecha(now.toISOString().slice(0, 10));
    setNewHora(now.toTimeString().slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleExpand = (id: string) => {
    setExpandedObs(prev => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : !allExpanded
    }));
  };

  const isItemExpanded = (id: string) => {
    return expandedObs[id] !== undefined ? expandedObs[id] : allExpanded;
  };

  const toggleAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const resetMap: Record<string, boolean> = {};
    allObservations.forEach(o => {
      resetMap[o.id] = nextState;
    });
    setExpandedObs(resetMap);
  };

  return (
    <div className="space-y-3.5">
      {/* Barra de Herramientas y Encabezado del Árbol */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Árbol de Observaciones</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {allObservations.length} {allObservations.length === 1 ? 'registro' : 'registros'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Historial cronológico inverso: del más reciente al más antiguo
            </p>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {canEdit && purchase.id && !compact && (
            <button
              type="button"
              onClick={() => setIsAddingObservation(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isAddingObservation
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingObservation ? 'Ocultar Formulario' : 'Agregar Observación'}</span>
            </button>
          )}

          {allObservations.length > 0 && !compact && (
            <button
              type="button"
              onClick={toggleAll}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
              title={allExpanded ? 'Contraer todas las observaciones' : 'Expandir todas las observaciones'}
            >
              {allExpanded ? 'Contraer Todo' : 'Expandir Todo'}
            </button>
          )}

          {compact && onNavigateToFullTree && (
            <button
              type="button"
              onClick={onNavigateToFullTree}
              className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Árbol Completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* FORMULARIO DIRECTO PARA IR AGREGANDO OBSERVACIONES */}
      {canEdit && purchase.id && isAddingObservation && !compact && (
        <form 
          onSubmit={handleSaveObservation}
          className="bg-amber-50/70 p-3.5 sm:p-4 rounded-xl border border-amber-300 space-y-3 shadow-2xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
              <Plus className="w-4 h-4 text-amber-700" />
              <span>Registrar Nueva Observación #{allObservations.length + 1}</span>
              <span className="text-[10px] text-amber-800 font-normal hidden sm:inline">
                (Se incorporará al inicio del árbol de forma cronológica)
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
              Del más reciente al más antiguo
            </span>
          </div>

          {/* Fila 1: Título / Categoría, Fecha, Hora, Área */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tipo / Categoría
              </label>
              <select
                value={newTitulo}
                onChange={(e) => setNewTitulo(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              >
                {CATEGORIAS_OBSERVACION.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={newFecha}
                onChange={(e) => setNewFecha(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

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

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Área / Responsable
              </label>
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Ej: Gerencia de Informática"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Fila 2: Texto de la Observación */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-800">
                Detalle de la Observación <span className="text-rose-600">*</span>
              </label>
              <span className="text-[10px] text-slate-500">
                Puede redactar antecedentes, justificaciones técnicas, oficios o estado del requerimiento
              </span>
            </div>
            <textarea
              rows={3}
              value={newTexto}
              onChange={(e) => setNewTexto(e.target.value)}
              placeholder="Escriba la observación técnica, avance o nota de seguimiento a registrar en el expediente..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          {/* Fila 3: Documento Adjunto Opcional y Botón Guardar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex-1">
              {newAttachedDoc ? (
                <div className="inline-flex items-center gap-2 p-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-900">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="font-bold truncate max-w-xs">{newAttachedDoc.nombre}</span>
                  <span className="text-[10px] text-emerald-700">({formatFileSize(newAttachedDoc.tamano)})</span>
                  <button
                    type="button"
                    onClick={() => setNewAttachedDoc(null)}
                    className="p-1 hover:text-rose-600 cursor-pointer"
                    title="Quitar archivo"
                  >
                    <X className="w-3 h-3" />
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
                    className="px-3 py-1.5 border border-dashed border-amber-400 rounded-lg bg-white/80 hover:bg-white text-amber-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-700" />
                    <span>{isUploading ? 'Cargando archivo...' : 'Adjuntar Documento Digital (Opcional)'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-slate-950" />
                <span>Agregar Observación al Árbol</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Barra de Filtro y Búsqueda (solo si hay observaciones y no es compacto) */}
      {!compact && allObservations.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en observaciones por texto, autor, fecha o categoría..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
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

          <button
            type="button"
            onClick={() => setFilterWithDoc(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterWithDoc
                ? 'bg-sky-50 text-sky-800 border-sky-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Paperclip className="w-3 h-3 text-sky-600" />
            <span>Con Documento Adjunto</span>
          </button>
        </div>
      )}

      {/* ÁRBOL CRONOLÓGICO DE OBSERVACIONES (DEL MÁS RECIENTE AL MÁS ANTIGUO) */}
      {displayObservations.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 space-y-2">
          <Clock className="w-8 h-8 mx-auto text-slate-300" />
          <p className="font-semibold text-xs text-slate-700">
            {searchQuery ? 'No se encontraron observaciones que coincidan con la búsqueda.' : 'No hay observaciones registradas en el árbol.'}
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            {canEdit && purchase.id 
              ? 'Haga clic en "Agregar Observación" arriba para registrar la primera observación técnica o seguimiento del expediente.' 
              : 'Las observaciones registradas por los funcionarios aparecerán aquí en orden del más reciente al más antiguo.'}
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:top-2 before:bottom-3 before:left-3 before:w-0.5 before:bg-gradient-to-b before:from-amber-500 before:via-blue-500 before:to-slate-300">
          {displayObservations.map((obs, idx) => {
            const isExpanded = isItemExpanded(obs.id);
            const isLatest = idx === 0;

            return (
              <div key={obs.id || idx} className="relative group animate-in fade-in duration-150">
                {/* Nodo del Árbol con Número Secuencial */}
                <div 
                  className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 shadow-xs flex items-center justify-center text-[10px] font-mono font-black z-10 transition-transform group-hover:scale-110 ${
                    isLatest 
                      ? 'bg-amber-500 border-amber-200 text-slate-950 ring-2 ring-amber-300' 
                      : 'bg-slate-800 border-white text-white'
                  }`}
                  title={`Observación #${obs.numeroAccion || (displayObservations.length - idx)}`}
                >
                  {obs.numeroAccion || (displayObservations.length - idx)}
                </div>

                {/* Tarjeta de la Observación */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  isLatest 
                    ? 'bg-amber-50/40 border-amber-300 shadow-2xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isLatest ? 'bg-amber-200 text-amber-950 font-black' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {obs.titulo || 'Observación Técnica'}
                      </span>

                      {isLatest && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase">
                          Más Reciente
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(obs.fecha)} {obs.hora ? `• ${obs.hora}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <strong>{obs.autor}</strong>
                        {obs.rolUsuario && <span className="text-slate-400">({obs.rolUsuario})</span>}
                      </span>

                      {canEdit && purchase.id && !compact && (
                        <button
                          type="button"
                          onClick={() => {
                            if (deleteConfirmId === obs.id) {
                              deletePurchaseObservation(purchase.id!, obs.id);
                              setDeleteConfirmId(null);
                            } else {
                              setDeleteConfirmId(obs.id);
                              setTimeout(() => setDeleteConfirmId(null), 4000);
                            }
                          }}
                          className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                            deleteConfirmId === obs.id
                              ? 'bg-rose-600 text-white font-bold px-2'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Eliminar esta observación"
                        >
                          {deleteConfirmId === obs.id ? '¿Confirmar?' : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo de la Observación */}
                  <div className="pt-2">
                    <p className="text-xs text-slate-900 leading-relaxed font-normal whitespace-pre-wrap">
                      {obs.texto}
                    </p>

                    {obs.area && (
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>Área: {obs.area}</span>
                      </div>
                    )}
                  </div>

                  {/* Documento Digital Adjunto */}
                  {obs.documento && (
                    <div className="mt-2.5 p-2 rounded-lg bg-sky-50/70 border border-sky-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                        <span className="text-xs font-bold text-sky-950 truncate max-w-xs sm:max-w-md">
                          {obs.documento.nombre}
                        </span>
                        <span className="text-[10px] text-sky-700 shrink-0">
                          ({formatFileSize(obs.documento.tamano)})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDocument(obs.documento!)}
                          className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadDocumentFile(obs.documento!, purchase)}
                          className="p-1 rounded bg-white hover:bg-slate-100 border border-sky-300 text-slate-700 cursor-pointer"
                          title="Descargar documento"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
