import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Save, 
  FileText, 
  Hash, 
  ShieldCheck,
  Calendar,
  Tag,
  Paperclip,
  UploadCloud,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { EvaluacionGIT, AttachedDocument } from '../types';
import { formatQuetzales } from '../utils/formatters';

// Función para aplicar la máscara de entrada 000000-0000 a F56-e
const formatF56eInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 6) {
    return digits;
  }
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
};

// Función para aplicar la máscara de entrada 000000 a F56
const formatF56Input = (raw: string): string => {
  return raw.replace(/\D/g, '').slice(0, 6);
};

// Función para aplicar la máscara de entrada de valores: 000,000,000.00
const formatMontoMask = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PurchaseFormModal: React.FC = () => {
  const { 
    isPurchaseModalOpen, 
    setIsPurchaseModalOpen, 
    purchaseToEdit, 
    setPurchaseToEdit,
    addPurchase, 
    updatePurchase, 
    catalogs,
    themeConfig
  } = useApp();

  // Estados del Formulario (Validaciones de longitud y tipos requeridos)
  const [descripcion, setDescripcion] = useState('');
  const [f56e, setF56e] = useState('');
  const [f56, setF56] = useState('');
  const [f56Documento, setF56Documento] = useState<AttachedDocument | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fechaSolicitud, setFechaSolicitud] = useState('');
  const [fechaVoBo, setFechaVoBo] = useState('');
  const [fechaAutorizado, setFechaAutorizado] = useState('');
  const [nog, setNog] = useState('');
  const [fechaPublicacion, setFechaPublicacion] = useState('');
  const [fechaOfertas, setFechaOfertas] = useState('');
  const [cantidadOfertas, setCantidadOfertas] = useState<number>(0);
  const [monto, setMonto] = useState<number | ''>('');
  const [montoInput, setMontoInput] = useState<string>('');
  const [evaluadoGIT, setEvaluadoGIT] = useState<EvaluacionGIT>('Sí');
  const [fechaDictamenGIT, setFechaDictamenGIT] = useState<string>('');
  const [estatusEvento, setEstatusEvento] = useState<string>('Evaluación');
  const [areaSolicitante, setAreaSolicitante] = useState('Soporte técnico');
  const [categoriaTecnologica, setCategoriaTecnologica] = useState('');
  const [dependenciaSolicitante, setDependenciaSolicitante] = useState('');
  const [modalidadCompra, setModalidadCompra] = useState('Cotización Pública');
  const [proveedorAdjudicado, setProveedorAdjudicado] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener opciones de catálogos
  const statusCatalog = catalogs.find(c => c.codigo === 'ESTATUS_EVENTO');
  const statusOptions = statusCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Evaluación', 'Adjudicación', 'Prescindido', 'Desierto'
  ];

  const areaCatalog = catalogs.find(c => c.codigo === 'AREA_SOLICITANTE');
  const areaOptions = areaCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Soporte técnico',
    'Soporte Técnico Remoto',
    'Sección de Videoaudiencias',
    'Redes y Telecomunicaciones',
    'Desarrollo y Administración de Sistemas',
    'Departamento de Servicios Informáticos',
    'Seguridad Informática'
  ];

  const categoryCatalog = catalogs.find(c => c.codigo === 'CATEGORIA_TECNOLOGICA');
  const categoryOptions = categoryCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Servidores y Almacenamiento',
    'Redes y Telecomunicaciones',
    'Ciberseguridad y Perímetro',
    'Estaciones de Trabajo y Periféricos',
    'Licenciamiento y Software Judicial',
    'Audio/Video para Salas de Audiencias'
  ];

  const dependencyCatalog = catalogs.find(c => c.codigo === 'DEPENDENCIA_SOLICITANTE');
  const dependencyOptions = dependencyCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Subgerencia de Infraestructura GIT',
    'Subgerencia de Desarrollo de Sistemas GIT',
    'Unidad de Seguridad de la Información',
    'Unidad de Soporte Técnico Departamental',
    'Centro de Cómputo Principal Torre de Tribunales'
  ];

  const modalityCatalog = catalogs.find(c => c.codigo === 'MODALIDAD_COMPRA');
  const modalityOptions = modalityCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Compra Directa', 'Cotización Pública', 'Licitación Pública', 'Contrato Abierto'
  ];

  // Cargar datos cuando se edita
  useEffect(() => {
    if (purchaseToEdit) {
      setDescripcion(purchaseToEdit.descripcion || '');
      setF56e(purchaseToEdit.f56e || '');
      setF56(purchaseToEdit.f56 || '');
      setF56Documento(purchaseToEdit.f56Documento || null);
      setFechaSolicitud(purchaseToEdit.fechaSolicitud || '');
      setFechaVoBo(purchaseToEdit.fechaVoBo || '');
      setFechaAutorizado(purchaseToEdit.fechaAutorizado || '');
      setNog(purchaseToEdit.nog || '');
      setFechaPublicacion(purchaseToEdit.fechaPublicacion || '');
      setFechaOfertas(purchaseToEdit.fechaOfertas || '');
      setCantidadOfertas(purchaseToEdit.cantidadOfertas ?? 0);
      setMonto(purchaseToEdit.monto ?? '');
      setMontoInput(purchaseToEdit.monto !== undefined && purchaseToEdit.monto !== null && purchaseToEdit.monto !== '' ? formatMontoMask(purchaseToEdit.monto) : '');
      setEvaluadoGIT(purchaseToEdit.evaluadoGIT || 'Sí');
      setFechaDictamenGIT(purchaseToEdit.fechaDictamenGIT || '');
      setEstatusEvento(purchaseToEdit.estatusEvento || 'Evaluación');
      setAreaSolicitante(purchaseToEdit.areaSolicitante || areaOptions[0] || 'Soporte técnico');
      setCategoriaTecnologica(purchaseToEdit.categoriaTecnologica || categoryOptions[0] || '');
      setDependenciaSolicitante(purchaseToEdit.dependenciaSolicitante || dependencyOptions[0] || '');
      setModalidadCompra(purchaseToEdit.modalidadCompra || modalityOptions[0] || 'Cotización Pública');
      setProveedorAdjudicado(purchaseToEdit.proveedorAdjudicado || '');
      setObservaciones(purchaseToEdit.observaciones || '');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setDescripcion('');
      setF56e('');
      setF56('');
      setF56Documento(null);
      setFechaSolicitud(today);
      setFechaVoBo('');
      setFechaAutorizado('');
      setNog('');
      setFechaPublicacion('');
      setFechaOfertas('');
      setCantidadOfertas(0);
      setMonto('');
      setEvaluadoGIT('Sí');
      setFechaDictamenGIT('');
      setEstatusEvento('Evaluación');
      setAreaSolicitante(areaOptions[0] || 'Soporte técnico');
      setCategoriaTecnologica(categoryOptions[0] || 'Servidores y Almacenamiento');
      setDependenciaSolicitante(dependencyOptions[0] || 'Subgerencia de Infraestructura GIT');
      setModalidadCompra('Cotización Pública');
      setProveedorAdjudicado('');
      setObservaciones('');
    }
    setErrors({});
    setFileUploadError(null);
  }, [purchaseToEdit, isPurchaseModalOpen]);

  // Manejo de archivo adjunto F56
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setFileUploadError(null);
    if (file.size > 15 * 1024 * 1024) {
      setFileUploadError('El archivo excede el límite máximo de 15 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setF56Documento({
        nombre: file.name,
        tamano: file.size,
        tipo: file.type || 'application/pdf',
        fechaSubida: new Date().toISOString(),
        dataUrl,
      });
    };
    reader.onerror = () => {
      setFileUploadError('Error al procesar el archivo. Por favor intente nuevamente.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Función para ingresar montos de derecha a izquierda con decimales automáticos (máscara 000,000,000.00)
  const formatMontoRTL = (digits: string): { display: string; value: number | '' } => {
    // Truncar a máximo 11 dígitos numéricos (9 enteros + 2 decimales = 999,999,999.99)
    const cleanDigits = digits.replace(/\D/g, '').slice(-11);
    if (!cleanDigits || parseInt(cleanDigits, 10) === 0) {
      return { display: '', value: '' };
    }
    const cents = parseInt(cleanDigits, 10);
    const numValue = cents / 100;
    const parts = numValue.toFixed(2).split('.');
    const integerWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return {
      display: `${integerWithCommas}.${parts[1]}`,
      value: numValue,
    };
  };

  // Manejador de entrada de derecha a izquierda con decimales automáticos
  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly || parseInt(digitsOnly, 10) === 0) {
      setMontoInput('');
      setMonto('');
      return;
    }
    const { display, value } = formatMontoRTL(digitsOnly);
    setMontoInput(display);
    setMonto(value);
  };

  const handleMontoPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    const cleaned = pasted.replace(/[^\d.,]/g, '').replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed >= 0) {
      const cents = Math.round(parsed * 100);
      const { display, value } = formatMontoRTL(String(cents));
      setMontoInput(display);
      setMonto(value);
    }
  };

  // Al desenfocar el campo (onBlur), auto-formatear con dos decimales exactos
  const handleMontoBlur = () => {
    if (monto !== '' && !isNaN(Number(monto)) && Number(monto) > 0) {
      const parts = Number(monto).toFixed(2).split('.');
      const integerWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setMontoInput(`${integerWithCommas}.${parts[1]}`);
    } else {
      setMontoInput('');
      setMonto('');
    }
  };

  if (!isPurchaseModalOpen) return null;

  // Validación estricta de campos según el requerimiento
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Descripción: max 200 caracteres
    if (!descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria.';
    } else if (descripcion.length > 200) {
      newErrors.descripcion = 'La descripción no puede exceder 200 caracteres.';
    }

    // 2. F56-e: máscara 000000-0000 (exactamente 6 dígitos, guion y 4 dígitos)
    const cleanF56e = f56e.trim();
    if (!cleanF56e) {
      newErrors.f56e = 'El campo F56-e es obligatorio.';
    } else if (!/^\d{6}-\d{4}$/.test(cleanF56e)) {
      newErrors.f56e = 'El formato de F56-e debe cumplir la máscara 000000-0000 (ej. 000001-2026).';
    }

    // 3. F56: máscara 000000 (exactamente 6 dígitos numéricos)
    const cleanF56 = f56.trim();
    if (!cleanF56) {
      newErrors.f56 = 'El campo F56 es obligatorio.';
    } else if (!/^\d{6}$/.test(cleanF56)) {
      newErrors.f56 = 'El formato de F56 debe cumplir la máscara 000000 (exactamente 6 dígitos numéricos, ej. 000001).';
    }

    // 4. Fechas
    if (!fechaSolicitud) {
      newErrors.fechaSolicitud = 'La Fecha de Solicitud es obligatoria.';
    }

    // 5. NOG: numérico de 8 dígitos
    const cleanNog = nog.trim();
    if (!cleanNog) {
      newErrors.nog = 'El NOG es obligatorio.';
    } else if (!/^\d{8}$/.test(cleanNog)) {
      newErrors.nog = 'El NOG debe tener exactamente 8 dígitos numéricos (ej. 21948201).';
    }

    // 6. Monto: moneda en Quetzales con máscara 000,000,000.00
    if (monto === '' || isNaN(Number(monto)) || Number(monto) <= 0) {
      newErrors.monto = 'Ingrese un monto válido en Quetzales mayor a 0 con máscara 000,000,000.00.';
    } else if (Number(monto) > 999999999.99) {
      newErrors.monto = 'El monto no puede exceder el límite de la máscara: 999,999,999.99.';
    }

    // 7. Cantidad de ofertas: numérico >= 0
    if (cantidadOfertas === undefined || cantidadOfertas < 0) {
      newErrors.cantidadOfertas = 'La cantidad de ofertas debe ser mayor o igual a 0.';
    }

    // 8. Fecha de dictamen técnico por la GIT
    if (evaluadoGIT === 'Sí' && !fechaDictamenGIT) {
      newErrors.fechaDictamenGIT = 'Ingrese la fecha en que se realizó el dictamen técnico por la GIT.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const recordData = {
      descripcion: descripcion.trim(),
      f56e: f56e.trim(),
      f56: f56.trim(),
      f56Documento: f56Documento || undefined,
      fechaSolicitud,
      fechaVoBo: fechaVoBo || '',
      fechaAutorizado: fechaAutorizado || '',
      nog: nog.trim(),
      fechaPublicacion: fechaPublicacion || '',
      fechaOfertas: fechaOfertas || '',
      cantidadOfertas: Number(cantidadOfertas),
      monto: Number(monto),
      evaluadoGIT,
      fechaDictamenGIT: evaluadoGIT === 'Sí' ? fechaDictamenGIT : '',
      estatusEvento,
      areaSolicitante,
      categoriaTecnologica,
      dependenciaSolicitante,
      modalidadCompra,
      proveedorAdjudicado: proveedorAdjudicado.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
    };

    setTimeout(() => {
      if (purchaseToEdit) {
        updatePurchase(purchaseToEdit.id, recordData);
      } else {
        addPurchase(recordData);
      }
      setIsSubmitting(false);
      setIsPurchaseModalOpen(false);
      setPurchaseToEdit(null);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal (Professional Polish) */}
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-slate-900 font-bold text-xs">
              OJ
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {purchaseToEdit ? 'Modificar Registro de Adquisición' : 'Registrar Nueva Adquisición'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Gerencia de Informática • Formulario Oficial F56-e
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setIsPurchaseModalOpen(false); setPurchaseToEdit(null); }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* SECCIÓN 1: Descripción y Códigos F56 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                Identificación del Evento
              </span>
              <span className="text-[10px] text-slate-400">* Campos Requeridos</span>
            </div>

            {/* Campo 1: Descripción (Max 200 caracteres) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Descripción (Máx. 200 caracteres) <span className="text-rose-600">*</span>
                </label>
                <span className={`text-[10px] font-mono ${descripcion.length >= 200 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                  {descripcion.length}/200
                </span>
              </div>
              <textarea
                id="input-purchase-descripcion"
                rows={2}
                maxLength={200}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción del bien o servicio informático solicitado para el Organismo Judicial..."
                className={`w-full p-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  errors.descripcion ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.descripcion && (
                <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.descripcion}</p>
              )}
            </div>

            {/* Campo: Área Solicitante (Seguido de la descripción) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Área Solicitante <span className="text-rose-600">*</span>
              </label>
              <select
                id="select-purchase-area-solicitante"
                value={areaSolicitante}
                onChange={(e) => setAreaSolicitante(e.target.value)}
                className="w-full p-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 cursor-pointer"
              >
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Área técnica o sección GIT requirente del bien o servicio.
              </p>
            </div>

            {/* F56-e y F56 con Máscaras de Entrada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Campo 2: F56-e (Máscara 000000-0000) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Formulario F56-e <span className="text-rose-600">*</span>
                  <span className="ml-1 text-[10px] text-amber-600 font-mono font-semibold">(000000-0000)</span>
                </label>
                <input
                  id="input-purchase-f56e"
                  type="text"
                  maxLength={11}
                  value={f56e}
                  onChange={(e) => setF56e(formatF56eInput(e.target.value))}
                  placeholder="000000-0000"
                  className={`w-full p-2 text-xs font-mono font-bold tracking-wider uppercase border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    errors.f56e ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.f56e ? (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.f56e}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">Máscara requerida: 6 dígitos - 4 dígitos (ej. 000001-2026)</p>
                )}
              </div>

              {/* Campo 3: F56 (Máscara 000000) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Formulario F56 Físico <span className="text-rose-600">*</span>
                  <span className="ml-1 text-[10px] text-amber-600 font-mono font-semibold">(000000)</span>
                </label>
                <input
                  id="input-purchase-f56"
                  type="text"
                  maxLength={6}
                  value={f56}
                  onChange={(e) => setF56(formatF56Input(e.target.value))}
                  placeholder="000000"
                  className={`w-full p-2 text-xs font-mono font-bold tracking-wider uppercase border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    errors.f56 ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.f56 ? (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.f56}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">Máscara requerida: 6 dígitos numéricos (ej. 000001)</p>
                )}
              </div>

            </div>

            {/* SECCIÓN ADJUNTAR DOCUMENTO DE LA F56 */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                  Documento de la F56 (Adjuntar Documento Oficial F56)
                </label>
                {f56Documento && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Documento F56 Adjunto
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="input-f56-document"
              />

              {f56Documento ? (
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate" title={f56Documento.nombre}>
                        {f56Documento.nombre}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{formatFileSize(f56Documento.tamano)}</span>
                        <span>•</span>
                        <span>{f56Documento.fechaSubida ? new Date(f56Documento.fechaSubida).toLocaleDateString() : 'Cargado'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                    {f56Documento.dataUrl && (
                      <a
                        href={f56Documento.dataUrl}
                        download={f56Documento.nombre}
                        className="px-2.5 py-1.5 text-slate-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 border border-slate-200"
                        title="Descargar documento F56 adjunto"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-600" />
                        <span>Ver / Descargar</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 text-slate-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 border border-slate-200"
                      title="Reemplazar documento F56"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reemplazar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setF56Documento(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold border border-rose-200"
                      title="Eliminar documento adjunto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-3.5 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-slate-300 hover:border-amber-400 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <UploadCloud className="w-5 h-5 text-amber-600" />
                    <p className="text-xs font-semibold text-slate-700">
                      Haga clic aquí o arrastre el documento de la F56 física
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Formatos soportados: PDF, Word (.docx), JPG, PNG (Hasta 15 MB)
                    </p>
                  </div>
                </div>
              )}
              {fileUploadError && (
                <p className="text-[10px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fileUploadError}
                </p>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: NOG Guatecompras y Valores */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                Guatecompras & Presupuesto (GTQ)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Campo 7: NOG (Numérico 8 dígitos) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  NOG (8 Dígitos) <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-purchase-nog"
                  type="text"
                  maxLength={8}
                  value={nog}
                  onChange={(e) => setNog(e.target.value.replace(/\D/g, ''))}
                  placeholder="21948201"
                  className={`w-full p-2 text-xs font-mono font-bold tracking-wider border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    errors.nog ? 'border-rose-400' : 'border-slate-300 text-slate-900'
                  }`}
                />
                {errors.nog ? (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.nog}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">8 dígitos exactos</p>
                )}
              </div>

              {/* Campo 11: Monto (Quetzales) con ingreso de derecha a izquierda y decimales automáticos */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="input-purchase-monto" className="block text-xs font-bold text-slate-800">
                    Monto (Q) <span className="text-rose-600">*</span>
                  </label>
                  <span 
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-bold"
                    title="Ingreso de derecha a izquierda con decimales automáticos"
                  >
                    Entrada Der. a Izq. (0.00)
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600 font-black text-xs">
                    Q
                  </div>
                  <input
                    id="input-purchase-monto"
                    type="text"
                    inputMode="numeric"
                    dir="rtl"
                    value={montoInput}
                    onChange={handleMontoChange}
                    onPaste={handleMontoPaste}
                    onBlur={handleMontoBlur}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-3 py-2 text-right text-xs font-black font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682b4] ${
                      errors.monto ? 'border-rose-400 bg-rose-50/20 text-rose-950' : 'border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                {errors.monto ? (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.monto}</p>
                ) : (
                  <div className="flex items-center justify-between text-[10px] mt-0.5">
                    <span className="text-emerald-700 font-semibold font-mono">
                      {monto !== '' ? formatQuetzales(Number(monto)) : 'Q. 0.00'}
                    </span>
                    <span className="text-slate-400 text-[9px]">
                      Coloca decimales automáticamente
                    </span>
                  </div>
                )}
              </div>

              {/* Campo 10: Cantidad de Ofertas */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Cantidad de Ofertas
                </label>
                <input
                  id="input-purchase-cantidad-ofertas"
                  type="number"
                  min="0"
                  value={cantidadOfertas}
                  onChange={(e) => setCantidadOfertas(parseInt(e.target.value) || 0)}
                  className="w-full p-2 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Postores</p>
              </div>

            </div>
          </div>

          {/* SECCIÓN 3: Dictamen GIT y Estatus */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Dictamen y Estado
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Evaluado GIT */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Evaluado por la GIT <span className="text-rose-600">*</span>
                </label>
                <select
                  id="select-purchase-evaluado-git"
                  value={evaluadoGIT}
                  onChange={(e) => setEvaluadoGIT(e.target.value as EvaluacionGIT)}
                  className="w-full p-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Sí">Sí - Con Dictamen Técnico GIT</option>
                  <option value="No">No - Sin Dictamen Técnico</option>
                </select>
              </div>

              {/* Fecha en que se realizó el dictamen técnico por la GIT */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#1c39bb]" />
                    <span>Fecha de Dictamen Técnico GIT</span>
                  </span>
                  {evaluadoGIT === 'Sí' && <span className="text-rose-600 font-bold">*</span>}
                </label>
                <input
                  id="input-purchase-fecha-dictamen-git"
                  type="date"
                  value={fechaDictamenGIT}
                  onChange={(e) => setFechaDictamenGIT(e.target.value)}
                  disabled={evaluadoGIT === 'No'}
                  className={`w-full p-2 text-xs font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682b4] ${
                    evaluadoGIT === 'No' ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' :
                    errors.fechaDictamenGIT ? 'border-rose-400 bg-rose-50/20 text-rose-900' : 'border-slate-300 bg-white text-slate-900'
                  }`}
                />
                {errors.fechaDictamenGIT ? (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.fechaDictamenGIT}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {evaluadoGIT === 'Sí' ? 'Fecha de emisión del informe técnico por la GIT' : 'No aplica (Sin Dictamen)'}
                  </p>
                )}
              </div>

              {/* Estatus del Evento */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Estatus del Evento <span className="text-rose-600">*</span>
                </label>
                <select
                  id="select-purchase-estatus-evento"
                  value={estatusEvento}
                  onChange={(e) => setEstatusEvento(e.target.value)}
                  className="w-full p-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Proveedor Adjudicado */}
            {estatusEvento === 'Adjudicación' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Proveedor / Empresa Adjudicada
                </label>
                <input
                  id="input-purchase-proveedor"
                  type="text"
                  value={proveedorAdjudicado}
                  onChange={(e) => setProveedorAdjudicado(e.target.value)}
                  placeholder="ej. Tecnologías y Sistemas Corporativos, S.A."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* SECCIÓN 4: Cronología de Fechas */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Cronología de Fechas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Fecha Solicitud */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha Solicitud <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-purchase-fecha-solicitud"
                  type="date"
                  value={fechaSolicitud}
                  onChange={(e) => setFechaSolicitud(e.target.value)}
                  className={`w-full p-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    errors.fechaSolicitud ? 'border-rose-400' : 'border-slate-300'
                  }`}
                />
              </div>

              {/* Fecha Vo.Bo. */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha Vo.Bo.
                </label>
                <input
                  id="input-purchase-fecha-vobo"
                  type="date"
                  value={fechaVoBo}
                  onChange={(e) => setFechaVoBo(e.target.value)}
                  className="w-full p-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Fecha Autorizado */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha Autorizado
                </label>
                <input
                  id="input-purchase-fecha-autorizado"
                  type="date"
                  value={fechaAutorizado}
                  onChange={(e) => setFechaAutorizado(e.target.value)}
                  className="w-full p-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Fecha Publicación */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha Publicación
                </label>
                <input
                  id="input-purchase-fecha-publicacion"
                  type="date"
                  value={fechaPublicacion}
                  onChange={(e) => setFechaPublicacion(e.target.value)}
                  className="w-full p-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Fecha Ofertas */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha Cierre Ofertas
                </label>
                <input
                  id="input-purchase-fecha-ofertas"
                  type="date"
                  value={fechaOfertas}
                  onChange={(e) => setFechaOfertas(e.target.value)}
                  className="w-full p-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones y Dictámenes Técnicos de Soporte
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Garantías, número de oficio, justificación técnica o detalles del comité..."
              className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

        </form>

        {/* Footer del Modal */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setIsPurchaseModalOpen(false); setPurchaseToEdit(null); }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-black bg-white border border-slate-300 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            id="btn-save-purchase"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-black" />
                <span>{purchaseToEdit ? 'Guardar Cambios' : 'Registrar Adquisición'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
