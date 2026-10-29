import { JudicaturaRecord, OpcionSiNo, EstatusComputo, EstatusAudio, EstatusRed, EstatusEnlace } from '../types';

export const COMPONENT_COMPUTO_OPTIONS: EstatusComputo[] = [
  'Solicitado F56',
  'Se cuenta con equipo',
  'Instalado',
  'Pendiente'
];

export const COMPONENT_AUDIO_OPTIONS: EstatusAudio[] = [
  'Solicitado F56',
  'Se cuenta con equipo',
  'Instalado',
  'Pendiente'
];

export const COMPONENT_ENLACE_OPTIONS: EstatusEnlace[] = [
  'Solicitado',
  'Instalado',
  'Equipo Satelital Temporal',
  'Pendiente'
];

export const COMPONENT_RED_OPTIONS: EstatusRed[] = [
  'Solicitud F56',
  'Instalando',
  'Terminado',
  'Pendiente'
];

export interface ComponenteJudicaturaInfo {
  status: string;
  instalado: OpcionSiNo;
  tieneComponente: boolean;
  descripcionCorta: string;
  resumenVisual: string;
}

/**
 * Obtiene el estatus normalizado y la condición de instalación para Equipo de Cómputo.
 * Opciones oficiales: "Solicitado F56", "Se cuenta con equipo", "Instalado", "Pendiente"
 */
export function getJudicaturaComputoInfo(j: Partial<JudicaturaRecord>): ComponenteJudicaturaInfo {
  let status = j.estatusEquipoComputo;
  if (!status) {
    status = j.equipoComputo === 'Si' ? 'Se cuenta con equipo' : 'Pendiente';
  }

  let instalado: OpcionSiNo = j.equipoComputoInstalado || (status === 'Instalado' ? 'Si' : 'No');

  const tieneComponente =
    status === 'Se cuenta con equipo' ||
    status === 'Instalado' ||
    (j.equipoComputo === 'Si' && status !== 'Solicitado F56' && status !== 'Pendiente');

  return {
    status,
    instalado,
    tieneComponente,
    descripcionCorta: `${status} (Instalado: ${instalado})`,
    resumenVisual: status === 'Instalado'
      ? 'Instalado (Sí)'
      : status === 'Se cuenta con equipo'
      ? `Se cuenta con equipo (Instalado: ${instalado})`
      : `${status} (Instalado: ${instalado})`
  };
}

/**
 * Obtiene el estatus normalizado y la condición de instalación para Equipo de Audio.
 * Opciones oficiales: "Solicitado F56", "Se cuenta con equipo", "Instalado", "Pendiente"
 */
export function getJudicaturaAudioInfo(j: Partial<JudicaturaRecord>): ComponenteJudicaturaInfo {
  let status = j.estatusEquipoAudio;
  if (!status) {
    status = j.equipoAudio === 'Si' ? 'Se cuenta con equipo' : 'Pendiente';
  }

  let instalado: OpcionSiNo = j.equipoAudioInstalado || (status === 'Instalado' ? 'Si' : 'No');

  const tieneComponente =
    status === 'Se cuenta con equipo' ||
    status === 'Instalado' ||
    (j.equipoAudio === 'Si' && status !== 'Solicitado F56' && status !== 'Pendiente');

  return {
    status,
    instalado,
    tieneComponente,
    descripcionCorta: `${status} (Instalado: ${instalado})`,
    resumenVisual: status === 'Instalado'
      ? 'Instalado (Sí)'
      : status === 'Se cuenta con equipo'
      ? `Se cuenta con equipo (Instalado: ${instalado})`
      : `${status} (Instalado: ${instalado})`
  };
}

/**
 * Obtiene el estatus normalizado y la condición de instalación para Red / Cableado Estructurado.
 * Opciones oficiales: "Solicitud F56", "Instalando", "Terminado", "Pendiente"
 */
