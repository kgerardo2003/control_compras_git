import React, { useState, useRef, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  FileText, 
  Check, 
  HelpCircle, 
  Info,
  Calendar,
  Building2,
  Trash2,
  ClipboardPaste,
  Sparkles,
  AlertTriangle,
  Edit3,
  CheckCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { PurchaseRecord, EvaluacionGIT } from '../types';
import { formatQuetzales } from '../utils/formatters';

interface ParsedRow {
  index: number;
  data: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface SheetInfo {
  name: string;
  rowCount: number;
  score: number;
}

export const ImportExcelModal: React.FC = () => {
  const { isImportModalOpen, setIsImportModalOpen, importPurchases, catalogs, showToast, purchases } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [detectedHeaderRow, setDetectedHeaderRow] = useState<number>(0);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'preview'>('upload');
  const [pasteText, setPasteText] = useState<string>('');
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

  if (!isImportModalOpen) return null;

  // Catálogos
  const estatusOptions = catalogs.find(c => c.codigo === 'ESTATUS_EVENTO')?.items.map(i => i.nombre) || [
    'Evaluación',
    'Adjudicación',
    'Prescindido',
    'Desierto'
  ];

  // Helper para normalizar cabeceras eliminando acentos, espacios y símbolos
  const cleanHeader = (h: any): string => {
    if (!h) return '';
    return String(h)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Helper para verificar si un valor representa "N/A" o vacío
  const isValueEmptyOrNA = (val: any): boolean => {
    if (val === null || val === undefined) return true;
    const str = String(val).trim().toLowerCase();
    return str === '' || str === 'n/a' || str === 'na' || str === 'none' || str === 'ninguno' || str === '-' || str === '--' || str === 'no aplica' || str === 'null' || str === 'undefined';
  };

  // Helper para normalizar fechas desde Excel (números de serie, textos DD/MM/YYYY, YYYY-MM-DD, con horas o nombres de meses)
  const normalizeExcelDate = (val: any, fallback?: string): string | undefined => {
    if (isValueEmptyOrNA(val)) return fallback;

    // Número de serie de Excel (días desde 1900-01-01)
    if (typeof val === 'number') {
      try {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 10);
        }
      } catch {
        // fallback
      }
    }

    const str = String(val).trim();
    if (!str || isValueEmptyOrNA(str)) return fallback;

    // Formato YYYY-MM-DD o YYYY/MM/DD (puede incluir hora al final)
    const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (ymd) {
      const year = ymd[1];
      const month = ymd[2].padStart(2, '0');
      const day = ymd[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Formato DD/MM/YYYY o DD-MM-YYYY (puede incluir hora)
    const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // Formato DD/MM/YY (año de 2 dígitos)
    const dmyShort = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
    if (dmyShort) {
      const day = dmyShort[1].padStart(2, '0');
      const month = dmyShort[2].padStart(2, '0');
      const year = `20${dmyShort[3]}`;
      return `${year}-${month}-${day}`;
    }

    // Nombres de meses en español (ej. "23-sep-2026", "23 de septiembre de 2026")
    const meses: { [k: string]: string } = {
      ene: '01', enero: '01', feb: '02', febrero: '02', mar: '03', marzo: '03',
      abr: '04', abril: '04', may: '05', mayo: '05', jun: '06', junio: '06',
      jul: '07', julio: '07', ago: '08', agosto: '08', sep: '09', sept: '09', septiembre: '09',
      oct: '10', octubre: '10', nov: '11', noviembre: '11', dic: '12', diciembre: '12'
    };
    const spanishDate = str.toLowerCase().match(/(\d{1,2})[ \/-]+([a-z]+)[ \/-]+(\d{2,4})/);
    if (spanishDate) {
      const day = spanishDate[1].padStart(2, '0');
      const monthKey = spanishDate[2].slice(0, 3);
      const month = meses[monthKey] || meses[spanishDate[2]];
      let year = spanishDate[3];
      if (year.length === 2) year = `20${year}`;
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }

    // Intento nativo con objeto Date
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1990 && parsedDate.getFullYear() < 2100) {
      return parsedDate.toISOString().slice(0, 10);
    }

    return fallback;
  };

  // Helper para normalizar montos (admite notación en Quetzales, formatos 90,000.00 y 90.000,00)
  const normalizeAmount = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, val);
    if (isValueEmptyOrNA(val)) return 0;

    let s = String(val).trim().replace(/[Qq$]/g, '').trim();

    // Si tiene comas y puntos (ej. 90,000.50 o 90.000,50)
    if (s.includes(',') && s.includes('.')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        // Notación europea/latina: 90.000,50 -> 90000.50
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        // Notación estándar: 90,000.50 -> 90000.50
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',')) {
      // Si sólo tiene coma: puede ser 90,000 o 90,50
      const parts = s.split(',');
      if (parts.length === 2 && parts[1].length === 2) {
        // Decimal: 90,50 -> 90.50
        s = s.replace(',', '.');
      } else {
        // Miles: 90,000 -> 90000
        s = s.replace(/,/g, '');
      }
    }

    const clean = s.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.max(0, num);
  };

  // Detecta la fila de encabezados analizando las primeras 35 filas de la hoja
  const detectHeaderRow = (matrix: any[][]): { headerIndex: number; headers: string[] } => {
    const TARGET_KEYWORDS = [
      'nog', 'f56', 'descripcion', 'área', 'area', 'solicitud', 'vobo', 'autorizado',
      'publicacion', 'publicación', 'ofertas', 'oferta', 'monto', 'evaluado', 'dictamen',
      'oficio', 'estatus', 'adjudicacion', 'adjudicación', 'proveedor', 'categoria',
      'categoría', 'dependencia', 'modalidad'
    ];

    let bestRowIdx = 0;
    let maxMatches = -1;

    const maxRowsToScan = Math.min(matrix.length, 35);
    for (let r = 0; r < maxRowsToScan; r++) {
      const row = matrix[r];
      if (!row || !Array.isArray(row)) continue;

      let score = 0;
      for (const cell of row) {
        if (!cell) continue;
        const cellClean = cleanHeader(cell);
        if (!cellClean) continue;
        if (TARGET_KEYWORDS.some(kw => cellClean.includes(kw))) {
          score++;
        }
      }

      if (score > maxMatches) {
        maxMatches = score;
        bestRowIdx = r;
      }
    }

    // Si se encontraron al menos 2 coincidencias de encabezado, usar esa fila
    const headerRow = matrix[bestRowIdx] || [];
    const headers = headerRow.map((cell: any) => String(cell || '').trim());
    return { headerIndex: bestRowIdx, headers };
  };

  // Procesa una fila cruda mapeándola al esquema de PurchaseRecord
  const parseSingleRow = (
    rawRow: Record<string, any>, 
    idx: number, 
    allNogs: Set<string>
  ): ParsedRow => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Helper flexible para buscar valores en las columnas
    const getVal = (candidates: string[]): any => {
      const keys = Object.keys(rawRow);
      // 1. Coincidencia exacta
      for (const cand of candidates) {
        const candClean = cleanHeader(cand);
        for (const key of keys) {
          if (cleanHeader(key) === candClean) {
            return rawRow[key];
          }
        }
      }
      // 2. Coincidencia por contención (evitando falsos positivos)
      for (const cand of candidates) {
        const candClean = cleanHeader(cand);
        if (candClean.length < 4) continue; // Evitar fragmentos demasiado cortos como "git"
        for (const key of keys) {
          const keyClean = cleanHeader(key);
          if (keyClean.includes(candClean) || candClean.includes(keyClean)) {
            return rawRow[key];
          }
        }
      }
      return '';
    };

    // Monto (GTQ) preliminar para inferir modalidad
    const rawMonto = getVal([
      'monto (gtq)', 
      'monto gtq', 
      'monto', 
      'presupuesto / monto (gtq)', 
      'presupuesto / monto (q)', 
      'presupuesto', 
      'total', 
      'precio', 
      'monto quetzales', 
      'valor', 
      'presupuesto estimado', 
      'monto adjudicado',
      'monto de compra',
      'monto contratado'
    ]);
    const monto = normalizeAmount(rawMonto);

    // Modalidad de Compra
    const rawMod = String(getVal(['modalidad de compra', 'modalidad compra', 'modalidad', 'tipo de compra', 'tipo compra', 'procedimiento'])).trim();
    let modalidadCompra = !isValueEmptyOrNA(rawMod) ? rawMod : '';
    if (!modalidadCompra) {
      if (monto > 900000) modalidadCompra = 'Licitación';
      else if (monto > 90000) modalidadCompra = 'Cotización';
      else modalidadCompra = 'Compra Directa';
    } else {
      const modLower = modalidadCompra.toLowerCase();
      if (modLower.includes('directa')) modalidadCompra = 'Compra Directa';
      else if (modLower.includes('cotiza')) modalidadCompra = 'Cotización';
      else if (modLower.includes('licita')) modalidadCompra = 'Licitación';
      else if (modLower.includes('baja cuant')) modalidadCompra = 'Baja Cuantía';
    }

    const isBajaCuantiaRow = modalidadCompra.toLowerCase().includes('baja cuant');

    // 1. NOG (Número de Operación Guatecompras)
    // Reglas:
    // - Validar que el número de NOG no exista ya; si existe: "NOG Registrado o ya Existe".
    // - El NOG no es obligatorio para eventos como Baja Cuantía.
    // - Para Compra Directa, Cotización y Licitación es obligatorio pero permite ingresar valores cero (0).
    const rawNog = String(getVal([
      'nog', 
      'numero nog', 
      'número nog', 
      'operacion nog', 
      'no nog', 
      'no. nog', 
      'no. de nog', 
      'evento nog', 
      'evento', 
      'concurso', 
      'id nog',
      'código nog'
    ])).trim();

    let nog = '';
    const cleanDigits = rawNog.replace(/\D/g, '');
    const isZeroNog = rawNog === '0' || cleanDigits === '0' || /^0+$/.test(cleanDigits);

    if (isZeroNog) {
      nog = '0';
    } else if (cleanDigits.length > 0) {
      nog = cleanDigits;
    } else if (isValueEmptyOrNA(rawNog)) {
      if (isBajaCuantiaRow) {
        nog = '0'; // Opcional en Baja Cuantía
      } else {
        // En Compra Directa, Cotización y Licitación es obligatorio pero permite 0 si no se cuenta con este dato
        nog = '0';
        warnings.push('NOG no especificado; asignado 0 (permitido provisionalmente).');
      }
    } else {
      nog = '0';
      warnings.push(`Valor NOG "${rawNog}" no numérico; asignado 0 permitido.`);
    }

    // Validación de Unicidad si es un NOG real (no 0, no vacío)
    if (nog !== '0' && nog !== '') {
      const existsInSystem = (purchases || []).some(p => {
        const pNog = (p.nog || '').trim().replace(/\D/g, '');
        return pNog && pNog !== '0' && pNog === nog;
      });

      const duplicateInBatch = allNogs.has(nog);

      if (existsInSystem || duplicateInBatch) {
        errors.push('NOG Registrado o ya Existe');
      }
      allNogs.add(nog);
    }

    // 2. F56-e (Forma F56 electrónica)
    const rawF56e = String(getVal([
      'f56e', 
      'f56-e', 
      'forma f56e', 
      'forma f-56e', 
      'formulario f56e', 
      'formulario f-56e', 
      'f-56e', 
      'f56 e', 
      'no. f56-e',
      'no f56e'
    ])).trim();
    let f56e = !isValueEmptyOrNA(rawF56e) ? rawF56e.slice(0, 15) : `0000${idx + 1}-2026`;

    // 3. F56 (Físico)
    const rawF56 = String(getVal([
      'f56', 
      'f-56', 
      'formulario f56', 
      'f56 fisico', 
      'f56 físico', 
      'f56 original', 
      'forma f56', 
      'f 56', 
      'no. f56'
    ])).trim();
    const f56 = !isValueEmptyOrNA(rawF56) ? rawF56.slice(0, 10) : undefined;

    // 4. Descripción
    const rawDesc = String(getVal([
      'descripcion', 
      'descripción', 
      'objeto', 
      'bien o servicio', 
      'detalle', 
      'requerimiento', 
      'nombre evento', 
      'concepto', 
      'descripcion del requerimiento',
      'descripcion del bien o servicio',
      'descripcion de la compra'
    ])).trim();

    let descripcion = rawDesc;
    if (!descripcion || isValueEmptyOrNA(descripcion)) {
      descripcion = `Adquisición institucional programada #${idx + 1}`;
      warnings.push('Descripción vacía; se asignó texto descriptivo predeterminado.');
    } else if (descripcion.length > 200) {
      descripcion = descripcion.slice(0, 200);
      warnings.push('Descripción recortada a 200 caracteres.');
    }

    // 5. Área Solicitante
    const rawArea = String(getVal([
      'area solicitante', 
      'área solicitante', 
      'area', 
      'área', 
      'unidad solicitante', 
      'seccion', 
      'sección', 
      'departamento', 
      'unidad',
      'departamento solicitante'
    ])).trim();
    const areaSolicitante = !isValueEmptyOrNA(rawArea) ? rawArea : 'Soporte técnico';

    // 6. Dependencia Solicitante
    const rawDep = String(getVal([
      'dependencia solicitante', 
      'dependencia', 
      'subgerencia', 
      'direccion', 
      'dirección', 
      'gerencia', 
      'unidad ejecutora'
    ])).trim();
    const dependenciaSolicitante = !isValueEmptyOrNA(rawDep) ? rawDep : 'Subgerencia de Infraestructura GIT';

    // 7. Categoría Tecnológica
    const rawCat = String(getVal([
      'categoria tecnologica', 
      'categoría tecnológica', 
      'categoria', 
      'categoría', 
      'rubro tecnologico', 
      'rubro tecnológico', 
      'tipo tecnologia'
    ])).trim();
    const categoriaTecnologica = !isValueEmptyOrNA(rawCat) ? rawCat : 'Servidores y Almacenamiento';

    // 8. Fechas de Gestión (Solicitud, Vo.Bo., Autorización)
    const today = new Date().toISOString().slice(0, 10);
    const rawFechaSol = getVal(['fecha solicitud', 'fecha de solicitud', 'solicitud', 'fecha f56e', 'fecha f-56e']);
    const fechaSolicitud = normalizeExcelDate(rawFechaSol, today) || today;

    const rawFechaVoBo = getVal(['fecha vobo', 'fecha vo.bo.', 'fecha vo bo', 'vobo', 'vo.bo.', 'vo bo', 'fecha visto bueno']);
    const fechaVoBo = normalizeExcelDate(rawFechaVoBo, fechaSolicitud) || fechaSolicitud;

    const rawFechaAut = getVal(['fecha autorizado', 'fecha autorizacion', 'fecha autorización', 'autorizado', 'autorizacion', 'fecha autorizo']);
    const fechaAutorizado = normalizeExcelDate(rawFechaAut, fechaVoBo) || fechaVoBo;

    // 9. Fechas de Concurso (Publicación y Cierre de Ofertas)
    const rawFechaPub = getVal(['fecha publicacion', 'fecha publicación', 'publicacion', 'publicación', 'fecha de publicacion', 'fecha concurso']);
    const fechaPublicacion = normalizeExcelDate(rawFechaPub, fechaAutorizado) || today;

    const rawFechaOfertas = getVal(['fecha cierre ofertas', 'fecha cierre', 'cierre ofertas', 'fecha recepcion ofertas', 'fecha recepción ofertas', 'cierre de ofertas', 'cierre', 'limite ofertas']);
    const fechaOfertas = normalizeExcelDate(rawFechaOfertas, fechaPublicacion) || today;

    // 12. Cantidad de Ofertas
    const rawOfertas = getVal(['cantidad de ofertas', 'cantidad ofertas', 'no ofertas', 'no. ofertas', 'ofertas', 'postores', 'ofertas recibidas', 'numero ofertas', 'número ofertas']);
    const cantidadOfertas = isValueEmptyOrNA(rawOfertas) ? 0 : Math.max(0, parseInt(String(rawOfertas).replace(/\D/g, ''), 10) || 0);

    // 13. Evaluado por Área Técnica / GIT
    // Buscar primero el encabezado específico para evitar capturar "Fecha Dictamen Técnico"
    const rawGitVal = String(getVal([
      'evaluado por el area tecnica correspondiente',
      'evaluado por el área técnica correspondiente',
      'evaluado por el area tecnica',
      'evaluado por el área técnica',
      'evaluado por la git',
      'evaluado git',
      'evaluacion git',
      'evaluación git',
      'evaluado tecnica',
      'evaluado técnica',
      'evaluado'
    ])).trim().toLowerCase();

    let evaluadoGIT: EvaluacionGIT = 'No';
    if (rawGitVal === 'si' || rawGitVal === 'sí' || rawGitVal === 'true' || rawGitVal === '1' || rawGitVal.includes('si') || rawGitVal.includes('sí')) {
      evaluadoGIT = 'Sí';
    } else if (rawGitVal === 'no' || rawGitVal === 'false' || rawGitVal === '0') {
      evaluadoGIT = 'No';
    }

    // 14. Fecha Dictamen Técnico
    const rawDictDate = getVal(['fecha dictamen tecnico', 'fecha dictamen técnico', 'fecha de dictamen tecnico', 'fecha dictamen git', 'fecha dictamen', 'fecha de dictamen']);
    const fechaDictamenGIT = normalizeExcelDate(rawDictDate);
    if (fechaDictamenGIT && evaluadoGIT === 'No') {
      // Si tiene fecha de dictamen válida, asumimos que fue evaluado
      evaluadoGIT = 'Sí';
    }

    // 15. Fecha Oficio GIT
    const rawOficioDate = getVal(['fecha oficio git', 'fecha de oficio git', 'fecha elaboracion oficio git', 'fecha elaboración oficio git', 'oficio git', 'fecha oficio']);
    const fechaElaboracionOficioGIT = normalizeExcelDate(rawOficioDate);

    // 16. Estatus del Evento
    const rawEstatus = String(getVal(['estatus del evento', 'estatus de evento', 'estatus evento', 'estatus', 'estado del evento', 'estado evento', 'estado', 'situacion', 'situación', 'etapa', 'fase'])).trim().toLowerCase();
    let estatusEvento = 'Evaluación';
    if (rawEstatus.includes('adjudic')) {
      estatusEvento = 'Adjudicación';
    } else if (rawEstatus.includes('prescind')) {
      estatusEvento = 'Prescindido';
    } else if (rawEstatus.includes('desiert')) {
      estatusEvento = 'Desierto';
    } else if (rawEstatus.includes('vigente')) {
      estatusEvento = 'Vigente';
    } else if (rawEstatus.includes('evalua')) {
      estatusEvento = 'Evaluación';
    } else if (rawEstatus.length > 0 && !isValueEmptyOrNA(rawEstatus)) {
      estatusEvento = rawEstatus.charAt(0).toUpperCase() + rawEstatus.slice(1);
    }

    // 17. Proveedor y Fecha de Adjudicación
    let fechaAdjudicacion: string | undefined = undefined;
    let proveedorAdjudicado: string | undefined = undefined;
    const rawProv = String(getVal(['proveedor adjudicado', 'proveedor', 'empresa adjudicada', 'empresa', 'adjudicatario', 'contratista', 'ganador'])).trim();
    const rawFechaAdj = getVal(['fecha de adjudicacion', 'fecha de adjudicación', 'fecha adjudicacion', 'fecha adjudicación', 'adjudicacion fecha']);

    if (!isValueEmptyOrNA(rawProv)) {
      proveedorAdjudicado = rawProv;
    }
    if (!isValueEmptyOrNA(rawFechaAdj)) {
      fechaAdjudicacion = normalizeExcelDate(rawFechaAdj);
    }

    if (estatusEvento === 'Adjudicación') {
      if (!fechaAdjudicacion) fechaAdjudicacion = fechaOfertas;
      if (!proveedorAdjudicado) proveedorAdjudicado = 'Proveedor Adjudicado';
    }

    // 18. Observaciones
    const rawObs = String(getVal(['observaciones', 'observacion', 'observación', 'notas', 'comentarios', 'detalle adicional', 'nota'])).trim();
    const observaciones = !isValueEmptyOrNA(rawObs) ? rawObs : undefined;

    const purchaseData: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'> = {
      nog,
      f56e,
      f56,
      descripcion,
      areaSolicitante,
      dependenciaSolicitante,
      categoriaTecnologica,
      modalidadCompra,
      fechaSolicitud,
      fechaVoBo,
      fechaAutorizado,
      fechaPublicacion,
      fechaOfertas,
      monto,
      cantidadOfertas,
      evaluadoGIT,
      fechaDictamenGIT,
      fechaElaboracionOficioGIT,
      estatusEvento,
      fechaAdjudicacion,
      proveedorAdjudicado,
      observaciones,
    };

    return {
      index: idx + 1,
      data: purchaseData,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  // Parsea una matriz 2D (desde hoja de Excel o texto pegado)
  const processMatrix = (matrix: any[][], sourceName: string) => {
    if (!matrix || matrix.length === 0) {
      throw new Error('El documento no contiene ninguna fila con datos.');
    }

    // 1. Detectar encabezado
    const { headerIndex, headers } = detectHeaderRow(matrix);
    setDetectedHeaderRow(headerIndex + 1);

    // 2. Extraer filas de datos posteriores al encabezado
    const rawDataRows: Record<string, any>[] = [];
    for (let r = headerIndex + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || !Array.isArray(row)) continue;

      // Descartar filas completamente vacías
      const isAllEmpty = row.every(c => c === null || c === undefined || String(c).trim() === '');
      if (isAllEmpty) continue;

      const obj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        const headerKey = h || `col_${colIdx + 1}`;
        obj[headerKey] = row[colIdx] !== undefined ? row[colIdx] : '';
      });
      rawDataRows.push(obj);
    }

    if (rawDataRows.length === 0) {
      throw new Error(`No se detectaron filas de datos válidas debajo de los encabezados (fila ${headerIndex + 1}).`);
    }

    const allNogs = new Set<string>();
    const rows = rawDataRows.map((rawRow, idx) => parseSingleRow(rawRow, idx, allNogs));

    setParsedRows(rows);
    setActiveTab('preview');
  };

  // Carga y procesa un libro de Excel
  const processWorkbook = (wb: XLSX.WorkBook, preferredSheet?: string) => {
    setWorkbook(wb);
    const sheets = wb.SheetNames;
    setSheetNames(sheets);

    if (sheets.length === 0) {
      throw new Error('El archivo no contiene ninguna hoja de cálculo.');
    }

    // Elegir la mejor hoja evaluando coincidencias de columnas
    let targetSheet = preferredSheet || sheets[0];
    if (!preferredSheet && sheets.length > 1) {
      let maxScore = -1;
      sheets.forEach(sName => {
        const ws = wb.Sheets[sName];
        if (!ws) return;
        const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        const { headerIndex } = detectHeaderRow(matrix);
        const rowCount = matrix.length - headerIndex - 1;
        if (rowCount > 0 && rowCount > maxScore) {
          maxScore = rowCount;
          targetSheet = sName;
        }
      });
    }

    setSelectedSheet(targetSheet);
    const worksheet = wb.Sheets[targetSheet];
    if (!worksheet) {
      throw new Error(`La hoja "${targetSheet}" no pudo ser leída.`);
    }

    const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
    processMatrix(matrix, targetSheet);
  };

  // Manejador de archivo subido
  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setGlobalError(null);

    try {
      const data = await uploadedFile.arrayBuffer();
      // Opciones para lectura robusta: soporta UTF-8, fechas, celdas crudas
      const wb = XLSX.read(data, { 
        type: 'array', 
        cellDates: true, 
        raw: true,
        codepage: 65001 
      });

      processWorkbook(wb);
    } catch (err: any) {
      console.error('Error procesando archivo:', err);
      setGlobalError(err.message || 'Error al procesar el archivo. Verifique que sea un documento válido de Excel (.xlsx, .xls) o CSV.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejador de cambio de hoja seleccionada
  const handleSheetChange = (newSheetName: string) => {
    if (!workbook) return;
    setSelectedSheet(newSheetName);
    setIsProcessing(true);
    try {
      const ws = workbook.Sheets[newSheetName];
      if (ws) {
        const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        processMatrix(matrix, newSheetName);
      }
    } catch (err: any) {
      setGlobalError(`Error al procesar la hoja "${newSheetName}": ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Procesa datos pegados directamente desde el portapapeles (Ctrl+V)
  const handleProcessPastedText = () => {
    if (!pasteText.trim()) {
      setGlobalError('Por favor pega el contenido copiado desde Excel antes de continuar.');
      return;
    }

    setIsProcessing(true);
    setGlobalError(null);
    try {
      // Dividir en líneas
      const lines = pasteText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        throw new Error('El texto pegado no contiene filas.');
      }

      // Detectar separador predominante (\t tabulador de Excel, ';' punto y coma, o ',' coma)
      const firstLine = lines[0];
      let sep = '\t';
      if ((firstLine.match(/\t/g) || []).length >= 2) {
        sep = '\t';
      } else if ((firstLine.match(/;/g) || []).length >= 2) {
        sep = ';';
      } else if ((firstLine.match(/,/g) || []).length >= 2) {
        sep = ',';
      }

      const matrix = lines.map(line => line.split(sep).map(col => col.trim().replace(/^["']|["']$/g, '')));
      processMatrix(matrix, 'Portapapeles');
    } catch (err: any) {
      setGlobalError(`Error al analizar texto pegado: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Descarga la plantilla oficial en formato .xlsx con las 20 columnas completas
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'NOG': '32043597',
        'F56-e': '0377242026',
        'F56': '005695',
        'Área Solicitante': 'Departamento de Servicios Informáticos',
        'Descripción': 'LICENCIA DE ENVÍO MASIVO DE CORREOS',
        'Fecha Solicitud': '2026-09-04',
        'Fecha Vo.Bo.': '2026-09-07',
        'Fecha Autorizado': '2026-09-08',
        'Fecha Publicación': '2026-09-23',
        'Fecha Cierre Ofertas': '2026-09-25',
        'Fecha Dictamen Técnico': 'N/A',
        'Fecha Oficio GIT': 'N/A',
        'Cantidad de Ofertas': 0,
        'Monto (GTQ)': 90000.00,
        'Evaluado por el Área Técnica Correspondiente': 'No',
        'Estatus del Evento': 'Evaluación',
        'Categoría Tecnológica': 'Servidores y Almacenamiento',
        'Dependencia Solicitante': 'Subgerencia de Infraestructura GIT',
        'Modalidad de Compra': 'Compra Directa',
        'Proveedor Adjudicado': 'N/A',
        'Observaciones': 'Adquisición institucional prioritaria para mensajería y notificaciones OJ.'
      },
      {
        'NOG': '32034482',
        'F56-e': '0371942026',
        'F56': '005701',
        'Área Solicitante': 'Desarrollo y Administración de Sistemas',
        'Descripción': 'LICENCIA PARA LA GESTIÓN DE PROYECTOS Y SEGUIMIENTO DE INCIDENCIAS',
        'Fecha Solicitud': '2026-08-31',
        'Fecha Vo.Bo.': '2026-09-06',
        'Fecha Autorizado': '2026-09-07',
        'Fecha Publicación': '2026-09-22',
        'Fecha Cierre Ofertas': '2026-09-24',
        'Fecha Dictamen Técnico': 'N/A',
        'Fecha Oficio GIT': 'N/A',
        'Cantidad de Ofertas': 0,
        'Monto (GTQ)': 90000.00,
        'Evaluado por el Área Técnica Correspondiente': 'No',
        'Estatus del Evento': 'Evaluación',
        'Categoría Tecnológica': 'Servidores y Almacenamiento',
        'Dependencia Solicitante': 'Subgerencia de Infraestructura GIT',
        'Modalidad de Compra': 'Compra Directa',
        'Proveedor Adjudicado': 'N/A',
        'Observaciones': 'Plataforma para gestión de tickets y sprints informáticos.'
      },
      {
        'NOG': '31670075',
        'F56-e': '0342422026',
        'F56': '005120',
        'Área Solicitante': 'Soporte Técnico',
        'Descripción': 'Computadora Portátil (Laptop) para Funcionarios Judiciales',
        'Fecha Solicitud': '2026-08-05',
        'Fecha Vo.Bo.': '2026-08-06',
        'Fecha Autorizado': '2026-08-06',
        'Fecha Publicación': '2026-08-25',
        'Fecha Cierre Ofertas': '2026-09-02',
        'Fecha Dictamen Técnico': '2026-09-05',
        'Fecha Oficio GIT': '2026-09-08',
        'Cantidad de Ofertas': 3,
        'Monto (GTQ)': 35000.00,
        'Evaluado por el Área Técnica Correspondiente': 'Sí',
        'Estatus del Evento': 'Adjudicación',
        'Categoría Tecnológica': 'Equipo Informático',
        'Dependencia Solicitante': 'Subgerencia de Infraestructura GIT',
        'Modalidad de Compra': 'Compra Directa',
        'Proveedor Adjudicado': 'Sistemas y Equipos Digitales de Guatemala, S.A.',
        'Observaciones': 'Equipos portátiles para juzgados móviles.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const colWidths = [
      { wch: 12 }, // NOG
      { wch: 14 }, // F56-e
      { wch: 10 }, // F56
      { wch: 32 }, // Área Solicitante
      { wch: 45 }, // Descripción
      { wch: 15 }, // Fecha Solicitud
      { wch: 15 }, // Fecha Vo.Bo.
      { wch: 15 }, // Fecha Autorizado
      { wch: 16 }, // Fecha Publicación
      { wch: 16 }, // Fecha Cierre Ofertas
      { wch: 18 }, // Fecha Dictamen Técnico
      { wch: 16 }, // Fecha Oficio GIT
      { wch: 16 }, // Cantidad de Ofertas
      { wch: 16 }, // Monto (GTQ)
      { wch: 36 }, // Evaluado Área Técnica
      { wch: 18 }, // Estatus del Evento
      { wch: 28 }, // Categoría Tecnológica
      { wch: 32 }, // Dependencia Solicitante
      { wch: 20 }, // Modalidad de Compra
      { wch: 36 }, // Proveedor Adjudicado
      { wch: 35 }, // Observaciones
    ];
    worksheet['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Compras_Eventos_OJ');
    XLSX.writeFile(wb, 'Plantilla_Oficial_Compras_Eventos_OJ.xlsx');
  };

  const handleRemoveRow = (index: number) => {
    setParsedRows(prev => prev.filter(r => r.index !== index));
  };

  // Auto-repara los registros con advertencias o errores (resuelve duplicados asignando valor 0 permitido)
  const handleAutoRepair = () => {
    setParsedRows(prev => prev.map((row, idx) => {
      const updatedData = { ...row.data };
      const currentErrors = [...row.errors];
      let repaired = false;

      // Si tiene error de NOG duplicado o ausente, asignar 0 (valor permitido cuando no se cuenta con este dato)
      if (currentErrors.includes('NOG Registrado o ya Existe') || !updatedData.nog || updatedData.nog.trim() === '') {
        updatedData.nog = '0';
        repaired = true;
      }
      if (!updatedData.descripcion || updatedData.descripcion.trim().length === 0) {
        updatedData.descripcion = `Adquisición institucional #${idx + 1}`;
        repaired = true;
      }

      const remainingErrors = currentErrors.filter(e => e !== 'NOG Registrado o ya Existe');

      return {
        ...row,
        data: updatedData,
        isValid: remainingErrors.length === 0,
        errors: remainingErrors,
        warnings: repaired ? [...row.warnings.filter(w => !w.includes('NOG')), 'NOG regularizado con valor 0 (permitido).'] : row.warnings
      };
    }));

    showToast({
      type: 'info',
      title: 'Registros Regularizados',
      message: 'Se regularizaron los registros. Los NOGs duplicados o vacíos se ajustaron a 0 permitido.',
      duration: 3500
    });
  };

  const handleConfirmImport = async () => {
    const validData = parsedRows.filter(r => r.isValid).map(r => r.data);
    if (validData.length === 0) {
      setGlobalError('No hay registros válidos para importar. Utiliza "Auto-reparar registros" o corrige los errores.');
      return;
    }

    setIsProcessing(true);
    try {
      await importPurchases(validData, importMode === 'replace');
      setIsImportModalOpen(false);
      setParsedRows([]);
      setFile(null);
      setWorkbook(null);
    } catch (err: any) {
      setGlobalError(`Error al importar registros: ${err.message || String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const warningCount = parsedRows.filter(r => r.warnings.length > 0).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          setIsImportModalOpen(false);
        }
      }}
    >
      <div 
        id="modal-import-excel"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Institucional del Modal */}
        <div className="bg-[#0f2744] text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-500 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                Importación Masiva de Compras y Eventos
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Excel / CSV / Portapapeles
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Organismo Judicial de Guatemala — Gerencia de Informática y Telecomunicaciones (GIT)
              </p>
            </div>
          </div>
          <button 
            id="btn-close-import-modal"
            onClick={() => !isProcessing && setIsImportModalOpen(false)}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de pestañas y selector de hoja */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'upload' 
                  ? 'bg-white text-[#0f2744] shadow-sm border border-slate-200 font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              1. Cargar Archivo
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'paste' 
                  ? 'bg-white text-[#0f2744] shadow-sm border border-slate-200 font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
              2. Pegar desde Portapapeles
            </button>
            <button
              onClick={() => parsedRows.length > 0 && setActiveTab('preview')}
              disabled={parsedRows.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview' 
                  ? 'bg-white text-[#0f2744] shadow-sm border border-slate-200 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              3. Vista Previa ({parsedRows.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {sheetNames.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
                <span className="text-slate-500 font-medium">Hoja:</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="bg-transparent font-semibold text-blue-900 focus:outline-none cursor-pointer"
                >
                  {sheetNames.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              id="btn-download-template-excel"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Descargar plantilla oficial con encabezados y datos de ejemplo"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Descargar Plantilla Oficial
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto grow space-y-5">
          {globalError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="grow">
                <p className="font-bold">Aviso en la importación</p>
                <p className="mt-0.5">{globalError}</p>
              </div>
              <button 
                onClick={() => setGlobalError(null)} 
                className="text-rose-500 hover:text-rose-700 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                    : 'border-slate-300 hover:border-[#0f2744] hover:bg-slate-50/80 bg-white'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".xlsx, .xls, .csv, .tsv, .txt, .ods" 
                  className="hidden" 
                />
                
                <div className="w-16 h-16 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-4 shadow-inner">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>

                <h4 className="text-base font-bold text-slate-800">
                  Arrastra tu hoja de Excel (.xlsx, .xls) o archivo separado por comas (.csv)
                </h4>
                <p className="text-xs text-slate-500 max-w-lg mt-1.5">
                  El motor inteligente detecta automáticamente los encabezados institucionales (sin importar filas de título previas) y mapea las 20 columnas del expediente.
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <button 
                    type="button" 
                    className="px-4 py-2 bg-[#0f2744] text-white text-xs font-semibold rounded-xl hover:bg-[#1a3a60] transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Seleccionar Archivo de tu Equipo
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveTab('paste'); }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardPaste className="w-4 h-4 text-slate-600" />
                    O pegar datos directamente
                  </button>
                </div>
              </div>

              {/* Guía de Campos Soportados */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Campos reconocidos para Carga Masiva (Ficha completa: 20 columnas):
                  </h5>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Detección automática de encabezados
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs text-slate-600">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">1. NOG</strong>
                    <span className="text-[10.5px] text-slate-500">8 dígitos numéricos Guatecompras</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">2. F56-e</strong>
                    <span className="text-[10.5px] text-slate-500">Formulario electrónico (ej: 0377242026)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">3. F56 (Físico)</strong>
                    <span className="text-[10.5px] text-slate-500">Formulario físico (ej: 005695)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">4. Área Solicitante</strong>
                    <span className="text-[10.5px] text-slate-500">Departamento o sección técnica</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">5. Descripción</strong>
                    <span className="text-[10.5px] text-slate-500">Objeto o requerimiento institucional</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">6. Fecha Solicitud</strong>
                    <span className="text-[10.5px] text-slate-500">Fecha de requerimiento inicial</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">7. Fecha Vo.Bo.</strong>
                    <span className="text-[10.5px] text-slate-500">Fecha visto bueno jefatura</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">8. Fecha Autorizado</strong>
                    <span className="text-[10.5px] text-slate-500">Fecha de autorización gerencial</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">9. Fecha Publicación</strong>
                    <span className="text-[10.5px] text-slate-500">Publicación en Guatecompras</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">10. Fecha Cierre Ofertas</strong>
                    <span className="text-[10.5px] text-slate-500">Límite de recepción de plicas</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">11. Dictamen Técnico</strong>
                    <span className="text-[10.5px] text-slate-500">Fecha dictamen técnico GIT o N/A</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">12. Fecha Oficio GIT</strong>
                    <span className="text-[10.5px] text-slate-500">Oficio hacia compras o N/A</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">13. Cantidad de Ofertas</strong>
                    <span className="text-[10.5px] text-slate-500">Ofertas recibidas (0, 1, 2...)</span>
                  </div>
                  <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                    <strong className="text-emerald-950 block font-mono text-[11px]">14. Monto (GTQ)</strong>
                    <span className="text-[10.5px] text-emerald-800">Presupuesto en Quetzales</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">15. Evaluado Área Técnica</strong>
                    <span className="text-[10.5px] text-slate-500">Evaluado por área técnica (Sí / No)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">16. Estatus del Evento</strong>
                    <span className="text-[10.5px] text-slate-500">Evaluación, Adjudicación, etc.</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">17. Categoría Tecnológica</strong>
                    <span className="text-[10.5px] text-slate-500">Servidores, Software, etc.</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">18. Dependencia Solicitante</strong>
                    <span className="text-[10.5px] text-slate-500">Subgerencia o unidad responsable</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">19. Modalidad de Compra</strong>
                    <span className="text-[10.5px] text-slate-500">Compra Directa, Cotización...</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <strong className="text-slate-900 block font-mono text-[11px]">20. Proveedor Adjudicado</strong>
                    <span className="text-[10.5px] text-slate-500">Razón social de la empresa o N/A</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <ClipboardPaste className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Pegar directamente desde Excel o Google Sheets</strong>
                  <span>Selecciona las filas y columnas en tu hoja de cálculo, presiona <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded font-mono text-[10px]">Ctrl+C</kbd>, y pégalas aquí con <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded font-mono text-[10px]">Ctrl+V</kbd>. No importa si incluye encabezados o títulos previos.</span>
                </div>
              </div>

              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Pega aquí los datos copiados desde tu hoja de cálculo..."
                rows={12}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPasteText('')}
                  disabled={!pasteText.trim() || isProcessing}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Limpiar Texto
                </button>
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pasteText.trim() || isProcessing}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0f2744] hover:bg-[#1a3a60] rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Procesar y Validar Datos Pegados
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Barra de estadísticas y opciones de importación */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span>Total Filas:</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
                      {parsedRows.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <span>Listas para Importar:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                      {validCount}
                    </span>
                  </div>
                  {warningCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                      <span>Con Ajustes/Avisos:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                        {warningCount}
                      </span>
                    </div>
                  )}
                  {detectedHeaderRow > 0 && (
                    <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Encabezados en fila #{detectedHeaderRow}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {warningCount > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoRepair}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      title="Asegurar que todas las filas tengan NOGs y campos válidos"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Auto-regularizar Registros
                    </button>
                  )}

                  <label className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                    <span>Modo:</span>
                    <select
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                      className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-normal text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="append">Agregar a registros existentes</option>
                      <option value="replace">Reemplazar todos los registros actuales</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Tabla de previsualización */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#0f2744] text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold text-center w-10">#</th>
                        <th className="py-2.5 px-3 font-semibold">NOG</th>
                        <th className="py-2.5 px-3 font-semibold">F56-e / F56</th>
                        <th className="py-2.5 px-3 font-semibold min-w-[220px]">Descripción / Área</th>
                        <th className="py-2.5 px-3 font-semibold">Modalidad</th>
                        <th className="py-2.5 px-3 font-semibold">Publicación</th>
                        <th className="py-2.5 px-3 font-semibold">Cierre</th>
                        <th className="py-2.5 px-3 font-semibold text-right text-emerald-300">Monto (GTQ)</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Ofertas</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Eval. GIT</th>
                        <th className="py-2.5 px-3 font-semibold">Estatus</th>
                        <th className="py-2.5 px-3 font-semibold">Adjudicación</th>
                        <th className="py-2.5 px-2 font-semibold text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {parsedRows.map((row) => (
                        <tr 
                          key={row.index}
                          className={`hover:bg-slate-50 transition-colors ${
                            !row.isValid 
                              ? 'bg-rose-50/40' 
                              : row.warnings.length > 0 
                              ? 'bg-amber-50/30' 
                              : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">
                            {row.index}
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {row.errors.includes('NOG Registrado o ya Existe') ? (
                              <div className="space-y-1">
                                <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-300 text-xs block w-fit">
                                  {row.data.nog}
                                </span>
                                <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  NOG Registrado o ya Existe
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setParsedRows(prev => prev.map(r => {
                                      if (r.index !== row.index) return r;
                                      const updated = { ...r.data, nog: '0' };
                                      const errs = r.errors.filter(e => e !== 'NOG Registrado o ya Existe');
                                      return {
                                        ...r,
                                        data: updated,
                                        errors: errs,
                                        isValid: errs.length === 0,
                                        warnings: [...r.warnings, 'NOG asignado a 0 (permitido provisionalmente).']
                                      };
                                    }));
                                  }}
                                  className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer w-fit"
                                  title="Asignar valor 0 permitido provisionalmente"
                                >
                                  <span>Asignar 0 (permitido)</span>
                                </button>
                              </div>
                            ) : row.data.nog === '0' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800">0</span>
                                <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded">
                                  Permitido
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-blue-900">{row.data.nog}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono">
                            <span className="font-semibold text-slate-800 block">{row.data.f56e}</span>
                            {row.data.f56 && (
                              <span className="text-[10px] text-slate-500 block">F56: {row.data.f56}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 max-w-xs" title={row.data.descripcion}>
                            <div className="truncate text-slate-800 font-medium">{row.data.descripcion}</div>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {row.data.areaSolicitante && (
                                <span className="inline-block text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-semibold">
                                  {row.data.areaSolicitante}
                                </span>
                              )}
                              {row.data.categoriaTecnologica && (
                                <span className="inline-block text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-semibold">
                                  {row.data.categoriaTecnologica}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[11px] font-medium text-slate-700 block">
                              {row.data.modalidadCompra || 'Compra Directa'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {row.data.fechaPublicacion}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {row.data.fechaOfertas}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                            {formatQuetzales(row.data.monto)}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">
                            {row.data.cantidadOfertas}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.data.evaluadoGIT === 'Sí' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {row.data.evaluadoGIT}
                            </span>
                            {row.data.fechaDictamenGIT && (
                              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                                {row.data.fechaDictamenGIT}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              row.data.estatusEvento === 'Adjudicación' ? 'bg-emerald-100 text-emerald-800' :
                              row.data.estatusEvento === 'Evaluación' ? 'bg-blue-100 text-blue-800' :
                              row.data.estatusEvento === 'Desierto' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {row.data.estatusEvento}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {row.data.fechaAdjudicacion ? (
                              <div>
                                <span className="text-emerald-700 font-semibold font-mono text-[11px] block">{row.data.fechaAdjudicacion}</span>
                                {row.data.proveedorAdjudicado && row.data.proveedorAdjudicado !== 'N/A' && (
                                  <span className="text-[10px] text-slate-600 block truncate max-w-[140px]" title={row.data.proveedorAdjudicado}>
                                    {row.data.proveedorAdjudicado}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => handleRemoveRow(row.index)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Descartar esta fila antes de importar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal con Botones de Confirmación */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {file && (
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <FileText className="w-4 h-4 text-slate-500" />
                Archivo cargado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                {selectedSheet && <span className="text-slate-500"> — Hoja: <strong>{selectedSheet}</strong></span>}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>

            {activeTab === 'preview' && (
              <button
                type="button"
                id="btn-confirm-excel-import"
                onClick={handleConfirmImport}
                disabled={isProcessing || validCount === 0}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Procesando e Importando...
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-200" />
                    Confirmar e Importar ({validCount} Adquisiciones)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
