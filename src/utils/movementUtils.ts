import { PurchaseRecord, PurchaseMovement, AttachedDocument } from '../types';
import { formatDate } from './formatters';

export interface MovementTypeConfig {
  key: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  borderColor: string;
  desc: string;
}

export const MOVEMENT_TYPES: Record<string, MovementTypeConfig> = {
  observacion: {
    key: 'observacion',
    label: 'Observación Técnica',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    dotColor: 'bg-amber-500',
    borderColor: 'border-amber-300',
    desc: 'Comentarios, anotaciones técnicas o aclaraciones sobre el expediente'
  },
  avance: {
    key: 'avance',
    label: 'Hito de Avance',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    dotColor: 'bg-blue-500',
    borderColor: 'border-blue-300',
    desc: 'Progreso de fase, cambio de estatus o cumplimiento de requisitos'
  },
  oficio: {
    key: 'oficio',
    label: 'Oficio / Traslado',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    dotColor: 'bg-indigo-500',
    borderColor: 'border-indigo-300',
    desc: 'Remisión formal de expediente, oficios de traslado o memorandos'
  },
  dictamen: {
    key: 'dictamen',
    label: 'Dictamen Técnico GIT',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    dotColor: 'bg-emerald-500',
    borderColor: 'border-emerald-300',
    desc: 'Resolución técnica de viabilidad, estándares y especificaciones'
  },
  adjudicacion: {
    key: 'adjudicacion',
    label: 'Adjudicación / Resolución',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    dotColor: 'bg-purple-500',
    borderColor: 'border-purple-300',
    desc: 'Resolución de adjudicación definitiva o acta de junta calificadora'
  },
  pago: {
    key: 'pago',
    label: 'Devengado / Pago',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    dotColor: 'bg-teal-500',
    borderColor: 'border-teal-300',
    desc: 'Rebaja presupuestaria, liquidación contable o pago emitido'
  },
  documento: {
    key: 'documento',
    label: 'Documentación Oficial',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    dotColor: 'bg-sky-500',
    borderColor: 'border-sky-300',
    desc: 'Incorporación de contratos, actas, bases o archivos respaldados'
  },
  otro: {
    key: 'otro',
    label: 'Otro Movimiento',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    dotColor: 'bg-slate-500',
    borderColor: 'border-slate-300',
    desc: 'Otras gestiones institucionales asociadas a la adquisición'
  }
};

/**
 * Obtiene o sintetiza la lista de movimientos de una adquisición ordenada estrictamente
 * del MÁS RECIENTE al MÁS ANTIGUO (orden cronológico descendente).
 */
