import { User, PurchaseRecord } from '../types';

export const ALL_AREAS_LABEL = 'Todas las Áreas (Acceso Global)';

export const TECHNICAL_AREAS_LIST = [
  ALL_AREAS_LABEL,
  'Desarrollo y Administración de Sistemas',
  'Redes y Telecomunicaciones',
  'Soporte técnico',
  'Soporte Técnico Remoto',
  'Sección de Videoaudiencias',
  'Departamento de Servicios Informáticos',
  'Seguridad Informática'
] as const;

/**
 * Determina si el usuario posee privilegios de Administrador General
 */
export function isUserGlobalAdmin(user?: User | null): boolean {
  if (!user) return false;
  return user.rol === 'administrador' || user.perfilId === 'prof-admin';
}

/**
 * Obtiene el área asignada al usuario
 */
export function getUserAssignedArea(user?: User | null): string {
  if (!user) return '';
  if (isUserGlobalAdmin(user)) return ALL_AREAS_LABEL;
  return (user.area || user.departamento || '').trim();
}

/**
 * Evalúa si una adquisición o evento es visible para el usuario según su área asignada.
 * 
 * Regla de negocio:
 * - Los Administradores pueden ver absolutamente todos los eventos de todas las áreas.
 * - Los usuarios con área específica (ej. Desarrollo, Redes) ÚNICAMENTE pueden ver
 *   los eventos correspondientes a su área técnica.
 */
export function isPurchaseVisibleToUser(purchase: PurchaseRecord, user?: User | null): boolean {
  if (!user) return false;

  // 1. El Administrador General siempre tiene visibilidad global irrestricta
  if (isUserGlobalAdmin(user)) {
    return true;
  }

  // 2. Área configurada para el usuario
  const rawUserArea = (user.area || user.departamento || '').trim();
  
  // Si no tiene área definida o está configurado como global
  if (!rawUserArea) return true;

  const lowerUserArea = rawUserArea.toLowerCase();
  if (
    lowerUserArea.includes('todas las') || 
    lowerUserArea.includes('acceso global') || 
    lowerUserArea === 'todos' || 
    lowerUserArea === 'general'
  ) {
    return true;
  }

  const pArea = (purchase.areaSolicitante || '').toLowerCase().trim();
  const pDep = (purchase.dependenciaSolicitante || '').toLowerCase().trim();

  // Si la compra no tiene área ni dependencia asignada, un admin ya la ve, para el resto no corresponde
  if (!pArea && !pDep) {
    return false;
  }

  // 3. Coincidencia exacta o contenida directa
  if (pArea && (pArea === lowerUserArea || pArea.includes(lowerUserArea) || lowerUserArea.includes(pArea))) {
    return true;
  }
  if (pDep && (pDep === lowerUserArea || pDep.includes(lowerUserArea) || lowerUserArea.includes(pDep))) {
    return true;
  }

  // 4. Mapeo semántico de áreas institucionales de la Gerencia de Informática
  // Desarrollo y Sistemas
  if (lowerUserArea.includes('desarrollo') || lowerUserArea.includes('sistema')) {
    if (pArea.includes('desarrollo') || pArea.includes('sistema') || pDep.includes('desarrollo') || pDep.includes('sistema')) {
      return true;
    }
  }

  // Redes y Telecomunicaciones
  if (lowerUserArea.includes('red') || lowerUserArea.includes('telecom')) {
    if (pArea.includes('red') || pArea.includes('telecom') || pDep.includes('red') || pDep.includes('telecom')) {
      return true;
    }
  }

  // Soporte Técnico (presencial o remoto)
  if (lowerUserArea.includes('soporte')) {
    if (pArea.includes('soporte') || pDep.includes('soporte')) {
      return true;
    }
  }

  // Videoaudiencias
  if (lowerUserArea.includes('videoaudiencia') || lowerUserArea.includes('audiencia')) {
    if (pArea.includes('videoaudiencia') || pArea.includes('audiencia') || pDep.includes('videoaudiencia') || pDep.includes('audiencia')) {
      return true;
    }
  }

  // Seguridad Informática
  if (lowerUserArea.includes('seguridad')) {
    if (pArea.includes('seguridad') || pDep.includes('seguridad')) {
      return true;
    }
  }

  // Departamento de Servicios Informáticos
  if (lowerUserArea.includes('servicios inform')) {
    if (pArea.includes('servicios inform') || pDep.includes('servicios inform')) {
      return true;
    }
  }

  return false;
}

/**
 * Filtra el arreglo de adquisiciones retornando únicamente las visibles para el usuario.
 */
export function getVisiblePurchasesForUser(purchases: PurchaseRecord[], user?: User | null): PurchaseRecord[] {
  if (!user) return [];
  if (isUserGlobalAdmin(user)) return purchases;
  return purchases.filter(p => isPurchaseVisibleToUser(p, user));
}

/**
 * Determina si el usuario tiene permisos para editar la ficha de adquisición.
 * Permite que los operadores (usuario_estandar, operador_compras, operador) puedan actualizarla
 * siempre que pertenezca a su área autorizada (o cualquier adquisición si es administrador).
 * Los auditores o perfiles de solo consulta no pueden editar.
 */
export function canUserEditPurchase(user?: User | null, purchase?: PurchaseRecord | null): boolean {
  if (!user) return false;

  // 1. Roles de solo lectura / auditoría no pueden editar
  const role = (user.rol || '').toLowerCase();
  const profileId = (user.perfilId || '').toLowerCase();
  if (
    role === 'auditor' || 
    profileId === 'prof-auditor' || 
    profileId === 'prof-consulta' || 
    role === 'consulta_gerencial'
  ) {
    return false;
  }

  // 2. Administrador General tiene permiso irrestricto
  if (isUserGlobalAdmin(user)) {
    return true;
  }

  // 3. Si se especifica una compra en particular, validar que sea visible para el área del operador
  if (purchase) {
    return isPurchaseVisibleToUser(purchase, user);
  }

  // 4. Operadores y usuarios estándar tienen permiso general de edición
  return true;
}

/**
 * Normaliza un nombre de área para identificadores seguros y nombres de archivo
 */
export function normalizeAreaName(rawArea?: string | null): string {
  if (!rawArea) return '';
  return rawArea
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
