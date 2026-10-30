/**
 * @license
 * Modal de Diagnóstico y Guía de Solución: Error 400 origin_mismatch
 * Organismo Judicial de Guatemala - Gerencia de Informática
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldAlert, 
  X, 
  Globe, 
  Key, 
  Users, 
  Terminal,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import firebaseConfigFile from '../../../firebase-applet-config.json';

interface OAuthPolicyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocalLogin?: () => void;
}

export const OAuthPolicyGuideModal: React.FC<OAuthPolicyGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectLocalLogin
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const vercelOrigin = 'https://control-compras-git.vercel.app';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : vercelOrigin;
  const cloudRunDevOrigin = 'https://ais-dev-vi5c44cjekhlithqnhldhr-24957351903.us-west2.run.app';
  const cloudRunPreOrigin = 'https://ais-pre-vi5c44cjekhlithqnhldhr-24957351903.us-west2.run.app';
  const localOrigin = 'http://localhost:3000';
  const firebaseAuthHandler = `https://${firebaseConfigFile.authDomain || 'gen-lang-client-0584258501.firebaseapp.com'}/__/auth/handler`;
  const clientId = firebaseConfigFile.oAuthClientId || '93475370198-iqdmo8kusfgar0b5e7g6rh7buq6bfeav.apps.googleusercontent.com';
  const projectId = firebaseConfigFile.projectId || 'gen-lang-client-0584258501';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#091535] border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oauth-guide-title"
      >
        {/* Encabezado */}
        <div className="p-5 bg-gradient-to-r from-red-950/70 via-[#0d214d] to-[#091535] border-b border-amber-500/30 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold uppercase border border-red-500/30">
                  Error 400: origin_mismatch
                </span>
                <span className="text-[10px] text-amber-300 font-semibold">Política OAuth 2.0</span>
              </div>
              <h2 id="oauth-guide-title" className="text-base font-bold text-white mt-1">
                Solución de Autorización: Registrar Origen en Google Cloud
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Scrollable */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed custom-scrollbar">
          
          {/* Causa detectada con el origen exacto del error */}
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200">
            <p className="font-semibold text-red-300 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Origen bloqueado por Google: <span className="font-mono text-white text-[11px] underline">https://control-compras-git.vercel.app</span>
            </p>
            <p className="text-[11px] text-slate-300">
              Google OAuth bloqueó la autenticación porque el dominio de tu despliegue en Vercel (<strong>https://control-compras-git.vercel.app</strong>) aún no ha sido agregado a los <strong>"Orígenes de JavaScript autorizados"</strong> de tu ID de cliente en Google Cloud Console.
            </p>
          </div>

          {/* Paso 1: Orígenes que deben agregarse en Google Cloud */}
          <div className="bg-[#060e22] p-4 rounded-xl border border-[#4682b4]/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Orígenes de JavaScript Autorizados (Copiar y Agregar en Google Cloud)
              </h3>
              <a
                href={`https://console.cloud.google.com/apis/credentials?project=${projectId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline font-semibold"
              >
                <span>Ir a Google Cloud Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Dominio Vercel (El que causó el error) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-300 font-bold uppercase">1. Dominio Vercel (Causa del error):</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">Urgente</span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 bg-[#09173d] rounded-lg border border-amber-500/50 font-mono text-[11px] text-amber-200">
                <span className="truncate">{vercelOrigin}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(vercelOrigin, 'vercel')}
                  className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 font-bold text-[10px] flex items-center gap-1 shrink-0 border border-amber-400/40 cursor-pointer"
                >
                  {copiedKey === 'vercel' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'vercel' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Dominio actual si es diferente de Vercel */}
            {currentOrigin !== vercelOrigin && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">2. Dominio actual detectado ({currentOrigin}):</span>
                <div className="flex items-center justify-between gap-2 p-2 bg-[#09173d] rounded-lg border border-cyan-500/30 font-mono text-[11px] text-cyan-200">
                  <span className="truncate">{currentOrigin}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(currentOrigin, 'current')}
                    className="px-2 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 font-bold text-[10px] flex items-center gap-1 shrink-0 border border-cyan-400/30 cursor-pointer"
                  >
                    {copiedKey === 'current' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'current' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Redirección oficial de Firebase Auth */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">3. URI de Redirección de Firebase Auth (En "URIs de redireccionamiento autorizados"):</span>
              <div className="flex items-center justify-between gap-2 p-2 bg-[#09173d] rounded-lg border border-slate-700 font-mono text-[11px] text-slate-300">
                <span className="truncate">{firebaseAuthHandler}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(firebaseAuthHandler, 'handler')}
                  className="px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center gap-1 shrink-0 border border-slate-600 cursor-pointer"
                >
                  {copiedKey === 'handler' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'handler' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pasos en Google Cloud Console */}
          <div className="bg-[#060e22] p-4 rounded-xl border border-[#4682b4]/30 space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Pasos Exactos en Google Cloud (Solo 2 minutos)
            </h3>
            <ol className="list-decimal pl-5 text-[11px] text-slate-300 space-y-1.5">
              <li>Ingresa a <a href={`https://console.cloud.google.com/apis/credentials?project=${projectId}`} target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">Google Cloud Credentials</a> en el proyecto <strong>{projectId}</strong>.</li>
              <li>Busca el ID de cliente: <code className="text-cyan-200 bg-cyan-950/60 px-1 py-0.5 rounded font-mono">{clientId.slice(0, 25)}...</code> y haz clic sobre él para editarlo.</li>
              <li>En la sección <strong>"Orígenes de JavaScript autorizados"</strong>, haz clic en <strong>+ AGREGAR URI</strong> y pega <code className="text-amber-300 font-mono">https://control-compras-git.vercel.app</code>.</li>
              <li>Haz clic en <strong>Guardar</strong>.</li>
            </ol>
          </div>

          {/* Solución Inmediata: Acceso Institucional Directo */}
          <div className="bg-gradient-to-r from-blue-950/50 via-indigo-950/40 to-blue-950/50 p-4 rounded-xl border border-blue-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Key className="w-4 h-4" />
                Acceso Inmediato sin Esperar Propagación de Google
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Tu usuario <strong>kgerardo2003@gmail.com</strong> está registrado con rol <strong>Administrador General</strong> (Lic. Kevin Gerardo López de León). Puedes ingresar de inmediato con tus credenciales institucionales.
              </p>
            </div>
            {onSelectLocalLogin && (
              <button
                type="button"
                onClick={() => {
                  onSelectLocalLogin();
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-2 shadow-lg border border-blue-400/50 cursor-pointer transition-transform active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>Ingresar de Inmediato</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#050c1e] border-t border-[#4682b4]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>ID Cliente: {clientId.slice(0, 24)}...</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-600 cursor-pointer"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};
