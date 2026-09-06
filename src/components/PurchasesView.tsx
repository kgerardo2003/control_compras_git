import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  PlusCircle, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  ArrowUpDown,
  Paperclip,
  CheckCircle2,
  RefreshCw,
  Database,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { PurchaseRecord } from '../types';
import { formatQuetzales, formatDate, exportToCSV } from '../utils/formatters';
import { ExportPdfModal } from './ExportPdfModal';
import { generatePurchasesPDF } from '../utils/pdfExport';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  'Adjudicación': 'bg-blue-100 text-blue-700',
  'Evaluación': 'bg-amber-100 text-amber-700',
  'Prescindido': 'bg-red-100 text-red-700',
  'Desierto': 'bg-slate-100 text-slate-700',
};

export const PurchasesView: React.FC = () => {
  const { 
    purchases, 
    catalogs, 
    setIsPurchaseModalOpen, 
    setPurchaseToEdit, 
    setSelectedPurchase, 
    deletePurchase,
    currentUser,
    logAudit,
    themeConfig,
    showToast,
    firestoreStatus,
    refreshPurchases,
    setIsImportModalOpen
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstatus, setFilterEstatus] = useState('todos');
  const [filterGIT, setFilterGIT] = useState('todos');
  const [filterCategory, setFilterCategory] = useState('todos');
  const [sortBy, setSortBy] = useState<'fecha' | 'monto' | 'nog'>('fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [itemToDelete, setItemToDelete] = useState<PurchaseRecord | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  // Estados de sincronización en tiempo real con Firestore
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setLastSyncTime(new Date());
  }, [purchases]);

  // Forzar sincronización directa omitiendo cualquier caché de navegador
  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await refreshPurchases();
      setLastSyncTime(new Date());
      showToast({
        type: 'info',
        title: 'Sincronización Completada',
        message: 'Registros actualizados desde Firestore Cloud.',
        duration: 3000
      });
    } catch (err) {
      console.error("Error al forzar sincronización desde servidor:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const canCreate = currentUser?.rol === 'administrador' || currentUser?.rol === 'usuario_estandar';
  const canEdit = currentUser?.rol === 'administrador' || currentUser?.rol === 'usuario_estandar';
  const canDelete = currentUser?.rol === 'administrador' || currentUser?.rol === 'usuario_estandar';

  // Catálogos
  const statusCatalog = catalogs.find(c => c.codigo === 'ESTATUS_EVENTO');
  const statusOptions = statusCatalog?.items.map(it => it.valor) || ['Evaluación', 'Adjudicación', 'Prescindido', 'Desierto'];

  const categoryCatalog = catalogs.find(c => c.codigo === 'CATEGORIA_TECNOLOGICA');
  const categoryOptions = categoryCatalog?.items.map(it => it.valor) || [];

  // Filtrado y Búsqueda sobre los datos oficiales del contexto
  const currentPurchases = purchases;

  const filteredPurchases = useMemo(() => {
    return currentPurchases
      .filter(p => {
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matchDesc = p.descripcion.toLowerCase().includes(query);
          const matchNOG = p.nog.includes(query);
          const matchF56e = p.f56e.toLowerCase().includes(query);
          const matchF56 = p.f56.toLowerCase().includes(query);
          const matchProv = (p.proveedorAdjudicado || '').toLowerCase().includes(query);
          if (!matchDesc && !matchNOG && !matchF56e && !matchF56 && !matchProv) return false;
        }
        if (filterEstatus !== 'todos' && p.estatusEvento !== filterEstatus) return false;
        if (filterGIT !== 'todos' && p.evaluadoGIT !== filterGIT) return false;
        if (filterCategory !== 'todos' && p.categoriaTecnologica !== filterCategory) return false;
        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'fecha') {
          comparison = (a.fechaSolicitud || '').localeCompare(b.fechaSolicitud || '');
        } else if (sortBy === 'monto') {
          comparison = (a.monto || 0) - (b.monto || 0);
        } else if (sortBy === 'nog') {
          comparison = a.nog.localeCompare(b.nog);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [purchases, searchTerm, filterEstatus, filterGIT, filterCategory, sortBy, sortOrder]);

  const totalFilteredMonto = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + (p.monto || 0), 0);
  }, [filteredPurchases]);

  const handleExportCSV = () => {
    const rows = filteredPurchases.map(p => ({
      NOG: p.nog,
      'F56-e': p.f56e,
      F56: p.f56,
      'Área Solicitante': p.areaSolicitante || 'Soporte técnico',
      'Descripción': p.descripcion,
      'Fecha Solicitud': p.fechaSolicitud,
      'Fecha Vo.Bo.': p.fechaVoBo || 'N/A',
      'Fecha Autorizado': p.fechaAutorizado || 'N/A',
      'Fecha Publicación': p.fechaPublicacion || 'N/A',
      'Fecha Cierre Ofertas': p.fechaOfertas || 'N/A',
      'Fecha Dictamen GIT': p.fechaDictamenGIT || 'N/A',
      'Cantidad de Ofertas': p.cantidadOfertas,
      'Monto (GTQ)': p.monto,
      'Evaluado por la GIT': p.evaluadoGIT,
      'Estatus del Evento': p.estatusEvento,
      'Categoría Tecnológica': p.categoriaTecnologica || 'N/A',
      'Dependencia Solicitante': p.dependenciaSolicitante || 'N/A',
      'Modalidad de Compra': p.modalidadCompra || 'N/A',
      'Proveedor Adjudicado': p.proveedorAdjudicado || 'N/A',
    }));
    exportToCSV(`Adquisiciones_GIT_OJ_${new Date().toISOString().slice(0, 10)}`, rows);
    logAudit('EXPORTAR_DATOS', 'Compras', `Exportación de ${filteredPurchases.length} adquisiciones a CSV.`);
    showToast({
      type: 'success',
      title: 'Exportación a CSV Exitosa',
      message: `Se descargaron ${filteredPurchases.length} registros de adquisiciones en formato CSV.`,
      duration: 5000,
    });
  };

  const handleDirectExportPDF = () => {
    try {
      const filename = generatePurchasesPDF({
        purchases: filteredPurchases,
        title: 'REPORTE OFICIAL DE ADQUISICIONES TECNOLÓGICAS',
        subtitle: 'Control institucional de eventos NOG, formularios F56-e y dictámenes técnicos de TI',
        filterInfo: {
          search: searchTerm,
          status: filterEstatus,
          category: filterCategory,
        },
        currentUser,
        filenamePrefix: 'Reporte_Adquisiciones_GIT_OJ',
      });
      logAudit('EXPORTAR_DATOS', 'Compras', `Exportación oficial de ${filteredPurchases.length} adquisiciones a PDF (${filename}).`);
      showToast({
        type: 'success',
        title: 'Exportación a PDF Exitosa',
        message: `Se generó el documento oficial "${filename}" con membrete y código de auditoría.`,
        duration: 6000,
      });
    } catch (err) {
      console.error('Error generando PDF:', err);
      showToast({
        type: 'error',
        title: 'Error en Exportación',
        message: 'No fue posible generar el documento PDF.',
        duration: 5000,
      });
    }
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deletePurchase(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Módulo de Compras (Professional Polish) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Control de Adquisiciones y Eventos NOG
          </h2>
          <p className="text-xs text-slate-500">
            Mantenimiento y trazabilidad de compras para la Gerencia de Informática
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-purchases-pdf"
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-rose-800 text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Exportar la tabla actual a formato PDF con cabecera institucional y control de auditoría"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Exportar PDF</span>
          </button>

          <button
            id="btn-export-purchases-csv"
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>Exportar CSV</span>
          </button>

          {canCreate && (
            <>
              <button
                id="btn-import-purchases-excel"
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs border border-emerald-800"
                title="Carga masiva: importar adquisiciones desde un archivo de Excel (.xlsx, .xls, .csv)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Importar Excel</span>
              </button>

              <button
                id="btn-register-purchase-top"
                type="button"
                onClick={() => { setPurchaseToEdit(null); setIsPurchaseModalOpen(true); }}
                className={`px-3.5 py-2 rounded-xl ${themeConfig.primaryBtn} text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer`}
              >
                <PlusCircle className="w-4 h-4 text-black" />
                <span>+ Nueva Adquisición</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notificación de exportación PDF exitosa */}
      {pdfToast && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{pdfToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfToast(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Sincronización en Tiempo Real Multi-dispositivo */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              Listener Firestore Activo (En Vivo)
            </span>
            <span className="text-[10px] text-emerald-800 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
              {firestoreStatus === 'conectado' ? '☁️ Conectado a Servidor Cloud' : firestoreStatus === 'conectando' ? '🔄 Sincronizando...' : '💾 Modo Local / Fuera de línea'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Registros: {currentPurchases.length} • {lastSyncTime.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleForceSync}
          disabled={isSyncing}
          className="self-end sm:self-auto px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100/60 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60"
          title="Fuerza la consulta directa a los servidores de Firestore evitando cualquier caché de navegador"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Actualizando...' : 'Forzar Sincronización'}</span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Input de Búsqueda */}
          <div className="md:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="input-search-purchases"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por NOG (8 dígitos), F56-e, F56, descripción..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Filtro Estatus */}
          <div className="md:col-span-3">
            <select
              id="filter-select-estatus"
              value={filterEstatus}
              onChange={(e) => setFilterEstatus(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-700"
            >
              <option value="todos">Todos los Estatus</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Filtro GIT */}
          <div className="md:col-span-3">
            <select
              id="filter-select-git"
              value={filterGIT}
              onChange={(e) => setFilterGIT(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-700"
            >
              <option value="todos">Evaluado GIT: Todos</option>
              <option value="Sí">Evaluado: Sí</option>
              <option value="No">Evaluado: No</option>
            </select>
          </div>

        </div>

        {/* Resumen de Resultados y Orden */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span>Resultados: <strong>{filteredPurchases.length}</strong> de {purchases.length}</span>
            <span>•</span>
            <span>Monto Total: <strong className="text-slate-900">{formatQuetzales(totalFilteredMonto)}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-medium cursor-pointer"
            >
              <option value="fecha">Fecha de Solicitud</option>
              <option value="monto">Monto (Q)</option>
              <option value="nog">Número NOG</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
              title="Cambiar orden"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL (Desktop & Tablet) */}
      <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">NOG</th>
                <th className="px-3 py-3">F56-e / F56</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-3 py-3">Fecha Solicitud</th>
                <th className="px-3 py-3 text-right">Monto (Q)</th>
                <th className="px-3 py-3 text-center">Ofertas</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Evaluado por la GIT</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Estatus del Evento</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                        <FileSpreadsheet className="w-8 h-8 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">No se encontraron adquisiciones registradas</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Puedes registrar una adquisición individual o realizar una carga masiva desde tu archivo Excel.
                        </p>
                      </div>
                      {canCreate && (
                        <div className="flex items-center gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                            <span>Importar desde Excel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPurchaseToEdit(null); setIsPurchaseModalOpen(true); }}
                            className={`px-3.5 py-2 rounded-xl ${themeConfig.primaryBtn} text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer`}
                          >
                            <PlusCircle className="w-4 h-4 text-black" />
                            <span>+ Nueva Adquisición</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const badgeClass = STATUS_BADGE_CLASSES[p.estatusEvento] || 'bg-slate-100 text-slate-700';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      
                      {/* NOG */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {p.nog}
                      </td>

                      {/* F56-e y F56 */}
                      <td className="px-3 py-3 whitespace-nowrap font-mono">
                        <span className="font-bold text-slate-800 block">{p.f56e}</span>
                        <span className="text-[10px] text-slate-400 block">{p.f56}</span>
                        {p.f56Documento && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (p.f56Documento?.dataUrl) {
                                const link = document.createElement('a');
                                link.href = p.f56Documento.dataUrl;
                                link.download = p.f56Documento.nombre;
                                link.click();
                              }
                            }}
                            title={`Documento F56 adjunto: ${p.f56Documento.nombre} (${p.f56Documento.tamano ? (p.f56Documento.tamano / 1024).toFixed(0) + ' KB' : ''})`}
                            className="inline-flex items-center gap-1 mt-1 text-[9px] font-sans font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            <Paperclip className="w-2.5 h-2.5 text-amber-600" />
                            Doc F56
                          </span>
                        )}
                      </td>

                      {/* Descripción */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-slate-800 line-clamp-2" title={p.descripcion}>
                          {p.descripcion}
                        </p>
                        {p.areaSolicitante && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            {p.areaSolicitante}
                          </span>
                        )}
                      </td>

                      {/* Fecha Solicitud */}
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(p.fechaSolicitud)}
                      </td>

                      {/* Monto */}
                      <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatQuetzales(p.monto)}
                      </td>

                      {/* Cantidad de Ofertas */}
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">
                        {p.cantidadOfertas}
                      </td>

                      {/* Evaluado por la GIT */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {p.evaluadoGIT === 'Sí' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Evaluado por la GIT
                            </span>
                            {p.fechaDictamenGIT && (
                              <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                                Dictamen: {formatDate(p.fechaDictamenGIT)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            No evaluado
                          </span>
                        )}
                      </td>

                      {/* Estatus del Evento */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                          {p.estatusEvento}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedPurchase(p)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                            title="Ver Ficha Detallada"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => { setPurchaseToEdit(p); setIsPurchaseModalOpen(true); }}
                              className="p-1.5 rounded-md text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setItemToDelete(p)}
                              className="p-1.5 rounded-md text-slate-600 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                              title="Eliminar"
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
      </div>

      {/* VISTA MÓVIL (Cards) */}
      <div className="md:hidden space-y-3">
        {filteredPurchases.map((p) => {
          const badgeClass = STATUS_BADGE_CLASSES[p.estatusEvento] || 'bg-slate-100 text-slate-700';
          return (
            <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">NOG</span>
                  <span className="font-mono font-bold text-slate-900">{p.nog}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold block">Estatus del Evento</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeClass}`}>
                    {p.estatusEvento}
                  </span>
                </div>
              </div>

              {/* F56-e / F56 / Doc */}
              <div className="flex items-center justify-between text-[11px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 font-sans text-[10px] block">Formularios:</span>
                  <span className="font-bold text-slate-800">{p.f56e}</span>
                  <span className="text-slate-500 ml-1.5">({p.f56})</span>
                </div>
                {p.f56Documento && (
                  <span className="text-[10px] font-sans font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-amber-600" />
                    Doc F56
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-800 font-medium line-clamp-2">{p.descripcion}</p>
              
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                <span className="font-bold text-slate-900">{formatQuetzales(p.monto)}</span>
                <span className="text-[11px] text-slate-600 flex items-center gap-1">
                  Evaluado GIT: 
                  <strong className={p.evaluadoGIT === 'Sí' ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                    {p.evaluadoGIT === 'Sí' ? 'Sí (GIT)' : 'No'}
                  </strong>
                </span>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPurchase(p)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-black shadow-2xs cursor-pointer"
                >
                  Ver Ficha
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => { setPurchaseToEdit(p); setIsPurchaseModalOpen(true); }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-black shadow-2xs cursor-pointer"
                  >
                    Editar
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setItemToDelete(p)}
                    className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-600 shadow-2xs cursor-pointer"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Confirmación Eliminación */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              ¿Eliminar NOG {itemToDelete.nog}?
            </h3>
            <p className="text-xs text-slate-500">
              Esta acción eliminará el registro y se guardará en la bitácora de auditoría.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-black bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 shadow-2xs cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportación a PDF Oficial Institucional */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        purchases={filteredPurchases}
        currentUser={currentUser}
        filterInfo={{
          search: searchTerm,
          status: filterEstatus,
          category: filterCategory,
        }}
        onSuccess={(filename) => {
          logAudit('EXPORTAR_DATOS', 'Compras', `Exportación oficial de ${filteredPurchases.length} adquisiciones a PDF (${filename}).`);
          showToast({
            type: 'success',
            title: 'Exportación a PDF Exitosa',
            message: `Documento oficial "${filename}" descargado con cabecera y código de auditoría.`,
            duration: 6000,
          });
        }}
      />

    </div>
  );
};
