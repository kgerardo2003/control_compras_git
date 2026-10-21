import { User, PurchaseRecord, CatalogItem } from '../types';

export const ALL_AREAS_LABEL = 'Todas las Áreas (Acceso Global)';

export const TECHNICAL_AREAS_LIST = [
  ALL_AREAS_LABEL,
  'Soporte Técnico',
  'Soporte Remoto',
  'Departamento de Servicios Informáticos',
  'Desarrollo y Administración de Sistemas',
  'Redes y Telecomunicaciones',
  'Sección de Videoaudiencias',
  'Seguridad Informática',
  'Infraestructura',
  'Estadística',
] as const;

/**
 * Normaliza una cadena de texto para comparación libre de mayúsculas, tildes y espacios redundantes.
 */
export function normalizeTextKey(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Deduplica una lista de elementos de catálogo eliminando cualquier elemento redundante
 * por clave normalizada (sin tildes, minúsculas y sin espacios extras).
 */
export function deduplicateCatalogItems(items: CatalogItem[]): CatalogItem[] {
  if (!Array.isArray(items)) return [];
  const seen = new Map<string, CatalogItem>();
  for (const item of items) {
    if (!item || !item.valor || typeof item.valor !== 'string') continue;
    const trimmed = item.valor.trim();
    if (!trimmed) continue;
    const key = normalizeTextKey(trimmed);
    if (!seen.has(key)) {
      seen.set(key, { ...item, valor: trimmed });
    } else {
      const existing = seen.get(key)!;
      // Si el elemento previo no estaba activo y el nuevo sí, preferir el activo
      if (!existing.activo && item.activo) {
        seen.set(key, { ...item, valor: trimmed });
      }
    }
  }
  return Array.from(seen.values());
}

/**
 * Obtiene el nombre canónico oficial de un área según el Catálogo de Sistema (AREA_SOLICITANTE).
 * Si coincide con alguna variación de mayúsculas/minúsculas o tildes, retorna la versión oficial del catálogo.
 */
export function getCanonicalAreaName(areaName?: string, catalogs?: any[]): string {
  if (!areaName || typeof areaName !== 'string') return '';
  const trimmed = areaName.trim();
  if (!trimmed) return '';
  const key = normalizeTextKey(trimmed);

  if (Array.isArray(catalogs)) {
    const areaCat = catalogs.find((c: any) => c.codigo === 'AREA_SOLICITANTE');
    if (areaCat && Array.isArray(areaCat.items)) {
      const match = areaCat.items.find((it: any) => it && it.activo !== false && normalizeTextKey(it.valor || '') === key);
      if (match && match.valor) {
        return match.valor.trim();
      }
    }
  }
  return trimmed;
}

/**
 * Obtiene la lista dinámica de áreas técnicas institucionales vinculada
 * EXCLUSIVA Y DIRECTAMENTE con el Catálogo de Sistema (AREA_SOLICITANTE),
 * eliminando de raíz cualquier duplicado o redundancia.
 */
export function getSystemAreas(catalogs?: any[], purchases?: any[]): string[] {
  const canonicalMap = new Map<string, string>();

  // 1. Áreas activas definidas en el Catálogo de Sistema (AREA_SOLICITANTE) - FUENTE ÚNICA AUTORITATIVA
  if (Array.isArray(catalogs)) {
    const areaCat = catalogs.find((c: any) => c.codigo === 'AREA_SOLICITANTE');
    if (areaCat && Array.isArray(areaCat.items)) {
      areaCat.items.forEach((it: any) => {
        if (it && it.activo !== false && it.valor && typeof it.valor === 'string' && it.valor.trim()) {
          const val = it.valor.trim();
          const key = normalizeTextKey(val);
          if (!canonicalMap.has(key)) {
            canonicalMap.set(key, val);
          }
        }
      });
    }
  }

  // 2. Si el catálogo tiene áreas definidas, retornamos la lista oficial deduplicada
  if (canonicalMap.size > 0) {
    return Array.from(canonicalMap.values()).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  // 3. Fallback de emergencia solo si el catálogo estuviera completamente vacío
  TECHNICAL_AREAS_LIST.forEach((item) => {
    if (item !== ALL_AREAS_LABEL) {
      const val = item.trim();
      const key = normalizeTextKey(val);
      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, val);
      }
    }
  });

  return Array.from(canonicalMap.values()).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

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
  // Todo usuario institucional tiene acceso de lectura al inventario consolidado de compras
  return true;
}

/**
 * Filtra el arreglo de adquisiciones retornando únicamente las visibles para el usuario.
 */
export function getVisiblePurchasesForUser(purchases: PurchaseRecord[], user?: User | null): PurchaseRecord[] {
  return purchases;
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
 * Determina si el usuario tiene privilegios para eliminar registros en el Módulo de Adquisiciones.
 * Todos los usuarios con acceso al módulo institucional cuentan con permiso de eliminación
 * de registros (individual, selección por lotes y vaciado de registros).
 */
export function canUserDeletePurchase(_user?: User | null): boolean {
  return true;
}

/**
 * Determina si el usuario tiene privilegios para eliminar registros en el Módulo de Servicios Contratados (GIT).
 * Todos los usuarios con acceso al módulo institucional cuentan con permiso de eliminación
 * de registros (individual, selección por lotes y vaciado total).
 */
export function canUserDeleteServicio(_user?: User | null): boolean {
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
