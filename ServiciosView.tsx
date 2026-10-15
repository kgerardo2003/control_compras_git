/**
 * @license
 * Módulo Integral: Control, Vigencia y Alertas Tempranas de Servicios Contratados
 * Gerencia de Informática - Organismo Judicial de Guatemala
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ServicioContratado } from '../../types';
import { 
  CATALOGO_AREAS_SERVICIOS, 
  CATALOGO_MODALIDADES_SERVICIOS, 
  CATALOGO_ESTATUS_SERVICIOS 
} from '../../data/initialServiciosData';
import { 
  calcularMetricasServicio, 
  getSemaforoVigenciaVisual, 
  getNivelAlertaGestionVisual 
} from '../../utils/serviciosCalculations';
import { 
  exportServiciosToExcel, 
  exportServiciosToCSV, 
  generateServiciosPDFReport, 
  downloadServiciosImportTemplate 
} from '../../utils/serviciosExport';
import { ServiciosGanttView } from './ServiciosGanttView';
import { ServiciosAlertasView } from './ServiciosAlertasView';
import { ServiciosImportModal } from './ServiciosImportModal';
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
  Legend
} from 'recharts';
import {
  Briefcase,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  FileSpreadsheet,
  FileDown,
  Download,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  LayoutDashboard,
  Table,
  Layers,
  Mail,
  Eye,
  Edit3,
  Trash2,
  RefreshCw,
  Sparkles,
  Database,
  Building2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Send,
  X,
  Check,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { canUserDeleteServicio } from '../../utils/rbacUtils';

const COLORS_MODALIDAD = ['#1e3a8a', '#2563eb', '#0284c7', '#0d9488', '#16a34a', '#d97706', '#dc2626'];

export const ServiciosView: React.FC = () => {
  const {
    servicios,
    setServicioToEdit,
    setIsServicioModalOpen,
    setSelectedServicio,
    setIsServicioDetailModalOpen,
    deleteServicio,
    deleteBatchServicios,
    clearAllServicios,
    serviciosAlertCount,
    forceSyncToProductionDatabase,
    currentUser,
    themeConfig
  } = useApp();

  // Pestaña activa dentro del módulo
  const [currentSubTab, setCurrentSubTab] = useState<'dashboard' | 'matriz' | 'gantt' | 'alertas'>('dashboard');

  // Filtros interactivos
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('todas');
  const [filterModalidad, setFilterModalidad] = useState('todas');
  const [filterEstatus, setFilterEstatus] = useState('todos');
  const [filterRiesgo, setFilterRiesgo] = useState('todos');
  const [filterSemaforo, setFilterSemaforo] = useState('todos');

  // Ordenamiento
  const [sortBy, setSortBy] = useState<'diasRestantes' | 'servicio' | 'inicio' | 'fin' | 'area'>('diasRestantes');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Paginación de la matriz
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Estados de modales
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filtrado reactivo de servicios
  const filteredServicios = useMemo(() => {
    return servicios.filter((s) => {
      // Búsqueda por texto en NOG, Proveedor, Nombre del Servicio o Código
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchText = (
          (s.servicioContratado || '').toLowerCase().includes(query) ||
          (s.nogExpediente || '').toLowerCase().includes(query) ||
          (s.proveedorActual || '').toLowerCase().includes(query) ||
          (s.codigo || '').toLowerCase().includes(query) ||
          (s.responsableSeguimiento || '').toLowerCase().includes(query)
        );
        if (!matchText) return false;
      }

      // Filtro de Área
      if (filterArea !== 'todas' && s.area !== filterArea) {
        return false;
      }

      // Filtro de Modalidad
      if (filterModalidad !== 'todas' && s.modalidad !== filterModalidad) {
        return false;
      }

      // Filtro de Estatus Operativo
      if (filterEstatus !== 'todos' && s.estatusActual !== filterEstatus) {
        return false;
      }

      // Filtro de Riesgo
      if (filterRiesgo !== 'todos' && s.riesgoContinuidad !== filterRiesgo) {
        return false;
      }

      // Filtro de Semáforo de Vigencia
      if (filterSemaforo !== 'todos') {
        const m = calcularMetricasServicio(s);
        if (m.semaforoVigencia !== filterSemaforo) {
          return false;
        }
      }

      return true;
    });
  }, [servicios, searchTerm, filterArea, filterModalidad, filterEstatus, filterRiesgo, filterSemaforo]);

  // Ordenamiento de servicios
  const sortedServicios = useMemo(() => {
    return [...filteredServicios].sort((a, b) => {
      const mA = calcularMetricasServicio(a);
      const mB = calcularMetricasServicio(b);

      let comparison = 0;
      if (sortBy === 'diasRestantes') {
        comparison = mA.diasRestantes - mB.diasRestantes;
      } else if (sortBy === 'servicio') {
        comparison = (a.servicioContratado || '').localeCompare(b.servicioContratado || '');
      } else if (sortBy === 'inicio') {
        comparison = (a.inicioVigencia || '').localeCompare(b.inicioVigencia || '');
      } else if (sortBy === 'fin') {
        comparison = (a.finVigencia || '').localeCompare(b.finVigencia || '');
      } else if (sortBy === 'area') {
        comparison = (a.area || '').localeCompare(b.area || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredServicios, sortBy, sortOrder]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(sortedServicios.length / itemsPerPage));
  const paginatedServicios = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedServicios.slice(start, start + itemsPerPage);
  }, [sortedServicios, currentPage]);

  // Cálculos consolidados para el Dashboard Analítico (KPIs)
  const stats = useMemo(() => {
    let vigentes = 0;
    let porVencer = 0;
    let vencidos = 0;
    let alertasActivas = 0; // <= 45d Compra Directa o <= 30d Baja Cuantía o 90/120d Licitación
    let riesgoAlto = 0;
    let riesgoMedio = 0;
    let riesgoBajo = 0;

    const modalidadMap: Record<string, number> = {};
    const areaMap: Record<string, number> = {};

    servicios.forEach((s) => {
      const m = calcularMetricasServicio(s);
      
      if (m.esVencido) {
        vencidos++;
      } else if (m.semaforoVigencia === 'naranja' || m.semaforoVigencia === 'amarillo') {
        porVencer++;
      } else {
        vigentes++;
      }

      if (m.requiereAlertaTemprana || m.esVencido) {
        alertasActivas++;
      }

      if (s.riesgoContinuidad === 'Alto') riesgoAlto++;
      else if (s.riesgoContinuidad === 'Medio') riesgoMedio++;
      else riesgoBajo++;

      const modKey = s.modalidad || 'Otros';
      modalidadMap[modKey] = (modalidadMap[modKey] || 0) + 1;

      const areaKey = s.area || 'Sin Área';
      areaMap[areaKey] = (areaMap[areaKey] || 0) + 1;
    });

    const modalidadData = Object.entries(modalidadMap).map(([name, value]) => ({ name, value }));
    const areaData = Object.entries(areaMap)
      .map(([name, value]) => ({ name, contratos: value }))
      .sort((a, b) => b.contratos - a.contratos);

    return {
      total: servicios.length,
      vigentes,
      porVencer,
      vencidos,
      alertasActivas,
      riesgoAlto,
      riesgoMedio,
      riesgoBajo,
      modalidadData,
      areaData
    };
  }, [servicios]);

  const handleCreateNew = () => {
    setServicioToEdit(null);
    setIsServicioModalOpen(true);
  };

  const handleSyncFirestore = async () => {
    setIsSyncing(true);
    try {
      await forceSyncToProductionDatabase();
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Estados de eliminación y selección interactiva
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemToDelete, setItemToDelete] = useState<ServicioContratado | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Permiso de eliminación
  const canDelete = canUserDeleteServicio(currentUser);

  // Helpers de selección
  const isAllPageSelected = paginatedServicios.length > 0 && paginatedServicios.every(s => selectedIds.includes(s.id));
  const isSomePageSelected = paginatedServicios.some(s => selectedIds.includes(s.id)) && !isAllPageSelected;
  const isAllFilteredSelected = filteredServicios.length > 0 && filteredServicios.every(s => selectedIds.includes(s.id));
  const isSomeFilteredSelected = filteredServicios.some(s => selectedIds.includes(s.id)) && !isAllFilteredSelected;

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedServicios.map(s => s.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...paginatedServicios.map(s => s.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredServicios.map(s => s.id));
      setSelectedIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...filteredServicios.map(s => s.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeletingSingle(true);
    try {
      const targetId = itemToDelete.id;
      await deleteServicio(targetId);
      setSelectedIds(prev => prev.filter(id => id !== targetId));
      setItemToDelete(null);
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingBatch(true);
    try {
      await deleteBatchServicios(selectedIds);
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      await clearAllServicios();
      setSelectedIds([]);
      setIsClearAllModalOpen(false);
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* Cabecera Principal y Barra de Acciones Homogénea en 2 Filas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-md shadow-blue-900/20">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Guatecompras • Gerencia de Informática
                </span>
                <span className="text-[11px] font-bold text-slate-500">v1.2-OJ</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Control, Vigencia y Alertas Tempranas de Servicios Contratados
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Monitoreo proactivo de vencimientos, motor de semáforos, gestión documental de 4 archivos oficiales y despacho automatizado de alertas
              </p>
            </div>
          </div>

          {/* Contador de alertas destacadas */}
          {serviciosAlertCount > 0 && (
            <div 
              onClick={() => setCurrentSubTab('alertas')}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 cursor-pointer hover:bg-rose-100/80 transition-colors shadow-2xs self-start lg:self-auto"
            >
              <div className="p-2 rounded-xl bg-rose-600 text-white animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-900 block">
                  {serviciosAlertCount} Alertas de Vencimiento
                </span>
                <span className="text-[11px] text-rose-700 font-medium">
                  Requieren gestión inmediata de compra →
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Menú de Botones de Acción en 2 Filas Homogéneas */}
        <div className="space-y-2.5">
          {/* Fila 1: Gestión y Reportes Oficiales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              id="btn-nuevo-servicio-contratado"
              type="button"
              onClick={handleCreateNew}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nuevo Servicio Contratado</span>
            </button>

            <button
              id="btn-exportar-excel-servicios"
              type="button"
              onClick={() => exportServiciosToExcel(filteredServicios)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              id="btn-exportar-csv-servicios"
              type="button"
              onClick={() => exportServiciosToCSV(filteredServicios)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-blue-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              id="btn-reporte-pdf-servicios"
              type="button"
              onClick={() => generateServiciosPDFReport(filteredServicios, currentUser)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Reporte Oficial PDF</span>
            </button>
          </div>

          {/* Fila 2: Operaciones de Datos, Sincronización y Limpieza */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              id="btn-importar-excel-servicios"
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Importar (Excel/CSV)</span>
            </button>

            <button
              id="btn-plantilla-excel-servicios"
              type="button"
              onClick={downloadServiciosImportTemplate}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Plantilla Vacía</span>
            </button>

            <button
              id="btn-sync-servicios-bd"
              type="button"
              onClick={handleSyncFirestore}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-blue-700 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar BD'}</span>
            </button>

            {/* Botón de Vaciar / Limpiar Módulo */}
            {canDelete && (
              <button
                id="btn-vaciar-servicios"
                type="button"
                disabled={servicios.length === 0}
                onClick={() => setIsClearAllModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer disabled:opacity-40"
                title="Eliminar todos los registros del módulo de Servicios Contratados"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Vaciar Módulo ({servicios.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra Flotante de Acciones en Lote cuando hay servicios seleccionados */}
        {canDelete && selectedIds.length > 0 && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs flex-wrap animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-900 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
              <span>{selectedIds.length} {selectedIds.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer text-xs"
              >
                Deseleccionar
              </button>
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Seleccionados ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Navegación por Sub-Pestañas del Módulo */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setCurrentSubTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            currentSubTab === 'dashboard'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard Analítico (KPIs & Gráficos)</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSubTab('matriz')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            currentSubTab === 'matriz'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Matriz de Contratos & Semáforos ({filteredServicios.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSubTab('gantt')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            currentSubTab === 'gantt'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Cronograma / Vista Gantt Mensualizada</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSubTab('alertas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            currentSubTab === 'alertas'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Centro de Notificaciones & Correo</span>
          {serviciosAlertCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              currentSubTab === 'alertas' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {serviciosAlertCount}
            </span>
          )}
        </button>
      </div>

      {/* Barra de Filtros Dinámicos (Visible en Dashboard y Matriz) */}
      {(currentSubTab === 'dashboard' || currentSubTab === 'matriz' || currentSubTab === 'gantt') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-blue-900" />
              Filtros Dinámicos del Sistema
            </span>
            {(searchTerm || filterArea !== 'todas' || filterModalidad !== 'todas' || filterEstatus !== 'todos' || filterRiesgo !== 'todos' || filterSemaforo !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterArea('todas');
                  setFilterModalidad('todas');
                  setFilterEstatus('todos');
                  setFilterRiesgo('todos');
                  setFilterSemaforo('todos');
                }}
                className="text-xs font-bold text-blue-900 hover:underline cursor-pointer"
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            
            {/* Buscador */}
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar NOG, proveedor, servicio, código..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>

            {/* Filtro Área */}
            <div>
              <select
                value={filterArea}
                onChange={(e) => { setFilterArea(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="todas">Todas las Áreas</option>
                {CATALOGO_AREAS_SERVICIOS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Filtro Modalidad */}
            <div>
              <select
                value={filterModalidad}
                onChange={(e) => { setFilterModalidad(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="todas">Todas las Modalidades</option>
                {CATALOGO_MODALIDADES_SERVICIOS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filtro Estatus */}
            <div>
              <select
                value={filterEstatus}
                onChange={(e) => { setFilterEstatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="todos">Todos los Estatus</option>
                {CATALOGO_ESTATUS_SERVICIOS.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Filtro Semáforo */}
            <div>
              <select
                value={filterSemaforo}
                onChange={(e) => { setFilterSemaforo(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="todos">Todos los Semáforos</option>
                <option value="verde">🟢 Vigentes (&gt;60d)</option>
                <option value="amarillo">🟡 Por Vencer (31-60d)</option>
                <option value="naranja">🟠 Urgentes (1-30d)</option>
                <option value="rojo">🔴 Vencidos (0d)</option>
              </select>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 1: DASHBOARD ANALÍTICO (KPIs & Gráficos)                 */}
      {/* ============================================================== */}
      {currentSubTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Tarjetas de Métricas Ejecutivas (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total de Servicios */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total de Servicios
                </span>
                <span className="text-3xl font-black text-slate-900 font-mono mt-1 block">
                  {stats.total}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Contratos en plataforma</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100">
                <Briefcase className="w-6 h-6" />
              </div>
            </div>

            {/* Vigentes vs Por Vencer vs Vencidos */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Estado de Vigencia Operativa
              </span>
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="text-center">
                  <span className="text-lg font-black text-emerald-600 block">{stats.vigentes}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Vigentes</span>
                </div>
                <div className="text-center">
                  <span className="text-lg font-black text-amber-500 block">{stats.porVencer}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Por Vencer</span>
                </div>
                <div className="text-center">
                  <span className="text-lg font-black text-rose-600 block">{stats.vencidos}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Vencidos</span>
                </div>
              </div>
            </div>

            {/* Alertas Activas de Compra */}
            <div 
              onClick={() => setCurrentSubTab('alertas')}
              className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-xs flex items-center justify-between cursor-pointer hover:bg-rose-100/60 transition-colors"
            >
              <div>
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider block">
                  Alertas Activas de Compra
                </span>
                <span className="text-3xl font-black text-rose-700 font-mono mt-1 block">
                  {stats.alertasActivas}
                </span>
                <span className="text-[11px] text-rose-800 font-medium">Umbral 45d / 30d Guatecompras</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            {/* Distribución por Nivel de Riesgo */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Impacto de Continuidad
              </span>
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="text-center">
                  <span className="text-lg font-black text-rose-700 block">{stats.riesgoAlto}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Alto</span>
                </div>
                <div className="text-center">
                  <span className="text-lg font-black text-amber-600 block">{stats.riesgoMedio}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Medio</span>
                </div>
                <div className="text-center">
                  <span className="text-lg font-black text-emerald-600 block">{stats.riesgoBajo}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Bajo</span>
                </div>
              </div>
            </div>

          </div>

          {/* Gráficos Ejecutivos: Gráfico 1 (Modalidad) vs Gráfico 2 (Área) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Gráfico 1: Distribución por Modalidad de Contratación (Donut Chart) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              <div className="border-b border-slate-100 pb-3 mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Distribución por Modalidad de Contratación
                </h3>
                <p className="text-[11px] text-slate-500">
                  Compra Directa, Baja Cuantía, Cotización, Licitación, etc.
                </p>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                {stats.modalidadData.length === 0 ? (
                  <span className="text-xs text-slate-400">Sin datos para graficar</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.modalidadData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.modalidadData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS_MODALIDAD[index % COLORS_MODALIDAD.length]} 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(val: any, name: any) => [`${val} contratos`, name]}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Leyenda de Modalidades */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100 text-[10px]">
                {stats.modalidadData.map((item, idx) => (
                  <span key={item.name} className="inline-flex items-center gap-1 font-semibold text-slate-700">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: COLORS_MODALIDAD[idx % COLORS_MODALIDAD.length] }} 
                    />
                    {item.name} ({item.value})
                  </span>
                ))}
              </div>
            </div>

            {/* Gráfico 2: Carga de Contratos por Área / Departamento (Barras Horizontales) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              <div className="border-b border-slate-100 pb-3 mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Carga de Servicios por Área / Departamento
                </h3>
                <p className="text-[11px] text-slate-500">
                  Volumen de servicios gestionados por cada unidad técnica de la Gerencia de Informática
                </p>
              </div>

              <div className="h-64 w-full">
                {stats.areaData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Sin datos para graficar
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.areaData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#334155' }} 
                        width={130}
                      />
                      <RechartsTooltip 
                        formatter={(val: any) => [`${val} contratos`, 'Total']}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Bar 
                        dataKey="contratos" 
                        fill="#1e3a8a" 
                        radius={[0, 8, 8, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: MATRIZ / TABLA INTERACTIVA                            */}
      {/* ============================================================== */}
      {currentSubTab === 'matriz' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Matriz de Control y Semáforos de Servicios Contratados
              </h3>
              <p className="text-[11px] text-slate-500">
                Mostrando {paginatedServicios.length} de {filteredServicios.length} servicios registrados
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Ordenar por:</span>
              <button
                type="button"
                onClick={() => toggleSort('diasRestantes')}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 cursor-pointer ${
                  sortBy === 'diasRestantes' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                <span>Días Restantes</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => toggleSort('servicio')}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 cursor-pointer ${
                  sortBy === 'servicio' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                <span>Nombre</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* TABLA ESCRITORIO (md: y superior) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  {canDelete && (
                    <th className="py-3 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        ref={el => {
                          if (el) el.indeterminate = isSomePageSelected;
                        }}
                        onChange={toggleSelectPage}
                        title={isAllPageSelected ? "Deseleccionar servicios de esta página" : "Seleccionar servicios de esta página"}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-3 px-3.5">Código / NOG</th>
                  <th className="py-3 px-3.5">Servicio Contratado</th>
                  <th className="py-3 px-3.5">Área / Depto</th>
                  <th className="py-3 px-3.5">Modalidad</th>
                  <th className="py-3 px-3.5">Proveedor Actual</th>
                  <th className="py-3 px-3.5">Vigencia</th>
                  <th className="py-3 px-3.5 text-center">Días Restantes</th>
                  <th className="py-3 px-3.5">Semáforo 1 (Vigencia)</th>
                  <th className="py-3 px-3.5">Semáforo 2 (Alerta Gestión)</th>
                  <th className="py-3 px-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedServicios.length === 0 ? (
                  <tr>
                    <td colSpan={canDelete ? 11 : 10} className="py-12 text-center text-slate-400">
                      No se encontraron servicios que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  paginatedServicios.map((s) => {
                    const metricas = calcularMetricasServicio(s);
                    const semaforoV = getSemaforoVigenciaVisual(metricas.semaforoVigencia);
                    const semaforoG = getNivelAlertaGestionVisual(metricas.nivelAlertaGestion);
                    const isSelected = selectedIds.includes(s.id);

                    return (
                      <tr 
                        key={s.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Checkbox de Selección */}
                        {canDelete && (
                          <td className="py-3 px-3 text-center align-top">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(s.id)}
                              aria-label={`Seleccionar servicio ${s.codigo}`}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* Código y NOG */}
                        <td className="py-3 px-3.5 align-top">
                          <span className="font-mono font-bold text-slate-900 block">{s.codigo}</span>
                          <span className="font-mono text-[10px] text-slate-500">NOG: {s.nogExpediente}</span>
                        </td>

                        {/* Servicio */}
                        <td className="py-3 px-3.5 align-top max-w-[280px]">
                          <span className="font-bold text-slate-900 block line-clamp-2" title={s.servicioContratado}>
                            {s.servicioContratado}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                            Resp: {s.responsableSeguimiento}
                          </span>
                        </td>

                        {/* Área */}
                        <td className="py-3 px-3.5 align-top">
                          <span className="font-semibold text-slate-800 block">{s.area}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                            {s.departamento || 'GIT'}
                          </span>
                        </td>

                        {/* Modalidad */}
                        <td className="py-3 px-3.5 align-top">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px] inline-block">
                            {s.modalidad}
                          </span>
                        </td>

                        {/* Proveedor */}
                        <td className="py-3 px-3.5 align-top max-w-[180px]">
                          <span className="text-slate-800 font-medium truncate block" title={s.proveedorActual}>
                            {s.proveedorActual}
                          </span>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                            s.riesgoContinuidad === 'Alto' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            Riesgo {s.riesgoContinuidad}
                          </span>
                        </td>

                        {/* Fechas de Vigencia y Progreso */}
                        <td className="py-3 px-3.5 align-top min-w-[140px]">
                          <div className="text-[11px]">
                            <span className="text-slate-500">Al: </span>
                            <span className="font-bold text-slate-900">{s.finVigencia}</span>
                          </div>
                          
                          {/* Barra porcentual */}
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                            <div 
                              className={`h-full ${
                                metricas.porcentajeConsumido >= 90 ? 'bg-rose-500' : (metricas.porcentajeConsumido >= 75 ? 'bg-amber-500' : 'bg-emerald-500')
                              }`}
                              style={{ width: `${metricas.porcentajeConsumido}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {metricas.porcentajeConsumido}% consumido
                          </span>
                        </td>

                        {/* Días Restantes */}
                        <td className="py-3 px-3.5 align-top text-center">
                          <span className={`text-sm font-black font-mono block ${
                            metricas.esVencido ? 'text-rose-600' : (metricas.diasRestantes <= 30 ? 'text-orange-600' : 'text-slate-800')
                          }`}>
                            {metricas.esVencido ? `-${metricas.diasDesfase}` : metricas.diasRestantes}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {metricas.esVencido ? 'días desfase' : 'días restantes'}
                          </span>
                        </td>

                        {/* Semáforo 1: Vigencia Operativa */}
                        <td className="py-3 px-3.5 align-top">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold text-[10px] ${semaforoV.badgeBg} ${semaforoV.badgeText} ${semaforoV.badgeBorder}`}>
                            <span className={`w-2 h-2 rounded-full ${semaforoV.dotColor}`} />
                            {semaforoV.label}
                          </span>
                        </td>

                        {/* Semáforo 2: Alerta Gestión por Modalidad */}
                        <td className="py-3 px-3.5 align-top">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold text-[10px] ${semaforoG.badgeBg} ${semaforoG.badgeText} ${semaforoG.badgeBorder} ${semaforoG.pulse ? 'animate-pulse' : ''}`}>
                            <Clock className="w-3 h-3" />
                            {semaforoG.label}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5 line-clamp-1" title={metricas.mensajeAlertaGestion}>
                            {metricas.mensajeAlertaGestion}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-3.5 align-top text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedServicio(s);
                                setIsServicioDetailModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Ver Ficha Detallada"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setServicioToEdit(s);
                                setIsServicioModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Editar Servicio"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setItemToDelete(s)}
                                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Eliminar Servicio"
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

          {/* VISTA MÓVIL Y TABLET (Cards adaptables para pantallas menores a md) */}
          <div className="md:hidden p-3 space-y-3 bg-slate-50/50">
            {/* Barra de Selección Rápida en Móvil */}
            {canDelete && filteredServicios.length > 0 && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs gap-2 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeFilteredSelected;
                    }}
                    onChange={toggleSelectAllFiltered}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                  />
                  <span>Seleccionar todos ({filteredServicios.length})</span>
                </label>

                <div className="flex items-center gap-1.5">
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsBatchDeleteModalOpen(true)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar ({selectedIds.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsClearAllModalOpen(true)}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Eliminar todos los registros del módulo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar</span>
                  </button>
                </div>
              </div>
            )}

            {paginatedServicios.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200 p-4">
                No se encontraron servicios contratados con los filtros seleccionados.
              </div>
            ) : (
              paginatedServicios.map((s) => {
                const metricas = calcularMetricasServicio(s);
                const semaforoV = getSemaforoVigenciaVisual(metricas.semaforoVigencia);
                const semaforoG = getNivelAlertaGestionVisual(metricas.nivelAlertaGestion);
                const isSelected = selectedIds.includes(s.id);

                return (
                  <div
                    key={s.id}
                    className={`bg-white p-4 rounded-xl border shadow-xs space-y-3 transition-colors ${
                      isSelected ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-400' : 'border-slate-200'
                    }`}
                  >
                    {/* Fila superior: Checkbox, Código, NOG y Semáforo Vigencia */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {canDelete && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(s.id)}
                            aria-label={`Seleccionar ${s.codigo}`}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer shrink-0"
                          />
                        )}
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-xs block">{s.codigo}</span>
                          <span className="font-mono text-[10px] text-slate-500">NOG: {s.nogExpediente}</span>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold text-[10px] ${semaforoV.badgeBg} ${semaforoV.badgeText} ${semaforoV.badgeBorder}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${semaforoV.dotColor}`} />
                        {semaforoV.label}
                      </span>
                    </div>

                    {/* Nombre del Servicio Contratado */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {s.servicioContratado}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Área: <strong>{s.area}</strong> • {s.departamento || 'GIT'}
                      </p>
                    </div>

                    {/* Metadata: Proveedor, Modalidad y Riesgo */}
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-1 text-[11px]">
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="text-slate-500">Proveedor:</span>
                        <span className="font-semibold truncate max-w-[180px]">{s.proveedorActual}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="text-slate-500">Modalidad:</span>
                        <span className="px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-800 font-medium text-[10px]">
                          {s.modalidad}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="text-slate-500">Vigencia hasta:</span>
                        <span className="font-bold text-slate-900">{s.finVigencia}</span>
                      </div>
                    </div>

                    {/* Barra de progreso de vigencia y días restantes */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Consumo de Vigencia:</span>
                        <span className={`font-mono font-bold ${
                          metricas.esVencido ? 'text-rose-600' : (metricas.diasRestantes <= 30 ? 'text-orange-600' : 'text-slate-800')
                        }`}>
                          {metricas.esVencido ? `Desfase: -${metricas.diasDesfase}d` : `${metricas.diasRestantes} días restantes`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full ${
                            metricas.porcentajeConsumido >= 90 ? 'bg-rose-500' : (metricas.porcentajeConsumido >= 75 ? 'bg-amber-500' : 'bg-emerald-500')
                          }`}
                          style={{ width: `${metricas.porcentajeConsumido}%` }}
                        />
                      </div>
                    </div>

                    {/* Semáforo de Gestión */}
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold ${semaforoG.badgeBg} ${semaforoG.badgeText} ${semaforoG.badgeBorder}`}>
                        <Clock className="w-3 h-3" />
                        {semaforoG.label}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium truncate max-w-[160px]">
                        {s.responsableSeguimiento}
                      </span>
                    </div>

                    {/* Botones de Acción Móvil */}
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedServicio(s);
                          setIsServicioDetailModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ficha</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setServicioToEdit(s);
                          setIsServicioModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-blue-900 shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setItemToDelete(s)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-600 shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Paginación Adaptable */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredServicios.length} registros)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 cursor-pointer"
                title="Primera página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 cursor-pointer flex items-center gap-1"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 cursor-pointer flex items-center gap-1"
                title="Página siguiente"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 cursor-pointer"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 3: CRONOGRAMA / GANTT MENSUALIZADO                       */}
      {/* ============================================================== */}
      {currentSubTab === 'gantt' && (
        <ServiciosGanttView serviciosFiltrados={filteredServicios} />
      )}

      {/* ============================================================== */}
      {/* VISTA 4: CENTRO DE NOTIFICACIONES Y ALERTAS POR CORREO         */}
      {/* ============================================================== */}
      {currentSubTab === 'alertas' && (
        <ServiciosAlertasView servicios={servicios} />
      )}

      {/* Modal de Importación */}
      <ServiciosImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Modal Confirmación Eliminación Individual */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  ¿Eliminar servicio {itemToDelete.codigo}?
                </h3>
                <p className="text-xs font-semibold text-rose-700 mt-0.5">
                  NOG: {itemToDelete.nogExpediente} • {itemToDelete.area}
                </p>
                <p className="text-xs text-slate-600 font-medium mt-1 line-clamp-2">
                  &ldquo;{itemToDelete.servicioContratado}&rdquo;
                </p>
              </div>
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={() => setItemToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
              <p className="font-semibold">Esta acción es irreversible:</p>
              <p className="text-[11px] text-rose-700">
                Se retirará permanentemente el registro de la colección Firestore y del servidor central. La acción quedará registrada en la bitácora de auditoría oficial.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingSingle ? 'Eliminando...' : 'Sí, Eliminar Servicio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación en Lote */}
      {isBatchDeleteModalOpen && selectedIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  ¿Eliminar {selectedIds.length} {selectedIds.length === 1 ? 'servicio contratado' : 'servicios contratados'}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta acción es irreversible y retirará permanentemente los registros seleccionados de la base de datos Firestore y del sistema.
                </p>
              </div>
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium">Total de servicios a eliminar:</span>
                <span className="font-bold text-rose-700 font-mono text-sm">{selectedIds.length}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Servicios que serán retirados:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {servicios.filter(s => selectedIds.includes(s.id)).slice(0, 10).map(s => (
                    <span key={s.id} className="font-mono text-[10px] bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded font-bold">
                      {s.codigo} ({s.nogExpediente})
                    </span>
                  ))}
                  {selectedIds.length > 10 && (
                    <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 self-center">
                      +{selectedIds.length - 10} más...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingBatch ? 'Eliminando...' : `Sí, Eliminar ${selectedIds.length} Servicios`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Vaciar Módulo Completo */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-rose-300 space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  ¿Vaciar todos los servicios contratados?
                </h3>
                <p className="text-xs text-rose-700 font-semibold mt-0.5">
                  Módulo: Control, Vigencia y Alertas Tempranas de Servicios Contratados
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Se eliminarán permanentemente los <strong>{servicios.length} registros</strong> actuales de este módulo tanto en Firestore como en el almacén de datos central.
                </p>
              </div>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={() => setIsClearAllModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Advertencia de Eliminación Total</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Esta operación dejará el catálogo de servicios completamente en blanco para que puedas reingresar o importar tu información desde cero. Quedará registrada en la bitácora de auditoría oficial.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isClearingAll}
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={handleConfirmClearAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isClearingAll ? 'Vaciando...' : `Sí, Vaciar Todos (${servicios.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
