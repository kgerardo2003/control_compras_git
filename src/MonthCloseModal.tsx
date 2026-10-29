import React, { useState, useMemo } from 'react';
import { RentalUnit, AppLanguage } from '../../types/rents';
import { formatUSD } from '../../utils/rentsCalculations';
import { RENT_TRANSLATIONS } from '../../locales/rentsTranslations';
import { 
  X, 
  Calendar, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ShieldAlert, 
  RefreshCw,
  Coins
} from 'lucide-react';

interface MonthCloseModalProps {
  units: RentalUnit[];
  currentPeriodName: string;
  nextPeriodName: string;
  language: AppLanguage;
  onClose: () => void;
  onConfirmCloseMonth: (lateFeeAmount: number) => void;
}

export const MonthCloseModal: React.FC<MonthCloseModalProps> = ({
  units,
  currentPeriodName,
  nextPeriodName,
  language,
  onClose,
  onConfirmCloseMonth
}) => {
  const t = RENT_TRANSLATIONS[language];
  const [lateFeeConfig, setLateFeeConfig] = useState<number>(50);

  // Unidades con saldo pendiente que arrastrarán deuda
  const overdueStats = useMemo(() => {
    let unitsWithDebt = 0;
    let totalDebtSum = 0;
    let delinquentCount = 0;
    let partialCount = 0;

    units.forEach(u => {
      if (u.unitStatus === 'Occupied') {
        if (u.carryoverBalance > 0) {
          unitsWithDebt += 1;
          totalDebtSum += u.carryoverBalance;
        }
        if (u.paymentStatus === 'Delinquent') delinquentCount += 1;
        if (u.paymentStatus === 'Partial') partialCount += 1;
      }
    });

    return {
      unitsWithDebt,
      totalDebtSum,
      delinquentCount,
      partialCount,
      totalUnpaidUnits: delinquentCount + partialCount
    };
  }, [units]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmCloseMonth(Math.max(0, lateFeeConfig));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-indigo-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Financial Cycle Rollover
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {t.monthCloseTitle}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario / Contenido */}
        <form onSubmit={handleApply} className="p-4 sm:p-6 space-y-5 text-slate-800 text-xs sm:text-sm overflow-y-auto">
          
          {/* Advertencia / Explicación del Procedimiento */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t.simulationWarning}
            </p>
          </div>

          {/* Visualizador de Transición de Periodos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {t.currentCycle}
              </span>
              <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                {currentPeriodName}
              </p>
              <span className="inline-block mt-1 text-[10px] text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded font-semibold">
                Cierre y Arrastre
              </span>
            </div>

            <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200">
              <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                {t.nextCycle}
              </span>
              <p className="text-sm sm:text-base font-bold text-indigo-950 mt-0.5">
                {nextPeriodName}
              </p>
              <span className="inline-block mt-1 text-[10px] text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded font-semibold">
                Nuevo Ciclo Operativo
              </span>
            </div>
          </div>

          {/* Tarjeta de Métricas de Arrastre */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[11px] font-bold text-rose-900 block">
                {t.unitsToCarryoverCount}
              </span>
              <span className="text-2xl font-black text-rose-700 font-mono mt-1 block">
                {overdueStats.unitsWithDebt}
              </span>
              <span className="text-[10px] text-rose-600">
                ({overdueStats.delinquentCount} en mora + {overdueStats.partialCount} pagos parciales)
              </span>
            </div>

            <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 block">
                {t.totalCarryoverSum}
              </span>
              <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                {formatUSD(overdueStats.totalDebtSum)}
              </span>
              <span className="text-[10px] text-slate-400">
                Traslado directo a Deuda Previa
              </span>
            </div>
          </div>

          {/* Configuración del Cargo por Mora */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              {t.lateFeeConfigLabel}
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="5"
                value={lateFeeConfig}
                onChange={(e) => setLateFeeConfig(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {t.lateFeeConfigHint} ({overdueStats.totalUnpaidUnits} unidades recibirán este cargo).
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.applyCycleClosingBtn}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
