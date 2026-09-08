import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Plus, 
  Building2, 
  FileText, 
  X, 
  Save, 
  Filter, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
  FileCheck,
  Send,
  Coins,
  Globe,
  Users,
  Award,
  Ban,
  MessageSquarePlus,
  Info
} from 'lucide-react';
import { PurchaseRecord, StatusTimelineEvent, TimelineEventState } from '../types';
import { getPurchaseTimeline } from '../utils/timelineUtils';
import { formatDate, formatDateTime, formatQuetzales } from '../utils/formatters';
import { useApp } from '../context/AppContext';

interface PurchaseStatusTimelineProps {
  purchase: PurchaseRecord;
  onUpdatePurchase?: (updated: Partial<PurchaseRecord>) => void;
  canEdit?: boolean;
}

type AutomatedActionType = 
  | 'llegada_git'
  | 'dictamen_git'
  | 'remite_compras'
  | 'disponibilidad_presupuestaria'
  | 'publicacion_nog'
  | 'cierre_ofertas'
  | 'evaluacion_ofertas'
  | 'adjudicacion'
  | 'desierto'
  | 'actuacion_oficial';

export const PurchaseStatusTimeline: React.FC<PurchaseStatusTimelineProps> = ({
  purchase,
  onUpdatePurchase,
  canEdit = true
}) => {
  const { recordPurchaseMilestone, showToast, currentUser } = useApp();

  // Reloj en tiempo real del sistema para mostrar el sello exacto de grabación
  const [systemClock, setSystemClock] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Obtener la línea de tiempo actual garantizando orden cronológico por fecha de registro
  const timelineEvents = getPurchaseTimeline(purchase);

  // Filtros de visualización
  const [filterState, setFilterState] = useState<'todos' | TimelineEventState>('todos');
  const [isExpandedAll, setIsExpandedAll] = useState(true);

  // Modal para la acción automática seleccionada
  const [activeActionModal, setActiveActionModal] = useState<AutomatedActionType | null>(null);

  // Campos complementarios del diálogo (sin fecha/hora, ya que la fecha y hora es 100% del sistema e inalterable)
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [proveedorAdjudicado, setProveedorAdjudicado] = useState(purchase.proveedorAdjudicado || '');
  const [montoAdjudicado, setMontoAdjudicado] = useState<number | string>(purchase.monto || '');
  const [cantidadOfertas, setCantidadOfertas] = useState<number | string>(purchase.cantidadOfertas || 1);
  const [nogValue, setNogValue] = useState(purchase.nog || '');
  const [tituloDiligencia, setTituloDiligencia] = useState('');

  const openActionModal = (actionType: AutomatedActionType) => {
    setActiveActionModal(actionType);
    setObservaciones('');
    setDocumentoReferencia('');
    setTituloDiligencia('');

    if (actionType === 'adjudicacion') {
      setProveedorAdjudicado(purchase.proveedorAdjudicado || '');
      setMontoAdjudicado(purchase.monto || '');
    } else if (actionType === 'cierre_ofertas') {
      setCantidadOfertas(purchase.cantidadOfertas || 1);
    } else if (actionType === 'publicacion_nog') {
      setNogValue(purchase.nog || '');
    }
  };

  const closeActionModal = () => {
    setActiveActionModal(null);
  };

  // Ejecución de la acción con sellado de tiempo automático inmutable
  const handleExecuteAutomatedAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionModal) return;

    const actionTime = new Date();
    const actionDateStr = actionTime.toISOString().slice(0, 10);
    const actionTimeFormatted = `${String(actionTime.getHours()).padStart(2, '0')}:${String(actionTime.getMinutes()).padStart(2, '0')}:${String(actionTime.getSeconds()).padStart(2, '0')}`;

    switch (activeActionModal) {
      case 'llegada_git': {
        recordPurchaseMilestone(purchase.id, {
          titulo: 'Llegó para Dictamen Técnico en GIT',
          fase: 'Dictamen Técnico',
          responsable: 'Gerencia de Informática - GIT',
          observaciones: observaciones.trim() || 'Expediente F56-e recibido formalmente en la Gerencia de Informática para revisión y análisis de requerimientos técnicos.',
          documentoReferencia: documentoReferencia.trim() || `Recepción F56-e No. ${purchase.f56e}`,
          estado: 'completado',
          additionalFields: {
            evaluadoGIT: 'Sí',
            fechaSolicitud: purchase.fechaSolicitud || actionDateStr
          }
        });
        break;
      }

      case 'dictamen_git': {
        recordPurchaseMilestone(purchase.id, {
          titulo: 'Emisión de Dictamen Técnico Favorable por GIT',
          fase: 'Dictamen Técnico',
          responsable: 'Gerencia de Informática - GIT',
          observaciones: observaciones.trim() || 'Dictamen técnico emitido satisfactoriamente con visto bueno de especificaciones de hardware, software y compatibilidad institucional.',
          documentoReferencia: documentoReferencia.trim() || `Dictamen Técnico GIT-${actionDateStr.slice(0, 4)}`,
          estado: 'completado',
          additionalFields: {
            fechaDictamenGIT: actionDateStr,
            evaluadoGIT: 'Sí'
          }
        });
        break;
      }

      case 'remite_compras': {
        recordPurchaseMilestone(purchase.id, {
          titulo: 'GIT lo Remite a Dirección de Compras',
          fase: 'Compras',
          responsable: 'Gerencia de Informática - GIT',
          observaciones: observaciones.trim() || 'Expediente técnico completo y providencia remitidos formalmente a la Dirección de Compras para prosecución del evento.',
          documentoReferencia: documentoReferencia.trim() || `Oficio GIT-${actionDateStr.slice(0, 4)}`,
          estado: 'completado',
          additionalFields: {
            fechaElaboracionOficioGIT: actionDateStr
          }
        });
        break;
      }

      case 'disponibilidad_presupuestaria': {
        recordPurchaseMilestone(purchase.id, {
          titulo: 'Aprobación de Disponibilidad Presupuestaria',
          fase: 'Presupuesto',
          responsable: 'Dirección Financiera / DAF',
          observaciones: observaciones.trim() || `Constancia de disponibilidad de crédito presupuestario emitida favorablemente para cubrir el monto estimado de Q.${(purchase.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}.`,
          documentoReferencia: documentoReferencia.trim() || `Solicitud Pedido / DAF-${actionDateStr.slice(0, 4)}`,
          estado: 'completado',
          additionalFields: {
            fechaAutorizado: actionDateStr,
            solicitudPedido: documentoReferencia.trim() || purchase.solicitudPedido
          }
        });
        break;
      }

      case 'publicacion_nog': {
        recordPurchaseMilestone(purchase.id, {
          titulo: `Publicación Convocatoria en Guatecompras (NOG ${nogValue || purchase.nog})`,
          fase: 'Convocatoria',
          responsable: 'Dirección de Compras y Contrataciones',
          observaciones: observaciones.trim() || `Bases y especificaciones publicadas en el portal Guatecompras bajo Número de Operación Guatecompras NOG ${nogValue || purchase.nog}.`,
          documentoReferencia: `Guatecompras NOG: ${nogValue || purchase.nog}`,
          estado: 'completado',
          additionalFields: {
            fechaPublicacion: actionDateStr,
            nog: nogValue.trim() || purchase.nog
          }
        });
        break;
      }

      case 'cierre_ofertas': {
        const numOfertas = Number(cantidadOfertas) || 1;
        recordPurchaseMilestone(purchase.id, {
          titulo: `Recepción y Cierre de Ofertas (${numOfertas} ofertas recibidas)`,
          fase: 'Ofertas',
          responsable: 'Junta de Cotización / Compras',
          observaciones: observaciones.trim() || `Acta de recepción de plicas y ofertas cerrada formalmente. Se registraron ${numOfertas} participante(s) en el evento.`,
          documentoReferencia: documentoReferencia.trim() || `Acta de Recepción de Ofertas`,
          estado: 'completado',
          nuevoEstatus: 'Evaluación',
          additionalFields: {
            fechaOfertas: actionDateStr,
            cantidadOfertas: numOfertas,
            estatusEvento: 'Evaluación'
          }
        });
        break;
      }

      case 'evaluacion_ofertas': {
        recordPurchaseMilestone(purchase.id, {
          titulo: 'Inicio de Calificación y Evaluación de Ofertas',
          fase: 'Evaluación',
          responsable: 'Junta de Calificación / GIT',
          observaciones: observaciones.trim() || 'Comisión evaluadora procede con la apertura y análisis de propuestas técnicas, legales y económicas de los oferentes.',
          documentoReferencia: documentoReferencia.trim() || 'Acta de Apertura de Plicas',
          estado: 'en_proceso',
          nuevoEstatus: 'Evaluación',
          additionalFields: {
            estatusEvento: 'Evaluación'
          }
        });
        break;
      }

      case 'adjudicacion': {
        const prov = proveedorAdjudicado.trim() || 'Proveedor Adjudicado';
        const montoNum = Number(montoAdjudicado) || purchase.monto || 0;
        recordPurchaseMilestone(purchase.id, {
          titulo: `Adjudicación Definitiva a: ${prov}`,
          fase: 'Adjudicación',
          responsable: 'Autoridad Superior / Junta',
          observaciones: observaciones.trim() || `Resolución de adjudicación definitiva dictada a favor de ${prov} por un valor total de Q.${montoNum.toLocaleString('es-GT', { minimumFractionDigits: 2 })}.`,
          documentoReferencia: documentoReferencia.trim() || `Resolución de Adjudicación No. ${actionDateStr.slice(0, 4)}`,
          estado: 'completado',
          nuevoEstatus: 'Adjudicación',
          additionalFields: {
            estatusEvento: 'Adjudicación',
            proveedorAdjudicado: prov,
            fechaAdjudicacion: actionDateStr,
            monto: montoNum
          }
        });
        break;
      }

      case 'desierto': {
        recordPurchaseMilestone(purchase.id, {
          titulo: 'Evento Declarado Desierto / Prescindido',
          fase: 'Cierre de Evento',
          responsable: 'Junta de Cotización / Autoridad Superior',
          observaciones: observaciones.trim() || 'El evento fue declarado desierto o prescindido conforme a la Ley de Contrataciones del Estado por no contar con ofertas válidas o convenientes a los intereses institucionales.',
          documentoReferencia: documentoReferencia.trim() || `Resolución de Declaratoria Desierta`,
          estado: 'alerta',
          nuevoEstatus: 'Desierto',
          additionalFields: {
            estatusEvento: 'Desierto'
          }
        });
        break;
      }

      case 'actuacion_oficial': {
        if (!tituloDiligencia.trim()) {
          showToast({
            type: 'warning',
            title: 'Título Obligatorio',
            message: 'Por favor describa brevemente la actuación o diligencia oficial.'
          });
          return;
        }

        recordPurchaseMilestone(purchase.id, {
          titulo: tituloDiligencia.trim(),
          fase: 'Gestión Administrativa',
          responsable: currentUser ? `${currentUser.nombreCompleto} (${currentUser.unidad || 'Operador'})` : 'Gerencia de Informática - GIT',
          observaciones: observaciones.trim() || 'Actuación administrativa registrada en el expediente de la adquisición.',
          documentoReferencia: documentoReferencia.trim() || undefined,
          estado: 'completado'
        });
        break;
      }
    }

    closeActionModal();
  };

  // Filtrado de eventos
  const filteredEvents = timelineEvents.filter(event => {
    if (filterState === 'todos') return true;
    return event.estado === filterState;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      
      {/* Cabecera Principal */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/30">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Línea de Tiempo y Trazabilidad del Evento
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Sellado Automático Activo
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tracking cronológico inalterable con registro automático de fecha y hora exacta del servidor
          </p>
        </div>

        {/* Reloj del Servidor en Tiempo Real y Estado */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-amber-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {systemClock.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {systemClock.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpandedAll(!isExpandedAll)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <span>{isExpandedAll ? 'Compactar' : 'Expandir'}</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo de Transparencia y No-Manipulación */}
      <div className="bg-amber-50/70 border-b border-amber-200/80 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-950">
        <Lock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
        <div className="leading-snug">
          <span className="font-bold text-amber-900">Historial Inmutable con Sello de Tiempo del Sistema: </span>
          <span className="text-amber-800">
            Para prevenir manipulaciones, los hitos no se editan manualmente en fechas pasadas. Cada acción se registra de forma automática tomando la fecha y hora oficial exacta en que se grabó la actuación.
          </span>
        </div>
      </div>

      {/* Centro de Acciones Automatizadas del Flujo (Solo visible si canEdit) */}
      {canEdit && (
        <div className="bg-slate-50/90 p-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Acciones Institucionales de Flujo (Grabación Automática con Fecha y Hora Actual):
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Haga clic para ejecutar y estampar en la línea de tiempo
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {/* 1. Llegó para Dictamen */}
            <button
              type="button"
              onClick={() => openActionModal('llegada_git')}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-blue-900 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-blue-600">
                <FileCheck className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-1 rounded">GIT</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-blue-700">Llegó a Dictamen</span>
              <span className="text-[10px] text-slate-500 leading-tight">Recepción F56-e en GIT</span>
            </button>

            {/* 2. Emitir Dictamen GIT */}
            <button
              type="button"
              onClick={() => openActionModal('dictamen_git')}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 hover:text-emerald-900 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1 rounded">Vo.Bo.</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-emerald-700">Emitir Dictamen GIT</span>
              <span className="text-[10px] text-slate-500 leading-tight">Dictamen técnico favorable</span>
            </button>

            {/* 3. Remitir a Compras */}
            <button
              type="button"
              onClick={() => openActionModal('remite_compras')}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-800 hover:text-indigo-900 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-indigo-600">
                <Send className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-1 rounded">Oficio</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-indigo-700">Remitir a Compras</span>
              <span className="text-[10px] text-slate-500 leading-tight">Oficio formal a Compras</span>
            </button>

            {/* 4. Disponibilidad Presupuestaria */}
            <button
              type="button"
              onClick={() => openActionModal('disponibilidad_presupuestaria')}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-800 hover:text-amber-900 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-amber-600">
                <Coins className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1 rounded">DAF</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-amber-700">Disponibilidad DAF</span>
              <span className="text-[10px] text-slate-500 leading-tight">Crédito presupuestario</span>
            </button>

            {/* 5. Publicación Guatecompras */}
            <button
              type="button"
              onClick={() => openActionModal('publicacion_nog')}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-slate-800 hover:text-cyan-900 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-cyan-600">
                <Globe className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800 px-1 rounded">NOG</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-cyan-700">Publicar en Guatecompras</span>
              <span className="text-[10px] text-slate-500 leading-tight">Convocatoria oficial pública</span>
            </button>

            {/* 6. Recepción y Cierre Ofertas */}
            <button
              type="button"
              onClick={() => openActionModal('cierre_ofertas')}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-800 hover:text-purple-900 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-purple-600">
                <Users className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-1 rounded">Plicas</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-purple-700">Recepción de Ofertas</span>
              <span className="text-[10px] text-slate-500 leading-tight">Cierre de presentación</span>
            </button>

            {/* 7. Iniciar Evaluación */}
            <button
              type="button"
              onClick={() => openActionModal('evaluacion_ofertas')}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-800 hover:text-orange-900 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-orange-600">
                <FileText className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 px-1 rounded">Junta</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-orange-700">Evaluar Ofertas</span>
              <span className="text-[10px] text-slate-500 leading-tight">Análisis técnico y cuadros</span>
            </button>

            {/* 8. Adjudicación Definitiva */}
            <button
              type="button"
              onClick={() => openActionModal('adjudicacion')}
              className="px-2.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 hover:border-emerald-400 text-emerald-950 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-emerald-700">
                <Award className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-1 rounded">Final</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-emerald-800">Adjudicar Evento</span>
              <span className="text-[10px] text-emerald-800 leading-tight">Resolución a proveedor</span>
            </button>

            {/* 9. Declarar Desierto */}
            <button
              type="button"
              onClick={() => openActionModal('desierto')}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-800 hover:text-red-900 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-red-600">
                <Ban className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-800 px-1 rounded">Cierre</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-red-700">Declarar Desierto</span>
              <span className="text-[10px] text-slate-500 leading-tight">Sin ofertas o prescindido</span>
            </button>

            {/* 10. Registrar Otra Actuación */}
            <button
              type="button"
              onClick={() => openActionModal('actuacion_oficial')}
              className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 transition-all text-left flex flex-col gap-1 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-700">
                <MessageSquarePlus className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-300 text-slate-800 px-1 rounded">+ Nota</span>
              </div>
              <span className="text-xs font-bold leading-tight group-hover:text-slate-900">Otra Diligencia</span>
              <span className="text-[10px] text-slate-500 leading-tight">Asentar nota oficial</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Filtros y Resumen de Estado Actual */}
      <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-semibold text-[11px]">Filtrar:</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterState('todos')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                filterState === 'todos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({timelineEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterState('completado')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                filterState === 'completado' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Completados ({timelineEvents.filter(e => e.estado === 'completado').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterState('en_proceso')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                filterState === 'en_proceso' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              En Proceso ({timelineEvents.filter(e => e.estado === 'en_proceso').length})
            </button>
          </div>
        </div>

        {/* Estatus Actual Resaltado */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-medium">Estatus Actual Oficial:</span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            {purchase.estatusEvento}
          </span>
        </div>
      </div>

      {/* Cuerpo del Timeline con Tarjetas Inmutables */}
      <div className="p-4 sm:p-5">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No hay hitos con el filtro seleccionado</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Utilice las acciones de flujo automáticas superiores para asentar etapas en el expediente.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:top-3 before:bottom-3 before:left-2.5 sm:before:left-3.5 before:w-0.5 before:bg-slate-200">
            {filteredEvents.map((event) => {
              const isCompleted = event.estado === 'completado';
              const isInProcess = event.estado === 'en_proceso';
              const isAlert = event.estado === 'alerta';

              return (
                <div key={event.id} className="relative group">
                  {/* Nodo / Icono en la Línea de Tiempo */}
                  <div 
                    className={`absolute -left-6 sm:-left-8 top-1 w-5 sm:w-7 h-5 sm:h-7 rounded-full flex items-center justify-center border-2 transition-transform duration-200 group-hover:scale-110 shadow-xs z-10 ${
                      isCompleted 
                        ? 'bg-emerald-500 border-white text-white' 
                        : isInProcess 
                        ? 'bg-amber-500 border-white text-white animate-pulse' 
                        : isAlert
                        ? 'bg-red-500 border-white text-white'
                        : 'bg-slate-300 border-white text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3 sm:w-4 h-3 sm:h-4 stroke-[3]" />
                    ) : isInProcess ? (
                      <Clock className="w-3 sm:w-4 h-3 sm:h-4 stroke-[2.5]" />
                    ) : isAlert ? (
                      <AlertCircle className="w-3 sm:w-4 h-3 sm:h-4 stroke-[2.5]" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-500" />
                    )}
                  </div>

                  {/* Tarjeta del Hito */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    isInProcess 
                      ? 'bg-amber-50/50 border-amber-200 shadow-xs' 
                      : isAlert
                      ? 'bg-red-50/40 border-red-200 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}>
                    {/* Fila Superior: Título, Fase, Sello de Tiempo y Operador */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start sm:items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {event.titulo}
                        </span>

                        {event.fase && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                            {event.fase}
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isInProcess 
                            ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                            : isAlert
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isCompleted ? 'Completado' : isInProcess ? 'En Proceso' : isAlert ? 'Alerta / Desierto' : 'Pendiente'}
                        </span>

                        {/* Sello de Autenticidad Automática */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          Sello Automático
                        </span>
                      </div>

                      {/* Fecha y Hora Exacta Grabada */}
                      <div className="flex items-center gap-2 text-slate-600 text-xs">
                        <div className="flex items-center gap-1 font-semibold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          <span>{formatDate(event.fecha)}</span>
                          {event.hora && (
                            <span className="font-mono text-slate-600 ml-1">
                              • {event.hora} hrs
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadatos adicionales: Responsable, Documento y Operador */}
                    {(isExpandedAll || isInProcess) && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1.5 text-xs">
                        <div className="flex flex-wrap items-center gap-3 text-slate-600">
                          {event.responsable && (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-800">{event.responsable}</span>
                            </div>
                          )}

                          {event.documentoReferencia && (
                            <div className="flex items-center gap-1 text-slate-600">
                              <FileText className="w-3.5 h-3.5 text-amber-600" />
                              <span className="font-mono text-[11px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-semibold text-slate-900">
                                {event.documentoReferencia}
                              </span>
                            </div>
                          )}

                          {event.registradoPor && (
                            <span className="text-[10px] text-slate-500 ml-auto font-medium">
                              Registrado por: <strong className="text-slate-700">{event.registradoPor}</strong>
                            </span>
                          )}
                        </div>

                        {/* Observaciones del Hito */}
                        {event.observaciones && (
                          <p className="text-[11px] sm:text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-slate-200 leading-relaxed font-normal">
                            {event.observaciones}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Guiado de Acción Automática con Sellado de Tiempo Inalterable */}
      {activeActionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            {/* Encabezado del Diálogo */}
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {activeActionModal === 'llegada_git' && 'Registrar Llegada para Dictamen Técnico'}
                    {activeActionModal === 'dictamen_git' && 'Emitir Dictamen Técnico GIT'}
                    {activeActionModal === 'remite_compras' && 'Remitir Expediente a Dirección de Compras'}
                    {activeActionModal === 'disponibilidad_presupuestaria' && 'Aprobar Disponibilidad Presupuestaria'}
                    {activeActionModal === 'publicacion_nog' && 'Registrar Publicación Guatecompras (NOG)'}
                    {activeActionModal === 'cierre_ofertas' && 'Registrar Cierre y Recepción de Ofertas'}
                    {activeActionModal === 'evaluacion_ofertas' && 'Iniciar Evaluación Técnica de Ofertas'}
                    {activeActionModal === 'adjudicacion' && 'Registrar Adjudicación Definitiva'}
                    {activeActionModal === 'desierto' && 'Declarar Evento Desierto / Prescindido'}
                    {activeActionModal === 'actuacion_oficial' && 'Asentar Nueva Diligencia o Nota Oficial'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    NOG: {purchase.nog} • Formulario: {purchase.f56e}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeActionModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELLO DE FECHA Y HORA DEL SISTEMA (LOCKED & AUTOMATED) */}
            <div className="bg-emerald-50 border-b border-emerald-200 p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold block text-emerald-950">Sello de Tiempo Automático del Sistema:</span>
                  <span className="text-[11px] text-emerald-800">
                    Fecha y hora capturada en tiempo real al confirmar la acción
                  </span>
                </div>
              </div>
              <div className="font-mono text-emerald-900 bg-white border border-emerald-300 px-2.5 py-1 rounded-md font-bold text-xs shadow-2xs">
                {systemClock.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })} {systemClock.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </div>
            </div>

            {/* Formulario con campos complementarios */}
            <form onSubmit={handleExecuteAutomatedAction} className="p-4 sm:p-5 space-y-3.5 text-xs">

              {activeActionModal === 'actuacion_oficial' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Título de la Diligencia o Actuación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Requerimiento de subsanación de garantía, Reunión técnica, etc."
                    value={tituloDiligencia}
                    onChange={(e) => setTituloDiligencia(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden font-medium text-xs sm:text-sm"
                  />
                </div>
              )}

              {activeActionModal === 'publicacion_nog' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Número de Operación Guatecompras (NOG)
                  </label>
                  <input
                    type="text"
                    value={nogValue}
                    onChange={(e) => setNogValue(e.target.value)}
                    placeholder="ej. 22019482"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden font-mono text-xs sm:text-sm"
                  />
                </div>
              )}

              {activeActionModal === 'cierre_ofertas' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Cantidad de Ofertas Recibidas en el Cierre
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cantidadOfertas}
                    onChange={(e) => setCantidadOfertas(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden font-bold text-xs sm:text-sm"
                  />
                </div>
              )}

              {activeActionModal === 'adjudicacion' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Proveedor Adjudicado <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre o Razón Social"
                      value={proveedorAdjudicado}
                      onChange={(e) => setProveedorAdjudicado(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Monto Adjudicado (Q.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={montoAdjudicado}
                      onChange={(e) => setMontoAdjudicado(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden text-xs sm:text-sm font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Documento de Referencia */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Documento Oficial de Respaldo / Referencia (Opcional)
                </label>
                <input
                  type="text"
                  placeholder={
                    activeActionModal === 'dictamen_git' ? 'ej. Dictamen Técnico No. GIT-045-2026' :
                    activeActionModal === 'remite_compras' ? 'ej. Oficio No. GIT-OF-112-2026' :
                    activeActionModal === 'disponibilidad_presupuestaria' ? 'ej. Dictamen DAF-DP-2026-089' :
                    activeActionModal === 'adjudicacion' ? 'ej. Resolución de Junta No. 014-2026' :
                    'ej. Providencia, Oficio, Acta, etc.'
                  }
                  value={documentoReferencia}
                  onChange={(e) => setDocumentoReferencia(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden text-xs sm:text-sm"
                />
              </div>

              {/* Observaciones o Notas */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Observaciones Técnicas o Administrativas (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles complementarios de la acción ejecutada..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden text-xs sm:text-sm leading-relaxed"
                />
              </div>

              {/* Botones de Confirmación */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeActionModal}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirmar y Grabar Acción Inmutable</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
