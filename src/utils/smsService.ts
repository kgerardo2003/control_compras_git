/**
 * Servicio de Validación y Despacho de Mensajes de Texto (SMS 2FA)
 * Organismo Judicial de Guatemala - Gerencia de Informática
 */

export interface SmsVerificationPayload {
  to: string;
  code: string;
  username: string;
  nombreCompleto?: string;
  expiresInMinutes?: number;
}

export interface SmsSendResult {
  success: boolean;
  message: string;
  messageId?: string;
  maskedPhone?: string;
}

/**
 * Limpia y normaliza un número de teléfono.
 * Si es un número guatemalteco de 8 dígitos sin prefijo, le añade +502.
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return `+${digitsOnly}`;
  }

  // Si tiene 8 dígitos (formato estándar de Guatemala), anteponer el código de país +502
  if (digitsOnly.length === 8) {
    return `+502${digitsOnly}`;
  }

  // Si ya tiene el 502 al inicio pero sin el signo más
  if (digitsOnly.length === 11 && digitsOnly.startsWith('502')) {
    return `+${digitsOnly}`;
  }

  return trimmed.startsWith('+') ? trimmed : (digitsOnly ? `+${digitsOnly}` : '');
}

/**
 * Da formato visual legible a un número de teléfono (ej. +502 5555-0199).
 */
export function formatPhoneNumber(phone: string): string {
  const norm = normalizePhoneNumber(phone);
  if (!norm) return '';

  if (norm.startsWith('+502') && norm.length === 12) {
    const main = norm.substring(4);
    return `+502 ${main.substring(0, 4)}-${main.substring(4)}`;
  }

  return norm;
}

/**
 * Valida si un número telefónico tiene un formato mínimo válido.
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'El número de teléfono es requerido.' };
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) {
    return { valid: false, error: 'El número telefónico debe contener al menos 8 dígitos.' };
  }

  if (digits.length > 15) {
    return { valid: false, error: 'El número telefónico excede la longitud estándar internacional (máx. 15 dígitos).' };
  }

  return { valid: true };
}

/**
 * Enmascara el número de teléfono para protección de datos confidenciales.
 * Ejemplo: "+502 5555-0199" -> "+502 ••••-•199"
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return '+502 ••••-••••';
  const norm = normalizePhoneNumber(phone);
  const digits = norm.replace(/\D/g, '');

  if (digits.length >= 8) {
    const lastDigits = digits.slice(-3);
    const countryPrefix = norm.startsWith('+502') ? '+502 ' : (norm.startsWith('+') ? `${norm.slice(0, 4)} ` : '');
    return `${countryPrefix}••••-•${lastDigits}`;
  }

  return '••••-••••';
}

/**
 * Construye el texto formal del mensaje SMS para 2FA.
 */
export function buildSmsMessage(payload: SmsVerificationPayload): string {
  const exp = payload.expiresInMinutes || 5;
  return `OJ GUATEMALA (GIT): Su código de verificación 2FA es: ${payload.code}. Válido por ${exp} minutos. Confidencial, no lo comparta.`;
}

/**
 * Despacha un SMS con el código de seguridad a través de la API del servidor.
 */
export async function sendSmsVerification(payload: SmsVerificationPayload): Promise<SmsSendResult> {
  const normalizedPhone = normalizePhoneNumber(payload.to);
  const masked = maskPhoneNumber(normalizedPhone);

  const validation = validatePhoneNumber(normalizedPhone);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || 'Número de teléfono no válido.',
      maskedPhone: masked
    };
  }

  const smsText = buildSmsMessage({
    ...payload,
    to: normalizedPhone
  });

  try {
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: normalizedPhone,
        message: smsText,
        code: payload.code,
        username: payload.username
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Error del servidor HTTP ${response.status} al despachar SMS.`,
        maskedPhone: masked
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || `Mensaje de texto SMS con código 2FA enviado a ${masked}`,
      messageId: data.messageId,
      maskedPhone: masked
    };
  } catch (err: any) {
    console.warn('Fallo de red al despachar SMS:', err);
    return {
      success: false,
      message: `No se pudo contactar el servicio de SMS: ${err?.message || 'Error de conexión'}.`,
      maskedPhone: masked
    };
  }
}
