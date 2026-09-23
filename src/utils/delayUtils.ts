import { PurchaseRecord } from '../types';

export type DelaySeverity = 'verde' | 'naranja' | 'rojo';

export interface SemaphoreCategoryInfo {
  severity: DelaySeverity;
  label: string;
  sublabel: string;
  rangoTexto: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  badgeClass: string;
  textClass: string;
  indicatorDotClass: string;
  descripcion: string;
}

/**
 * Retorna los días de atraso de un evento de compra / NOG.
 * Si el registro ya cuenta con diasAtraso definido, lo respeta.
 * Si no, calcula la diferencia entre la fecha de ofertas (o publicación)
 * y la fecha de adjudicación (si está adjudicado) o un cómputo referencial.
 */
export function getEventDelayDays(p: PurchaseRecord): number {
  if (typeof p.diasAtraso === 'number' && !isNaN(p.diasAtraso)) {
    return Math.max(0, Math.round(p.diasAtraso));
  }

  // Si no tiene diasAtraso explícito, calcular según fechas
  if (p.estatusEvento === 'Adjudicación') {
    if (p.fechaAdjudicacion && p.fechaOfertas) {
      const ms = new Date(p.fechaAdjudicacion).getTime() - new Date(p.fechaOfertas).getTime();
      return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
    }
    // Si no hay fechaAdjudicacion, atraso habitual admisible
    return 6;
  }

  if (p.fechaOfertas) {
    const ofertasDate = new Date(p.fechaOfertas).getTime();
    const now = Date.now();
    const diffDays = Math.round((now - ofertasDate) / (1000 * 60 * 60 * 24));
    // Acotar a un rango razonable si las fechas son históricas
    if (diffDays > 0) {
      return diffDays;
    }
    return 0;
  }

  return 0;
}

/**
 * Clasificación de semáforo según la regla solicitada:
 * - 10 días o menos (<= 10 días): Verde
 * - Mayor de 10 e igual a 30 (11 a 30 días): Naranja
 * - Mayor de 30 días (> 30 días): Rojo
 */
export function getDelaySeverity(diasAtraso: number): DelaySeverity {
  if (diasAtraso <= 10) {
    return 'verde';
  } else if (diasAtraso <= 30) {
    return 'naranja';
  } else {
    return 'rojo';
  }
}

export const SEMAPHORE_CONFIG: Record<DelaySeverity, SemaphoreCategoryInfo> = {
  verde: {
    severity: 'verde',
    label: 'Plazo Admisible',
    sublabel: 'Bajo Control',
    rangoTexto: '≤ 10 días de atraso',
    colorClass: 'emerald',
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    bgClass: 'bg-emerald-50/60',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    textClass: 'text-emerald-700',
    indicatorDotClass: 'bg-emerald-500 shadow-emerald-400/50',
    descripcion: 'Eventos con ritmo regular o atraso mínimo no mayor a 10 días conforme a estándares de gestión.'
  },
  naranja: {
    severity: 'naranja',
    label: 'Alerta Moderada',
    sublabel: 'Seguimiento Prioritario',
    rangoTexto: '11 a 30 días de atraso',
    colorClass: 'amber',
    borderClass: 'border-amber-200 hover:border-amber-400',
    bgClass: 'bg-amber-50/60',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    textClass: 'text-amber-700',
    indicatorDotClass: 'bg-amber-500 shadow-amber-400/50',
    descripcion: 'Eventos con atraso mayor a 10 y hasta 30 días. Requieren aceleración de dictamen o revisión con compras.'
  },
  rojo: {
    severity: 'rojo',
    label: 'Retraso Crítico',
    sublabel: 'Intervención Urgente',
    rangoTexto: '> 30 días de atraso',
    colorClass: 'rose',
    borderClass: 'border-rose-200 hover:border-rose-400',
    bgClass: 'bg-rose-50/60',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    textClass: 'text-rose-700',
    indicatorDotClass: 'bg-rose-500 shadow-rose-400/50',
    descripcion: 'Eventos que superan los 30 días de retraso. Riesgo de caducidad o vencimiento de disponibilidad presupuestaria.'
  }
};
