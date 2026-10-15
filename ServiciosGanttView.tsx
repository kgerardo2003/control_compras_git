/**
 * @license
 * Vista Cronograma / Diagrama de Gantt Mensualizado de Servicios Contratados
 * Gerencia de Informática - Organismo Judicial de Guatemala
 */

import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ServicioContratado } from '../../types';
import { 
  calcularMetricasServicio, 
  parseDateToMidnight, 
  diffInCalendarDays 
} from '../../utils/serviciosCalculations';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Eye, 
  Filter, 
  Info, 
  Search, 
  Sparkles,
  Flag
} from 'lucide-react';

interface MonthHeader {
  year: number;
  month: number; // 0-11
  label: string;
  startDate: Date;
  endDate: Date;
  days: number;
}

export const ServiciosGanttView: React.FC<{
  serviciosFiltrados: ServicioContratado[];
}> = ({ serviciosFiltrados }) => {
  const { setSelectedServicio, setIsServicioDetailModalOpen } = useApp();

  const [zoomRange, setZoomRange] = useState<'12m' | '24m'>('12m');
  const [offsetMonths, setOffsetMonths] = useState(0);

  // Calcular el rango mensual a mostrar
  const { months, totalDays, startTimelineDate, endTimelineDate } = useMemo(() => {
    const today = new Date();
    // Iniciar 3 meses atrás para ver contratos recientes y 9 o 21 meses hacia el futuro
    const startMonth = new Date(today.getFullYear(), today.getMonth() - 2 + offsetMonths, 1);
    const monthsCount = zoomRange === '12m' ? 12 : 24;

    const mList: MonthHeader[] = [];
    let current = new Date(startMonth);

    for (let i = 0; i < monthsCount; i++) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // último día del mes
      const days = endDate.getDate();

      const label = startDate.toLocaleDateString('es-GT', { month: 'short', year: '2-digit' }).toUpperCase();

      mList.push({
        year,
        month,
        label,
        startDate,
        endDate,
        days
      });

      current.setMonth(current.getMonth() + 1);
    }

    const startTimeline = mList[0].startDate;
    const endTimeline = mList[mList.length - 1].endDate;
    const total = diffInCalendarDays(startTimeline, endTimeline) + 1;

    return {
      months: mList,
      totalDays: total,
      startTimelineDate: startTimeline,
      endTimelineDate: endTimeline
    };
  }, [zoomRange, offsetMonths]);

  // Posición de la línea de HOY
  const todayPositionPercent = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < startTimelineDate || today > endTimelineDate) {
      return null;
    }
    const daysFromStart = diffInCalendarDays(startTimelineDate, today);
    return (daysFromStart / totalDays) * 100;
  }, [startTimelineDate, endTimelineDate, totalDays]);

  // Función para calcular porcentaje de inicio y ancho de barra para un servicio
  const getBarPosition = (servicio: ServicioContratado) => {
    const inicio = parseDateToMidnight(servicio.inicioVigencia) || startTimelineDate;
    const fin = parseDateToMidnight(servicio.finVigencia) || endTimelineDate;

    // Ajustar dentro del visor
    const clampedStart = inicio < startTimelineDate ? startTimelineDate : inicio;
    const clampedEnd = fin > endTimelineDate ? endTimelineDate : fin;

    if (clampedEnd < startTimelineDate || clampedStart > endTimelineDate) {
      return null; // Fuera del rango visible
    }

    const startOffsetDays = Math.max(0, diffInCalendarDays(startTimelineDate, clampedStart));
    const durationDays = Math.max(1, diffInCalendarDays(clampedStart, clampedEnd) + 1);

    const leftPercent = (startOffsetDays / totalDays) * 100;
    const widthPercent = (durationDays / totalDays) * 100;

    // Posición del marcador de fecha estimada de nueva gestión
    let gestionMarkerPercent: number | null = null;
    if (servicio.fechaInicioGestion) {
      const fGestion = parseDateToMidnight(servicio.fechaInicioGestion);
      if (fGestion && fGestion >= startTimelineDate && fGestion <= endTimelineDate) {
        const gDays = diffInCalendarDays(startTimelineDate, fGestion);
        gestionMarkerPercent = (gDays / totalDays) * 100;
      }
    }

    return {
      leftPercent,
      widthPercent,
      gestionMarkerPercent,
      startsBefore: inicio < startTimelineDate,
      endsAfter: fin > endTimelineDate
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Barra de Controles del Cronograma */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-900" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Cronograma Mensualizado de Contratos (Línea de Tiempo)
            </h3>
            <p className="text-xs text-slate-500">
              Vigencias contractuales, marcador actual de HOY y fecha estimada de nueva adquisición
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegación temporal */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setOffsetMonths(prev => prev - 3)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="3 meses atrás"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOffsetMonths(0)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setOffsetMonths(prev => prev + 3)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="3 meses adelante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Rango de vista */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setZoomRange('12m')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                zoomRange === '12m' ? 'bg-blue-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              12 Meses
            </button>
            <button
              type="button"
              onClick={() => setZoomRange('24m')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                zoomRange === '24m' ? 'bg-blue-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              24 Meses
            </button>
          </div>
        </div>
      </div>

      {/* Leyenda rápida */}
      <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-600">Semáforos:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-2xs" />
            <span className="text-slate-700 font-medium">Vigente (&gt;60d)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-2xs" />
            <span className="text-slate-700 font-medium">Por Vencer (31-60d)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-2xs" />
            <span className="text-slate-700 font-medium">Urgente (1-30d)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 shadow-2xs" />
            <span className="text-slate-700 font-medium">Vencido (0d)</span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
          <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold">
            <span className="w-2.5 h-2.5 border-l-2 border-dashed border-rose-600 inline-block" />
            Línea Fecha Actual (HOY)
          </span>
          <span className="inline-flex items-center gap-1.5 text-blue-900 font-bold">
            <Flag className="w-3.5 h-3.5 text-blue-900 fill-blue-900" />
            Inicio Estimado de Gestión
          </span>
        </div>
      </div>

      {/* Contenedor del Diagrama con Scroll Horizontal */}
      <div className="overflow-x-auto">
        <div className="min-w-[950px] relative">
          
          {/* Cabecera con Columnas de Meses */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
            {/* Columna fija de Nombre de Servicio */}
            <div className="w-72 flex-shrink-0 p-3 font-bold text-xs text-slate-700 border-r border-slate-200 bg-slate-100 flex items-center justify-between">
              <span>Servicio / Expediente</span>
              <span className="text-[10px] text-slate-400 font-normal">({serviciosFiltrados.length})</span>
            </div>

            {/* Meses */}
            <div className="flex-1 flex relative">
              {months.map((m, idx) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className={`flex-1 p-2 text-center text-[11px] font-bold border-r border-slate-200 select-none ${
                    m.month === new Date().getMonth() && m.year === new Date().getFullYear()
                      ? 'bg-amber-50/80 text-amber-900'
                      : 'text-slate-600'
                  }`}
                >
                  <div>{m.label}</div>
                  <div className="text-[9px] text-slate-400 font-normal">{m.days}d</div>
                </div>
              ))}
            </div>
          </div>

          {/* Filas de Servicios */}
          <div className="divide-y divide-slate-100 relative">
            
            {/* Línea Vertical Marcador HOY */}
            {todayPositionPercent !== null && (
              <div 
                className="absolute top-0 bottom-0 z-10 pointer-events-none flex flex-col items-center"
                style={{ left: `calc(18rem + (100% - 18rem) * ${todayPositionPercent / 100})` }}
              >
                <div className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md -translate-y-1 z-20">
                  HOY
                </div>
                <div className="w-0.5 h-full bg-rose-600/80 border-l border-dashed border-rose-600" />
              </div>
            )}

            {serviciosFiltrados.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No se encontraron servicios contratados con los filtros seleccionados.
              </div>
            ) : (
              serviciosFiltrados.map((servicio) => {
                const metricas = calcularMetricasServicio(servicio);
                const pos = getBarPosition(servicio);

                // Determinar color de barra según semáforo de vigencia
                let barColorClass = 'bg-emerald-500 hover:bg-emerald-600';
                if (metricas.semaforoVigencia === 'rojo') barColorClass = 'bg-rose-600 hover:bg-rose-700';
                else if (metricas.semaforoVigencia === 'naranja') barColorClass = 'bg-orange-500 hover:bg-orange-600';
                else if (metricas.semaforoVigencia === 'amarillo') barColorClass = 'bg-amber-500 hover:bg-amber-600';

                return (
                  <div 
                    key={servicio.id}
                    className="flex items-center hover:bg-slate-50/80 transition-colors group relative h-14"
                  >
                    {/* Columna Izquierda: Información del Contrato */}
                    <div className="w-72 flex-shrink-0 p-3 border-r border-slate-200 bg-white group-hover:bg-slate-50/80 transition-colors z-10 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-800 truncate" title={servicio.servicioContratado}>
                          {servicio.servicioContratado}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedServicio(servicio);
                            setIsServicioDetailModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-blue-900 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Ver Ficha Detallada"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono font-semibold text-slate-700">{servicio.codigo}</span>
                        <span>•</span>
                        <span>{servicio.modalidad}</span>
                        <span>•</span>
                        <span className={metricas.esVencido ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {metricas.esVencido ? `${metricas.diasDesfase}d vencido` : `${metricas.diasRestantes}d`}
                        </span>
                      </div>
                    </div>

                    {/* Área Gráfica del Cronograma */}
                    <div className="flex-1 relative h-full flex items-center px-1">
                      
                      {/* Líneas guía de fondo por mes */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {months.map((m) => (
                          <div key={m.label} className="flex-1 border-r border-slate-100 h-full" />
                        ))}
                      </div>

                      {/* Barra Horizontal del Contrato */}
                      {pos ? (
                        <div
                          onClick={() => {
                            setSelectedServicio(servicio);
                            setIsServicioDetailModalOpen(true);
                          }}
                          className={`absolute h-7 rounded-lg shadow-2xs transition-all duration-200 cursor-pointer flex items-center px-2 text-white text-[11px] font-bold select-none ${barColorClass} group-hover:ring-2 group-hover:ring-blue-500/50`}
                          style={{
                            left: `${pos.leftPercent}%`,
                            width: `${Math.max(2, pos.widthPercent)}%`
                          }}
                          title={`${servicio.servicioContratado}\nVigencia: ${servicio.inicioVigencia} al ${servicio.finVigencia}\nDías restantes: ${metricas.diasRestantes}\nAcción: ${servicio.accionRequerida}`}
                        >
                          {/* Contenido dentro de la barra si el ancho lo permite */}
                          <span className="truncate max-w-full drop-shadow-xs">
                            {pos.widthPercent > 12 && `${servicio.finVigencia}`}
                            {pos.widthPercent > 20 && ` • ${metricas.porcentajeConsumido}% consumido`}
                          </span>

                          {/* Marcador de Inicio de Nueva Gestión */}
                          {pos.gestionMarkerPercent !== null && (
                            <div 
                              className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-30"
                              style={{
                                left: `${((pos.gestionMarkerPercent - pos.leftPercent) / pos.widthPercent) * 100}%`
                              }}
                              title={`Fecha inicio nueva gestión: ${servicio.fechaInicioGestion}`}
                            >
                              <div className="p-1 rounded-full bg-slate-900 text-amber-400 ring-2 ring-white shadow-md">
                                <Flag className="w-3 h-3 fill-amber-400" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic pl-3">
                          Fuera del rango visible ({servicio.inicioVigencia} - {servicio.finVigencia})
                        </div>
                      )}

                    </div>
                  </div>
                );
              })
            )}

          </div>

        </div>
      </div>

    </div>
  );
};
