import { JudicaturaRecord } from '../types';

export const INITIAL_JUDICATURAS: JudicaturaRecord[] = [
  {
    id: 'jud-2026-001',
    nombreJudicatura: 'Juzgado Pluripersonal de Primera Instancia Penal, Narcoactividad y Delitos contra el Ambiente de Villa Nueva',
    tipoRamo: 'Penal',
    fechaInicioAdecuaciones: '2026-01-15',
    fechaFinAdecuaciones: '2026-03-30',
    equipoComputo: 'Si',
    equipoAudio: 'Si',
    cableadoEstructurado: 'Si',
    enlaceDatos: 'Si',
    fechaInauguracion: '2026-04-15',
    estadoInauguracion: 'Inaugurado',
    observaciones: [
      {
        id: 'obs-001-3',
        numeroAccion: 3,
        fecha: '2026-03-25T14:30:00Z',
        autor: 'Lic. Kevin Gerardo López de León (Administrador)',
        texto: 'Enlace de datos de fibra óptica y redundancia inalámbrica verificado y certificado con velocidad de 100 Mbps simétricos. Enrutamiento directo hacia Torre de Tribunales activo.'
      },
      {
        id: 'obs-001-2',
        numeroAccion: 2,
        fecha: '2026-02-28T10:15:00Z',
        autor: 'Ing. Marco Vinicio Cruz (Infraestructura Redes)',
        texto: 'Finalizada la instalación de 48 puntos de red Categoría 6A y gabinete rack de piso. Pruebas de atenuación y certificación Fluke aprobadas.'
      },
      {
        id: 'obs-001-1',
        numeroAccion: 1,
        fecha: '2026-01-15T08:00:00Z',
        autor: 'Lic. Kevin Gerardo López de León (Administrador)',
        texto: 'Apertura de expediente e inicio de adecuaciones físicas y eléctricas para la nueva sede del juzgado pluripersonal.'
      }
    ],
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-01-15T08:00:00Z'
  },
  {
    id: 'jud-2026-002',
    nombreJudicatura: 'Juzgado Segundo de Paz Civil, Familia y Trabajo del Municipio de Mixco',
    tipoRamo: 'Civil',
    fechaInicioAdecuaciones: '2026-02-01',
    fechaFinAdecuaciones: '2026-04-20',
    equipoComputo: 'Si',
    equipoAudio: 'No',
    cableadoEstructurado: 'Si',
    enlaceDatos: 'Si',
    fechaInauguracion: '',
    estadoInauguracion: 'Pendiente Fecha',
    observaciones: [
      {
        id: 'obs-002-2',
        numeroAccion: 2,
        fecha: '2026-03-18T11:00:00Z',
        autor: 'Ing. Marco Vinicio Cruz (Infraestructura Redes)',
        texto: 'Pendiente entrega y calibración del sistema de audio para sala de audiencias por parte del contratista adjudicado.'
      },
      {
        id: 'obs-002-1',
        numeroAccion: 1,
        fecha: '2026-02-01T09:00:00Z',
        autor: 'Lic. Kevin Gerardo López de León (Administrador)',
        texto: 'Inicio de remodelación de espacios y tendido de canaletas perimetrales en instalaciones arrendadas de Mixco.'
      }
    ],
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-02-01T09:00:00Z'
  },
  {
    id: 'jud-2026-003',
    nombreJudicatura: 'Tribunal de Sentencia Penal y Delitos de Femicidio de Quetzaltenango',
    tipoRamo: 'Penal',
    fechaInicioAdecuaciones: '2026-03-01',
    fechaFinAdecuaciones: '2026-06-15',
    equipoComputo: 'Si',
    equipoAudio: 'Si',
    cableadoEstructurado: 'Si',
    enlaceDatos: 'No',
    fechaInauguracion: '2026-07-01',
    estadoInauguracion: 'Reprogramado',
    observaciones: [
      {
        id: 'obs-003-2',
        numeroAccion: 2,
        fecha: '2026-03-20T16:45:00Z',
        autor: 'Ing. Rodrigo Sagastume (Telecomunicaciones GIT)',
        texto: 'Coordinando con Claro/Tigo la acometida de última milla para enlace dedicado MPLS de 200 Mbps.'
      },
      {
        id: 'obs-003-1',
        numeroAccion: 1,
        fecha: '2026-03-01T08:30:00Z',
        autor: 'Lic. Kevin Gerardo López de León (Administrador)',
        texto: 'Inicio de adecuaciones de aislamiento acústico en 2 salas de debates y cableado estructurado blindado.'
      }
    ],
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-03-01T08:30:00Z'
  },
  {
    id: 'jud-2026-004',
    nombreJudicatura: 'Juzgado de Primera Instancia Civil y Económico Coactivo del Departamento de Escuintla',
    tipoRamo: 'Civil',
    fechaInicioAdecuaciones: '2026-04-01',
    fechaFinAdecuaciones: '2026-07-15',
    equipoComputo: 'No',
    equipoAudio: 'No',
    cableadoEstructurado: 'Si',
    enlaceDatos: 'No',
    fechaInauguracion: '',
    estadoInauguracion: 'Pendiente Fecha',
    observaciones: [
      {
        id: 'obs-004-1',
        numeroAccion: 1,
        fecha: '2026-04-01T10:00:00Z',
        autor: 'Lic. Kevin Gerardo López de León (Administrador)',
        texto: 'Se aprueba diseño técnico de infraestructura informática y red para el nuevo juzgado civil de Escuintla.'
      }
    ],
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-04-01T10:00:00Z'
  },
  {
    id: 'jud-2026-005',
    nombreJudicatura: 'Juzgado de Paz Penal de Turno 24 Horas - Torre de Tribunales Guatemala',
    tipoRamo: 'Penal',
    fechaInicioAdecuaciones: '2026-02-15',
    fechaFinAdecuaciones: '2026-04-10',
    equipoComputo: 'Si',
    equipoAudio: 'Si',
    cableadoEstructurado: 'Si',
    enlaceDatos: 'Si',
    fechaInauguracion: '2026-04-28',
    estadoInauguracion: 'Inaugurado',
    observaciones: [
      {
        id: 'obs-005-3',
        numeroAccion: 3,
        fecha: '2026-04-02T09:30:00Z',
        autor: 'Lic. Kevin Gerardo López de León (Administrador)',
        texto: 'Pruebas de estrés y simulación de audiencia en vivo con audio digital y grabación de videoconferencia concluidas exitosamente.'
      },
      {
        id: 'obs-005-2',
        numeroAccion: 2,
        fecha: '2026-03-12T15:00:00Z',
        autor: 'Ing. Rodrigo Sagastume (Telecomunicaciones GIT)',
        texto: 'Enlace primario y redundante conectado a la troncal central del Data Center del Organismo Judicial.'
      },
      {
        id: 'obs-005-1',
        numeroAccion: 1,
        fecha: '2026-02-15T08:00:00Z',
        autor: 'Lic. Kevin Gerardo López de León (Administrador)',
        texto: 'Inicio de adecuación de la sala de audiencias continuas en nivel 2 de la Torre de Tribunales.'
      }
    ],
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-02-15T08:00:00Z'
  },
  {
    id: 'jud-2026-006',
    nombreJudicatura: 'Sala Regional Mixta de la Corte de Apelaciones de Cobán, Alta Verapaz',
    tipoRamo: 'Civil',
    fechaInicioAdecuaciones: '2026-05-01',
    fechaFinAdecuaciones: '2026-08-30',
    equipoComputo: 'No',
    equipoAudio: 'No',
    cableadoEstructurado: 'No',
    enlaceDatos: 'No',
    fechaInauguracion: '2026-09-25',
    estadoInauguracion: 'Reprogramado',
    observaciones: [
      {
        id: 'obs-006-1',
        numeroAccion: 1,
        fecha: '2026-05-01T11:20:00Z',
        autor: 'Lic. Kevin Gerardo López de León (Administrador)',
        texto: 'Programación de visita técnica de inspección para dimensionamiento de cableado de fibra y equipamiento de sala de vistas.'
      }
    ],
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-05-01T11:20:00Z'
  },
  {
    id: 'jud-2026-007',
    nombreJudicatura: 'Juzgado de Primera Instancia de Amparos y Exhibición Personal del Departamento de Guatemala',
    tipoRamo: 'Amparos',
    fechaInicioAdecuaciones: '2026-03-01',
    fechaFinAdecuaciones: '2026-05-15',
    equipoComputo: 'Si',
    equipoAudio: 'Si',
    cableadoEstructurado: 'Si',
    enlaceDatos: 'Si',
    fechaInauguracion: '2026-06-10',
    estadoInauguracion: 'Inaugurado',
    observaciones: [
      {
        id: 'obs-007-1',
        numeroAccion: 1,
        fecha: '2026-03-01T09:00:00Z',
        autor: 'Lic. Kevin Gerardo López de León (Administrador)',
        texto: 'Instalación de estaciones de trabajo de alta seguridad y enlace encriptado hacia la Secretaría de la Corte Suprema de Justicia para tramitación expedita de garantías constitucionales.'
      }
    ],
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-03-01T09:00:00Z'
  },
  {
    id: 'jud-2026-008',
    nombreJudicatura: 'Sala Pluripersonal de la Corte de Apelaciones de Amparos y Antejuicios',
    tipoRamo: 'Amparos',
    fechaInicioAdecuaciones: '2026-04-10',
    fechaFinAdecuaciones: '2026-07-20',
    equipoComputo: 'Si',
    equipoAudio: 'No',
    cableadoEstructurado: 'Si',
    enlaceDatos: 'Si',
    fechaInauguracion: '2026-08-05',
    estadoInauguracion: 'Pendiente Fecha',
    observaciones: [
      {
        id: 'obs-008-1',
        numeroAccion: 1,
        fecha: '2026-04-10T10:30:00Z',
        autor: 'Ing. Rodrigo Sagastume (Telecomunicaciones GIT)',
        texto: 'Adecuación de infraestructura de red y enlace punto a punto para sala de vistas y audiencias de amparo constitucional.'
      }
    ],
    creadoPor: 'Lic. Kevin Gerardo López de León',
    fechaCreacion: '2026-04-10T10:30:00Z'
  }
];
