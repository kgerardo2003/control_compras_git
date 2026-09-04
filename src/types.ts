export type UserRole = 'administrador' | 'auditor' | 'usuario_estandar';

export interface User {
  id: string;
  username: string;
  nombreCompleto: string;
  email: string;
  password?: string;
  rol: UserRole;
  cargo: string;
  departamento: string;
  activo: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}

export type EvaluacionGIT = 'Sí' | 'No';

export type EstatusEventoDefault = 'Evaluación' | 'Adjudicación' | 'Prescindido' | 'Desierto';

export interface AttachedDocument {
  nombre: string;
  tamano?: number;
  tipo?: string;
  fechaSubida?: string;
  dataUrl?: string; // Archivo base64 / blob URL para descarga y visualización
}

export interface PurchaseRecord {
  id: string;
  descripcion: string; // Max 200
  f56e: string;        // Máscara 000000-0000 (11 car.)
  f56: string;         // Máscara 000000 (6 dígitos numéricos)
  f56Documento?: AttachedDocument; // Documento físico/digital de la F56 adjunto
  fechaSolicitud: string;   // YYYY-MM-DD
  fechaVoBo: string;        // YYYY-MM-DD
  fechaAutorizado: string;  // YYYY-MM-DD
  nog: string;              // 8 digits numeric
  fechaPublicacion: string; // YYYY-MM-DD
  fechaOfertas: string;     // YYYY-MM-DD
  cantidadOfertas: number;  // Numeric >= 0
  monto: number;            // Quetzales (GTQ)
  evaluadoGIT: EvaluacionGIT; // Sí | No
  estatusEvento: string;    // Evaluación | Adjudicación | Prescindido | Desierto or custom
  areaSolicitante?: string;
  categoriaTecnologica?: string;
  dependenciaSolicitante?: string;
  modalidadCompra?: string;
  proveedorAdjudicado?: string;
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
  observaciones?: string;
}

export interface CatalogItem {
  id: string;
  codigo: string;
  valor: string;
  descripcion?: string;
  activo: boolean;
  color?: string;
}

export interface Catalog {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  esSistema: boolean;
  items: CatalogItem[];
}

export type AuditAction = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'CREAR_COMPRA' 
  | 'EDITAR_COMPRA' 
  | 'ELIMINAR_COMPRA' 
  | 'CAMBIO_ESTATUS' 
  | 'CREAR_CATALOGO' 
  | 'EDITAR_CATALOGO' 
  | 'CREAR_USUARIO' 
  | 'EDITAR_USUARIO' 
  | 'EXPORTAR_DATOS'
  | 'RESTAURAR_DATOS';

export interface AuditLogEntry {
  id: string;
  fecha: string;
  usuario: string;
  rol: UserRole;
  accion: AuditAction;
  modulo: 'Autenticación' | 'Compras' | 'Catálogos' | 'Usuarios' | 'Auditoría' | 'Reportes' | 'Sistema';
  detalles: string;
  registroId?: string;
  ip: string;
  valoresAnteriores?: Record<string, any>;
  valoresNuevos?: Record<string, any>;
}

export type NotificationType = 'urgente' | 'alerta' | 'info' | 'exito';

export interface AppNotification {
  id: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  enlaceId?: string;
  categoria: 'vencimiento_oferta' | 'cambio_estatus' | 'aprobacion_vobo' | 'nuevo_registro' | 'sistema';
}

export type ActiveTab = 'dashboard' | 'compras' | 'catalogos' | 'auditoria' | 'usuarios' | 'reportes' | 'personalizacion';

export type SystemThemeId = 'azul_persia_acero' | 'slate_ambar' | 'azul_judicial' | 'grafito_esmeralda';

export interface CustomLogoConfig {
  type: 'preset' | 'custom_image';
  presetId?: 'oj_vector' | 'oj_monogram' | 'escudo_nacional';
  imageUrl?: string;
  title: string;
  subtitle: string;
}
