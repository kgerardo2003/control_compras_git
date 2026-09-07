import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_mailer';

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  return res.status(200).json({
    status: 'ok',
    environment: 'vercel-serverless',
    time: new Date().toISOString()
  });
}
