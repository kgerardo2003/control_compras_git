import React, { useState, useRef } from 'react';
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
  Layers,
  HelpCircle,
  Info,
  Calendar,
  Building2,
  Scale,
  Landmark,
  Trash2,
  Eye,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { JudicaturaRecord, TipoRamoJudicatura, OpcionSiNo } from '../types';
import { downloadJudicaturasImportTemplate } from '../utils/judicaturasExport';

interface ParsedJudicaturaRow {
  index: number;
  data: Partial<JudicaturaRecord> & {
    observacionesTexto?: string;
  };
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportJudicaturasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportJudicaturasModal: React.FC<ImportJudicaturasModalProps> = ({
  isOpen,
  onClose
}) => {
  const { importJudicaturas, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedJudicaturaRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'invalid'>('all');
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  // Helper para normalizar fechas de Excel (números de serie o strings en DD/MM/YYYY, YYYY-MM-DD)
  const normalizeExcelDate = (val: any, fallback?: string): string => {
    if (!val || val === '' || val === null || val === undefined) return fallback || '';

    // Si viene como número de serie de Excel (ej. 45321)
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
    if (!str) return fallback || '';

    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // Formato DD/MM/YYYY o DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // Intento con objeto Date
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }

    return fallback || '';
  };

  // Normalizador de Si/No para equipamiento
  const normalizeSiNo = (val: any, defaultVal: OpcionSiNo = 'Si'): OpcionSiNo => {
    if (val === undefined || val === null || val === '') return defaultVal;
    const s = String(val).trim().toLowerCase();
    if (['si', 'sí', 's', 'true', '1', 'yes', 'y', 'ok', 'cumple', 'listo'].includes(s)) {
      return 'Si';
    }
    if (['no', 'n', 'false', '0', 'pendiente', 'falta'].includes(s)) {
      return 'No';
    }
    return defaultVal;
  };

  // Normalizador de Cámara/Ramo
  const normalizeRamo = (val: any, nameContext: string = ''): TipoRamoJudicatura => {
    if (val) {
      const s = String(val).trim().toLowerCase();
      if (s.includes('amparo')) return 'Amparos';
      if (s.includes('civil') || s.includes('paz civil') || s.includes('familia') || s.includes('mercantil')) return 'Civil';
      if (s.includes('penal') || s.includes('femicidio') || s.includes('delitos') || s.includes('narco')) return 'Penal';
    }
    // Detección automática en el nombre si no se especificó o es ambiguo
    const nameLow = nameContext.toLowerCase();
    if (nameLow.includes('amparo')) return 'Amparos';
    if (nameLow.includes('civil') || nameLow.includes('familia') || nameLow.includes('mercantil')) return 'Civil';
    return 'Penal';
  };

  // Normalizador de Estatus
  const normalizeEstatus = (val: any): string => {
    if (!val) return 'Pendiente Fecha';
    const s = String(val).trim().toLowerCase();
    if (s.includes('inaugurad')) return 'Inaugurado';
    if (s.includes('reprogramad')) return 'Reprogramado';
    if (s.includes('finalizad')) return 'Finalizado';
    if (s.includes('traslado')) return 'Traslado';
    if (s.includes('pendiente')) return 'Pendiente Fecha';
    return String(val).trim();
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setGlobalError(null);
    setParsedRows([]);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('El archivo no contiene hojas de cálculo legibles.');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('La hoja seleccionada está vacía.');
      }

      const rows: ParsedJudicaturaRow[] = [];

      rawRows.forEach((row, idx) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Extraer valores con soporte flexible de nombres de columna
        const idVal = row['ID'] || row['id'] || row['Código'] || row['Codigo'] || '';
        const nombreVal = (
          row['Nombre de la Judicatura'] ||
          row['Nombre Judicatura'] ||
          row['Judicatura'] ||
          row['Sede'] ||
          row['Sede Judicial'] ||
          row['nombreJudicatura'] ||
          row['Nombre'] ||
          ''
        ).trim();

        const ramoVal =
          row['Cámara / Ramo'] ||
          row['Camara / Ramo'] ||
          row['Cámara'] ||
          row['Camara'] ||
          row['Ramo'] ||
          row['tipoRamo'] ||
          row['Tipo Ramo'] ||
          '';

        const fechaInicioVal =
          row['Fecha Inicio Adecuaciones'] ||
          row['Fecha Inicio'] ||
          row['Inicio'] ||
          row['fechaInicioAdecuaciones'] ||
          '';

        const fechaFinVal =
          row['Fecha Fin Adecuaciones'] ||
          row['Fecha Fin'] ||
          row['Fin'] ||
          row['fechaFinAdecuaciones'] ||
          '';

        const computoVal =
          row['Equipo de Cómputo'] ||
          row['Equipo Cómputo'] ||
          row['Computo'] ||
          row['Cómputo'] ||
          row['equipoComputo'] ||
          '';

        const audioVal =
          row['Equipo de Audio'] ||
          row['Equipo Audio'] ||
          row['Audio'] ||
          row['equipoAudio'] ||
          '';

        const cableadoVal =
          row['Cableado Estructurado'] ||
          row['Cableado'] ||
          row['cableadoEstructurado'] ||
          '';

        const enlaceVal =
          row['Enlace de Datos'] ||
          row['Enlace Datos'] ||
          row['Enlace'] ||
          row['Datos'] ||
          row['enlaceDatos'] ||
          '';

        const fechaInauguracionVal =
          row['Fecha de Inauguración'] ||
          row['Fecha Inauguración'] ||
          row['Fecha Inauguracion'] ||
          row['Inauguración'] ||
          row['Inauguracion'] ||
          row['fechaInauguracion'] ||
          '';

        const estatusVal =
          row['Estatus de Inauguración'] ||
          row['Estatus Inauguración'] ||
          row['Estatus'] ||
          row['Estado'] ||
          row['estadoInauguracion'] ||
          '';

        const observacionesVal = (
          row['Observaciones'] ||
          row['Acciones'] ||
          row['Notas'] ||
          row['observaciones'] ||
          ''
        ).trim();

        // Validaciones
        if (!nombreVal) {
          errors.push('Falta el nombre de la sede judicial.');
        }

        const todayIso = new Date().toISOString().slice(0, 10);
        const normFechaInicio = normalizeExcelDate(fechaInicioVal, todayIso);
        const normFechaFin = normalizeExcelDate(fechaFinVal, normFechaInicio || todayIso);
        const normFechaInauguracion = normalizeExcelDate(fechaInauguracionVal, '');

        if (!fechaInicioVal) {
          warnings.push('Sin fecha de inicio definida; se asignó fecha actual.');
        }

        const tipoRamo = normalizeRamo(ramoVal, nombreVal);
        const equipoComputo = normalizeSiNo(computoVal, 'Si');
        const equipoAudio = normalizeSiNo(audioVal, 'Si');
        const cableadoEstructurado = normalizeSiNo(cableadoVal, 'Si');
        const enlaceDatos = normalizeSiNo(enlaceVal, 'Si');
        const estadoInauguracion = normalizeEstatus(estatusVal);

        const data: Partial<JudicaturaRecord> & { observacionesTexto?: string } = {
          id: idVal ? String(idVal).trim() : undefined,
          nombreJudicatura: nombreVal,
          tipoRamo,
          fechaInicioAdecuaciones: normFechaInicio,
          fechaFinAdecuaciones: normFechaFin,
          equipoComputo,
          equipoAudio,
          cableadoEstructurado,
          enlaceDatos,
          fechaInauguracion: normFechaInauguracion || undefined,
          estadoInauguracion,
          observacionesTexto: observacionesVal,
        };

        rows.push({
          index: idx + 1,
          data,
          isValid: errors.length === 0,
          errors,
          warnings,
        });
      });

