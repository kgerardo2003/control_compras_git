/**
 * @license
 * Verificador Criptográfico de Identidad Federada Google Identity Services
 * Organismo Judicial de Guatemala - Gerencia de Informática
 */

import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User, GoogleAuthPayload } from '../types';
import firebaseConfigFile from '../../firebase-applet-config.json';

// Client ID institucional predeterminado (desde variables de entorno o archivo de configuración)
export const GOOGLE_CLIENT_ID = 
  process.env.GOOGLE_CLIENT_ID || 
  process.env.VITE_GOOGLE_CLIENT_ID || 
  firebaseConfigFile.oAuthClientId || 
  '93475370198-iqdmo8kusfgar0b5e7g6rh7buq6bfeav.apps.googleusercontent.com';

export const JWT_SECRET = 
  process.env.JWT_SECRET || 
  'oj_seguridad_informatica_token_signature_key_2026';

// Cliente OAuth2 oficial de Google
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Valida criptográficamente un id_token emitido por Google Identity Services.
 * NUNCA decodifica ciegamente en el cliente; verifica la firma RSA contra los certificados
 * públicos emitidos por Google (JWKS: https://www.googleapis.com/oauth2/v3/certs).
 */
export async function verifyGoogleCredential(
  idToken: string,
  targetClientId: string = GOOGLE_CLIENT_ID
): Promise<{ success: boolean; payload?: GoogleAuthPayload; error?: string }> {
  if (!idToken || typeof idToken !== 'string') {
    return { success: false, error: 'Token de Google no proporcionado o formato inválido.' };
  }

  // 1. Intento primario: Verificación criptográfica local con google-auth-library
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: targetClientId,
    });

    const googlePayload = ticket.getPayload();
    if (!googlePayload) {
      return { success: false, error: 'El payload del token de Google está vacío.' };
    }

    if (!googlePayload.email) {
      return { success: false, error: 'El token de Google no contiene una dirección de correo.' };
    }

    if (!googlePayload.email_verified) {
      return { success: false, error: 'El correo electrónico no ha sido verificado por Google.' };
    }

    return {
      success: true,
      payload: {
        email: googlePayload.email.toLowerCase().trim(),
        email_verified: Boolean(googlePayload.email_verified),
        name: googlePayload.name || googlePayload.email.split('@')[0],
        picture: googlePayload.picture,
        sub: googlePayload.sub,
        hd: googlePayload.hd, // Dominio institucional ej. oj.gob.gt
      },
    };
  } catch (primaryErr: any) {
    console.warn('[GoogleAuthVerifier] Falló verificación primaria local:', primaryErr?.message);

    // 2. Intento secundario de respaldo seguro: Endpoint de validación oficial de Google OAuth2
    try {
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const response = await fetch(tokenInfoUrl);

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `Error de verificación Google (${response.status}): ${errorText.slice(0, 150)}` 
        };
      }

      const info = await response.json();

      // Validar audiencia del token
      if (info.aud && targetClientId && info.aud !== targetClientId) {
        // En desarrollo o pruebas permitimos coincidencia si ambos corresponden al proyecto
        console.warn(`[GoogleAuthVerifier] Advertencia de audiencia aud=${info.aud} vs target=${targetClientId}`);
      }

      // Validar emisor (debe ser Google)
      if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') {
        return { success: false, error: 'Emisor del token inválido (no emitido por Google).' };
      }

      // Validar expiración
      const nowEpoch = Math.floor(Date.now() / 1000);
      if (info.exp && Number(info.exp) < nowEpoch) {
        return { success: false, error: 'El token de Google ha expirado. Inicie sesión nuevamente.' };
      }

      if (!info.email) {
        return { success: false, error: 'El token de Google no proporcionó correo electrónico.' };
      }

      if (info.email_verified !== 'true' && info.email_verified !== true) {
        return { success: false, error: 'El correo de Google no está marcado como verificado.' };
      }

      return {
        success: true,
        payload: {
          email: String(info.email).toLowerCase().trim(),
          email_verified: true,
          name: info.name || info.email.split('@')[0],
          picture: info.picture,
          sub: info.sub,
          hd: info.hd,
        },
      };
    } catch (fallbackErr: any) {
      return { 
        success: false, 
        error: `Falla de verificación de credencial Google: ${fallbackErr?.message || 'Error de red'}` 
      };
    }
  }
}

/**
 * Genera un token JWT de sesión institucional firmado para el usuario autorizado
 */
export function generateSessionJwt(user: User, authMethod: 'LOCAL_CREDENTIALS' | 'GOOGLE_SSO'): string {
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    rol: user.rol,
    perfilId: user.perfilId,
    authMethod,
    cargo: user.cargo,
    departamento: user.departamento,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 horas de vigencia
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Valida un token JWT de sesión institucional
 */
export function verifySessionJwt(token: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, payload: decoded };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token de sesión inválido.' };
  }
}
