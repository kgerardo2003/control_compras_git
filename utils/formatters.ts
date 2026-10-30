/**
 * Formateador de moneda en Quetzales de Guatemala (GTQ)
 */
export function formatQuetzales(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'Q. 0.00';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric).replace('GTQ', 'Q.').trim();
}

/**
 * Formateador de fechas a formato local de Guatemala (DD/MM/YYYY)
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    // Evitar desfase de zona horaria si solo viene YYYY-MM-DD
    if (dateString.length === 10 && dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formateador de fecha y hora completa para auditoría
 */
export function formatDateTime(dateTimeString: string | undefined | null): string {
  if (!dateTimeString) return '—';
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString;
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateTimeString;
  }
}

/**
 * Exportar arreglo de objetos a CSV
 */
export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    '\uFEFF' + // UTF-8 BOM para Excel
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Modalidad de compra oficial según la Ley de Contrataciones del Estado de Guatemala
 * según rangos de monto presupuestado / adjudicado:
 * - Hasta Q 25,000.00: "Baja Cuantía"
 * - De Q 25,000.01 hasta Q 90,000.00: "Compra Directa"
 * - Excede Q 90,000.00 hasta Q 900,000.00: "Cotización"
 * - Supera Q 900,000.00: "Licitación"
 */
export type ModalidadCompraLCE = 'Baja Cuantía' | 'Compra Directa' | 'Cotización' | 'Licitación' | 'Fondo Rotativo';

export interface ModalidadInfo {
  nombre: ModalidadCompraLCE;
  descripcionRango: string;
  badgeClass: string;
  badgeBorderClass: string;
  badgeDotColor: string;
  fundamentoLegal: string;
  limiteInferior: number;
  limiteSuperior?: number;
}

export function determineModalidadNameByMonto(monto: number | string | undefined | null): string {
  const num = typeof monto === 'string' ? parseFloat(monto) : Number(monto);
  if (isNaN(num) || num <= 0) return 'Baja Cuantía';
  if (num > 0.01 && num <= 25000) return 'Baja Cuantía';
  if (num > 25000 && num <= 90000) return 'Compra Directa';
  if (num > 90000 && num <= 900000) return 'Cotización';
  if (num > 900000) return 'Licitación';
  return 'Baja Cuantía';
}

