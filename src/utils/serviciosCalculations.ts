/**
 * @license
 * Sistema de Control, Vigencia y Alertas Tempranas de Servicios Contratados
 * Gerencia de Informática - Organismo Judicial de Guatemala
 */

import { 
  ServicioContratado, 
  ServicioCalculos, 
  SemaforoVigencia, 
  NivelAlertaGestion 
} from '../types';

/**
 * Normaliza una fecha string (YYYY-MM-DD o ISO) a timestamp UTC sin desfase de zona horaria
 */
export function parseDateToMidnight(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Diferencia en días enteros de calendario entre dos fechas (d2 - d1)
 */
export function diffInCalendarDays(d1: Date, d2: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc2 - utc1) / MS_PER_DAY);
}

/**
 * Obtiene el umbral oficial de alerta temprana en días según la modalidad de contratación
 */
export function getUmbralAlertaPorModalidad(modalidad?: string): number {
  if (!modalidad) return 45;
  const mod = modalidad.toLowerCase().trim();

  if (mod.includes('baja cuantía') || mod.includes('baja cuantia')) {
    return 30; // 30 días antes (1 mes calendario)
  }
  if (mod.includes('compra directa')) {
    return 45; // 45 días antes
  }
  if (mod.includes('licitación') || mod.includes('licitacion')) {
    return 120; // 120 días antes (fases de bases, publicación Guatecompras y adjudicación)
  }
  if (mod.includes('cotización') || mod.includes('cotizacion')) {
    return 90; // 90 días antes
  }
  if (mod.includes('renovación') || mod.includes('renovacion')) {
    return 60; // 60 días antes
  }
  return 45;
}

/**
 * Calcula todas las métricas, días restantes, porcentaje y semáforos de un servicio contratado
 */
export function calcularMetricasServicio(
  servicio: Pick<ServicioContratado, 'inicioVigencia' | 'finVigencia' | 'modalidad' | 'accionRequerida' | 'estatusActual'>,
  fechaReferencia: Date = new Date()
): ServicioCalculos {
  const inicio = parseDateToMidnight(servicio.inicioVigencia);
  const fin = parseDateToMidnight(servicio.finVigencia);

  const hoy = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth(), fechaReferencia.getDate(), 0, 0, 0, 0);

  // Valores predeterminados en caso de datos faltantes o inválidos
  if (!inicio || !fin) {
    return {
      duracionTotalDias: 0,
      diasTranscurridos: 0,
      diasRestantes: 0,
      porcentajeConsumido: 0,
      semaforoVigencia: 'verde',
      nivelAlertaGestion: 'normal',
      mensajeAlertaGestion: 'Fechas incompletas',
      requiereAlertaTemprana: false,
      esVencido: false,
      diasDesfase: 0,
      diasUmbralAlerta: 45
    };
  }

  // A. Cálculos Automáticos de Vigencia
  const duracionTotalDias = Math.max(1, diffInCalendarDays(inicio, fin));
  const diasTranscurridos = diffInCalendarDays(inicio, hoy);
  const diasRestantes = diffInCalendarDays(hoy, fin);

  const esVencido = diasRestantes <= 0;
  const diasDesfase = esVencido ? Math.abs(diasRestantes) : 0;

  // Porcentaje consumido de vigencia (0% a 100%)
  const porcentajeBruto = Math.round((diasTranscurridos / duracionTotalDias) * 100);
  const porcentajeConsumido = Math.min(100, Math.max(0, porcentajeBruto));

  // B. Semáforo 1: Vigencia Operativa
  // 🟢 Verde: > 60 días
  // 🟡 Amarillo: 31 a 60 días
  // 🟠 Naranja: 1 a 30 días
  // 🔴 Rojo: <= 0 días (Vencido)
  let semaforoVigencia: SemaforoVigencia = 'verde';
  if (diasRestantes <= 0) {
    semaforoVigencia = 'rojo';
  } else if (diasRestantes <= 30) {
    semaforoVigencia = 'naranja';
  } else if (diasRestantes <= 60) {
    semaforoVigencia = 'amarillo';
  } else {
    semaforoVigencia = 'verde';
  }

  // C. Semáforo 2: Semáforo de Alerta para Gestión de Nueva Compra (Reglas por Modalidad)
  const umbral = getUmbralAlertaPorModalidad(servicio.modalidad);
  const modLower = (servicio.modalidad || '').toLowerCase();
  const accion = servicio.accionRequerida || '';

  let nivelAlertaGestion: NivelAlertaGestion = 'normal';
  let mensajeAlertaGestion = 'Vigencia dentro del rango programado';
  let requiereAlertaTemprana = false;

  if (esVencido) {
    nivelAlertaGestion = 'critico';
    mensajeAlertaGestion = `Contrato Vencido (desfase de ${diasDesfase} día${diasDesfase === 1 ? '' : 's'})`;
    requiereAlertaTemprana = true;
  } else if (modLower.includes('compra directa')) {
    // Modalidad "Compra directa":
    // Alertar 45 días antes.
    // Si Días Restantes <= 45 y accionRequerida == 'Iniciar nuevo evento':
    // Estado: Alerta Crítica de Gestión (badge parpadeante)
    if (diasRestantes <= 45) {
      requiereAlertaTemprana = true;
      if (accion === 'Iniciar nuevo evento') {
        nivelAlertaGestion = 'critico';
        mensajeAlertaGestion = 'Requiere gestión inmediata de Compra Directa (plazo <= 45 días)';
      } else {
        nivelAlertaGestion = 'alerta';
        mensajeAlertaGestion = `Compra Directa por vencer en ${diasRestantes} días (umbral <= 45 días)`;
      }
    }
  } else if (modLower.includes('baja cuantía') || modLower.includes('baja cuantia')) {
    // Modalidad "Baja cuantía":
    // Alertar 30 días antes (1 mes calendario)
    // Si Días Restantes <= 30:
    // Estado: Alerta de Baja Cuantía
    if (diasRestantes <= 30) {
      requiereAlertaTemprana = true;
      nivelAlertaGestion = 'alerta';
      mensajeAlertaGestion = `Alerta Baja Cuantía: ${diasRestantes} días restantes (notificación al responsable)`;
    }
  } else if (modLower.includes('licitación') || modLower.includes('licitacion')) {
    // Modalidad Licitación / Licitación UEEP:
    // Alerta anticipada a 120 días debido a publicación en Guatecompras y bases
    if (diasRestantes <= 120) {
      requiereAlertaTemprana = true;
      nivelAlertaGestion = diasRestantes <= 60 ? 'critico' : 'anticipado';
      mensajeAlertaGestion = `Alerta Anticipada Licitación: ${diasRestantes} días para vencimiento (umbral 120 días)`;
    }
  } else if (modLower.includes('cotización') || modLower.includes('cotizacion')) {
    // Modalidad Cotización: Alerta a 90 días
    if (diasRestantes <= 90) {
      requiereAlertaTemprana = true;
      nivelAlertaGestion = diasRestantes <= 45 ? 'critico' : 'anticipado';
      mensajeAlertaGestion = `Alerta Anticipada Cotización: ${diasRestantes} días restantes (umbral 90 días)`;
    }
  } else {
    // Otras modalidades (Renovación, Excepción):
    if (diasRestantes <= umbral) {
      requiereAlertaTemprana = true;
      nivelAlertaGestion = diasRestantes <= 30 ? 'critico' : 'alerta';
      mensajeAlertaGestion = `Gestión requerida: ${diasRestantes} días restantes para término`;
    }
  }

  return {
    duracionTotalDias,
    diasTranscurridos,
    diasRestantes,
    porcentajeConsumido,
    semaforoVigencia,
    nivelAlertaGestion,
    mensajeAlertaGestion,
    requiereAlertaTemprana,
    esVencido,
    diasDesfase,
    diasUmbralAlerta: umbral
  };
}

