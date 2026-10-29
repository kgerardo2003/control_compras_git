/**
 * @license
 * Modal de Creación y Edición de Servicios Contratados
 * Gerencia de Informática - Organismo Judicial de Guatemala
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ServicioContratado, 
  DocumentosAdjuntosServicio, 
  AttachedDocument,
  RiesgoContinuidad 
} from '../../types';
import { 
  CATALOGO_AREAS_SERVICIOS, 
  CATALOGO_MODALIDADES_SERVICIOS, 
  CATALOGO_ESTATUS_SERVICIOS, 
  CATALOGO_ACCIONES_REQUERIDAS 
} from '../../data/initialServiciosData';
import { 
  calcularMetricasServicio, 
  getSemaforoVigenciaVisual, 
  getNivelAlertaGestionVisual 
} from '../../utils/serviciosCalculations';
import { 
  X, 
  Save, 
  Calendar, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Download, 
  Eye, 
  Building2, 
  ShieldAlert, 
  Tag, 
  User, 
  Clock, 
  Sparkles,
  Paperclip
} from 'lucide-react';

export const ServicioFormModal: React.FC = () => {
  const { 
    isServicioModalOpen, 
    setIsServicioModalOpen, 
    servicioToEdit, 
    setServicioToEdit, 
    addServicio, 
    updateServicio,
    currentUser,
    themeConfig 
  } = useApp();

  // Form State
  const [codigo, setCodigo] = useState('');
  const [area, setArea] = useState('Servicios');
  const [departamento, setDepartamento] = useState('');
  const [servicioContratado, setServicioContratado] = useState('');
  const [objetoAlcance, setObjetoAlcance] = useState('');
  const [modalidad, setModalidad] = useState('Compra directa');
  const [nogExpediente, setNogExpediente] = useState('');
  const [proveedorActual, setProveedorActual] = useState('');
  const [inicioVigencia, setInicioVigencia] = useState('');
  const [finVigencia, setFinVigencia] = useState('');
  const [estatusActual, setEstatusActual] = useState('Vigente');
  const [accionRequerida, setAccionRequerida] = useState('Iniciar nuevo evento');
  const [fechaInicioGestion, setFechaInicioGestion] = useState('');
  const [responsableSeguimiento, setResponsableSeguimiento] = useState('');
  const [riesgoContinuidad, setRiesgoContinuidad] = useState<RiesgoContinuidad>('Medio');
  const [observaciones, setObservaciones] = useState('');
  const [adjuntos, setAdjuntos] = useState<DocumentosAdjuntosServicio>({});
  
  const [previewDoc, setPreviewDoc] = useState<AttachedDocument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos al abrir modal
  useEffect(() => {
    if (servicioToEdit) {
      setCodigo(servicioToEdit.codigo || '');
      setArea(servicioToEdit.area || 'Servicios');
      setDepartamento(servicioToEdit.departamento || '');
      setServicioContratado(servicioToEdit.servicioContratado || '');
      setObjetoAlcance(servicioToEdit.objetoAlcance || '');
      setModalidad(servicioToEdit.modalidad || 'Compra directa');
      setNogExpediente(servicioToEdit.nogExpediente || '');
      setProveedorActual(servicioToEdit.proveedorActual || '');
      setInicioVigencia(servicioToEdit.inicioVigencia || '');
      setFinVigencia(servicioToEdit.finVigencia || '');
      setEstatusActual(servicioToEdit.estatusActual || 'Vigente');
      setAccionRequerida(servicioToEdit.accionRequerida || 'Iniciar nuevo evento');
      setFechaInicioGestion(servicioToEdit.fechaInicioGestion || '');
      setResponsableSeguimiento(servicioToEdit.responsableSeguimiento || '');
      setRiesgoContinuidad(servicioToEdit.riesgoContinuidad || 'Medio');
      setObservaciones(servicioToEdit.observaciones || '');
      setAdjuntos(servicioToEdit.adjuntos || {});
    } else {
      // Valores por defecto para nuevo registro
      setCodigo('');
      setArea('Servicios');
      setDepartamento('Gerencia de Informática');
      setServicioContratado('');
      setObjetoAlcance('');
      setModalidad('Compra directa');
      setNogExpediente('');
      setProveedorActual('');
      const today = new Date().toISOString().slice(0, 10);
      setInicioVigencia(today);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setFinVigencia(nextYear.toISOString().slice(0, 10));
      setEstatusActual('Vigente');
      setAccionRequerida('Iniciar nuevo evento');
      setFechaInicioGestion('');
      setResponsableSeguimiento(currentUser?.nombreCompleto || 'Ing. Responsable GIT');
      setRiesgoContinuidad('Medio');
      setObservaciones('');
      setAdjuntos({});
    }
    setErrors({});
  }, [servicioToEdit, isServicioModalOpen, currentUser]);

  // Cálculo en tiempo real de semáforos
  const metricasEnVivo = calcularMetricasServicio({
    inicioVigencia,
    finVigencia,
    modalidad,
    accionRequerida,
    estatusActual
  });

  const semaforoVigenciaVisual = getSemaforoVigenciaVisual(metricasEnVivo.semaforoVigencia);
  const semaforoGestionVisual = getNivelAlertaGestionVisual(metricasEnVivo.nivelAlertaGestion);

  // Manejo de carga de archivos para los 4 documentos oficiales
  const handleFileUpload = (
    docKey: keyof DocumentosAdjuntosServicio, 
    file: File
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newDoc: AttachedDocument = {
        nombre: file.name,
        tamano: file.size,
        tipo: file.type || 'application/pdf',
        fechaSubida: new Date().toISOString(),
        dataUrl
      };
      setAdjuntos(prev => ({
        ...prev,
        [docKey]: newDoc
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDoc = (docKey: keyof DocumentosAdjuntosServicio) => {
    setAdjuntos(prev => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!servicioContratado.trim()) errs.servicioContratado = 'El título del servicio es requerido.';
    if (!nogExpediente.trim()) errs.nogExpediente = 'El NOG o número de expediente es requerido.';
    if (!proveedorActual.trim()) errs.proveedorActual = 'El proveedor actual es requerido.';
    if (!inicioVigencia) errs.inicioVigencia = 'La fecha de inicio de vigencia es requerida.';
    if (!finVigencia) errs.finVigencia = 'La fecha de término de vigencia es requerida.';
    if (inicioVigencia && finVigencia && inicioVigencia > finVigencia) {
      errs.finVigencia = 'La fecha de fin debe ser posterior a la fecha de inicio.';
    }
    if (!responsableSeguimiento.trim()) errs.responsableSeguimiento = 'El responsable de seguimiento es requerido.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payloadData = {
        codigo: codigo.trim(),
        area,
        departamento: departamento.trim(),
        servicioContratado: servicioContratado.trim(),
        objetoAlcance: objetoAlcance.trim(),
        modalidad,
        nogExpediente: nogExpediente.trim(),
        proveedorActual: proveedorActual.trim(),
        inicioVigencia,
        finVigencia,
        estatusActual,
        accionRequerida,
        fechaInicioGestion: fechaInicioGestion || undefined,
        responsableSeguimiento: responsableSeguimiento.trim(),
        riesgoContinuidad,
        observaciones: observaciones.trim(),
        adjuntos
      };

      if (servicioToEdit) {
        await updateServicio(servicioToEdit.id, payloadData);
      } else {
        await addServicio(payloadData);
      }

      setIsServicioModalOpen(false);
      setServicioToEdit(null);
    } catch (err: any) {
      console.error('Error guardando servicio:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isServicioModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {servicioToEdit ? 'Editar Servicio Contratado' : 'Registrar Nuevo Servicio Contratado'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Gerencia de Informática • Control de Vigencia y Alertas Tempranas Guatecompras
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setIsServicioModalOpen(false); setServicioToEdit(null); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel de Semáforos en Tiempo Real */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Semáforo de Vigencia:</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold text-[11px] ${semaforoVigenciaVisual.badgeBg} ${semaforoVigenciaVisual.badgeText} ${semaforoVigenciaVisual.badgeBorder}`}>
              <span className={`w-2 h-2 rounded-full ${semaforoVigenciaVisual.dotColor}`} />
              {semaforoVigenciaVisual.label} ({metricasEnVivo.esVencido ? `${metricasEnVivo.diasDesfase}d desfase` : `${metricasEnVivo.diasRestantes} días restantes`})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Alerta de Gestión ({modalidad}):</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold text-[11px] ${semaforoGestionVisual.badgeBg} ${semaforoGestionVisual.badgeText} ${semaforoGestionVisual.badgeBorder} ${semaforoGestionVisual.pulse ? 'animate-pulse' : ''}`}>
              <Clock className="w-3.5 h-3.5" />
              {semaforoGestionVisual.label}
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex items-center mt-1">
            <div 
              className={`h-full transition-all duration-300 ${
                metricasEnVivo.porcentajeConsumido >= 90 ? 'bg-rose-500' : (metricasEnVivo.porcentajeConsumido >= 75 ? 'bg-amber-500' : 'bg-emerald-500')
              }`}
              style={{ width: `${metricasEnVivo.porcentajeConsumido}%` }}
            />
          </div>
          <div className="w-full flex justify-between text-[10px] text-slate-500 -mt-2">
            <span>Duración total: {metricasEnVivo.duracionTotalDias} días</span>
            <span>Consumido: {metricasEnVivo.porcentajeConsumido}% ({metricasEnVivo.diasTranscurridos} días)</span>
            <span>{metricasEnVivo.esVencido ? 'Contrato Expirado' : `Restan: ${metricasEnVivo.diasRestantes} días`}</span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Fila 1: Título y Código */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título o Denominación del Servicio Contratado <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={servicioContratado}
                onChange={(e) => setServicioContratado(e.target.value)}
                placeholder="Ej. Suscripción y Soporte Técnico para Firewalls de Próxima Generación Fortinet"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${errors.servicioContratado ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.servicioContratado && <p className="text-[11px] text-rose-500 mt-1">{errors.servicioContratado}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código Correlativo
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej. SC-2026-001 (auto)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Fila 2: Área, Departamento, Modalidad, NOG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Área Solicitante <span className="text-rose-500">*</span>
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {CATALOGO_AREAS_SERVICIOS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unidad o Departamento
              </label>
              <input
                type="text"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                placeholder="Ej. Unidad de Ciberdefensa"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Modalidad Guatecompras <span className="text-rose-500">*</span>
              </label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-800"
              >
                {CATALOGO_MODALIDADES_SERVICIOS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NOG / Expediente <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nogExpediente}
                onChange={(e) => setNogExpediente(e.target.value)}
                placeholder="Ej. 18492031"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${errors.nogExpediente ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
              />
              {errors.nogExpediente && <p className="text-[11px] text-rose-500 mt-1">{errors.nogExpediente}</p>}
            </div>
          </div>

          {/* Fila 3: Proveedor Actual y Objeto/Alcance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Proveedor Actual (Razón Social) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={proveedorActual}
                onChange={(e) => setProveedorActual(e.target.value)}
                placeholder="Ej. Telecomunicaciones de Guatemala, S.A."
                className={`w-full px-3 py-2 text-xs rounded-xl border ${errors.proveedorActual ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.proveedorActual && <p className="text-[11px] text-rose-500 mt-1">{errors.proveedorActual}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Objeto y Alcance Técnico del Servicio
              </label>
              <textarea
                value={objetoAlcance}
                onChange={(e) => setObjetoAlcance(e.target.value)}
                rows={2}
                placeholder="Detalle del soporte, versiones, cantidad de usuarios, licencias o cláusulas técnicas clave..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Fila 4: Vigencias (Fechas) */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Período de Vigencia y Plazos de Gestión
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Inicio de Vigencia <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={inicioVigencia}
                  onChange={(e) => setInicioVigencia(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${errors.inicioVigencia ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`}
                />
                {errors.inicioVigencia && <p className="text-[11px] text-rose-500 mt-1">{errors.inicioVigencia}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fin de Vigencia (Vencimiento) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={finVigencia}
                  onChange={(e) => setFinVigencia(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${errors.finVigencia ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-900`}
                />
                {errors.finVigencia && <p className="text-[11px] text-rose-500 mt-1">{errors.finVigencia}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha Estimada Inicio de Nueva Gestión
                </label>
                <input
                  type="date"
                  value={fechaInicioGestion}
                  onChange={(e) => setFechaInicioGestion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <span className="text-[10px] text-slate-500">
                  Umbral recomendado para {modalidad}: {metricasEnVivo.diasUmbralAlerta} días antes.
                </span>
              </div>
            </div>
          </div>

          {/* Fila 5: Estatus Operativo, Acción Requerida, Responsable, Riesgo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estatus Actual
              </label>
              <select
                value={estatusActual}
                onChange={(e) => setEstatusActual(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                {CATALOGO_ESTATUS_SERVICIOS.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Acción Requerida
              </label>
              <select
                value={accionRequerida}
                onChange={(e) => setAccionRequerida(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-blue-900"
              >
                {CATALOGO_ACCIONES_REQUERIDAS.map(ac => (
                  <option key={ac} value={ac}>{ac}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Responsable de Seguimiento <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={responsableSeguimiento}
                onChange={(e) => setResponsableSeguimiento(e.target.value)}
                placeholder="Ej. Ing. Carlos Mendoza (Seguridad TI)"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${errors.responsableSeguimiento ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.responsableSeguimiento && <p className="text-[11px] text-rose-500 mt-1">{errors.responsableSeguimiento}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Riesgo de Continuidad
              </label>
              <select
                value={riesgoContinuidad}
                onChange={(e) => setRiesgoContinuidad(e.target.value as RiesgoContinuidad)}
                className={`w-full px-3 py-2 text-xs rounded-xl border font-bold ${
                  riesgoContinuidad === 'Alto' ? 'bg-rose-50 text-rose-800 border-rose-300' : (riesgoContinuidad === 'Medio' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300')
                }`}
              >
                <option value="Alto">Alto (Crítico)</option>
                <option value="Medio">Medio</option>
                <option value="Bajo">Bajo</option>
              </select>
            </div>
          </div>

          {/* Fila 6: Sección de Carga de 4 Documentos de Respaldo Oficiales */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-amber-600" />
                Módulo de Adjuntos y Documentos de Respaldo (4 Documentos Oficiales)
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">Formatos aceptados: PDF, imágenes, contratos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* Documento 1: Especificaciones Técnicas */}
              <DocumentCard
                title="1. Especificaciones Técnicas"
                subtitle="TDRs / Bases Guatecompras"
                docKey="especificacionesTecnicas"
                doc={adjuntos.especificacionesTecnicas}
                onUpload={(f) => handleFileUpload('especificacionesTecnicas', f)}
                onRemove={() => handleRemoveDoc('especificacionesTecnicas')}
                onPreview={(d) => setPreviewDoc(d)}
              />

              {/* Documento 2: Formulario F56 / F56e */}
              <DocumentCard
                title="2. Formulario F56 / F56e"
                subtitle="Requerimiento Presupuestario"
                docKey="f56"
                doc={adjuntos.f56}
                onUpload={(f) => handleFileUpload('f56', f)}
                onRemove={() => handleRemoveDoc('f56')}
                onPreview={(d) => setPreviewDoc(d)}
              />

              {/* Documento 3: Orden de Compra / Contrato */}
              <DocumentCard
                title="3. Orden de Compra / Contrato"
                subtitle="Contrato Administrativo"
                docKey="ordenCompra"
                doc={adjuntos.ordenCompra}
                onUpload={(f) => handleFileUpload('ordenCompra', f)}
                onRemove={() => handleRemoveDoc('ordenCompra')}
                onPreview={(d) => setPreviewDoc(d)}
              />

              {/* Documento 4: Factura Electrónica */}
              <DocumentCard
                title="4. Factura Electrónica"
                subtitle="Comprobante SAT / Pago"
                docKey="factura"
                doc={adjuntos.factura}
                onUpload={(f) => handleFileUpload('factura', f)}
                onRemove={() => handleRemoveDoc('factura')}
                onPreview={(d) => setPreviewDoc(d)}
              />

            </div>
          </div>

          {/* Fila 7: Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones, Licenciamiento, Versiones y Notas Técnicas
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Notas sobre número de serie, versiones de software, vencimiento de garantías o detalles del proveedor..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </form>

        {/* Pie del Modal */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setIsServicioModalOpen(false); setServicioToEdit(null); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : (servicioToEdit ? 'Actualizar Ficha de Servicio' : 'Registrar Servicio Contratado')}</span>
          </button>
        </div>

      </div>

      {/* Modal de Previsualización de Documento */}
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
                  <p className="text-xs text-slate-500 mt-1">Archivo cargado en el sistema.</p>
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

interface DocumentCardProps {
  title: string;
  subtitle: string;
  docKey: string;
  doc?: AttachedDocument;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onPreview: (doc: AttachedDocument) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  title,
  subtitle,
  doc,
  onUpload,
  onRemove,
  onPreview
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={`p-3 rounded-xl border transition-all ${
      doc ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs' : 'bg-white border-slate-200'
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
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-slate-700 truncate" title={doc.nombre}>
              📎 {doc.nombre}
            </p>
            {doc.tamano && (
              <p className="text-[9px] text-slate-400">
                {(doc.tamano / 1024).toFixed(1)} KB
              </p>
            )}
            <div className="flex items-center gap-1.5 pt-1">
              {doc.dataUrl && (
                <button
                  type="button"
                  onClick={() => onPreview(doc)}
                  className="p-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold inline-flex items-center gap-1"
                  title="Previsualizar"
                >
                  <Eye className="w-3 h-3" />
                  Ver
                </button>
              )}
              {doc.dataUrl && (
                <a
                  href={doc.dataUrl}
                  download={doc.nombre}
                  className="p-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold inline-flex items-center gap-1"
                  title="Descargar"
                >
                  <Download className="w-3 h-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 rounded bg-white hover:bg-slate-100 text-blue-700 border border-slate-200 text-[10px] font-semibold"
                title="Actualizar / Reemplazar"
              >
                Reemplazar
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-1 rounded bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 text-[10px]"
                title="Eliminar"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-2.5 rounded-lg border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 text-slate-600 hover:text-blue-700 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Subir Archivo</span>
            </button>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        />
      </div>
    </div>
  );
};
