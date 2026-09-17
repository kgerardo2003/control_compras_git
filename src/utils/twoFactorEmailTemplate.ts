/**
 * Plantilla de correo oficial para Código de Seguridad de Doble Factor de Autenticación (2FA)
 * Sistema de Control de Compras - Gerencia de Informática
 * Organismo Judicial de Guatemala
 */

import { OJ_LOGO_CID } from './emailLogoAsset';

export interface TwoFactorEmailParams {
  username: string;
  nombreCompleto?: string;
  code: string;
  expiresInMinutes?: number;
}

export function buildTwoFactorEmail(params: TwoFactorEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const username = params.username.trim();
  const nombre = params.nombreCompleto || username;
  const code = params.code;
  const minutes = params.expiresInMinutes || 5;

  const subject = `Código de Seguridad 2FA: ${code} • Organismo Judicial de Guatemala`;

  // Formato para texto plano
  const text = `ORGANISMO JUDICIAL DE GUATEMALA
GERENCIA DE INFORMÁTICA
SISTEMA DE CONTROL DE ADQUISICIONES

Estimado(a) ${nombre}:

Se ha solicitado un inicio de sesión en el Sistema de Control de Adquisiciones con su usuario institucional (@${username}).

Su código de seguridad de doble factor de autenticación (2FA) es:

===========================
    ${code.slice(0, 3)} ${code.slice(3)}
===========================

Este código es confidencial, de un solo uso y expirará en ${minutes} minutos.

NOTA DE SEGURIDAD:
- No comparta este código con nadie.
- El personal de la Gerencia de Informática NUNCA le solicitará este código por teléfono, mensaje o correo.
- Si usted no ha intentado iniciar sesión, comuníquelo inmediatamente a la Mesa de Ayuda de la GIT y cambie su contraseña.

Atentamente,

Seguridad de la Información
Gerencia de Informática
Organismo Judicial de Guatemala`;

  // Formato HTML institucional de alta fidelidad
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);">
          
          <!-- Encabezado Institucional OJ con Logotipo Oficial -->
          <tr>
            <td style="background-color: #0b183c; padding: 28px 24px 22px; text-align: center; border-bottom: 4px solid #f59e0b;">
              <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 14px auto;">
                <tr>
                  <td align="center" style="background-color: #ffffff; width: 68px; height: 68px; border-radius: 14px; border: 2px solid #f59e0b; padding: 5px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);">
                    <img 
                      src="cid:${OJ_LOGO_CID}" 
                      alt="Logotipo Oficial Organismo Judicial de Guatemala" 
                      width="56" 
                      height="64" 
                      style="display: block; width: 56px; height: auto; max-height: 64px; margin: 0 auto; border: 0; outline: none;" 
                    />
                  </td>
                </tr>
              </table>

              <h1 style="color: #ffffff; margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase;">
                ORGANISMO JUDICIAL DE GUATEMALA
              </h1>
              <p style="color: #93c5fd; margin: 5px 0 0; font-size: 13px; font-weight: 600;">
                GERENCIA DE INFORMÁTICA
              </p>
              <p style="color: #cbd5e1; margin: 3px 0 0; font-size: 11px;">
                Doble Factor de Autenticación Institucional (2FA)
              </p>
            </td>
          </tr>

          <!-- Cuerpo del Mensaje -->
          <tr>
            <td style="padding: 32px 28px; color: #1e293b; line-height: 1.6; font-size: 14px;">
              
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 12px 16px; margin-bottom: 22px;">
                <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: 600;">
                  Verificación de Seguridad en Dos Pasos
                </p>
                <p style="margin: 4px 0 0; color: #334155; font-size: 12px;">
                  Acceso solicitado para el usuario institucional <strong>@${username}</strong> (${nombre}).
                </p>
              </div>

              <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
                Estimado(a) <strong>${nombre}</strong>:
              </p>

              <p style="margin: 0 0 20px; font-size: 14px; color: #475569;">
                Para completar su inicio de sesión en el Sistema de Control de Adquisiciones, introduzca el siguiente código de verificación temporal:
              </p>

              <!-- Caja del Código OTP Grande -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #0b183c; border: 2px solid #f59e0b; border-radius: 12px; padding: 18px 36px; text-align: center; box-shadow: 0 4px 12px rgba(11, 24, 60, 0.18);">
                      <span style="display: block; font-size: 11px; font-weight: bold; color: #93c5fd; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                        CÓDIGO DE VERIFICACIÓN 2FA
                      </span>
                      <span style="display: block; font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #fbbf24;">
                        ${code}
                      </span>
                      <span style="display: block; font-size: 11px; color: #cbd5e1; margin-top: 6px;">
                        ⏱ Válido únicamente por <strong>${minutes} minutos</strong>
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Recomendaciones de Seguridad -->
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin: 24px 0 16px;">
                <p style="margin: 0 0 6px; font-size: 12px; font-weight: bold; color: #92400e;">
                  🛡 Protocolo de Seguridad Institucional:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #78350f;">
                  <li style="margin-bottom: 4px;">Este código es intransferible y de un solo uso.</li>
                  <li style="margin-bottom: 4px;">El personal del Organismo Judicial <strong>nunca</strong> le solicitará este código.</li>
                  <li>Si usted no intentó acceder, cambie su contraseña de inmediato y reporte a Seguridad GIT.</li>
                </ul>
              </div>

              <p style="margin: 24px 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Atentamente,<br>
                <strong style="color: #1e293b;">Unidad de Seguridad de la Información</strong><br>
                Gerencia de Informática • Organismo Judicial de Guatemala
              </p>

            </td>
          </tr>

          <!-- Pie Institucional -->
          <tr>
            <td style="background-color: #0b183c; padding: 16px 24px; text-align: center; border-top: 1px solid #1e3a8a;">
              <p style="margin: 0; font-size: 11px; color: #93c5fd;">
                Palacio de Justicia, Centro Cívico, Ciudad de Guatemala
              </p>
              <p style="margin: 4px 0 0; font-size: 10px; color: #64748b;">
                Mensaje de seguridad autogenerado por el Sistema de Control de Adquisiciones. Por favor no responda a este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
