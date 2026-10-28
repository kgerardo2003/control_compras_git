/**
 * @license
 * Botón Institucional de Autenticación Federada con Google Identity Services
 * Organismo Judicial de Guatemala
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  initializeGoogleIdentity, 
  loadGoogleIdentityServicesScript, 
  getGoogleClientId 
} from '../../utils/googleIdentity';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  text?: 'signin_with' | 'continue_with';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  isLoading = false,
  disabled = false,
  text = 'signin_with',
  theme = 'outline',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGisReady, setIsGisReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function setupGis() {
      try {
        const initialized = await initializeGoogleIdentity((credential) => {
          if (isMounted) {
            onSuccess(credential);
          }
        });

        if (!isMounted) return;

        if (initialized && window.google?.accounts?.id && containerRef.current) {
          setIsGisReady(true);
          try {
            // Renderizar botón nativo oficial de Google Identity Services
            containerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(containerRef.current, {
              type: 'standard',
              theme: (theme as 'outline' | 'filled_blue' | 'filled_black'),
              size: 'large',
              text: (text as 'signin_with' | 'signup_with' | 'continue_with' | 'signin'),
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 320,
              locale: 'es',
            });
          } catch (e) {
            console.warn('[GoogleSignInButton] Render botón nativo GIS aviso:', e);
          }
        } else {
          setIsGisReady(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setInitError(err?.message || 'Error cargando Google Identity Services');
          if (onError) onError(err?.message || 'Error cargando Google Identity Services');
        }
      }
    }

    setupGis();

    return () => {
      isMounted = false;
    };
  }, [onSuccess, onError, text, theme]);

  // Manejador del botón personalizado interactivo
  const handleCustomButtonClick = () => {
    if (disabled || isLoading) return;

    if (window.google?.accounts?.id) {
      // Activar prompt de One-Tap o selector de cuentas de Google
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log('[GIS] Prompt no desplegado:', notification.getNotDisplayedReason());
        }
      });
    } else {
      // Reintentar cargar SDK si aún no estaba listo
      loadGoogleIdentityServicesScript().then((ok) => {
        if (ok && window.google?.accounts?.id) {
          window.google.accounts.id.prompt();
        } else {
          if (onError) onError('El servicio de Google Identity no pudo ser contactado.');
        }
      });
    }
  };

  return (
    <div className={`w-full flex flex-col items-center gap-2 ${className}`}>
      
      {/* Botón Oficial renderizado por el SDK de Google Identity Services */}
      <div 
        ref={containerRef} 
        id="g_id_signin_button"
        className={`w-full flex justify-center items-center ${isGisReady && !isLoading ? 'min-h-[44px]' : 'hidden'}`}
      />

      {/* Botón Personalizado Interactivo (Fallback y Estado de Carga) */}
      {(!isGisReady || isLoading) && (
        <button
          id="btn-google-signin"
          type="button"
          onClick={handleCustomButtonClick}
          disabled={disabled || isLoading}
          className="w-full relative flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider border border-slate-300 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
          title="Iniciar sesión con cuenta de Google verificada"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-blue-700">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="font-semibold text-slate-700">Validando en Firebase...</span>
            </div>
          ) : (
            <>
              {/* Logotipo vectorial oficial multi-color de Google */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="text-slate-800 font-semibold group-hover:text-black">
                Iniciar sesión con Google
              </span>
            </>
          )}
        </button>
      )}

      {initError && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-300">
          <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Servicio de Google federado operando en modo directo.</span>
        </div>
      )}
    </div>
  );
};
