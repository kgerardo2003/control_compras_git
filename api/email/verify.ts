import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createGmailTransporter, setCorsHeaders } from '../_mailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { transporter, user, host, port } = createGmailTransporter(body);
    await transporter.verify();

    return res.status(200).json({
      success: true,
      message: `Credenciales de Gmail verificadas con éxito en ${host}:${port} para la cuenta ${user} en Vercel.`,
      account: user
    });
  } catch (error: any) {
    console.error('Error verificando credenciales en Vercel:', error);
    let userMsg = error?.message || 'Error de conexión con los servidores de Google Gmail.';
    if (error?.code === 'EAUTH') {
      userMsg = 'Fallo de autenticación con Gmail en Vercel. Verifique que la Contraseña de Aplicación de 16 caracteres sea correcta.';
    }
    return res.status(400).json({
      success: false,
      message: userMsg,
      code: error?.code
    });
  }
}
