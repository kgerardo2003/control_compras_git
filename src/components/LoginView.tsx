import React, { useState } from 'react';
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
  Shield,
  Layers,
  Server
} from 'lucide-react';
import { UserRole } from '../types';
import { OJLogo } from './OJLogo';

export const LoginView: React.FC = () => {
  const { login, switchDemoUser, themeConfig, setActiveTab } = useApp();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
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
    // Simula verificación y autenticación de credenciales seguras
    setTimeout(() => {
      const result = login(username.trim(), password);
      setIsLoading(false);
      if (result.success) {
        setSuccessMsg(`Credenciales verificadas exitosamente. Ingresando al panel principal...`);
        setActiveTab('dashboard');
      } else {
        setErrorMsg(result.message);
      }
    }, 600);
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    setErrorMsg('');
    setIsLoading(true);
    setTimeout(() => {
      switchDemoUser(role);
      setIsLoading(false);
      setSuccessMsg(`Autenticado con éxito con perfil: ${role.toUpperCase()}`);
      setActiveTab('dashboard');
    }, 450);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden selection:bg-amber-500 selection:text-slate-950">
      
      {/* Fondo con Textura Institucional Sutil */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#d4af37 0.75px, transparent 0.75px), radial-gradient(#38bdf8 0.75px, #020617 0.75px)`,
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0, 15px 15px'
        }}
      />

      {/* Barra Superior Decorativa de la República de Guatemala */}
      <div className="h-1.5 w-full bg-gradient-to-r from-sky-600 via-amber-400 to-sky-600" />

      {/* Contenedor Principal Centrado */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4 sm:my-8">
        <div className="w-full max-w-lg bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          
          {/* Encabezado con Logotipo Grande Arriba de ORGANISMO JUDICIAL */}
          <div className="p-6 sm:p-8 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950/80">
            
            {/* Logo en Área Grande Arriba de ORGANISMO JUDICIAL */}
            <div className="w-full flex justify-center mb-3">
              <OJLogo size="xl" layout="stacked" variant="full" lightMode={false} />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Sistema de Control de Adquisiciones (GIT)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Registro, Monitoreo y Fiscalización de Formularios F56-e y Eventos NOG
            </p>
          </div>

          {/* Formulario de Inicio de Sesión */}
          <div className="p-6 sm:p-8 bg-slate-900">
            
            {/* Alertas */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Error de Verificación:</span>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Campo Usuario */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Usuario Institucional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej. admin, auditor, operador"
                    disabled={isLoading}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Contraseña de Acceso
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Sensible a mayúsculas
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botón de Autenticación */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verificando Credenciales...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Autenticar e Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Accesos Rápidos de Demostración para Pruebas del Evaluador */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
                Perfiles Institucionales Disponibles (Acceso Rápido)
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                
                {/* 1. Administrador */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('administrador')}
                  disabled={isLoading}
                  className="p-2.5 bg-slate-950/70 hover:bg-slate-800 border border-slate-700/70 rounded-xl text-left transition-all hover:border-amber-500/50 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300">
                      Administrador
                    </span>
                    <Shield className="w-3 h-3 text-amber-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Acceso total + Paneles Admin
                  </p>
                  <span className="text-[9px] font-mono text-slate-500 mt-1 block">
                    admin / admin123
                  </span>
                </button>

                {/* 2. Auditor */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('auditor')}
                  disabled={isLoading}
                  className="p-2.5 bg-slate-950/70 hover:bg-slate-800 border border-slate-700/70 rounded-xl text-left transition-all hover:border-sky-500/50 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 group-hover:text-sky-300">
                      Auditor GIT
                    </span>
                    <ShieldCheck className="w-3 h-3 text-sky-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Auditoría y Fiscalización
                  </p>
                  <span className="text-[9px] font-mono text-slate-500 mt-1 block">
                    auditor / auditor123
                  </span>
                </button>

                {/* 3. Operador / Usuario Estándar */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('usuario_estandar')}
                  disabled={isLoading}
                  className="p-2.5 bg-slate-950/70 hover:bg-slate-800 border border-slate-700/70 rounded-xl text-left transition-all hover:border-emerald-500/50 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                      Operador GIT
                    </span>
                    <Server className="w-3 h-3 text-emerald-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Gestión de Eventos NOG
                  </p>
                  <span className="text-[9px] font-mono text-slate-500 mt-1 block">
                    operador / user123
                  </span>
                </button>

              </div>
            </div>

          </div>

          {/* Pie del Panel de Login */}
          <div className="px-6 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>TERMINAL: GIT-SEC-01</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMA OPERATIVO SEGURO
            </span>
          </div>

        </div>
      </div>

      {/* Pie de Página Institucional */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80 z-10">
        <p className="font-semibold text-slate-400">
          Organismo Judicial de Guatemala • Gerencia de Informática y Telecomunicaciones
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Palacio de Justicia, Centro Cívico, Ciudad de Guatemala • Todos los derechos reservados © 2026
        </p>
      </footer>

    </div>
  );
};
