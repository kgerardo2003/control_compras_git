/**
 * @license
 * Catálogo de Servicios Contratados Iniciales
 * Gerencia de Informática - Organismo Judicial de Guatemala
 * Basado en la estructura oficial de Servicios_Consolidados.xlsx
 */

import { ServicioContratado } from '../types';

export const INITIAL_SERVICIOS_CONTRATADOS: ServicioContratado[] = [
  {
    id: 'srv-2026-001',
    codigo: 'SC-2026-001',
    area: 'Seguridad Informática',
    departamento: 'Unidad de Seguridad Informática y Ciberdefensa',
    servicioContratado: 'Suscripción, Actualización y Soporte Técnico para Plataforma de Firewalls de Próxima Generación (Fortinet)',
    objetoAlcance: 'Renovación de firmas IPS/AV, soporte 24/7 FortiCare para clusters perimetrales del Data Center Central y sedes regionales judiciales, garantizando continuidad de inspección de paquetes cifrados SSL/TLS.',
    modalidad: 'Compra directa',
    nogExpediente: '18492031',
    proveedorActual: 'Seguridad y Redes Empresariales de Guatemala, S.A.',
    inicioVigencia: '2025-05-15',
    finVigencia: '2026-10-25', // ~27 días restantes (activa umbral de Compra Directa <= 45 días)
    estatusActual: 'Por vencer',
    accionRequerida: 'Iniciar nuevo evento',
    fechaInicioGestion: '2026-09-10',
    responsableSeguimiento: 'Ing. Carlos Mendoza (Seguridad TI)',
    riesgoContinuidad: 'Alto',
    observaciones: 'Requiere validación de números de serie con mayorista regional para garantizar prórroga de garantías sin interrupción.',
    adjuntos: {
      especificacionesTecnicas: {
        nombre: 'TDR-Fortinet-Firewalls-2026.pdf',
        tamano: 245000,
        tipo: 'application/pdf',
        fechaSubida: '2025-05-10T10:30:00Z'
      },
      f56: {
        nombre: 'F56e-Formulario-18492031.pdf',
        tamano: 182000,
        tipo: 'application/pdf',
        fechaSubida: '2025-05-12T14:15:00Z'
      },
      ordenCompra: {
        nombre: 'Contrato-Admin-045-2025.pdf',
        tamano: 512000,
        tipo: 'application/pdf',
        fechaSubida: '2025-05-15T09:00:00Z'
      },
      factura: {
        nombre: 'Factura-SAT-SerieA-98124.pdf',
        tamano: 98000,
        tipo: 'application/pdf',
        fechaSubida: '2025-05-20T11:45:00Z'
      }
    },
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2025-05-15T08:00:00Z'
  },
  {
    id: 'srv-2026-002',
    codigo: 'SC-2026-002',
    area: 'Infraestructura',
    departamento: 'Departamento de Servidores y Almacenamiento',
    servicioContratado: 'Licenciamiento y Soporte Enterprise para Plataforma de Virtualización de Servidores (VMware vSphere)',
    objetoAlcance: 'Licenciamiento por núcleos para clústeres de servidores hiperconvergentes que alojan el Sistema de Gestión de Tribunales (SGT), portal de notificaciones electrónicas y bases de datos transaccionales.',
    modalidad: 'Licitación',
    nogExpediente: '19043215',
    proveedorActual: 'Consorcio Tecnológico de Centroamérica, S.A.',
    inicioVigencia: '2025-01-01',
    finVigencia: '2026-12-31', // ~94 días restantes (activa umbral de licitación <= 120 días)
    estatusActual: 'Vigente',
    accionRequerida: 'Definir técnicamente requerimiento',
    fechaInicioGestion: '2026-08-15',
    responsableSeguimiento: 'Ing. Andrea Morales (Infraestructura)',
    riesgoContinuidad: 'Alto',
    observaciones: 'Por cambio de modelo de licenciamiento de VMware/Broadcom es indispensable actualizar el inventario de sockets y vCPU.',
    adjuntos: {
      especificacionesTecnicas: {
        nombre: 'Bases-Licitacion-VMware-vSphere.pdf',
        tamano: 420000,
        tipo: 'application/pdf',
        fechaSubida: '2024-11-20T11:00:00Z'
      },
      ordenCompra: {
        nombre: 'Contrato-Licitacion-012-2025.pdf',
        tamano: 890000,
        tipo: 'application/pdf',
        fechaSubida: '2024-12-28T16:20:00Z'
      }
    },
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2025-01-01T08:00:00Z'
  },
  {
    id: 'srv-2026-003',
    codigo: 'SC-2026-003',
    area: 'Redes y Telecomunicaciones',
    departamento: 'Sección de Conectividad y Enlaces de Datos',
    servicioContratado: 'Servicio de Enlaces MPLS y Fibra Óptica Dedicada para Judicaturas y Tribunales de la República',
    objetoAlcance: 'Provisión de 120 enlaces de datos redundantes con ancho de banda simétrico garantizado para tribunales penales, juzgados de paz y salas de apelaciones en los 22 departamentos de Guatemala.',
    modalidad: 'Licitación UEEP',
    nogExpediente: '17554890',
    proveedorActual: 'Telecomunicaciones de Guatemala, S.A. (Claro)',
    inicioVigencia: '2024-11-01',
    finVigencia: '2026-10-31', // ~33 días restantes (crítico para licitación UEEP)
    estatusActual: 'En gestión de nuevo evento',
    accionRequerida: 'Dar seguimiento a adjudicación',
    fechaInicioGestion: '2026-06-01',
    responsableSeguimiento: 'Ing. Rodrigo Castillo (Telecomunicaciones)',
    riesgoContinuidad: 'Alto',
    observaciones: 'Nuevo evento publicado bajo NOG 21094833 en fase de evaluación técnica de ofertas por junta de cotización/licitación.',
    adjuntos: {
      especificacionesTecnicas: {
        nombre: 'TDR-Red-MPLS-Nacional.pdf',
        tamano: 630000,
        tipo: 'application/pdf',
        fechaSubida: '2024-09-15T09:10:00Z'
      },
      f56: {
        nombre: 'F56-Dictamen-Telecom.pdf',
        tamano: 154000,
        tipo: 'application/pdf',
        fechaSubida: '2024-10-02T12:00:00Z'
      },
      ordenCompra: {
        nombre: 'Contrato-Adjudicado-UEEP-008.pdf',
        tamano: 920000,
        tipo: 'application/pdf',
        fechaSubida: '2024-10-29T15:30:00Z'
      }
    },
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2024-11-01T08:00:00Z'
  },
  {
    id: 'srv-2026-004',
    codigo: 'SC-2026-004',
    area: 'Servicios',
    departamento: 'Unidad de Mesa de Ayuda y Soporte a Usuarios',
    servicioContratado: 'Servicio de Mantenimiento Preventivo y Correctivo de Impresoras Térmicas y Escáneres de Expedientes Judiciales',
    objetoAlcance: 'Soporte técnico on-site, sustitución de rodillos, calibración óptica y limpieza general para 450 escáneres de alto volumen utilizados en la digitalización de procesos judiciales.',
    modalidad: 'Baja cuantía',
    nogExpediente: '19876223',
    proveedorActual: 'Soluciones Ofimáticas de Guatemala, S.A.',
    inicioVigencia: '2026-04-01',
    finVigencia: '2026-10-15', // ~17 días restantes (activa umbral de Baja Cuantía <= 30 días)
    estatusActual: 'Por vencer',
    accionRequerida: 'Iniciar nuevo evento',
    fechaInicioGestion: '2026-09-15',
    responsableSeguimiento: 'Licda. Sofia Arreaga (Mesa de Ayuda)',
    riesgoContinuidad: 'Medio',
    observaciones: 'Se debe coordinar con inventarios la solicitud de nuevo pedido de baja cuantía con 3 cotizaciones electrónicas.',
    adjuntos: {
      f56: {
        nombre: 'F56e-Mantenimiento-Escaneres.pdf',
        tamano: 120000,
        tipo: 'application/pdf',
        fechaSubida: '2026-03-25T10:00:00Z'
      },
      factura: {
        nombre: 'Factura-FEL-BajaCuantia.pdf',
        tamano: 95000,
        tipo: 'application/pdf',
        fechaSubida: '2026-04-10T11:20:00Z'
      }
    },
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-04-01T08:00:00Z'
  },
  {
    id: 'srv-2026-005',
    codigo: 'SC-2026-005',
    area: 'Administración y Desarrollo de Sistemas',
    departamento: 'Unidad de Bases de Datos Transaccionales',
    servicioContratado: 'Soporte Especializado 24x7 y Actualizaciones para Motores de Base de Datos Oracle Database Enterprise Edition',
    objetoAlcance: 'Servicio de soporte oficial Premier Support, parches críticos de seguridad (CPU/PSU) y afinamiento de rendimiento para las bases de datos de Casos Penales, Civil, Familia y Laboral.',
    modalidad: 'Cotización',
    nogExpediente: '18239011',
    proveedorActual: 'Sistemas Corporativos Avanzados de Occidente, S.A.',
    inicioVigencia: '2025-11-15',
    finVigencia: '2026-11-14', // ~47 días restantes (activa alerta anticipada de cotización)
    estatusActual: 'Por vencer',
    accionRequerida: 'Iniciar nuevo evento',
    fechaInicioGestion: '2026-08-15',
    responsableSeguimiento: 'Ing. Fernando Quezada (DBA)',
    riesgoContinuidad: 'Alto',
    observaciones: 'Expediente F56-e en preparación para remisión a la Dirección de Compras.',
    adjuntos: {
      especificacionesTecnicas: {
        nombre: 'TDR-Oracle-PremierSupport-2026.pdf',
        tamano: 310000,
        tipo: 'application/pdf',
        fechaSubida: '2025-10-30T09:40:00Z'
      },
      ordenCompra: {
        nombre: 'Orden-Compra-Oracle-099.pdf',
        tamano: 440000,
        tipo: 'application/pdf',
        fechaSubida: '2025-11-14T17:00:00Z'
      }
    },
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2025-11-15T08:00:00Z'
  },
  {
    id: 'srv-2026-006',
    codigo: 'SC-2026-006',
    area: 'Infraestructura',
    departamento: 'Departamento de Mantenimiento de Centros de Datos',
    servicioContratado: 'Mantenimiento Preventivo y Correctivo Integral de Sistemas Eléctricos, UPS y Aires Acondicionados de Precisión del Data Center',
    objetoAlcance: 'Revisión mensual de bancos de baterías, plantas eléctricas de emergencia, sistema de supresión de incendios por gas limpio FM-200 y climatización de salas de servidores.',
    modalidad: 'Cotización',
    nogExpediente: '18902111',
    proveedorActual: 'Ingeniería Electromecánica del Sur, S.A.',
    inicioVigencia: '2025-06-01',
    finVigencia: '2026-05-31', // Vencido hace meses (desfase para semáforo rojo)
    estatusActual: 'Vencido',
    accionRequerida: 'Regularizar expediente',
    fechaInicioGestion: '2026-04-01',
    responsableSeguimiento: 'Ing. Julio Godoy (Data Center)',
    riesgoContinuidad: 'Alto',
    observaciones: 'Se encuentra operando con orden de compra de contingencia mientras se finaliza adjudicación de nuevo evento.',
    adjuntos: {
      especificacionesTecnicas: {
        nombre: 'Bases-Tecnicas-DataCenter-Clima.pdf',
        tamano: 580000,
        tipo: 'application/pdf',
        fechaSubida: '2025-05-10T10:15:00Z'
      },
      f56: {
        nombre: 'F56-DataCenter-2025.pdf',
        tamano: 160000,
        tipo: 'application/pdf',
        fechaSubida: '2025-05-18T14:00:00Z'
      }
    },
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2025-06-01T08:00:00Z'
  },
  {
    id: 'srv-2026-007',
    codigo: 'SC-2026-007',
    area: 'Unidad de Operación de los Servicios',
    departamento: 'Sección de Monitoreo NOC y Almacenamiento',
    servicioContratado: 'Póliza de Servicio y Repuestos para Almacenamiento Central SAN/NAS (Dell EMC Unity)',
    objetoAlcance: 'Sustitución de discos de estado sólido NVMe y controladoras en menos de 4 horas en caso de falla por telemetría ProSupport Plus.',
    modalidad: 'Renovación',
    nogExpediente: '19342001',
    proveedorActual: 'Sistemas y Redes Globales, S.A.',
    inicioVigencia: '2025-10-01',
    finVigencia: '2027-09-30', // Más de 365 días (completamente verde)
    estatusActual: 'Vigente',
    accionRequerida: 'No aplica',
    fechaInicioGestion: '2027-06-01',
    responsableSeguimiento: 'Ing. Roberto Paz (NOC)',
    riesgoContinuidad: 'Bajo',
    observaciones: 'Contrato plurianual ejecutándose con satisfacción técnica y reportes mensuales de SLA cumplidos al 99.98%.',
    adjuntos: {
      ordenCompra: {
        nombre: 'Contrato-SAN-Dell-Unity.pdf',
        tamano: 670000,
        tipo: 'application/pdf',
        fechaSubida: '2025-09-25T16:00:00Z'
      }
    },
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2025-10-01T08:00:00Z'
  },
  {
    id: 'srv-2026-008',
    codigo: 'SC-2026-008',
    area: 'Estadística',
    departamento: 'Unidad de Inteligencia de Negocios y Analítica Judicial',
    servicioContratado: 'Suscripción de Licenciamiento Power BI Embedded y Almacenamiento Azure Data Lake',
    objetoAlcance: 'Consumo mensual de capacidades de procesamiento analítico en la nube para tableros de producción judicial de la Corte Suprema de Justicia.',
    modalidad: 'Excepción',
    nogExpediente: 'EXP-ESTAD-2026-04',
    proveedorActual: 'Microsoft Corporation Centroamérica',
    inicioVigencia: '2026-01-01',
    finVigencia: '2026-12-31',
    estatusActual: 'Vigente',
    accionRequerida: 'No aplica',
    fechaInicioGestion: '2026-10-15',
    responsableSeguimiento: 'Lic. Mario Cifuentes (Estadística)',
    riesgoContinuidad: 'Medio',
    observaciones: 'Convenio marco gubernamental administrado conforme a la Ley de Contrataciones del Estado.',
    adjuntos: {
      especificacionesTecnicas: {
        nombre: 'TDR-Analitica-Azure.pdf',
        tamano: 195000,
        tipo: 'application/pdf',
        fechaSubida: '2025-12-15T11:20:00Z'
      }
    },
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-01-01T08:00:00Z'
  }
];

export const CATALOGO_AREAS_SERVICIOS: string[] = [
  'Servicios',
  'Infraestructura',
  'Seguridad Informática',
  'Administración y Desarrollo de Sistemas',
  'Estadística',
  'Unidad de Operación de los Servicios',
  'Redes y Telecomunicaciones'
];

export const CATALOGO_MODALIDADES_SERVICIOS: string[] = [
  'Compra directa',
  'Baja cuantía',
  'Cotización',
  'Licitación',
  'Licitación UEEP',
  'Renovación',
  'Excepción'
];

export const CATALOGO_ESTATUS_SERVICIOS: string[] = [
  'Vigente',
  'Por vencer',
  'Vencido',
  'En prórroga',
  'En ejecución',
  'En gestión de nuevo evento',
  'Pendiente de adjudicación',
  'Suspendido'
];

export const CATALOGO_ACCIONES_REQUERIDAS: string[] = [
  'Iniciar nuevo evento',
  'Solicitar prórroga',
  'Dar seguimiento a adjudicación',
  'Regularizar expediente',
  'Definir técnicamente requerimiento',
  'No aplica'
];
