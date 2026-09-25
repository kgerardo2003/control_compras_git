import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { JudicaturaRecord, JudicaturaObservacion, EstadoInauguracionJudicatura } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';
import { generateJudicaturasPDF, generateConsolidatedJudicaturasPDF, generateIndividualJudicaturaPDF } from '../utils/judicaturasPdfExport';
import { ConsolidatedJudicaturasPdfModal } from './ConsolidatedJudicaturasPdfModal';
import { BoletaJudicaturasModal } from './BoletaJudicaturasModal';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Scale,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Monitor,
  Volume2,
  Network,
  Wifi,
  GitBranch,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  X,
  Building2,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronLeft,
  BarChart2,
  Flag,
  Share2,
  FileDown,
  FileText,
  Download,
  Printer,
  ArrowRight,
  List,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  RefreshCw,
  TrendingUp,
  Timer,
  ArrowUpRight,
  FolderTree,
  Landmark,
  FileCheck,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { exportJudicaturasToExcel, exportJudicaturasToCSV } from '../utils/judicaturasExport';
import { ImportJudicaturasModal } from './ImportJudicaturasModal';

export const JudicaturasView: React.FC = () => {
  const {
    judicaturas,
    addJudicatura,
    updateJudicatura,
    deleteJudicatura,
    addJudicaturaObservacion,
    catalogs,
    currentUser,
    showToast,
    forceSyncToProductionDatabase
  } = useApp();

  // Filtros y Vista (por defecto 'table' / listado como solicitó el usuario)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'todos' | 'nombre' | 'ramo' | 'observaciones'>('todos');
  const [ramoFilter, setRamoFilter] = useState<'Todos' | 'Penal' | 'Civil' | 'Amparos'>('Todos');
  const [equipamientoFilter, setEquipamientoFilter] = useState<'Todos' | 'Completo' | 'Pendiente'>('Todos');
  const [estatusInauguracionFilter, setEstatusInauguracionFilter] = useState<string>('Todos');
  const [durationFilter, setDurationFilter] = useState<'Todos' | '<=30' | '31-60' | '>60'>('Todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'gantt'>('table');
  const [isGroupedByRamo, setIsGroupedByRamo] = useState<boolean>(true);
  const [isSyncingProduction, setIsSyncingProduction] = useState(false);

  // Paginación para vista listado tipo Control de Adquisiciones
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingJudicatura, setEditingJudicatura] = useState<JudicaturaRecord | null>(null);
  const [detailJudicaturaId, setDetailJudicaturaId] = useState<string | null>(null);
  const [deleteConfirmJudicatura, setDeleteConfirmJudicatura] = useState<JudicaturaRecord | null>(null);
  const [isConsolidatedPdfModalOpen, setIsConsolidatedPdfModalOpen] = useState(false);
  const [selectedBoletaJudicatura, setSelectedBoletaJudicatura] = useState<JudicaturaRecord | null>(null);

  // Form Fields (Cámara Penal, Cámara Civil y Cámara Amparos)
  const [nombreJudicatura, setNombreJudicatura] = useState('');
  const [tipoRamo, setTipoRamo] = useState<'Penal' | 'Civil' | 'Amparos'>('Penal');
  const [fechaInicioAdecuaciones, setFechaInicioAdecuaciones] = useState('');
  const [fechaFinAdecuaciones, setFechaFinAdecuaciones] = useState('');
  const [equipoComputo, setEquipoComputo] = useState<'Si' | 'No'>('No');
  const [equipoAudio, setEquipoAudio] = useState<'Si' | 'No'>('No');
  const [cableadoEstructurado, setCableadoEstructurado] = useState<'Si' | 'No'>('No');
  const [enlaceDatos, setEnlaceDatos] = useState<'Si' | 'No'>('No');
  const [fechaInauguracion, setFechaInauguracion] = useState('');
  const [estadoInauguracion, setEstadoInauguracion] = useState<EstadoInauguracionJudicatura>('Pendiente Fecha');
  const [observacionesIniciales, setObservacionesIniciales] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Nueva Observación para Ficha Detalle
  const [nuevaObservacionTexto, setNuevaObservacionTexto] = useState('');
  const [isAddingObs, setIsAddingObs] = useState(false);

  // Nueva Observación y Edición para Modal de Formulario
  const [nuevaObservacionModal, setNuevaObservacionModal] = useState('');
  const [isAddingObsInEdit, setIsAddingObsInEdit] = useState(false);

  // Permisos RBAC sobre el Módulo de Judicaturas
  const canEdit = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.rol === 'administrador') return true;
    if (currentUser.permisoJudicaturas === 'total') return true;
    if (currentUser.permisoJudicaturas === 'lectura' || currentUser.permisoJudicaturas === 'denegado') return false;
    return currentUser.rol !== 'auditor';
  }, [currentUser]);

  // Lista dinámica de Estatus obtenida desde Catálogos (ESTATUS_JUDICATURA)
  const estatusOptions = useMemo(() => {
    const defaultList = ['Pendiente Fecha', 'Reprogramado', 'Inaugurado', 'Finalizado', 'Traslado'];
    const cat = (catalogs || []).find(c => c.codigo === 'ESTATUS_JUDICATURA');
    if (!cat || !cat.items || cat.items.length === 0) {
      return defaultList;
    }
    const catItems = cat.items.filter(i => i.activo).map(i => i.valor);
    defaultList.forEach(d => {
      if (!catItems.includes(d)) catItems.push(d);
    });
    return catItems;
  }, [catalogs]);

  // Encontrar Judicatura Seleccionada para Detalle
  const activeDetailJudicatura = useMemo(() => {
    if (!detailJudicaturaId) return null;
    return judicaturas.find(j => j.id === detailJudicaturaId) || null;
  }, [detailJudicaturaId, judicaturas]);

  // Filtrado de Judicaturas
  const filteredJudicaturas = useMemo(() => {
    return judicaturas.filter(j => {
      // Búsqueda por término y campo
      const searchLower = searchTerm.toLowerCase().trim();
      let matchSearch = true;

      if (searchLower) {
        if (searchField === 'nombre') {
          matchSearch = j.nombreJudicatura.toLowerCase().includes(searchLower);
        } else if (searchField === 'ramo') {
          const camaraName = j.tipoRamo === 'Penal' ? 'cámara penal penal' : j.tipoRamo === 'Civil' ? 'cámara civil civil' : 'cámara amparos amparos';
          matchSearch = camaraName.includes(searchLower);
        } else if (searchField === 'observaciones') {
          matchSearch = Boolean(j.observaciones && j.observaciones.some(o => o.texto.toLowerCase().includes(searchLower)));
        } else {
          // Todos los campos
          const camaraName = j.tipoRamo === 'Penal' ? 'cámara penal penal' : j.tipoRamo === 'Civil' ? 'cámara civil civil' : 'cámara amparos amparos';
          matchSearch =
            j.nombreJudicatura.toLowerCase().includes(searchLower) ||
            camaraName.includes(searchLower) ||
            Boolean(j.observaciones && j.observaciones.some(o => o.texto.toLowerCase().includes(searchLower)));
        }
      }

      // Filtro Ramo
      const matchRamo = ramoFilter === 'Todos' || j.tipoRamo === ramoFilter;

      // Filtro Equipamiento
      const isCompleto =
        j.equipoComputo === 'Si' &&
        j.equipoAudio === 'Si' &&
        j.cableadoEstructurado === 'Si' &&
        j.enlaceDatos === 'Si';

      const matchEquipamiento =
        equipamientoFilter === 'Todos' ||
        (equipamientoFilter === 'Completo' && isCompleto) ||
        (equipamientoFilter === 'Pendiente' && !isCompleto);

      // Filtro Estatus de Inauguración
      const currentEstatus = j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');
      const matchEstatus = estatusInauguracionFilter === 'Todos' || currentEstatus === estatusInauguracionFilter;

      // Filtro por Plazo de Ejecución (Dashboard de Rendimiento)
      let matchDuration = true;
      if (durationFilter !== 'Todos' && j.fechaInicioAdecuaciones && j.fechaFinAdecuaciones) {
        const diff = Math.max(1, Math.round((new Date(j.fechaFinAdecuaciones).getTime() - new Date(j.fechaInicioAdecuaciones).getTime()) / (1000 * 60 * 60 * 24)));
        if (durationFilter === '<=30') matchDuration = diff <= 30;
        else if (durationFilter === '31-60') matchDuration = diff > 30 && diff <= 60;
        else if (durationFilter === '>60') matchDuration = diff > 60;
      }

      return matchSearch && matchRamo && matchEquipamiento && matchEstatus && matchDuration;
    });
  }, [judicaturas, searchTerm, searchField, ramoFilter, equipamientoFilter, estatusInauguracionFilter, durationFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredJudicaturas.length / itemsPerPage) || 1;
  const paginatedJudicaturas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJudicaturas.slice(start, start + itemsPerPage);
  }, [filteredJudicaturas, currentPage]);

  // Métricas Estadísticas y Gráficas Circulares
  const stats = useMemo(() => {
    const total = judicaturas.length;
    const penal = judicaturas.filter(j => j.tipoRamo === 'Penal').length;
    const civil = judicaturas.filter(j => j.tipoRamo === 'Civil').length;
    const amparos = judicaturas.filter(j => j.tipoRamo === 'Amparos').length;

    let inauguradosCount = 0;
    let pendienteFechaCount = 0;
    let reprogramadosCount = 0;
    let finalizadosCount = 0;
    let trasladosCount = 0;

    judicaturas.forEach(j => {
      const st = j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');
      if (st === 'Inaugurado') inauguradosCount++;
      else if (st === 'Finalizado') finalizadosCount++;
      else if (st === 'Traslado') trasladosCount++;
      else if (st === 'Reprogramado') reprogramadosCount++;
      else pendienteFechaCount++;
    });

    const equipamiento100 = judicaturas.filter(j =>
      j.equipoComputo === 'Si' &&
      j.equipoAudio === 'Si' &&
      j.cableadoEstructurado === 'Si' &&
      j.enlaceDatos === 'Si'
    ).length;

    const equipamientoParcial = judicaturas.filter(j => {
      const count = (j.equipoComputo === 'Si' ? 1 : 0) +
                    (j.equipoAudio === 'Si' ? 1 : 0) +
                    (j.cableadoEstructurado === 'Si' ? 1 : 0) +
                    (j.enlaceDatos === 'Si' ? 1 : 0);
      return count >= 1 && count < 4;
    }).length;

    const sinEquipar = judicaturas.filter(j => {
      const count = (j.equipoComputo === 'Si' ? 1 : 0) +
                    (j.equipoAudio === 'Si' ? 1 : 0) +
                    (j.cableadoEstructurado === 'Si' ? 1 : 0) +
                    (j.enlaceDatos === 'Si' ? 1 : 0);
      return count === 0;
    }).length;

    // Próximas a inaugurar (fechas futuras ordenadas)
    const hoy = new Date().toISOString().split('T')[0];
    const proximas = judicaturas.filter(j => j.fechaInauguracion && j.fechaInauguracion >= hoy).length;

    // 1. Gráfica Circular de Estatus de Inauguración (todos los estatus)
    const chartEstatusInauguracion = [
      { name: 'Inaugurado', value: inauguradosCount, color: '#059669', porcentaje: total > 0 ? Math.round((inauguradosCount / total) * 100) : 0 },
      { name: 'Pendiente Fecha', value: pendienteFechaCount, color: '#d97706', porcentaje: total > 0 ? Math.round((pendienteFechaCount / total) * 100) : 0 },
      { name: 'Reprogramado', value: reprogramadosCount, color: '#dc2626', porcentaje: total > 0 ? Math.round((reprogramadosCount / total) * 100) : 0 },
      { name: 'Finalizado', value: finalizadosCount, color: '#2563eb', porcentaje: total > 0 ? Math.round((finalizadosCount / total) * 100) : 0 },
      { name: 'Traslado', value: trasladosCount, color: '#7c3aed', porcentaje: total > 0 ? Math.round((trasladosCount / total) * 100) : 0 },
    ].filter(item => item.value > 0);

    // 2. Gráfica Circular de Cámaras
    const chartCamaras = [
      { name: 'Cámara Penal', value: penal, color: '#7c3aed', porcentaje: total > 0 ? Math.round((penal / total) * 100) : 0 },
      { name: 'Cámara Civil', value: civil, color: '#2563eb', porcentaje: total > 0 ? Math.round((civil / total) * 100) : 0 },
      { name: 'Cámara Amparos', value: amparos, color: '#059669', porcentaje: total > 0 ? Math.round((amparos / total) * 100) : 0 },
    ].filter(item => item.value > 0);

    // 3. Gráfica Circular de Cobertura Tecnológica TIC
    const chartEquipamiento = [
      { name: '100% Equipado', value: equipamiento100, color: '#0d9488', porcentaje: total > 0 ? Math.round((equipamiento100 / total) * 100) : 0 },
      { name: 'Parcial (1-3)', value: equipamientoParcial, color: '#f59e0b', porcentaje: total > 0 ? Math.round((equipamientoParcial / total) * 100) : 0 },
      { name: 'Sin Equipar (0)', value: sinEquipar, color: '#64748b', porcentaje: total > 0 ? Math.round((sinEquipar / total) * 100) : 0 },
    ].filter(item => item.value > 0);

    return {
      total,
      penal,
      civil,
      amparos,
      inauguradosCount,
      pendienteFechaCount,
      reprogramadosCount,
      finalizadosCount,
      trasladosCount,
      equipamiento100,
      equipamientoParcial,
      sinEquipar,
      proximas,
      chartEstatusInauguracion,
      chartCamaras,
      chartEquipamiento
    };
  }, [judicaturas]);

  // Métricas avanzadas ejecutivas para Tarjetas y Gráficos Recharts (Total por Estatus y Desglose por Ramo)
  const statusExecutiveMetrics = useMemo(() => {
    const defaultStatuses = ['Inaugurado', 'Pendiente Fecha', 'Reprogramado', 'Finalizado', 'Traslado'];
    const cat = (catalogs || []).find(c => c.codigo === 'ESTATUS_JUDICATURA');
    const dynamicStatuses = cat?.items?.filter(i => i.activo).map(i => i.valor) || [];
    const allStatuses = Array.from(new Set([...defaultStatuses, ...dynamicStatuses]));

    const total = judicaturas.length;
    const getStatus = (j: JudicaturaRecord) =>
      j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');

    const statusStyleMap: Record<string, { color: string; badge: string; border: string; bg: string }> = {
      'Inaugurado': {
        color: '#059669',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        border: 'border-emerald-200',
        bg: 'hover:bg-emerald-50/50'
      },
      'Pendiente Fecha': {
        color: '#d97706',
        badge: 'bg-amber-50 text-amber-800 border-amber-300',
        border: 'border-amber-200',
        bg: 'hover:bg-amber-50/50'
      },
      'Reprogramado': {
        color: '#dc2626',
        badge: 'bg-rose-50 text-rose-800 border-rose-300',
        border: 'border-rose-200',
        bg: 'hover:bg-rose-50/50'
      },
      'Finalizado': {
        color: '#2563eb',
        badge: 'bg-blue-50 text-blue-800 border-blue-300',
        border: 'border-blue-200',
        bg: 'hover:bg-blue-50/50'
      },
      'Traslado': {
        color: '#7c3aed',
        badge: 'bg-purple-50 text-purple-800 border-purple-300',
        border: 'border-purple-200',
        bg: 'hover:bg-purple-50/50'
      },
    };

    const statusCards = allStatuses.map(st => {
      const matching = judicaturas.filter(j => getStatus(j) === st);
      const count = matching.length;
      const penalCount = matching.filter(j => j.tipoRamo === 'Penal').length;
      const civilCount = matching.filter(j => j.tipoRamo === 'Civil').length;
      const amparosCount = matching.filter(j => j.tipoRamo === 'Amparos').length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const style = statusStyleMap[st] || {
        color: '#4f46e5',
        badge: 'bg-indigo-50 text-indigo-800 border-indigo-300',
        border: 'border-indigo-200',
        bg: 'hover:bg-indigo-50/50'
      };

      return {
        status: st,
        count,
        penalCount,
        civilCount,
        amparosCount,
        pct,
        ...style
      };
    });

    // Dataset para el BarChart Recharts (Estatus x Ramo)
    const barChartData = allStatuses.map(st => {
      const matching = judicaturas.filter(j => getStatus(j) === st);
      const penal = matching.filter(j => j.tipoRamo === 'Penal').length;
      const civil = matching.filter(j => j.tipoRamo === 'Civil').length;
      const amparos = matching.filter(j => j.tipoRamo === 'Amparos').length;
      return {
        estatus: st,
        'Cámara Penal': penal,
        'Cámara Civil': civil,
        'Cámara Amparos': amparos,
        total: penal + civil + amparos
      };
    });

    // Dataset para el PieChart Recharts
    const pieChartData = statusCards
      .filter(item => item.count > 0)
      .map(item => ({
        name: item.status,
        value: item.count,
        color: item.color,
        porcentaje: item.pct,
        penal: item.penalCount,
        civil: item.civilCount,
        amparos: item.amparosCount
      }));

    const penalTotal = judicaturas.filter(j => j.tipoRamo === 'Penal').length;
    const civilTotal = judicaturas.filter(j => j.tipoRamo === 'Civil').length;
    const amparosTotal = judicaturas.filter(j => j.tipoRamo === 'Amparos').length;

    return {
      statusCards,
      barChartData,
      pieChartData,
      total,
      penalTotal,
      civilTotal,
      amparosTotal
    };
  }, [judicaturas, catalogs]);

  // Segmentación reactiva de judicaturas por Ramo (Penal, Civil y Amparos) para análisis visual y reportes
  const judicaturasByRamo = useMemo(() => {
    const getStatus = (j: JudicaturaRecord) =>
      j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');

    const penalList = filteredJudicaturas.filter(j => j.tipoRamo === 'Penal');
    const civilList = filteredJudicaturas.filter(j => j.tipoRamo === 'Civil');
    const amparosList = filteredJudicaturas.filter(j => j.tipoRamo === 'Amparos');

    const calculateRamoStats = (list: JudicaturaRecord[]) => ({
      total: list.length,
      inaugurados: list.filter(j => getStatus(j) === 'Inaugurado').length,
      pendientes: list.filter(j => getStatus(j) === 'Pendiente Fecha').length,
      reprogramados: list.filter(j => getStatus(j) === 'Reprogramado').length,
      finalizados: list.filter(j => getStatus(j) === 'Finalizado').length,
      traslados: list.filter(j => getStatus(j) === 'Traslado').length,
      equip100: list.filter(j =>
        j.equipoComputo === 'Si' &&
        j.equipoAudio === 'Si' &&
        j.cableadoEstructurado === 'Si' &&
        j.enlaceDatos === 'Si'
      ).length
    });

    return {
      penal: penalList,
      penalStats: calculateRamoStats(penalList),
      civil: civilList,
      civilStats: calculateRamoStats(civilList),
      amparos: amparosList,
      amparosStats: calculateRamoStats(amparosList)
    };
  }, [filteredJudicaturas]);

  // Handler para exportar directamente el reporte de un Ramo específico
  const handleExportRamoPDF = (ramo: 'Penal' | 'Civil' | 'Amparos') => {
    const list = filteredJudicaturas.filter(j => j.tipoRamo === ramo);
    const camaraLabel = ramo === 'Penal' ? 'Penal' : ramo === 'Civil' ? 'Civil' : 'Amparos';
    if (list.length === 0) {
      showToast({
        title: 'Sin Registros',
        message: `No existen judicaturas activas en Cámara ${camaraLabel} para exportar.`,
        type: 'warning'
      });
      return;
    }

    try {
      const filename = generateConsolidatedJudicaturasPDF({
        judicaturas: list,
        title: `REPORTE OFICIAL DE JUDICATURAS: CÁMARA ${ramo.toUpperCase()}`,
        subtitle: `Gerencia de Informática • Seguimiento de Adecuaciones e Hitos de Apertura del Ramo ${ramo}`,
        includeTable: true,
        includeGantt: true,
        includeStatusMatrix: true,
        groupByRamo: false,
        filterInfo: {
          ramo,
          search: searchTerm.trim() || undefined,
          estadoInauguracion: estatusInauguracionFilter !== 'Todos' ? estatusInauguracionFilter : undefined,
        },
        currentUser,
        filenamePrefix: `Reporte_Judicaturas_Camara_${ramo}`
      });

      showToast({
        title: 'Reporte de Ramo Descargado',
        message: `Se descargó el reporte institucional de Cámara ${ramo}: "${filename}".`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      showToast({
        title: 'Error al exportar',
        message: 'No se pudo generar el reporte en PDF del ramo.',
        type: 'error'
      });
    }
  };

  // Dashboard de Rendimiento Operativo: Métricas de Tiempo Promedio de Ejecución de Adecuaciones y Plazos
  const performanceMetrics = useMemo(() => {
    let totalDurationDays = 0;
    let countWithDates = 0;

    let penalDurationDays = 0;
    let penalCount = 0;

    let civilDurationDays = 0;
    let civilCount = 0;

    let amparosDurationDays = 0;
    let amparosCount = 0;

    let minDays = Infinity;
    let maxDays = -Infinity;
    let fastestJudicatura: JudicaturaRecord | null = null;
    let longestJudicatura: JudicaturaRecord | null = null;

    let totalGapDays = 0;
    let countWithInauguration = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let completedAdecuacionesCount = 0;
    let activeAdecuacionesCount = 0;
    let pendingAdecuacionesCount = 0;

    // Distribución por rangos
    let shortCount = 0; // <= 30 días
    let mediumCount = 0; // 31 a 60 días
    let longCount = 0; // > 60 días

    judicaturas.forEach((j) => {
      if (j.fechaInicioAdecuaciones && j.fechaFinAdecuaciones) {
        const start = new Date(j.fechaInicioAdecuaciones);
        const end = new Date(j.fechaFinAdecuaciones);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const diffDays = Math.max(
            1,
            Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          );
          totalDurationDays += diffDays;
          countWithDates++;

          if (j.tipoRamo === 'Penal') {
            penalDurationDays += diffDays;
            penalCount++;
          } else if (j.tipoRamo === 'Civil') {
            civilDurationDays += diffDays;
            civilCount++;
          } else {
            amparosDurationDays += diffDays;
            amparosCount++;
          }

          if (diffDays < minDays) {
            minDays = diffDays;
            fastestJudicatura = j;
          }
          if (diffDays > maxDays) {
            maxDays = diffDays;
            longestJudicatura = j;
          }

          if (diffDays <= 30) shortCount++;
          else if (diffDays <= 60) mediumCount++;
          else longCount++;

          // Estado del plazo
          if (end.getTime() <= today.getTime()) {
            completedAdecuacionesCount++;
          } else if (start.getTime() <= today.getTime()) {
            activeAdecuacionesCount++;
          } else {
            pendingAdecuacionesCount++;
          }
        }
      }

      // Brecha fin de adecuación hasta inauguración
      if (j.fechaFinAdecuaciones && j.fechaInauguracion) {
        const end = new Date(j.fechaFinAdecuaciones);
        const inau = new Date(j.fechaInauguracion);
        if (!isNaN(end.getTime()) && !isNaN(inau.getTime())) {
          const gap = Math.round((inau.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
          totalGapDays += gap;
          countWithInauguration++;
        }
      }
    });

    const avgDays = countWithDates > 0 ? Math.round(totalDurationDays / countWithDates) : 0;
    const penalAvgDays = penalCount > 0 ? Math.round(penalDurationDays / penalCount) : 0;
    const civilAvgDays = civilCount > 0 ? Math.round(civilDurationDays / civilCount) : 0;
    const amparosAvgDays = amparosCount > 0 ? Math.round(amparosDurationDays / amparosCount) : 0;
    const avgGapDays = countWithInauguration > 0 ? Math.round(totalGapDays / countWithInauguration) : 0;
    const completionPct = countWithDates > 0 ? Math.round((completedAdecuacionesCount / countWithDates) * 100) : 0;

    return {
      avgDays,
      penalAvgDays,
      civilAvgDays,
      amparosAvgDays,
      penalCount,
      civilCount,
      amparosCount,
      countWithDates,
      minDays: minDays === Infinity ? 0 : minDays,
      maxDays: maxDays === -Infinity ? 0 : maxDays,
      fastestJudicatura,
      longestJudicatura,
      avgGapDays,
      countWithInauguration,
      completedAdecuacionesCount,
      activeAdecuacionesCount,
      pendingAdecuacionesCount,
      completionPct,
      shortCount,
      mediumCount,
      longCount
    };
  }, [judicaturas]);

  // Handler para Forzar Sincronización a Base de Datos de Producción
  const handleForceSyncProduction = async () => {
    setIsSyncingProduction(true);
    try {
      await forceSyncToProductionDatabase();
    } finally {
      setIsSyncingProduction(false);
    }
  };

  // Apertura de Formulario de Creación
  const handleOpenCreate = () => {
    setEditingJudicatura(null);
    setNombreJudicatura('');
    setTipoRamo('Penal');
    const today = new Date();
    const endAdecuaciones = new Date();
    endAdecuaciones.setDate(today.getDate() + 30);

    setFechaInicioAdecuaciones(today.toISOString().split('T')[0]);
    setFechaFinAdecuaciones(endAdecuaciones.toISOString().split('T')[0]);
    setEquipoComputo('No');
    setEquipoAudio('No');
    setCableadoEstructurado('No');
    setEnlaceDatos('No');
    setFechaInauguracion(''); // Opcional por defecto
    setEstadoInauguracion('Pendiente Fecha');
    setObservacionesIniciales('');
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Apertura de Formulario de Edición
  const handleOpenEdit = (jud: JudicaturaRecord) => {
    setEditingJudicatura(jud);
    setNombreJudicatura(jud.nombreJudicatura);
    setTipoRamo(jud.tipoRamo);
    setFechaInicioAdecuaciones(jud.fechaInicioAdecuaciones);
    setFechaFinAdecuaciones(jud.fechaFinAdecuaciones);
    setEquipoComputo(jud.equipoComputo);
    setEquipoAudio(jud.equipoAudio);
    setCableadoEstructurado(jud.cableadoEstructurado);
    setEnlaceDatos(jud.enlaceDatos);
    setFechaInauguracion(jud.fechaInauguracion || '');
    setEstadoInauguracion(jud.estadoInauguracion || (jud.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha'));
    setObservacionesIniciales('');
    setNuevaObservacionModal('');
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Generación y Descarga de la Ficha Técnica Individual en PDF
  const handleGenerateFicha = (jud: JudicaturaRecord) => {
    try {
      const filename = generateIndividualJudicaturaPDF(jud, currentUser);
      showToast({
        title: 'Ficha Técnica Generada',
        message: `Se descargó el documento institucional oficial "${filename}".`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error generando ficha técnica:', err);
      showToast({
        title: 'Error al generar Ficha',
        message: 'No fue posible generar la ficha técnica en PDF.',
        type: 'error'
      });
    }
  };

  // Agregar observación directamente desde el modal de edición
  const handleAddObservationInEdit = async () => {
    if (!editingJudicatura || !nuevaObservacionModal.trim()) return;
    setIsAddingObsInEdit(true);
    try {
      const updated = await addJudicaturaObservacion(editingJudicatura.id, nuevaObservacionModal.trim());
      if (updated) {
        setEditingJudicatura(updated);
      }
      setNuevaObservacionModal('');
      showToast({
        title: 'Observación Registrada',
        message: 'Se añadió la anotación a la judicatura exitosamente.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      showToast({
        title: 'Error al guardar observación',
        message: 'No se pudo agregar la acción.',
        type: 'error'
      });
    } finally {
      setIsAddingObsInEdit(false);
    }
  };

  // Guardar Ficha
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!nombreJudicatura.trim()) {
      errors.nombreJudicatura = 'El nombre de la judicatura es obligatorio.';
    }
    if (!fechaInicioAdecuaciones) {
      errors.fechaInicioAdecuaciones = 'Indique la fecha de inicio de adecuaciones.';
    }
    if (!fechaFinAdecuaciones) {
      errors.fechaFinAdecuaciones = 'Indique la fecha final de adecuaciones.';
    }
    if (fechaInicioAdecuaciones && fechaFinAdecuaciones && fechaInicioAdecuaciones > fechaFinAdecuaciones) {
      errors.fechaFinAdecuaciones = 'La fecha final no puede ser anterior a la de inicio.';
    }

    // Fecha de inauguración ahora es opcional. Solo validamos coherencia si se especifica.
    if (fechaInauguracion && fechaInicioAdecuaciones && fechaInauguracion < fechaInicioAdecuaciones) {
      errors.fechaInauguracion = 'La fecha de inauguración no debe ser anterior al inicio de adecuaciones.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingJudicatura) {
        if (nuevaObservacionModal.trim()) {
          await addJudicaturaObservacion(editingJudicatura.id, nuevaObservacionModal.trim());
          setNuevaObservacionModal('');
        }
        await updateJudicatura(editingJudicatura.id, {
          nombreJudicatura: nombreJudicatura.trim(),
          tipoRamo,
          fechaInicioAdecuaciones,
          fechaFinAdecuaciones,
          equipoComputo,
          equipoAudio,
          cableadoEstructurado,
          enlaceDatos,
          fechaInauguracion: fechaInauguracion || '',
          estadoInauguracion,
        });
        showToast({
          title: 'Judicatura Actualizada',
          message: `Se actualizaron correctamente los datos de "${nombreJudicatura.trim()}".`,
          type: 'success'
        });
      } else {
        await addJudicatura({
          nombreJudicatura: nombreJudicatura.trim(),
          tipoRamo,
          fechaInicioAdecuaciones,
          fechaFinAdecuaciones,
          equipoComputo,
          equipoAudio,
          cableadoEstructurado,
          enlaceDatos,
          fechaInauguracion: fechaInauguracion || '',
          estadoInauguracion,
          observacionesIniciales: observacionesIniciales.trim() || undefined,
        });
        showToast({
          title: 'Judicatura Registrada',
          message: `Se ingresó con éxito "${nombreJudicatura.trim()}".`,
          type: 'success'
        });
      }
      setIsFormModalOpen(false);
      setEditingJudicatura(null);
    } catch (err) {
      console.error(err);
      showToast({
        title: 'Error al procesar',
        message: 'No fue posible guardar la ficha de judicatura.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Registrar Anotación en Árbol de Acciones
  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDetailJudicatura || !nuevaObservacionTexto.trim()) return;

    setIsAddingObs(true);
    try {
      await addJudicaturaObservacion(activeDetailJudicatura.id, nuevaObservacionTexto.trim());
      setNuevaObservacionTexto('');
      showToast({
        title: 'Acción Agregada',
        message: 'Se añadió la anotación al árbol cronológico con éxito.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      showToast({
        title: 'Error al registrar observación',
        message: 'No se pudo añadir la acción al árbol.',
        type: 'error'
      });
    } finally {
      setIsAddingObs(false);
    }
  };

  // Eliminación de Judicatura
  const handleDelete = async (jud: JudicaturaRecord) => {
    try {
      await deleteJudicatura(jud.id);
      setDeleteConfirmJudicatura(null);
      if (detailJudicaturaId === jud.id) {
        setDetailJudicaturaId(null);
      }
      showToast({
        title: 'Judicatura Eliminada',
        message: `Se eliminó el registro de "${jud.nombreJudicatura}".`,
        type: 'info'
      });
    } catch (err) {
      console.error(err);
      showToast({
        title: 'Error al eliminar',
        message: 'No se pudo eliminar el registro de la judicatura.',
        type: 'error'
      });
    }
  };

  // Generación y exportación de informe consolidado en PDF (Descarga Directa con Cámaras Separadas)
  const handleQuickExportPDF = () => {
    setIsExportingPdf(true);
    try {
      const filename = generateConsolidatedJudicaturasPDF({
        judicaturas: filteredJudicaturas.length > 0 ? filteredJudicaturas : judicaturas,
        title: 'REPORTE CONSOLIDADO DE CONTROL DE JUDICATURAS POR INAUGURAR (CÁMARAS PENAL, CIVIL Y AMPAROS)',
        subtitle: 'Gerencia de Informática • Seguimiento Integral con Separación Analítica por Cámara Jurisdiccional',
        includeTable: true,
        includeGantt: true,
        includeStatusMatrix: true,
        groupByRamo: true, // Forzar separación por Cámara Penal, Cámara Civil y Cámara Amparos
        filterInfo: {
          search: searchTerm.trim() || undefined,
          ramo: ramoFilter !== 'Todos' ? ramoFilter : undefined,
          equipamiento: equipamientoFilter !== 'Todos' ? equipamientoFilter : undefined,
          estadoInauguracion: estatusInauguracionFilter !== 'Todos' ? estatusInauguracionFilter : undefined,
        },
        currentUser,
        filenamePrefix: 'Reporte_Consolidado_Judicaturas_Penal_y_Civil'
      });
      showToast({
        title: 'Reporte Consolidado Descargado con Éxito',
        message: `Se descargó "${filename}" con Cámaras Penal y Civil separadas.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error exportando reporte consolidado de judicaturas:', err);
      showToast({
        title: 'Error al generar PDF',
        message: 'Ocurrió un inconveniente al exportar el informe consolidado.',
        type: 'error'
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenConsolidatedPDFModal = () => {
    setIsConsolidatedPdfModalOpen(true);
  };

  const handleExportExcel = () => {
    try {
      const recordsToExport = filteredJudicaturas.length > 0 ? filteredJudicaturas : judicaturas;
      exportJudicaturasToExcel(recordsToExport);
      showToast({
        title: 'Registros Exportados',
        message: `Se descargó el archivo Excel con ${recordsToExport.length} judicaturas.`,
        type: 'exito'
      });
    } catch (err) {
      console.error('Error exportando judicaturas a Excel:', err);
      showToast({
        title: 'Error al Exportar',
        message: 'No se pudo generar el archivo Excel de judicaturas.',
        type: 'error'
      });
    }
  };

  // Cálculo para el Diagrama de Gantt Detallado por Semana
  const ganttWeeks = useMemo(() => {
    if (judicaturas.length === 0) return [];

    let minDateMs = Infinity;
    let maxDateMs = -Infinity;

    judicaturas.forEach(j => {
      const d1 = new Date(j.fechaInicioAdecuaciones).getTime();
      const d2 = new Date(j.fechaFinAdecuaciones).getTime();
      const d3 = j.fechaInauguracion ? new Date(j.fechaInauguracion).getTime() : NaN;

      if (!isNaN(d1) && d1 < minDateMs) minDateMs = d1;
      if (!isNaN(d2) && d2 > maxDateMs) maxDateMs = d2;
      if (!isNaN(d3) && d3 > maxDateMs) maxDateMs = d3;
    });

    if (minDateMs === Infinity || maxDateMs === -Infinity) {
      minDateMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
      maxDateMs = Date.now() + 60 * 24 * 60 * 60 * 1000;
    }

    // Normalizar al lunes de la primera semana
    const startWeek = new Date(minDateMs);
    const day = startWeek.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    startWeek.setDate(startWeek.getDate() + diffToMonday);
    startWeek.setHours(0, 0, 0, 0);

    // Semanas de 7 días
    const weeks: { weekIndex: number; startDate: Date; endDate: Date; label: string }[] = [];
    const current = new Date(startWeek);
    let index = 1;

    // Cubrir hasta maxDateMs + 1 semana
    while (current.getTime() <= maxDateMs + 7 * 24 * 60 * 60 * 1000 && weeks.length < 18) {
      const wStart = new Date(current);
      const wEnd = new Date(current);
      wEnd.setDate(wEnd.getDate() + 6);

      const startDayStr = String(wStart.getDate()).padStart(2, '0');
      const startMonthStr = wStart.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '');
      const endDayStr = String(wEnd.getDate()).padStart(2, '0');
      const endMonthStr = wEnd.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '');

      weeks.push({
        weekIndex: index,
        startDate: wStart,
        endDate: wEnd,
        label: `Sem ${index} (${startDayStr} ${startMonthStr} - ${endDayStr} ${endMonthStr})`
      });

      current.setDate(current.getDate() + 7);
      index++;
    }

    return weeks;
  }, [judicaturas]);

  // Renderizador reutilizable de Tabla de Judicaturas
  const renderJudicaturasTable = (items: JudicaturaRecord[], hideRamoColumn = false) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase sticky top-0 border-b border-slate-200 tracking-wider">
          <tr>
            <th className="px-4 py-3">Nombre de la Judicatura</th>
            {!hideRamoColumn && <th className="px-4 py-3">Cámara Asignada</th>}
            <th className="px-4 py-3">Período de Adecuaciones</th>
            <th className="px-3 py-3 text-center" title="Equipo de Cómputo">PC</th>
            <th className="px-3 py-3 text-center" title="Equipo de Audio">Audio</th>
            <th className="px-3 py-3 text-center" title="Cableado de Red Estructurado">Red</th>
            <th className="px-3 py-3 text-center" title="Enlace de Datos">Enlace</th>
            <th className="px-4 py-3 text-center">Estatus y Fecha</th>
            <th className="px-4 py-3">Última Acción / Bitácora</th>
            <th className="px-4 py-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {items.length === 0 ? (
            <tr>
              <td colSpan={hideRamoColumn ? 9 : 10} className="px-4 py-8 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Search className="w-6 h-6 text-slate-300" />
                  <p className="font-semibold text-slate-600 text-xs">
                    No hay judicaturas registradas con los criterios o filtros seleccionados.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((j) => {
              const latestObs = j.observaciones && j.observaciones.length > 0 ? j.observaciones[0] : null;

              return (
                <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* 1. Nombre de la Judicatura */}
                  <td className="px-4 py-3.5 max-w-xs">
                    <button
                      type="button"
                      onClick={() => setDetailJudicaturaId(j.id)}
                      className="font-bold text-slate-900 hover:text-blue-900 text-left cursor-pointer group flex items-start gap-1.5"
                    >
                      <span className="line-clamp-2 leading-snug group-hover:underline">
                        {j.nombreJudicatura}
                      </span>
                    </button>
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                      ID: {j.id}
                    </span>
                  </td>

                  {/* 2. Cámara Asignada */}
                  {!hideRamoColumn && (
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {j.tipoRamo === 'Penal' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-50 text-purple-900 border border-purple-200 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                          Cámara Penal
                        </span>
                      ) : j.tipoRamo === 'Civil' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-900 border border-blue-200 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                          Cámara Civil
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-900 border border-emerald-200 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Cámara Amparos
                        </span>
                      )}
                    </td>
                  )}

                  {/* 3. Período de Adecuaciones */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col text-slate-700">
                      <span className="font-semibold text-[11px] text-slate-900">
                        {formatDate(j.fechaInicioAdecuaciones)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        hasta {formatDate(j.fechaFinAdecuaciones)}
                      </span>
                    </div>
                  </td>

                  {/* 4. PC */}
                  <td className="px-3 py-3.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-md text-[11px] font-black border ${
                        j.equipoComputo === 'Si'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                      title={`Equipo de Cómputo (PC): ${j.equipoComputo}`}
                    >
                      {j.equipoComputo}
                    </span>
                  </td>

                  {/* 5. Audio */}
                  <td className="px-3 py-3.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-md text-[11px] font-black border ${
                        j.equipoAudio === 'Si'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                      title={`Equipo de Audio: ${j.equipoAudio}`}
                    >
                      {j.equipoAudio}
                    </span>
                  </td>

                  {/* 6. Red */}
                  <td className="px-3 py-3.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-md text-[11px] font-black border ${
                        j.cableadoEstructurado === 'Si'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                      title={`Cableado de Red Estructurado: ${j.cableadoEstructurado}`}
                    >
                      {j.cableadoEstructurado}
                    </span>
                  </td>

                  {/* 7. Enlace */}
                  <td className="px-3 py-3.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-md text-[11px] font-black border ${
                        j.enlaceDatos === 'Si'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                      title={`Enlace de Datos: ${j.enlaceDatos}`}
                    >
                      {j.enlaceDatos}
                    </span>
                  </td>

                  {/* 8. Estatus y Fecha */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    {(() => {
                      const est = j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');
                      const badgeStyle =
                        est === 'Inaugurado'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : est === 'Finalizado'
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : est === 'Traslado'
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : est === 'Reprogramado'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300';
                      return (
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeStyle}`}>
                            {est}
                          </span>
                          {j.fechaInauguracion ? (
                            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-800 font-mono">
                              <Flag className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>{formatDate(j.fechaInauguracion)}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic font-medium">Fecha por definir</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* 9. Última Acción / Observaciones */}
                  <td className="px-4 py-3.5 max-w-xs">
                    {latestObs ? (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-0.5">
                          <span className="text-blue-900">Acción #{latestObs.numeroAccion}</span>
                          <span>{formatDate(latestObs.fecha)}</span>
                        </div>
                        <p className="line-clamp-2 text-slate-700 text-[10px] leading-tight">
                          {latestObs.texto}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sin observaciones registradas</span>
                    )}
                  </td>

                  {/* 10. Acciones: Visualizar, Generar Ficha, Editar, Eliminar */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    <div className="inline-flex items-center justify-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setDetailJudicaturaId(j.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Visualizar Ficha y Árbol de Acciones"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGenerateFicha(j)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Generar Ficha Técnica Oficial de la Judicatura (PDF)"
                      >
                        <FileText className="w-4 h-4 text-blue-900" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBoletaJudicatura(j)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-900 hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="Boleta Oficial de Control Judicaturas"
                      >
                        <FileCheck className="w-4 h-4 text-emerald-700" />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(j)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Editar Ficha de Judicatura"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmJudicatura(j)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Eliminar Judicatura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  // Renderizador reutilizable de Fichas en Tarjetas
  const renderJudicaturasCards = (items: JudicaturaRecord[]) => (
    items.length === 0 ? (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
        <p className="font-semibold text-slate-600 text-xs">
          No hay judicaturas registradas en esta vista con los filtros seleccionados.
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((j) => {
          const isAllEquipped =
            j.equipoComputo === 'Si' &&
            j.equipoAudio === 'Si' &&
            j.cableadoEstructurado === 'Si' &&
            j.enlaceDatos === 'Si';
          const latestObs = j.observaciones && j.observaciones.length > 0 ? j.observaciones[0] : null;

          return (
            <div
              key={j.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Cabecera de Tarjeta */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          j.tipoRamo === 'Penal'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : j.tipoRamo === 'Civil'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {j.tipoRamo === 'Penal' ? 'Cámara Penal' : j.tipoRamo === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos'}
                      </span>
                      {isAllEquipped ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Equipamiento Completo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Equipamiento en Proceso
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-2 truncate" title={j.nombreJudicatura}>
                      {j.nombreJudicatura}
                    </h3>
                  </div>

                  {/* Botones de acción rápida */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleGenerateFicha(j)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Generar Ficha Técnica de Judicatura (PDF)"
                    >
                      <FileText className="w-4 h-4 text-blue-900" />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(j)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar Ficha"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmJudicatura(j)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar Judicatura"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Fechas de Adecuación e Inauguración */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Adecuaciones</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {formatDate(j.fechaInicioAdecuaciones)} al {formatDate(j.fechaFinAdecuaciones)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Estatus y Fecha</span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider w-fit ${
                          (j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')) === 'Inaugurado'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : (j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')) === 'Finalizado'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : (j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')) === 'Traslado'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : (j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')) === 'Reprogramado'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')}
                      </span>
                      {j.fechaInauguracion ? (
                        <span className="text-blue-900 font-bold flex items-center gap-1 text-[11px]">
                          <Flag className="w-3.5 h-3.5 text-amber-500" />
                          {formatDate(j.fechaInauguracion)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Fecha por definir</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checklist de Equipamiento Tecnológico */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                    Estado de Infraestructura TIC
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        j.equipoComputo === 'Si'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-[11px] font-semibold">Cómputo</span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          j.equipoComputo === 'Si' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {j.equipoComputo}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        j.equipoAudio === 'Si'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-[11px] font-semibold">Audio</span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          j.equipoAudio === 'Si' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {j.equipoAudio}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        j.cableadoEstructurado === 'Si'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Network className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-[11px] font-semibold">Red</span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          j.cableadoEstructurado === 'Si' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {j.cableadoEstructurado}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        j.enlaceDatos === 'Si'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-[11px] font-semibold">Enlace</span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          j.enlaceDatos === 'Si' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {j.enlaceDatos}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie de Tarjeta: Última Observación y Botón Ver Ficha */}
              <div className="p-4 bg-slate-50/80 flex flex-col gap-3">
                {latestObs ? (
                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                      <span className="text-blue-900">Acción #{latestObs.numeroAccion}</span>
                      <span>{formatDate(latestObs.fecha)}</span>
                    </div>
                    <p className="line-clamp-2 text-slate-700">{latestObs.texto}</p>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic text-center py-1">
                    Sin observaciones registradas aún.
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailJudicaturaId(j.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-blue-900 border border-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <GitBranch className="w-4 h-4 text-blue-700" />
                    <span>Ver Ficha ({(j.observaciones || []).length})</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBoletaJudicatura(j)}
                    className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Boleta Oficial de Control Judicaturas"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-700" />
                    <span className="hidden sm:inline">Boleta</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )
  );

  return (
    <div className="space-y-6">
      {/* ENCABEZADO INSTITUCIONAL */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-900 text-white shadow-md">
            <Scale className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Control de Judicaturas por Inaugurar
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                GIT - OJ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Monitoreo integral de adecuaciones tecnológicas, infraestructura de red, audio y cronograma de apertura
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Botón de Sincronización Forzada con la Base de Datos de Producción Firestore */}
          <button
            id="btn-forzar-sincronizacion-produccion"
            type="button"
            onClick={handleForceSyncProduction}
            disabled={isSyncingProduction}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md border border-emerald-600 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Forzar sincronización inmediata hacia la base de datos de producción Firestore"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-100 ${isSyncingProduction ? 'animate-spin' : ''}`} />
            <span>{isSyncingProduction ? 'Sincronizando...' : 'Forzar Sincronización BD'}</span>
          </button>

          {/* Botón Principal: Reporte Consolidado en PDF (Opciones y Personalización) */}
          <button
            id="btn-reporte-consolidado-pdf"
            type="button"
            onClick={handleOpenConsolidatedPDFModal}
            disabled={filteredJudicaturas.length === 0}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs shadow-md border border-blue-700 flex items-center gap-2.5 transition-all cursor-pointer group disabled:opacity-50"
            title="Generar reporte consolidado oficial en PDF (Tabla, Estado de Cada Una y Diagrama de Gantt)"
          >
            <FileText className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-1.5">
              <span>Reporte Consolidado PDF</span>
              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase bg-amber-400 text-slate-900">
                Gantt + Tabla
              </span>
            </div>
          </button>

          {/* Botón de Descarga Rápida Directa */}
          <button
            id="btn-exportar-pdf-judicaturas"
            type="button"
            onClick={handleQuickExportPDF}
            disabled={isExportingPdf || filteredJudicaturas.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs shadow-2xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Descarga rápida directa del reporte consolidado oficial en PDF"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>{isExportingPdf ? 'Generando...' : 'Descarga Rápida'}</span>
          </button>

          {/* Botón Exportar Registros a Excel compatible para re-importación */}
          <button
            id="btn-exportar-judicaturas-excel"
            type="button"
            onClick={handleExportExcel}
            disabled={filteredJudicaturas.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs shadow-2xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Exportar los registros de judicaturas a formato Excel (.xlsx) compatible para re-importación"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          {/* Botón Importar Registros de Judicaturas */}
          <button
            id="btn-importar-judicaturas"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md border border-blue-600 flex items-center gap-2 transition-all cursor-pointer"
            title="Importar registros de judicaturas desde un archivo Excel o CSV"
          >
            <Upload className="w-4 h-4 text-sky-200" />
            <span>Importar</span>
          </button>

          {/* Botón Boleta Oficial de Control Judicaturas */}
          <button
            id="btn-boleta-control-judicaturas"
            type="button"
            onClick={() => {
              if (filteredJudicaturas.length > 0) {
                setSelectedBoletaJudicatura(filteredJudicaturas[0]);
              } else if (judicaturas.length > 0) {
                setSelectedBoletaJudicatura(judicaturas[0]);
              }
            }}
            disabled={judicaturas.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md border border-emerald-600 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Abrir Boleta Oficial de Control Judicaturas"
          >
            <FileCheck className="w-4 h-4 text-amber-300" />
            <span>Boleta de Control</span>
          </button>

          {/* Botón de Nueva Judicatura */}
          <button
            id="btn-nueva-judicatura"
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Nueva Judicatura</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD DE RENDIMIENTO OPERATIVO: TIEMPOS PROMEDIO DE EJECUCIÓN DE ADECUACIONES (KPIs SUPERIORES) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl text-white space-y-4">
        {/* Cabecera del Dashboard de Rendimiento */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">
                  Dashboard de Rendimiento: Tiempos de Ejecución de Adecuaciones
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  KPIs en Tiempo Real
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Métricas operativas del ciclo de adecuación física e infraestructura tecnológica TIC en sedes judiciales
              </p>
            </div>
          </div>

          {/* Selector Rápido de Rango de Duración */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/10 text-xs self-start sm:self-auto">
            <span className="text-[10px] uppercase font-bold text-slate-300 px-2 hidden md:inline">Plazos:</span>
            {[
              { id: 'Todos', label: 'Todos', count: judicaturas.length },
              { id: '<=30', label: '≤ 30 Días', count: performanceMetrics.shortCount },
              { id: '31-60', label: '31 - 60 Días', count: performanceMetrics.mediumCount },
              { id: '>60', label: '> 60 Días', count: performanceMetrics.longCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDurationFilter(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  durationFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                  durationFilter === tab.id ? 'bg-blue-100 text-blue-900' : 'bg-white/10 text-white'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Rejilla de Indicadores (KPIs) de Rendimiento */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* KPI 1: Tiempo Promedio General de Adecuación */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/15 hover:border-white/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 text-[11px] font-bold uppercase tracking-wider">
              <span>Promedio General</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {performanceMetrics.avgDays}
                </span>
                <span className="text-xs font-bold text-amber-300 uppercase">Días</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">
                Ciclo técnico institucional
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 text-[9px] text-slate-300 flex items-center justify-between font-mono">
              <span className="text-purple-300">P:{performanceMetrics.penalAvgDays}d</span>
              <span>•</span>
              <span className="text-blue-300">C:{performanceMetrics.civilAvgDays}d</span>
              <span>•</span>
              <span className="text-emerald-300">A:{performanceMetrics.amparosAvgDays}d</span>
            </div>
          </div>

          {/* KPI 2: Cámara Penal */}
          <div className="bg-purple-900/30 backdrop-blur-md rounded-xl p-3.5 border border-purple-500/30 hover:border-purple-500/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-200 text-[11px] font-bold uppercase tracking-wider">
              <span>Cámara Penal</span>
              <Scale className="w-4 h-4 text-purple-300" />
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-purple-100 tracking-tight">
                  {performanceMetrics.penalAvgDays}
                </span>
                <span className="text-xs font-bold text-purple-300 uppercase">Días</span>
              </div>
              <p className="text-[10px] text-purple-200 mt-0.5">
                {performanceMetrics.penalCount} sedes penales
              </p>
            </div>
            <div className="pt-2 border-t border-purple-500/20 text-[10px] text-purple-300 flex items-center justify-between font-semibold">
              <span>Ramo Penal</span>
              <span className="font-mono text-white bg-purple-800/60 px-1.5 py-0.2 rounded">
                {performanceMetrics.penalCount} sedes
              </span>
            </div>
          </div>

          {/* KPI 3: Cámara Civil */}
          <div className="bg-blue-900/30 backdrop-blur-md rounded-xl p-3.5 border border-blue-500/30 hover:border-blue-500/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-200 text-[11px] font-bold uppercase tracking-wider">
              <span>Cámara Civil</span>
              <Building2 className="w-4 h-4 text-blue-300" />
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-blue-100 tracking-tight">
                  {performanceMetrics.civilAvgDays}
                </span>
                <span className="text-xs font-bold text-blue-300 uppercase">Días</span>
              </div>
              <p className="text-[10px] text-blue-200 mt-0.5">
                {performanceMetrics.civilCount} sedes civiles
              </p>
            </div>
            <div className="pt-2 border-t border-blue-500/20 text-[10px] text-blue-300 flex items-center justify-between font-semibold">
              <span>Ramo Civil</span>
              <span className="font-mono text-white bg-blue-800/60 px-1.5 py-0.2 rounded">
                {performanceMetrics.civilCount} sedes
              </span>
            </div>
          </div>

          {/* KPI 4: Cámara Amparos */}
          <div className="bg-emerald-900/30 backdrop-blur-md rounded-xl p-3.5 border border-emerald-500/30 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-200 text-[11px] font-bold uppercase tracking-wider">
              <span>Cámara Amparos</span>
              <Landmark className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-emerald-100 tracking-tight">
                  {performanceMetrics.amparosAvgDays}
                </span>
                <span className="text-xs font-bold text-emerald-300 uppercase">Días</span>
              </div>
              <p className="text-[10px] text-emerald-200 mt-0.5">
                {performanceMetrics.amparosCount} sedes amparos
              </p>
            </div>
            <div className="pt-2 border-t border-emerald-500/20 text-[10px] text-emerald-300 flex items-center justify-between font-semibold">
              <span>Ramo Amparos</span>
              <span className="font-mono text-white bg-emerald-800/60 px-1.5 py-0.2 rounded">
                {performanceMetrics.amparosCount} sedes
              </span>
            </div>
          </div>

          {/* KPI 4: Estado y Cumplimiento de Plazo */}
          <div className="bg-emerald-900/30 backdrop-blur-md rounded-xl p-3.5 border border-emerald-500/30 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-200 text-[11px] font-bold uppercase tracking-wider">
              <span>Conclusión de Obras</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-emerald-100 tracking-tight">
                  {performanceMetrics.completionPct}%
                </span>
                <span className="text-xs font-bold text-emerald-300 uppercase">Listo</span>
              </div>
              <p className="text-[10px] text-emerald-200 mt-0.5">
                {performanceMetrics.completedAdecuacionesCount} adecuadas
              </p>
            </div>
            <div className="pt-2 border-t border-emerald-500/20 text-[10px] text-emerald-300 flex items-center justify-between">
              <span>En curso: {performanceMetrics.activeAdecuacionesCount}</span>
              <span>Por iniciar: {performanceMetrics.pendingAdecuacionesCount}</span>
            </div>
          </div>

          {/* KPI 5: Brecha Adecuación a Inauguración */}
          <div className="bg-indigo-900/30 backdrop-blur-md rounded-xl p-3.5 border border-indigo-500/30 hover:border-indigo-500/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-200 text-[11px] font-bold uppercase tracking-wider">
              <span>Fin a Inauguración</span>
              <Flag className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-indigo-100 tracking-tight">
                  {performanceMetrics.avgGapDays > 0 ? performanceMetrics.avgGapDays : 15}
                </span>
                <span className="text-xs font-bold text-indigo-300 uppercase">Días</span>
              </div>
              <p className="text-[10px] text-indigo-200 mt-0.5">
                Brecha de entrega oficial
              </p>
            </div>
            <div className="pt-2 border-t border-indigo-500/20 text-[10px] text-indigo-300 flex items-center justify-between">
              <span>{performanceMetrics.countWithInauguration} con fecha</span>
              <span className="font-mono text-indigo-200 font-bold">Apertura</span>
            </div>
          </div>

          {/* KPI 6: Rango de Plazos (Mín / Máx) */}
          <div className="bg-amber-950/30 backdrop-blur-md rounded-xl p-3.5 border border-amber-500/30 hover:border-amber-500/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-200 text-[11px] font-bold uppercase tracking-wider">
              <span>Rango de Plazos</span>
              <Zap className="w-4 h-4 text-amber-300" />
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-amber-100 tracking-tight">
                  {performanceMetrics.minDays} - {performanceMetrics.maxDays}
                </span>
                <span className="text-xs font-bold text-amber-300 uppercase">Días</span>
              </div>
              <p className="text-[10px] text-amber-200 mt-0.5 truncate" title={performanceMetrics.fastestJudicatura?.nombreJudicatura}>
                Mín: {performanceMetrics.fastestJudicatura?.nombreJudicatura ? performanceMetrics.fastestJudicatura.nombreJudicatura.slice(0, 16) + '...' : 'N/A'}
              </p>
            </div>
            <div className="pt-2 border-t border-amber-500/20 text-[10px] text-amber-300 truncate font-mono" title={performanceMetrics.longestJudicatura?.nombreJudicatura}>
              Máx: {performanceMetrics.longestJudicatura?.nombreJudicatura ? performanceMetrics.longestJudicatura.nombreJudicatura.slice(0, 16) + '...' : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE RESUMEN EJECUTIVO: TARJETAS DE ESTATUS Y GRÁFICOS RECHARTS */}
      <div className="space-y-4">
        {/* Cabecera del Panel Ejecutivo */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-xs border border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                Visión Ejecutiva
              </span>
              <span className="text-xs text-indigo-200 font-mono">
                {statusExecutiveMetrics.total} Judicaturas en Control
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-amber-400" />
              <span>Resumen Ejecutivo y Gráficos por Estatus</span>
            </h2>
            <p className="text-xs text-indigo-200 mt-0.5">
              Monitoreo analítico de inauguraciones, distribución por estatus y comparativa institucional por ramo (Cámara Penal, Cámara Civil y Cámara Amparos)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-1.5 font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>Penal: {statusExecutiveMetrics.penalTotal}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-900/60 border border-blue-500/40 text-blue-200 text-xs flex items-center gap-1.5 font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Civil: {statusExecutiveMetrics.civilTotal}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-1.5 font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Amparos: {statusExecutiveMetrics.amparosTotal}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-900/60 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-1.5 font-bold font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>TIC 100%: {stats.equipamiento100}</span>
            </div>
          </div>
        </div>

        {/* Fila 1: Tarjetas Ejecutivas de Resumen por Estatus */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Tarjeta Global: Total Judicaturas */}
          <div
            onClick={() => {
              setEstatusInauguracionFilter('Todos');
              setCurrentPage(1);
            }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              estatusInauguracionFilter === 'Todos'
                ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-blue-500/30 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
            title="Mostrar todas las judicaturas"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  estatusInauguracionFilter === 'Todos' ? 'text-indigo-200' : 'text-slate-500'
                }`}>
                  Total General
                </span>
                <Building2 className={`w-4 h-4 ${
                  estatusInauguracionFilter === 'Todos' ? 'text-amber-400' : 'text-slate-400'
                }`} />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-black font-mono tracking-tight ${
                  estatusInauguracionFilter === 'Todos' ? 'text-white' : 'text-slate-900'
                }`}>
                  {statusExecutiveMetrics.total}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  estatusInauguracionFilter === 'Todos' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-700'
                }`}>
                  100%
                </span>
              </div>
            </div>
            <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
              estatusInauguracionFilter === 'Todos' ? 'border-slate-700 text-indigo-200' : 'border-slate-100 text-slate-500'
            }`}>
              <span>Penal: {statusExecutiveMetrics.penalTotal}</span>
              <span>Civil: {statusExecutiveMetrics.civilTotal}</span>
              <span>Amparos: {statusExecutiveMetrics.amparosTotal}</span>
            </div>
          </div>

          {/* Tarjetas Dinámicas por Cada Estatus */}
          {statusExecutiveMetrics.statusCards.map((sc) => {
            const isSelected = estatusInauguracionFilter === sc.status;
            return (
              <div
                key={sc.status}
                onClick={() => {
                  setEstatusInauguracionFilter(isSelected ? 'Todos' : sc.status);
                  setCurrentPage(1);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-offset-1 shadow-md'
                    : 'bg-white shadow-2xs hover:shadow-sm'
                }`}
                style={{
                  borderColor: isSelected ? sc.color : undefined,
                  outlineColor: isSelected ? sc.color : undefined,
                }}
                title={`Filtrar judicaturas con estatus ${sc.status}`}
              >
                {/* Indicador superior de color */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: sc.color }}
                />

                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-[10px] font-black uppercase tracking-wider truncate"
                      style={{ color: sc.color }}
                      title={sc.status}
                    >
                      {sc.status}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: sc.color }}
                    />
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {sc.count}
                    </span>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {sc.pct}%
                    </span>
                  </div>

                  {/* Barra visual de porcentaje */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(5, sc.pct))}%`,
                        backgroundColor: sc.color,
                      }}
                    />
                  </div>
                </div>

                {/* Desglose por Ramo en la parte inferior */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="text-purple-700 font-bold">P: {sc.penalCount}</span>
                  <span className="text-blue-700 font-bold">C: {sc.civilCount}</span>
                </div>
              </div>
            );
          })}

          {/* Tarjeta TIC 100% */}
          <div
            onClick={() => {
              setEquipamientoFilter(equipamientoFilter === 'Completo' ? 'Todos' : 'Completo');
              setCurrentPage(1);
            }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              equipamientoFilter === 'Completo'
                ? 'bg-teal-900 text-white border-teal-800 ring-2 ring-teal-500/30 shadow-md'
                : 'bg-white border-teal-200 shadow-2xs hover:bg-teal-50/40'
            }`}
            title="Filtrar judicaturas con 100% de infraestructura TIC"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  equipamientoFilter === 'Completo' ? 'text-teal-200' : 'text-teal-700'
                }`}>
                  TIC 100%
                </span>
                <CheckCircle2 className={`w-4 h-4 ${
                  equipamientoFilter === 'Completo' ? 'text-teal-300' : 'text-teal-600'
                }`} />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-black font-mono tracking-tight ${
                  equipamientoFilter === 'Completo' ? 'text-white' : 'text-teal-950'
                }`}>
                  {stats.equipamiento100}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  equipamientoFilter === 'Completo' ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'
                }`}>
                  {statusExecutiveMetrics.total > 0 ? Math.round((stats.equipamiento100 / statusExecutiveMetrics.total) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] ${
              equipamientoFilter === 'Completo' ? 'border-teal-800 text-teal-200' : 'border-teal-100 text-teal-700'
            }`}>
              <span>4/4 Equipos</span>
              <span className="font-bold">Completado</span>
            </div>
          </div>
        </div>

        {/* Fila 2: Panel de Gráficos Recharts para Visión Ejecutiva */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gráfico 1: Gráfico de Barras Recharts de Judicaturas por Estatus comparando Ramo Penal vs Ramo Civil */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-900" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Total de Judicaturas por Estatus y Cámara (Recharts)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Comparativa de distribución entre Cámara Penal (púrpura), Cámara Civil (azul) y Cámara Amparos (verde) por cada estatus
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200">
                  Penal: {statusExecutiveMetrics.penalTotal}
                </span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                  Civil: {statusExecutiveMetrics.civilTotal}
                </span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                  Amparos: {statusExecutiveMetrics.amparosTotal}
                </span>
              </div>
            </div>

            {/* Contenedor del Gráfico de Barras Recharts */}
            <div className="h-64 sm:h-72 w-full pt-2">
              {statusExecutiveMetrics.total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusExecutiveMetrics.barChartData}
                    margin={{ top: 15, right: 15, left: -15, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="estatus"
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: '#f1f5f9', opacity: 0.8 }}
                      formatter={(val: any, name: any) => [
                        `${val} Judicatura${Number(val) === 1 ? '' : 's'}`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '11px',
                        padding: '8px 12px',
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 700 }}
                    />
                    <Bar
                      dataKey="Cámara Penal"
                      fill="#7c3aed"
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                    <Bar
                      dataKey="Cámara Civil"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                    <Bar
                      dataKey="Cámara Amparos"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  No hay judicaturas registradas para generar el gráfico
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">
                Total consolidado: <strong className="font-mono text-slate-900">{statusExecutiveMetrics.total}</strong> sedes judiciales
              </span>
              <span className="text-slate-400 text-[10px]">
                Haga clic en una tarjeta de estatus para filtrar la lista
              </span>
            </div>
          </div>

          {/* Gráfico 2: Dona Recharts de Distribución Porcentual por Estatus */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Distribución por Estatus
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {statusExecutiveMetrics.total} sedes
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Proporción porcentual por estado del proceso de apertura
              </p>

              {/* Dona Recharts */}
              <div className="h-44 relative flex items-center justify-center">
                {statusExecutiveMetrics.total > 0 && statusExecutiveMetrics.pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusExecutiveMetrics.pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusExecutiveMetrics.pieChartData.map((entry, index) => (
                          <Cell
                            key={`pie-cell-estatus-${index}`}
                            fill={entry.color}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          `${val} Judicatura${Number(val) === 1 ? '' : 's'}`,
                          name,
                        ]}
                        contentStyle={{
                          fontSize: '11px',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-400 text-xs italic">Sin registros disponibles</div>
                )}
                {statusExecutiveMetrics.total > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-black font-mono text-slate-900 leading-none">
                      {statusExecutiveMetrics.total}
                    </span>
                    <span className="text-[8px] font-bold uppercase text-slate-500 mt-0.5">
                      Judicaturas
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Leyenda interactiva con filtros directos */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              {statusExecutiveMetrics.statusCards.map((item) => (
                <button
                  key={`pie-leg-${item.status}`}
                  type="button"
                  onClick={() => {
                    setEstatusInauguracionFilter(
                      estatusInauguracionFilter === item.status ? 'Todos' : item.status
                    );
                    setCurrentPage(1);
                  }}
                  className={`w-full p-1.5 rounded-lg flex items-center justify-between transition-colors text-left cursor-pointer ${
                    estatusInauguracionFilter === item.status
                      ? 'bg-blue-50 ring-1 ring-blue-800'
                      : 'hover:bg-slate-50'
                  }`}
                  title={`Filtrar por ${item.status}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] font-semibold text-slate-700 truncate">
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400">{item.pct}%</span>
                    <span
                      className="text-[10px] font-black font-mono px-1.5 py-0.2 rounded border"
                      style={{
                        backgroundColor: `${item.color}15`,
                        borderColor: `${item.color}35`,
                        color: item.color,
                      }}
                    >
                      {item.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA, FILTROS Y SELECTOR DE VISTA */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Barra de búsqueda interactiva */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="input-buscar-judicatura"
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar judicatura, cámara u observaciones..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-800 focus:outline-none focus:bg-white transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selector de campo para filtrar */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              id="select-filtro-campo-judicatura"
              value={searchField}
              onChange={(e) => {
                setSearchField(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="todos">Todos los campos</option>
              <option value="nombre">Solo Nombre</option>
              <option value="ramo">Solo Cámara</option>
              <option value="observaciones">Solo Observaciones</option>
            </select>
          </div>
        </div>

        {/* Filtros de Estatus, Cámara y Selector de Modo de Vista */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Estatus */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold flex-wrap">
            {[
              { id: 'Todos', label: 'Todos los Estatus' },
              { id: 'Pendiente Fecha', label: 'Pendiente Fecha' },
              { id: 'Reprogramado', label: 'Reprogramado' },
              { id: 'Inaugurado', label: 'Inaugurado' },
              { id: 'Finalizado', label: 'Finalizado' },
              { id: 'Traslado', label: 'Traslado' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setEstatusInauguracionFilter(st.id as any);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  estatusInauguracionFilter === st.id
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Cámara Asignada */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'Todos', label: 'Todas' },
              { id: 'Penal', label: 'Cámara Penal' },
              { id: 'Civil', label: 'Cámara Civil' },
              { id: 'Amparos', label: 'Cámara Amparos' }
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRamoFilter(r.id as any);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ramoFilter === r.id
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Selector de Agrupación por Ramo */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsGroupedByRamo(!isGroupedByRamo)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isGroupedByRamo
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
              title="Separar visualmente las judicaturas por Ramo (Cámara Penal, Cámara Civil y Cámara Amparos) para un mejor análisis"
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-400" />
              <span>{isGroupedByRamo ? 'Separado por Ramo' : 'Separar por Ramo'}</span>
            </button>
          </div>

          {/* Selector de Modo de Vista */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista de Listado (Control de Adquisiciones)"
            >
              <List className="w-3.5 h-3.5" />
              <span>Listado</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista de Fichas en Tarjetas"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'gantt'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Diagrama de Gantt Semanal"
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Gantt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de filtro activo */}
      {(searchTerm.trim() || ramoFilter !== 'Todos' || equipamientoFilter !== 'Todos' || estatusInauguracionFilter !== 'Todos' || durationFilter !== 'Todos') && (
        <div className="px-4 py-2 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">Filtros aplicados:</span>
            {searchTerm.trim() && (
              <span>
                Buscando <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 text-slate-900">"{searchTerm}"</strong>
              </span>
            )}
            {estatusInauguracionFilter !== 'Todos' && (
              <span className="px-2 py-0.5 rounded bg-white border border-amber-300 font-bold">
                Estatus: {estatusInauguracionFilter}
              </span>
            )}
            {ramoFilter !== 'Todos' && (
              <span className="px-2 py-0.5 rounded bg-white border border-amber-300 font-bold">
                {ramoFilter === 'Penal' ? 'Cámara Penal' : ramoFilter === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos'}
              </span>
            )}
            {equipamientoFilter !== 'Todos' && (
              <span className="px-2 py-0.5 rounded bg-white border border-amber-300 font-bold">
                TIC: {equipamientoFilter === 'Completo' ? '100% Equipado' : 'Pendiente'}
              </span>
            )}
            {durationFilter !== 'Todos' && (
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 font-bold">
                Plazo: {durationFilter === '<=30' ? '≤ 30 Días' : durationFilter === '31-60' ? '31 - 60 Días' : '> 60 Días'}
              </span>
            )}
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="font-semibold text-amber-950">
              {filteredJudicaturas.length} judicatura{filteredJudicaturas.length === 1 ? '' : 's'} encontrada{filteredJudicaturas.length === 1 ? '' : 's'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSearchField('todos');
              setRamoFilter('Todos');
              setEquipamientoFilter('Todos');
              setEstatusInauguracionFilter('Todos');
              setDurationFilter('Todos');
              setCurrentPage(1);
            }}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline ml-2 cursor-pointer shrink-0"
          >
            Restablecer todos
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA SEPARADA POR RAMO (CÁMARAS PENAL, CIVIL Y AMPAROS)                 */}
      {/* ========================================================================= */}
      {isGroupedByRamo && viewMode !== 'gantt' && (
        <div className="space-y-6">
          {/* Banner de Exportación de Reportes Oficiales: Consolidado (Penal + Civil + Amparos Separadas) y por Cámara */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-4 sm:p-5 border border-indigo-900 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">
                    Reportes de Judicaturas: Consolidado y por Cámara
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    PDF Oficial OJ
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Reporte consolidado con Cámaras Penal, Civil y Amparos separadas, o reportes independientes por cada cámara jurisdiccional.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Reporte Consolidado con separación Penal, Civil y Amparos */}
              <button
                type="button"
                onClick={handleQuickExportPDF}
                disabled={isExportingPdf || filteredJudicaturas.length === 0}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md border border-amber-400 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                title="Generar y descargar de inmediato el reporte consolidado oficial con Cámaras Penal, Civil y Amparos separadas"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>Reporte Consolidado (Penal + Civil + Amparos)</span>
              </button>

              {/* Reporte Individual Cámara Penal */}
              <button
                type="button"
                onClick={() => handleExportRamoPDF('Penal')}
                disabled={judicaturasByRamo.penal.length === 0}
                className="px-3 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-white font-bold text-xs border border-purple-600 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Descargar reporte exclusivo de Cámara Penal"
              >
                <Scale className="w-3.5 h-3.5 text-purple-300" />
                <span>Reporte Penal</span>
              </button>

              {/* Reporte Individual Cámara Civil */}
              <button
                type="button"
                onClick={() => handleExportRamoPDF('Civil')}
                disabled={judicaturasByRamo.civil.length === 0}
                className="px-3 py-2 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-white font-bold text-xs border border-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Descargar reporte exclusivo de Cámara Civil"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-300" />
                <span>Reporte Civil</span>
              </button>

              {/* Reporte Individual Cámara Amparos */}
              <button
                type="button"
                onClick={() => handleExportRamoPDF('Amparos')}
                disabled={judicaturasByRamo.amparos.length === 0}
                className="px-3 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-white font-bold text-xs border border-emerald-600 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Descargar reporte exclusivo de Cámara Amparos"
              >
                <Landmark className="w-3.5 h-3.5 text-emerald-300" />
                <span>Reporte Amparos</span>
              </button>
            </div>
          </div>

          {/* BLOQUE 1: CÁMARA PENAL */}
          <div className="bg-white border-2 border-purple-200/80 rounded-2xl shadow-xs overflow-hidden">
            {/* Cabecera Distintiva de Cámara Penal */}
            <div className="p-4 sm:p-5 border-b border-purple-100 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900 text-white flex items-center justify-center shadow-md">
                  <Scale className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-slate-900 text-base tracking-tight">
                      CÁMARA PENAL
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300 font-mono">
                      {judicaturasByRamo.penal.length} {judicaturasByRamo.penal.length === 1 ? 'Judicatura' : 'Judicaturas'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Órganos jurisdiccionales del Ramo Penal en adecuación física y tecnológica
                  </p>
                </div>
              </div>

              {/* Badges de estatus y acción de exportación para Penal */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/80 border border-purple-200 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold">
                  <span className="text-emerald-700">Inaugurados: {judicaturasByRamo.penalStats.inaugurados}</span>
                  <span>•</span>
                  <span className="text-amber-700">Pendientes: {judicaturasByRamo.penalStats.pendientes}</span>
                  <span>•</span>
                  <span className="text-rose-700">Reprog: {judicaturasByRamo.penalStats.reprogramados}</span>
                  <span>•</span>
                  <span className="text-blue-700">Fin: {judicaturasByRamo.penalStats.finalizados}</span>
                  <span>•</span>
                  <span className="text-purple-700">Traslado: {judicaturasByRamo.penalStats.traslados}</span>
                  <span>•</span>
                  <span className="text-teal-700 font-black">TIC 100%: {judicaturasByRamo.penalStats.equip100}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportRamoPDF('Penal')}
                  disabled={judicaturasByRamo.penal.length === 0}
                  className="px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-2xs border border-purple-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Exportar reporte oficial exclusivo de Cámara Penal en PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reporte Penal PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickExportPDF}
                  disabled={isExportingPdf || filteredJudicaturas.length === 0}
                  className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-900 text-xs font-bold rounded-xl border border-purple-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Exportar reporte consolidado completo (Penal + Civil separadas)"
                >
                  <Download className="w-3.5 h-3.5 text-purple-700" />
                  <span>Consolidado</span>
                </button>
              </div>
            </div>

            {/* Contenido Penal: Tabla o Fichas */}
            {viewMode === 'table' ? (
              renderJudicaturasTable(judicaturasByRamo.penal, true)
            ) : (
              <div className="p-4 sm:p-5">
                {renderJudicaturasCards(judicaturasByRamo.penal)}
              </div>
            )}
          </div>

          {/* BLOQUE 2: CÁMARA CIVIL */}
          <div className="bg-white border-2 border-blue-200/80 rounded-2xl shadow-xs overflow-hidden">
            {/* Cabecera Distintiva de Cámara Civil */}
            <div className="p-4 sm:p-5 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-sky-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md">
                  <Building2 className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-slate-900 text-base tracking-tight">
                      CÁMARA CIVIL
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300 font-mono">
                      {judicaturasByRamo.civil.length} {judicaturasByRamo.civil.length === 1 ? 'Judicatura' : 'Judicaturas'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Órganos jurisdiccionales del Ramo Civil, Familia y Mercantil en adecuación física y tecnológica
                  </p>
                </div>
              </div>

              {/* Badges de estatus y acción de exportación para Civil */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/80 border border-blue-200 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold">
                  <span className="text-emerald-700">Inaugurados: {judicaturasByRamo.civilStats.inaugurados}</span>
                  <span>•</span>
                  <span className="text-amber-700">Pendientes: {judicaturasByRamo.civilStats.pendientes}</span>
                  <span>•</span>
                  <span className="text-rose-700">Reprog: {judicaturasByRamo.civilStats.reprogramados}</span>
                  <span>•</span>
                  <span className="text-blue-700">Fin: {judicaturasByRamo.civilStats.finalizados}</span>
                  <span>•</span>
                  <span className="text-purple-700">Traslado: {judicaturasByRamo.civilStats.traslados}</span>
                  <span>•</span>
                  <span className="text-teal-700 font-black">TIC 100%: {judicaturasByRamo.civilStats.equip100}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportRamoPDF('Civil')}
                  disabled={judicaturasByRamo.civil.length === 0}
                  className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-2xs border border-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Exportar reporte oficial exclusivo de Cámara Civil en PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reporte Civil PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickExportPDF}
                  disabled={isExportingPdf || filteredJudicaturas.length === 0}
                  className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-900 text-xs font-bold rounded-xl border border-blue-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Exportar reporte consolidado completo (Penal + Civil + Amparos separadas)"
                >
                  <Download className="w-3.5 h-3.5 text-blue-700" />
                  <span>Consolidado</span>
                </button>
              </div>
            </div>

            {/* Contenido Civil: Tabla o Fichas */}
            {viewMode === 'table' ? (
              renderJudicaturasTable(judicaturasByRamo.civil, true)
            ) : (
              <div className="p-4 sm:p-5">
                {renderJudicaturasCards(judicaturasByRamo.civil)}
              </div>
            )}
          </div>

          {/* BLOQUE 3: CÁMARA AMPAROS */}
          <div className="bg-white border-2 border-emerald-200/80 rounded-2xl shadow-xs overflow-hidden">
            {/* Cabecera Distintiva de Cámara Amparos */}
            <div className="p-4 sm:p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-900 text-white flex items-center justify-center shadow-md">
                  <Landmark className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-slate-900 text-base tracking-tight">
                      CÁMARA AMPAROS
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono">
                      {judicaturasByRamo.amparos.length} {judicaturasByRamo.amparos.length === 1 ? 'Judicatura' : 'Judicaturas'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Órganos jurisdiccionales del Ramo de Amparos y Antejuicios en adecuación física y tecnológica
                  </p>
                </div>
              </div>

              {/* Badges de estatus y acción de exportación para Amparos */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/80 border border-emerald-200 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold">
                  <span className="text-emerald-700">Inaugurados: {judicaturasByRamo.amparosStats.inaugurados}</span>
                  <span>•</span>
                  <span className="text-amber-700">Pendientes: {judicaturasByRamo.amparosStats.pendientes}</span>
                  <span>•</span>
                  <span className="text-rose-700">Reprog: {judicaturasByRamo.amparosStats.reprogramados}</span>
                  <span>•</span>
                  <span className="text-blue-700">Fin: {judicaturasByRamo.amparosStats.finalizados}</span>
                  <span>•</span>
                  <span className="text-purple-700">Traslado: {judicaturasByRamo.amparosStats.traslados}</span>
                  <span>•</span>
                  <span className="text-teal-700 font-black">TIC 100%: {judicaturasByRamo.amparosStats.equip100}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportRamoPDF('Amparos')}
                  disabled={judicaturasByRamo.amparos.length === 0}
                  className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs border border-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Exportar reporte oficial exclusivo de Cámara Amparos en PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reporte Amparos PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickExportPDF}
                  disabled={isExportingPdf || filteredJudicaturas.length === 0}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-bold rounded-xl border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Exportar reporte consolidado completo (Penal + Civil + Amparos separadas)"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Consolidado</span>
                </button>
              </div>
            </div>

            {/* Contenido Amparos: Tabla o Fichas */}
            {viewMode === 'table' ? (
              renderJudicaturasTable(judicaturasByRamo.amparos, true)
            ) : (
              <div className="p-4 sm:p-5">
                {renderJudicaturasCards(judicaturasByRamo.amparos)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA UNIFICADA: LISTADO (CONTROL DE ADQUISICIONES)                       */}
      {/* ========================================================================= */}
      {!isGroupedByRamo && viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          {/* Cabecera del Listado Unificado */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-800 text-sm">
                    Control de Judicaturas en Trámite de Apertura
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {filteredJudicaturas.length} registradas
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Listado oficial de juzgados con adecuaciones tecnológicas y acciones de seguimiento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenConsolidatedPDFModal}
                disabled={filteredJudicaturas.length === 0}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-2xs border border-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Generar reporte consolidado en PDF con tabla, estados y diagrama de Gantt"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Reporte Consolidado PDF</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Agregar Judicatura</span>
              </button>
            </div>
          </div>

          {/* Tabla de Judicaturas */}
          {renderJudicaturasTable(paginatedJudicaturas, false)}

          {/* Paginación de la Tabla */}
          {filteredJudicaturas.length > 0 && (
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/50">
              <span className="text-slate-500 font-medium">
                Mostrando{' '}
                <strong className="text-slate-800 font-bold">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, filteredJudicaturas.length)}
                </strong>{' '}
                al{' '}
                <strong className="text-slate-800 font-bold">
                  {Math.min(currentPage * itemsPerPage, filteredJudicaturas.length)}
                </strong>{' '}
                de <strong className="text-slate-800 font-bold">{filteredJudicaturas.length}</strong> judicaturas
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                <div className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 shadow-2xs">
                  {currentPage} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA UNIFICADA: FICHAS EN TARJETAS                                       */}
      {/* ========================================================================= */}
      {!isGroupedByRamo && viewMode === 'cards' && (
        renderJudicaturasCards(filteredJudicaturas)
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: DIAGRAMA DE GANTT DETALLADO POR SEMANA                           */}
      {/* ========================================================================= */}
      {viewMode === 'gantt' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-800" />
                Diagrama de Gantt por Semanas (Adecuaciones e Inauguración)
              </h2>
              <p className="text-[11px] text-slate-500">
                Visualización compacta agrupada por semanas para seguimiento ágil sin saturación diaria
              </p>
            </div>
            {/* Leyenda y Botón de Exportar Gantt */}
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <button
                type="button"
                onClick={handleOpenConsolidatedPDFModal}
                disabled={filteredJudicaturas.length === 0}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-2xs border border-purple-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Generar y descargar el diagrama de Gantt en el reporte consolidado PDF"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Exportar Gantt en PDF</span>
              </button>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-purple-600"></div>
                <span className="text-slate-700 font-medium">Adecuaciones Cámara Penal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-600"></div>
                <span className="text-slate-700 font-medium">Adecuaciones Cámara Civil</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-600"></div>
                <span className="text-slate-700 font-medium">Adecuaciones Cámara Amparos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-300"></div>
                <span className="text-slate-700 font-bold">Inauguración</span>
              </div>
            </div>
          </div>

          {/* Contenedor del Gantt con Scroll Horizontal */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <div className="min-w-[900px]">
              {/* Encabezado Semanal */}
              <div className="grid grid-cols-[260px_repeat(auto-fit,minmax(90px,1fr))] bg-slate-100 text-slate-700 font-bold text-[11px] border-b border-slate-300">
                <div className="p-2.5 border-r border-slate-200 sticky left-0 bg-slate-100 z-10">
                  Judicatura / Cámara
                </div>
                {ganttWeeks.map((w) => (
                  <div key={w.weekIndex} className="p-2 text-center border-r border-slate-200 last:border-r-0">
                    <span className="block font-black text-slate-800 font-mono">Sem #{w.weekIndex}</span>
                    <span className="text-[9px] text-slate-500 font-normal">
                      {String(w.startDate.getDate()).padStart(2, '0')}/{String(w.startDate.getMonth() + 1).padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Filas de Judicaturas (Ordenadas por Ramo si isGroupedByRamo está activo) */}
              <div className="divide-y divide-slate-100">
                {(isGroupedByRamo
                  ? [...filteredJudicaturas].sort((a, b) => (a.tipoRamo === 'Penal' && b.tipoRamo !== 'Penal' ? -1 : 1))
                  : filteredJudicaturas
                ).map((j) => {
                  const startMs = new Date(j.fechaInicioAdecuaciones).getTime();
                  const endMs = new Date(j.fechaFinAdecuaciones).getTime();
                  const inaugMs = new Date(j.fechaInauguracion).getTime();

                  return (
                    <div
                      key={j.id}
                      className="grid grid-cols-[260px_repeat(auto-fit,minmax(90px,1fr))] hover:bg-slate-50/80 transition-colors items-center text-xs"
                    >
                      {/* Columna Izquierda: Identificador */}
                      <div className="p-2.5 border-r border-slate-200 sticky left-0 bg-white z-10 flex items-center justify-between gap-2 shadow-xs">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetailJudicaturaId(j.id)}
                            className="font-bold text-slate-900 hover:text-blue-800 text-left truncate block cursor-pointer"
                            title={j.nombreJudicatura}
                          >
                            {j.nombreJudicatura}
                          </button>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                j.tipoRamo === 'Penal'
                                  ? 'bg-purple-100 text-purple-800'
                                  : j.tipoRamo === 'Civil'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {j.tipoRamo === 'Penal' ? 'Cámara Penal' : j.tipoRamo === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Inauguración: {formatDate(j.fechaInauguracion)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDetailJudicaturaId(j.id)}
                          className="p-1 text-slate-400 hover:text-blue-800 rounded-lg hover:bg-slate-100 shrink-0"
                          title="Ver Ficha y Árbol"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Columnas Semanales */}
                      {ganttWeeks.map((w) => {
                        const wStart = w.startDate.getTime();
                        const wEnd = w.endDate.getTime() + 24 * 60 * 60 * 1000 - 1;

                        const isDuringAdecuaciones = startMs <= wEnd && endMs >= wStart;
                        const isInaugurationWeek = inaugMs >= wStart && inaugMs <= wEnd;

                        return (
                          <div
                            key={w.weekIndex}
                            className="p-2 h-14 border-r border-slate-200 last:border-r-0 relative flex items-center justify-center"
                          >
                            {/* Barra de Adecuaciones */}
                            {isDuringAdecuaciones && (
                              <div
                                className={`w-full h-5 rounded-md shadow-xs opacity-90 transition-all ${
                                  j.tipoRamo === 'Penal'
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : j.tipoRamo === 'Civil'
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                                title={`Adecuaciones: ${formatDate(j.fechaInicioAdecuaciones)} al ${formatDate(j.fechaFinAdecuaciones)}`}
                              />
                            )}

                            {/* Hito de Inauguración */}
                            {isInaugurationWeek && (
                              <div
                                className="absolute -top-1 right-2 z-20 flex flex-col items-center"
                                title={`Inauguración Oficial: ${formatDate(j.fechaInauguracion)}`}
                              >
                                <div className="p-1 rounded-full bg-amber-400 text-slate-900 shadow-md border-2 border-white animate-bounce">
                                  <Flag className="w-3 h-3 fill-slate-900" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FORMULARIO DE FICHA DE JUDICATURA (CREAR / EDITAR)              */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            {/* Cabecera del Formulario */}
            <div className="p-5 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 border border-white/20">
                  <Scale className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight">
                    {editingJudicatura ? 'Editar Ficha de Judicatura' : 'Ingreso de Nueva Judicatura por Inaugurar'}
                  </h2>
                  <p className="text-xs text-blue-200">
                    Gerencia de Informática - Organismo Judicial de Guatemala
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Nombre Judicatura */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre de la Judicatura <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={nombreJudicatura}
                  onChange={(e) => setNombreJudicatura(e.target.value)}
                  placeholder="ej. Juzgado de Primera Instancia Penal de Delitos de Femicidio de Quetzaltenango"
                  className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-800 focus:outline-none ${
                    formErrors.nombreJudicatura ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                {formErrors.nombreJudicatura && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">{formErrors.nombreJudicatura}</p>
                )}
              </div>

              {/* Tipo de Ramo: "Cámara Penal", "Cámara Civil" y "Cámara Amparos" */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Cámara Asignada <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Opción Cámara Penal */}
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      tipoRamo === 'Penal'
                        ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoRamo"
                      value="Penal"
                      checked={tipoRamo === 'Penal'}
                      onChange={() => setTipoRamo('Penal')}
                      className="sr-only"
                    />
                    <div className="w-4 h-4 rounded-full border-2 border-purple-600 flex items-center justify-center shrink-0">
                      {tipoRamo === 'Penal' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                    </div>
                    <div>
                      <span className="font-black text-xs block">Cámara Penal</span>
                      <span className="text-[10px] text-slate-500">Juzgados y Salas del Ramo Penal</span>
                    </div>
                  </label>

                  {/* Opción Cámara Civil */}
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      tipoRamo === 'Civil'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoRamo"
                      value="Civil"
                      checked={tipoRamo === 'Civil'}
                      onChange={() => setTipoRamo('Civil')}
                      className="sr-only"
                    />
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center shrink-0">
                      {tipoRamo === 'Civil' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                    </div>
                    <div>
                      <span className="font-black text-xs block">Cámara Civil</span>
                      <span className="text-[10px] text-slate-500">Juzgados y Salas de Paz, Civil, Familia y Trabajo</span>
                    </div>
                  </label>

                  {/* Opción Cámara Amparos */}
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      tipoRamo === 'Amparos'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoRamo"
                      value="Amparos"
                      checked={tipoRamo === 'Amparos'}
                      onChange={() => setTipoRamo('Amparos')}
                      className="sr-only"
                    />
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center shrink-0">
                      {tipoRamo === 'Amparos' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                    </div>
                    <div>
                      <span className="font-black text-xs block">Cámara Amparos</span>
                      <span className="text-[10px] text-slate-500">Juzgados y Salas de Amparos y Antejuicios</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Fechas de Adecuaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha Inicio de Adecuaciones <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={fechaInicioAdecuaciones}
                    onChange={(e) => setFechaInicioAdecuaciones(e.target.value)}
                    className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-800 ${
                      formErrors.fechaInicioAdecuaciones ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.fechaInicioAdecuaciones && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">{formErrors.fechaInicioAdecuaciones}</p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha Final de Adecuaciones <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={fechaFinAdecuaciones}
                    onChange={(e) => setFechaFinAdecuaciones(e.target.value)}
                    className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-800 ${
                      formErrors.fechaFinAdecuaciones ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.fechaFinAdecuaciones && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">{formErrors.fechaFinAdecuaciones}</p>
                  )}
                </div>
              </div>

              {/* Campos tipo lista: Si / No para Equipamiento */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Infraestructura y Equipamiento Tecnológico
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Equipo de Cómputo */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-slate-500" />
                      Equipo de Cómputo
                    </label>
                    <select
                      value={equipoComputo}
                      onChange={(e) => setEquipoComputo(e.target.value as 'Si' | 'No')}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-800"
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {/* Equipo de Audio */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                      Equipo de Audio
                    </label>
                    <select
                      value={equipoAudio}
                      onChange={(e) => setEquipoAudio(e.target.value as 'Si' | 'No')}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-800"
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {/* Cableado Estructurado */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-slate-500" />
                      Cableado Estructurado
                    </label>
                    <select
                      value={cableadoEstructurado}
                      onChange={(e) => setCableadoEstructurado(e.target.value as 'Si' | 'No')}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-800"
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {/* Enlace de Datos */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-slate-500" />
                      Enlace de Datos
                    </label>
                    <select
                      value={enlaceDatos}
                      onChange={(e) => setEnlaceDatos(e.target.value as 'Si' | 'No')}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-800"
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Estatus y Fecha (Requisito Solicitado) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                {/* Estatus */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-blue-900" />
                    Estatus <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="select-estado-inauguracion"
                    value={estadoInauguracion}
                    onChange={(e) => setEstadoInauguracion(e.target.value as EstadoInauguracionJudicatura)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-800"
                  >
                    {estatusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Estatus actual de la judicatura
                  </span>
                </div>

                {/* Fecha */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      Fecha
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.2 rounded">
                      Opcional
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={fechaInauguracion}
                      onChange={(e) => setFechaInauguracion(e.target.value)}
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-800 bg-white ${
                        formErrors.fechaInauguracion ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
                      }`}
                    />
                    {fechaInauguracion && (
                      <button
                        type="button"
                        onClick={() => setFechaInauguracion('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        title="Quitar fecha"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  {formErrors.fechaInauguracion ? (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">{formErrors.fechaInauguracion}</p>
                  ) : (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Dejar en blanco si aún no hay fecha estipulada
                    </span>
                  )}
                </div>
              </div>

              {/* Sección de Observaciones: Edición (Permite agregar observaciones) o Creación */}
              {editingJudicatura ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-blue-900" />
                      Observaciones Registradas ({(editingJudicatura.observaciones || []).length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGenerateFicha(editingJudicatura)}
                      className="text-[11px] font-bold text-blue-900 hover:text-blue-950 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Generar y descargar la Ficha Técnica Individual en PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-900" />
                      <span>Generar Ficha PDF</span>
                    </button>
                  </div>

                  {/* Listado de observaciones existentes */}
                  {editingJudicatura.observaciones && editingJudicatura.observaciones.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-200">
                      {editingJudicatura.observaciones.map((obs) => (
                        <div key={obs.id} className="pt-2 first:pt-0 text-[11px]">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span className="text-blue-900">Acción #{obs.numeroAccion}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{formatDateTime(obs.fecha)}</span>
                          </div>
                          <p className="text-slate-800 mt-0.5">{obs.texto}</p>
                          <span className="text-[9px] text-slate-400 italic">Por: {obs.autor}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No hay observaciones previas registradas.</p>
                  )}

                  {/* Agregar nueva observación en modo edición */}
                  <div className="pt-2.5 border-t border-slate-200 space-y-1.5">
                    <label className="block font-bold text-slate-700 text-xs">
                      Agregar Observación / Acción al Historial
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        value={nuevaObservacionModal}
                        onChange={(e) => setNuevaObservacionModal(e.target.value)}
                        placeholder="Escriba aquí los avances o detalles de la observación para esta judicatura..."
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-800 bg-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddObservationInEdit}
                        disabled={isAddingObsInEdit || !nuevaObservacionModal.trim()}
                        className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl self-end shrink-0 disabled:opacity-50 text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Añadir esta observación ahora al historial"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Añadir</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Nota: También se guardará automáticamente al hacer clic en "Actualizar Ficha".
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Observaciones Iniciales (Acción #1 en el Árbol)
                  </label>
                  <textarea
                    rows={3}
                    value={observacionesIniciales}
                    onChange={(e) => setObservacionesIniciales(e.target.value)}
                    placeholder="Ingrese los detalles iniciales del proyecto de inauguración..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:outline-none"
                  />
                </div>
              )}

              {/* Botones del Formulario */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2.5">
                {editingJudicatura ? (
                  <button
                    type="button"
                    onClick={() => handleGenerateFicha(editingJudicatura)}
                    className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    title="Generar Ficha Técnica Oficial de la Judicatura (PDF)"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-900" />
                    <span>Generar Ficha</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>{editingJudicatura ? 'Actualizar Ficha' : 'Guardar Judicatura'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VISTA DETALLE DE FICHA Y ÁRBOL CRONOLÓGICO DE ACCIONES          */}
      {/* ========================================================================= */}
      {activeDetailJudicatura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Cabecera del Detalle */}
            <div className="p-5 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/20">
                  <GitBranch className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        activeDetailJudicatura.tipoRamo === 'Penal'
                          ? 'bg-purple-900/80 text-purple-200 border border-purple-400/40'
                          : activeDetailJudicatura.tipoRamo === 'Civil'
                          ? 'bg-blue-900/80 text-blue-200 border border-blue-400/40'
                          : 'bg-emerald-900/80 text-emerald-200 border border-emerald-400/40'
                      }`}
                    >
                      {activeDetailJudicatura.tipoRamo === 'Penal' ? 'Cámara Penal' : activeDetailJudicatura.tipoRamo === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos'}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">
                      Inauguración: {formatDate(activeDetailJudicatura.fechaInauguracion)}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight mt-1">
                    {activeDetailJudicatura.nombreJudicatura}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailJudicaturaId(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con Scroll */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Tarjeta de Resumen de la Ficha */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Resumen Técnico de la Judicatura
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateFicha(activeDetailJudicatura)}
                      className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Generar y descargar la Ficha Técnica Oficial en PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Generar Ficha PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBoletaJudicatura(activeDetailJudicatura)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Generar e imprimir Boleta Oficial de Control Judicaturas"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-amber-300" />
                      <span>Boleta de Control Judicaturas</span>
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenEdit(activeDetailJudicatura);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-700 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-800" />
                        <span>Editar</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Adecuaciones Inicio</span>
                    <span className="font-semibold text-slate-900">{formatDate(activeDetailJudicatura.fechaInicioAdecuaciones)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Adecuaciones Fin</span>
                    <span className="font-semibold text-slate-900">{formatDate(activeDetailJudicatura.fechaFinAdecuaciones)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Estatus e Inauguración</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`px-2 py-0.2 rounded text-[10px] font-black border uppercase ${
                          (activeDetailJudicatura.estadoInauguracion || (activeDetailJudicatura.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')) === 'Inaugurado'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : (activeDetailJudicatura.estadoInauguracion || (activeDetailJudicatura.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')) === 'Reprogramado'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {activeDetailJudicatura.estadoInauguracion || (activeDetailJudicatura.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')}
                      </span>
                      {activeDetailJudicatura.fechaInauguracion ? (
                        <span className="font-bold text-blue-950 flex items-center gap-1">
                          <Flag className="w-3 h-3 text-amber-500" />
                          {formatDate(activeDetailJudicatura.fechaInauguracion)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Por definir</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Cámara</span>
                    <span className="font-bold text-slate-900">
                      {activeDetailJudicatura.tipoRamo === 'Penal' ? 'Cámara Penal' : activeDetailJudicatura.tipoRamo === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos'}
                    </span>
                  </div>
                </div>

                {/* Resumen de equipamiento */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                    <span className="text-slate-600 font-medium">Cómputo</span>
                    <span className={`font-black px-1.5 py-0.2 rounded text-[10px] ${activeDetailJudicatura.equipoComputo === 'Si' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {activeDetailJudicatura.equipoComputo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                    <span className="text-slate-600 font-medium">Audio</span>
                    <span className={`font-black px-1.5 py-0.2 rounded text-[10px] ${activeDetailJudicatura.equipoAudio === 'Si' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {activeDetailJudicatura.equipoAudio}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                    <span className="text-slate-600 font-medium">Cableado</span>
                    <span className={`font-black px-1.5 py-0.2 rounded text-[10px] ${activeDetailJudicatura.cableadoEstructurado === 'Si' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {activeDetailJudicatura.cableadoEstructurado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                    <span className="text-slate-600 font-medium">Enlace</span>
                    <span className={`font-black px-1.5 py-0.2 rounded text-[10px] ${activeDetailJudicatura.enlaceDatos === 'Si' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {activeDetailJudicatura.enlaceDatos}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN ÁRBOL CRONOLÓGICO DE ACCIONES Y OBSERVACIONES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-blue-900" />
                      Árbol Cronológico de Acciones ({activeDetailJudicatura.observaciones?.length || 0})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Historial inmutable de avances, intervenciones y resoluciones técnicas
                    </p>
                  </div>
                </div>

                {/* Formulario para Añadir Nueva Observación al Árbol */}
                <form onSubmit={handleAddObservation} className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200 space-y-2.5">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5 text-blue-800" />
                    Registrar Acción #{((activeDetailJudicatura.observaciones?.length || 0) + 1)}
                  </span>
                  <textarea
                    rows={2}
                    value={nuevaObservacionTexto}
                    onChange={(e) => setNuevaObservacionTexto(e.target.value)}
                    placeholder="Describa la acción técnica realizada, prueba de enlace, entrega de equipo o novedad..."
                    className="w-full p-2.5 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:outline-none text-xs"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Registrando como: <strong>{currentUser?.nombreCompleto || currentUser?.username || 'Operador GIT'}</strong>
                    </span>
                    <button
                      type="submit"
                      disabled={isAddingObs || !nuevaObservacionTexto.trim()}
                      className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isAddingObs ? 'Registrando...' : 'Agregar al Árbol'}</span>
                    </button>
                  </div>
                </form>

                {/* Representación Gráfica del Árbol (Timeline) */}
                {(!activeDetailJudicatura.observaciones || activeDetailJudicatura.observaciones.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs text-slate-600">No hay acciones registradas en el árbol</p>
                    <p className="text-[10px] mt-0.5">Use el formulario superior para registrar la primera acción.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-gradient-to-b before:from-blue-600 before:via-indigo-400 before:to-slate-300">
                    {activeDetailJudicatura.observaciones.map((obs, idx) => (
                      <div key={obs.id || idx} className="relative group">
                        {/* Nodo del Árbol */}
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-900 border-2 border-white shadow-md flex items-center justify-center text-white text-[9px] font-mono font-black z-10 group-hover:scale-110 transition-transform">
                          {obs.numeroAccion}
                        </div>

                        {/* Tarjeta de la Rama */}
                        <div className="bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl p-3.5 transition-all shadow-2xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200 text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className="font-black px-2 py-0.5 rounded bg-blue-900 text-white">
                                Acción #{obs.numeroAccion}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {obs.autor || 'Operador GIT'}
                              </span>
                            </div>
                            <span className="font-mono text-slate-500">
                              {formatDateTime(obs.fecha)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 mt-2 leading-relaxed whitespace-pre-wrap">
                            {obs.texto}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pie del Detalle */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDetailJudicaturaId(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONSULTA DE CONFIRMACIÓN: "¿Está seguro de eliminar?"            */}
      {/* ========================================================================= */}
      {deleteConfirmJudicatura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-200">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  ¿Está seguro de eliminar?
                </h3>
                <span className="text-[11px] font-bold text-rose-700 uppercase">
                  Acción irreversible
                </span>
              </div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 text-xs text-slate-800 space-y-1.5">
              <p className="font-semibold text-slate-900">
                Judicatura por remover:
              </p>
              <p className="font-bold text-blue-950 text-sm">
                {deleteConfirmJudicatura.nombreJudicatura}
              </p>
              <p className="text-[11px] text-slate-600">
                Cámara: <strong>{deleteConfirmJudicatura.tipoRamo === 'Penal' ? 'Cámara Penal' : deleteConfirmJudicatura.tipoRamo === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos'}</strong> • Estatus: <strong>{deleteConfirmJudicatura.estadoInauguracion || (deleteConfirmJudicatura.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')}</strong> • Inauguración: <strong>{deleteConfirmJudicatura.fechaInauguracion ? formatDate(deleteConfirmJudicatura.fechaInauguracion) : 'Por definir'}</strong>
              </p>
              <p className="text-[10px] text-rose-800 mt-2 font-medium">
                Esta acción removerá definitivamente la judicatura y todo su árbol de acciones registradas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmJudicatura(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmJudicatura)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL OFICIAL: REPORTE CONSOLIDADO EN PDF (TABLA, ESTADO Y GANTT)        */}
      {/* ========================================================================= */}
      <ConsolidatedJudicaturasPdfModal
        isOpen={isConsolidatedPdfModalOpen}
        onClose={() => setIsConsolidatedPdfModalOpen(false)}
        allJudicaturas={judicaturas}
        filteredJudicaturas={filteredJudicaturas}
        currentUser={currentUser}
        filterInfo={{
          search: searchTerm.trim() || undefined,
          ramo: ramoFilter !== 'Todos' ? ramoFilter : undefined,
          equipamiento: equipamientoFilter !== 'Todos' ? equipamientoFilter : undefined,
          estadoInauguracion: estatusInauguracionFilter !== 'Todos' ? estatusInauguracionFilter : undefined,
        }}
      />

      {/* ========================================================================= */}
      {/* BOLETA OFICIAL DE CONTROL JUDICATURAS (MODAL INSTITUCIONAL)              */}
      {/* ========================================================================= */}
      {selectedBoletaJudicatura && (
        <BoletaJudicaturasModal
          judicatura={selectedBoletaJudicatura}
          onClose={() => setSelectedBoletaJudicatura(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL OFICIAL: IMPORTACIÓN DE JUDICATURAS DESDE EXCEL / CSV              */}
      {/* ========================================================================= */}
      <ImportJudicaturasModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
