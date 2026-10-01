import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { BudgetLineItem } from '../../types';
import { 
  OFFICIAL_RENGLONES, 
  getGrupoFullName 
} from '../../data/budgetStandardCatalog';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  FileCheck2,
  BookOpen,
  PlusCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface ImportOfficialCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

interface ParsedCatalogItem {
  renglon: string;
  nombreRenglon: string;
  grupo: '100' | '200' | '300';
  descripcion: string;
  presupuestoInicial: number;
  isExistingInMatrix: boolean;
  isOfficialCode: boolean;
}

export const ImportOfficialCatalogModal: React.FC<ImportOfficialCatalogModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { budgetAvailability, importBudgetLines, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedCatalogItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importOption, setImportOption] = useState<'matrix_and_catalog' | 'catalog_only'>('matrix_and_catalog');

  if (!isOpen) return null;

  // Mapa de renglones existentes en la matriz presupuestaria
  const existingMatrixMap = new Map<string, BudgetLineItem>();
  budgetAvailability.forEach(l => existingMatrixMap.set(String(l.renglonPresupuestario).trim(), l));

  // Set de renglones oficiales estándar
  const officialCodesSet = new Set(OFFICIAL_RENGLONES.map(r => String(r.renglon).trim()));

  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleanStr = String(val).replace(/Q|\$|,|\s/g, '').replace(/%/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const cleanText = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  };

  // Descargar Plantilla Oficial para Renglones Presupuestarios
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Grupo Presupuestario': 'Grupo 100 - Servicios No Personales',
        'Código Renglón': '158',
        'Nombre del Renglón': 'Servicios de Informática y Telecomunicaciones',
        'Descripción / Uso Institucional': 'Contratación de servicios especializados de TI, consultorías y soporte',
        'Presupuesto Inicial (Q)': 1000000
      },
      {
        'Grupo Presupuestario': 'Grupo 200 - Materiales y Suministros',
        'Código Renglón': '297',
        'Nombre del Renglón': 'Útiles, Accesorios y Materiales Eléctricos',
        'Descripción / Uso Institucional': 'Cables, conectores, canaletas y suministros para redes',
        'Presupuesto Inicial (Q)': 250000
      },
      {
        'Grupo Presupuestario': 'Grupo 300 - Propiedad, Planta y Equipo',
        'Código Renglón': '328',
        'Nombre del Renglón': 'Equipo de Cómputo',
        'Descripción / Uso Institucional': 'Servidores, estaciones de trabajo, laptops y switches para judicaturas',
        'Presupuesto Inicial (Q)': 3500000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Renglones');
    XLSX.writeFile(wb, 'Plantilla_Catalogo_Renglones_OJ.xlsx');
  };

  // Procesar archivo Excel o CSV
  const handleFileProcess = async (selectedFile: File) => {
    setErrorMsg(null);
    setIsLoading(true);
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!rawData || rawData.length === 0) {
        setErrorMsg('El archivo seleccionado está vacío o no contiene filas con datos legibles.');
        setIsLoading(false);
        return;
      }

      const items: ParsedCatalogItem[] = [];

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];

        // Buscar Código Renglón
        const renglonKey = Object.keys(row).find(k => /c[oó]digo/i.test(k) || (/rengl[oó]n/i.test(k) && !/nombre/i.test(k) && !/grupo/i.test(k)));
        const renglonRaw = cleanText(renglonKey ? row[renglonKey] : row['Código Renglón'] || row['Renglón'] || row['Renglon']);
        const renglon = renglonRaw.replace(/[^0-9]/g, '');

        // Buscar Nombre del Renglón
        const nombreKey = Object.keys(row).find(k => /nombre/i.test(k) || /t[ií]tulo/i.test(k) || /concepto/i.test(k));
        const nombreRenglon = cleanText(nombreKey ? row[nombreKey] : row['Nombre del Renglón'] || row['Nombre']);

        if (!renglon && !nombreRenglon) continue;

        // Determinar Grupo
        const grupoKey = Object.keys(row).find(k => /grupo/i.test(k));
        const grupoRaw = cleanText(grupoKey ? row[grupoKey] : row['Grupo Presupuestario'] || row['Grupo']);
        let grupo: '100' | '200' | '300' = '100';

        if (grupoRaw.includes('200') || renglon.startsWith('2')) {
          grupo = '200';
        } else if (grupoRaw.includes('300') || renglon.startsWith('3')) {
          grupo = '300';
        } else {
          grupo = '100';
        }

        // Descripción / Uso
        const descKey = Object.keys(row).find(k => /descripci[oó]n/i.test(k) || /uso/i.test(k) || /observa/i.test(k));
        const descripcion = cleanText(descKey ? row[descKey] : row['Descripción / Uso Institucional'] || row['Descripción'] || 'Renglón institucional importado');

        // Presupuesto Inicial (opcional)
        const pInicialKey = Object.keys(row).find(k => /inicial/i.test(k) || /presupuesto/i.test(k) || /monto/i.test(k) || /techo/i.test(k));
        const presupuestoInicial = parseNumber(pInicialKey ? row[pInicialKey] : 0);

        items.push({
          renglon: renglon || `R-${i + 1}`,
          nombreRenglon: nombreRenglon || `Renglón ${renglon}`,
          grupo,
          descripcion,
          presupuestoInicial,
          isExistingInMatrix: existingMatrixMap.has(renglon),
          isOfficialCode: officialCodesSet.has(renglon)
        });
      }

      if (items.length === 0) {
        setErrorMsg('No se detectaron renglones válidos. Asegúrese de que el archivo contenga las columnas "Código Renglón" y "Nombre del Renglón".');
        setIsLoading(false);
        return;
      }

      setParsedItems(items);
    } catch (err: any) {
      console.error('Error al procesar archivo de catálogo:', err);
      setErrorMsg(`Error procesando archivo: ${err?.message || 'Formato no soportado o archivo corrupto'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedItems.length === 0) return;
    setIsLoading(true);

    try {
      // Transformar a BudgetLineItem list
      const linesToImport: Omit<BudgetLineItem, 'id' | 'fechaCreacion'>[] = parsedItems.map(item => {
        const existing = existingMatrixMap.get(item.renglon);
        const pInicial = item.presupuestoInicial > 0 ? item.presupuestoInicial : (existing?.presupuestoInicial || 0);
        const modif = existing?.modificacionesAprobadas || 0;
        const pVigente = pInicial + modif;
        const pagado = existing?.pagadoQueRebaja || 0;
        const dispReal = Math.max(0, pVigente - pagado);
        const comp = existing?.comprometidoPendiente || 0;
        const dispProy = dispReal - comp;
        const pct = pVigente > 0 ? Math.round(((pagado + comp) / pVigente) * 1000) / 10 : 0;
        const estatus = dispProy <= 0 ? 'Sin Presupuesto' : (dispProy < pVigente * 0.15 ? 'Alerta Disponibilidad Baja' : 'Con Disponibilidad');

        return {
          grupoPresupuestario: getGrupoFullName(item.grupo),
          renglonPresupuestario: item.renglon,
          nombreRenglon: item.nombreRenglon,
          presupuestoInicial: pInicial,
          modificacionesAprobadas: modif,
          presupuestoVigente: pVigente,
          pagadoQueRebaja: pagado,
          disponibleReal: dispReal,
          comprometidoPendiente: comp,
          disponibleProyectado: dispProy,
          porcentajeUsadoComprometido: pct,
          estatusDisponibilidad: estatus,
          ejercicioFiscal: 2026,
          observaciones: item.descripcion || (existing?.observaciones || 'Actualizado desde Catálogo de Renglones Oficiales.')
        };
      });

      // Ejecutar fusión con la matriz presupuestaria
      await importBudgetLines(linesToImport, false);

      showToast({
        title: 'Catálogo de Renglones Importado',
        message: `Se importaron y actualizaron exitosamente ${parsedItems.length} renglones presupuestarios.`,
        type: 'success'
      });

      if (onSuccess) {
        onSuccess(parsedItems.length);
      }
      onClose();
    } catch (err: any) {
      console.error('Error al guardar catálogo importado:', err);
      setErrorMsg(`Error al guardar en el sistema: ${err?.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const newCount = parsedItems.filter(i => !i.isExistingInMatrix).length;
  const updateCount = parsedItems.filter(i => i.isExistingInMatrix).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Encabezado */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Importar Catálogo de Renglones Oficiales
              </h3>
              <p className="text-xs text-slate-300">
                Carga masiva de partidas presupuestarias desde archivos Excel (.xlsx, .xls) o CSV con actualización automática de la matriz.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Zona de Arrastrar y Soltar Archivo */}
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50/60 scale-[0.99]' 
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
                className="hidden"
              />

              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>

              <h4 className="text-sm font-bold text-slate-800">
                Haga clic para seleccionar o arrastre el archivo aquí
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Formatos soportados: Microsoft Excel (.xlsx, .xls) o valores separados por comas (.csv)
              </p>

              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Descargar archivo modelo con encabezados requeridos"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Descargar Plantilla Oficial Excel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{file.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB • {parsedItems.length} renglones detectados
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setFile(null); setParsedItems([]); setErrorMsg(null); }}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors"
              >
                Cambiar Archivo
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Vista Previa de Renglones Parseados */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-blue-600" />
                  <span>Vista Previa de Renglones a Incorporar ({parsedItems.length})</span>
                </h4>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    {newCount} Nuevos en Matriz
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                    {updateCount} Existentes a Actualizar
                  </span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Grupo</th>
                      <th className="px-3 py-2">Renglón</th>
                      <th className="px-3 py-2">Nombre del Renglón</th>
                      <th className="px-3 py-2">Uso / Descripción</th>
                      <th className="px-3 py-2 text-right">Presupuesto Inicial</th>
                      <th className="px-3 py-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-bold text-slate-600">
                          G-{item.grupo}
                        </td>
                        <td className="px-3 py-1.5 font-mono font-bold text-blue-900">
                          {item.renglon}
                        </td>
                        <td className="px-3 py-1.5 font-medium text-slate-800 max-w-xs truncate" title={item.nombreRenglon}>
                          {item.nombreRenglon}
                        </td>
                        <td className="px-3 py-1.5 text-slate-500 max-w-xs truncate" title={item.descripcion}>
                          {item.descripcion}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                          {item.presupuestoInicial > 0 ? `Q${item.presupuestoInicial.toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isExistingInMatrix
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.isExistingInMatrix ? 'Actualizar' : '+ Nuevo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Información y Normativa */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-700" />
              <span>Reglas de Importación Oficial:</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Los renglones importados se homologarán según su código en los Grupos 100 (Servicios), 200 (Materiales) y 300 (Equipo/Activos). Si un renglón ya existe en la matriz, sus descripciones o presupuestos se actualizarán manteniendo el historial de ejecuciones y adquisiciones F56 vinculadas.
            </p>
          </div>

        </div>

        {/* Pie del Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={parsedItems.length === 0 || isLoading}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span>Incorporar {parsedItems.length} Renglones a Matriz</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
