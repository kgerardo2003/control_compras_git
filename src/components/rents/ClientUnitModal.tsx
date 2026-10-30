import React, { useState, useEffect, useMemo } from 'react';
import { 
  RentalUnit, 
  PropertyLocation, 
  UnitOccupancyStatus, 
  AppLanguage 
} from '../../types/rents';
import { RENT_TRANSLATIONS } from '../../locales/rentsTranslations';
import { enrichUnit, formatUSD } from '../../utils/rentsCalculations';
import { 
  X, 
  Building2, 
  DollarSign, 
  Users, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Trash2, 
  Clock, 
  Percent, 
  Sparkles,
  Home
} from 'lucide-react';

interface ClientUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (unit: RentalUnit) => void;
  onDelete?: (unitId: string) => void;
  unitToEdit?: RentalUnit | null;
  defaultLocation?: PropertyLocation | 'Global';
  language: AppLanguage;
}

export const ClientUnitModal: React.FC<ClientUnitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  unitToEdit,
  defaultLocation = 'CA',
  language,
}) => {
  const t = RENT_TRANSLATIONS[language];
  const isEditing = Boolean(unitToEdit);

  // Tab activo dentro del formulario modal
  const [activeTab, setActiveTab] = useState<'general' | 'financials' | 'metrics'>('general');

  // Estados del formulario
  const [location, setLocation] = useState<PropertyLocation>('CA');
  const [unitNumber, setUnitNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [unitStatus, setUnitStatus] = useState<UnitOccupancyStatus>('Occupied');
  
  // Datos del inquilino / cliente
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [vacantMonths, setVacantMonths] = useState(0);

  // Parámetros financieros
  const [scheduledRent, setScheduledRent] = useState(1500);
  const [previousDebt, setPreviousDebt] = useState(0);
  const [actualCollected, setActualCollected] = useState(0);
  const [lateFeesScheduled, setLateFeesScheduled] = useState(0);
  const [lateFeesPaid, setLateFeesPaid] = useState(0);
  const [utilitiesScheduled, setUtilitiesScheduled] = useState(0);
  const [utilitiesPaid, setUtilitiesPaid] = useState(0);

  // Métricas operativas individuales que calibran el Scorecard de KPIs
  const [maintenanceDaysAvg, setMaintenanceDaysAvg] = useState(1.5);
  const [billingAccuracyRate, setBillingAccuracyRate] = useState(100);
  const [tenantRetentionRate, setTenantRetentionRate] = useState(85);

  // Confirmación de eliminación
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sincronizar campos cuando se abre o cambia la unidad a editar
  useEffect(() => {
    if (unitToEdit) {
      setLocation(unitToEdit.location);
      setUnitNumber(unitToEdit.unitNumber || unitToEdit.id);
      setAddress(unitToEdit.address);
      setCity(unitToEdit.city);
      setUnitStatus(unitToEdit.unitStatus);
      setTenantName(unitToEdit.tenantName);
      setTenantEmail(unitToEdit.tenantEmail || '');
      setTenantPhone(unitToEdit.tenantPhone || '');
      setLeaseStart(unitToEdit.leaseStart || '2026-01-01');
      setLeaseEnd(unitToEdit.leaseEnd || '2026-12-31');
      setVacantMonths(unitToEdit.vacantMonths || 0);

      setScheduledRent(unitToEdit.scheduledRent || 0);
      setPreviousDebt(unitToEdit.previousDebt || 0);
      setActualCollected(unitToEdit.actualCollected || 0);
      setLateFeesScheduled(unitToEdit.lateFeesScheduled || 0);
      setLateFeesPaid(unitToEdit.lateFeesPaid || 0);
      setUtilitiesScheduled(unitToEdit.utilitiesScheduled || 0);
      setUtilitiesPaid(unitToEdit.utilitiesPaid || 0);

      setMaintenanceDaysAvg(unitToEdit.maintenanceDaysAvg ?? 1.8);
      setBillingAccuracyRate(unitToEdit.billingAccuracyRate ?? 98);
      setTenantRetentionRate(unitToEdit.tenantRetentionRate ?? 85);
    } else {
      // Valores por defecto al registrar nuevo inquilino / unidad
      const initialLoc = defaultLocation === 'Global' ? 'CA' : defaultLocation;
      setLocation(initialLoc);
      setUnitNumber(`UNIT-${Math.floor(100 + Math.random() * 900)}`);
      setAddress(initialLoc === 'CA' ? '1040 Sunset Blvd' : initialLoc === 'OKC' ? '742 Broadway Ave' : 'Diagonal 6, 12-42 Zona 10');
      setCity(initialLoc === 'CA' ? 'Los Angeles, CA' : initialLoc === 'OKC' ? 'Oklahoma City, OK' : 'Ciudad de Guatemala');
      setUnitStatus('Occupied');
      setTenantName('');
      setTenantEmail('');
      setTenantPhone('');
      setLeaseStart('2026-01-01');
      setLeaseEnd('2026-12-31');
      setVacantMonths(0);

      setScheduledRent(initialLoc === 'CA' ? 2450 : initialLoc === 'OKC' ? 1450 : 1200);
      setPreviousDebt(0);
      setActualCollected(0);
      setLateFeesScheduled(0);
      setLateFeesPaid(0);
      setUtilitiesScheduled(0);
      setUtilitiesPaid(0);

      setMaintenanceDaysAvg(1.5);
      setBillingAccuracyRate(100);
      setTenantRetentionRate(90);
    }
    setActiveTab('general');
    setShowDeleteConfirm(false);
  }, [unitToEdit, defaultLocation, isOpen]);

  // Previsualización contable calculada en vivo
  const liveEnriched = useMemo(() => {
    const raw: RentalUnit = {
      id: unitToEdit ? unitToEdit.id : `${location}-${unitNumber.replace(/\s+/g, '')}`,
      unitNumber: unitNumber.trim() || 'Unit 101',
      address: address.trim() || 'Address Pending',
      city: city.trim() || 'City Pending',
      location,
      unitStatus,
      tenantName: unitStatus === 'Vacant' ? (language === 'es' ? 'Unidad Desocupada' : 'Vacant Unit') : (tenantName.trim() || (language === 'es' ? 'Inquilino por Asignar' : 'Unassigned Tenant')),
      tenantEmail: tenantEmail.trim() || undefined,
      tenantPhone: tenantPhone.trim() || undefined,
      leaseStart,
      leaseEnd,
      vacantMonths: unitStatus === 'Vacant' ? Math.max(1, Number(vacantMonths) || 1) : 0,
      scheduledRent: Number(scheduledRent) || 0,
      previousDebt: Number(previousDebt) || 0,
      actualCollected: Number(actualCollected) || 0,
      lateFeesScheduled: Number(lateFeesScheduled) || 0,
      lateFeesPaid: Number(lateFeesPaid) || 0,
      utilitiesScheduled: Number(utilitiesScheduled) || 0,
      utilitiesPaid: Number(utilitiesPaid) || 0,
      maintenanceDaysAvg: Number(maintenanceDaysAvg) || 1.5,
      billingAccuracyRate: Number(billingAccuracyRate) || 100,
      tenantRetentionRate: Number(tenantRetentionRate) || 85,
      paymentStatus: 'Delinquent',
      totalDue: 0,
      carryoverBalance: 0,
      paymentHistory: unitToEdit ? unitToEdit.paymentHistory : [],
    };
    return enrichUnit(raw);
  }, [
    unitToEdit,
    location,
    unitNumber,
    address,
    city,
    unitStatus,
    tenantName,
    tenantEmail,
    tenantPhone,
    leaseStart,
    leaseEnd,
    vacantMonths,
    scheduledRent,
    previousDebt,
    actualCollected,
    lateFeesScheduled,
    lateFeesPaid,
    utilitiesScheduled,
    utilitiesPaid,
    maintenanceDaysAvg,
    billingAccuracyRate,
    tenantRetentionRate,
    language
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(liveEnriched);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">● {t.statusPaid}</span>;
      case 'Partial':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">● {t.statusPartial}</span>;
      case 'Delinquent':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">● {t.statusDelinquent}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">○ {t.statusVacant}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-amber-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {isEditing ? t.clientUnitModalTitleEdit : t.clientUnitModalTitleNew}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  {location}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                {t.clientUnitModalSub}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pestañas / Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-950 font-black bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.tabGeneral}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financials')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'financials'
                ? 'border-indigo-600 text-indigo-950 font-black bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.tabFinancials}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'metrics'
                ? 'border-indigo-600 text-indigo-950 font-black bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>{t.tabMetrics}</span>
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 flex-1">
          
          {/* TAB 1: DATOS GENERALES E INQUILINO */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Sede */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.locationLabel} *
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value as PropertyLocation)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-600 bg-white"
                  >
                    <option value="CA">California (CA)</option>
                    <option value="OKC">Oklahoma City (OKC)</option>
                    <option value="GT">Guatemala (GT)</option>
                  </select>
                </div>

                {/* Número / Código de Unidad */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.unitNumberLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="ej. Unit 302 o CA-005"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                {/* Estado de Ocupación */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.occupancyStatusLabel} *
                  </label>
                  <select
                    value={unitStatus}
                    onChange={(e) => setUnitStatus(e.target.value as UnitOccupancyStatus)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-600 bg-white"
                  >
                    <option value="Occupied">{t.statusOccupied}</option>
                    <option value="Vacant">{t.statusVacant}</option>
                  </select>
                </div>
              </div>

              {/* Dirección y Ciudad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.addressLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ej. 8450 Wilshire Blvd"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.cityLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="ej. Beverly Hills, CA 90211"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Bloque Condicional: Si está Ocupada, pedir datos del Cliente / Inquilino */}
              {unitStatus === 'Occupied' ? (
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-indigo-200/60 pb-2">
                    <Users className="w-4 h-4 text-indigo-700" />
                    <h4 className="text-xs font-black uppercase text-indigo-950">
                      Datos del Arrendatario / Inquilino Titular
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.tenantNameLabel} *
                      </label>
                      <input
                        type="text"
                        required
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="Nombre y Apellidos"
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.tenantEmailLabel}
                      </label>
                      <input
                        type="email"
                        value={tenantEmail}
                        onChange={(e) => setTenantEmail(e.target.value)}
                        placeholder="inquilino@email.com"
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.tenantPhoneLabel}
                      </label>
                      <input
                        type="tel"
                        value={tenantPhone}
                        onChange={(e) => setTenantPhone(e.target.value)}
                        placeholder="+1 (555) 019-2831"
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.leaseStartLabel}
                      </label>
                      <input
                        type="date"
                        value={leaseStart}
                        onChange={(e) => setLeaseStart(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600 bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.leaseEndLabel}
                      </label>
                      <input
                        type="date"
                        value={leaseEnd}
                        onChange={(e) => setLeaseEnd(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600 bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Bloque si está Vacante */
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-slate-600" />
                    <h4 className="text-xs font-bold uppercase text-slate-800">
                      Unidad Vacante / En Comercialización
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Al marcar la unidad como vacante, el sistema asignará el estatus contable "Vacant" y alimentará el KPI de Tasa de Ocupación y Meses Vacantes.
                  </p>
                  <div className="max-w-xs pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.vacantMonthsLabel}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={48}
                      value={vacantMonths}
                      onChange={(e) => setVacantMonths(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PARÁMETROS FINANCIEROS Y RENTA */}
          {activeTab === 'financials' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Estos valores determinan automáticamente la <strong>Tasa Efectiva de Cobranza</strong>, el saldo a arrastrar (Carryover Balance) y el estado contable de pago (Pagado, Parcial o En Mora).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Renta Programada */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.scheduledRentLabel} ($USD) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    required
                    value={scheduledRent}
                    onChange={(e) => setScheduledRent(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                {/* Deuda Previa Insoluta */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.previousDebtLabel} ($USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={previousDebt}
                    onChange={(e) => setPreviousDebt(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-600 text-rose-700"
                  />
                </div>

                {/* Monto Recaudado Efectivo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.colCollected} ($USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={actualCollected}
                    onChange={(e) => setActualCollected(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-600 text-emerald-700"
                  />
                </div>
              </div>

              {/* Recargos y Servicios Básicos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Mora Programada ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={lateFeesScheduled}
                    onChange={(e) => setLateFeesScheduled(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Mora Pagada ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={lateFeesPaid}
                    onChange={(e) => setLateFeesPaid(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Servicios Prog. ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={utilitiesScheduled}
                    onChange={(e) => setUtilitiesScheduled(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Servicios Pagados ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={utilitiesPaid}
                    onChange={(e) => setUtilitiesPaid(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono text-emerald-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INDICADORES OPERATIVOS (KPIS) */}
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900">
                <p>
                  Estos parámetros operativos calibran directamente el <strong>Scorecard de 10 KPIs</strong> institucional: KPI 5 (Tiempo de Mantenimiento), KPI 6 (Precisión de Facturación) y KPI 8 (Retención de Inquilinos).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1.5 text-slate-700">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <label className="text-xs font-bold">
                      {t.maintenanceDaysAvgLabel}
                    </label>
                  </div>
                  <input
                    type="number"
                    min={0.1}
                    max={30}
                    step={0.1}
                    value={maintenanceDaysAvg}
                    onChange={(e) => setMaintenanceDaysAvg(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Meta institucional: &le; 2.0 días</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1.5 text-slate-700">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    <label className="text-xs font-bold">
                      {t.billingAccuracyRateLabel}
                    </label>
                  </div>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    step={0.5}
                    value={billingAccuracyRate}
                    onChange={(e) => setBillingAccuracyRate(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Meta institucional: &ge; 98.0%</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1.5 text-slate-700">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <label className="text-xs font-bold">
                      {t.tenantRetentionRateLabel}
                    </label>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={tenantRetentionRate}
                    onChange={(e) => setTenantRetentionRate(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Meta institucional: &ge; 80.0%</span>
                </div>
              </div>
            </div>
          )}

          {/* CUADRO INFERIOR DE PREVISUALIZACIÓN CONTABLE EN TIEMPO REAL */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-inner border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                {t.liveCalculationPreview}
              </span>
              <span>{getStatusBadge(liveEnriched.paymentStatus)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">{t.totalDueLabel}</span>
                <span className="font-mono font-bold text-white text-sm">{formatUSD(liveEnriched.totalDue)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{t.colCollected}</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{formatUSD(liveEnriched.actualCollected)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{t.newCarryoverBalanceLabel}</span>
                <span className="font-mono font-bold text-amber-300 text-sm">{formatUSD(liveEnriched.carryoverBalance)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{t.colPaymentStatus}</span>
                <span className="font-mono font-bold text-white text-sm">{liveEnriched.paymentStatus}</span>
              </div>
            </div>
          </div>

          {/* Mensaje de confirmación de eliminación si está activo */}
          {showDeleteConfirm && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{t.deleteUnitConfirmTitle}</span>
              </div>
              <p className="text-xs text-rose-800">
                {t.deleteUnitConfirmMsg}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (unitToEdit && onDelete) {
                      onDelete(unitToEdit.id);
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Sí, Eliminar Definitivamente
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="w-full sm:w-auto px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.deleteUnitBtn}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {t.cancelBtn}
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-indigo-700 to-indigo-900 hover:from-indigo-800 hover:to-indigo-950 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t.saveUnitBtn}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
