import React from 'react';
import { JudicaturaRecord } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';
import { Printer, X, CheckCircle2, XCircle } from 'lucide-react';
import { OJLogo } from './OJLogo';

interface BoletaJudicaturasModalProps {
  judicatura: JudicaturaRecord;
  onClose: () => void;
}

export const BoletaJudicaturasModal: React.FC<BoletaJudicaturasModalProps> = ({ judicatura, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const camaraNombre = 
    judicatura.tipoRamo === 'Penal' 
      ? 'Cámara Penal' 
      : judicatura.tipoRamo === 'Civil' 
      ? 'Cámara Civil' 
      : 'Cámara Amparos';

  const estado = judicatura.estadoInauguracion || (judicatura.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');

  // Calcular días de adecuación
  let diasAdecuacion = 0;
  if (judicatura.fechaInicioAdecuaciones && judicatura.fechaFinAdecuaciones) {
    const start = new Date(judicatura.fechaInicioAdecuaciones);
    const end = new Date(judicatura.fechaFinAdecuaciones);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      diasAdecuacion = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const codigoJud = `JUD-${(judicatura.id || '000000').slice(-6).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh]">
        
        {/* Barra de Acciones Superior (No Imprimible) */}
        <div 
          className="p-3 sm:p-4 text-white flex items-center justify-between print:hidden border-b border-indigo-950 shadow-xs"
          style={{ backgroundColor: '#0A0A69' }}
        >
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-white" />
            <span className="font-bold text-xs sm:text-sm">Boleta Oficial de Control Judicaturas</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-900" />
              <span>Imprimir Boleta</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documento Institucional Imprimible */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 text-xs font-sans print:p-0 print:overflow-visible">
          
          {/* Membrete Oficial */}
          <div className="border-b border-slate-300 pb-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OJLogo size="md" variant="full" lightMode={true} />
            </div>

            <div className="text-right border-l-2 border-indigo-900 pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Boleta Oficial de Control</span>
              <span className="text-sm font-mono font-bold text-slate-900 block">JUDICATURAS</span>
              <span className="text-[10px] font-mono text-slate-500 block">{codigoJud}</span>
              <span className="text-[10px] font-bold text-indigo-900 block">{camaraNombre.toUpperCase()}</span>
            </div>
          </div>

          {/* Título del Documento */}
          <div className="text-center my-4 bg-slate-50 py-2 border-y border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
              DICTAMEN Y HOJA DE CONTROL DE JUDICATURA E INFRAESTRUCTURA JUDICIAL
            </h2>
            <p className="text-[10px] text-slate-500 italic mt-0.5">
              Dirección de Servicios de Información y Telecomunicaciones • Gerencia de Informática
            </p>
          </div>

          {/* Bloque 1: Datos Generales de la Sede Judicial */}
          <div className="space-y-4 my-5">
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 p-2 font-bold w-1/4 text-slate-700">Nombre de la Judicatura:</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900" colSpan={3}>
                    {judicatura.nombreJudicatura}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Cámara Institucional:</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      judicatura.tipoRamo === 'Penal' 
                        ? 'bg-purple-100 text-purple-900 border border-purple-300' 
                        : judicatura.tipoRamo === 'Civil' 
                        ? 'bg-blue-100 text-blue-900 border border-blue-300' 
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {camaraNombre}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Estatus de Sede:</td>
                  <td className="border border-slate-300 p-2 font-bold uppercase text-slate-900">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      estado === 'Inaugurado' || estado === 'Finalizado'
                        ? 'bg-emerald-100 text-emerald-800'
                        : estado === 'Reprogramado'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {estado}
                    </span>
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Fecha de Inauguración:</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900 font-mono">
                    {judicatura.fechaInauguracion ? formatDate(judicatura.fechaInauguracion) : 'Pendiente de Definición Oficial'}
                  </td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Período de Adecuaciones:</td>
                  <td className="border border-slate-300 p-2 text-slate-900">
                    Del <strong className="font-mono">{formatDate(judicatura.fechaInicioAdecuaciones)}</strong> al <strong className="font-mono">{formatDate(judicatura.fechaFinAdecuaciones)}</strong>
                    {diasAdecuacion > 0 && <span className="text-slate-500 text-[10px] ml-1">({diasAdecuacion} días)</span>}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Registrado por:</td>
                  <td className="border border-slate-300 p-2 text-slate-800 font-medium">
                    {judicatura.creadoPor || 'Gerencia de Informática'}
                  </td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Fecha de Registro:</td>
                  <td className="border border-slate-300 p-2 text-slate-800 font-mono">
                    {judicatura.fechaCreacion ? formatDate(judicatura.fechaCreacion) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bloque 2: Matriz de Verificación de Infraestructura y Equipamiento Tecnológico */}
          <div className="my-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
              Matriz de Validación y Certificación de Infraestructura Tecnológica:
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                <tr>
                  <th className="border border-slate-300 p-2 text-left w-1/3">Componente Tecnológico</th>
                  <th className="border border-slate-300 p-2 w-28">Estado</th>
                  <th className="border border-slate-300 p-2 text-left">Especificación Técnica Institucional</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                    Equipo de Cómputo
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] ${
                      judicatura.equipoComputo === 'Si'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {judicatura.equipoComputo === 'Si' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {judicatura.equipoComputo === 'Si' ? 'INSTALADO' : 'PENDIENTE'}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-600 text-[11px]">
                    Estaciones de trabajo de escritorio, monitores, periféricos e impresoras funcionales bajo red judicial.
                  </td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                    Equipo de Audio y Grabación
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] ${
                      judicatura.equipoAudio === 'Si'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {judicatura.equipoAudio === 'Si' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {judicatura.equipoAudio === 'Si' ? 'INSTALADO' : 'PENDIENTE'}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-600 text-[11px]">
                    Consolas de audio, microfonía fija, sistema de grabación digital de audiencias y amplificación.
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                    Cableado Estructurado
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] ${
                      judicatura.cableadoEstructurado === 'Si'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {judicatura.cableadoEstructurado === 'Si' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {judicatura.cableadoEstructurado === 'Si' ? 'CERTIFICADO' : 'PENDIENTE'}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-600 text-[11px]">
                    Puntos de red Cat 6A certificados, patch panels, organizadores de cables y gabinete de telecomunicaciones.
                  </td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                    Enlace de Datos y Telecomunicaciones
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] ${
                      judicatura.enlaceDatos === 'Si'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {judicatura.enlaceDatos === 'Si' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {judicatura.enlaceDatos === 'Si' ? 'OPERATIVO' : 'PENDIENTE'}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-600 text-[11px]">
                    Conectividad WAN/VPN corporativa con el Data Center central del Organismo Judicial y acceso a sistemas core.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bloque 3: Bitácora Cronológica de Observaciones y Acciones Técnicas */}
          <div className="my-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
              Bitácora Cronológica de Acciones Técnicas y Seguimiento ({judicatura.observaciones?.length || 0}):
            </h3>
            {(!judicatura.observaciones || judicatura.observaciones.length === 0) ? (
              <div className="p-3 border border-slate-200 rounded text-slate-500 bg-slate-50 italic text-center">
                Sin acciones registradas a la fecha para esta judicatura.
              </div>
            ) : (
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead className="bg-slate-100 font-bold text-slate-800">
                  <tr>
                    <th className="border border-slate-300 p-1.5 w-12 text-center">#</th>
                    <th className="border border-slate-300 p-1.5 w-24 text-center">Fecha</th>
                    <th className="border border-slate-300 p-1.5 w-44 text-left">Responsable / Funcionario</th>
                    <th className="border border-slate-300 p-1.5 text-left">Detalle de Acción / Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {judicatura.observaciones.map((obs, idx) => (
                    <tr key={obs.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-700 font-mono">
                        #{obs.numeroAccion || idx + 1}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px]">
                        {formatDate(obs.fecha)}
                      </td>
                      <td className="border border-slate-300 p-1.5 font-semibold text-slate-800 text-[11px]">
                        {obs.autor || 'Funcionario GIT'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700 leading-relaxed">
                        {obs.texto}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bloque 4: Dictamen de Infraestructura */}
          <div className="my-5 p-3.5 border border-slate-300 rounded bg-slate-50/60">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1">
              Dictamen y Conclusión Técnica Institucional:
            </h4>
            <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
              Se hace constar que la sede judicial <strong className="text-slate-900">{judicatura.nombreJudicatura}</strong> perteneciente a <strong className="text-slate-900">{camaraNombre}</strong> cuenta con un estatus de adecuación e infraestructura correspondiente a <strong className="text-slate-900 uppercase">"{estado}"</strong>. Los servicios de cómputo, audio, cableado y enlace de datos han sido verificados por el personal técnico de la Gerencia de Informática con base en los estándares y normativas vigentes del Organismo Judicial.
            </p>
          </div>

          {/* Bloque 5: Firmas y Sellos Oficiales de Validación Institucional */}
          <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-[11px]">
            <div>
              <div className="border-b border-slate-400 mb-2 h-14" />
              <p className="font-bold text-slate-800">Elaborado por:</p>
              <p className="text-slate-600">{judicatura.creadoPor || 'Analista de Infraestructura'}</p>
              <p className="text-[10px] text-slate-400">Dirección de Servicios de Información</p>
            </div>

            <div>
              <div className="border-b border-slate-400 mb-2 h-14" />
              <p className="font-bold text-slate-800">Visto Bueno (Vo.Bo.):</p>
              <p className="text-slate-600">Subgerencia de Informática</p>
              <p className="text-[10px] text-slate-400">Supervisión Técnica de Adecuación</p>
            </div>

            <div>
              <div className="border-b border-slate-400 mb-2 h-14" />
              <p className="font-bold text-slate-800">Autorizado por:</p>
              <p className="text-slate-600">Gerente de Informática</p>
              <p className="text-[10px] text-slate-400">Organismo Judicial de Guatemala</p>
            </div>
          </div>

          <div className="mt-8 text-center text-[9px] text-slate-400">
            Documento emitido el {formatDateTime(new Date().toISOString())} a través del Sistema de Control de Judicaturas e Infraestructura TI - Organismo Judicial.
          </div>

        </div>

      </div>
    </div>
  );
};