/**
 * Colores y configuración visual de Semáforo 1: Vigencia Operativa
 */
export function getSemaforoVigenciaVisual(semaforo: SemaforoVigencia): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  label: string;
  dotColor: string;
  iconColor: string;
} {
  switch (semaforo) {
    case 'verde':
      return {
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-700',
        badgeBorder: 'border-emerald-300',
        label: 'Vigente (+60 días)',
        dotColor: 'bg-emerald-500',
        iconColor: 'text-emerald-600'
      };
    case 'amarillo':
      return {
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-300',
        label: 'Por vencer (31-60 días)',
        dotColor: 'bg-amber-500',
        iconColor: 'text-amber-600'
      };
    case 'naranja':
      return {
        badgeBg: 'bg-orange-50',
        badgeText: 'text-orange-800',
        badgeBorder: 'border-orange-300',
        label: 'Urgente (1-30 días)',
        dotColor: 'bg-orange-500',
        iconColor: 'text-orange-600'
      };
    case 'rojo':
    default:
      return {
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-800',
        badgeBorder: 'border-rose-300',
        label: 'Vencido / Crítico (0 días)',
        dotColor: 'bg-rose-600',
        iconColor: 'text-rose-600'
      };
  }
}

/**
 * Colores y configuración visual de Semáforo 2: Alerta para Gestión de Nueva Compra
 */
export function getNivelAlertaGestionVisual(nivel: NivelAlertaGestion, esCriticoBlinking: boolean = false): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  label: string;
  pulse: boolean;
} {
  switch (nivel) {
    case 'critico':
      return {
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-900',
        badgeBorder: 'border-rose-400',
        label: 'Alerta Crítica de Gestión',
        pulse: true
      };
    case 'alerta':
      return {
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-900',
        badgeBorder: 'border-amber-400',
        label: 'Alerta de Gestión',
        pulse: false
      };
    case 'anticipado':
      return {
        badgeBg: 'bg-indigo-100',
        badgeText: 'text-indigo-900',
        badgeBorder: 'border-indigo-300',
        label: 'Alerta Anticipada',
        pulse: false
      };
    case 'normal':
    default:
      return {
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-700',
        badgeBorder: 'border-slate-200',
        label: 'En Plazo',
        pulse: false
      };
  }
}

