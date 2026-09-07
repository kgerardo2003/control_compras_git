import type { VercelRequest, VercelResponse } from '@vercel/node';
import sendHandler from './email/send';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return sendHandler(req, res);
}