      setParsedRows(rows);
    } catch (err: any) {
      setGlobalError(err.message || 'Error al procesar el archivo. Verifique el formato.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const recordsToImport = validRows.map((r) => ({
        ...r.data,
        observaciones: r.data.observacionesTexto ? (r.data.observacionesTexto as any) : []
      }));

      await importJudicaturas(recordsToImport as any, importMode === 'replace');
      onClose();
    } catch (err: any) {
      setGlobalError(err.message || 'Error al guardar los registros importados.');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const displayedRows = parsedRows.filter((r) => {
    if (filterTab === 'valid') return r.isValid;
    if (filterTab === 'invalid') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="p-5 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Upload className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/40">
                  Importación Oficial
                </span>
                <span className="text-xs text-slate-300 font-mono">Excel / CSV</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                Importar Registros de Judicaturas
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Instrucciones y Descarga de Plantilla */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 space-y-0.5">
                <p className="font-bold text-blue-950">
                  Formato compatible para importación masiva
                </p>
                <p className="text-slate-600">
                  Puede importar archivos exportados desde este mismo módulo o crear uno nuevo con las columnas institucionales requeridas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadJudicaturasImportTemplate}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-blue-900 border border-blue-300 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer shrink-0"
              title="Descargar plantilla de Excel con formato oficial"
            >
              <Download className="w-4 h-4 text-blue-700" />
              <span>Descargar Plantilla Excel</span>
            </button>
          </div>

          {/* Zona de Arrastrar y Soltar o Selector de Archivo */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                : file
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-blue-700">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {file ? file.name : 'Arrastre su archivo Excel (.xlsx, .xls) o CSV aquí'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  o haga clic para explorar en su equipo
                </p>
              </div>
              {file && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                  Archivo cargado ({(file.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          </div>

          {/* Error global */}
          {globalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Opciones de Modo de Importación */}
          {parsedRows.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Modo de Importación
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    importMode === 'append'
                      ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/50'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Agregar y Actualizar (Recomendado)
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-snug">
                      Inserta nuevas judicaturas y actualiza las existentes si coincide el ID o Nombre.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'bg-rose-50/80 border-rose-400 ring-1 ring-rose-400/50'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-rose-950 block">
                      Reemplazar Todo
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-snug">
                      Sustituye completamente la lista actual por los registros del archivo importado.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Resumen de Filas Parseadas y Pestañas de Filtrado */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono">
                    Total: {parsedRows.length}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Válidos: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-300 font-mono flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      Errores: {invalidCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      filterTab === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('valid')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      filterTab === 'valid'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    Válidos ({validCount})
                  </button>
                  {invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterTab('invalid')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        filterTab === 'invalid'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      Errores ({invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de Previsualización */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0 border-b border-slate-200 text-[10px] tracking-wider">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Sede Judicial</th>
                      <th className="px-3 py-2">Cámara</th>
                      <th className="px-3 py-2">Fechas Adecuación</th>
                      <th className="px-3 py-2 text-center">TIC (C/A/Cab/Enl)</th>
                      <th className="px-3 py-2">Estatus</th>
                      <th className="px-3 py-2 text-center">Validación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {displayedRows.map((row) => (
                      <tr
                        key={`parsed-row-${row.index}`}
                        className={`hover:bg-slate-50 transition-colors ${
                          !row.isValid ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-mono text-slate-400 text-[11px]">
                          {row.index}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900 max-w-xs truncate" title={row.data.nombreJudicatura}>
                          {row.data.nombreJudicatura || <span className="text-rose-600 italic">Sin nombre</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black border font-mono ${
                              row.data.tipoRamo === 'Penal'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : row.data.tipoRamo === 'Civil'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {row.data.tipoRamo}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                          {row.data.fechaInicioAdecuaciones} al {row.data.fechaFinAdecuaciones}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1 font-mono text-[9px] font-black">
                            <span className={row.data.equipoComputo === 'Si' ? 'text-emerald-700 bg-emerald-50 px-1 rounded' : 'text-slate-400'}>C:{row.data.equipoComputo}</span>
                            <span className={row.data.equipoAudio === 'Si' ? 'text-emerald-700 bg-emerald-50 px-1 rounded' : 'text-slate-400'}>A:{row.data.equipoAudio}</span>
                            <span className={row.data.cableadoEstructurado === 'Si' ? 'text-emerald-700 bg-emerald-50 px-1 rounded' : 'text-slate-400'}>Cb:{row.data.cableadoEstructurado}</span>
                            <span className={row.data.enlaceDatos === 'Si' ? 'text-emerald-700 bg-emerald-50 px-1 rounded' : 'text-slate-400'}>En:{row.data.enlaceDatos}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[11px] font-bold text-slate-800">
                          {row.data.estadoInauguracion}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Correcto
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"
                              title={row.errors.join(' | ')}
                            >
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Pie del Modal con Acciones */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                  setGlobalError(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={validCount === 0 || isImporting || isProcessing}
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importando {validCount} registros...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Confirmar e Importar ({validCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
