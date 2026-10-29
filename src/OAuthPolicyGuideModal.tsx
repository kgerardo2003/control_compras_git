/**
 * @license
 * Modal de Diagnóstico y Guía de Solución: Política OAuth 2.0 de Google
 * Organismo Judicial de Guatemala - Gerencia de Informática
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldAlert, 
  HelpCircle, 
  X, 
  Globe, 
  Key, 
  Users, 
  Terminal,
  ArrowRight
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

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-...run.app';
  const sharedOrigin = 'https://ais-pre-vi5c44cjekhlithqnhldhr-24957351903.us-west2.run.app';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#091535] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oauth-guide-title"
      >
        {/* Encabezado */}
        <div className="p-5 bg-gradient-to-r from-amber-950/60 via-[#0d214d] to-[#091535] border-b border-amber-500/30 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase border border-amber-500/30">
                  Google OAuth 2.0 Policy
                </span>
                <span className="text-[10px] text-slate-400">Error 400 / origin_mismatch</span>
              </div>
              <h2 id="oauth-guide-title" className="text-base font-bold text-white mt-1">
                ¿Por qué aparece el error de Política OAuth 2.0 de Google?
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Scrollable */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed custom-scrollbar">
          
          {/* Explicación de la Causa Raíz */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200">
            <p className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Causa del Bloqueo por parte de Google:
            </p>
            <p className="text-[11px] text-slate-300">
              Google OAuth 2.0 requiere que <strong>cada dominio web</strong> desde donde se invoque el inicio de sesión esté explícitamente registrado en la lista de <em>"Orígenes de JavaScript autorizados"</em> de tu ID de cliente en Google Cloud Console. Si la URL actual no está registrada, Google bloquea la autenticación mostrando la advertencia de política.
            </p>
          </div>

          {/* Paso 1: Orígenes que deben agregarse en Google Cloud */}
          <div className="bg-[#060e22] p-4 rounded-xl border border-[#4682b4]/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                1. Orígenes de JavaScript Autorizados (Copia y Agrega)
              </h3>
              <a
                href={`https://console.cloud.google.com/apis/credentials?project=${projectId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline font-semibold"
              >
                <span>Abrir Google Cloud Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Dominio actual */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Dominio actual detectado (Imprescindible):</span>
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

            {/* Dominio compartido / previsualización */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Dominio compartido institucional:</span>
              <div className="flex items-center justify-between gap-2 p-2 bg-[#09173d] rounded-lg border border-slate-700 font-mono text-[11px] text-slate-300">
                <span className="truncate">{sharedOrigin}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sharedOrigin, 'shared')}
                  className="px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center gap-1 shrink-0 border border-slate-600 cursor-pointer"
                >
                  {copiedKey === 'shared' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'shared' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Redirección oficial de Firebase Auth */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">URI de Redirección Autorizada de Firebase Auth:</span>
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

          {/* Paso 2: Pantalla de Consentimiento de OAuth */}
          <div className="bg-[#060e22] p-4 rounded-xl border border-[#4682b4]/30 space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              2. Pantalla de Consentimiento (OAuth Consent Screen)
            </h3>
            <p className="text-[11px] text-slate-300">
              Si tu proyecto en Google Cloud está configurado con <strong>Tipo de usuario: Externo</strong> y estado <strong>"En prueba" (Testing)</strong>:
            </p>
            <ul className="list-disc pl-5 text-[11px] text-slate-300 space-y-1">
              <li>Debes agregar tu correo <strong>kgerardo2003@gmail.com</strong> en la sección <em>"Usuarios de prueba" (Test Users)</em>.</li>
              <li>O hacer clic en <em>"Publicar aplicación"</em> para permitir el acceso a cualquier usuario de la organización que esté en la Whitelist de Firebase.</li>
            </ul>
          </div>

          {/* Solución Inmediata: Acceso por Credenciales + TOTP */}
          <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-blue-950/40 p-4 rounded-xl border border-blue-500/30 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Key className="w-4 h-4" />
                ¿Necesitas ingresar de inmediato sin esperar configuración en Google Cloud?
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Puedes iniciar sesión directamente con tu usuario institucional: <strong>admin</strong> o <strong>kglopezd</strong> y tu código TOTP de Google Authenticator (o clave maestra <strong>160415</strong>).
              </p>
            </div>
            {onSelectLocalLogin && (
              <button
                type="button"
                onClick={() => {
                  onSelectLocalLogin();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md border border-blue-400/40 cursor-pointer"
              >
                <span>Usar Credenciales</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#050c1e] border-t border-[#4682b4]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>ID Cliente: {clientId.slice(0, 20)}...</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-600 cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