/**
 * Construye el payload de correo estructurado requerido para alertas tempranas
 */
export function construirPayloadCorreoAlertaServicio(
  servicio: ServicioContratado,
  metricas: ServicioCalculos
): {
  subject: string;
  destinatarios: string[];
  html: string;
  text: string;
} {
  const { modalidad, servicioContratado, nogExpediente, area, responsableSeguimiento, proveedorActual, finVigencia } = servicio;
  const { diasRestantes, mensajeAlertaGestion, nivelAlertaGestion } = metricas;

  const subject = `[ALERTA DE VENCIMIENTO] - ${modalidad} - ${servicioContratado} (${nogExpediente})`;

  const alertBadgeColor = nivelAlertaGestion === 'critico' ? '#dc2626' : (nivelAlertaGestion === 'alerta' ? '#d97706' : '#4f46e5');
  const alertBadgeText = nivelAlertaGestion === 'critico' ? 'ALERTA CRÍTICA' : (nivelAlertaGestion === 'alerta' ? 'ATENCIÓN REQUERIDA' : 'AVISO ANTICIPADO');

  const diasTexto = diasRestantes <= 0 
    ? `<span style="color: #dc2626; font-weight: bold;">CONTRATO VENCIDO (${Math.abs(diasRestantes)} días de desfase)</span>`
    : `<span style="color: ${diasRestantes <= 30 ? '#dc2626' : '#d97706'}; font-weight: bold;">${diasRestantes} días calendario</span>`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <!-- Cabecera Institucional -->
      <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 4px solid #f59e0b;">
        <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">
          ORGANISMO JUDICIAL DE GUATEMALA
        </h1>
        <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px; font-weight: 600;">
          GERENCIA DE INFORMÁTICA • SISTEMA DE VIGENCIA Y ALERTAS TEMPRANAS
        </p>
      </div>

      <!-- Cuerpo del Mensaje -->
      <div style="padding: 28px 24px;">
        <div style="display: inline-block; background-color: ${alertBadgeColor}15; border: 1px solid ${alertBadgeColor}; color: ${alertBadgeColor}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 18px;">
          ⚡ ${alertBadgeText}: ${modalidad}
        </div>

        <h2 style="color: #0f172a; font-size: 17px; margin: 0 0 12px; line-height: 1.4;">
          Notificación de Vencimiento y Nueva Adquisición
        </h2>

        <p style="color: #334155; font-size: 13px; line-height: 1.6; margin: 0 0 18px;">
          Se le notifica que el servicio contratado detallado a continuación ha alcanzado el umbral de alerta temprana en la plataforma Guatecompras y requiere la tramitación administrativa correspondiente.
        </p>

        <!-- Ficha Técnica -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold; width: 35%;">Servicio Contratado:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">${servicioContratado}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">Código / Expediente:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-family: monospace; font-weight: bold;">${servicio.codigo} • NOG: ${nogExpediente}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">Área Solicitante:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${area} (${servicio.departamento || 'GIT'})</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">Modalidad de Contratación:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">${modalidad}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">Proveedor Actual:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${proveedorActual}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">Fecha Término Vigencia:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">${finVigencia}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">Plazo / Días Restantes:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${diasTexto}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">Acción Administrativa:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #1e3a8a; font-weight: bold;">${servicio.accionRequerida || 'Iniciar nuevo evento'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #64748b; font-weight: bold;">Responsable de Seguimiento:</td>
            <td style="padding: 10px 14px; color: #0f172a; font-weight: bold;">${responsableSeguimiento}</td>
          </tr>
        </table>

        <!-- Recordatorio de Plazo -->
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 6px; margin-bottom: 22px;">
          <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: bold;">
            📌 Instrucción de Plazo de Gestión:
          </p>
          <p style="margin: 6px 0 0; color: #78350f; font-size: 12px; line-height: 1.5;">
            ${mensajeAlertaGestion}. Por favor verificar la preparación de los Términos de Referencia (TDR), Formulario F56-e y disponibilidad presupuestaria para evitar la interrupción del servicio o contingencias institucionales.
          </p>
        </div>

        <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
          Este mensaje fue emitido automáticamente por el Sistema de Control de Compras de la Gerencia de Informática con base en el marco normativo de contrataciones del Estado de Guatemala.
        </p>
      </div>

      <!-- Pie Institucional -->
      <div style="background-color: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
        © 2026 Organismo Judicial de Guatemala • Gerencia de Informática
      </div>
    </div>
  `;

  const text = `[ALERTA DE VENCIMIENTO] - ${modalidad} - ${servicioContratado} (${nogExpediente})
Área: ${area} (${servicio.departamento || 'GIT'})
Proveedor: ${proveedorActual}
Fecha Término: ${finVigencia}
Días Restantes: ${diasRestantes}
Responsable: ${responsableSeguimiento}
Acción Requerida: ${servicio.accionRequerida}
Instrucción: ${mensajeAlertaGestion}`;

  return {
    subject,
    destinatarios: ['kgerardo2003@gmail.com'],
    html,
    text
  };
}
