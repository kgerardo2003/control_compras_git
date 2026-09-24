import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { JudicaturaRecord, JudicaturaObservacion, EstadoInauguracionJudicatura } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';
import { generateJudicaturasPDF, generateConsolidatedJudicaturasPDF } from '../utils/judicaturasPdfExport';
import { ConsolidatedJudicaturasPdfModal } from './ConsolidatedJudicaturasPdfModal';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
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
  ArrowUpRight
} from 'lucide-react';

export const JudicaturasView: React.FC = () => {
  const {
    judicaturas,
    addJudicatura,
    updateJudicatura,
    deleteJudicatura,
    addJudicaturaObservacion,
    currentUser,
    showToast,
    forceSyncToProductionDatabase
  } = useApp();

  // Filtros y Vista (por defecto 'table' / listado como solicitó el usuario)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'todos' | 'nombre' | 'ramo' | 'observaciones'>('todos');
  const [ramoFilter, setRamoFilter] = useState<'Todos' | 'Penal' | 'Civil'>('Todos');
  const [equipamientoFilter, setEquipamientoFilter] = useState<'Todos' | 'Completo' | 'Pendiente'>('Todos');
  const [estatusInauguracionFilter, setEstatusInauguracionFilter] = useState<'Todos' | 'Inaugurado' | 'Pendiente Fecha' | 'Reprogramado'>('Todos');
  const [durationFilter, setDurationFilter] = useState<'Todos' | '<=30' | '31-60' | '>60'>('Todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'gantt'>('table');
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

  // Form Fields (Cámara Penal y Cámara Paz Civil)
  const [nombreJudicatura, setNombreJudicatura] = useState('');
  const [tipoRamo, setTipoRamo] = useState<'Penal' | 'Civil'>('Penal');
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

  // Nueva Observación para Ficha Detalle
  const [nuevaObservacionTexto, setNuevaObservacionTexto] = useState('');
  const [isAddingObs, setIsAddingObs] = useState(false);

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
          const camaraName = j.tipoRamo === 'Penal' ? 'cámara penal penal' : 'cámara paz civil civil';
          matchSearch = camaraName.includes(searchLower);
        } else if (searchField === 'observaciones') {
          matchSearch = Boolean(j.observaciones && j.observaciones.some(o => o.texto.toLowerCase().includes(searchLower)));
        } else {
          // Todos los campos
          const camaraName = j.tipoRamo === 'Penal' ? 'cámara penal penal' : 'cámara paz civil civil';
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

    let inauguradosCount = 0;
    let pendienteFechaCount = 0;
    let reprogramadosCount = 0;

    judicaturas.forEach(j => {
      const st = j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');
      if (st === 'Inaugurado') inauguradosCount++;
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

    // 1. Gráfica Circular de Estatus de Inauguración
    const chartEstatusInauguracion = [
      { name: 'Inaugurado', value: inauguradosCount, color: '#059669', porcentaje: total > 0 ? Math.round((inauguradosCount / total) * 100) : 0 },
      { name: 'Pendiente Fecha', value: pendienteFechaCount, color: '#d97706', porcentaje: total > 0 ? Math.round((pendienteFechaCount / total) * 100) : 0 },
      { name: 'Reprogramado', value: reprogramadosCount, color: '#dc2626', porcentaje: total > 0 ? Math.round((reprogramadosCount / total) * 100) : 0 },
    ].filter(item => item.value > 0);

    // 2. Gráfica Circular de Cámaras
    const chartCamaras = [
      { name: 'Cámara Penal', value: penal, color: '#7c3aed', porcentaje: total > 0 ? Math.round((penal / total) * 100) : 0 },
      { name: 'Cámara Paz Civil', value: civil, color: '#2563eb', porcentaje: total > 0 ? Math.round((civil / total) * 100) : 0 },
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
      inauguradosCount,
      pendienteFechaCount,
      reprogramadosCount,
      equipamiento100,
      equipamientoParcial,
      sinEquipar,
      proximas,
      chartEstatusInauguracion,
      chartCamaras,
      chartEquipamiento
    };
  }, [judicaturas]);

  // Dashboard de Rendimiento Operativo: Métricas de Tiempo Promedio de Ejecución de Adecuaciones y Plazos
  const performanceMetrics = useMemo(() => {
    let totalDurationDays = 0;
    let countWithDates = 0;

    let penalDurationDays = 0;
    let penalCount = 0;

    let civilDurationDays = 0;
    let civilCount = 0;

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
          } else {
            civilDurationDays += diffDays;
            civilCount++;
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
    const avgGapDays = countWithInauguration > 0 ? Math.round(totalGapDays / countWithInauguration) : 0;
    const completionPct = countWithDates > 0 ? Math.round((completedAdecuacionesCount / countWithDates) * 100) : 0;

    return {
      avgDays,
      penalAvgDays,
      civilAvgDays,
      penalCount,
      civilCount,
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
    setFormErrors({});
    setIsFormModalOpen(true);
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

  // Generación y exportación de informe consolidado en PDF (Descarga Directa)
  const handleQuickExportPDF = () => {
    setIsExportingPdf(true);
    try {
      const filename = generateConsolidatedJudicaturasPDF({
        judicaturas: filteredJudicaturas,
        title: 'REPORTE CONSOLIDADO DE CONTROL DE JUDICATURAS POR INAUGURAR',
        subtitle: 'Gerencia de Informática • Seguimiento de Adecuaciones, Infraestructura TIC e Hitos de Apertura',
        includeTable: true,
        includeGantt: true,
        includeStatusMatrix: true,
        filterInfo: {
          search: searchTerm.trim() || undefined,
          ramo: ramoFilter !== 'Todos' ? ramoFilter : undefined,
          equipamiento: equipamientoFilter !== 'Todos' ? equipamientoFilter : undefined,
          estadoInauguracion: estatusInauguracionFilter !== 'Todos' ? estatusInauguracionFilter : undefined,
        },
        currentUser,
        filenamePrefix: 'Reporte_Consolidado_Judicaturas_OJ'
      });
      showToast({
        title: 'Reporte Consolidado Descargado con Éxito',
        message: `Se descargó "${filename}" con la tabla, estado y diagrama de Gantt.`,
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <div className="pt-2 border-t border-white/10 text-[10px] text-slate-300 flex items-center justify-between font-mono">
              <span className="text-purple-300">Pen: {performanceMetrics.penalAvgDays}d</span>
              <span>•</span>
              <span className="text-blue-300">Civ: {performanceMetrics.civilAvgDays}d</span>
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

          {/* KPI 3: Cámara Paz Civil */}
          <div className="bg-blue-900/30 backdrop-blur-md rounded-xl p-3.5 border border-blue-500/30 hover:border-blue-500/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-200 text-[11px] font-bold uppercase tracking-wider">
              <span>Cámara Paz Civil</span>
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

      {/* SECCIÓN DE INDICADORES: TARJETAS EJECUTIVAS Y GRÁFICAS CIRCULARES */}
      <div className="space-y-4">
        {/* Fila 1: Tarjetas de Métricas Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Judicaturas</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.total}</span>
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Registradas en sistema</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Inaugurados</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-950 font-mono">{stats.inauguradosCount}</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">Activas</span>
            </div>
            <span className="text-[10px] text-emerald-600 mt-1 block">Sedes inauguradas</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Pendiente Fecha</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-950 font-mono">{stats.pendienteFechaCount}</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[10px] text-amber-600 mt-1 block">Fecha por definir</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Reprogramados</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-rose-950 font-mono">{stats.reprogramadosCount}</span>
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-[10px] text-rose-600 mt-1 block">Apertura calendarizada</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block">Equipamiento 100%</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-teal-950 font-mono">{stats.equipamiento100}</span>
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-[10px] text-teal-600 mt-1 block">4 ítems listos</span>
          </div>
        </div>

        {/* Fila 2: Panel de Gráficas Circulares de Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gráfica Circular 1: Estatus de Inauguración */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                Estatus de Inauguración
              </span>
              <span className="text-[10px] font-bold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {stats.total} total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Distribución porcentual por etapa de apertura de sedes
            </p>

            <div className="h-44 relative flex items-center justify-center">
              {stats.total > 0 && stats.chartEstatusInauguracion.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.chartEstatusInauguracion}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.chartEstatusInauguracion.map((entry, index) => (
                        <Cell key={`cell-estatus-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [`${val} Judicatura${Number(val) === 1 ? '' : 's'}`, name]}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs italic">Sin registros de judicaturas</div>
              )}
              {stats.total > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-black font-mono text-slate-900 leading-none">
                    {stats.total}
                  </span>
                  <span className="text-[8px] font-bold uppercase text-slate-500 mt-0.5">
                    Judicaturas
                  </span>
                </div>
              )}
            </div>

            {/* Leyenda interactiva con filtros directos */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              {[
                { name: 'Inaugurado', count: stats.inauguradosCount, color: '#059669', bgBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                { name: 'Pendiente Fecha', count: stats.pendienteFechaCount, color: '#d97706', bgBadge: 'bg-amber-50 text-amber-800 border-amber-200' },
                { name: 'Reprogramado', count: stats.reprogramadosCount, color: '#dc2626', bgBadge: 'bg-rose-50 text-rose-800 border-rose-200' },
              ].map((item) => {
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setEstatusInauguracionFilter(estatusInauguracionFilter === item.name ? 'Todos' : (item.name as any));
                      setCurrentPage(1);
                    }}
                    className={`w-full p-1.5 rounded-lg flex items-center justify-between transition-colors text-left cursor-pointer ${
                      estatusInauguracionFilter === item.name ? 'bg-blue-50 ring-1 ring-blue-800' : 'hover:bg-slate-50'
                    }`}
                    title={`Filtrar por ${item.name}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-semibold text-slate-700 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400">{pct}%</span>
                      <span className={`text-[10px] font-black font-mono px-1.5 py-0.2 rounded border ${item.bgBadge}`}>
                        {item.count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gráfica Circular 2: Distribución por Cámara */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-purple-600" />
                Cámara Jurisdiccional
              </span>
              <span className="text-[10px] font-bold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                2 Ramos
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Proporción de sedes por competencia penal y civil
            </p>

            <div className="h-44 relative flex items-center justify-center">
              {stats.total > 0 && stats.chartCamaras.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.chartCamaras}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.chartCamaras.map((entry, index) => (
                        <Cell key={`cell-camara-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [`${val} Judicatura${Number(val) === 1 ? '' : 's'}`, name]}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs italic">Sin datos de cámaras</div>
              )}
              {stats.total > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-black font-mono text-purple-950 leading-none">
                    {stats.penal} / {stats.civil}
                  </span>
                  <span className="text-[8px] font-bold uppercase text-slate-500 mt-0.5">
                    Penal / Civil
                  </span>
                </div>
              )}
            </div>

            {/* Leyenda de Cámaras */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              {[
                { name: 'Cámara Penal', id: 'Penal', count: stats.penal, color: '#7c3aed', bgBadge: 'bg-purple-50 text-purple-800 border-purple-200' },
                { name: 'Cámara Paz Civil', id: 'Civil', count: stats.civil, color: '#2563eb', bgBadge: 'bg-blue-50 text-blue-800 border-blue-200' },
              ].map((item) => {
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setRamoFilter(ramoFilter === item.id ? 'Todos' : (item.id as any));
                      setCurrentPage(1);
                    }}
                    className={`w-full p-1.5 rounded-lg flex items-center justify-between transition-colors text-left cursor-pointer ${
                      ramoFilter === item.id ? 'bg-blue-50 ring-1 ring-blue-800' : 'hover:bg-slate-50'
                    }`}
                    title={`Filtrar por ${item.name}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-semibold text-slate-700 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400">{pct}%</span>
                      <span className={`text-[10px] font-black font-mono px-1.5 py-0.2 rounded border ${item.bgBadge}`}>
                        {item.count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gráfica Circular 3: Avance de Infraestructura TIC */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-teal-600" />
                Infraestructura TIC
              </span>
              <span className="text-[10px] font-bold text-teal-700 font-mono bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                {stats.total > 0 ? Math.round((stats.equipamiento100 / stats.total) * 100) : 0}% al 100%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Cumplimiento de 4 componentes (PC, Audio, Red, Enlace)
            </p>

            <div className="h-44 relative flex items-center justify-center">
              {stats.total > 0 && stats.chartEquipamiento.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.chartEquipamiento}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.chartEquipamiento.map((entry, index) => (
                        <Cell key={`cell-equip-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [`${val} Judicatura${Number(val) === 1 ? '' : 's'}`, name]}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs italic">Sin datos de infraestructura</div>
              )}
              {stats.total > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-black font-mono text-teal-900 leading-none">
                    {stats.equipamiento100}
                  </span>
                  <span className="text-[8px] font-bold uppercase text-slate-500 mt-0.5">
                    100% TIC
                  </span>
                </div>
              )}
            </div>

            {/* Leyenda de Infraestructura */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              {[
                { name: '100% Equipado (4/4)', id: 'Completo', count: stats.equipamiento100, color: '#0d9488', bgBadge: 'bg-teal-50 text-teal-800 border-teal-200' },
                { name: 'Parcial (1 a 3 ítems)', id: 'Pendiente', count: stats.equipamientoParcial, color: '#f59e0b', bgBadge: 'bg-amber-50 text-amber-800 border-amber-200' },
                { name: 'Sin Equipar (0 ítems)', id: 'Pendiente', count: stats.sinEquipar, color: '#64748b', bgBadge: 'bg-slate-100 text-slate-700 border-slate-200' },
              ].map((item, idx) => {
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <button
                    key={`equip-item-${idx}`}
                    type="button"
                    onClick={() => {
                      setEquipamientoFilter(equipamientoFilter === item.id ? 'Todos' : (item.id as any));
                      setCurrentPage(1);
                    }}
                    className={`w-full p-1.5 rounded-lg flex items-center justify-between transition-colors text-left cursor-pointer ${
                      equipamientoFilter === item.id ? 'bg-blue-50 ring-1 ring-blue-800' : 'hover:bg-slate-50'
                    }`}
                    title={`Filtrar judicaturas con equipamiento ${item.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-semibold text-slate-700 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400">{pct}%</span>
                      <span className={`text-[10px] font-black font-mono px-1.5 py-0.2 rounded border ${item.bgBadge}`}>
                        {item.count}
                      </span>
                    </div>
                  </button>
                );
              })}
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
          {/* Estatus de Inauguración */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'Todos', label: 'Todos los Estatus' },
              { id: 'Inaugurado', label: 'Inaugurado' },
              { id: 'Pendiente Fecha', label: 'Pendiente Fecha' },
              { id: 'Reprogramado', label: 'Reprogramado' }
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
              { id: 'Civil', label: 'Cámara Paz Civil' }
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
                {ramoFilter === 'Penal' ? 'Cámara Penal' : 'Cámara Paz Civil'}
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
      {/* VISTA 1: LISTADO INSTITUCIONAL TIPO "CONTROL DE ADQUISICIONES RECIENTES"   */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          {/* Cabecera del Listado */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase sticky top-0 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Nombre de la Judicatura</th>
                  <th className="px-4 py-3">Cámara Asignada</th>
                  <th className="px-4 py-3">Período de Adecuaciones</th>
                  <th className="px-3 py-3 text-center" title="Equipo de Cómputo">PC</th>
                  <th className="px-3 py-3 text-center" title="Equipo de Audio">Audio</th>
                  <th className="px-3 py-3 text-center" title="Cableado de Red Estructurado">Red</th>
                  <th className="px-3 py-3 text-center" title="Enlace de Datos">Enlace</th>
                  <th className="px-4 py-3 text-center">Estatus e Inauguración</th>
                  <th className="px-4 py-3">Última Acción / Bitácora</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedJudicaturas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">
                          {searchTerm.trim()
                            ? `No se encontraron judicaturas que coincidan con "${searchTerm}"`
                            : 'No hay judicaturas registradas con los filtros seleccionados.'}
                        </p>
                        {searchTerm.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setCurrentPage(1);
                            }}
                            className="mt-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Limpiar término de búsqueda
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedJudicaturas.map((j) => {
                    const isAllEquipped =
                      j.equipoComputo === 'Si' &&
                      j.equipoAudio === 'Si' &&
                      j.cableadoEstructurado === 'Si' &&
                      j.enlaceDatos === 'Si';

                    const obsCount = (j.observaciones || []).length;
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

                        {/* 2. Cámara Asignada (Cámara Penal / Cámara Paz Civil) */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {j.tipoRamo === 'Penal' ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-50 text-purple-900 border border-purple-200 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                              Cámara Penal
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-900 border border-blue-200 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                              Cámara Paz Civil
                            </span>
                          )}
                        </td>

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

                        {/* 5. Estatus e Inauguración */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          {(() => {
                            const est = j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');
                            const badgeStyle =
                              est === 'Inaugurado'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
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

                        {/* 6. Última Acción / Observaciones */}
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

                        {/* 7. Acciones: Visualizar, Editar, Eliminar (con consulta "¿Está seguro de eliminar?") */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <div className="inline-flex items-center justify-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                            {/* Visualizar Ficha y Árbol */}
                            <button
                              type="button"
                              onClick={() => setDetailJudicaturaId(j.id)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Visualizar Ficha y Árbol de Acciones"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Editar Judicatura */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(j)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Editar Ficha de Judicatura"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Eliminar Judicatura (Abre confirmación) */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmJudicatura(j)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar Judicatura"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

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
      {/* VISTA 2: TARJETAS DE FICHAS                                               */}
      {/* ========================================================================= */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJudicaturas.map((j) => {
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
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {j.tipoRamo === 'Penal' ? 'Cámara Penal' : 'Cámara Paz Civil'}
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
                        onClick={() => handleOpenEdit(j)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar Ficha"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmJudicatura(j)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar Judicatura"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Estatus e Inauguración</span>
                      <div className="mt-1 flex flex-col gap-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider w-fit ${
                            (j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')) === 'Inaugurado'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
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
                      {/* Cómputo */}
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

                      {/* Audio */}
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

                      {/* Cableado */}
                      <div
                        className={`p-2 rounded-xl border flex items-center justify-between ${
                          j.cableadoEstructurado === 'Si'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Network className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-[11px] font-semibold">Cableado</span>
                        </div>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                            j.cableadoEstructurado === 'Si' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {j.cableadoEstructurado}
                        </span>
                      </div>

                      {/* Enlace */}
                      <div
                        className={`p-2 rounded-xl border flex items-center justify-between ${
                          j.enlaceDatos === 'Si'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Wifi className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-[11px] font-semibold">Enlace Datos</span>
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

                  <button
                    type="button"
                    onClick={() => setDetailJudicaturaId(j.id)}
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-blue-900 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <GitBranch className="w-4 h-4 text-blue-700" />
                    <span>Ver Ficha y Árbol de Acciones ({(j.observaciones || []).length})</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
                <span className="text-slate-700 font-medium">Adecuaciones Cámara Paz Civil</span>
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

              {/* Filas de Judicaturas */}
              <div className="divide-y divide-slate-100">
                {filteredJudicaturas.map((j) => {
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
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {j.tipoRamo === 'Penal' ? 'Cámara Penal' : 'Cámara Paz Civil'}
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
                                    : 'bg-blue-600 hover:bg-blue-700'
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

              {/* Tipo de Ramo: "Cámara Penal" y "Cámara Paz Civil" (Requisito Explícito) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Cámara Asignada <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Opción Cámara Penal */}
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
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
                    <div className="w-4 h-4 rounded-full border-2 border-purple-600 flex items-center justify-center">
                      {tipoRamo === 'Penal' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                    </div>
                    <div>
                      <span className="font-black text-xs block">Cámara Penal</span>
                      <span className="text-[10px] text-slate-500">Juzgados de Paz y Primera Instancia Penal</span>
                    </div>
                  </label>

                  {/* Opción Cámara Paz Civil */}
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
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
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center">
                      {tipoRamo === 'Civil' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                    </div>
                    <div>
                      <span className="font-black text-xs block">Cámara Paz Civil</span>
                      <span className="text-[10px] text-slate-500">Juzgados de Paz, Civil, Familia y Mercantil</span>
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

              {/* Estatus de Inauguración y Fecha de Inauguración (Opcional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                {/* Estatus de Inauguración (Lista Desplegable) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-blue-900" />
                    Estatus de Inauguración <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="select-estado-inauguracion"
                    value={estadoInauguracion}
                    onChange={(e) => setEstadoInauguracion(e.target.value as EstadoInauguracionJudicatura)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-800"
                  >
                    <option value="Pendiente Fecha">Pendiente Fecha</option>
                    <option value="Reprogramado">Reprogramado</option>
                    <option value="Inaugurado">Inaugurado</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Etapa actual del proceso de inauguración
                  </span>
                </div>

                {/* Fecha de Inauguración (Opcional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      Fecha de Inauguración
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

              {/* Observaciones iniciales (solo al crear) */}
              {!editingJudicatura && (
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
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
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
                          : 'bg-blue-900/80 text-blue-200 border border-blue-400/40'
                      }`}
                    >
                      {activeDetailJudicatura.tipoRamo === 'Penal' ? 'Cámara Penal' : 'Cámara Paz Civil'}
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
                      onClick={() => {
                        handleOpenEdit(activeDetailJudicatura);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-700 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-800" />
                      <span>Editar</span>
                    </button>
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
                      {activeDetailJudicatura.tipoRamo === 'Penal' ? 'Cámara Penal' : 'Cámara Paz Civil'}
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
                Cámara: <strong>{deleteConfirmJudicatura.tipoRamo === 'Penal' ? 'Cámara Penal' : 'Cámara Paz Civil'}</strong> • Estatus: <strong>{deleteConfirmJudicatura.estadoInauguracion || (deleteConfirmJudicatura.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha')}</strong> • Inauguración: <strong>{deleteConfirmJudicatura.fechaInauguracion ? formatDate(deleteConfirmJudicatura.fechaInauguracion) : 'Por definir'}</strong>
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
    </div>
  );
};
