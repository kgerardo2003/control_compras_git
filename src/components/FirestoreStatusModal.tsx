import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  X, 
  Server, 
  Layers, 
  Clock, 
  Activity,
  Zap,
  Users,
  ShoppingBag,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FirestoreStatusData {
  firestore: {
    projectId: string;
    databaseId: string;
    status: 'conectado' | 'quota_exceeded' | 'error';
    latencyMs: number;
    quotaExceeded: boolean;
    message: string;
    consoleUrl: string;
  };
  centralStore: {
    status: string;
    version: number;
    purchasesCount: number;
    usersCount: number;
    catalogsCount: number;
    budgetLinesCount: number;
    budgetModificationsCount: number;
    auditLogsCount: number;
    lastUpdated?: string;
  };
}

interface FirestoreStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirestoreStatusModal: React.FC<FirestoreStatusModalProps> = ({ isOpen, onClose }) => {
  const { 
    isFirestoreConnected, 
    firestoreStatus: localFirestoreStatus, 
    purchases, 
    users, 
    catalogs,
    judicaturas,
    syncWithCentralServer,
    forceSyncToProductionDatabase,
    showToast 
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<FirestoreStatusData | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db/firestore-status');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
          setLastCheckTime(new Date().toLocaleTimeString('es-GT'));
        }
      }
    } catch (e) {
      console.warn("Error consultando estado de Firestore:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      await forceSyncToProductionDatabase();
      await fetchStatus();
    } catch {
      showToast({
        type: 'error',
        title: 'Error de Sincronización',
        message: 'No se pudo forzar la sincronización en este momento.',
        duration: 4000
      });
    } finally {
      setSyncing(false);
    }
  };

  const isQuota = data?.firestore.quotaExceeded || localFirestoreStatus === 'offline' && !data;
  const isOnline = isFirestoreConnected || data?.firestore.status === 'conectado';
  const consoleLink = data?.firestore.consoleUrl || "https://console.firebase.google.com/project/gen-lang-client-0584258501/firestore/databases/ai-studio-sistemadecontrol-5592e35a-812a-481c-bad9-b7ae12134a41/data?openUpgradeDialog=true";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Estado de la Base de Datos Firestore
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Monitoreo de conectividad en tiempo real, sincronización y cuotas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          
          {/* Tarjeta Principal de Estado */}
          <div className={`p-4 rounded-xl border ${
            isQuota 
              ? 'bg-amber-50/80 border-amber-300 text-amber-900' 
              : isOnline
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {isQuota ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                ) : isOnline ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {isQuota 
                      ? 'Límite de Lectura Gratuita de Firestore Alcanzado (Modo Resiliente Activo)' 
                      : isOnline 
                        ? 'Base de Datos Firestore Conectada y Operativa' 
                        : 'Conexión a Base de Datos en Proceso'}
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                    {data?.firestore.message || (isQuota 
                      ? 'La cuota diaria de lectura del nivel gratuito de Firestore se ha alcanzado. El sistema continúa operando al 100% gracias a la replicación central multi-estación.' 
                      : 'El enlace con Google Cloud Firestore se encuentra sincronizado en vivo.')}
                  </p>
                </div>
              </div>

              {data?.firestore.latencyMs !== undefined && (
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/80 border border-slate-200">
                    <Activity className="w-3 h-3 text-blue-600" />
                    {data.firestore.latencyMs} ms
                  </span>
                </div>
              )}
            </div>

            {/* Aviso especial de Cuota Gratuita con enlace directo */}
            {isQuota && (
              <div className="mt-3.5 pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs text-amber-800">
                  La cuota diaria de Firestore se reinicia a las 00:00 UTC. Puede verificar o habilitar facturación en la consola.
                </span>
                <a
                  href={consoleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs"
                >
                  <span>Abrir Consola Firebase</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Grilla de Métricas Técnicas de la Base de Datos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Identificador de Base de Datos
              </span>
              <p className="font-mono text-xs font-semibold text-slate-800 break-all select-all">
                {data?.firestore.databaseId || 'ai-studio-sistemadecontrol-5592e35a-812a-481c-bad9-b7ae12134a41'}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Proyecto Google Cloud: {data?.firestore.projectId || 'gen-lang-client-0584258501'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Arquitectura de Persistencia
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Server className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Híbrida Resiliente (Nube + Espejo Central)</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Garantiza que ningún equipo pierda datos ante fallas de red
              </span>
            </div>
          </div>

          {/* Estado de Sincronización de Colecciones y Registros */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Registros Sincronizados en Memoria / Almacén Central</span>
              </h4>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastCheckTime ? `Verificado a las ${lastCheckTime}` : 'Listo'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-center gap-1 text-slate-500 text-[11px] mb-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Adquisiciones</span>
                </div>
                <p className="text-lg font-bold text-slate-900 font-mono">
                  {purchases.length}
                </p>
                <span className="text-[10px] text-slate-400">En esta estación</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-center gap-1 text-slate-500 text-[11px] mb-1">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Usuarios</span>
                </div>
                <p className="text-lg font-bold text-slate-900 font-mono">
                  {users.length}
                </p>
                <span className="text-[10px] text-slate-400">Cuentas activas</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-center gap-1 text-slate-500 text-[11px] mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Catálogos</span>
                </div>
                <p className="text-lg font-bold text-slate-900 font-mono">
                  {catalogs.length}
                </p>
                <span className="text-[10px] text-slate-400">Parametrizados</span>
              </div>
            </div>
          </div>

          {/* Garantía Multi-Estación */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold block mb-0.5">Sincronización Total Multi-Equipo:</span>
              Cualquier cambio realizado en esta estación (compras nuevas, edición de requerimientos, usuarios creados o actualización de contraseñas) se propaga automáticamente hacia todos los demás equipos conectados.
            </div>
          </div>

        </div>

        {/* Pie de Acciones */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-200/60 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Diagnosticando...' : 'Re-verificar Estado'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleForceSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Forzar Sincronización Multi-Estación'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
