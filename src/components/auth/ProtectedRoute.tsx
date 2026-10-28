/**
 * @license
 * Componente Guardián de Rutas y Módulos: ProtectedRoute (RBAC y Whitelist)
 * Organismo Judicial de Guatemala - Gerencia de Informática
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveTab, UserRole } from '../../types';
import { 
  ShieldAlert, 
  Lock, 
  ArrowLeft, 
  KeyRound, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: ActiveTab;
  allowedRoles?: UserRole[];
  moduleTitle?: string;
  moduleDescription?: string;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  module,
  allowedRoles,
  moduleTitle,
  moduleDescription,
  fallback,
}) => {
  const { currentUser, hasModuleAccess, setActiveTab } = useApp();

  // 1. Verificación de Autenticación
  if (!currentUser) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-900/40 rounded-2xl border border-slate-700/50">
        <div className="max-w-md text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Sesión Requerida</h3>
          <p className="text-xs text-slate-300">
            Debe iniciar sesión con sus credenciales institucionales o cuenta de Google autorizada para acceder a este contenido.
          </p>
        </div>
      </div>
    );
  }

  // 2. Verificación de Rol específico (si se especificó allowedRoles)
  const hasRoleAccess = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(currentUser.rol) || currentUser.rol === 'administrador';

  // 3. Verificación de Módulo RBAC
  const hasModulePermission = module ? hasModuleAccess(module) : true;

  if (!hasRoleAccess || !hasModulePermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="w-full my-6 p-6 sm:p-8 bg-[#0a1533] border border-amber-500/40 rounded-2xl shadow-xl text-slate-100 animate-in fade-in">
        <div className="max-w-2xl mx-auto space-y-5">
          
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                Control de Acceso Basado en Roles (RBAC)
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                {moduleTitle || 'Módulo Restringido'}
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {moduleDescription || 'Su usuario institucional no cuenta con los privilegios asignados para visualizar o gestionar este módulo.'}
          </p>

          <div className="p-4 rounded-xl bg-[#08122c] border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Usuario autenticado:</span>
              <span className="font-semibold text-white">{currentUser.nombreCompleto} ({currentUser.username})</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Rol actual: <strong className="text-amber-300 capitalize">{currentUser.rol}</strong></span>
            </div>
            <div className="text-right sm:border-l sm:border-slate-700 sm:pl-4">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Método de Sesión</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 inline-block mt-0.5">
                {currentUser.authMethod === 'GOOGLE_SSO' ? 'Google SSO Federado' : 'Credenciales + 2FA Local'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Panel Principal</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return <>{children}</>;
};
