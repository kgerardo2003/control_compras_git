import React, { useState, useRef, useMemo } from 'react';
import { JudicaturaRecord, JudicaturaDocumento, CategoriaDocumentoJudicatura } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatFileSize, formatDateTime } from '../../utils/formatters';
import { processAttachedFile, getJudicaturaAttachmentFromIndexedDB } from '../../utils/attachmentStorage';
import { downloadDocumentFile } from '../../utils/documentUtils';
import {
  FileText,
  File,
  Download,
  Eye,
  Trash2,
  PlusCircle,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  Wifi,
  Camera,
  Paperclip,
  FileCheck,
  Maximize2,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';

interface JudicaturaDocumentsSectionProps {
  judicatura: JudicaturaRecord;
  canEdit: boolean;
  onPreviewDocument?: (doc: JudicaturaDocumento) => void;
}

const CATEGORIAS_DOCUMENTO: CategoriaDocumentoJudicatura[] = [
  'Acta de Entrega',
  'Dictamen Técnico GIT',
  'Plano / Diagrama de Red',
  'Formulario F56',
  'Contrato / Enlace',
  'Oficio Oficial',
  'Evidencia Fotográfica',
  'General'
];

export const JudicaturaDocumentsSection: React.FC<JudicaturaDocumentsSectionProps> = ({
  judicatura,
  canEdit,
  onPreviewDocument
}) => {
  const { addJudicaturaDocumento, deleteJudicaturaDocumento, currentUser, showToast } = useApp();

  // Estados del uploader
  const [isDropOver, setIsDropOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<CategoriaDocumentoJudicatura>('Acta de Entrega');
  const [customCategoria, setCustomCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Estados de filtrado y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todos');

  // Estados de visualización y confirmación de eliminación
  const [previewDoc, setPreviewDoc] = useState<JudicaturaDocumento | null>(null);
  const [docToDelete, setDocToDelete] = useState<JudicaturaDocumento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-sugerir categoría en base al nombre del archivo
  const suggestCategoryFromFilename = (filename: string): CategoriaDocumentoJudicatura => {
    const lower = filename.toLowerCase();
    if (lower.includes('acta') || lower.includes('entrega') || lower.includes('recepcion')) {
      return 'Acta de Entrega';
    }
    if (lower.includes('dictamen') || lower.includes('tecnico') || lower.includes('git')) {
      return 'Dictamen Técnico GIT';
    }
    if (lower.includes('plano') || lower.includes('diagrama') || lower.includes('red') || lower.includes('cableado')) {
      return 'Plano / Diagrama de Red';
    }
    if (lower.includes('f56') || lower.includes('f-56') || lower.includes('formulario')) {
      return 'Formulario F56';
    }
    if (lower.includes('contrato') || lower.includes('enlace') || lower.includes('servicio') || lower.includes('ancho')) {
      return 'Contrato / Enlace';
    }
    if (lower.includes('oficio') || lower.includes('nota') || lower.includes('memorandum')) {
      return 'Oficio Oficial';
    }
    if (lower.includes('foto') || lower.includes('evidencia') || lower.includes('imagen') || lower.includes('cam')) {
      return 'Evidencia Fotográfica';
    }
    return 'General';
  };

  const handleFileSelection = (file: File) => {
    setUploadError(null);
    if (!file) return;

    // Validación de tamaño (25MB máximo)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`El archivo supera el tamaño máximo permitido de 25 MB (${formatFileSize(file.size)}).`);
      return;
    }

    setSelectedFile(file);
    const suggested = suggestCategoryFromFilename(file.name);
    setCategoria(suggested);
    setIsFormOpen(true);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleResetForm = () => {
    setSelectedFile(null);
    setDescripcion('');
    setCustomCategoria('');
    setCategoria('Acta de Entrega');
    setUploadError(null);
    setIsFormOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Por favor seleccione un archivo para adjuntar.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const processed = await processAttachedFile(selectedFile);
      const chosenCat = customCategoria.trim() ? customCategoria.trim() : categoria;

      const docItem: JudicaturaDocumento = {
        ...processed,
        categoria: chosenCat,
        descripcion: descripcion.trim() || undefined,
        subidoPor: currentUser?.nombreCompleto || currentUser?.username || 'Funcionario OJ'
      };

      const res = await addJudicaturaDocumento(judicatura.id, docItem);
      if (res.success) {
        handleResetForm();
      } else {
        setUploadError(res.message || 'No se pudo guardar el documento.');
      }
    } catch (err: any) {
      console.error('Error al procesar documento de judicatura:', err);
      setUploadError(err?.message || 'Error inesperado al digitalizar el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      const targetId = docToDelete.id || docToDelete.nombre;
      await deleteJudicaturaDocumento(judicatura.id, targetId);
      setDocToDelete(null);
    } catch (err) {
      console.error('Error al eliminar documento:', err);
      showToast({
        title: 'Error',
        message: 'No se pudo eliminar el documento de la ficha.',
        type: 'alerta'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenPreview = async (doc: JudicaturaDocumento) => {
    if (onPreviewDocument) {
      onPreviewDocument(doc);
      return;
    }

    // Si dataUrl falta o se guardó en IndexedDB, recuperarlo
    let docToView = { ...doc };
    if (!docToView.dataUrl) {
      try {
        const stored = await getJudicaturaAttachmentFromIndexedDB(judicatura.id, doc.nombre);
        if (stored?.dataUrl) {
          docToView.dataUrl = stored.dataUrl;
        }
      } catch (e) {
        console.warn('No se pudo recuperar dataUrl de IndexedDB:', e);
      }
    }
    setPreviewDoc(docToView);
  };

  // Documentos filtrados
  const documentList: JudicaturaDocumento[] = useMemo(() => {
    return Array.isArray(judicatura.documentos) ? judicatura.documentos : [];
  }, [judicatura.documentos]);

  const filteredDocuments = useMemo(() => {
    return documentList.filter((doc) => {
      // Filtro de Categoría
      const matchCat =
        selectedCategoryFilter === 'Todos' ||
        (doc.categoria || 'General').toLowerCase() === selectedCategoryFilter.toLowerCase();

      // Filtro de búsqueda
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (doc.nombre || '').toLowerCase().includes(q) ||
        (doc.descripcion || '').toLowerCase().includes(q) ||
        (doc.categoria || '').toLowerCase().includes(q) ||
        (doc.subidoPor || '').toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [documentList, selectedCategoryFilter, searchTerm]);

  // Conteo por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: documentList.length };
    documentList.forEach((d) => {
      const cat = d.categoria || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [documentList]);

  // Helper de badges y colores según categoría
  const getCategoryBadgeStyle = (cat?: string) => {
    switch (cat) {
      case 'Acta de Entrega':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Dictamen Técnico GIT':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Plano / Diagrama de Red':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Formulario F56':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'Contrato / Enlace':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Oficio Oficial':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'Evidencia Fotográfica':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getFileIcon = (doc: JudicaturaDocumento) => {
    const filename = (doc.nombre || '').toLowerCase();
    const mime = (doc.tipo || '').toLowerCase();

    if (filename.endsWith('.pdf') || mime.includes('pdf')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
          <FileText className="w-5 h-5 text-rose-600" />
        </div>
      );
    }
    if (
      filename.endsWith('.xls') ||
      filename.endsWith('.xlsx') ||
      filename.endsWith('.csv') ||
      mime.includes('sheet') ||
      mime.includes('excel')
    ) {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
        </div>
      );
    }
    if (
      filename.endsWith('.jpg') ||
      filename.endsWith('.jpeg') ||
      filename.endsWith('.png') ||
      filename.endsWith('.webp') ||
      mime.startsWith('image/')
    ) {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
          <Camera className="w-5 h-5 text-amber-600" />
        </div>
      );
    }
    if (filename.endsWith('.doc') || filename.endsWith('.docx') || mime.includes('word')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs">
          <FileText className="w-5 h-5 text-blue-700" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
        <Paperclip className="w-5 h-5 text-slate-600" />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Cabecera de la Sección */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10 border border-white/20">
            <Paperclip className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wide uppercase">
                Expediente Digital y Documentos Adjuntos
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-black border border-amber-400/40">
                {documentList.length} {documentList.length === 1 ? 'archivo' : 'archivos'}
              </span>
            </div>
            <p className="text-[11px] text-blue-200">
              Actas de entrega, dictámenes técnicos GIT, planos de red, contratos y oficios
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              if (!isFormOpen) {
                setTimeout(() => fileInputRef.current?.click(), 100);
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              isFormOpen
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 hover:shadow-md'
            }`}
          >
            {isFormOpen ? (
              <>
                <X className="w-4 h-4" />
                <span>Cerrar Formulario</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>Adjuntar Documento</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Formulario para Subir / Adjuntar Nuevo Documento */}
      {isFormOpen && canEdit && (
        <form
          onSubmit={handleUploadSubmit}
          className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
            <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5 uppercase tracking-wider">
              <Upload className="w-4 h-4 text-blue-800" />
              Cargar Archivo al Expediente de la Judicatura
            </span>
            <span className="text-[10px] text-slate-500">
              Formatos soportados: <strong>PDF, Word, Excel, JPG, PNG, WEBP</strong> (Máx 25 MB)
            </span>
          </div>

          {/* Zona de Arrastrar y Soltar o Selector */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-5 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
              isDropOver
                ? 'border-blue-700 bg-blue-100/80 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500 bg-emerald-50/60'
                : 'border-blue-300 bg-white hover:bg-blue-50/40 hover:border-blue-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-black text-xs text-emerald-950 truncate max-w-sm sm:max-w-md">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Tamaño: <strong>{formatFileSize(selectedFile.size)}</strong> • Haga clic o arrastre otro para reemplazar
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-7 h-7 text-blue-800 mx-auto" />
                <p className="font-bold text-xs text-blue-950">
                  Arrastre y suelte su archivo aquí, o <span className="text-blue-700 underline">explore en su equipo</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Digitalización instantánea con almacenamiento seguro y respaldo automático
                </p>
              </div>
            )}
          </div>

          {/* Configuración de Metadatos del Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Categoría Oficial */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Categoría del Documento <span className="text-rose-600">*</span>
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaDocumentoJudicatura)}
                className="w-full p-2.5 bg-white border border-blue-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-800"
              >
                {CATEGORIAS_DOCUMENTO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subido por */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Funcionario / Responsable
              </label>
              <input
                type="text"
                disabled
                value={currentUser?.nombreCompleto || currentUser?.username || 'Funcionario OJ'}
                className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          {/* Descripción / Notas del Documento */}
          <div className="text-xs">
            <label className="block font-bold text-slate-800 mb-1">
              Descripción o Detalle Técnico del Documento (Opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="ej. Acta suscrita con el Juez de Paz y Administrador de Sede Judicial, certificando equipos..."
              className="w-full p-2.5 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-800"
            />
          </div>

          {/* Mensaje de Error */}
          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer shadow-2xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Cargando y Digitalizando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Adjuntar a la Ficha</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Barra de Filtros y Búsqueda de Documentos */}
      {documentList.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, categoría, descripción o funcionario..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-semibold">
              Mostrando {filteredDocuments.length} de {documentList.length} documentos
            </div>
          </div>

          {/* Píldoras de Filtro por Categoría */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200">
            {['Todos', ...CATEGORIAS_DOCUMENTO].map((catName) => {
              const count = categoryCounts[catName] || 0;
              if (catName !== 'Todos' && count === 0) return null; // Ocultar vacías para ahorrar espacio
              const isSelected = selectedCategoryFilter === catName;
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(catName)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-900 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{catName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Documentos Adjuntos */}
      {documentList.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-2">
          <Paperclip className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-black text-xs text-slate-700 uppercase tracking-wide">
            Expediente Digital Vacío
          </h4>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            No se han adjuntado documentos técnicos, actas de entrega o evidencias para esta judicatura.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(true);
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Adjuntar Primer Documento</span>
            </button>
          )}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
          No se encontraron documentos con el criterio de búsqueda "{searchTerm}" en la categoría "{selectedCategoryFilter}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDocuments.map((doc, idx) => {
            const docId = doc.id || doc.nombre || `doc-${idx}`;
            return (
              <div
                key={docId}
                className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-blue-300 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {getFileIcon(doc)}
                      <div className="min-w-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase border mb-1 ${getCategoryBadgeStyle(
                            doc.categoria
                          )}`}
                        >
                          {doc.categoria || 'General'}
                        </span>
                        <h4
                          onClick={() => handleOpenPreview(doc)}
                          className="font-bold text-xs text-slate-900 truncate hover:text-blue-900 cursor-pointer block"
                          title={doc.nombre}
                        >
                          {doc.nombre}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Descripción / Notas */}
                  {doc.descripcion && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg mt-2.5 border border-slate-100 line-clamp-2">
                      {doc.descripcion}
                    </p>
                  )}

                  {/* Metadatos */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                    <span>
                      Tamaño: <strong>{formatFileSize(doc.tamano || 0)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Fecha: <strong>{doc.fechaSubida ? formatDateTime(doc.fechaSubida) : 'N/D'}</strong>
                    </span>
                    {doc.subidoPor && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">
                          Por: <strong>{doc.subidoPor}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(doc)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Previsualizar documento"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-800" />
                      <span>Ver</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDocumentFile(doc)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Descargar documento al equipo"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-700" />
                      <span>Descargar</span>
                    </button>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setDocToDelete(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Eliminar documento del expediente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVISUALIZADOR INTEGRADO DE DOCUMENTO                             */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Cabecera del Visor */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">
                    {previewDoc.categoria || 'Documento Oficial'} • {formatFileSize(previewDoc.tamano || 0)}
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm truncate" title={previewDoc.nombre}>
                    {previewDoc.nombre}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadDocumentFile(previewDoc)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Descargar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido del Documento */}
            <div className="flex-1 p-4 overflow-auto bg-slate-100 flex items-center justify-center min-h-[400px]">
              {previewDoc.dataUrl?.startsWith('data:image') ? (
                <div className="p-2 bg-white rounded-xl shadow-md max-w-full max-h-[70vh] overflow-auto">
                  <img
                    src={previewDoc.dataUrl}
                    alt={previewDoc.nombre}
                    className="max-w-full max-h-[68vh] object-contain rounded-lg mx-auto"
                  />
                </div>
              ) : previewDoc.dataUrl?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.dataUrl}
                  className="w-full h-[70vh] rounded-xl border border-slate-300 bg-white shadow-inner"
                  title={previewDoc.nombre}
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-8 h-8 text-blue-900" />
                  </div>
                  <h4 className="font-black text-sm text-slate-900 mb-1">{previewDoc.nombre}</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Este tipo de documento ({previewDoc.tipo || 'digital'}) está listo para descargarse y abrirse directamente en su visor predeterminado.
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadDocumentFile(previewDoc)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Descargar Archivo Oficial</span>
                  </button>
                </div>
              )}
            </div>

            {/* Pie del Visor */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Judicatura: <strong>{judicatura.nombreJudicatura}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-2xs"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN DE DOCUMENTO                           */}
      {/* ========================================================================= */}
      {docToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-200">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">¿Eliminar Documento?</h3>
                <span className="text-[11px] font-bold text-rose-700 uppercase">
                  Acción irreversible del expediente
                </span>
              </div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 text-xs text-slate-800 space-y-1">
              <p className="font-semibold text-slate-700">Documento a remover:</p>
              <p className="font-black text-slate-900 text-sm">{docToDelete.nombre}</p>
              <p className="text-[11px] text-slate-500">
                Categoría: <strong>{docToDelete.categoria || 'General'}</strong> • Tamaño: <strong>{formatFileSize(docToDelete.tamano || 0)}</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar Documento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
