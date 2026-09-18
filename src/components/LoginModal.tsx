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
  X,
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
  MessageSquare,
  Phone
} from 'lucide-react';
import { TwoFactorMethod } from '../types';

export const LoginModal: React.FC = () => {
  const { 
    isLoginModalOpen, 
    setIsLoginModalOpen, 
    initiateLogin, 
    verify2FACode, 
    set2FAMethod,
    resend2FACode, 
    cancel2FA, 
    pending2FA 
  } = useApp();
  
  const [step, setStep] = useState<'credentials' | 'twoFactor'>('credentials');
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('totp');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset when modal closes
  useEffect(() => {
    if (!isLoginModalOpen) {
      setStep('credentials');
      setUsername('');
      setPassword('');
      setErrorMsg('');
      setSuccessMsg('');
      setOtpDigits(['', '', '', '', '', '']);
    }
  }, [isLoginModalOpen]);

  // Expiration countdown
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

  // Resend cooldown timer
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

  // Focus first digit on 2FA step
  useEffect(() => {
    if (step === 'twoFactor') {
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  if (!isLoginModalOpen) return null;

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Por favor ingrese su usuario institucional.');
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
            setSuccessMsg('Verificación con Google Authenticator requerida.');
          } else if (selectedMethod === 'sms') {
            setSuccessMsg(`Código de verificación enviado por mensaje SMS al teléfono móvil registrado.`);
          } else {
            setSuccessMsg(`Código de verificación enviado al correo registrado en su ficha de usuario.`);
          }
        } else {
          setSuccessMsg(result.message);
          setTimeout(() => {
            setIsLoginModalOpen(false);
          }, 800);
        }
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Error durante la verificación.');
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      const pastedDigits = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedDigits[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pastedDigits.length, 5);
      digitInputRefs.current[nextIndex]?.focus();

      if (pastedDigits.length === 6) {
        verifyCodeSubmission(pastedDigits.join(''));
      }
      return;
    }

    newDigits[index] = cleaned.slice(-1);
    setOtpDigits(newDigits);
    setErrorMsg('');

    if (cleaned && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

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

  const verifyCodeSubmission = (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    setErrorMsg('');

    if (code.length !== 6) {
      setErrorMsg('Por favor ingrese el código de 6 dígitos.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = verify2FACode(code, pending2FA?.activeMethod);
      setIsLoading(false);
      if (result.success) {
        setSuccessMsg(result.message);
        setTimeout(() => {
          setIsLoginModalOpen(false);
        }, 600);
      } else {
        setErrorMsg(result.message);
        setOtpDigits(['', '', '', '', '', '']);
        digitInputRefs.current[0]?.focus();
      }
    }, 400);
  };

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

  const handleCancel2FA = () => {
    cancel2FA();
    setStep('credentials');
    setErrorMsg('');
    setSuccessMsg('');
    setOtpDigits(['', '', '', '', '', '']);
    setShowQrCode(false);
  };

  const handleCopySecret = () => {
    if (pending2FA?.totpSecret) {
      navigator.clipboard.writeText(pending2FA.totpSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleSwitchMethod = (method: TwoFactorMethod) => {
    set2FAMethod(method);
    setOtpDigits(['', '', '', '', '', '']);
    setErrorMsg('');
    setSuccessMsg('');
    setTimeout(() => {
      digitInputRefs.current[0]?.focus();
    }, 50);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Encabezado Institucional */}
        <div className="bg-[#0d1f4d] p-6 text-white text-center relative border-b border-[#1c39bb]/40">
          <button
            type="button"
            onClick={() => {
              cancel2FA();
              setIsLoginModalOpen(false);
            }}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162e7a] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-[#1c39bb] border border-[#4682b4]/50 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              OJ
            </div>
          </div>
          
          <h2 className="text-base font-bold uppercase tracking-wider text-white">
            Organismo Judicial de Guatemala
          </h2>
          <p className="text-xs text-[#93c5fd] mt-0.5">
            Gerencia de Informática • Autenticación Segura (2FA)
          </p>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6">
          
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* PASO 1: Credenciales */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-900">Autenticación de Usuario</h3>
                <p className="text-xs text-slate-500">
                  Ingrese sus credenciales oficiales para iniciar el proceso de verificación.
                </p>
              </div>

              {/* Input Usuario */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Usuario Institucional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="modal-input-login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682b4] focus:border-[#4682b4]"
                    required
                  />
                </div>
              </div>

              {/* Input Contraseña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="modal-input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682b4] focus:border-[#4682b4]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Selector de Método 2FA en Modal */}
              <div className="pt-1 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Método de Doble Factor (2FA):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('totp')}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedMethod === 'totp'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm ring-1 ring-amber-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs text-amber-800">
                      <Smartphone className="w-3 h-3 text-amber-600" />
                      <span className="truncate">Google Auth</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                      App móvil
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('email')}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedMethod === 'email'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm ring-1 ring-blue-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs text-blue-800">
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span className="truncate">Correo OTP</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                      Código email
                    </p>
                  </button>
                </div>
              </div>

              <button
                id="modal-btn-submit-login"
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-300 active:scale-95"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
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

          {/* PASO 2: Verificación de Código 2FA */}
          {step === 'twoFactor' && (
            <div className="space-y-4">
              
              {/* Selector de Método 2FA */}
              <div className="bg-slate-100 p-1 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => handleSwitchMethod('totp')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      pending2FA?.activeMethod === 'totp'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span className="truncate">Google Auth</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchMethod('email')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      pending2FA?.activeMethod === 'email'
                        ? 'bg-[#1c39bb] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span className="truncate">Correo OTP</span>
                  </button>
                </div>
              </div>

              {/* Información del Método Activo */}
              {pending2FA?.activeMethod === 'totp' ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-900">Google Authenticator (TOTP)</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                        Dinámico
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Abra la app <strong>Google Authenticator</strong> en su teléfono e ingrese el código de 6 dígitos.
                    </p>
                  </div>

                  {/* Panel Desplegable de Vinculación QR */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden text-left">
                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="w-full flex items-center justify-between p-2.5 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <QrCode className="w-3.5 h-3.5 text-blue-600" />
                        <span>¿Vincular app? Escanear código QR</span>
                      </span>
                      <span className="text-[11px] text-blue-600 font-bold underline">
                        {showQrCode ? 'Ocultar' : 'Ver QR'}
                      </span>
                    </button>

                    {showQrCode && (
                      <div className="p-3 pt-1 border-t border-slate-200 bg-white space-y-2.5 text-center">
                        <p className="text-[11px] text-slate-500 text-left">
                          Escanee este código con la app Google Authenticator:
                        </p>
                        
                        <div className="flex justify-center p-2 bg-slate-50 rounded-lg border border-slate-200 w-fit mx-auto">
                          {pending2FA?.qrCodeUrl ? (
                            <img
                              src={pending2FA.qrCodeUrl}
                              alt="Código QR TOTP"
                              className="w-36 h-36 object-contain"
                            />
                          ) : (
                            <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                              Cargando QR...
                            </div>
                          )}
                        </div>

                        {pending2FA?.totpSecret && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200 text-left flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Clave secreta:</span>
                              <code className="text-xs font-mono font-bold text-slate-800">{pending2FA.totpSecret}</code>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopySecret}
                              className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-medium flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              {copiedSecret ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedSecret ? 'Copiada' : 'Copiar'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold text-blue-900">Verificación por Correo (OTP)</span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Código de 6 dígitos despachado al correo registrado en su ficha:
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 font-mono text-xs font-bold text-blue-950">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>{pending2FA?.maskedEmail || 'correo registrado'}</span>
                  </div>
                </div>
              )}

              {/* Casillas del Código */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {pending2FA?.activeMethod === 'totp'
                      ? 'Código de Google Authenticator'
                      : 'Código de Seguridad por Correo (6 dígitos)'}
                  </label>
                  {pending2FA?.activeMethod !== 'totp' ? (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{formatTime(timeLeft)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-600">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>30s por código</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 py-1" onPaste={handlePaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { digitInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      disabled={isLoading || (pending2FA?.activeMethod !== 'totp' && timeLeft === 0)}
                      placeholder="•"
                      className={`w-10 h-12 text-center font-mono font-bold text-lg rounded-lg border transition-all ${
                        digit
                          ? 'bg-blue-50 border-blue-600 text-blue-900'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                      } focus:outline-none`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => verifyCodeSubmission()}
                disabled={isLoading || otpDigits.join('').length !== 6 || (pending2FA?.activeMethod !== 'totp' && timeLeft === 0)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#1c39bb] to-[#254bdb] hover:from-[#162e7a] hover:to-[#1c39bb] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Verificar e Ingresar</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                {pending2FA?.activeMethod === 'email' ? (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending || resendCooldown > 0}
                    className="flex items-center gap-1 text-slate-600 hover:text-blue-700 disabled:text-slate-400 font-medium cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    <span>{resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código por correo'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchMethod('email')}
                      className="flex items-center gap-1 text-slate-600 hover:text-blue-700 font-medium cursor-pointer"
                    >
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span>Recibir código por correo</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCancel2FA}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Volver</span>
                </button>
              </div>

            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-200 text-center space-y-1.5">
            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#4682b4]" />
              <span>Acceso oficial restringido. Sesión registrada en bitácora de auditoría.</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Creador del Sistema: <strong className="text-slate-900 font-bold">Lic. Kevin Gerardo López de León</strong>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
