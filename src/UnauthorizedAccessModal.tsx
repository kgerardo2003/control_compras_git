/**
 * @license
 * Modal de Seguridad: Acceso No Autorizado por Whitelist (Control Ciberseguridad GIT)
 * Organismo Judicial de Guatemala
 */

import React from 'react';
import { 
  ShieldAlert, 
  X, 
  AlertTriangle, 
  Mail, 
  Lock, 
  ArrowLeft, 
  ExternalLink,
  ShieldCheck,
  UserX
} from 'lucide-react';
import { OJLogo } from '../OJLogo';

interface UnauthorizedAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptedEmail?: string;
  errorMessage?: string;
  errorCode?: 'ACCOUNT_NOT_REGISTERED' | 'ACCOUNT_INACTIVE' | 'EMAIL_NOT_VERIFIED' | 'INVALID_TOKEN' | 'SERVER_ERROR' | string;
  onRetryWithOtherAccount?: () => void;
}

export const UnauthorizedAccessModal: React.FC<UnauthorizedAccessModalProps> = ({
  isOpen,
  onClose,
  attemptedEmail,
  errorMessage,
  errorCode = 'ACCOUNT_NOT_REGISTERED',
  onRetryWithOtherAccount,
}) => {
  if (!isOpen) return null;

  const isInactive = errorCode === 'ACCOUNT_INACTIVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0c1836] border border-red-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-alert-title"
      >
        {/* Barra superior de advertencia de ciberseguridad */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        {/* Encabezado del Modal */}
        <div className="p-5 border-b border-red-500/20 bg-red-950/30 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              {isInactive ? <UserX className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                  Ciberseguridad GIT • Acceso Denegado
                </span>
              </div>
              <h3 id="security-alert-title" className="text-base font-bold text-white mt-1">
                {isInactive ? 'Cuenta Institucional Inactiva' : 'Acceso Restringido por Lista Blanca'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-6 space-y-4">
          
          {/* Mensaje descriptivo del motivo del bloqueo */}
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-200/90 leading-relaxed">
            <p className="font-semibold text-red-100 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{isInactive ? 'Estado de la cuenta: Inactiva o Suspendida' : 'Directiva de Seguridad Whitelist (RBAC)'}</span>
            </p>
            <p>
              {errorMessage || (isInactive 
                ? 'Su usuario se encuentra temporalmente deshabilitado en el sistema.' 
                : 'La autenticación con Google fue exitosa, pero esta dirección no está autorizada para acceder a los módulos de compras y finanzas del Organismo Judicial.')}
            </p>
          </div>

          {/* Tarjeta de Cuenta de Google Rechazada */}
          {attemptedEmail && (
            <div className="p-3.5 rounded-xl bg-[#071330] border border-[#1c39bb]/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Cuenta verificada por Google:</span>
                  <span className="text-xs font-mono font-bold text-white truncate block">{attemptedEmail}</span>
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase px-2 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/40 shrink-0">
                No Autorizado
              </span>
            </div>
          )}

          {/* Información Institucional sobre Políticas de Ciberseguridad */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-[11px] text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>¿Por qué veo esta pantalla?</span>
            </div>
            <p className="text-slate-400 leading-normal">
              Por estrictas directivas de fiscalización y seguridad de la información del Organismo Judicial de Guatemala, 
              <strong> el auto-registro abierto no está permitido</strong>. Todo usuario debe ser dado de alta previamente por un 
              Administrador General y contar con un perfil institucional asignado (Administrador, Auditor, Operador GIT o Consulta Gerencial).
            </p>
          </div>

          {/* Datos de Contacto con Gerencia de Informática */}
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-300 block">Gerencia de Informática (GIT - OJ)</span>
              <span>Soporte a Usuarios: ext. 4500 / 4510</span>
            </div>
            <a 
              href="mailto:kgerardo2003@gmail.com?subject=Solicitud%20de%20Alta%20Institucional%20en%20Sistema%20de%20Control%20de%20Compras"
              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-semibold text-xs transition-colors"
            >
              <span>Solicitar Alta al Administrador</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>

        {/* Pie del Modal con Acciones */}
        <div className="p-4 bg-[#08122c] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Credenciales Locales</span>
          </button>

          {onRetryWithOtherAccount && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetryWithOtherAccount();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Usar otra cuenta de Google</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
