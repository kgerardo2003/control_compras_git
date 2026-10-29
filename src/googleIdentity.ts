/**
 * @license
 * Google Identity Services (GIS) - SDK Loader & Utilities
 * Organismo Judicial de Guatemala - Ciberseguridad GIT
 */

import firebaseConfigFile from '../../firebase-applet-config.json';

// Declaración global para la API de Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string; select_by?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: 'signin' | 'signup' | 'use';
            itp_support?: boolean;
            prompt_parent_id?: string;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
              locale?: string;
            }
          ) => void;
          prompt: (notification?: (promptMoment: any) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
          revoke: (hint: string, callback?: (done: any) => void) => void;
        };
      };
    };
  }
}

/**
 * Obtiene el Client ID institucional de Google OAuth
 */
export function getGoogleClientId(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }
  if (firebaseConfigFile?.oAuthClientId) {
    return firebaseConfigFile.oAuthClientId;
  }
  return '93475370198-iqdmo8kusfgar0b5e7g6rh7buq6bfeav.apps.googleusercontent.com';
}

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Carga de forma asíncrona e idempotente el SDK oficial de Google Identity Services
 */
export function loadGoogleIdentityServicesScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // Si ya está disponible en window, resolver inmediatamente
  if (window.google?.accounts?.id) {
    return Promise.resolve(true);
  }

  // Si ya hay una promesa de carga en curso, reutilizarla
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    // Verificar si el elemento script ya existe en el DOM
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      // Timeout de seguridad en caso de que ya haya cargado antes de añadir listener
      setTimeout(() => {
        resolve(Boolean(window.google?.accounts?.id));
      }, 500);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = (e) => {
      console.warn('[GIS-Loader] No se pudo cargar el script de Google Identity Services:', e);
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Inicializa el cliente GIS con el callback de recepción de credencial
 */
export async function initializeGoogleIdentity(
  onCredentialResponse: (credential: string) => void,
  clientId: string = getGoogleClientId()
): Promise<boolean> {
  const loaded = await loadGoogleIdentityServicesScript();
  if (!loaded || !window.google?.accounts?.id) {
    console.warn('[GIS] SDK de Google Identity Services no disponible.');
    return false;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (res) => {
        if (res.credential) {
          onCredentialResponse(res.credential);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      itp_support: true,
    });
    return true;
  } catch (err) {
    console.error('[GIS] Error inicializando Google Identity:', err);
    return false;
  }
}