export function getModalidadCompraByMonto(
  monto: number | string | undefined | null,
  explicitModalidad?: string
): ModalidadInfo {
  const norm = (explicitModalidad || '').trim().toLowerCase();

  // 1. Modalidad Fondo Rotativo
  if (norm.includes('rotativ') || norm.includes('fondo')) {
    return {
      nombre: 'Fondo Rotativo',
      descripcionRango: 'Gastos menores y urgentes institucional',
      badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
      badgeBorderClass: 'border-teal-300 bg-teal-50/70',
      badgeDotColor: 'bg-teal-500',
      fundamentoLegal: 'Normas y Régimen de Fondos Rotativos del Organismo Judicial',
      limiteInferior: 0,
      limiteSuperior: 25000,
    };
  }

  // 2. Modalidades explícitas
  if (norm.includes('licita')) {
    return {
      nombre: 'Licitación',
      descripcionRango: 'Supera los Q900,000.00',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
      badgeBorderClass: 'border-purple-300 bg-purple-50/70',
      badgeDotColor: 'bg-purple-500',
      fundamentoLegal: 'Art. 17 Ley de Contrataciones del Estado',
      limiteInferior: 900000.01,
    };
  }

  if (norm.includes('cotiza')) {
    return {
      nombre: 'Cotización',
      descripcionRango: 'Mayor de Q90,000.00 hasta Q900,000.00',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      badgeBorderClass: 'border-amber-300 bg-amber-50/70',
      badgeDotColor: 'bg-amber-500',
      fundamentoLegal: 'Art. 38 Ley de Contrataciones del Estado',
      limiteInferior: 90000.01,
      limiteSuperior: 900000,
    };
  }

  if (norm.includes('baja cuant')) {
    return {
      nombre: 'Baja Cuantía',
      descripcionRango: 'Mayor de Q0.01 y menor o igual a Q25,000.00',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      badgeBorderClass: 'border-emerald-300 bg-emerald-50/70',
      badgeDotColor: 'bg-emerald-500',
      fundamentoLegal: 'Art. 43 literal a) Ley de Contrataciones del Estado',
      limiteInferior: 0.01,
      limiteSuperior: 25000,
    };
  }

  if (norm.includes('directa')) {
    return {
      nombre: 'Compra Directa',
      descripcionRango: 'Mayor de Q25,000.00 y menor o igual a Q90,000.00',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
      badgeBorderClass: 'border-blue-300 bg-blue-50/70',
      badgeDotColor: 'bg-blue-500',
      fundamentoLegal: 'Art. 43 literal b) Ley de Contrataciones del Estado',
      limiteInferior: 25000.01,
      limiteSuperior: 90000,
    };
  }

  // 3. Determinación automática estricta según el monto LCE
  const num = typeof monto === 'string' ? parseFloat(monto) : Number(monto);
  
  if (!isNaN(num) && num > 0.01 && num <= 25000) {
    return {
      nombre: 'Baja Cuantía',
      descripcionRango: 'Mayor de Q0.01 y menor o igual a Q25,000.00',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      badgeBorderClass: 'border-emerald-300 bg-emerald-50/70',
      badgeDotColor: 'bg-emerald-500',
      fundamentoLegal: 'Art. 43 literal a) Ley de Contrataciones del Estado',
      limiteInferior: 0.01,
      limiteSuperior: 25000,
    };
  }

  if (!isNaN(num) && num > 25000 && num <= 90000) {
    return {
      nombre: 'Compra Directa',
      descripcionRango: 'Mayor de Q25,000.00 y menor o igual a Q90,000.00',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
      badgeBorderClass: 'border-blue-300 bg-blue-50/70',
      badgeDotColor: 'bg-blue-500',
      fundamentoLegal: 'Art. 43 literal b) Ley de Contrataciones del Estado',
      limiteInferior: 25000.01,
      limiteSuperior: 90000,
    };
  }

  if (!isNaN(num) && num > 90000 && num <= 900000) {
    return {
      nombre: 'Cotización',
      descripcionRango: 'Mayor de Q90,000.00 y menor o igual a Q900,000.00',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      badgeBorderClass: 'border-amber-300 bg-amber-50/70',
      badgeDotColor: 'bg-amber-500',
      fundamentoLegal: 'Art. 38 Ley de Contrataciones del Estado',
      limiteInferior: 90000.01,
      limiteSuperior: 900000,
    };
  }

  if (!isNaN(num) && num > 900000) {
    return {
      nombre: 'Licitación',
      descripcionRango: 'Mayor de Q900,000.00',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
      badgeBorderClass: 'border-purple-300 bg-purple-50/70',
      badgeDotColor: 'bg-purple-500',
      fundamentoLegal: 'Art. 17 Ley de Contrataciones del Estado',
      limiteInferior: 900000.01,
    };
  }

  // Por defecto si num <= 0.01 o no definido
  return {
    nombre: 'Baja Cuantía',
    descripcionRango: 'Mayor de Q0.01 y menor o igual a Q25,000.00',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    badgeBorderClass: 'border-emerald-300 bg-emerald-50/70',
    badgeDotColor: 'bg-emerald-500',
    fundamentoLegal: 'Art. 43 literal a) Ley de Contrataciones del Estado',
    limiteInferior: 0.01,
    limiteSuperior: 25000,
  };
}

/**
 * Formateador de tamaño de archivo (Bytes, KB, MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Normaliza valores de Forma 56 (F56-e y F56) para validación de unicidad.
 * Retorna string vacío para valores no representativos (vacíos, N/A, S/N, 0, etc.)
 */
export function normalizeForma56(val?: string | null): string {
  if (!val) return '';
  const clean = val.trim().toLowerCase();
  if (
    clean === '' ||
    clean === '0' ||
    clean === '-' ||
    clean === '--' ||
    clean === 'n/a' ||
    clean === 'na' ||
    clean === 's/n' ||
    clean === 'sn' ||
    clean === 'sin f56' ||
    clean === 'sin f56e' ||
    clean === 'sin f56-e'
  ) {
    return '';
  }
  return clean;
}

/**
 * Compara dos valores de Forma 56 para detectar si corresponden al mismo documento.
 * Reconoce coincidencias exactas, variaciones con ceros a la izquierda y formatos con año.
 */
export function isForma56Match(valA?: string | null, valB?: string | null): boolean {
  const normA = normalizeForma56(valA);
  const normB = normalizeForma56(valB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Si ambos son puramente numéricos: ej. "000123" y "123" o "000001" y "1"
  const digitsA = normA.replace(/\D/g, '');
  const digitsB = normB.replace(/\D/g, '');
  if (/^\d+$/.test(normA) && /^\d+$/.test(normB)) {
    if (digitsA && digitsB && parseInt(digitsA, 10) > 0 && parseInt(digitsA, 10) === parseInt(digitsB, 10)) {
      return true;
    }
  }

  // Si tienen formato con guión/año ej. "000012-2026" y "12-2026" o "000001-2026" y "1-2026"
  const partsA = normA.split(/[-/]/);
  const partsB = normB.split(/[-/]/);
  if (partsA.length === 2 && partsB.length === 2) {
    const numA = parseInt(partsA[0].replace(/\D/g, ''), 10);
    const numB = parseInt(partsB[0].replace(/\D/g, ''), 10);
    const yearA = partsA[1].trim();
    const yearB = partsB[1].trim();
    if (!isNaN(numA) && !isNaN(numB) && numA > 0 && numA === numB && yearA === yearB) {
      return true;
    }
  }

  return false;
}
