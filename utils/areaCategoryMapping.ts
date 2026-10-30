/**
 * @license
 * Matriz de Coherencia Institucional: Áreas Técnicas y Categorías Tecnológicas
 * Gerencia de Informática - Organismo Judicial de Guatemala
 */

import { Catalog } from '../types';
import { normalizeTextKey } from './rbacUtils';

/**
 * Matriz de asociación oficial entre Áreas Solicitantes de TI y sus Categorías Tecnológicas coherentes.
 */
export const AREA_CATEGORY_RELATIONS: Record<string, string[]> = {
  'Soporte Técnico': [
    'Estaciones de Trabajo y Periféricos',
    'Impresoras y Escáneres de Alto Rendimiento',
    'UPS y Respaldo de Energía',
    'Partes y Repuestos de Cómputo',
    'Equipo de Cómputo para Juzgados'
  ],
  'Soporte Remoto': [
    'Estaciones de Trabajo y Periféricos',
    'Herramientas de Soporte Remoto y Helpdesk',
    'Licenciamiento y Software Judicial',
    'Periféricos y Accesorios de Usuario'
  ],
  'Sección de Videoaudiencias': [
    'Audio/Video para Salas de Audiencias',
    'Sistemas de Grabación Digital de Audiencias',
    'Cámaras PTZ y Microfonía Estenográfica',
    'Pantallas y Proyectores Institucionales',
    'Licencias de Plataformas de Videoconferencia'
  ],
  'Redes y Telecomunicaciones': [
    'Redes y Telecomunicaciones',
    'Switches y Enrutadores de Núcleo',
    'Cableado Estructurado y Fibra Óptica',
    'Enlaces Dedicados e Internet Institucional',
    'Telefonía IP y Comunicaciones Unificadas'
  ],
  'Desarrollo y Administración de Sistemas': [
    'Licenciamiento y Software Judicial',
    'Bases de Datos y Gestores Transaccionales',
    'Herramientas de Desarrollo y DevOps',
    'Sistemas de Gestión de Tribunales (SGT)',
    'Servidores de Aplicaciones'
  ],
  'Departamento de Servicios Informáticos': [
    'Servidores y Almacenamiento',
    'Centros de Datos y Blades',
    'Almacenamiento Masivo SAN/NAS',
    'Servicios Administrados de TI',
    'Mantenimiento de Servidores y Centros de Cómputo'
  ],
  'Seguridad Informática': [
    'Ciberseguridad y Perímetro',
    'Firewalls y Sistemas de Prevención de Intrusos (IPS)',
    'Antivirus, EDR y Protección Endpoint',
    'Gestión de Eventos e Información de Seguridad (SIEM)',
    'Certificados Digitales y Firma Electrónica'
  ],
  'Infraestructura': [
    'Servidores y Almacenamiento',
    'Centros de Datos y Blades',
    'Aire Acondicionado de Precisión para Centros de Cómputo',
    'Plantas Eléctricas y Tableros Eléctricos de TI',
    'Racks y Gabinetes de Telecomunicaciones'
  ],
  'Estadística': [
    'Licenciamiento y Software Judicial',
    'Herramientas de Inteligencia de Negocios y Analítica',
    'Estaciones de Trabajo y Periféricos'
  ]
};

/**
 * Catálogo base de categorías tecnológicas estándar
 */
export const ALL_STANDARD_CATEGORIES: string[] = [
  'Servidores y Almacenamiento',
  'Redes y Telecomunicaciones',
  'Ciberseguridad y Perímetro',
  'Estaciones de Trabajo y Periféricos',
  'Licenciamiento y Software Judicial',
  'Audio/Video para Salas de Audiencias',
  'Servicios Administrados de TI',
  'UPS y Respaldo de Energía',
  'Impresoras y Escáneres de Alto Rendimiento',
  'Telefonía IP y Comunicaciones Unificadas',
  'Herramientas de Soporte Remoto y Helpdesk',
  'Bases de Datos y Gestores Transaccionales',
  'Sistemas de Grabación Digital de Audiencias'
];

