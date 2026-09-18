import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Lock, 
  User as UserIcon, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Mail,
  RefreshCw,
  Clock,
  Smartphone,
  QrCode,
  Copy,
  Check,
  X
} from 'lucide-react';
import { TwoFactorMethod } from '../types';
import { 
  getOrCreateTotpSecret, 
  generateOtpAuthUri, 
  generateTotpQrCodeDataUrl 
} from '../utils/totpUtils';
import { OJLogo } from './OJLogo';

export const LoginView: React.FC = () => {
  const { 
    initiateLogin, 
    verify2FACode, 
    set2FAMethod,
    resend2FACode, 
    cancel2FA, 
    pending2FA, 
    setActiveTab 
  } = useApp();
  
  // Paso de autenticación: 'credentials' (Paso 1) o 'twoFactor' (Paso 2)
  const [step, setStep] = useState<'credentials' | 'twoFactor'>('credentials');

  // Método de 2FA seleccionado (por defecto Google Authenticator TOTP)
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('totp');
  const [showStep1QrModal, setShowStep1QrModal] = useState<boolean>(false);
  const [step1QrUrl, setStep1QrUrl] = useState<string>('');
  const [step1Secret, setStep1Secret] = useState<string>('');
  const [copiedStep1Secret, setCopiedStep1Secret] = useState<boolean>(false);

  // Formulario Paso 1: Credenciales
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Formulario Paso 2: Doble Factor (2FA)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutos en segundos
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOpenStep1QrModal = async () => {
    const targetUser = username.trim() || 'admin';
    const secret = getOrCreateTotpSecret(targetUser);
    const uri = generateOtpAuthUri(targetUser, secret);
    setStep1Secret(secret);
    setShowStep1QrModal(true);
    try {
      const url = await generateTotpQrCodeDataUrl(uri);
      setStep1QrUrl(url);
    } catch (e) {
      console.error('Error generando QR para vista previa:', e);
    }
  };

  // Temporizador para expiración del código 2FA
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (step === 'twoFactor' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setErrorMsg('El código de seguridad ha expirado. Por favor solicite un nuevo código.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timeLeft]);

  // Temporizador para el cooldown de reenvío (30 segundos)
  useEffect(() => {
    let cdTimer: NodeJS.Timeout | null = null;
    if (resendCooldown > 0) {
      cdTimer = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (cdTimer) clearInterval(cdTimer);
    };
  }, [resendCooldown]);

  // Enfocar el primer input cuando cambia al paso de 2FA
  useEffect(() => {
    if (step === 'twoFactor') {
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Manejo de envío del Paso 1 (Credenciales)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Por favor ingrese su usuario institucional.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Por favor ingrese su contraseña de acceso.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await initiateLogin(username.trim(), password, selectedMethod);
      setIsLoading(false);

      if (result.success) {
        if (result.requires2FA) {
          setStep('twoFactor');
          setTimeLeft(300);
          setResendCooldown(30);
          setOtpDigits(['', '', '', '', '', '']);
          if (selectedMethod === 'totp') {
            setSuccessMsg('Verificación 2FA iniciada con Google Authenticator. Ingrese el código temporal de 6 dígitos.');
          } else {
            setSuccessMsg('Código de verificación enviado exitosamente a su correo institucional.');
          }
        } else {
          setSuccessMsg(`Credenciales verificadas exitosamente. Ingresando al panel principal...`);
          setActiveTab('dashboard');
        }
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Error durante la verificación de credenciales.');
    }
  };

  // Manejo de dígitos del 2FA
  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, ''); // Solo dígitos
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Manejar pegado de varios dígitos
      const pastedDigits = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedDigits[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pastedDigits.length, 5);
      digitInputRefs.current[nextIndex]?.focus();

      // Si se completaron los 6 dígitos, auto-verificar
      if (pastedDigits.length === 6) {
        verifyCodeSubmission(pastedDigits.join(''));
      }
      return;
    }

    newDigits[index] = cleaned.slice(-1);
    setOtpDigits(newDigits);
    setErrorMsg('');

    // Avanzar al siguiente input
    if (cleaned && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    // Si se completan los 6 dígitos
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      verifyCodeSubmission(fullCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        digitInputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    const nextIndex = Math.min(pasted.length, 5);
    digitInputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      verifyCodeSubmission(pasted);
    }
  };

  // Verificación final del código 2FA
  const verifyCodeSubmission = (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    setErrorMsg('');

    if (code.length !== 6) {
      setErrorMsg('Por favor ingrese el código completo de 6 dígitos.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = verify2FACode(code, pending2FA?.activeMethod);
      setIsLoading(false);
      if (result.success) {
        setSuccessMsg(result.message);
        setTimeout(() => {
          setActiveTab('dashboard');
        }, 500);
      } else {
        setErrorMsg(result.message);
        // Limpiar inputs en fallo para facilitar reintento
        setOtpDigits(['', '', '', '', '', '']);
        digitInputRefs.current[0]?.focus();
      }
    }, 400);
  };

  // Reenviar código 2FA por correo
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await resend2FACode();
      setIsResending(false);
      if (result.success) {
        setSuccessMsg(result.message);
        setTimeLeft(300);
        setResendCooldown(30);
        setOtpDigits(['', '', '', '', '', '']);
        digitInputRefs.current[0]?.focus();
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setIsResending(false);
      setErrorMsg(err?.message || 'Error al reenviar el código.');
    }
  };

  // Cancelar y volver al paso de credenciales
  const handleCancel2FA = () => {
    cancel2FA();
    setStep('credentials');
    setErrorMsg('');
    setSuccessMsg('');
    setOtpDigits(['', '', '', '', '', '']);
    setShowQrCode(false);
  };

  // Copiar clave secreta Base32 al portapapeles
  const handleCopySecret = () => {
    if (pending2FA?.totpSecret) {
      navigator.clipboard.writeText(pending2FA.totpSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  // Cambio de método 2FA
  const handleSwitchMethod = (method: 'email' | 'totp') => {
    set2FAMethod(method);
    setOtpDigits(['', '', '', '', '', '']);
    setErrorMsg('');
    setSuccessMsg('');
    setTimeout(() => {
      digitInputRefs.current[0]?.focus();
    }, 50);
  };

  // Formato de tiempo restante MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#0a1533] text-slate-100 font-sans relative overflow-x-hidden selection:bg-[#1c39bb] selection:text-white">
      
      {/* Fondo con Textura Institucional Sutil */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#4682b4 0.85px, transparent 0.85px), radial-gradient(#1c39bb 0.85px, #070e24 0.85px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px'
        }}
      />

      {/* Barra Superior Decorativa de la República de Guatemala */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#1c39bb] via-[#4682b4] to-[#1c39bb]" />

      {/* Contenedor Principal Centrado */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4 sm:my-8">
        <div className="w-full max-w-lg bg-[#0d1d45]/95 backdrop-blur-md rounded-2xl border border-[#4682b4]/40 shadow-2xl overflow-hidden transition-all duration-300">
          
          {/* Encabezado Institucional con Logotipo Oficial */}
          <div className="p-6 sm:p-7 text-center border-b border-[#1c39bb]/40 bg-gradient-to-b from-[#0e214f] to-[#0a1738]">
            
            <div className="w-full flex justify-center mb-3">
              <OJLogo size="xl" layout="stacked" variant="full" lightMode={false} />
            </div>

            <div className="mt-4 pt-3 border-t border-[#1c39bb]/40 flex items-center justify-center gap-2 text-[#93c5fd] text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#4682b4]" />
              <span>Sistema de Control de Adquisiciones • Gerencia de Informática</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              Registro, Monitoreo y Fiscalización de Formularios F56-e y Eventos NOG
            </p>
          </div>

          {/* Cuerpo del Formulario */}
          <div className="p-6 sm:p-8 bg-[#0b183c]">
            
            {/* Mensajes de Alerta y Notificación */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Alerta de Autenticación:</span>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* PASO 1: Ingreso de Usuario y Contraseña */}
            {step === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4 animate-in fade-in">
                
                {/* Campo Usuario */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5">
                    Usuario Institucional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ingrese su usuario"
                      disabled={isLoading}
                      autoFocus
                      className="w-full pl-9 pr-4 py-2.5 bg-[#060f26]/80 border border-[#4682b4]/40 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4682b4] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Campo Contraseña */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                      Contraseña de Acceso
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Sensible a mayúsculas
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoading}
                      className="w-full pl-9 pr-10 py-2.5 bg-[#060f26]/80 border border-[#4682b4]/40 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4682b4] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Selector de Método de Doble Factor (2FA) */}
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                      Segundo Factor de Autenticación (2FA):
                    </label>
                    <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      Obligatorio
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('totp')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        selectedMethod === 'totp'
                          ? 'bg-[#102452] border-amber-400 shadow-md ring-1 ring-amber-400/60 text-white'
                          : 'bg-[#060f26]/70 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                          Google Authenticator
                        </span>
                        {selectedMethod === 'totp' && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/40" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1 leading-tight">
                        Códigos dinámicos en su app móvil cada 30s (Recomendado)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('email')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        selectedMethod === 'email'
                          ? 'bg-[#102452] border-blue-400 shadow-md ring-1 ring-blue-400/60 text-white'
                          : 'bg-[#060f26]/70 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          Correo Institucional
                        </span>
                        {selectedMethod === 'email' && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-400/40" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1 leading-tight">
                        Código de 6 dígitos enviado a su correo institucional
                      </p>
                    </button>
                  </div>

                  {/* Enlace para ver QR o instrucciones de Google Authenticator */}
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={handleOpenStep1QrModal}
                      className="text-amber-300 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer font-medium transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-400" />
                      <span className="underline">¿Primera vez? Ver instrucciones y vincular QR de Google Authenticator</span>
                    </button>
                  </div>
                </div>

                {/* Botón Continuar / Paso 1 */}
                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider shadow-lg border border-slate-300 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                      <span>Verificando Credenciales...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-slate-900" />
                      <span>Continuar con Doble Factor (2FA)</span>
                      <ArrowRight className="w-4 h-4 text-slate-900" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PASO 2: Verificación de Segundo Factor (2FA) */}
            {step === 'twoFactor' && (
              <div className="space-y-5 animate-in fade-in">
                
                {/* Selector de Método de Verificación 2FA */}
                <div className="bg-[#071330] p-1 rounded-xl border border-[#4682b4]/40">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSwitchMethod('email')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        pending2FA?.activeMethod === 'email'
                          ? 'bg-gradient-to-r from-[#1c39bb] to-[#2b52d9] text-white shadow-md border border-[#93c5fd]/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c204e]/60'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Correo OTP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchMethod('totp')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        pending2FA?.activeMethod === 'totp'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold shadow-md border border-amber-300/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c204e]/60'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Google Authenticator</span>
                    </button>
                  </div>
                </div>

                {/* Tarjeta de Información según el Método Activo */}
                {pending2FA?.activeMethod === 'totp' ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#0e2254] border border-amber-500/40 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="text-left space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                            Google Authenticator (TOTP)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Dinámico 30s
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Abra la app <strong className="text-white">Google Authenticator</strong> en su teléfono móvil e introduzca el código temporal de 6 dígitos.
                        </p>
                      </div>
                    </div>

                    {/* Botón y Panel desplegable para Ver / Vincular con Código QR */}
                    <div className="rounded-xl border border-[#1c39bb]/40 bg-[#071330]/70 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowQrCode(!showQrCode)}
                        className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#0c204e]/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-amber-400" />
                          <span>¿Primera vez o necesita vincular? Escanear código QR</span>
                        </div>
                        <span className="text-[11px] text-amber-400 font-bold underline">
                          {showQrCode ? 'Ocultar QR' : 'Mostrar QR'}
                        </span>
                      </button>

                      {showQrCode && (
                        <div className="p-4 pt-2 border-t border-[#1c39bb]/40 bg-[#06102a] space-y-3.5 animate-in fade-in">
                          <div className="text-xs text-slate-300 leading-relaxed text-left">
                            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                              <li>Abra la aplicación <strong>Google Authenticator</strong> en su teléfono.</li>
                              <li>Presione el botón <strong>"+"</strong> y elija <strong>"Escanear un código QR"</strong>.</li>
                              <li>Apunta la cámara al código QR que aparece abajo:</li>
                            </ol>
                          </div>

                          {/* Imagen del Código QR */}
                          <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-inner max-w-[210px] mx-auto border-2 border-amber-400/50">
                            {pending2FA?.qrCodeUrl ? (
                              <img
                                src={pending2FA.qrCodeUrl}
                                alt="Código QR Google Authenticator"
                                className="w-44 h-44 object-contain rounded-md"
                              />
                            ) : (
                              <div className="w-44 h-44 flex items-center justify-center text-slate-500 text-xs">
                                Cargando QR...
                              </div>
                            )}
                            <span className="text-[10px] font-mono text-slate-700 font-bold mt-1 text-center">
                              OJ - {pending2FA?.username}
                            </span>
                          </div>

                          {/* Clave Secreta Manual */}
                          {pending2FA?.totpSecret && (
                            <div className="p-2.5 rounded-lg bg-[#0a1738] border border-[#4682b4]/30 space-y-1 text-left">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                O ingrese esta clave manualmente en su app:
                              </span>
                              <div className="flex items-center justify-between gap-2">
                                <code className="font-mono text-xs text-amber-300 font-bold tracking-wider break-all select-all">
                                  {pending2FA.totpSecret}
                                </code>
                                <button
                                  type="button"
                                  onClick={handleCopySecret}
                                  className="px-2.5 py-1 rounded bg-[#1c39bb]/60 hover:bg-[#1c39bb] text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                >
                                  {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedSecret ? 'Copiada' : 'Copiar'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Método Correo Institucional */
                  <div className="p-3.5 rounded-xl bg-[#0e2254] border border-[#1c39bb]/60 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1c39bb] border border-[#4682b4]/60 flex items-center justify-center text-amber-400 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="text-left space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Código de Seguridad por Correo
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          OTP Seguro
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Hemos despachado un código confidencial de 6 dígitos a su correo electrónico:
                      </p>
                      <div className="flex items-center gap-1.5 pt-1 text-[#93c5fd] font-mono text-xs font-semibold">
                        <Mail className="w-3.5 h-3.5 text-[#4682b4]" />
                        <span>{pending2FA?.maskedEmail || 'correo institucional'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Casillas de Entrada para el Código de 6 Dígitos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                      {pending2FA?.activeMethod === 'totp' ? 'Código de Google Authenticator' : 'Código de Seguridad (6 dígitos)'}
                    </label>
                    {pending2FA?.activeMethod === 'email' ? (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className={timeLeft < 60 ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-300'}>
                          Expira en {formatTime(timeLeft)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Se actualiza cada 30s</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 sm:gap-3 py-2" onPaste={handlePaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { digitInputRefs.current[idx] = el; }}
                        id={`otp-input-digit-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        disabled={isLoading || (pending2FA?.activeMethod === 'email' && timeLeft === 0)}
                        placeholder="•"
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-bold text-xl rounded-xl border transition-all placeholder:text-slate-600 ${
                          digit
                            ? 'bg-[#12285e] border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                            : 'bg-[#060f26]/90 border-[#4682b4]/40 text-white focus:border-[#4682b4] focus:ring-2 focus:ring-[#4682b4]/30'
                        } focus:outline-none`}
                      />
                    ))}
                  </div>
                </div>

                {/* Botón de Confirmación del Código */}
                <button
                  id="btn-verify-2fa-submit"
                  type="button"
                  onClick={() => verifyCodeSubmission()}
                  disabled={isLoading || otpDigits.join('').length !== 6 || (pending2FA?.activeMethod === 'email' && timeLeft === 0)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Verificando Token 2FA...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-slate-950" />
                      <span>Verificar e Ingresar al Sistema</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </>
                  )}
                </button>

                {/* Acciones de Reenvío y Navegación */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1c39bb]/30 text-xs">
                  {pending2FA?.activeMethod === 'email' ? (
                    <button
                      id="btn-resend-2fa-code"
                      type="button"
                      onClick={handleResendCode}
                      disabled={isResending || resendCooldown > 0}
                      className="flex items-center gap-1.5 text-slate-300 hover:text-amber-300 disabled:text-slate-500 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                      <span>
                        {resendCooldown > 0
                          ? `Reenviar en ${resendCooldown}s`
                          : 'Reenviar código por correo'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchMethod('email')}
                      className="flex items-center gap-1.5 text-slate-300 hover:text-amber-300 font-medium transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#93c5fd]" />
                      <span>Recibir código por correo en su lugar</span>
                    </button>
                  )}

                  {/* Botón Volver a Credenciales */}
                  <button
                    id="btn-cancel-2fa-step"
                    type="button"
                    onClick={handleCancel2FA}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a credenciales</span>
                  </button>
                </div>

              </div>
            )}

            {/* Aviso Institucional de Seguridad y Privacidad */}
            <div className="mt-6 pt-5 border-t border-[#1c39bb]/30">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#071129]/80 border border-[#4682b4]/30 text-slate-300">
                <ShieldCheck className="w-5 h-5 text-[#4682b4] flex-shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed text-left">
                  <p className="font-bold text-xs text-white">
                    Acceso Oficial Protegido con Doble Factor (2FA)
                  </p>
                  <p className="text-[11px] text-slate-300">
                    El ingreso a esta plataforma requiere autenticación en dos pasos. Toda sesión y transacción es fiscalizada y registrada en la bitácora de auditoría interna de la GIT.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Pie del Panel de Login */}
          <div className="px-6 py-3 bg-[#060e24] border-t border-[#1c39bb]/40 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>TERMINAL: GIT-SEC-01</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMA OPERATIVO SEGURO (2FA ACTIVO)
            </span>
          </div>

        </div>
      </div>

      {/* Pie de Página Institucional */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80 z-10">
        <p className="font-semibold text-slate-400">
          Organismo Judicial de Guatemala • Gerencia de Informática
        </p>
        <p className="text-[12px] text-slate-300 mt-1">
          Creador del Sistema: <strong className="text-amber-400 font-bold">Lic. Kevin Gerardo López de León</strong>
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          Palacio de Justicia, Centro Cívico, Ciudad de Guatemala • Todos los derechos reservados © 2026
        </p>
      </footer>

      {/* Modal Rápido de Vinculación QR en Paso 1 */}
      {showStep1QrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0b183c] border border-amber-400/40 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
            
            <div className="px-5 py-3.5 border-b border-[#1c39bb]/40 bg-gradient-to-r from-[#0d1f4d] to-[#0a1738] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Vincular Google Authenticator</h3>
                  <p className="text-[10px] text-slate-300">Usuario: {username.trim() || 'admin'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStep1QrModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-center">
              <div className="bg-[#071330] p-3 rounded-xl border border-[#4682b4]/30 text-[11px] text-slate-300 text-left space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pasos para escanear:</span>
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
                  <li>Abra <strong>Google Authenticator</strong> en su celular.</li>
                  <li>Toque <strong>"+"</strong> y elija <strong>"Escanear un código QR"</strong>.</li>
                  <li>Apunte la cámara a la pantalla.</li>
                </ol>
              </div>

              {/* QR Image */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-inner max-w-[200px] mx-auto border-2 border-amber-400">
                {step1QrUrl ? (
                  <img src={step1QrUrl} alt="QR Google Authenticator" className="w-40 h-40 object-contain rounded" />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs">
                    Generando QR...
                  </div>
                )}
                <span className="text-[9px] font-mono text-slate-800 font-bold mt-1">
                  OJ - {username.trim() || 'admin'}
                </span>
              </div>

              {/* Clave Secreta */}
              {step1Secret && (
                <div className="p-2.5 rounded-lg bg-[#0a1738] border border-[#4682b4]/30 text-left space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Clave de configuración manual:
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-xs text-amber-300 font-bold tracking-wider break-all select-all">
                      {step1Secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(step1Secret);
                        setCopiedStep1Secret(true);
                        setTimeout(() => setCopiedStep1Secret(false), 2500);
                      }}
                      className="px-2 py-1 rounded bg-[#1c39bb] hover:bg-[#254bdb] text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                    >
                      {copiedStep1Secret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedStep1Secret ? 'Copiada' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowStep1QrModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow cursor-pointer transition-all"
              >
                Entendido / Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