export function getPurchaseMovements(purchase?: Partial<PurchaseRecord>): PurchaseMovement[] {
  if (!purchase) return [];

  // Si ya tiene movimientos registrados en la ficha
  if (purchase.movimientos && purchase.movimientos.length > 0) {
    return [...purchase.movimientos].sort((a, b) => {
      const timeA = new Date(a.fechaHoraIso || (a.fecha ? `${a.fecha}T${a.hora || '00:00'}:00` : 0)).getTime();
      const timeB = new Date(b.fechaHoraIso || (b.fecha ? `${b.fecha}T${b.hora || '00:00'}:00` : 0)).getTime();
      return timeB - timeA; // Descendente: más reciente primero
    });
  }

  // Si no tiene movimientos aún, sintetizar los hitos existentes como movimientos iniciales
  const list: PurchaseMovement[] = [];

  // 1. Solicitud Inicial F56-e
  if (purchase.fechaSolicitud || purchase.fechaCreacion) {
    const f = purchase.fechaSolicitud || purchase.fechaCreacion?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    list.push({
      id: `mov-init-solicitud-${purchase.id || 'new'}`,
      fecha: f,
      hora: '08:30',
      fechaHoraIso: `${f}T08:30:00Z`,
      titulo: 'Registro de Solicitud Inicial F56-e',
      tipoAccion: 'avance',
      observaciones: purchase.descripcion 
        ? `Objeto del requerimiento: ${purchase.descripcion}` 
        : 'Ingreso oficial de la solicitud y especificaciones bajo formulario F56-e.',
      responsable: purchase.dependenciaSolicitante || purchase.areaSolicitante || 'Unidad Solicitante',
      usuario: purchase.creadoPor || 'Sistema GIT',
      rolUsuario: 'Operador',
      estatusAlMomento: 'Solicitud Inicial',
      documento: purchase.f56Documento,
      automatico: true
    });
  }

  // 2. Vo.Bo. Jefatura
  if (purchase.fechaVoBo) {
    list.push({
      id: `mov-init-vobo-${purchase.id || 'new'}`,
      fecha: purchase.fechaVoBo,
      hora: '10:00',
      fechaHoraIso: `${purchase.fechaVoBo}T10:00:00Z`,
      titulo: 'Visto Bueno de Jefatura (Vo.Bo.)',
      tipoAccion: 'oficio',
      observaciones: `Visto bueno emitido el ${formatDate(purchase.fechaVoBo)} por la jefatura del área requirente.`,
      responsable: purchase.areaSolicitante || 'Jefatura de Área',
      usuario: 'Jefatura Responsable',
      rolUsuario: 'Jefe de Unidad',
      estatusAlMomento: 'En Revisión',
      automatico: true
    });
  }

  // 3. Autorización Superior
  if (purchase.fechaAutorizado) {
    list.push({
      id: `mov-init-autorizado-${purchase.id || 'new'}`,
      fecha: purchase.fechaAutorizado,
      hora: '11:15',
      fechaHoraIso: `${purchase.fechaAutorizado}T11:15:00Z`,
      titulo: 'Autorización Formal del Requerimiento',
      tipoAccion: 'avance',
      observaciones: `Aprobación y autorización formal del formulario F56-e para trámite presupuestario.`,
      responsable: 'Autoridad Solicitante',
      usuario: 'Dirección Solicitante',
      rolUsuario: 'Autoridad',
      estatusAlMomento: 'Autorizado',
      automatico: true
    });
  }

  // 4. Dictamen Técnico GIT
  if (purchase.evaluadoGIT === 'Sí' || purchase.fechaDictamenGIT) {
    const f = purchase.fechaDictamenGIT || purchase.fechaSolicitud || new Date().toISOString().slice(0, 10);
    list.push({
      id: `mov-init-dictamen-${purchase.id || 'new'}`,
      fecha: f,
      hora: '14:30',
      fechaHoraIso: `${f}T14:30:00Z`,
      titulo: 'Dictamen Técnico Oficial Emitido por GIT',
      tipoAccion: 'dictamen',
      observaciones: 'Evaluación técnica favorable emitida por los especialistas de la Gerencia de Informática garantizando viabilidad técnica y compatibilidad de infraestructura.',
      responsable: 'Gerencia de Informática - GIT',
      usuario: 'Especialista GIT',
      rolUsuario: 'Técnico GIT',
      estatusAlMomento: 'Dictamen Emitido',
      automatico: true
    });
  }

  // 5. Oficio de Traslado GIT a Compras
  if (purchase.fechaElaboracionOficioGIT) {
    list.push({
      id: `mov-init-oficio-${purchase.id || 'new'}`,
      fecha: purchase.fechaElaboracionOficioGIT,
      hora: '16:00',
      fechaHoraIso: `${purchase.fechaElaboracionOficioGIT}T16:00:00Z`,
      titulo: 'Oficio de Traslado GIT hacia Dirección de Compras',
      tipoAccion: 'oficio',
      observaciones: `Expediente con dictamen técnico remitido formalmente a la Dirección de Compras para inicio de contratación.`,
      responsable: 'Gerencia de Informática - GIT',
      usuario: 'Gerente GIT',
      rolUsuario: 'Gerencia',
      estatusAlMomento: 'Traslado a Compras',
      automatico: true
    });
  }

  // 6. Publicación Guatecompras
  if (purchase.fechaPublicacion) {
    list.push({
      id: `mov-init-publicacion-${purchase.id || 'new'}`,
      fecha: purchase.fechaPublicacion,
      hora: '09:00',
      fechaHoraIso: `${purchase.fechaPublicacion}T09:00:00Z`,
      titulo: `Publicación Oficial en Guatecompras (NOG: ${purchase.nog || 'Pendiente'})`,
      tipoAccion: 'avance',
      observaciones: `Convocatoria pública publicada en Guatecompras. Modalidad de compra: ${purchase.modalidadCompra || 'Cotización/Licitación'}.`,
      responsable: 'Dirección de Compras',
      usuario: 'Operador de Compras',
      rolUsuario: 'Compras',
      estatusAlMomento: 'Publicado',
      automatico: true
    });
  }

  // 7. Recepción y Apertura de Ofertas
  if (purchase.fechaOfertas || (purchase.cantidadOfertas !== undefined && purchase.cantidadOfertas > 0)) {
    const f = purchase.fechaOfertas || purchase.fechaPublicacion || new Date().toISOString().slice(0, 10);
    list.push({
      id: `mov-init-ofertas-${purchase.id || 'new'}`,
      fecha: f,
      hora: '12:00',
      fechaHoraIso: `${f}T12:00:00Z`,
      titulo: `Apertura y Recepción de Ofertas (${purchase.cantidadOfertas ?? 0} oferentes)`,
      tipoAccion: 'avance',
      observaciones: `Recepción formal de ${purchase.cantidadOfertas ?? 0} plicas y ofertas de proveedores participantes en el concurso.`,
      responsable: 'Junta de Cotización / Compras',
      usuario: 'Junta Calificadora',
      rolUsuario: 'Comisión Receptora',
      estatusAlMomento: 'Evaluación',
      automatico: true
    });
  }

  // 8. Adjudicación Definitiva
  const isAdjudicado = purchase.estatusEvento?.toLowerCase().trim().includes('adjudic');
  if (isAdjudicado || purchase.fechaAdjudicacion) {
    const f = purchase.fechaAdjudicacion || purchase.fechaModificacion?.slice(0, 10) || purchase.fechaSolicitud || new Date().toISOString().slice(0, 10);
    list.push({
      id: `mov-init-adjudicacion-${purchase.id || 'new'}`,
      fecha: f,
      hora: '15:45',
      fechaHoraIso: `${f}T15:45:00Z`,
      titulo: `Resolución de Adjudicación Definitiva: ${purchase.proveedorAdjudicado || 'Adjudicada'}`,
      tipoAccion: 'adjudicacion',
      observaciones: `Evento formalmente adjudicado a favor de ${purchase.proveedorAdjudicado || 'proveedor adjudicado'} por un valor contratado de Q${(purchase.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}.`,
      responsable: 'Autoridad Superior / Junta de Calificación',
      usuario: 'Autoridad Contratante',
      rolUsuario: 'Dirección',
      estatusAlMomento: 'Adjudicación',
      automatico: true
    });
  }

  // 9. Pago Devengado
  if (purchase.estadoPago === 'pagado') {
    const f = purchase.fechaPago || purchase.fechaAdjudicacion || new Date().toISOString().slice(0, 10);
    list.push({
      id: `mov-init-pago-${purchase.id || 'new'}`,
      fecha: f,
      hora: '16:30',
      fechaHoraIso: `${f}T16:30:00Z`,
      titulo: 'Liquidación y Pago Devengado Realizado',
      tipoAccion: 'pago',
      observaciones: `Descargo efectuado en el renglón presupuestario [${purchase.renglonPresupuestario || '158'}]. Monto pagado: Q${(purchase.montoPagado || purchase.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}.`,
      responsable: 'Gerencia Financiera / Tesorería',
      usuario: 'Tesorero DAF',
      rolUsuario: 'Finanzas',
      estatusAlMomento: 'Pagado',
      automatico: true
    });
  }

  // Si la compra no tenía ningún hito registrado aún, crear al menos el nodo de apertura
  if (list.length === 0) {
    const f = new Date().toISOString().slice(0, 10);
    list.push({
      id: `mov-init-vacio-${purchase.id || 'new'}`,
      fecha: f,
      hora: '08:00',
      fechaHoraIso: `${f}T08:00:00Z`,
      titulo: 'Apertura de Expediente de Adquisición',
      tipoAccion: 'avance',
      observaciones: purchase.descripcion || 'Registro inicial de la adquisición en el sistema.',
      responsable: purchase.dependenciaSolicitante || 'Área Solicitante',
      usuario: purchase.creadoPor || 'Operador',
      rolUsuario: 'Operador',
      estatusAlMomento: purchase.estatusEvento || 'Vigente',
      automatico: true
    });
  }

  // ORDENAR ESTRICTAMENTE DE MÁS RECIENTE A MÁS ANTIGUO
  return list.sort((a, b) => {
    const timeA = new Date(a.fechaHoraIso || `${a.fecha}T${a.hora || '00:00'}:00`).getTime();
    const timeB = new Date(b.fechaHoraIso || `${b.fecha}T${b.hora || '00:00'}:00`).getTime();
    return timeB - timeA;
  });
}
