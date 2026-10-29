import React, { useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Layers, 
  ShieldCheck, 
  HelpCircle,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { formatQuetzales } from '../../utils/formatters';
import { BudgetLineItem, PurchaseRecord } from '../../types';

interface BudgetExecutionKPIProps {
  purchases: PurchaseRecord[];
  budgetAvailability?: BudgetLineItem[];
  isAdmin: boolean;
  userAssignedArea?: string;
}

export const BudgetExecutionKPI: React.FC<BudgetExecutionKPIProps> = ({
  purchases,
  budgetAvailability = [],
  isAdmin,
  userAssignedArea,
}) => {
  // 1. Cálculos consolidados de Presupuesto Asignado vs. Comprometido vs. Pagado
  const executionStats = useMemo(() => {
    // Presupuesto Vigente Total Institucional o del Área
    let totalAsignadoVigente = 0;
    if (budgetAvailability && budgetAvailability.length > 0) {
      totalAsignadoVigente = budgetAvailability.reduce(
        (acc, b) => acc + (Number(b.presupuestoVigente) || 0), 
        0
      );
    }

    // Compras: Total Comprometido, Total Adjudicado y Total Pagado
    let totalComprometido = 0;
    let totalAdjudicado = 0;
    let totalPagado = 0;
    let totalEnEvaluacion = 0;

    purchases.forEach((p) => {
      const monto = Number(p.monto) || 0;
      totalComprometido += monto;
      if (p.estatusEvento === 'Adjudicación') {
        totalAdjudicado += monto;
      } else if (p.estatusEvento === 'Evaluación') {
        totalEnEvaluacion += monto;
      }
      if (p.estadoPago === 'pagado') {
        totalPagado += monto;
      }
    });

    // Si no hay presupuesto availability configurado, estimar un techo de referencia razonable
    if (totalAsignadoVigente === 0) {
      totalAsignadoVigente = Math.max(totalComprometido * 1.35, 1500000);
    }

    const saldoDisponible = Math.max(0, totalAsignadoVigente - totalComprometido);
    
    // Porcentajes de ejecución
    const pctComprometido = totalAsignadoVigente > 0 
      ? Math.min(100, (totalComprometido / totalAsignadoVigente) * 100) 
      : 0;
    const pctAdjudicado = totalAsignadoVigente > 0 
      ? Math.min(100, (totalAdjudicado / totalAsignadoVigente) * 100) 
      : 0;
    const pctPagado = totalAsignadoVigente > 0 
      ? Math.min(100, (totalPagado / totalAsignadoVigente) * 100) 
      : 0;
    const pctDisponible = totalAsignadoVigente > 0 
      ? Math.max(0, (saldoDisponible / totalAsignadoVigente) * 100) 
      : 0;

    // Desglose por Grupo Presupuestario (Grupo 100 Servicios, Grupo 200 Suministros, Grupo 300 Maquinaria y Equipo)
    const grupoDataMap: Record<string, { 
      grupo: string; 
      nombre: string; 
      vigente: number; 
      comprometido: number; 
      adjudicado: number; 
      disponible: number; 
      pctEjecucion: number 
    }> = {
      '100': { grupo: '100', nombre: 'Grupo 100: Servicios No Personales', vigente: 0, comprometido: 0, adjudicado: 0, disponible: 0, pctEjecucion: 0 },
      '200': { grupo: '200', nombre: 'Grupo 200: Materiales y Suministros', vigente: 0, comprometido: 0, adjudicado: 0, disponible: 0, pctEjecucion: 0 },
      '300': { grupo: '300', nombre: 'Grupo 300: Maquinaria y Equipo (TI)', vigente: 0, comprometido: 0, adjudicado: 0, disponible: 0, pctEjecucion: 0 },
    };

    // Distribuir presupuesto vigente por grupo desde budgetAvailability
    budgetAvailability.forEach(b => {
      const g = (b.renglonPresupuestario || '100').charAt(0) + '00';
      if (grupoDataMap[g]) {
        grupoDataMap[g].vigente += (Number(b.presupuestoVigente) || 0);
      }
    });

    // Distribuir compras por grupo
    purchases.forEach(p => {
      const renglon = p.renglonPresupuestario || '158';
      const g = renglon.charAt(0) + '00';
      const monto = Number(p.monto) || 0;
      if (!grupoDataMap[g]) {
        grupoDataMap[g] = { grupo: g, nombre: `Grupo ${g}`, vigente: 0, comprometido: 0, adjudicado: 0, disponible: 0, pctEjecucion: 0 };
      }
      grupoDataMap[g].comprometido += monto;
      if (p.estatusEvento === 'Adjudicación') {
        grupoDataMap[g].adjudicado += monto;
      }
    });

    // Calcular disponibles y porcentajes
    const gruposChartData = Object.values(grupoDataMap).map(g => {
      if (g.vigente === 0) {
        g.vigente = Math.max(g.comprometido * 1.3, 200000);
      }
      g.disponible = Math.max(0, g.vigente - g.comprometido);
      g.pctEjecucion = g.vigente > 0 ? Math.round((g.comprometido / g.vigente) * 100) : 0;
      return g;
    });

    // Datos para el gráfico de dona de estado financiero
    const donutExecutionData = [
      { name: 'Adjudicado', value: totalAdjudicado, color: '#059669', pct: pctAdjudicado },
      { name: 'En Evaluación', value: totalEnEvaluacion, color: '#d97706', pct: totalAsignadoVigente > 0 ? (totalEnEvaluacion / totalAsignadoVigente) * 100 : 0 },
      { name: 'Saldo Disponible', value: saldoDisponible, color: '#2563eb', pct: pctDisponible },
    ].filter(d => d.value > 0);

    return {
      totalAsignadoVigente,
      totalComprometido,
      totalAdjudicado,
      totalEnEvaluacion,
      totalPagado,
      saldoDisponible,
      pctComprometido,
      pctAdjudicado,
      pctPagado,
      pctDisponible,
      gruposChartData,
      donutExecutionData,
    };
  }, [purchases, budgetAvailability]);

  // Color de advertencia o salud de la ejecución presupuestaria
  const executionHealth = useMemo(() => {
    const pct = executionStats.pctComprometido;
    if (pct >= 90) {
      return {
        label: 'Ejecución Crítica / Techo Próximo',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        barColor: '#e11d48',
        icon: AlertTriangle,
        description: 'La asignación comprometida supera el 90% del presupuesto asignado. Se aconseja tramitar ampliación o readecuación presupuestaria.',
      };
    }
    if (pct >= 70) {
      return {
        label: 'Ejecución Moderada / Preventiva',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        barColor: '#d97706',
        icon: TrendingUp,
        description: 'Ritmo adecuado de compromiso del gasto conforme al Plan Anual de Compras y Contrataciones.',
      };
    }
    return {
      label: 'Disponibilidad Presupuestaria Amplia',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      barColor: '#059669',
      icon: CheckCircle2,
      description: 'Existe saldo presupuestario suficiente para respaldar nuevas solicitudes de adquisición de TI.',
    };
  }, [executionStats.pctComprometido]);

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 z-50">
          <p className="font-bold text-slate-100 border-b border-slate-700 pb-1">{data.nombre}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
            <span className="text-slate-400">Presupuesto Vigente:</span>
            <span className="font-bold text-white text-right">{formatQuetzales(data.vigente)}</span>
            <span className="text-amber-400">Comprometido:</span>
            <span className="font-bold text-amber-300 text-right">{formatQuetzales(data.comprometido)}</span>
            <span className="text-emerald-400">Adjudicado:</span>
            <span className="font-bold text-emerald-300 text-right">{formatQuetzales(data.adjudicado)}</span>
            <span className="text-blue-400">Saldo Disponible:</span>
            <span className="font-bold text-blue-300 text-right">{formatQuetzales(data.disponible)}</span>
          </div>
          <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-300 flex justify-between">
            <span>Ejecución del Grupo:</span>
            <strong className="text-amber-400">{data.pctEjecucion}%</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
      
      {/* 1. Encabezado del KPI de Ejecución */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-[#0A0A69] border border-blue-200/80 shadow-2xs shrink-0">
            <Wallet className="w-5 h-5 text-blue-800" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Porcentaje de Ejecución Presupuestaria Actual</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${executionHealth.color}`}>
                <executionHealth.icon className="w-3 h-3" />
                <span>{executionHealth.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin 
                ? 'Monitoreo consolidado del presupuesto vigente vs. fondos comprometidos y adjudicados en TI (OJ)'
                : `Ejecución presupuestaria para el área: ${userAssignedArea || 'Unidad Asignada'}`
              }
            </p>
          </div>
        </div>

        {/* Indicador Numérico Principal de Ejecución */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Tasa de Ejecución Actual
            </span>
            <div className="flex items-baseline justify-end gap-1 font-mono">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {executionStats.pctComprometido.toFixed(1)}%
              </span>
              <span className="text-xs font-bold text-slate-500">vigente</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas Métricas de Valores Presupuestarios */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Presupuesto Asignado Vigente */}
        <div className="bg-slate-50/80 border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Presupuesto Asignado Vigente</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-black text-slate-900 font-mono block">
              {formatQuetzales(executionStats.totalAsignadoVigente)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              100% Techo Institucional
            </span>
          </div>
        </div>

        {/* Presupuesto Comprometido */}
        <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Comprometido (NOGs)</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-black text-amber-900 font-mono block">
              {formatQuetzales(executionStats.totalComprometido)}
            </span>
            <span className="text-[11px] text-amber-700 font-bold block mt-0.5">
              {executionStats.pctComprometido.toFixed(1)}% del techo asignado
            </span>
          </div>
        </div>

        {/* Presupuesto Adjudicado / Conforme */}
        <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Adjudicado a Proveedor</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-black text-emerald-900 font-mono block">
              {formatQuetzales(executionStats.totalAdjudicado)}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
              {executionStats.pctAdjudicado.toFixed(1)}% ya contratado
            </span>
          </div>
        </div>

        {/* Saldo Disponible */}
        <div className="bg-blue-50/50 border border-blue-200 p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Saldo Presupuestario Libre</span>
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-black text-blue-900 font-mono block">
              {formatQuetzales(executionStats.saldoDisponible)}
            </span>
            <span className="text-[11px] text-blue-700 font-bold block mt-0.5">
              {executionStats.pctDisponible.toFixed(1)}% disponible
            </span>
          </div>
        </div>

      </div>

      {/* 3. Gran Barra de Progreso Visual de Ejecución */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Progreso General de Ejecución Presupuestaria</span>
          </span>
          <span className="font-mono text-slate-600 text-[11px]">
            Comprometido: <strong className="text-slate-900">{formatQuetzales(executionStats.totalComprometido)}</strong> de {formatQuetzales(executionStats.totalAsignadoVigente)}
          </span>
        </div>

        {/* Barra segmentada */}
        <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden flex shadow-inner">
          {/* Tramo Adjudicado (Verde) */}
          <div 
            className="bg-emerald-600 h-full transition-all duration-700 flex items-center justify-center text-[9px] font-black text-white"
            style={{ width: `${executionStats.pctAdjudicado}%` }}
            title={`Adjudicado: ${formatQuetzales(executionStats.totalAdjudicado)} (${executionStats.pctAdjudicado.toFixed(1)}%)`}
          >
            {executionStats.pctAdjudicado > 12 && `${executionStats.pctAdjudicado.toFixed(0)}%`}
          </div>

          {/* Tramo En Evaluación / Trámite (Ámbar) */}
          <div 
            className="bg-amber-500 h-full transition-all duration-700 flex items-center justify-center text-[9px] font-black text-white"
            style={{ width: `${Math.max(0, executionStats.pctComprometido - executionStats.pctAdjudicado)}%` }}
            title={`En Proceso: ${formatQuetzales(executionStats.totalEnEvaluacion)}`}
          >
            {executionStats.pctComprometido - executionStats.pctAdjudicado > 12 && 
              `${(executionStats.pctComprometido - executionStats.pctAdjudicado).toFixed(0)}%`
            }
          </div>

          {/* Saldo Libre (Gris / Azul Claro) */}
          <div 
            className="bg-blue-100 h-full transition-all duration-700 flex items-center justify-center text-[9px] font-bold text-blue-800"
            style={{ width: `${executionStats.pctDisponible}%` }}
            title={`Disponible: ${formatQuetzales(executionStats.saldoDisponible)} (${executionStats.pctDisponible.toFixed(1)}%)`}
          >
            {executionStats.pctDisponible > 15 && `Disponible ${executionStats.pctDisponible.toFixed(0)}%`}
          </div>
        </div>

        {/* Leyenda de la barra */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span>Adjudicado ({executionStats.pctAdjudicado.toFixed(1)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>En Evaluación ({(executionStats.pctComprometido - executionStats.pctAdjudicado).toFixed(1)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-200 inline-block" />
              <span>Saldo Libre ({executionStats.pctDisponible.toFixed(1)}%)</span>
            </span>
          </div>

          <span className="text-[10px] text-slate-400 italic">
            Base legal: Ley Orgánica del Presupuesto (Decreto 101-97)
          </span>
        </div>
      </div>

      {/* 4. Gráficas Recharts: Comparativo por Grupo Presupuestario y Donut de Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Gráfico de Barras Recharts: Presupuesto Asignado vs. Comprometido por Grupo */}
        <div className="lg:col-span-8 bg-slate-50/60 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-700" />
                <span>Comparativa por Grupo Presupuestario (Recharts)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Presupuesto Vigente Asignado vs. Comprometido por grupo de gasto (100, 200, 300)
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">
              Grupos 100, 200, 300
            </span>
          </div>

          <div className="w-full h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={executionStats.gruposChartData}
                margin={{ top: 10, right: 15, left: 10, bottom: 20 }}
              >
                <XAxis 
                  dataKey="grupo" 
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  tickFormatter={(val) => `Grupo ${val}`}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={(val) => val >= 1000000 ? `Q${(val/1000000).toFixed(1)}M` : `Q${(val/1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  formatter={(value) => <span className="text-slate-700 font-semibold">{value}</span>}
                />
                <Bar 
                  dataKey="vigente" 
                  name="Presupuesto Asignado" 
                  fill="#94A3B8" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36} 
                />
                <Bar 
                  dataKey="comprometido" 
                  name="Comprometido Actual" 
                  fill="#0A0A69" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36} 
                />
                <Bar 
                  dataKey="adjudicado" 
                  name="Adjudicado Efectivo" 
                  fill="#059669" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Donut Recharts: Composición Financiera del Presupuesto */}
        <div className="lg:col-span-4 bg-slate-50/60 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-blue-700" />
                <span>Distribución del Techo</span>
              </h4>
              <p className="text-[10px] text-slate-500">
                Adjudicado vs Trámite vs Saldo
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
              {executionStats.pctComprometido.toFixed(0)}% Utilizado
            </span>
          </div>

          <div className="w-full h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={executionStats.donutExecutionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {executionStats.donutExecutionData.map((entry, index) => (
                    <Cell key={`exec-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any, name: any) => [`${formatQuetzales(Number(val))}`, name]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Texto en el centro del Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-black font-mono text-slate-900">
                {executionStats.pctComprometido.toFixed(0)}%
              </span>
              <span className="text-[8px] font-bold uppercase text-slate-400">
                Ejecutado
              </span>
            </div>
          </div>

          {/* Desglose rápido con cifras claras */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/80 text-[11px]">
            {executionStats.donutExecutionData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span>{d.name}:</span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {formatQuetzales(d.value)} <span className="text-slate-400 text-[10px]">({d.pct.toFixed(0)}%)</span>
                </span>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
