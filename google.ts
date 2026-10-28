/**
 * @license
 * Endpoint Serverless Vercel: Autenticación Federada con Google Identity Services
 * Organismo Judicial de Guatemala - Ciberseguridad GIT
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { INITIAL_USERS } from '../../src/data/initialData';
import firebaseConfigFile from '../../firebase-applet-config.json';
import { verifyGoogleTokenAndAuthorize } from '../../src/utils/googleAuth';

const GOOGLE_CLIENT_ID = 
  process.env.GOOGLE_CLIENT_ID || 
  process.env.VITE_GOOGLE_CLIENT_ID || 
  firebaseConfigFile.oAuthClientId || 
  '93475370198-iqdmo8kusfgar0b5e7g6rh7buq6bfeav.apps.googleusercontent.com';

const JWT_SECRET = 
  process.env.JWT_SECRET || 
  'oj_seguridad_informatica_token_signature_key_2026';

const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Retornar configuración del proveedor
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      clientId: GOOGLE_CLIENT_ID,
      provider: 'Google Identity Services (GIS)',
      enforceWhitelist: true,
      mfaPolicy: process.env.POLICY_REQUIRE_GOOGLE_2FA_STEP_UP === 'true' ? 'STEP_UP_REQUIRED' : 'GOOGLE_MFA_TRUSTED'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido. Use POST.' });
  }

  try {
    const { credential, requireStepUp2FA } = req.body || {};

    if (!credential) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIAL',
        message: 'No se recibió la credencial de Google.'
      });
    }

    // 1. Verificación Criptográfica del Token de Google y Whitelist en Firebase
    const verification = await verifyGoogleTokenAndAuthorize(credential, GOOGLE_CLIENT_ID);

    if (!verification.success || !verification.user) {
      return res.status(verification.code === 'ACCOUNT_NOT_REGISTERED' || verification.code === 'ACCOUNT_INACTIVE' ? 403 : 401).json({
        success: false,
        code: verification.code || 'INVALID_TOKEN',
        message: verification.message,
        email: verification.googlePayload?.email,
        googleName: verification.googlePayload?.name
      });
    }

    const { email, name, picture, sub } = verification.googlePayload!;
    const userFound = verification.user;

    if (!userFound.activo) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: `Cuenta suspendida: El usuario institucional asignado a (${email}) está inactivo.`,
        email
      });
    }

    // 3. Política de 2FA
    const enforceStepUp = 
      Boolean(requireStepUp2FA) || 
      process.env.POLICY_REQUIRE_GOOGLE_2FA_STEP_UP === 'true';

    if (enforceStepUp && userFound.dobleFactorHabilitado !== false) {
      return res.status(200).json({
        success: true,
        requires2FA: true,
        code: '2FA_REQUIRED',
        message: 'Paso 1 completado con Google SSO. Se requiere ingresar su código de Google Authenticator.',
        user: {
          id: userFound.id,
          username: userFound.username,
          nombreCompleto: userFound.nombreCompleto,
          email: userFound.email,
          rol: userFound.rol
        }
      });
    }

    // 4. Emitir Sesión Final Autenticada
    const enrichedUser = {
      ...userFound,
      authMethod: 'GOOGLE_SSO' as const,
      googlePictureUrl: picture,
      googleSub: sub,
      ultimoAcceso: new Date().toISOString()
    };

    const sessionToken = jwt.sign(
      {
        sub: enrichedUser.id,
        username: enrichedUser.username,
        email: enrichedUser.email,
        rol: enrichedUser.rol,
        authMethod: 'GOOGLE_SSO',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60
      },
      JWT_SECRET
    );

    return res.status(200).json({
      success: true,
      requires2FA: false,
      message: `Autenticación exitosa con Google. Bienvenido(a), ${enrichedUser.nombreCompleto}.`,
      user: enrichedUser,
      token: sessionToken,
      authMethod: 'GOOGLE_SSO'
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: error?.message || 'Error interno en autenticación con Google.'
    });
  }
}
