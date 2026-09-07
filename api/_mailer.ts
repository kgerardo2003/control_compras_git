import nodemailer from 'nodemailer';

export function normalizeEmail(email?: string): string {
  if (!email) return '';
  let cleaned = email.trim();
  if (cleaned.toLowerCase().endsWith('@gmail') || cleaned.toLowerCase().endsWith('@gmail.')) {
    cleaned = cleaned.replace(/@gmail\.?$/i, '@gmail.com');
  }
  return cleaned;
}

export function normalizeAppPassword(pass?: string): string {
  if (!pass) return '';
  return pass.replace(/["']/g, '').trim();
}

export function createGmailTransporter(config: {
  userEmail?: string;
  appPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  secure?: boolean;
}) {
  const user = normalizeEmail(config.userEmail || process.env.GMAIL_USER || 'kgerardo2003@gmail.com');
  const pass = normalizeAppPassword(config.appPassword || process.env.GMAIL_APP_PASSWORD || 'pwwv bgmb wgak bvdn');
  const host = config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(config.smtpPort || process.env.SMTP_PORT || 465);
  const secure = config.secure !== undefined ? Boolean(config.secure) : (port === 465);

  if (!user || !user.includes('@')) {
    throw new Error('La dirección de correo de Gmail no es válida. Asegúrese de incluir @gmail.com.');
  }
  if (!pass || pass.length < 8) {
    throw new Error('La contraseña de aplicación de Google es requerida (16 caracteres).');
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    }),
    user,
    host,
    port
  };
}

export function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}
