/**
 * @license
 * Centro de Notificaciones y Alertas por Correo de Servicios Contratados
 * Gerencia de Informática - Organismo Judicial de Guatemala
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ServicioContratado } from '../../types';
import { 
  calcularMetricasServicio, 
  construirPayloadCorreoAlertaServicio,
  getSemaforoVigenciaVisual,
  getNivelAlertaGestionVisual 
} from '../../utils/serviciosCalculations';
import { 
  Bell, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Send, 
  ExternalLink, 
  Eye, 
  ShieldAlert, 
  Building2, 
  User, 
  FileText, 
  Check, 
  Sparkles,
  Inbox
} from 'lucide-react';

export const ServiciosAlertasView: React.FC<{
  servicios: ServicioContratado[];
}> = ({ servicios }) => {
  const { 
    sendServicioAlertEmail, 
    setSelectedServicio, 
    setIsServicioDetailModalOpen,
    gmailConfig 
  } = useApp();

  const [selectedServicioForPreview, setSelectedServicioForPreview] = useState<ServicioContratado | null>(null);
  const [customEmail, setCustomEmail] = useState(gmailConfig.userEmail || 'kgerardo2003@gmail.com');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [filterThreshold, setFilterThreshold] = useState<'todos' | 'compra_directa' | 'baja_cuantia' | 'licitacion' | 'vencidos'>('todos');

  // Clasificar servicios según las reglas de negocio
  const classifiedAlerts = useMemo(() => {
    const compraDirecta45d: ServicioContratado[] = [];
    const bajaCuantia30d: ServicioContratado[] = [];
    const licitacionCotizacion: ServicioContratado[] = [];
    const vencidos: ServicioContratado[] = [];
    const todosAlertas: ServicioContratado[] = [];

    servicios.forEach((s) => {
      const m = calcularMetricasServicio(s);
      if (m.esVencido) {
        vencidos.push(s);
        todosAlertas.push(s);
      } else if (m.requiereAlertaTemprana) {
        todosAlertas.push(s);
        const mod = (s.modalidad || '').toLowerCase();
        if (mod.includes('compra directa')) {
          compraDirecta45d.push(s);
        } else if (mod.includes('baja cuantía') || mod.includes('baja cuantia')) {
          bajaCuantia30d.push(s);
        } else if (mod.includes('licitación') || mod.includes('cotización') || mod.includes('licitacion') || mod.includes('cotizacion')) {
          licitacionCotizacion.push(s);
        }
      }
    });

    return {
      compraDirecta45d,
      bajaCuantia30d,
      licitacionCotizacion,
      vencidos,
      todosAlertas
    };
  }, [servicios]);

  // Lista según el filtro seleccionado
  const displayServices = useMemo(() => {
    switch (filterThreshold) {
      case 'compra_directa': return classifiedAlerts.compraDirecta45d;
      case 'baja_cuantia': return classifiedAlerts.bajaCuantia30d;
      case 'licitacion': return classifiedAlerts.licitacionCotizacion;
      case 'vencidos': return classifiedAlerts.vencidos;
      case 'todos':
      default:
        return classifiedAlerts.todosAlertas;
    }
  }, [filterThreshold, classifiedAlerts]);

  // Si no hay seleccionado para preview, seleccionar el primero
  const activePreviewService = selectedServicioForPreview || (displayServices.length > 0 ? displayServices[0] : null);

  const previewPayload = useMemo(() => {
    if (!activePreviewService) return null;
    const m = calcularMetricasServicio(activePreviewService);
    return construirPayloadCorreoAlertaServicio(activePreviewService, m);
  }, [activePreviewService]);

  const handleDispatchEmail = async (servicioId: string) => {
    setIsSending(true);
    setSendSuccessMessage(null);
    try {
      const target = customEmail ? [customEmail] : undefined;
      const res = await sendServicioAlertEmail(servicioId, target);
      if (res.success) {
        setSendSuccessMessage(`¡Alerta oficial despachada con éxito a ${customEmail}!`);
        setTimeout(() => setSendSuccessMessage(null), 5000);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tarjetas Superiores de Umbrales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Umbral 1: Compra Directa 45 días */}
        <div 
          onClick={() => setFilterThreshold('compra_directa')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterThreshold === 'compra_directa' ? 'ring-2 ring-rose-500 bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">Compra Directa</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
              Plazo ≤ 45d
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {classifiedAlerts.compraDirecta45d.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">requieren gestión</span>
          </div>
          <p className="text-[11px] text-rose-700 mt-2 font-medium">
            Alerta Crítica: Iniciar nuevo evento inmediato.
          </p>
        </div>

        {/* Umbral 2: Baja Cuantía 30 días */}
        <div 
          onClick={() => setFilterThreshold('baja_cuantia')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterThreshold === 'baja_cuantia' ? 'ring-2 ring-amber-500 bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Baja Cuantía</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              Plazo ≤ 30d
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {classifiedAlerts.bajaCuantia30d.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">en bandeja</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-2 font-medium">
            Notificación institucional a responsables de seguimiento.
          </p>
        </div>

        {/* Umbral 3: Licitación / Cotización 90 - 120 días */}
        <div 
          onClick={() => setFilterThreshold('licitacion')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterThreshold === 'licitacion' ? 'ring-2 ring-indigo-500 bg-indigo-50/70 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Licitación / Cotización</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
              90 / 120d
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {classifiedAlerts.licitacionCotizacion.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">anticipados</span>
          </div>
          <p className="text-[11px] text-indigo-700 mt-2 font-medium">
            Tiempos de bases, Guatecompras y adjudicación.
          </p>
        </div>

        {/* Umbral 4: Vencidos / Críticos */}
        <div 
          onClick={() => setFilterThreshold('vencidos')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterThreshold === 'vencidos' ? 'ring-2 ring-red-600 bg-red-50/80 border-red-300' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-900 uppercase tracking-wider">Contratos Vencidos</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
              0 días
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {classifiedAlerts.vencidos.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">desfasados</span>
          </div>
          <p className="text-[11px] text-red-700 mt-2 font-medium">
            Regularización urgente de expediente requerida.
          </p>
        </div>

      </div>

      {/* Selector de Filtro de Alertas */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 mr-2">Filtrar Alertas:</span>
          <button
            type="button"
            onClick={() => setFilterThreshold('todos')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterThreshold === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas las Alertas ({classifiedAlerts.todosAlertas.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterThreshold('compra_directa')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterThreshold === 'compra_directa' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Compra Directa ≤ 45d ({classifiedAlerts.compraDirecta45d.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterThreshold('baja_cuantia')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterThreshold === 'baja_cuantia' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Baja Cuantía ≤ 30d ({classifiedAlerts.bajaCuantia30d.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterThreshold('licitacion')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterThreshold === 'licitacion' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            Licitación / Cotización ({classifiedAlerts.licitacionCotizacion.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterThreshold('vencidos')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterThreshold === 'vencidos' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100'
            }`}
          >
            Vencidos ({classifiedAlerts.vencidos.length})
          </button>
        </div>

        {sendSuccessMessage && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            {sendSuccessMessage}
          </span>
        )}
      </div>

      {/* Grid Principal: Lista de Alertas a la Izquierda vs Previsualizador de Correo a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Bandeja de Servicios con Alerta */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-slate-600" />
              Servicios en Monitoreo de Alerta ({displayServices.length})
            </h3>
            <span className="text-[10px] text-slate-400">Clic para previsualizar correo</span>
          </div>

          <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
            {displayServices.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                No hay servicios bajo esta categoría de alerta en este momento.
              </div>
            ) : (
              displayServices.map((srv) => {
                const metricas = calcularMetricasServicio(srv);
                const semaforoV = getSemaforoVigenciaVisual(metricas.semaforoVigencia);
                const isSelected = activePreviewService?.id === srv.id;

                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedServicioForPreview(srv)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-1 ring-blue-400' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                          <span className="font-mono font-bold text-slate-700">{srv.codigo}</span>
                          <span>•</span>
                          <span className="truncate">{srv.modalidad}</span>
                          <span>•</span>
                          <span>NOG: {srv.nogExpediente}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {srv.servicioContratado}
                        </h4>
                      </div>

                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${semaforoV.badgeBg} ${semaforoV.badgeText} border ${semaforoV.badgeBorder}`}>
                        {metricas.esVencido ? `${metricas.diasDesfase}d vencido` : `${metricas.diasRestantes}d`}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                      <span className="text-slate-500 truncate max-w-[200px]">
                        👤 {srv.responsableSeguimiento}
                      </span>
                      <span className="font-semibold text-rose-700 text-[10px]">
                        {metricas.mensajeAlertaGestion}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Previsualizador y Despacho de Correo Electrónico */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-amber-500/40">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Generador y Despachador de Alerta por Correo Electrónico
              </span>
            </div>
            {activePreviewService && (
              <button
                type="button"
                onClick={() => {
                  setSelectedServicio(activePreviewService);
                  setIsServicioDetailModalOpen(true);
                }}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Ficha Completa</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {activePreviewService && previewPayload ? (
            <div className="p-5 flex-1 flex flex-col space-y-4">
              
              {/* Barra de Destinatario y Despacho Rápido */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Enviar a Responsable / Autoridad (Correo Electrónico):
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="kgerardo2003@gmail.com"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleDispatchEmail(activePreviewService.id)}
                    disabled={isSending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'Despachando Alerta...' : 'Enviar Alerta Ahora'}</span>
                  </button>
                </div>
              </div>

              {/* Asunto Oficial */}
              <div className="text-xs">
                <span className="font-bold text-slate-500 block mb-0.5">Asunto Oficial:</span>
                <div className="p-2.5 bg-slate-100 rounded-lg font-mono text-xs font-bold text-slate-800 border border-slate-200 select-all">
                  {previewPayload.subject}
                </div>
              </div>

              {/* Vista Previa HTML Renderizada */}
              <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Cuerpo del Correo (Formato Institucional HTML)</span>
                  <span className="text-emerald-700 font-semibold">Membrete Oficial OJ / GIT</span>
                </div>
                <div 
                  className="p-4 max-h-[440px] overflow-y-auto bg-white"
                  dangerouslySetInnerHTML={{ __html: previewPayload.html }}
                />
              </div>

            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 text-xs">
              Seleccione un servicio de la lista izquierda para previsualizar y despachar su alerta por correo.
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
