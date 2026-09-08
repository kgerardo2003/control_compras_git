import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BudgetLineItem, 
  BudgetModification, 
  BudgetDisponibilidadStatus,
  PurchaseRecord 
} from '../../types';
import { exportBudgetLinesToExcel, downloadBudgetExcelTemplate } from '../../utils/budgetCalculations';
import { OfficialRenglon } from '../../data/budgetStandardCatalog';
import { ImportBudgetExcelModal } from './ImportBudgetExcelModal';
import { BudgetModificationModal } from './BudgetModificationModal';
import { BudgetLineModal } from './BudgetLineModal';
import { BudgetOfficialCatalogView } from './BudgetOfficialCatalogView';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  FileSpreadsheet, 
  Download, 
  PlusCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  PieChart, 
  ShoppingBag, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  Eye,
  RefreshCw,
  BookOpen
} from 'lucide-react';

type BudgetSubTab = 'matriz' | 'catalogoOficial' | 'modificaciones' | 'estadisticas' | 'compras';

export const BudgetView: React.FC = () => {
  const { 
    budgetLines, 
    budgetModifications, 
    budgetAvailability, 
    purchases, 
    deleteBudgetLine,
    deleteBudgetModification,
    approveBudgetModification,
    rejectBudgetModification,
    togglePurchasePaymentState,
    setSelectedPurchase,
    setActiveTab,
    currentUser,
    themeConfig 
  } = useApp();

  // Estados de interfaz
  const [subTab, setSubTab] = useState<BudgetSubTab>('matriz');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isModModalOpen, setIsModModalOpen] = useState(false);
  const [modToEdit, setModToEdit] = useState<BudgetModification | null>(null);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [lineToEdit, setLineToEdit] = useState<BudgetLineItem | null>(null);
  const [prefillRenglon, setPrefillRenglon] = useState<OfficialRenglon | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');

  const isAdmin = currentUser?.rol === 'administrador';

  // Extraer grupos presupuestarios únicos
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    budgetAvailability.forEach(l => {
      if (l.grupoPresupuestario) set.add(l.grupoPresupuestario);
    });
    return Array.from(set).sort();
  }, [budgetAvailability]);

  // Filtrado de la matriz
  const filteredLines = useMemo(() => {
    return budgetAvailability.filter(line => {
      const matchSearch = searchTerm === '' || 
        line.renglonPresupuestario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        line.nombreRenglon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        line.grupoPresupuestario.toLowerCase().includes(searchTerm.toLowerCase());

      const matchGroup = selectedGroup === 'todos' || line.grupoPresupuestario === selectedGroup;
      const matchStatus = selectedStatus === 'todos' || line.estatusDisponibilidad === selectedStatus;

      return matchSearch && matchGroup && matchStatus;
    });
  }, [budgetAvailability, searchTerm, selectedGroup, selectedStatus]);

  // Totales consolidados
  const totals = useMemo(() => {
    const totalInicial = budgetAvailability.reduce((s, l) => s + (l.presupuestoInicial || 0), 0);
    const totalModificaciones = budgetAvailability.reduce((s, l) => s + (l.modificacionesAprobadas || 0), 0);
    const totalVigente = budgetAvailability.reduce((s, l) => s + (l.presupuestoVigente || 0), 0);
    const totalPagado = budgetAvailability.reduce((s, l) => s + (l.pagadoQueRebaja || 0), 0);
    const totalDisponibleReal = budgetAvailability.reduce((s, l) => s + (l.disponibleReal || 0), 0);
    const totalComprometido = budgetAvailability.reduce((s, l) => s + (l.comprometidoPendiente || 0), 0);
    const totalDisponibleProyectado = budgetAvailability.reduce((s, l) => s + (l.disponibleProyectado || 0), 0);
    
    const totalAfectado = totalPagado + totalComprometido;
    const porcentajeGlobal = totalVigente > 0 ? (totalAfectado / totalVigente) * 100 : 0;

    const conDisponibilidadCount = budgetAvailability.filter(l => l.estatusDisponibilidad === 'Con Disponibilidad').length;
    const alertaCount = budgetAvailability.filter(l => l.estatusDisponibilidad === 'Alerta Disponibilidad Baja').length;
    const sinDisponibilidadCount = budgetAvailability.filter(l => l.estatusDisponibilidad === 'Sin Disponibilidad').length;

    return {
      totalInicial,
      totalModificaciones,
      totalVigente,
      totalPagado,
      totalDisponibleReal,
      totalComprometido,
      totalDisponibleProyectado,
      porcentajeGlobal,
      conDisponibilidadCount,
      alertaCount,
      sinDisponibilidadCount
    };
  }, [budgetAvailability]);

  // Estadísticas por Grupo
  const groupStats = useMemo(() => {
    const map: Record<string, {
      grupo: string;
      vigente: number;
      pagado: number;
      comprometido: number;
      disponible: number;
      renglonesCount: number;
    }> = {};

    budgetAvailability.forEach(l => {
      const g = l.grupoPresupuestario || 'Otros Grupos';
      if (!map[g]) {
        map[g] = {
          grupo: g,
          vigente: 0,
          pagado: 0,
          comprometido: 0,
          disponible: 0,
          renglonesCount: 0
        };
      }
      map[g].vigente += l.presupuestoVigente;
      map[g].pagado += l.pagadoQueRebaja;
      map[g].comprometido += l.comprometidoPendiente;
      map[g].disponible += l.disponibleProyectado;
      map[g].renglonesCount += 1;
    });

    return Object.values(map);
  }, [budgetAvailability]);

  const handleCreateModForLine = (renglon: string) => {
    setModToEdit(null);
    setIsModModalOpen(true);
  };

  const handleEditLine = (line: BudgetLineItem) => {
    setLineToEdit(line);
    setIsLineModalOpen(true);
  };

  const formatCurrency = (val: number) => {
    return `Q. ${val.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Cabecera Principal del Módulo de Presupuesto */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
              <DollarSign className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Módulo Financiero y Presupuestario
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
              Gerencia de Informática
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Control integral del presupuesto por grupo y renglón, modificaciones presupuestarias aprobadas y matriz de disponibilidad presupuestaria en tiempo real integrada a las adquisiciones F56-e.
          </p>
        </div>

        {/* Botonera de Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Importar Excel */}
          <button
            id="btn-importar-presupuesto-excel"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Importar Excel</span>
          </button>

          {/* Botón Exportar Matriz a Excel */}
          <button
            type="button"
            onClick={() => exportBudgetLinesToExcel(budgetAvailability)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Exportar matriz completa con las 12 columnas a Excel"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar Excel</span>
          </button>

          {/* Botón Nueva Modificación */}
          <button
            type="button"
            onClick={() => { setModToEdit(null); setIsModModalOpen(true); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-200" />
            <span>+ Modificación</span>
          </button>

          {/* Botón Nuevo Renglón (Admin) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => { setLineToEdit(null); setIsLineModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-900 text-xs font-bold transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-700" />
              <span>Nuevo Renglón</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas Resumen (Indicadores de Alto Nivel) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Presupuesto Inicial */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Presupuesto Inicial</div>
          <div className="text-sm sm:text-base font-extrabold text-slate-800 font-mono mt-1 truncate" title={formatCurrency(totals.totalInicial)}>
            {formatCurrency(totals.totalInicial)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Asignación decretada</div>
        </div>

        {/* Modificaciones Aprobadas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modif. Aprobadas</div>
          <div className={`text-sm sm:text-base font-extrabold font-mono mt-1 truncate ${totals.totalModificaciones >= 0 ? 'text-emerald-700' : 'text-red-700'}`} title={formatCurrency(totals.totalModificaciones)}>
            {totals.totalModificaciones >= 0 ? '+' : ''}{formatCurrency(totals.totalModificaciones)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span>{budgetModifications.filter(m => m.estado === 'aprobada').length} resoluciones DAF</span>
          </div>
        </div>

        {/* Presupuesto Vigente */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Presupuesto Vigente</div>
          <div className="text-sm sm:text-base font-black text-blue-950 font-mono mt-1 truncate" title={formatCurrency(totals.totalVigente)}>
            {formatCurrency(totals.totalVigente)}
          </div>
          <div className="text-[10px] text-blue-700 mt-1 font-medium">Techo actual consolidado</div>
        </div>

        {/* Pagado que Rebaja */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pagado que Rebaja</div>
          <div className="text-sm sm:text-base font-extrabold text-blue-700 font-mono mt-1 truncate" title={formatCurrency(totals.totalPagado)}>
            {formatCurrency(totals.totalPagado)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Gastos devengados/pagados</div>
        </div>

        {/* Comprometido Pendiente */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comprometido Pendiente</div>
          <div className="text-sm sm:text-base font-extrabold text-amber-700 font-mono mt-1 truncate" title={formatCurrency(totals.totalComprometido)}>
            {formatCurrency(totals.totalComprometido)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">F56-e en trámite activo</div>
        </div>

        {/* Disponible Proyectado */}
        <div className={`p-4 rounded-xl border shadow-2xs ${totals.totalDisponibleProyectado >= 0 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Disponible Proyectado</div>
          <div className={`text-sm sm:text-base font-black font-mono mt-1 truncate ${totals.totalDisponibleProyectado >= 0 ? 'text-emerald-800' : 'text-red-700'}`} title={formatCurrency(totals.totalDisponibleProyectado)}>
            {formatCurrency(totals.totalDisponibleProyectado)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-1 font-semibold flex items-center justify-between">
            <span>Saldo real libre</span>
            <span>{totals.porcentajeGlobal.toFixed(1)}% usado</span>
          </div>
        </div>

      </div>

      {/* Navegación por Pestañas del Módulo */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('matriz')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'matriz'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Matriz de Disponibilidad (12 Columnas)</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
            {budgetAvailability.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('catalogoOficial')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'catalogoOficial'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Catálogo Oficial (39 Renglones)</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
            39
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('modificaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'modificaciones'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Modificaciones Presupuestarias</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
            {budgetModifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('estadisticas')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'estadisticas'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Resumen y Estadísticas por Renglón</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('compras')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'compras'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Adquisiciones Vinculadas (F56-e)</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">
            {purchases.length}
          </span>
        </button>
      </div>

      {/* SUBPESTAÑA 1: MATRIZ DE DISPONIBILIDAD (12 COLUMNAS OFICIALES) */}
      {subTab === 'matriz' && (
        <div className="space-y-4">
          
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Buscador */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código de renglón o nombre (ej. 158, arrendamiento)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Filtro por Grupo */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">Grupo:</span>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos los Grupos Presupuestarios</option>
                  {availableGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Estatus */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">Estatus:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos los Estatus</option>
                  <option value="Con Disponibilidad">Con Disponibilidad</option>
                  <option value="Alerta Disponibilidad Baja">Alerta Disponibilidad Baja</option>
                  <option value="Sin Disponibilidad">Sin Disponibilidad</option>
                </select>
              </div>
            </div>

            {/* Contador de resultados */}
            <div className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-800">{filteredLines.length}</strong> de <strong>{budgetAvailability.length}</strong> renglones
            </div>
          </div>

          {/* Tabla de la Matriz con las 12 Columnas Requeridas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3 whitespace-nowrap">1. Grupo Presupuestario</th>
                    <th className="px-3 py-3 whitespace-nowrap text-center">2. Renglón</th>
                    <th className="px-3.5 py-3 whitespace-nowrap min-w-[180px]">3. Nombre del Renglón</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">4. Presupuesto Inicial</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">5. Modif. Aprobadas</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap bg-blue-50/50 text-blue-950">6. Presupuesto Vigente</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap text-blue-800">7. Pagado Rebaja</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">8. Disponible Real</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap text-amber-800">9. Comprometido Pendiente</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap bg-emerald-50/50 text-emerald-950 font-black">10. Disp. Proyectado</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap min-w-[110px]">11. % Usado/Comp.</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">12. Estatus</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLines.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-6 py-12 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                          <p className="font-bold text-slate-800 text-sm">No se encontraron renglones presupuestarios</p>
                          <p className="text-xs text-slate-500">
                            Intente ajustar los filtros de búsqueda o use el botón "Importar Excel" para cargar la matriz oficial de la Gerencia de Informática.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLines.map((line) => {
                      const pct = line.porcentajeUsadoComprometido || 0;
                      let pctColor = 'bg-emerald-500';
                      if (pct > 85) pctColor = 'bg-red-500';
                      else if (pct > 70) pctColor = 'bg-amber-500';

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* 1. Grupo Presupuestario */}
                          <td className="px-3.5 py-2.5 font-medium text-slate-600 max-w-[170px] truncate" title={line.grupoPresupuestario}>
                            {line.grupoPresupuestario}
                          </td>

                          {/* 2. Renglón Presupuestario */}
                          <td className="px-3 py-2.5 text-center font-mono font-black text-blue-900 text-xs">
                            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                              {line.renglonPresupuestario}
                            </span>
                          </td>

                          {/* 3. Nombre del Renglón */}
                          <td className="px-3.5 py-2.5 font-semibold text-slate-900 max-w-[220px]" title={line.nombreRenglon}>
                            <div>{line.nombreRenglon}</div>
                            {line.observaciones && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={line.observaciones}>
                                {line.observaciones}
                              </div>
                            )}
                          </td>

                          {/* 4. Presupuesto Inicial */}
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatCurrency(line.presupuestoInicial)}
                          </td>

                          {/* 5. Modificaciones Aprobadas */}
                          <td className="px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap">
                            <span className={line.modificacionesAprobadas > 0 ? 'text-emerald-700' : line.modificacionesAprobadas < 0 ? 'text-red-700' : 'text-slate-400'}>
                              {line.modificacionesAprobadas > 0 ? '+' : ''}{formatCurrency(line.modificacionesAprobadas)}
                            </span>
                          </td>

                          {/* 6. Presupuesto Vigente */}
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-950 bg-blue-50/30 whitespace-nowrap">
                            {formatCurrency(line.presupuestoVigente)}
                          </td>

                          {/* 7. Pagado que Rebaja */}
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-blue-700 whitespace-nowrap">
                            {formatCurrency(line.pagadoQueRebaja)}
                          </td>

                          {/* 8. Disponible Real */}
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {formatCurrency(line.disponibleReal)}
                          </td>

                          {/* 9. Comprometido Pendiente */}
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-amber-700 whitespace-nowrap">
                            {formatCurrency(line.comprometidoPendiente)}
                          </td>

                          {/* 10. Disponible Proyectado */}
                          <td className={`px-3 py-2.5 text-right font-mono font-black whitespace-nowrap bg-emerald-50/20 ${line.disponibleProyectado >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                            {formatCurrency(line.disponibleProyectado)}
                          </td>

                          {/* 11. Porcentaje Usado/Comprometido */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="w-full flex flex-col items-center">
                              <span className="font-mono font-bold text-[11px] text-slate-800 mb-1">
                                {line.porcentajeUsadoComprometido.toFixed(1)}%
                              </span>
                              <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full ${pctColor} rounded-full transition-all`} 
                                  style={{ width: `${Math.min(100, Math.max(0, line.porcentajeUsadoComprometido))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 12. Estatus si hay disponibilidad o No */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              line.estatusDisponibilidad === 'Con Disponibilidad'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : line.estatusDisponibilidad === 'Alerta Disponibilidad Baja'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                              {line.estatusDisponibilidad === 'Con Disponibilidad' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {line.estatusDisponibilidad === 'Alerta Disponibilidad Baja' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                              {line.estatusDisponibilidad === 'Sin Disponibilidad' && <XCircle className="w-3 h-3 text-red-600" />}
                              <span>{line.estatusDisponibilidad}</span>
                            </span>
                          </td>

                          {/* Acciones de Fila */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* Crear modificación directa a este renglón */}
                              <button
                                type="button"
                                onClick={() => handleCreateModForLine(line.renglonPresupuestario)}
                                className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                title="Registrar modificación para este renglón"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>

                              {/* Editar Renglón */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleEditLine(line)}
                                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                  title="Editar renglón"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Eliminar Renglón */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`¿Está seguro de eliminar el renglón presupuestario ${line.renglonPresupuestario} - ${line.nombreRenglon}?`)) {
                                      deleteBudgetLine(line.id);
                                    }
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                                  title="Eliminar renglón"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Pie de Totales Oficiales */}
                <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                  <tr>
                    <td colSpan={3} className="px-3.5 py-3 text-right font-extrabold uppercase">
                      Totales Consolidados Gerencia de Informática:
                    </td>
                    <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                      {formatCurrency(totals.totalInicial)}
                    </td>
                    <td className={`px-3 py-3 text-right font-mono whitespace-nowrap ${totals.totalModificaciones >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {totals.totalModificaciones >= 0 ? '+' : ''}{formatCurrency(totals.totalModificaciones)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono whitespace-nowrap bg-blue-100/50 text-blue-950">
                      {formatCurrency(totals.totalVigente)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-blue-800 whitespace-nowrap">
                      {formatCurrency(totals.totalPagado)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                      {formatCurrency(totals.totalDisponibleReal)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-amber-800 whitespace-nowrap">
                      {formatCurrency(totals.totalComprometido)}
                    </td>
                    <td className={`px-3 py-3 text-right font-mono whitespace-nowrap bg-emerald-100/50 ${totals.totalDisponibleProyectado >= 0 ? 'text-emerald-900' : 'text-red-700'}`}>
                      {formatCurrency(totals.totalDisponibleProyectado)}
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {totals.porcentajeGlobal.toFixed(1)}%
                    </td>
                    <td colSpan={2} className="px-3 py-3 text-center text-[11px] font-bold text-slate-600">
                      {totals.conDisponibilidadCount} con saldo / {totals.sinDisponibilidadCount} agotados
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUBPESTAÑA CATÁLOGO OFICIAL: 39 RENGLONES INSTITUCIONALES */}
      {subTab === 'catalogoOficial' && (
        <BudgetOfficialCatalogView
          onOpenLineModal={(line, prefill) => {
            setLineToEdit(line || null);
            setPrefillRenglon(prefill || null);
            setIsLineModalOpen(true);
          }}
          onNavigateToMatrix={(renglon) => {
            if (renglon) setSearchTerm(renglon);
            setSubTab('matriz');
          }}
        />
      )}
      {subTab === 'modificaciones' && (
        <div className="space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Historial de Modificaciones Presupuestarias Aprobadas y en Trámite
              </h3>
              <p className="text-xs text-slate-500">
                Las modificaciones aprobadas afectan directamente en Quetzales el presupuesto vigente y la disponibilidad de cada renglón.
              </p>
            </div>

            <button
              type="button"
              onClick={() => { setModToEdit(null); setIsModModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Modificación Presupuestaria</span>
            </button>
          </div>

          {/* Tabla de Modificaciones */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Correlativo</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3">Renglón Afectado</th>
                    <th className="px-3 py-3 text-right">Monto</th>
                    <th className="px-3 py-3">No. Resolución / Acuerdo</th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-4 py-3 max-w-xs">Justificación</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {budgetModifications.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                        No hay modificaciones presupuestarias registradas aún.
                      </td>
                    </tr>
                  ) : (
                    budgetModifications.map((mod) => (
                      <tr key={mod.id} className="hover:bg-slate-50">
                        
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {mod.correlativo}
                        </td>

                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            mod.tipo === 'ampliacion'
                              ? 'bg-emerald-100 text-emerald-800'
                              : mod.tipo === 'disminucion'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {mod.tipo === 'ampliacion' && <TrendingUp className="w-3 h-3 text-emerald-600" />}
                            {mod.tipo === 'disminucion' && <TrendingDown className="w-3 h-3 text-red-600" />}
                            {mod.tipo === 'transferencia' && <ArrowRightLeft className="w-3 h-3 text-blue-600" />}
                            <span className="uppercase">{mod.tipo}</span>
                          </span>
                        </td>

                        <td className="px-3 py-3 font-semibold text-slate-900">
                          <div>Renglón {mod.renglonPresupuestario} - {mod.nombreRenglon}</div>
                          {mod.tipo === 'transferencia' && mod.renglonOrigenPresupuestario && (
                            <div className="text-[10px] text-slate-500">
                              Origen: Renglón {mod.renglonOrigenPresupuestario}
                            </div>
                          )}
                        </td>

                        <td className={`px-3 py-3 text-right font-mono font-bold ${
                          mod.tipo === 'ampliacion' ? 'text-emerald-700' : mod.tipo === 'disminucion' ? 'text-red-700' : 'text-blue-800'
                        }`}>
                          {mod.tipo === 'ampliacion' ? '+' : mod.tipo === 'disminucion' ? '-' : '±'}{formatCurrency(mod.monto)}
                        </td>

                        <td className="px-3 py-3 text-slate-700 font-medium">
                          {mod.noResolucion}
                        </td>

                        <td className="px-3 py-3 font-mono text-slate-500 whitespace-nowrap">
                          {mod.fecha}
                        </td>

                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={mod.descripcion}>
                          {mod.descripcion}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            mod.estado === 'aprobada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : mod.estado === 'en_tramite'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {mod.estado === 'aprobada' ? 'Aprobada (Vigente)' : mod.estado === 'en_tramite' ? 'En Trámite' : 'Rechazada'}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {mod.estado === 'en_tramite' && isAdmin && (
                              <button
                                type="button"
                                onClick={() => approveBudgetModification(mod.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Aprobar e impactar disponibilidad inmediatamente"
                              >
                                <Check className="w-3 h-3" />
                                <span>Aprobar</span>
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`¿Eliminar modificación presupuestaria ${mod.correlativo}?`)) {
                                    deleteBudgetModification(mod.id);
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUBPESTAÑA 3: RESUMEN Y ESTADÍSTICAS POR RENGLÓN */}
      {subTab === 'estadisticas' && (
        <div className="space-y-6">
          
          {/* Tarjetas por Grupo Presupuestario */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groupStats.map((gs, i) => {
              const pct = gs.vigente > 0 ? ((gs.pagado + gs.comprometido) / gs.vigente) * 100 : 0;
              return (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate" title={gs.grupo}>
                      {gs.grupo}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                      {gs.renglonesCount} renglones
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Presupuesto Vigente:</span>
                      <strong className="font-mono text-slate-900">{formatCurrency(gs.vigente)}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Pagado Rebaja:</span>
                      <span className="font-mono text-blue-700 font-semibold">{formatCurrency(gs.pagado)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Comprometido:</span>
                      <span className="font-mono text-amber-700 font-semibold">{formatCurrency(gs.comprometido)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="font-semibold text-slate-700">Disponible Proyectado:</span>
                      <strong className={`font-mono ${gs.disponible >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(gs.disponible)}
                      </strong>
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1">
                      <span>Porcentaje Ejecutado + Comprometido</span>
                      <span className="font-bold text-slate-800">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${pct > 85 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gráfico y Top de Renglones con Mayor Asignación */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top 5 Renglones con Mayor Presupuesto Vigente */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Renglones con Mayor Asignación Vigente
              </h4>
              <div className="space-y-3">
                {[...budgetAvailability]
                  .sort((a, b) => b.presupuestoVigente - a.presupuestoVigente)
                  .slice(0, 5)
                  .map((line, idx) => {
                    const ratio = totals.totalVigente > 0 ? (line.presupuestoVigente / totals.totalVigente) * 100 : 0;
                    return (
                      <div key={line.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            Renglón {line.renglonPresupuestario} - {line.nombreRenglon}
                          </span>
                          <span className="font-mono font-bold text-blue-900">
                            {formatCurrency(line.presupuestoVigente)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{line.grupoPresupuestario}</span>
                          <span>{ratio.toFixed(1)}% del techo total</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Renglones en Alerta o Mayor Porcentaje de Consumo */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Renglones con Mayor Porcentaje de Compromiso / Alerta
              </h4>
              <div className="space-y-3">
                {[...budgetAvailability]
                  .sort((a, b) => b.porcentajeUsadoComprometido - a.porcentajeUsadoComprometido)
                  .slice(0, 5)
                  .map((line) => (
                    <div key={line.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          Renglón {line.renglonPresupuestario} - {line.nombreRenglon}
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {line.porcentajeUsadoComprometido.toFixed(1)}% Usado
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Disponible Proyectado:</span>
                        <strong className={`font-mono ${line.disponibleProyectado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrency(line.disponibleProyectado)}
                        </strong>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            line.porcentajeUsadoComprometido > 85 ? 'bg-red-500' : 'bg-amber-500'
                          }`} 
                          style={{ width: `${Math.min(100, line.porcentajeUsadoComprometido)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUBPESTAÑA 4: ADQUISICIONES VINCULADAS AL PRESUPUESTO (F56-e) */}
      {subTab === 'compras' && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Adquisiciones Institucionales F56-e y su Impacto Presupuestario
              </h3>
              <p className="text-xs text-slate-500">
                Las compras registradas afectan el renglón presupuestario asignado. Puede alternar el estado a "Pagado" para trasladar el monto de "Comprometido Pendiente" hacia "Pagado que Rebaja" en tiempo real.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('compras')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <span>Ir al Módulo de Compras</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">No. Solicitud F56</th>
                    <th className="px-3 py-3">NOG Guatecompras</th>
                    <th className="px-4 py-3 min-w-[200px]">Descripción de la Adquisición</th>
                    <th className="px-3 py-3">Renglón Asignado</th>
                    <th className="px-3 py-3 text-right">Monto Estimado</th>
                    <th className="px-3 py-3 text-center">Estado del Gasto</th>
                    <th className="px-3 py-3 text-center">Impacto en Matriz</th>
                    <th className="px-3 py-3 text-center">Alternar Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {purchases.map((purchase) => {
                    const isPaid = purchase.estadoPago === 'pagado';
                    const renglonCode = purchase.renglonPresupuestario || '158';
                    const matchingLine = budgetAvailability.find(l => l.renglonPresupuestario === renglonCode);

                    return (
                      <tr key={purchase.id} className="hover:bg-slate-50">
                        
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {purchase.numeroSolicitud}
                        </td>

                        <td className="px-3 py-3 font-mono text-blue-900 font-medium">
                          {purchase.nogGuatecompras || 'N/A'}
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-900 max-w-sm truncate" title={purchase.descripcion}>
                          {purchase.descripcion}
                        </td>

                        <td className="px-3 py-3">
                          <span className="font-mono font-bold text-blue-950 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                            {renglonCode}
                          </span>
                          {matchingLine && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={matchingLine.nombreRenglon}>
                              {matchingLine.nombreRenglon}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(purchase.monto)}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isPaid ? 'Pagado / Devengado' : 'Comprometido en Trámite'}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span className={`text-[10px] font-bold ${isPaid ? 'text-blue-700' : 'text-amber-700'}`}>
                            {isPaid ? 'Afecta: Pagado que Rebaja' : 'Afecta: Comprometido Pendiente'}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => togglePurchasePaymentState(purchase.id)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isPaid 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            }`}
                          >
                            {isPaid ? 'Pasar a Comprometido' : 'Marcar como Pagado'}
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODALES */}
      <ImportBudgetExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <BudgetModificationModal
        isOpen={isModModalOpen}
        onClose={() => { setIsModModalOpen(false); setModToEdit(null); }}
        modificationToEdit={modToEdit}
      />

      <BudgetLineModal
        isOpen={isLineModalOpen}
        onClose={() => { 
          setIsLineModalOpen(false); 
          setLineToEdit(null); 
          setPrefillRenglon(null);
        }}
        lineToEdit={lineToEdit}
        prefillRenglon={prefillRenglon}
      />

    </div>
  );
};