export function getJudicaturaRedInfo(j: Partial<JudicaturaRecord>): ComponenteJudicaturaInfo {
  let status = j.estatusCableadoEstructurado;
  if (!status) {
    status = j.cableadoEstructurado === 'Si' ? 'Terminado' : 'Pendiente';
  }

  let instalado: OpcionSiNo = j.cableadoEstructuradoInstalado || (status === 'Terminado' ? 'Si' : 'No');

  const tieneComponente =
    status === 'Terminado' ||
    status === 'Instalando' ||
    (j.cableadoEstructurado === 'Si' && status !== 'Solicitud F56' && status !== 'Pendiente');

  return {
    status,
    instalado,
    tieneComponente,
    descripcionCorta: `${status} (Instalado: ${instalado})`,
    resumenVisual: status === 'Terminado'
      ? 'Terminado (Instalado: Sí)'
      : `${status} (Instalado: ${instalado})`
  };
}

/**
 * Obtiene el estatus normalizado y la condición de instalación para Enlace de Datos.
 * Opciones oficiales: "Solicitado", "Instalado", "Equipo Satelital Temporal", "Pendiente"
 */
export function getJudicaturaEnlaceInfo(j: Partial<JudicaturaRecord>): ComponenteJudicaturaInfo {
  let status = j.estatusEnlaceDatos;
  if (!status) {
    status = j.enlaceDatos === 'Si' ? 'Instalado' : 'Pendiente';
  }

  let instalado: OpcionSiNo =
    j.enlaceDatosInstalado ||
    (status === 'Instalado' || status === 'Equipo Satelital Temporal' ? 'Si' : 'No');

  const tieneComponente =
    status === 'Instalado' ||
    status === 'Equipo Satelital Temporal' ||
    (j.enlaceDatos === 'Si' && status !== 'Solicitado' && status !== 'Pendiente');

  return {
    status,
    instalado,
    tieneComponente,
    descripcionCorta: `${status} (Instalado: ${instalado})`,
    resumenVisual: status === 'Instalado'
      ? 'Instalado (Sí)'
      : `${status} (Instalado: ${instalado})`
  };
}

/**
 * Obtiene las clases Tailwind estilizadas según el estatus específico del componente
 */
export function getComponentStatusBadgeClass(status: string): string {
  const s = (status || '').toLowerCase().trim();

  // Instalado / Terminado (Verde esmeralda)
  if (s === 'instalado' || s === 'terminado') {
    return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
  }

  // Se cuenta con equipo (Azul institucional)
  if (s.includes('cuenta con equipo')) {
    return 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
  }

  // Equipo Satelital Temporal (Violeta / Púrpura)
  if (s.includes('satelital')) {
    return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
  }

  // Solicitado / Solicitud F56 (Ámbar / Naranja)
  if (s.includes('solicit')) {
    return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
  }

  // Instalando / En proceso (Cian / Azul cielo)
  if (s.includes('instalando')) {
    return 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold';
  }

  // Pendiente / No solicitado (Gris / Slate)
  return 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
}

/**
 * Obtiene las clases para el indicador booleano de instalación física en sede
 */
export function getInstaladoBadgeClass(instalado: OpcionSiNo): string {
  if (instalado === 'Si') {
    return 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold';
  }
  return 'bg-amber-50 text-amber-800 border border-amber-300 font-semibold';
}

/**
 * Calcula métricas agregadas de componentes para una judicatura
 */
export function getJudicaturaComponentMetrics(j: Partial<JudicaturaRecord>) {
  const computo = getJudicaturaComputoInfo(j);
  const audio = getJudicaturaAudioInfo(j);
  const red = getJudicaturaRedInfo(j);
  const enlace = getJudicaturaEnlaceInfo(j);

  const disponiblesCount =
    (computo.tieneComponente ? 1 : 0) +
    (audio.tieneComponente ? 1 : 0) +
    (red.tieneComponente ? 1 : 0) +
    (enlace.tieneComponente ? 1 : 0);

  const instaladosCount =
    (computo.instalado === 'Si' ? 1 : 0) +
    (audio.instalado === 'Si' ? 1 : 0) +
    (red.instalado === 'Si' ? 1 : 0) +
    (enlace.instalado === 'Si' ? 1 : 0);

  return {
    computo,
    audio,
    red,
    enlace,
    disponiblesCount,
    instaladosCount,
    totalComponentes: 4,
    pctDisponibles: Math.round((disponiblesCount / 4) * 100),
    pctInstalados: Math.round((instaladosCount / 4) * 100),
    es100Disponibles: disponiblesCount === 4,
    es100Instalados: instaladosCount === 4
  };
}
