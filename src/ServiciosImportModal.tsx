/**
 * @license
 * Modal de Importación de Servicios Contratados desde Excel o CSV
 * Gerencia de Informática - Organismo Judicial de Guatemala
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  parseServiciosFile, 
  downloadServiciosImportTemplate 
} from '../../utils/serviciosExport';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  FileCheck
} from 'lucide-react';

interface ServiciosImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServiciosImportModal: React.FC<ServiciosImportModalProps> = ({ isOpen, onClose }) => {
  const { bulkImportServicios } = useApp();

  const [file, setFile] = useState<File | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [previewRecords, setPreviewRecords] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsProcessing(true);
    setParseErrors([]);

    const result = await parseServiciosFile(selected);
    setIsProcessing(false);
    setParseErrors(result.errors);
    setPreviewRecords(result.servicios);
  };

  const handleImport = async () => {
    if (previewRecords.length === 0) return;

    setIsProcessing(true);
    try {
      await bulkImportServicios(previewRecords, replaceAll);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-500/40">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold">Importar Servicios Contratados</h2>
              <p className="text-xs text-slate-400">Carga masiva desde archivo Excel (.xlsx, .xls) o CSV</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Descarga de plantilla */}
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-blue-900">¿No tienes el formato oficial?</h4>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Descarga la plantilla con encabezados y filas de ejemplo basadas en Servicios_Consolidados.xlsx
              </p>
            </div>
            <button
              type="button"
              onClick={downloadServiciosImportTemplate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Plantilla</span>
            </button>
          </div>

          {/* Zona de Drop / Carga de archivo */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-slate-50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
          >
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">
              {file ? file.name : 'Haz clic para seleccionar tu archivo Excel o CSV'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Formatos admitidos: .xlsx, .xls, .csv'}
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
          </div>

          {/* Opción de Modo de Importación */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Modo de Inserción:</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={!replaceAll}
                  onChange={() => setReplaceAll(false)}
                  className="text-blue-900"
                />
                <span>Actualizar / Añadir</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={replaceAll}
                  onChange={() => setReplaceAll(true)}
                  className="text-blue-900"
                />
                <span className="text-rose-700 font-semibold">Reemplazar Todo</span>
              </label>
            </div>
          </div>

          {/* Errores si los hay */}
          {parseErrors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Se encontraron observaciones en el archivo:
              </span>
              <ul className="list-disc list-inside text-[11px] space-y-0.5">
                {parseErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Resumen de Registros Parseados */}
          {previewRecords.length > 0 && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Archivo validado correctamente
                </span>
                <span>{previewRecords.length} servicios listos para importar</span>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-emerald-100 text-[11px] text-slate-700">
                {previewRecords.slice(0, 10).map((r, i) => (
                  <div key={i} className="py-1 flex justify-between">
                    <span className="font-medium truncate max-w-[320px]">{r.servicioContratado}</span>
                    <span className="font-mono text-slate-500">{r.codigo}</span>
                  </div>
                ))}
                {previewRecords.length > 10 && (
                  <p className="text-[10px] text-slate-400 pt-1 italic">
                    ... y {previewRecords.length - 10} servicios adicionales.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Pie */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleImport}
            disabled={previewRecords.length === 0 || isProcessing}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>{isProcessing ? 'Importando...' : `Confirmar e Importar (${previewRecords.length})`}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
