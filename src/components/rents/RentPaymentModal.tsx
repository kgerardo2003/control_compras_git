import React, { useState, useMemo } from 'react';
import { RentalUnit, PaymentMethod, AppLanguage } from '../../types/rents';
import { calculatePaymentAmortization, formatUSD } from '../../utils/rentsCalculations';
import { RENT_TRANSLATIONS } from '../../locales/rentsTranslations';
import { 
  X, 
  DollarSign, 
  CheckCircle2, 
  ArrowDownRight, 
  CreditCard, 
  Receipt, 
  ShieldCheck, 
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

interface RentPaymentModalProps {
  unit: RentalUnit;
  language: AppLanguage;
  onClose: () => void;
  onConfirmPayment: (unitId: string, paymentData: {
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber: string;
    notes: string;
    amortizedDebt: number;
    amortizedRent: number;
    amortizedLateFee: number;
  }) => void;
}

export const RentPaymentModal: React.FC<RentPaymentModalProps> = ({
  unit,
  language,
  onClose,
  onConfirmPayment,
}) => {
  const t = RENT_TRANSLATIONS[language];

  // Monto inicial sugerido: total adeudado o renta mensual
  const defaultAmount = unit.carryoverBalance > 0 ? unit.carryoverBalance : unit.scheduledRent;
  const [amountInput, setAmountInput] = useState<string>(String(defaultAmount));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ACH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amountInput);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amountInput]);

  // Cálculo en cascada en tiempo real
  const amortization = useMemo(() => {
    return calculatePaymentAmortization(unit, numericAmount);
  }, [unit, numericAmount]);

  const handleApplyPreset = (amount: number) => {
    setAmountInput(String(Math.max(0, amount)));
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setErrorMsg(language === 'es' ? 'Ingrese un monto mayor a cero' : 'Please enter an amount greater than zero');
      return;
    }

    onConfirmPayment(unit.id, {
      amount: numericAmount,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || `REF-${Date.now().toString().slice(-6)}`,
      notes: notes.trim(),
      amortizedDebt: amortization.amortizedDebt,
      amortizedRent: amortization.amortizedRent,
      amortizedLateFee: amortization.amortizedLateFee,
    });
  };

  // Clases y badges para el nuevo estado proyectado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Partial':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Delinquent':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Paid': return t.statusPaid;
      case 'Partial': return t.statusPartial;
      case 'Delinquent': return t.statusDelinquent;
      default: return t.statusVacant;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {unit.id}
                </span>
                <span className="text-xs text-slate-300">
                  {unit.location} • {unit.city}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                {t.paymentModalTitle}
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

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-800 text-xs sm:text-sm">
          
          {/* Banner Resumen de la Unidad */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 mb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t.colTenant} & {t.colAddress}
                </span>
                <p className="font-bold text-slate-900 text-sm">{unit.tenantName}</p>
                <p className="text-xs text-slate-500">{unit.address} ({unit.unitNumber})</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t.totalDueLabel}
                </span>
                <p className="text-xl font-black text-rose-700 font-mono">
                  {formatUSD(unit.totalDue)}
                </p>
              </div>
            </div>

            {/* Fila de balances actuales */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">{t.scheduledRentLabel}</span>
                <span className="font-bold text-slate-800 font-mono text-xs sm:text-sm">{formatUSD(unit.scheduledRent)}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">{t.previousDebtLabel}</span>
                <span className="font-bold text-amber-700 font-mono text-xs sm:text-sm">{formatUSD(unit.previousDebt)}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">{t.lateFeesLabel}</span>
                <span className="font-bold text-slate-700 font-mono text-xs sm:text-sm">
                  {formatUSD(Math.max(0, unit.lateFeesScheduled - unit.lateFeesPaid))}
                </span>
              </div>
            </div>
          </div>

          {/* Presets de llenado rápido */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              {t.quickPresets}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset(unit.totalDue)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              >
                {t.presetFullBalance} ({formatUSD(unit.totalDue)})
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(unit.scheduledRent)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              >
                {t.presetRentOnly} ({formatUSD(unit.scheduledRent)})
              </button>
              {unit.previousDebt > 0 && (
                <button
                  type="button"
                  onClick={() => handleApplyPreset(unit.previousDebt)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                >
                  {t.presetDebtOnly} ({formatUSD(unit.previousDebt)})
                </button>
              )}
            </div>
          </div>

          {/* Campo de Monto y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.paymentAmountLabel} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="0.00"
                  required
                />
              </div>
              {errorMsg && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errorMsg}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.paymentMethodLabel}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
              >
                <option value="ACH">ACH / Bank Transfer</option>
                <option value="Check">Check / Cheque</option>
                <option value="CreditCard">Credit / Debit Card</option>
                <option value="WireTransfer">Wire Transfer</option>
                <option value="Cash">Cash / Efectivo</option>
              </select>
            </div>
          </div>

          {/* No. de Referencia y Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.referenceLabel}
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="ej. CHQ-90184 / ACH-4412"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.notesLabel}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ej. Abono acordado según plan de pagos"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Desglose en Cascada de la Amortización (Regla de Negocio) */}
          <div className="p-4 bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-slate-50 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-200/70 pb-2">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-blue-600" />
                {t.amortizationBreakdown}
              </span>
              <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/70 px-2 py-0.5 rounded-full">
                Simulación en Vivo
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Paso 1: Deuda previa */}
              <div className="flex items-center justify-between py-1 bg-white px-3 rounded-lg border border-blue-100">
                <span className="text-slate-600 font-medium">
                  1. {t.amortizedDebtLabel}
                </span>
                <span className="font-mono font-bold text-amber-700">
                  {formatUSD(amortization.amortizedDebt)}
                </span>
              </div>

              {/* Paso 2: Renta Corriente */}
              <div className="flex items-center justify-between py-1 bg-white px-3 rounded-lg border border-blue-100">
                <span className="text-slate-600 font-medium">
                  2. {t.amortizedRentLabel}
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatUSD(amortization.amortizedRent)}
                </span>
              </div>

              {/* Paso 3: Recargos / Extras */}
              {amortization.amortizedLateFee > 0 && (
                <div className="flex items-center justify-between py-1 bg-white px-3 rounded-lg border border-blue-100">
                  <span className="text-slate-600 font-medium">
                    3. Recargos por mora amortizados:
                  </span>
                  <span className="font-mono font-bold text-slate-700">
                    {formatUSD(amortization.amortizedLateFee)}
                  </span>
                </div>
              )}

              {/* Resultado: Saldo que pasará a arrastre */}
              <div className="flex items-center justify-between pt-2 border-t border-blue-200 font-bold">
                <span className="text-slate-900">
                  {t.newCarryoverBalanceLabel}
                </span>
                <span className={`font-mono text-sm ${amortization.projectedCarryover === 0 ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}`}>
                  {formatUSD(amortization.projectedCarryover)}
                </span>
              </div>

              {/* Nuevo estado proyectado */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-700 font-semibold">
                  {t.newProjectedStatusLabel}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(amortization.projectedStatus)}`}>
                  {getStatusText(amortization.projectedStatus)}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.confirmPaymentBtn}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
