import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  Search, 
  Eye, 
  User, 
  FileSpreadsheet,
  X
} from 'lucide-react';
import { AuditLogEntry } from '../types';
import { formatDateTime, exportToCSV } from '../utils/formatters';

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  'LOGIN': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'LOGOUT': { bg: 'bg-slate-100', text: 'text-slate-800' },
  'CREAR_COMPRA': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'EDITAR_COMPRA': { bg: 'bg-amber-100', text: 'text-amber-800' },
  'CAMBIO_ESTATUS': { bg: 'bg-amber-100', text: 'text-amber-800' },
  'ELIMINAR_COMPRA': { bg: 'bg-rose-100', text: 'text-rose-800' },
  'CREAR_CATALOGO': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'EDITAR_CATALOGO': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'CREAR_USUARIO': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'EDITAR_USUARIO': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'EXPORTAR_DATOS': { bg: 'bg-slate-100', text: 'text-slate-800' },
  'RESTAURAR_DATOS': { bg: 'bg-orange-100', text: 'text-orange-800' },
};

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('todos');
  const [filterModule, setFilterModule] = useState('todos');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchUser = log.usuario.toLowerCase().includes(q);
        const matchDetalles = log.detalles.toLowerCase().includes(q);
        const matchIp = log.ip.includes(q);
        if (!matchUser && !matchDetalles && !matchIp) return false;
      }
      if (filterAction !== 'todos' && log.accion !== filterAction) return false;
      if (filterModule !== 'todos' && log.modulo !== filterModule) return false;
      return true;
    });
  }, [auditLogs, searchTerm, filterAction, filterModule]);

  const handleExportAuditCSV = () => {
    const rows = filteredLogs.map(l => ({
      ID: l.id,
      'Fecha y Hora': formatDateTime(l.fecha),
      Usuario: l.usuario,
      Rol: l.rol,
      Acción: l.accion,
      Módulo: l.modulo,
      Detalles: l.detalles,
      'ID Registro': l.registroId || 'N/A',
      'Dirección IP': l.ip,
    }));
    exportToCSV(`Bitacora_Auditoria_GIT_OJ_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Módulo de Auditoría (Professional Polish) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Registro y Bitácora de Auditoría
          </h2>
          <p className="text-xs text-slate-500">
            Trazabilidad inmutable de transacciones, modificaciones de compras y eventos
          </p>
        </div>

        <button
          id="btn-export-audit-csv"
          type="button"
          onClick={handleExportAuditCSV}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-black" />
          <span>Exportar Bitácora CSV</span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
        
        {/* Búsqueda */}
        <div className="sm:col-span-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuario, detalles o IP..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Filtro Acción */}
        <div className="sm:col-span-3">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-700"
          >
            <option value="todos">Todas las Acciones</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREAR_COMPRA">CREAR COMPRA</option>
            <option value="EDITAR_COMPRA">EDITAR COMPRA</option>
            <option value="CAMBIO_ESTATUS">CAMBIO ESTATUS</option>
            <option value="ELIMINAR_COMPRA">ELIMINAR COMPRA</option>
            <option value="CREAR_CATALOGO">CREAR CATÁLOGO</option>
            <option value="CREAR_USUARIO">CREAR USUARIO</option>
            <option value="EXPORTAR_DATOS">EXPORTAR DATOS</option>
          </select>
        </div>

        {/* Filtro Módulo */}
        <div className="sm:col-span-3">
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-700"
          >
            <option value="todos">Todos los Módulos</option>
            <option value="Autenticación">Autenticación</option>
            <option value="Compras">Compras</option>
            <option value="Catálogos">Catálogos</option>
            <option value="Usuarios">Usuarios</option>
            <option value="Auditoría">Auditoría</option>
            <option value="Dashboard">Dashboard</option>
          </select>
        </div>

      </div>

      {/* Tabla de Registros de Auditoría */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-3 py-3">Usuario</th>
                <th className="px-3 py-3 text-center">Acción</th>
                <th className="px-3 py-3">Módulo</th>
                <th className="px-4 py-3">Detalles</th>
                <th className="px-3 py-3">IP</th>
                <th className="px-3 py-3 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actionStyle = ACTION_COLORS[log.accion] || { bg: 'bg-slate-100', text: 'text-slate-800' };
                  const hasDiff = log.valoresAnteriores || log.valoresNuevos;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      
                      {/* Fecha y Hora */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {formatDateTime(log.fecha)}
                      </td>

                      {/* Usuario */}
                      <td className="px-3 py-3 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.usuario}</span>
                        </div>
                      </td>

                      {/* Acción */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${actionStyle.bg} ${actionStyle.text}`}>
                          {log.accion}
                        </span>
                      </td>

                      {/* Módulo */}
                      <td className="px-3 py-3 whitespace-nowrap font-semibold text-slate-600">
                        {log.modulo}
                      </td>

                      {/* Detalles */}
                      <td className="px-4 py-3 text-slate-700 max-w-md">
                        <p className="line-clamp-2">{log.detalles}</p>
                      </td>

                      {/* IP */}
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {log.ip}
                      </td>

                      {/* Botón Ver Detalle */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {hasDiff ? (
                          <button
                            type="button"
                            onClick={() => setSelectedEntry(log)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Diff</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Auditoría / Diff de Valores */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Trazabilidad de Auditoría #{selectedEntry.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg grid grid-cols-2 gap-2 text-slate-700">
                <div><strong>Usuario:</strong> {selectedEntry.usuario}</div>
                <div><strong>Acción:</strong> {selectedEntry.accion}</div>
                <div><strong>Fecha/Hora:</strong> {formatDateTime(selectedEntry.fecha)}</div>
                <div><strong>IP:</strong> {selectedEntry.ip}</div>
              </div>

              <div>
                <strong>Detalles:</strong>
                <p className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-slate-800">
                  {selectedEntry.detalles}
                </p>
              </div>

              {/* Comparación de Valores Anteriores y Nuevos */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="font-bold text-rose-700 block mb-1">Valores Anteriores:</span>
                  <pre className="p-3 bg-rose-50/40 border border-rose-200 rounded text-[11px] font-mono overflow-x-auto text-slate-800">
                    {JSON.stringify(selectedEntry.valoresAnteriores || {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="font-bold text-emerald-700 block mb-1">Valores Nuevos:</span>
                  <pre className="p-3 bg-emerald-50/40 border border-emerald-200 rounded text-[11px] font-mono overflow-x-auto text-slate-800">
                    {JSON.stringify(selectedEntry.valoresNuevos || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-white text-black border border-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 shadow-2xs cursor-pointer"
              >
                Cerrar Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
