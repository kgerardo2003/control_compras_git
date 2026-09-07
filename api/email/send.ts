import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createGmailTransporter, normalizeEmail, setCorsHeaders } from '../_mailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido. Se requiere POST.`
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { to, subject, html, text, senderName } = body;
    let recipientsList: string[] = [];

    if (Array.isArray(to)) {
      recipientsList = to.map(normalizeEmail).filter(Boolean);
    } else if (typeof to === 'string') {
      recipientsList = to.split(',').map(normalizeEmail).filter(Boolean);
    }

    if (recipientsList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar al menos un destinatario válido.'
      });
    }

    const { transporter, user } = createGmailTransporter(body);
    const fromDisplayName = senderName || 'Sistema de Control de Compras - GIT OJ';

    const info = await transporter.sendMail({
      from: `"${fromDisplayName}" <${user}>`,
      to: recipientsList.join(', '),
      subject: subject || '[NOTIFICACIÓN] Sistema de Compras - GIT OJ',
      text: text || 'Notificación oficial generada por el Sistema de Control de Compras GIT OJ.',
      html: html || `<p>${text}</p>`
    });

    return res.status(200).json({
      success: true,
      message: `Notificación enviada con éxito a ${recipientsList.length} destinatario(s).`,
      messageId: info.messageId,
      recipients: recipientsList
    });
  } catch (error: any) {
    console.error('Error enviando notificación en Vercel:', error);
    return res.status(400).json({
      success: false,
      message: error?.message || 'Error al enviar la notificación por correo desde Vercel.',
      code: error?.code
    });
  }
}
