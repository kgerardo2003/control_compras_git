import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Smartphone, 
  QrCode, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { 
  getOrCreateTotpSecret, 
  generateOtpAuthUri, 
  generateTotpQrCodeDataUrl, 
  validateTotpToken 
} from '../utils/totpUtils';

export const GoogleAuthModal: React.FC = () => {
  const { 
    currentUser, 
    isGoogleAuthModalOpen, 
    setIsGoogleAuthModalOpen,
    showToast 
  } = useApp();

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);
  const [testCode, setTestCode] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState<boolean>(true);

  const username = currentUser?.username || 'admin';
  const displaySecret = totpSecret.match(/.{1,4}/g)?.join(' ') || totpSecret;

  useEffect(() => {
    if (!isGoogleAuthModalOpen) {
      setTestCode('');
      setTestResult(null);
      setCopiedSecret(false);
      return;
    }

    const secret = getOrCreateTotpSecret(username, currentUser?.totpSecret);
    setTotpSecret(secret);
    const uri = generateOtpAuthUri(username, secret);

    setIsLoadingQr(true);
    generateTotpQrCodeDataUrl(uri)
      .then(url => {
        setQrCodeUrl(url);
        setIsLoadingQr(false);
      })
      .catch(err => {
        console.error('Error generando QR para Google Authenticator:', err);
        setIsLoadingQr(false);
      });
  }, [isGoogleAuthModalOpen, username, currentUser?.totpSecret]);

  if (!isGoogleAuthModalOpen) return null;

  const handleCopySecret = () => {
    if (!totpSecret) return;
    navigator.clipboard.writeText(totpSecret.replace(/\s+/g, ''));
    setCopiedSecret(true);
    showToast({
      title: 'Clave Secreta Copiada',
      message: 'Clave TOTP copiada al portapapeles. Péguela en Google Authenticator si prefiere ingreso manual.',
      type: 'exito'
    });
    setTimeout(() => setCopiedSecret(false), 3000);
  };

  const handleVerifyTestCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCode || testCode.length !== 6) {
      setTestResult({
        success: false,
        message: 'Ingrese el código de 6 dígitos que muestra su teléfono en Google Authenticator.'
      });
      return;
    }

    const isValid = validateTotpToken(testCode, totpSecret, username);
    if (isValid) {
      setTestResult({
        success: true,
        message: '¡Excelente! Su aplicación Google Authenticator está vinculada y sincronizada correctamente.'
      });
    } else {
      setTestResult({
        success: false,
        message: 'Código inválido o expirado. Verifique la hora de su teléfono y asegúrese de que el código corresponda a esta cuenta.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0b183c] border border-[#4682b4]/40 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-[#1c39bb]/40 bg-gradient-to-r from-[#0d1f4d] to-[#0a1738] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Google Authenticator (2FA)</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  TOTP Oficial
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Vincule su aplicación móvil para iniciar sesión de forma segura
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsGoogleAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Instrucciones Paso a Paso */}
          <div className="bg-[#071330] p-4 rounded-xl border border-[#4682b4]/30 space-y-2 text-xs">
            <p className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Instrucciones de Vinculación:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>Instale <strong className="text-white">Google Authenticator</strong> en su teléfono (Android / iOS).</li>
              <li>Abra la app, presione el botón <strong className="text-amber-300">"+"</strong> y elija <strong className="text-white">"Escanear un código QR"</strong>.</li>
              <li>Escanee el código inferior o escriba la clave manual si la cámara no enfoca.</li>
            </ol>
          </div>

          {/* Código QR y Secreto */}
          <div className="flex flex-col items-center justify-center p-5 bg-[#050e24] rounded-xl border border-[#4682b4]/40 text-center space-y-3">
            <div className="p-3 bg-white rounded-xl shadow-lg">
              {isLoadingQr ? (
                <div className="w-48 h-48 flex flex-col items-center justify-center gap-2 text-slate-700">
                  <div className="w-6 h-6 border-2 border-[#1c39bb] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-mono">Generando código QR...</span>
                </div>
              ) : qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Código QR Google Authenticator" 
                  className="w-48 h-48 block"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-rose-500 text-xs">
                  Error al generar QR
                </div>
              )}
            </div>

            <div className="w-full space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Clave de Configuración Manual:</span>
                <span className="text-amber-400 font-mono text-[10px]">Base32</span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0a1636] border border-[#4682b4]/30">
                <code className="font-mono text-xs font-bold text-amber-300 tracking-wider select-all break-all text-left">
                  {displaySecret || totpSecret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="px-2.5 py-1 rounded bg-[#1c39bb] hover:bg-[#254bdb] text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSecret ? 'Copiada' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-mono">
              Cuenta: <span className="text-slate-200 font-bold">{username}@oj.gob.gt</span> • Emisor: <span className="text-slate-200">Organismo Judicial GT</span>
            </div>
          </div>

          {/* Prueba de Validación en Tiempo Real */}
          <form onSubmit={handleVerifyTestCode} className="space-y-3 pt-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
              Probar Código Generado por su Teléfono
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={testCode}
                onChange={(e) => setTestCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-36 py-2 px-3 text-center font-mono font-bold text-lg bg-[#060f26] border border-[#4682b4]/40 rounded-xl text-amber-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Comprobar Código</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 animate-in fade-in ${
                testResult.success 
                  ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200' 
                  : 'bg-red-950/70 border border-red-500/50 text-red-200'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-tight">{testResult.message}</span>
              </div>
            )}
          </form>

        </div>

        {/* Pie */}
        <div className="px-6 py-3.5 bg-[#071330] border-t border-[#1c39bb]/40 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            Compatible con Google Authenticator, Microsoft y Authy
          </span>
          <button
            type="button"
            onClick={() => setIsGoogleAuthModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
          >
            Listo / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