/**
 * Obtiene la lista clasificada de categorías según el área solicitante seleccionada:
 * - recomendadas: Coherentes específicamente con el área
 * - otras: Otras categorías del sistema disponibles
 */
export function getCategoriesForArea(areaName: string, catalogs?: Catalog[]): {
  recomendadas: string[];
  otras: string[];
  todas: string[];
} {
  const normArea = normalizeTextKey(areaName || '');

  // Buscar coincidencia en la matriz de relaciones
  let matchedCategories: string[] = [];
  for (const [keyArea, cats] of Object.entries(AREA_CATEGORY_RELATIONS)) {
    if (normalizeTextKey(keyArea) === normArea) {
      matchedCategories = cats;
      break;
    }
  }

  // Si no hay coincidencia exacta, buscar por contención de palabras clave
  if (matchedCategories.length === 0) {
    if (normArea.includes('soporte') && normArea.includes('remoto')) {
      matchedCategories = AREA_CATEGORY_RELATIONS['Soporte Remoto'];
    } else if (normArea.includes('soporte')) {
      matchedCategories = AREA_CATEGORY_RELATIONS['Soporte Técnico'];
    } else if (normArea.includes('video') || normArea.includes('audiencia')) {
      matchedCategories = AREA_CATEGORY_RELATIONS['Sección de Videoaudiencias'];
    } else if (normArea.includes('red') || normArea.includes('telecom')) {
      matchedCategories = AREA_CATEGORY_RELATIONS['Redes y Telecomunicaciones'];
    } else if (normArea.includes('desarrollo') || normArea.includes('sistema')) {
      matchedCategories = AREA_CATEGORY_RELATIONS['Desarrollo y Administración de Sistemas'];
    } else if (normArea.includes('seguridad') || normArea.includes('ciber')) {
      matchedCategories = AREA_CATEGORY_RELATIONS['Seguridad Informática'];
    } else if (normArea.includes('infraestructura')) {
      matchedCategories = AREA_CATEGORY_RELATIONS['Infraestructura'];
    } else if (normArea.includes('servicio') || normArea.includes('computo') || normArea.includes('datacenter')) {
      matchedCategories = AREA_CATEGORY_RELATIONS['Departamento de Servicios Informáticos'];
    } else {
      matchedCategories = ['Estaciones de Trabajo y Periféricos', 'Servidores y Almacenamiento', 'Licenciamiento y Software Judicial'];
    }
  }

  // Obtener categorías desde el catálogo global de sistema si existe
  const catalogCats = catalogs?.find(c => c.codigo === 'CATEGORIA_TECNOLOGICA')?.items
    .filter(it => it.activo)
    .map(it => it.valor.trim()) || [];

  // Unir catálogo global con estándar
  const allSet = new Set<string>([...ALL_STANDARD_CATEGORIES, ...catalogCats]);
  const todas = Array.from(allSet);

  // Separar en recomendadas y otras
  const recomendadasSet = new Set<string>();
  matchedCategories.forEach(cat => recomendadasSet.add(cat));

  const recomendadas = Array.from(recomendadasSet);
  const otras = todas.filter(c => !recomendadasSet.has(c));

  return { recomendadas, otras, todas };
}

/**
 * Devuelve la categoría tecnológica por defecto más coherente para un área solicitante.
 */
export function getSuggestedCategoryForArea(areaName: string): string {
  const { recomendadas, todas } = getCategoriesForArea(areaName);
  return recomendadas[0] || todas[0] || 'Estaciones de Trabajo y Periféricos';
}

/**
 * Verifica si una categoría tecnológica es coherente con el área solicitante
 */
export function isCategoryCoherentWithArea(areaName: string, categoryName: string): boolean {
  if (!areaName || !categoryName) return true;
  const { recomendadas } = getCategoriesForArea(areaName);
  const normCat = normalizeTextKey(categoryName);
  return recomendadas.some(r => normalizeTextKey(r) === normCat);
}
