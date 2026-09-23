import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  DollarSign, 
  Building2, 
  ShoppingBag, 
  Check, 
  Clock,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BudgetLineItem, PurchaseRecord } from '../../types';
import { formatQuetzales, formatDateTime } from '../../utils/formatters';
import { OJ_LOGO_DATA_URI } from '../../utils/ojLogoAsset';

export type BudgetReportVariant = 
  | 'matriz_consolidada'
  | 'compras_por_renglon'
  | 'comprometido_pendiente'
  | 'pagado_devengado'
  | 'alertas_deficit'
  | 'gasto_grupo_renglon';

interface BudgetReportsViewProps {
  budgetAvailability: BudgetLineItem[];
  purchases: PurchaseRecord[];
}

export const BudgetReportsView: React.FC<BudgetReportsViewProps> = ({
  budgetAvailability,
  purchases
}) => {
  const [activeVariant, setActiveVariant] = useState<BudgetReportVariant>('matriz_consolidada');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRenglon, setFilterRenglon] = useState('todos');

  const now = new Date();
  const fechaEmision = formatDateTime(now.toISOString());

  // Renglones únicos
  const availableRenglones = useMemo(() => {
    return budgetAvailability.map(l => ({
      codigo: l.renglonPresupuestario,
      nombre: l.nombreRenglon
    }));
  }, [budgetAvailability]);

  // VARIANTES DE DATOS
  // 1. Matriz Consolidada
  const dataMatriz = useMemo(() => {
    return budgetAvailability.filter(l => {
      const matchSearch = searchTerm === '' || 
        l.renglonPresupuestario.includes(searchTerm) || 
        l.nombreRenglon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.grupoPresupuestario.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRenglon = filterRenglon === 'todos' || l.renglonPresupuestario === filterRenglon;
      return matchSearch && matchRenglon;
    });
  }, [budgetAvailability, searchTerm, filterRenglon]);

  // 2. Compras Vinculadas por Renglón
  const dataCompras = useMemo(() => {
    return purchases.filter(p => {
      const f56 = p.f56e || p.f56 || p.numeroSolicitud || '';
      const nog = p.nog || p.nogGuatecompras || '';
      const matchSearch = searchTerm === '' ||
        f56.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nog.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.proveedorAdjudicado || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchRenglon = filterRenglon === 'todos' || p.renglonPresupuestario === filterRenglon;
      return matchSearch && matchRenglon;
    });
  }, [purchases, searchTerm, filterRenglon]);

  // 3. Comprometido Pendiente de Pago
  const dataComprometido = useMemo(() => {
    return dataCompras.filter(p => p.estadoPago !== 'pagado' && p.estatusEvento !== 'Pagada');
  }, [dataCompras]);

  // 4. Pagado Devengado
  const dataPagado = useMemo(() => {
    return dataCompras.filter(p => p.estadoPago === 'pagado' || p.estatusEvento === 'Pagada');
  }, [dataCompras]);

  // 5. Alertas y Déficit
  const dataAlertas = useMemo(() => {
    return dataMatriz.filter(l => l.disponibleProyectado <= (l.presupuestoVigente * 0.15));
  }, [dataMatriz]);

  // 6. Gasto Consolidado por Grupo y Renglón Presupuestario
  const dataGastoGrupoRenglon = useMemo(() => {
    const filteredLines = budgetAvailability.filter(l => {
      const matchSearch = searchTerm === '' || 
        l.renglonPresupuestario.includes(searchTerm) || 
        l.nombreRenglon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.grupoPresupuestario.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRenglon = filterRenglon === 'todos' || l.renglonPresupuestario === filterRenglon;
      return matchSearch && matchRenglon;
    });

    const groupMap = new Map<string, {
      grupo: string;
      presupuestoInicial: number;
      modificaciones: number;
      presupuestoVigente: number;
      pagadoQueRebaja: number;
      comprometidoPendiente: number;
      gastoTotal: number;
      disponibleProyectado: number;
      comprasCount: number;
      renglones: Array<BudgetLineItem & { gastoTotal: number; porcentajeEjecucion: number; comprasCount: number }>;
    }>();

    filteredLines.forEach(l => {
      const grupoKey = l.grupoPresupuestario || 'Otros Grupos';
      if (!groupMap.has(grupoKey)) {
        groupMap.set(grupoKey, {
          grupo: grupoKey,
          presupuestoInicial: 0,
          modificaciones: 0,
          presupuestoVigente: 0,
          pagadoQueRebaja: 0,
          comprometidoPendiente: 0,
          gastoTotal: 0,
          disponibleProyectado: 0,
          comprasCount: 0,
          renglones: []
        });
      }

      const g = groupMap.get(grupoKey)!;
      const gastoTotalRenglon = (l.pagadoQueRebaja || 0) + (l.comprometidoPendiente || 0);
      const porcentajeEjec = l.presupuestoVigente > 0 ? (gastoTotalRenglon / l.presupuestoVigente) * 100 : 0;
      const countPurchases = purchases.filter(p => p.renglonPresupuestario === l.renglonPresupuestario).length;

      g.presupuestoInicial += (l.presupuestoInicial || 0);
      g.modificaciones += (l.modificacionesAprobadas || 0);
      g.presupuestoVigente += (l.presupuestoVigente || 0);
      g.pagadoQueRebaja += (l.pagadoQueRebaja || 0);
      g.comprometidoPendiente += (l.comprometidoPendiente || 0);
      g.gastoTotal += gastoTotalRenglon;
      g.disponibleProyectado += (l.disponibleProyectado || 0);
      g.comprasCount += countPurchases;

      g.renglones.push({
        ...l,
        gastoTotal: gastoTotalRenglon,
        porcentajeEjecucion: Math.round(porcentajeEjec * 10) / 10,
        comprasCount: countPurchases
      });
    });

    Array.from(groupMap.values()).forEach(g => {
      g.renglones.sort((a, b) => a.renglonPresupuestario.localeCompare(b.renglonPresupuestario));
    });

    return Array.from(groupMap.values()).sort((a, b) => a.grupo.localeCompare(b.grupo));
  }, [budgetAvailability, purchases, searchTerm, filterRenglon]);

  // Totales de la variante activa
  const variantTotals = useMemo(() => {
    if (activeVariant === 'matriz_consolidada' || activeVariant === 'alertas_deficit' || activeVariant === 'gasto_grupo_renglon') {
      const source = activeVariant === 'matriz_consolidada' ? dataMatriz : 
                     activeVariant === 'alertas_deficit' ? dataAlertas :
                     dataGastoGrupoRenglon.flatMap(g => g.renglones);
      return source.reduce((acc, l) => {
        acc.inicial += l.presupuestoInicial || 0;
        acc.modificaciones += l.modificacionesAprobadas || 0;
        acc.vigente += l.presupuestoVigente || 0;
        acc.pagado += l.pagadoQueRebaja || 0;
        acc.comprometido += l.comprometidoPendiente || 0;
        acc.disponibleReal += l.disponibleReal || 0;
        acc.disponibleProyectado += l.disponibleProyectado || 0;
        acc.totalGasto += ((l.pagadoQueRebaja || 0) + (l.comprometidoPendiente || 0));
        return acc;
      }, { inicial: 0, modificaciones: 0, vigente: 0, pagado: 0, comprometido: 0, disponibleReal: 0, disponibleProyectado: 0, totalGasto: 0 });
    } else {
      const source = activeVariant === 'compras_por_renglon' ? dataCompras :
                     activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado;
      const totalMonto = source.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
      return { totalMonto, cantidad: source.length };
    }
  }, [activeVariant, dataMatriz, dataAlertas, dataGastoGrupoRenglon, dataCompras, dataComprometido, dataPagado]);

  // EXPORTAR A EXCEL SEGÚN VARIANTE
  const handleExportExcel = () => {
    let wsData: any[] = [];
    let filename = '';

    if (activeVariant === 'gasto_grupo_renglon') {
      filename = `Reporte_Gasto_Grupo_Renglon_OJ_${now.toISOString().slice(0, 10)}.xlsx`;
      dataGastoGrupoRenglon.forEach(grp => {
        // Fila de Encabezado / Subtotal del Grupo
        wsData.push({
          'Grupo Presupuestario': grp.grupo.toUpperCase(),
          'Renglón': `SUBTOTAL ${grp.grupo.replace('Grupo ', 'G-')}`,
          'Nombre del Renglón': `(Consolidado de ${grp.renglones.length} renglones)`,
          'Presupuesto Inicial (Q)': grp.presupuestoInicial,
          'Modificaciones (+/-) (Q)': grp.modificaciones,
          'Presupuesto Vigente (Q)': grp.presupuestoVigente,
          'Pagado que Rebaja (Q)': grp.pagadoQueRebaja,
          'Disponible Real (Q)': grp.presupuestoVigente - grp.pagadoQueRebaja,
          'Comprometido Pendiente (Q)': grp.comprometidoPendiente,
          'Disponible Proyectado (Q)': grp.disponibleProyectado,
          '% Usado/Comprometido': grp.presupuestoVigente > 0 ? `${((grp.gastoTotal / grp.presupuestoVigente) * 100).toFixed(2)}%` : '0.00%',
          'Estatus Oficial': grp.disponibleProyectado <= 0 ? 'DÉFICIT' : (grp.gastoTotal > grp.presupuestoVigente * 0.85 ? 'ALERTA' : 'DISPONIBLE')
        });

        // Filas detalladas por renglón
        grp.renglones.forEach(l => {
          wsData.push({
            'Grupo Presupuestario': grp.grupo,
            'Renglón': l.renglonPresupuestario,
            'Nombre del Renglón': l.nombreRenglon,
            'Presupuesto Inicial (Q)': l.presupuestoInicial,
            'Modificaciones (+/-) (Q)': l.modificacionesAprobadas,
            'Presupuesto Vigente (Q)': l.presupuestoVigente,
            'Pagado que Rebaja (Q)': l.pagadoQueRebaja,
            'Disponible Real (Q)': l.disponibleReal,
            'Comprometido Pendiente (Q)': l.comprometidoPendiente,
            'Disponible Proyectado (Q)': l.disponibleProyectado,
            '% Usado/Comprometido': `${l.porcentajeEjecucion}%`,
            'Estatus Oficial': l.estatusDisponibilidad
          });
        });
      });

      if ('vigente' in variantTotals) {
        wsData.push({
          'Grupo Presupuestario': 'TOTALES GENERALES',
          'Renglón': `(${dataGastoGrupoRenglon.length} Grupos)`,
          'Nombre del Renglón': 'SUMATORIA GLOBAL DE GASTO EJECUTADO',
          'Presupuesto Inicial (Q)': Math.round(variantTotals.inicial * 100) / 100,
          'Modificaciones (+/-) (Q)': Math.round(variantTotals.modificaciones * 100) / 100,
          'Presupuesto Vigente (Q)': Math.round(variantTotals.vigente * 100) / 100,
          'Pagado que Rebaja (Q)': Math.round(variantTotals.pagado * 100) / 100,
          'Disponible Real (Q)': Math.round(variantTotals.disponibleReal * 100) / 100,
          'Comprometido Pendiente (Q)': Math.round(variantTotals.comprometido * 100) / 100,
          'Disponible Proyectado (Q)': Math.round(variantTotals.disponibleProyectado * 100) / 100,
          '% Usado/Comprometido': variantTotals.vigente > 0 ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(2)}%` : '0.00%',
          'Estatus Oficial': 'CONSOLIDADO'
        });
      }
    } else if (activeVariant === 'matriz_consolidada' || activeVariant === 'alertas_deficit') {
      const source = activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas;
      filename = activeVariant === 'matriz_consolidada' 
        ? `Matriz_Disponibilidad_OJ_${now.toISOString().slice(0, 10)}.xlsx`
        : `Reporte_Alertas_Presupuestarias_OJ_${now.toISOString().slice(0, 10)}.xlsx`;

      wsData = source.map(l => ({
        'Grupo Presupuestario': l.grupoPresupuestario,
        'Renglón': l.renglonPresupuestario,
        'Nombre del Renglón': l.nombreRenglon,
        'Presupuesto Inicial (Q)': l.presupuestoInicial,
        'Modificaciones (+/-) (Q)': l.modificacionesAprobadas,
        'Presupuesto Vigente (Q)': l.presupuestoVigente,
        'Pagado que Rebaja (Q)': l.pagadoQueRebaja,
        'Disponible Real (Q)': l.disponibleReal,
        'Comprometido Pendiente (Q)': l.comprometidoPendiente,
        'Disponible Proyectado (Q)': l.disponibleProyectado,
        '% Usado/Comprometido': `${l.porcentajeUsadoComprometido}%`,
        'Estatus Oficial': l.estatusDisponibilidad
      }));

      if ('vigente' in variantTotals) {
        wsData.push({
          'Grupo Presupuestario': 'TOTALES CONSOLIDADOS',
          'Renglón': `(${source.length} Renglones)`,
          'Nombre del Renglón': 'SUMATORIA CONSOLIDADA OFICIAL',
          'Presupuesto Inicial (Q)': Math.round(variantTotals.inicial * 100) / 100,
          'Modificaciones (+/-) (Q)': Math.round(variantTotals.modificaciones * 100) / 100,
          'Presupuesto Vigente (Q)': Math.round(variantTotals.vigente * 100) / 100,
          'Pagado que Rebaja (Q)': Math.round(variantTotals.pagado * 100) / 100,
          'Disponible Real (Q)': Math.round(variantTotals.disponibleReal * 100) / 100,
          'Comprometido Pendiente (Q)': Math.round(variantTotals.comprometido * 100) / 100,
          'Disponible Proyectado (Q)': Math.round(variantTotals.disponibleProyectado * 100) / 100,
          '% Usado/Comprometido': variantTotals.vigente > 0 ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(2)}%` : '0.00%',
          'Estatus Oficial': 'CONSOLIDADO'
        });
      }
    } else {
      const source = activeVariant === 'compras_por_renglon' ? dataCompras :
                     activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado;
      filename = activeVariant === 'compras_por_renglon'
        ? `Ejecucion_Compras_F56_Renglon_${now.toISOString().slice(0, 10)}.xlsx`
        : activeVariant === 'comprometido_pendiente'
          ? `Adquisiciones_Comprometido_Pendiente_${now.toISOString().slice(0, 10)}.xlsx`
          : `Adquisiciones_Pagado_Devengado_${now.toISOString().slice(0, 10)}.xlsx`;

      wsData = source.map(p => ({
        'No. Solicitud F56': p.f56e || p.f56 || p.numeroSolicitud || 'S/N',
        'NOG Guatecompras': p.nog || p.nogGuatecompras || 'S/N',
        'Descripción': p.descripcion,
        'Renglón Asignado': p.renglonPresupuestario || '158',
        'Nombre Renglón': p.nombreRenglon || '',
        'Monto (Q)': p.monto,
        'Estado del Gasto': p.estadoPago === 'pagado' ? 'Pagado que Rebaja' : 'Comprometido Pendiente',
        'Estatus Evento': p.estatusEvento || 'Registrada',
        'Proveedor Adjudicado': p.proveedorAdjudicado || 'N/A',
        'Fecha Solicitud': p.fechaSolicitud || '',
        'Fecha Pago/Adjudicación': p.fechaPago || p.fechaAdjudicacion || 'N/A'
      }));
    }

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Oficial');
    XLSX.writeFile(wb, filename);
  };

  // EXPORTAR A PDF INSTITUCIONAL CON JSPDF Y AUTOTABLE
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });

    const titleMap: Record<BudgetReportVariant, string> = {
      matriz_consolidada: 'ESTADO DE DISPONIBILIDAD PRESUPUESTARIA CONSOLIDADO (12 COLUMNAS)',
      compras_por_renglon: 'EJECUCIÓN DE ADQUISICIONES INSTITUCIONALES (FORMA F56-E Y NOG) POR RENGLÓN',
      comprometido_pendiente: 'RELACIÓN DE ADQUISICIONES EN COMPROMETIDO PENDIENTE DE PAGO',
      pagado_devengado: 'INFORME DE ADQUISICIONES PAGADAS / DEVENGADAS CON IMPACTO EN DISPONIBLE REAL',
      alertas_deficit: 'DICTAMEN DE RENGLONES EN ALERTA DE DISPONIBILIDAD Y DÉFICIT PROYECTADO',
      gasto_grupo_renglon: 'REPORTE ANALÍTICO DE GASTO POR GRUPO Y RENGLÓN PRESUPUESTARIO'
    };

    // Encabezado Institucional con Logo Oficial del Organismo Judicial
    try {
      doc.setFillColor(15, 23, 42); // slate-900 institucional
      doc.rect(14, 6, 251, 23, 'F');
      doc.setFillColor(217, 119, 6); // amber-600
      doc.rect(14, 6, 3, 23, 'F');

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(20, 7.5, 19, 19, 2, 2, 'F');
      doc.addImage(OJ_LOGO_DATA_URI, 'PNG', 21, 8.5, 17, 17);

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ORGANISMO JUDICIAL DE GUATEMALA', 43, 12);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text('GERENCIA DE INFORMÁTICA Y TELECOMUNICACIONES • DEPARTAMENTO ADMINISTRATIVO FINANCIERO', 43, 17);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(253, 224, 71); // amber-300
      doc.text(titleMap[activeVariant], 43, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(226, 232, 240);
      doc.text(`Fecha Emisión: ${fechaEmision} | Ejercicio Fiscal: 2026`, 260, 12, { align: 'right' });
      doc.text(`Filtro: ${filterRenglon === 'todos' ? 'Todos los Renglones' : `Renglón ${filterRenglon}`}`, 260, 17, { align: 'right' });
    } catch (e) {
      console.warn('Error al incrustar logo en reporte presupuestario', e);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ORGANISMO JUDICIAL DE GUATEMALA', 14, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('GERENCIA DE INFORMÁTICA Y TELECOMUNICACIONES • DEPARTAMENTO ADMINISTRATIVO FINANCIERO', 14, 16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(titleMap[activeVariant], 14, 22);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Fecha y Hora de Emisión: ${fechaEmision} | Ejercicio Fiscal: 2026`, 14, 26);
      doc.text(`Filtro Aplicado: ${filterRenglon === 'todos' ? 'Todos los Renglones' : `Renglón ${filterRenglon}`}`, 14, 30);
    }

    let head: string[][] = [];
    let body: any[][] = [];
    let foot: any[][] | undefined;

    if (activeVariant === 'gasto_grupo_renglon') {
      head = [[
        'Grupo / Renglón',
        'Descripción Presupuestaria',
        'P. Vigente (Q)',
        'Gasto Pagado (Q)',
        'Comprometido (Q)',
        'Gasto Total (Q)',
        'Disponible (Q)',
        '% Ejec.',
        'Eventos'
      ]];

      dataGastoGrupoRenglon.forEach(grp => {
        body.push([
          `>> ${grp.grupo.replace('Grupo ', 'G-')}`,
          `SUBTOTAL ${grp.grupo.toUpperCase()}`,
          grp.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.pagadoQueRebaja.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.comprometidoPendiente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.gastoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          grp.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          `${grp.presupuestoVigente > 0 ? ((grp.gastoTotal / grp.presupuestoVigente) * 100).toFixed(1) : 0}%`,
          `${grp.comprasCount} f56/nog`
        ]);

        grp.renglones.forEach(l => {
          body.push([
            `    R-${l.renglonPresupuestario}`,
            l.nombreRenglon.slice(0, 38),
            l.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            l.pagadoQueRebaja.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            l.comprometidoPendiente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            l.gastoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            l.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
            `${l.porcentajeEjecucion}%`,
            `${l.comprasCount}`
          ]);
        });
      });

      if ('vigente' in variantTotals) {
        foot = [[
          'TOTAL CONSOLIDADO',
          `Suma de ${dataGastoGrupoRenglon.length} Grupos Presupuestarios`,
          variantTotals.vigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.comprometido.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          (variantTotals.pagado + variantTotals.comprometido).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.vigente > 0 ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1)}%` : '0%',
          'TOTAL'
        ]];
      }
    } else if (activeVariant === 'matriz_consolidada' || activeVariant === 'alertas_deficit') {
      const source = activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas;
      head = [[
        'Renglón',
        'Nombre del Renglón',
        'Grupo',
        'Inicial',
        'Modif. (+/-)',
        'Vigente',
        'Pagado Rebaja',
        'Disponible Real',
        'Comprometido',
        'Disponible Proy.',
        '% Usado',
        'Estatus'
      ]];

      body = source.map(l => [
        l.renglonPresupuestario,
        l.nombreRenglon.slice(0, 30),
        l.grupoPresupuestario.replace('Grupo ', 'G-'),
        l.presupuestoInicial.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        (l.modificacionesAprobadas >= 0 ? '+' : '') + l.modificacionesAprobadas.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.pagadoQueRebaja.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.comprometidoPendiente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        l.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        `${l.porcentajeUsadoComprometido}%`,
        l.estatusDisponibilidad === 'Con Disponibilidad' ? 'DISPONIBLE' : (l.disponibleProyectado <= 0 ? 'DÉFICIT' : 'ALERTA')
      ]);

      if ('vigente' in variantTotals) {
        foot = [[
          'TOTALES',
          `Consolidado (${source.length} Renglones)`,
          '-',
          variantTotals.inicial.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          (variantTotals.modificaciones >= 0 ? '+' : '') + variantTotals.modificaciones.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.vigente.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.comprometido.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          variantTotals.vigente > 0 ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1)}%` : '0%',
          'CONSOLIDADO'
        ]];
      }
    } else {
      const source = activeVariant === 'compras_por_renglon' ? dataCompras :
                     activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado;
      head = [[
        'No. Solicitud F56',
        'NOG Guatecompras',
        'Descripción de la Compra',
        'Renglón',
        'Monto (GTQ)',
        'Estado del Gasto',
        'Estatus Evento',
        'Proveedor Adjudicado'
      ]];

      body = source.map(p => [
        p.f56e || p.f56 || p.numeroSolicitud || 'S/N',
        p.nog || p.nogGuatecompras || 'S/N',
        p.descripcion.slice(0, 45),
        `[${p.renglonPresupuestario || '158'}]`,
        Number(p.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
        p.estadoPago === 'pagado' ? 'Pagado que Rebaja' : 'Comprometido Pendiente',
        p.estatusEvento || 'Registrada',
        (p.proveedorAdjudicado || 'N/A').slice(0, 25)
      ]);

      if ('totalMonto' in variantTotals) {
        foot = [[
          'TOTALES',
          `${source.length} Compras`,
          '-',
          '-',
          variantTotals.totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 }),
          '-',
          '-',
          '-'
        ]];
      }
    }

    autoTable(doc, {
      startY: 33,
      head,
      body,
      foot,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // Firmas Institucionales de Responsabilidad
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`Página ${i} de ${pageCount} • Sistema Integrado de Control de Adquisiciones y Presupuesto GIT - Organismo Judicial`, 14, 205);

      if (i === pageCount) {
        doc.line(20, 185, 80, 185);
        doc.text('Elaborado: Analista Financiero GIT', 20, 189);

        doc.line(110, 185, 170, 185);
        doc.text('Revisado: Encargado de Compras IT', 110, 189);

        doc.line(200, 185, 260, 185);
        doc.text('Autorizado: Gerente de Informática', 200, 189);
      }
    }

    doc.save(`Reporte_Presupuesto_OJ_${activeVariant}_${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4" id="budget-reports-module">
      
      {/* Selector de Variantes de Reporte */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              Módulo de Reportes Financieros y Variantes de Auditoría Presupuestaria
            </h3>
            <p className="text-xs text-slate-500">
              Genere informes normativos, matrices cruzadas y análisis de saldos descargables en Excel y PDF con firmas institucionales.
            </p>
          </div>

          {/* Acciones Globales de Exportación */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Descargar datos actuales en Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Generar dictamen oficial en PDF con membrete y firmas"
            >
              <FileText className="w-3.5 h-3.5 text-blue-200" />
              <span>Generar PDF</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Imprimir vista actual"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Botones de Variantes */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveVariant('matriz_consolidada')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'matriz_consolidada'
                ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-blue-700 uppercase font-mono font-black">Variante 1</span>
            <span>Matriz 12 Columnas</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Disponibilidad total</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('compras_por_renglon')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'compras_por_renglon'
                ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-blue-700 uppercase font-mono font-black">Variante 2</span>
            <span>Compras F56 por Renglón</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Cruce F56 + NOG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('comprometido_pendiente')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'comprometido_pendiente'
                ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-amber-700 uppercase font-mono font-black">Variante 3</span>
            <span>Comprometido en Trámite</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Afecta Proyectado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('pagado_devengado')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'pagado_devengado'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-emerald-700 uppercase font-mono font-black">Variante 4</span>
            <span>Pagado / Devengado</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Rebaja Saldo Real</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('alertas_deficit')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'alertas_deficit'
                ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-rose-700 uppercase font-mono font-black">Variante 5</span>
            <span>Alertas y Déficit</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Sobregiro proyectado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVariant('gasto_grupo_renglon')}
            className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
              activeVariant === 'gasto_grupo_renglon'
                ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-[10px] text-purple-700 uppercase font-mono font-black">Variante 6</span>
            <span>Gasto por Grupo/Renglón</span>
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Analítico jerárquico</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por renglón, F56, NOG o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={filterRenglon}
            onChange={(e) => setFilterRenglon(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="todos">Todos los Renglones</option>
            {availableRenglones.map(r => (
              <option key={r.codigo} value={r.codigo}>
                Renglón {r.codigo} - {r.nombre.slice(0, 30)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Datos de la Variante */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeVariant === 'gasto_grupo_renglon' ? (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Grupo / Renglón</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Descripción Presupuestaria</th>
                  <th className="px-3 py-2.5 text-right">P. Vigente (Q)</th>
                  <th className="px-3 py-2.5 text-right">Pagado Dev. (Q)</th>
                  <th className="px-3 py-2.5 text-right">Comprometido (Q)</th>
                  <th className="px-3 py-2.5 text-right">Total Gasto (Q)</th>
                  <th className="px-3 py-2.5 text-right">Disponible (Q)</th>
                  <th className="px-3 py-2.5 text-center">% Ejecución</th>
                  <th className="px-3 py-2.5 text-center">Compras</th>
                  <th className="px-3 py-2.5 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataGastoGrupoRenglon.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      No se encontraron registros de gasto para los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  dataGastoGrupoRenglon.map((grp) => {
                    const ejecucionGrupo = grp.presupuestoVigente > 0 
                      ? Math.min(100, Math.round((grp.gastoTotal / grp.presupuestoVigente) * 1000) / 10) 
                      : 0;

                    return (
                      <React.Fragment key={grp.grupo}>
                        {/* Fila Encabezado de Grupo */}
                        <tr className="bg-slate-100/95 font-bold border-t-2 border-slate-300 text-slate-900">
                          <td className="px-3 py-2.5 font-mono text-blue-950 uppercase text-[11px]">
                            {grp.grupo}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">
                            Subtotal Grupo ({grp.renglones.length} renglones)
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatQuetzales(grp.presupuestoVigente)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-blue-900">
                            {formatQuetzales(grp.pagadoQueRebaja)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-900">
                            {formatQuetzales(grp.comprometidoPendiente)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-black text-purple-950 bg-purple-50/50">
                            {formatQuetzales(grp.gastoTotal)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono font-bold ${
                            grp.disponibleProyectado <= 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {formatQuetzales(grp.disponibleProyectado)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-12 bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${ejecucionGrupo > 85 ? 'bg-amber-500' : 'bg-blue-600'}`} 
                                  style={{ width: `${ejecucionGrupo}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] font-bold">{ejecucionGrupo}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                            {grp.comprasCount}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              grp.disponibleProyectado <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {grp.disponibleProyectado <= 0 ? 'Déficit' : 'En Rango'}
                            </span>
                          </td>
                        </tr>

                        {/* Filas de Renglones del Grupo */}
                        {grp.renglones.map((line) => (
                          <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-1.5 pl-6 font-mono font-bold text-blue-900 whitespace-nowrap">
                              R-{line.renglonPresupuestario}
                            </td>
                            <td className="px-3 py-1.5 font-medium text-slate-800 max-w-xs truncate" title={line.nombreRenglon}>
                              {line.nombreRenglon}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                              {formatQuetzales(line.presupuestoVigente)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-blue-800">
                              {formatQuetzales(line.pagadoQueRebaja)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-amber-800">
                              {formatQuetzales(line.comprometidoPendiente)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                              {formatQuetzales(line.gastoTotal)}
                            </td>
                            <td className={`px-3 py-1.5 text-right font-mono font-semibold ${
                              line.disponibleProyectado <= 0 ? 'text-rose-600' : 'text-slate-900'
                            }`}>
                              {formatQuetzales(line.disponibleProyectado)}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                line.porcentajeEjecucion > 85 ? 'bg-amber-100 text-amber-800' : 'text-slate-700'
                              }`}>
                                {line.porcentajeEjecucion}%
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono text-slate-600">
                              {line.comprasCount}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                line.estatusDisponibilidad === 'Con Disponibilidad'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}>
                                {line.estatusDisponibilidad}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-900 font-black text-white text-xs">
                <tr>
                  <td colSpan={2} className="px-3 py-3 text-right uppercase tracking-wider">
                    Total Consolidado ({dataGastoGrupoRenglon.length} Grupos Presupuestarios):
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    {formatQuetzales('vigente' in variantTotals ? variantTotals.vigente : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-blue-300">
                    {formatQuetzales('pagado' in variantTotals ? variantTotals.pagado : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-amber-300">
                    {formatQuetzales('comprometido' in variantTotals ? variantTotals.comprometido : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-emerald-300">
                    {formatQuetzales('totalGasto' in variantTotals ? variantTotals.totalGasto : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    {formatQuetzales('disponibleProyectado' in variantTotals ? variantTotals.disponibleProyectado : 0)}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-amber-300">
                    {'vigente' in variantTotals && variantTotals.vigente > 0 
                      ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1)}%` 
                      : '0%'}
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-center text-slate-400 font-medium text-[10px]">
                    Presupuesto 2026
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : activeVariant === 'matriz_consolidada' || activeVariant === 'alertas_deficit' ? (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Renglón</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Nombre del Renglón</th>
                  <th className="px-3 py-2.5">Grupo</th>
                  <th className="px-3 py-2.5 text-right">Inicial</th>
                  <th className="px-3 py-2.5 text-right">Modificaciones</th>
                  <th className="px-3 py-2.5 text-right">Vigente</th>
                  <th className="px-3 py-2.5 text-right">Pagado Rebaja</th>
                  <th className="px-3 py-2.5 text-right">Disponible Real</th>
                  <th className="px-3 py-2.5 text-right">Comprometido</th>
                  <th className="px-3 py-2.5 text-right">Disponible Proy.</th>
                  <th className="px-3 py-2.5 text-center">% Usado</th>
                  <th className="px-3 py-2.5 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas).length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                      No se encontraron renglones con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  (activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas).map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-blue-900 whitespace-nowrap">
                        {line.renglonPresupuestario}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900 max-w-xs truncate" title={line.nombreRenglon}>
                        {line.nombreRenglon}
                      </td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                        {line.grupoPresupuestario.replace('Grupo ', 'G-')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">
                        {formatQuetzales(line.presupuestoInicial)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                        {line.modificacionesAprobadas >= 0 ? '+' : ''}{formatQuetzales(line.modificacionesAprobadas)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-blue-950 bg-blue-50/30">
                        {formatQuetzales(line.presupuestoVigente)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-blue-800">
                        {formatQuetzales(line.pagadoQueRebaja)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/20">
                        {formatQuetzales(line.disponibleReal)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-amber-700">
                        {formatQuetzales(line.comprometidoPendiente)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900 bg-amber-50/30">
                        <span className={line.disponibleProyectado >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {formatQuetzales(line.disponibleProyectado)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                        {line.porcentajeUsadoComprometido}%
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          line.disponibleProyectado <= 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : line.disponibleProyectado < (line.presupuestoVigente * 0.15)
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {line.estatusDisponibilidad}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-right uppercase font-black text-slate-900 tracking-wider">
                    Totales Consolidados ({(activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas).length} Renglones):
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap">
                    {formatQuetzales('inicial' in variantTotals ? variantTotals.inicial : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap text-slate-800">
                    {'modificaciones' in variantTotals && variantTotals.modificaciones >= 0 ? '+' : ''}
                    {formatQuetzales('modificaciones' in variantTotals ? variantTotals.modificaciones : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-blue-950 bg-blue-100/60 whitespace-nowrap">
                    {formatQuetzales('vigente' in variantTotals ? variantTotals.vigente : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-blue-800 whitespace-nowrap">
                    {formatQuetzales('pagado' in variantTotals ? variantTotals.pagado : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-emerald-900 bg-emerald-100/40 whitespace-nowrap">
                    {formatQuetzales('disponibleReal' in variantTotals ? variantTotals.disponibleReal : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                    {formatQuetzales('comprometido' in variantTotals ? variantTotals.comprometido : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black bg-amber-100/60 whitespace-nowrap">
                    <span className={'disponibleProyectado' in variantTotals && variantTotals.disponibleProyectado >= 0 ? 'text-emerald-800' : 'text-rose-700'}>
                      {formatQuetzales('disponibleProyectado' in variantTotals ? variantTotals.disponibleProyectado : 0)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold whitespace-nowrap">
                    {'vigente' in variantTotals && variantTotals.vigente > 0
                      ? `${(((variantTotals.pagado + variantTotals.comprometido) / variantTotals.vigente) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap text-[11px] font-bold text-slate-600">
                    {(activeVariant === 'matriz_consolidada' ? dataMatriz : dataAlertas).filter(l => l.disponibleProyectado > 0).length} con saldo
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">No. Solicitud F56</th>
                  <th className="px-3 py-2.5">NOG Guatecompras</th>
                  <th className="px-4 py-2.5 min-w-[200px]">Descripción de la Adquisición</th>
                  <th className="px-3 py-2.5">Renglón</th>
                  <th className="px-3 py-2.5 text-right">Monto (GTQ)</th>
                  <th className="px-3 py-2.5 text-center">Estado del Gasto</th>
                  <th className="px-3 py-2.5 text-center">Estatus Ficha</th>
                  <th className="px-3 py-2.5">Proveedor Adjudicado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeVariant === 'compras_por_renglon' ? dataCompras :
                  activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No se encontraron adquisiciones con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  (activeVariant === 'compras_por_renglon' ? dataCompras :
                   activeVariant === 'comprometido_pendiente' ? dataComprometido : dataPagado).map((purchase) => {
                    const isPaid = purchase.estadoPago === 'pagado' || purchase.estatusEvento === 'Pagada';
                    return (
                      <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {purchase.f56e || purchase.f56 || purchase.numeroSolicitud || 'S/N'}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-blue-900 whitespace-nowrap">
                          {purchase.nog || purchase.nogGuatecompras || 'S/N'}
                        </td>
                        <td className="px-4 py-2 text-slate-800 font-medium max-w-sm truncate" title={purchase.descripcion}>
                          {purchase.descripcion}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                            {purchase.renglonPresupuestario || '158'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatQuetzales(purchase.monto)}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isPaid ? 'Pagado que Rebaja' : 'Comprometido Pendiente'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {purchase.estatusEvento || 'Registrada'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={purchase.proveedorAdjudicado || 'N/A'}>
                          {purchase.proveedorAdjudicado || 'No Adjudicado'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-right uppercase font-black text-slate-900 tracking-wider">
                    Total Acumulado ({'cantidad' in variantTotals ? variantTotals.cantidad : 0} Adquisiciones):
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-blue-900 whitespace-nowrap">
                    {formatQuetzales('totalMonto' in variantTotals ? variantTotals.totalMonto : 0)}
                  </td>
                  <td colSpan={3} className="px-3 py-3 text-left text-slate-500 font-semibold text-[11px]">
                    Monto total calculado para la categoría activa
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
