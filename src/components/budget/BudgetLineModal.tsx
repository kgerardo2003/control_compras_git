import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BudgetLineItem } from '../../types';
import { 
  OFFICIAL_BUDGET_GROUPS, 
  OFFICIAL_RENGLONES, 
  OfficialRenglon,
  getOfficialRenglonName 
} from '../../data/budgetStandardCatalog';
import { X, Layers, DollarSign, AlertCircle, BookOpen, Check } from 'lucide-react';

interface BudgetLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineToEdit?: BudgetLineItem | null;
  prefillRenglon?: OfficialRenglon | null;
}

const GRUPOS_PREDEFINIDOS = [
  'Grupo 100 - Servicios No Personales',
  'Grupo 200 - Materiales y Suministros',
  'Grupo 300 - Propiedad, Planta, Equipo e Intangibles',
  'Grupo 400 - Transferencias Corrientes',
  'Grupo 900 - Otros Gastos y Asignaciones'
];

export const BudgetLineModal: React.FC<BudgetLineModalProps> = ({
  isOpen,
  onClose,
  lineToEdit,
  prefillRenglon
}) => {
  const { addBudgetLine, updateBudgetLine, budgetLines } = useApp();

  const [grupo, setGrupo] = useState(GRUPOS_PREDEFINIDOS[0]);
  const [selectedGrupoCode, setSelectedGrupoCode] = useState<'100' | '200' | '300' | 'custom'>('100');
  const [renglon, setRenglon] = useState('');
  const [nombre, setNombre] = useState('');
  const [presupuestoInicial, setPresupuestoInicial] = useState<string>('');
  const [pagadoQueRebaja, setPagadoQueRebaja] = useState<string>('0');
  const [comprometidoPendiente, setComprometidoPendiente] = useState<string>('0');
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Renglones oficiales del grupo seleccionado
  const renglonesGrupo = OFFICIAL_RENGLONES.filter(r => r.grupo === selectedGrupoCode);

  useEffect(() => {
    if (lineToEdit) {
      setGrupo(lineToEdit.grupoPresupuestario);
      if (lineToEdit.grupoPresupuestario.includes('100')) setSelectedGrupoCode('100');
      else if (lineToEdit.grupoPresupuestario.includes('200')) setSelectedGrupoCode('200');
      else if (lineToEdit.grupoPresupuestario.includes('300')) setSelectedGrupoCode('300');
      else setSelectedGrupoCode('custom');

      setRenglon(lineToEdit.renglonPresupuestario);
      setNombre(lineToEdit.nombreRenglon);
      setPresupuestoInicial(lineToEdit.presupuestoInicial.toString());
      setPagadoQueRebaja(lineToEdit.pagadoQueRebaja.toString());
      setComprometidoPendiente(lineToEdit.comprometidoPendiente.toString());
      setObservaciones(lineToEdit.observaciones || '');
    } else if (prefillRenglon) {
      setGrupo(prefillRenglon.grupoNombre);
      setSelectedGrupoCode(prefillRenglon.grupo);
      setRenglon(prefillRenglon.renglon);
      setNombre(prefillRenglon.nombreRenglon);
      setPresupuestoInicial('');
      setPagadoQueRebaja('0');
      setComprometidoPendiente('0');
      setObservaciones('Renglón incorporado del catálogo estándar oficial.');
    } else {
      setGrupo(GRUPOS_PREDEFINIDOS[0]);
      setSelectedGrupoCode('100');
      setRenglon('158');
      setNombre(getOfficialRenglonName('158'));
      setPresupuestoInicial('');
      setPagadoQueRebaja('0');
      setComprometidoPendiente('0');
      setObservaciones('');
    }
    setErrorMsg(null);
  }, [lineToEdit, prefillRenglon, isOpen]);

  const handleGrupoChange = (newGrupo: string) => {
    setGrupo(newGrupo);
    if (newGrupo.includes('100')) {
      setSelectedGrupoCode('100');
      const first = OFFICIAL_RENGLONES.find(r => r.grupo === '100');
      if (first && !lineToEdit) {
        setRenglon(first.renglon);
        setNombre(first.nombreRenglon);
      }
    } else if (newGrupo.includes('200')) {
      setSelectedGrupoCode('200');
      const first = OFFICIAL_RENGLONES.find(r => r.grupo === '200');
      if (first && !lineToEdit) {
        setRenglon(first.renglon);
        setNombre(first.nombreRenglon);
      }
    } else if (newGrupo.includes('300')) {
      setSelectedGrupoCode('300');
      const first = OFFICIAL_RENGLONES.find(r => r.grupo === '300');
      if (first && !lineToEdit) {
        setRenglon(first.renglon);
        setNombre(first.nombreRenglon);
      }
    } else {
      setSelectedGrupoCode('custom');
    }
  };

  const handleOfficialRenglonSelect = (code: string) => {
    setRenglon(code);
    const standardName = getOfficialRenglonName(code);
    setNombre(standardName);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanRenglon = renglon.trim();
    const cleanNombre = nombre.trim();
    const pInicial = parseFloat(presupuestoInicial) || 0;
    const pagado = parseFloat(pagadoQueRebaja) || 0;
    const comprometido = parseFloat(comprometidoPendiente) || 0;

    if (!cleanRenglon) {
      setErrorMsg('Debe ingresar el código numérico del renglón (ej. 158, 267, 328).');
      return;
    }

    if (!cleanNombre) {
      setErrorMsg('Debe ingresar el nombre descriptivo del renglón presupuestario.');
      return;
    }

    if (pInicial < 0) {
      setErrorMsg('El presupuesto inicial no puede ser un valor negativo.');
      return;
    }

    // Validar duplicidad de renglón si es nuevo
    if (!lineToEdit) {
      const exists = budgetLines.some(l => l.renglonPresupuestario.toLowerCase() === cleanRenglon.toLowerCase());
      if (exists) {
        setErrorMsg(`El renglón ${cleanRenglon} ya existe en el presupuesto. Puede editarlo o ingresar otro código.`);
        return;
      }
    }

    const modAprobadas = lineToEdit ? lineToEdit.modificacionesAprobadas : 0;
    const vigente = pInicial + modAprobadas;
    const dispReal = vigente - pagado;
    const dispProy = dispReal - comprometido;
    const totalAfectado = pagado + comprometido;
    const pct = vigente > 0 ? (totalAfectado / vigente) * 100 : 0;

    let estatus: any = 'Con Disponibilidad';
    if (dispProy <= 0) estatus = 'Sin Disponibilidad';
    else if (dispProy < (vigente * 0.15)) estatus = 'Alerta Disponibilidad Baja';

    if (lineToEdit) {
      updateBudgetLine(lineToEdit.id, {
        grupoPresupuestario: grupo,
        renglonPresupuestario: cleanRenglon,
        nombreRenglon: cleanNombre,
        presupuestoInicial: pInicial,
        presupuestoVigente: vigente,
        pagadoQueRebaja: pagado,
        disponibleReal: dispReal,
        comprometidoPendiente: comprometido,
        disponibleProyectado: dispProy,
        porcentajeUsadoComprometido: Math.round(pct * 100) / 100,
        estatusDisponibilidad: estatus,
        observaciones: observaciones.trim()
      });
    } else {
      addBudgetLine({
        grupoPresupuestario: grupo,
        renglonPresupuestario: cleanRenglon,
        nombreRenglon: cleanNombre,
        presupuestoInicial: pInicial,
        modificacionesAprobadas: 0,
        presupuestoVigente: pInicial,
        pagadoQueRebaja: pagado,
        disponibleReal: pInicial - pagado,
        comprometidoPendiente: comprometido,
        disponibleProyectado: (pInicial - pagado) - comprometido,
        porcentajeUsadoComprometido: Math.round(pct * 100) / 100,
        estatusDisponibilidad: estatus,
        ejercicioFiscal: 2026,
        observaciones: observaciones.trim()
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lineToEdit ? `Editar Renglón Presupuestario ${lineToEdit.renglonPresupuestario}` : 'Registrar Nuevo Renglón Presupuestario'}
              </h3>
              <p className="text-xs text-slate-400">
                Estructura presupuestaria oficial de la Gerencia de Informática
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* Grupo Presupuestario */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Grupo Presupuestario *
            </label>
            <select
              value={grupo}
              onChange={(e) => handleGrupoChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {GRUPOS_PREDEFINIDOS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Renglones oficiales del grupo (Image 4 & 5) */}
          {selectedGrupoCode !== 'custom' && renglonesGrupo.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Renglones Oficiales Disponibles para Grupo {selectedGrupoCode}:
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {renglonesGrupo.length} renglones en catálogo
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {renglonesGrupo.map((item) => {
                  const isSelected = renglon === item.renglon;
                  return (
                    <button
                      key={item.renglon}
                      type="button"
                      onClick={() => handleOfficialRenglonSelect(item.renglon)}
                      className={`text-left p-1.5 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold ring-1 ring-blue-400'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                      title={item.nombreRenglon}
                    >
                      <span className="font-mono font-bold mr-1">{item.renglon}</span>
                      <span className="truncate text-[11px] text-slate-600 flex-1">{item.nombreRenglon}</span>
                      {isSelected && <Check className="w-3 h-3 text-blue-600 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Renglón y Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código Renglón *
              </label>
              <input
                type="text"
                value={renglon}
                onChange={(e) => setRenglon(e.target.value)}
                placeholder="Ej. 158"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-blue-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Nombre del Renglón (Editable) *</span>
                <span className="text-[10px] text-slate-400 font-normal">Personalizable</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Derechos de Bienes Intangibles"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Presupuesto Inicial */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Presupuesto Inicial Aprobado (Q.) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                Q.
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={presupuestoInicial}
                onChange={(e) => setPresupuestoInicial(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pagado Base y Comprometido Base */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pagado que Rebaja Base (Q.)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pagadoQueRebaja}
                onChange={(e) => setPagadoQueRebaja(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-blue-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Gastos devengados previos en SICOIN</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Comprometido Pendiente Base (Q.)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={comprometidoPendiente}
                onChange={(e) => setComprometidoPendiente(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-amber-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Compromisos previos en trámite</span>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones / Finalidad del Renglón
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Descripción del alcance de este renglón en la Gerencia de Informática..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botones */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              {lineToEdit ? 'Actualizar Renglón' : 'Crear Renglón'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
