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
 * Evalúa si una adquisición o evento es visible para el usuario.
 * 
 * Regla de negocio institucional:
 * - Todas las adquisiciones y expedientes son compartidos y visibles para todo el personal 
 *   institucional autenticado (Administradores, Auditores, Operadores y Usuarios).
 * - Los filtros por área o estatus se aplican de forma dinámica en la interfaz de usuario.
 */
export function isPurchaseVisibleToUser(purchase: PurchaseRecord, user?: User | null): boolean {
  if (!user) return false;
  // Todo usuario institucional autenticado tiene acceso de lectura al inventario consolidado
  return true;
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
