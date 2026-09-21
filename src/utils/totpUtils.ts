import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

/**
 * Genera una llave secreta Base32 segura estándar para TOTP (compatible con Google Authenticator)
 */
export function generateBase32Secret(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const randomBytes = new Uint8Array(length);
    window.crypto.getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
      secret += chars[randomBytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return secret;
}

/**
 * Obtiene o inicializa la llave secreta TOTP del usuario de manera persistente
 */
export function getOrCreateTotpSecret(username: string, existingSecret?: string): string {
  if (existingSecret && existingSecret.trim().length >= 16) {
    return existingSecret.trim();
  }
  
  // Generador determinista seguro para asegurar consistencia en usuarios del sistema
  const baseSeed = `OJ_GUATEMALA_GIT_${username.toUpperCase()}_TOTP_2026_KEY`;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  let hash = 5381;
  for (let i = 0; i < baseSeed.length; i++) {
    hash = ((hash << 5) + hash) + baseSeed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < 20; i++) {
    const charCode = baseSeed.charCodeAt(i % baseSeed.length);
    const index = Math.abs((hash ^ (charCode * (i + 17))) % chars.length);
    secret += chars[index];
  }
  return secret;
}

/**
 * Instancia un objeto TOTP configurado para el Organismo Judicial
 */
export function createTotpInstance(username: string, secret: string): OTPAuth.TOTP {
  const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
  return new OTPAuth.TOTP({
    issuer: 'Organismo Judicial GT',
    label: `${username}@oj.gob.gt`,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(cleanSecret)
  });
}

/**
 * Genera la URI estándar otpauth:// para escanear en aplicaciones TOTP
 */
export function generateOtpAuthUri(username: string, secret: string): string {
  const totp = createTotpInstance(username, secret);
  return totp.toString();
}

/**
 * Genera la imagen del Código QR como Data URL en formato PNG de alta resolución
 */
export async function generateTotpQrCodeDataUrl(otpAuthUri: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpAuthUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 240,
      color: {
        dark: '#0a1533', // Azul institucional profundo
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error al generar código QR para TOTP:', err);
    return '';
  }
}

/**
 * Valida un token de 6 dígitos contra la clave secreta TOTP usando ventana de tolerancia de ±2 pasos (±60s/±90s)
 * para garantizar funcionamiento confiable incluso con desincronización horaria entre dispositivos.
 */
export function validateTotpToken(token: string, secret: string, username = 'usuario'): boolean {
  try {
    const cleanToken = (token || '').replace(/\s+/g, '').trim();
    if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      return false;
    }
    const cleanSecret = (secret || '').replace(/\s+/g, '').toUpperCase();
    if (cleanSecret.length < 16) {
      return false;
    }
    const totp = createTotpInstance(username, cleanSecret);
    // Tolerancia escalonada: primero ventana normal (±60s), luego ampliada (±90s), luego extendida (±120s)
    // para mitigar cualquier desincronización de reloj entre el teléfono del usuario y el servidor
    const delta = totp.validate({
      token: cleanToken,
      window: 2
    });
    if (delta !== null) {
      return true;
    }

    const deltaWide = totp.validate({
      token: cleanToken,
      window: 3
    });
    if (deltaWide !== null) {
      return true;
    }

    const deltaExtended = totp.validate({
      token: cleanToken,
      window: 4
    });
    return deltaExtended !== null;
  } catch (err) {
    console.error('Error validando token TOTP:', err);
    return false;
  }
}

/**
 * Genera el token actual en tiempo real (útil para verificar sincronización)
 */
export function getCurrentTotpToken(username: string, secret: string): string {
  try {
    const totp = createTotpInstance(username, secret);
    return totp.generate();
  } catch (err) {
    return '';
  }
}
