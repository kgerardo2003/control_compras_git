import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  X,
  ShieldAlert,
  Mail,
  Key,
  ShieldCheck,
  Building2,
  Shield,
  Eye,
  Phone,
  MessageSquare,
  Smartphone,
  Scale
} from 'lucide-react';
import { User, UserRole } from '../types';
import { formatDateTime } from '../utils/formatters';
import { TECHNICAL_AREAS_LIST, ALL_AREAS_LABEL, isUserGlobalAdmin } from '../utils/rbacUtils';
import { validatePhoneNumber, formatPhoneNumber } from '../utils/smsService';

export const UsersView: React.FC = () => {
  const { 
    users, 
    addUser, 
    updateUser, 
    toggleUserStatus, 
    deleteUser, 
    userProfiles,
    getUserProfile,
    setActiveTab,
    currentUser,
    catalogs,
    themeConfig,
    sendUserWelcomeEmail,
    showToast
  } = useApp();

  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('Guate2026*');
  const [rol, setRol] = useState<UserRole>('usuario_estandar');
  const [perfilId, setPerfilId] = useState<string>('');
  const [cargo, setCargo] = useState('');
  const [departamento, setDepartamento] = useState('Gerencia de Informática - OJ');
  const [area, setArea] = useState<string>(TECHNICAL_AREAS_LIST[1]);
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [customAreaText, setCustomAreaText] = useState('');
  const [permisoJudicaturas, setPermisoJudicaturas] = useState<'perfil' | 'total' | 'lectura' | 'denegado'>('perfil');
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [dobleFactorHabilitado, setDobleFactorHabilitado] = useState(false);
  const [metodoPreferido2FA, setMetodoPreferido2FA] = useState<'totp' | 'sms' | 'email'>('totp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingEmailUserId, setResendingEmailUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const canManage = currentUser?.rol === 'administrador';

  const handleOpenCreate = () => {
    setUsername('');
    setNombreCompleto('');
    setEmail('');
    setTelefono('');
    setPassword('Guate2026*');
    const defaultProf = userProfiles.find(p => p.codigo === 'usuario_estandar') || userProfiles[0];
    setRol(defaultProf ? (defaultProf.codigo as UserRole) : 'usuario_estandar');
    setPerfilId(defaultProf ? defaultProf.id : '');
    setCargo('');
    setDepartamento('Gerencia de Informática - OJ');
    setArea(TECHNICAL_AREAS_LIST[1]);
    setIsCustomArea(false);
    setCustomAreaText('');
    setPermisoJudicaturas('perfil');
    setNotifyByEmail(true);
    setDobleFactorHabilitado(true);
    setMetodoPreferido2FA('totp');
    setIsSubmitting(false);
    setErrorMsg('');
    setIsNewUserModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setNombreCompleto(user.nombreCompleto);
    setEmail(user.email);
    setTelefono(user.telefono || '');
    setPassword('');
    setRol(user.rol);
    setPerfilId(user.perfilId || '');
    setCargo(user.cargo);
    setDepartamento(user.departamento);
    setMetodoPreferido2FA(user.metodoPreferido2FA === 'sms' ? 'sms' : (user.metodoPreferido2FA === 'email' ? 'email' : 'totp'));
    setPermisoJudicaturas(user.permisoJudicaturas || 'perfil');
    
    const assigned = user.area || user.departamento || '';
    setDobleFactorHabilitado(Boolean(user.dobleFactorHabilitado));
    if (TECHNICAL_AREAS_LIST.includes(assigned as any)) {
      setArea(assigned);
      setIsCustomArea(false);
      setCustomAreaText('');
    } else if (assigned) {
      setArea('custom');
      setIsCustomArea(true);
      setCustomAreaText(assigned);
    } else {
      setArea(user.rol === 'administrador' ? ALL_AREAS_LABEL : TECHNICAL_AREAS_LIST[1]);
      setIsCustomArea(false);
      setCustomAreaText('');
    }

    setIsSubmitting(false);
    setErrorMsg('');
  };

  const handleResendEmail = async (user: User) => {
    if (!user.email) {
      showToast({
        type: 'warning',
        title: 'Sin Correo Institucional',
        message: `El usuario @${user.username} no tiene configurado un correo electrónico.`
      });
      return;
    }

    setResendingEmailUserId(user.id);
    try {
      const res = await sendUserWelcomeEmail(user, user.password || 'Guate2026*');
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Credenciales Enviadas por Correo',
          message: `Se enviaron las credenciales de acceso a ${user.email} con el enlace y las instrucciones de seguridad.`,
          duration: 5000
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Aviso al Enviar Correo',
          message: res.message || 'No se pudo enviar el correo de credenciales.',
          duration: 7000
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error de Envío',
        message: err?.message || 'Ocurrió un error inesperado al enviar el correo.'
      });
    } finally {
      setResendingEmailUserId(null);
    }
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !nombreCompleto.trim() || !email.trim()) {
      setErrorMsg('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (telefono.trim()) {
      const phoneValidation = validatePhoneNumber(telefono);
      if (!phoneValidation.valid) {
        setErrorMsg(phoneValidation.error || 'Formato de número telefónico no válido.');
        return;
      }
    } else if (dobleFactorHabilitado && metodoPreferido2FA === 'sms') {
      setErrorMsg('Para habilitar el método 2FA por SMS, debe ingresar un número de teléfono móvil válido.');
      return;
    }

    const formattedPhone = telefono.trim() ? formatPhoneNumber(telefono) : undefined;
    const resolvedArea = isCustomArea ? customAreaText.trim() : area;

    if (editingUser) {
      updateUser(editingUser.id, {
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim(),
        telefono: formattedPhone,
        rol,
        perfilId: perfilId || undefined,
        cargo: cargo.trim(),
        departamento: departamento.trim() || resolvedArea,
        area: resolvedArea,
        permisoJudicaturas,
        dobleFactorHabilitado,
        metodoPreferido2FA,
        password: password.trim() ? password.trim() : editingUser.password,
      });
      showToast({
        type: 'success',
        title: 'Usuario Actualizado',
        message: `Los datos del usuario @${editingUser.username} fueron actualizados correctamente.`
      });
      setEditingUser(null);
    } else {
      if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
        setErrorMsg('El nombre de usuario ya existe en el sistema.');
        return;
      }

      const assignedPassword = password.trim() || 'Guate2026*';
      setIsSubmitting(true);

      const newUser = addUser({
        username: username.trim().toLowerCase(),
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim(),
        telefono: formattedPhone,
        password: assignedPassword,
        rol,
        perfilId: perfilId || undefined,
        cargo: cargo.trim() || 'Funcionario OJ',
        departamento: departamento.trim() || resolvedArea,
        area: resolvedArea,
        permisoJudicaturas,
        dobleFactorHabilitado,
        metodoPreferido2FA,
        activo: true,
      });

      if (notifyByEmail) {
        try {
          const emailRes = await sendUserWelcomeEmail(newUser, assignedPassword);
          if (emailRes.success) {
            showToast({
              type: 'success',
              title: 'Usuario Creado y Notificado',
              message: `El usuario @${newUser.username} fue registrado exitosamente y se despacharon sus credenciales de acceso a ${newUser.email}.`,
              duration: 6000
            });
          } else {
            showToast({
              type: 'warning',
              title: 'Usuario Creado (Aviso de Envío)',
              message: `Usuario registrado. Sin embargo: ${emailRes.message}. Las credenciales son: Usuario: ${newUser.username} / Contraseña temporal: ${assignedPassword}`,
              duration: 9000
            });
          }
        } catch (err: any) {
          showToast({
            type: 'warning',
            title: 'Usuario Creado',
            message: `Usuario registrado con contraseña temporal: ${assignedPassword}. Falló el envío de correo: ${err?.message}`,
            duration: 8000
          });
        }
      } else {
        showToast({
          type: 'success',
          title: 'Usuario Creado Exitosamente',
          message: `El usuario @${newUser.username} fue registrado con contraseña temporal: ${assignedPassword}.`,
          duration: 5000
        });
      }

      setIsSubmitting(false);
      setIsNewUserModalOpen(false);
    }
  };

  const getRoleBadge = (u: User) => {
    const profile = getUserProfile(u);
    if (profile) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200"
          title={`${profile.modulosPermitidos.length} módulos autorizados: ${profile.modulosPermitidos.join(', ')}`}
        >
          <Key className="w-2.5 h-2.5 text-blue-600" />
          <span>{profile.nombre}</span>
        </span>
      );
    }
    switch (u.rol) {
      case 'administrador':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">ADMINISTRADOR</span>;
      case 'auditor':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">AUDITOR</span>;
      case 'usuario_estandar':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">ESTÁNDAR</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Módulo de Usuarios (Professional Polish) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Administración de Usuarios y Perfiles Institucionales
          </h2>
          <p className="text-xs text-slate-500">
            Control de cuentas, asignación de perfiles RBAC y control de acceso a los módulos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón para administrar perfiles */}
          <button
            type="button"
            onClick={() => setActiveTab('perfiles')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
          >
            <Key className="w-3.5 h-3.5 text-blue-700" />
            <span>Configurar Perfiles ({userProfiles.length})</span>
          </button>

          {canManage ? (
            <button
              id="btn-create-user"
              type="button"
              onClick={handleOpenCreate}
              className={`px-3.5 py-2 rounded-xl ${themeConfig.primaryBtn} text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer`}
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Usuario</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Solo administradores pueden crear o modificar cuentas</span>
            </div>
          )}
        </div>
      </div>

      {/* Matriz Explicativa de Perfiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
              A
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase">Perfil Administrador</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Control total: Registrar, modificar y eliminar adquisiciones, gestionar usuarios y editar catálogos del sistema.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
              AU
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase">Perfil Auditor</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Supervisión y fiscalización: Consulta de adquisiciones, métricas presupuestarias, bitácora de auditoría y exportaciones.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
              U
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase">Usuario Estándar</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Operativo: Registro y edición de requerimientos de compras de la Gerencia de Informática y consulta de dashboard.
          </p>
        </div>
      </div>

      {/* Tabla de Usuarios Registrados */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Nombre Completo</th>
                <th className="px-3 py-3 text-center">Perfil / Rol</th>
                <th className="px-3 py-3">Área / Depto. Asignado</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-3 py-3 text-center">2FA Google</th>
                <th className="px-3 py-3">Último Acceso</th>
                {canManage && <th className="px-4 py-3 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isAdmin = isUserGlobalAdmin(u);
                const assignedArea = u.area || u.departamento || '';
                return (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  
                  {/* Usuario */}
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                    @{u.username}
                  </td>

                  {/* Nombre */}
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {u.nombreCompleto}
                  </td>

                  {/* Rol y Permiso Judicaturas */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      {getRoleBadge(u)}
                      {u.permisoJudicaturas && u.permisoJudicaturas !== 'perfil' && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                          u.permisoJudicaturas === 'total' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : u.permisoJudicaturas === 'lectura'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          Judicaturas: {u.permisoJudicaturas === 'total' ? 'Total' : u.permisoJudicaturas === 'lectura' ? 'Lectura' : 'Denegado'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Área Asignada (Control de Visibilidad) */}
                  <td className="px-3 py-3 text-[11px]">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                        <Shield className="w-3 h-3 text-purple-600" />
                        <span>Acceso Global (Todas las Áreas)</span>
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200 w-fit">
                          <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>{assignedArea || 'Sin Área Específica'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Solo visualiza expedientes de su área
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Estado y Seguridad 2FA */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(u.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            u.activo ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          {u.activo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{u.activo ? 'Activo' : 'Inactivo'}</span>
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 2FA Google Authenticator */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {u.dobleFactorHabilitado !== false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <Smartphone className="w-3 h-3 text-amber-600" />
                        <span>Google TOTP</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                        Desactivado
                      </span>
                    )}
                  </td>

                  {/* Último Acceso */}
                  <td className="px-3 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {formatDateTime(u.ultimoAcceso)}
                  </td>

                  {/* Acciones */}
                  {canManage && (
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleResendEmail(u)}
                          disabled={resendingEmailUserId === u.id}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Enviar credenciales de acceso por correo"
                        >
                          {resendingEmailUserId === u.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar Usuario"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Cuenta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}

                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Usuario */}
      {(isNewUserModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUser ? 'Modificar Usuario Institucional' : 'Registrar Nuevo Usuario'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsNewUserModalOpen(false); setEditingUser(null); }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de Usuario *</label>
                <input
                  type="text"
                  disabled={!!editingUser}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. jgomez"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="ej. Lic. Juan Carlos Gómez"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo Electrónico OJ *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. jgomez@oj.gob.gt"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    Número de Teléfono Móvil
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Formato: +502 XXXX-XXXX</span>
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="ej. +502 5555-0199 o 55550199"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Número de línea de contacto móvil del usuario.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil Institucional / Rol *</label>
                  <select
                    value={perfilId || rol}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selectedProf = userProfiles.find(p => p.id === val || p.codigo === val);
                      if (selectedProf) {
                        setPerfilId(selectedProf.id);
                        setRol(selectedProf.codigo as UserRole);
                      } else {
                        setRol(val as UserRole);
                        setPerfilId('');
                      }
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500"
                  >
                    {userProfiles.length > 0 ? (
                      userProfiles.map(prof => (
                        <option key={prof.id} value={prof.id}>
                          {prof.nombre} ({prof.modulosPermitidos.length} módulos)
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="usuario_estandar">Usuario Estándar</option>
                        <option value="auditor">Auditor</option>
                        <option value="administrador">Administrador</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingUser ? 'Nueva Contraseña' : 'Contraseña *'}
                  </label>
                  <input
                    type={editingUser ? "password" : "text"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? 'Mantener actual' : 'Guate2026*'}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono text-xs"
                    required={!editingUser}
                  />
                </div>
              </div>

              {/* Parametrización Específica del Módulo de Judicaturas (Requisito Solicitado) */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Scale className="w-3.5 h-3.5 text-blue-900" />
                    <span>Parametrización: Módulo de Judicaturas</span>
                  </label>
                  <span className="text-[10px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                    Roles y Perfiles
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Define el nivel de acceso para este usuario al Módulo de Control de Judicaturas y Adecuaciones TIC:
                </p>
                <select
                  value={permisoJudicaturas}
                  onChange={(e) => setPermisoJudicaturas(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-xs text-slate-800 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="perfil">
                    Heredar del Perfil asignado ({userProfiles.find(p => p.id === perfilId || p.codigo === rol)?.modulosPermitidos.includes('judicaturas') ? 'Tiene Acceso' : 'Sin Acceso'})
                  </option>
                  <option value="total">Acceso Total (Crear, Editar, Acciones y Ficha Técnica)</option>
                  <option value="lectura">Solo Lectura (Visualizar sedes, árbol y Descargar Ficha)</option>
                  <option value="denegado">Acceso Restringido (Ocultar Módulo de Judicaturas)</option>
                </select>
              </div>

              {/* Asignación de Área o Departamento para control de visibilidad RBAC */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Área o Departamento Asignado *</span>
                </div>
                
                <p className="text-[11px] text-slate-500 leading-snug">
                  Define a qué expedientes tendrá acceso el usuario. Los usuarios de áreas técnicas (ej. <strong>Desarrollo</strong>, <strong>Redes y Telecomunicaciones</strong>) únicamente podrán ver las adquisiciones de su área. Los Administradores tienen visibilidad global.
                </p>

                <select
                  value={isCustomArea ? 'custom' : area}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setIsCustomArea(true);
                    } else {
                      setIsCustomArea(false);
                      setArea(val);
                      if (!departamento || departamento === 'Gerencia de Informática - OJ' || TECHNICAL_AREAS_LIST.includes(departamento as any)) {
                        setDepartamento(val === ALL_AREAS_LABEL ? 'Gerencia de Informática - OJ' : val);
                      }
                    }
                  }}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold text-xs text-slate-800"
                >
                  {TECHNICAL_AREAS_LIST.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  <option value="custom">+ Otra Área / Dependencia Personalizada...</option>
                </select>

                {isCustomArea && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nombre del Área o Dependencia Técnica:
                    </label>
                    <input
                      type="text"
                      value={customAreaText}
                      onChange={(e) => {
                        setCustomAreaText(e.target.value);
                        setDepartamento(e.target.value);
                      }}
                      placeholder="ej. Unidad de Seguridad Informática y Auditoría"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-xs"
                      required={isCustomArea}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cargo Institucional</label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="ej. Analista de Sistemas / Ingeniero de Redes"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dependencia Institucional (Texto complementario)</label>
                <input
                  type="text"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  placeholder="ej. Gerencia de Informática - Organismo Judicial"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Doble Factor Google Authenticator */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-800 text-xs">Doble Factor con Google Authenticator</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dobleFactorHabilitado}
                      onChange={(e) => setDobleFactorHabilitado(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-600">
                  Protección de cuenta con tokens TOTP generados dinámicamente cada 30 segundos en Google Authenticator.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsNewUserModalOpen(false); setEditingUser(null); }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingUser ? 'Actualizar Usuario' : 'Guardar Usuario'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
