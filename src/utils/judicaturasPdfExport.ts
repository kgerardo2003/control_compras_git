import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JudicaturaRecord } from '../types';
import { formatDate, formatDateTime } from './formatters';
import { OJ_LOGO_DATA_URI } from './ojLogoAsset';

export interface ExportJudicaturasPDFOptions {
  judicaturas: JudicaturaRecord[];
  title?: string;
  subtitle?: string;
  includeTable?: boolean;
  includeGantt?: boolean;
  includeStatusMatrix?: boolean;
  groupByRamo?: boolean;
  filterInfo?: {
    search?: string;
    ramo?: string;
    equipamiento?: string;
    estadoInauguracion?: string;
  };
  currentUser?: {
    nombreCompleto?: string;
    username?: string;
    rol?: string;
    cargo?: string;
  } | null;
  filenamePrefix?: string;
}

interface TimelineWeek {
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  label: string;
  shortDateLabel: string;
}

/**
 * Calcula las semanas para el Diagrama de Gantt basándose en las fechas
 * de adecuaciones e inauguración de todas las judicaturas.
 */
function computeTimelineWeeks(judicaturas: JudicaturaRecord[]): TimelineWeek[] {
  if (judicaturas.length === 0) {
    const today = new Date();
    const monday = new Date(today);
    const day = monday.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const weeks: TimelineWeek[] = [];
    const cur = new Date(monday);
    for (let i = 1; i <= 8; i++) {
      const wStart = new Date(cur);
      const wEnd = new Date(cur);
      wEnd.setDate(wEnd.getDate() + 6);
      weeks.push({
        weekIndex: i,
        startDate: wStart,
        endDate: wEnd,
        label: `Sem #${i}`,
        shortDateLabel: `${String(wStart.getDate()).padStart(2, '0')}/${String(wStart.getMonth() + 1).padStart(2, '0')}`,
      });
      cur.setDate(cur.getDate() + 7);
    }
    return weeks;
  }

  let minDateMs = Infinity;
  let maxDateMs = -Infinity;

  judicaturas.forEach((j) => {
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

  const weeks: TimelineWeek[] = [];
  const current = new Date(startWeek);
  let index = 1;

  // Límite razonable de semanas para visualización horizontal clara (máx 15 semanas)
  while (current.getTime() <= maxDateMs + 7 * 24 * 60 * 60 * 1000 && weeks.length < 15) {
    const wStart = new Date(current);
    const wEnd = new Date(current);
    wEnd.setDate(wEnd.getDate() + 6);

    const startDayStr = String(wStart.getDate()).padStart(2, '0');
    const startMonthStr = String(wStart.getMonth() + 1).padStart(2, '0');
    const endDayStr = String(wEnd.getDate()).padStart(2, '0');
    const endMonthStr = String(wEnd.getMonth() + 1).padStart(2, '0');

    weeks.push({
      weekIndex: index,
      startDate: wStart,
      endDate: wEnd,
      label: `Sem #${index}`,
      shortDateLabel: `${startDayStr}/${startMonthStr} - ${endDayStr}/${endMonthStr}`,
    });

    current.setDate(current.getDate() + 7);
    index++;
  }

  return weeks;
}

/**
 * Dibuja la cabecera institucional completa del Organismo Judicial en CADA página del PDF.
 * Incluye el logotipo oficial en PNG de alta resolución, títulos oficiales,
 * código de auditoría, fecha/hora y número de página.
 */
function drawPageHeader(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  meta: {
    auditCode: string;
    dateStr: string;
    timeStr: string;
    currentUser?: { nombreCompleto?: string; username?: string; cargo?: string; rol?: string } | null;
    totalRecords: number;
    title: string;
  }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 12;
  const bannerY = 8;
  const bannerHeight = 22;

  // 1. Franja institucional superior (Azul Oficial #0A0A69)
  doc.setFillColor(10, 10, 105); // #0A0A69
  doc.rect(marginX, bannerY, pageWidth - marginX * 2, bannerHeight, 'F');

  // Borde sutil inferior de contraste sin cinta amarilla
  doc.setFillColor(30, 41, 130);
  doc.rect(marginX, bannerY + bannerHeight - 0.5, pageWidth - marginX * 2, 0.5, 'F');

  // 2. Contenedor del Logotipo Oficial del Organismo Judicial
  try {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX + 5.5, bannerY + 2.5, 17, 17, 2, 2, 'F');
    // Logotipo Oficial incrustado con alta fidelidad
    doc.addImage(OJ_LOGO_DATA_URI, 'PNG', marginX + 6.5, bannerY + 3.5, 15, 15);
  } catch (err) {
    console.warn('Advertencia al incrustar el logotipo del OJ en la cabecera:', err);
  }

  // 3. Textos Institucionales (Blancos de alto contraste)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ORGANISMO JUDICIAL DE GUATEMALA', marginX + 27, bannerY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GERENCIA DE INFORMÁTICA', marginX + 27, bannerY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(224, 231, 255); // Indigo-100 alto contraste
  doc.text('SISTEMA INTEGRAL DE CONTROL DE JUDICATURAS POR INAUGURAR Y ADECUACIONES TIC', marginX + 27, bannerY + 16);

  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`CÓDIGO DE AUDITORÍA: ${meta.auditCode}  •  ${meta.totalRecords} JUDICATURAS EN CONTROL`, marginX + 27, bannerY + 20);

  // 4. Metadatos Institucionales a la derecha (Texto blanco nítido)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(238, 242, 255);
  doc.text(`Emisión: ${meta.dateStr} ${meta.timeStr}`, pageWidth - marginX - 5, bannerY + 6.5, { align: 'right' });

  const usuario = meta.currentUser?.nombreCompleto || meta.currentUser?.username || 'Usuario Autorizado';
  doc.text(`Generado por: ${usuario}`, pageWidth - marginX - 5, bannerY + 11.5, { align: 'right' });

  // Paginador en cabecera
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - marginX - 5, bannerY + 17.5, { align: 'right' });
}

/**
 * Dibuja el pie de página institucional en CADA página del PDF.
 */
function drawPageFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  meta: { auditCode: string }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);

  // Línea divisoria
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);

  // Leyenda de validez oficial
  doc.text(
    'Reporte Oficial Consolidado • Gerencia de Informática • Organismo Judicial de Guatemala',
    marginX,
    pageHeight - 5
  );

  doc.setFont('courier', 'normal');
  doc.text(
    `Auditoría: ${meta.auditCode} • Pág. ${pageNumber} de ${totalPages}`,
    pageWidth - marginX,
    pageHeight - 5,
    { align: 'right' }
  );
}

/**
 * Genera el Reporte Consolidado en PDF para el Módulo de Judicaturas por Inaugurar.
 * Incluye:
 * 1. Cabecera institucional con el logotipo oficial del Organismo Judicial en TODAS las páginas.
 * 2. Resumen ejecutivo con métricas de adecuación, cámaras y estados.
 * 3. Tabla detallada de judicaturas con el estado de equipamiento TIC y de inauguración de cada una.
 * 4. Diagrama de Gantt cronológico detallado por semanas (con barras de adecuación e hitos de apertura).
 * 5. Matriz de estado de infraestructura técnica (PC, Audio, Red, Enlace de Datos).
 */
export function generateConsolidatedJudicaturasPDF(options: ExportJudicaturasPDFOptions): string {
  const {
    judicaturas,
    title = 'REPORTE CONSOLIDADO DE CONTROL DE JUDICATURAS POR INAUGURAR',
    subtitle = 'Gerencia de Informática • Seguimiento Integral de Adecuaciones, Infraestructura TIC y Cronograma de Apertura',
    includeTable = true,
    includeGantt = true,
    includeStatusMatrix = true,
    groupByRamo = true,
    filterInfo,
    currentUser,
    filenamePrefix = 'Reporte_Consolidado_Judicaturas_OJ',
  } = options;

  // Formato horizontal (landscape) A4 para acomodar tablas y cronograma Gantt sin pérdida de detalle
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 12;

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const auditCode = `OJ-GIT-JUD-${now.getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Espacio superior reservado para la cabecera (banner de 22mm + margen)
  let currentY = 34;

  // =========================================================================
  // SECCIÓN 1: RESUMEN EJECUTIVO Y TABLA DE JUDICATURAS CON ESTADO
  // =========================================================================
  if (includeTable) {
    // Título y Subtítulo de la primera página
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title, marginX, currentY);

    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, marginX, currentY);

    currentY += 4.5;

    // Filtros aplicados si existen
    if (filterInfo && (filterInfo.search || filterInfo.ramo || filterInfo.equipamiento || filterInfo.estadoInauguracion)) {
      const filters = [];
      if (filterInfo.search) filters.push(`Búsqueda: "${filterInfo.search}"`);
      if (filterInfo.ramo && filterInfo.ramo !== 'Todos') {
        const rName = filterInfo.ramo === 'Penal' ? 'Cámara Penal' : filterInfo.ramo === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos';
        filters.push(`Cámara: ${rName}`);
      }
      if (filterInfo.equipamiento && filterInfo.equipamiento !== 'Todos') {
        filters.push(`Equipamiento TIC: ${filterInfo.equipamiento}`);
      }
      if (filterInfo.estadoInauguracion && filterInfo.estadoInauguracion !== 'Todos') {
        filters.push(`Estado Inauguración: ${filterInfo.estadoInauguracion}`);
      }

      if (filters.length > 0) {
        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, currentY, pageWidth - marginX * 2, 5.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Filtros Aplicados: ${filters.join('   •   ')}`, marginX + 3, currentY + 3.8);
        currentY += 7.5;
      }
    }

    // Helper para estatus estandarizado
    const getJudEstatus = (j: JudicaturaRecord) =>
      j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');

    // Desglose detallado por Cámara y Estatus
    const penalJudicaturas = judicaturas.filter((j) => j.tipoRamo === 'Penal');
    const civilJudicaturas = judicaturas.filter((j) => j.tipoRamo === 'Civil');
    const amparosJudicaturas = judicaturas.filter((j) => j.tipoRamo === 'Amparos');

    const penalInaug = penalJudicaturas.filter((j) => getJudEstatus(j) === 'Inaugurado').length;
    const penalPend = penalJudicaturas.filter((j) => getJudEstatus(j) === 'Pendiente Fecha').length;
    const penalReprog = penalJudicaturas.filter((j) => getJudEstatus(j) === 'Reprogramado').length;
    const penalFin = penalJudicaturas.filter((j) => getJudEstatus(j) === 'Finalizado').length;
    const penalTras = penalJudicaturas.filter((j) => getJudEstatus(j) === 'Traslado').length;
    const penalEquip100 = penalJudicaturas.filter(
      (j) =>
        j.equipoComputo === 'Si' &&
        j.equipoAudio === 'Si' &&
        j.cableadoEstructurado === 'Si' &&
        j.enlaceDatos === 'Si'
    ).length;

    const civilInaug = civilJudicaturas.filter((j) => getJudEstatus(j) === 'Inaugurado').length;
    const civilPend = civilJudicaturas.filter((j) => getJudEstatus(j) === 'Pendiente Fecha').length;
    const civilReprog = civilJudicaturas.filter((j) => getJudEstatus(j) === 'Reprogramado').length;
    const civilFin = civilJudicaturas.filter((j) => getJudEstatus(j) === 'Finalizado').length;
    const civilTras = civilJudicaturas.filter((j) => getJudEstatus(j) === 'Traslado').length;
    const civilEquip100 = civilJudicaturas.filter(
      (j) =>
        j.equipoComputo === 'Si' &&
        j.equipoAudio === 'Si' &&
        j.cableadoEstructurado === 'Si' &&
        j.enlaceDatos === 'Si'
    ).length;

    const amparosInaug = amparosJudicaturas.filter((j) => getJudEstatus(j) === 'Inaugurado').length;
    const amparosPend = amparosJudicaturas.filter((j) => getJudEstatus(j) === 'Pendiente Fecha').length;
    const amparosReprog = amparosJudicaturas.filter((j) => getJudEstatus(j) === 'Reprogramado').length;
    const amparosFin = amparosJudicaturas.filter((j) => getJudEstatus(j) === 'Finalizado').length;
    const amparosTras = amparosJudicaturas.filter((j) => getJudEstatus(j) === 'Traslado').length;
    const amparosEquip100 = amparosJudicaturas.filter(
      (j) =>
        j.equipoComputo === 'Si' &&
        j.equipoAudio === 'Si' &&
        j.cableadoEstructurado === 'Si' &&
        j.enlaceDatos === 'Si'
    ).length;

    const totalInaug = penalInaug + civilInaug + amparosInaug;
    const totalPend = penalPend + civilPend + amparosPend;
    const totalReprog = penalReprog + civilReprog + amparosReprog;
    const totalFin = penalFin + civilFin + amparosFin;
    const totalTras = penalTras + civilTras + amparosTras;
    const totalEquip100 = penalEquip100 + civilEquip100 + amparosEquip100;

    // Tarjetas de Métricas Resumen
    const summaryCards = [
      { label: 'TOTAL JUDICATURAS', val: `${judicaturas.length}`, color: [15, 23, 42] },
      { label: 'INAUGURADOS', val: `${totalInaug}`, color: [4, 120, 87] },
      { label: 'PENDIENTE FECHA', val: `${totalPend}`, color: [217, 119, 6] },
      { label: 'REPROGRAMADOS', val: `${totalReprog}`, color: [225, 29, 72] },
      { label: 'FINALIZADOS', val: `${totalFin}`, color: [29, 78, 216] },
      { label: 'TRASLADO', val: `${totalTras}`, color: [109, 40, 217] },
      { label: 'TIC 100% LISTO', val: `${totalEquip100}`, color: [13, 148, 136] },
    ];

    const cardWidth = (pageWidth - marginX * 2 - 18) / 7;
    const cardHeight = 11;

    summaryCards.forEach((c, idx) => {
      const xPos = marginX + idx * (cardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(xPos, currentY, cardWidth, cardHeight, 'FD');

      doc.setFillColor(c.color[0], c.color[1], c.color[2]);
      doc.rect(xPos, currentY, 2, cardHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.label, xPos + 3.5, currentY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(c.color[0], c.color[1], c.color[2]);
      doc.text(c.val, xPos + 3.5, currentY + 8.8);
    });

    currentY += cardHeight + 4;

    // Cuadro Comparativo Ejecutivo por Ramo
    autoTable(doc, {
      startY: currentY,
      margin: { top: 34, left: marginX, right: marginX, bottom: 14 },
      head: [
        [
          'Ramo Jurisdiccional',
          'Total Sedes',
          'Inauguradas',
          'Pendiente Fecha',
          'Reprogramadas',
          'Finalizadas',
          'Traslado',
          'TIC 100% Listo',
          '% Cumplimiento TIC',
        ],
      ],
      body: [
        [
          'CÁMARA PENAL',
          String(penalJudicaturas.length),
          String(penalInaug),
          String(penalPend),
          String(penalReprog),
          String(penalFin),
          String(penalTras),
          String(penalEquip100),
          `${penalJudicaturas.length > 0 ? Math.round((penalEquip100 / penalJudicaturas.length) * 100) : 0}%`,
        ],
        [
          'CÁMARA CIVIL',
          String(civilJudicaturas.length),
          String(civilInaug),
          String(civilPend),
          String(civilReprog),
          String(civilFin),
          String(civilTras),
          String(civilEquip100),
          `${civilJudicaturas.length > 0 ? Math.round((civilEquip100 / civilJudicaturas.length) * 100) : 0}%`,
        ],
        [
          'CÁMARA AMPAROS',
          String(amparosJudicaturas.length),
          String(amparosInaug),
          String(amparosPend),
          String(amparosReprog),
          String(amparosFin),
          String(amparosTras),
          String(amparosEquip100),
          `${amparosJudicaturas.length > 0 ? Math.round((amparosEquip100 / amparosJudicaturas.length) * 100) : 0}%`,
        ],
        [
          'TOTAL CONSOLIDADO',
          String(judicaturas.length),
          String(totalInaug),
          String(totalPend),
          String(totalReprog),
          String(totalFin),
          String(totalTras),
          String(totalEquip100),
          `${judicaturas.length > 0 ? Math.round((totalEquip100 / judicaturas.length) * 100) : 0}%`,
        ],
      ],
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 1.5,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [10, 10, 105], // #0A0A69
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === 0 && data.column.index === 0) {
          data.cell.styles.textColor = [109, 40, 217]; // Purple
        }
        if (data.section === 'body' && data.row.index === 1 && data.column.index === 0) {
          data.cell.styles.textColor = [29, 78, 216]; // Blue
        }
        if (data.section === 'body' && data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [15, 23, 42];
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Función auxiliar para renderizar tabla de un Ramo específico
    const renderRamoJudicaturasTable = (
      ramoTitle: string,
      ramoBadgeText: string,
      list: JudicaturaRecord[],
      headerBg: [number, number, number]
    ) => {
      if (list.length === 0) return;

      // Si queda muy poco espacio vertical, saltar página
      if (currentY > pageHeight - 38) {
        doc.addPage('a4', 'landscape');
        currentY = 34;
      }

      // Banner institucional de separación de Ramo
      doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
      doc.rect(marginX, currentY, pageWidth - marginX * 2, 6.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(ramoTitle, marginX + 3.5, currentY + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(224, 231, 255);
      doc.text(ramoBadgeText, pageWidth - marginX - 3.5, currentY + 4.3, { align: 'right' });

      currentY += 6.5;

      const tableData = list.map((j, index) => {
        const adecuacionesText = `${formatDate(j.fechaInicioAdecuaciones)} al ${formatDate(j.fechaFinAdecuaciones)}`;
        const estatus = getJudEstatus(j);
        const fechaInaug = j.fechaInauguracion ? formatDate(j.fechaInauguracion) : 'Por definir';

        const isAllReady =
          j.equipoComputo === 'Si' &&
          j.equipoAudio === 'Si' &&
          j.cableadoEstructurado === 'Si' &&
          j.enlaceDatos === 'Si';

        const estadoEquip = isAllReady ? '100% Completo' : 'En Proceso';

        const obsCount = (j.observaciones || []).length;
        const latestObs =
          j.observaciones && j.observaciones.length > 0
            ? j.observaciones[0].texto
            : 'Sin incidencias reportadas';
        const truncatedObs = latestObs.length > 75 ? `${latestObs.substring(0, 72)}...` : latestObs;

        return [
          String(index + 1),
          j.nombreJudicatura,
          adecuacionesText,
          j.equipoComputo,
          j.equipoAudio,
          j.cableadoEstructurado,
          j.enlaceDatos,
          estadoEquip,
          estatus,
          fechaInaug,
          `[#${obsCount}] ${truncatedObs}`,
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { top: 34, left: marginX, right: marginX, bottom: 14 },
        head: [
          [
            '#',
            'Nombre de la Judicatura',
            'Período Adecuaciones',
            'PC',
            'Audio',
            'Red',
            'Enlace',
            'Estado TIC',
            'Estatus',
            'Fecha',
            'Última Acción / Bitácora',
          ],
        ],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 1.6,
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          fillColor: headerBg,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 6.5,
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 7 },
          1: { halign: 'left', cellWidth: 62, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 30 },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'center', cellWidth: 10 },
          6: { halign: 'center', cellWidth: 11 },
          7: { halign: 'center', cellWidth: 20 },
          8: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
          9: { halign: 'center', cellWidth: 20 },
          10: { halign: 'left', cellWidth: 'auto' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell: (data) => {
          // Columnas Equipamiento TIC
          if (data.section === 'body' && [3, 4, 5, 6].includes(data.column.index)) {
            const val = String(data.cell.raw);
            data.cell.styles.fontStyle = 'bold';
            if (val === 'Si') {
              data.cell.styles.textColor = [4, 120, 87];
            } else {
              data.cell.styles.textColor = [225, 29, 72];
            }
          }
          // Estado TIC
          if (data.section === 'body' && data.column.index === 7) {
            const val = String(data.cell.raw);
            data.cell.styles.fontStyle = 'bold';
            if (val.includes('100%')) {
              data.cell.styles.textColor = [4, 120, 87];
            } else {
              data.cell.styles.textColor = [180, 83, 9];
            }
          }
          // Estatus
          if (data.section === 'body' && data.column.index === 8) {
            const val = String(data.cell.raw);
            data.cell.styles.fontStyle = 'bold';
            if (val === 'Inaugurado') {
              data.cell.styles.textColor = [4, 120, 87];
            } else if (val === 'Finalizado') {
              data.cell.styles.textColor = [29, 78, 216];
            } else if (val === 'Traslado') {
              data.cell.styles.textColor = [109, 40, 217];
            } else if (val === 'Reprogramado') {
              data.cell.styles.textColor = [225, 29, 72];
            } else {
              data.cell.styles.textColor = [180, 83, 9];
            }
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    };

    if (groupByRamo) {
      // 1. Sección Cámara Penal
      if (penalJudicaturas.length > 0) {
        renderRamoJudicaturasTable(
          'SECCIÓN 1: CÁMARA PENAL',
          `${penalJudicaturas.length} Judicaturas • Inauguradas: ${penalInaug} | Pendiente: ${penalPend} | Reprog: ${penalReprog} | Finalizadas: ${penalFin} | Traslado: ${penalTras}`,
          penalJudicaturas,
          [88, 28, 135] // Purple-900
        );
      }

      // 2. Sección Cámara Civil
      if (civilJudicaturas.length > 0) {
        renderRamoJudicaturasTable(
          'SECCIÓN 2: CÁMARA CIVIL',
          `${civilJudicaturas.length} Judicaturas • Inauguradas: ${civilInaug} | Pendiente: ${civilPend} | Reprog: ${civilReprog} | Finalizadas: ${civilFin} | Traslado: ${civilTras}`,
          civilJudicaturas,
          [30, 58, 138] // Blue-900
        );
      }

      // 3. Sección Cámara Amparos
      if (amparosJudicaturas.length > 0) {
        renderRamoJudicaturasTable(
          'SECCIÓN 3: CÁMARA AMPAROS',
          `${amparosJudicaturas.length} Judicaturas • Inauguradas: ${amparosInaug} | Pendiente: ${amparosPend} | Reprog: ${amparosReprog} | Finalizadas: ${amparosFin} | Traslado: ${amparosTras}`,
          amparosJudicaturas,
          [6, 78, 59] // Emerald-900
        );
      }

      // 4. Otros Ramos si existieran
      const otrosRamos = judicaturas.filter(j => j.tipoRamo !== 'Penal' && j.tipoRamo !== 'Civil' && j.tipoRamo !== 'Amparos');
      if (otrosRamos.length > 0) {
        renderRamoJudicaturasTable(
          'SECCIÓN 4: OTROS RAMOS JURISDICCIONALES',
          `${otrosRamos.length} Judicaturas Registradas`,
          otrosRamos,
          [15, 23, 42]
        );
      }
    } else {
      // Renderizado unificado estándar
      const unifiedData = judicaturas.map((j, index) => {
        const camaraText = j.tipoRamo === 'Penal' ? 'Cámara Penal' : j.tipoRamo === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos';
        const adecuacionesText = `${formatDate(j.fechaInicioAdecuaciones)} al ${formatDate(j.fechaFinAdecuaciones)}`;
        const estatus = getJudEstatus(j);
        const fechaInaug = j.fechaInauguracion ? formatDate(j.fechaInauguracion) : 'Por definir';

        const isAllReady =
          j.equipoComputo === 'Si' &&
          j.equipoAudio === 'Si' &&
          j.cableadoEstructurado === 'Si' &&
          j.enlaceDatos === 'Si';

        const estadoEquip = isAllReady ? '100% Completo' : 'En Proceso';

        const obsCount = (j.observaciones || []).length;
        const latestObs =
          j.observaciones && j.observaciones.length > 0
            ? j.observaciones[0].texto
            : 'Sin incidencias reportadas';
        const truncatedObs = latestObs.length > 75 ? `${latestObs.substring(0, 72)}...` : latestObs;

        return [
          String(index + 1),
          j.nombreJudicatura,
          camaraText,
          adecuacionesText,
          j.equipoComputo,
          j.equipoAudio,
          j.cableadoEstructurado,
          j.enlaceDatos,
          estadoEquip,
          estatus,
          fechaInaug,
          `[#${obsCount}] ${truncatedObs}`,
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { top: 34, left: marginX, right: marginX, bottom: 14 },
        head: [
          [
            '#',
            'Nombre de la Judicatura',
            'Cámara',
            'Período Adecuaciones',
            'PC',
            'Audio',
            'Red',
            'Enlace',
            'Estado TIC',
            'Estatus',
            'Fecha',
            'Última Acción / Bitácora',
          ],
        ],
        body: unifiedData,
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 1.6,
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [10, 10, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 6.5,
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 7 },
          1: { halign: 'left', cellWidth: 54, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 23 },
          3: { halign: 'center', cellWidth: 30 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'center', cellWidth: 10 },
          6: { halign: 'center', cellWidth: 10 },
          7: { halign: 'center', cellWidth: 11 },
          8: { halign: 'center', cellWidth: 20 },
          9: { halign: 'center', cellWidth: 23, fontStyle: 'bold' },
          10: { halign: 'center', cellWidth: 19 },
          11: { halign: 'left', cellWidth: 'auto' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });
    }
  }

  // =========================================================================
  // SECCIÓN 2: DIAGRAMA DE GANTT CRONOLÓGICO DETALLADO POR SEMANAS
  // =========================================================================
  if (includeGantt) {
    doc.addPage('a4', 'landscape');
    currentY = 34;

    // Encabezado de la Sección de Gantt
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('CRONOGRAMA Y DIAGRAMA DE GANTT DE ADECUACIONES E INAUGURACIÓN', marginX, currentY);

    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Visualización cronológica semanal de períodos de ejecución técnica en sedes judiciales e hitos oficiales de apertura',
      marginX,
      currentY
    );

    currentY += 4.5;

    // Leyenda Visual del Gantt
    const legendY = currentY;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, legendY, pageWidth - marginX * 2, 7, 1, 1, 'FD');

    let legX = marginX + 4;
    // Adecuaciones Penal
    doc.setFillColor(126, 34, 206); // purple-700
    doc.roundedRect(legX, legendY + 2, 3.5, 3, 0.5, 0.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text('Adecuaciones Penal', legX + 5, legendY + 4.3);

    legX += 31;
    // Adecuaciones Civil
    doc.setFillColor(29, 78, 216); // blue-700
    doc.roundedRect(legX, legendY + 2, 3.5, 3, 0.5, 0.5, 'F');
    doc.text('Adecuaciones Civil', legX + 5, legendY + 4.3);

    legX += 31;
    // Adecuaciones Amparos
    doc.setFillColor(5, 150, 105); // emerald-600
    doc.roundedRect(legX, legendY + 2, 3.5, 3, 0.5, 0.5, 'F');
    doc.text('Adecuaciones Amparos', legX + 5, legendY + 4.3);

    legX += 34;
    // Hito Inauguración
    doc.setFillColor(245, 158, 11); // amber-500
    doc.circle(legX + 2, legendY + 3.5, 1.8, 'F');
    doc.text('Hito Fecha Inauguración', legX + 5.5, legendY + 4.3);

    legX += 34;
    // Estado Inaugurado
    doc.setFillColor(4, 120, 87);
    doc.roundedRect(legX, legendY + 2, 3, 3, 0.5, 0.5, 'F');
    doc.text('Inaugurado', legX + 4.5, legendY + 4.3);

    legX += 20;
    // Estado Reprogramado
    doc.setFillColor(217, 119, 6);
    doc.roundedRect(legX, legendY + 2, 3, 3, 0.5, 0.5, 'F');
    doc.text('Reprogramado', legX + 4.5, legendY + 4.3);

    legX += 22;
    // Estado Pendiente
    doc.setFillColor(100, 116, 139);
    doc.roundedRect(legX, legendY + 2, 3, 3, 0.5, 0.5, 'F');
    doc.text('Pendiente Fecha', legX + 4.5, legendY + 4.3);

    currentY = legendY + 10;

    // Calcular Semanas de la Línea de Tiempo
    const weeks = computeTimelineWeeks(judicaturas);
    const contentWidth = pageWidth - marginX * 2;
    const colJudicaturaWidth = 72;
    const timelineWidth = contentWidth - colJudicaturaWidth;
    const colWeekWidth = timelineWidth / weeks.length;
    const ganttLeftX = marginX + colJudicaturaWidth;

    const timelineStartMs = weeks[0].startDate.getTime();
    const timelineEndMs = weeks[weeks.length - 1].endDate.getTime() + 24 * 60 * 60 * 1000 - 1;

    // Función auxiliar para dibujar el encabezado de columnas del Gantt
    const drawGanttHeaderRow = (y: number) => {
      // Columna de Identificación de Judicatura
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(marginX, y, colJudicaturaWidth, 8.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text('JUDICATURA / CÁMARA / ESTADO', marginX + 3, y + 5.5);

      // Columnas Semanales
      weeks.forEach((w, idx) => {
        const x = ganttLeftX + idx * colWeekWidth;
        doc.setFillColor(241, 245, 249);
        doc.rect(x, y, colWeekWidth, 8.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(x, y, x, y + 8.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(30, 41, 59);
        doc.text(w.label, x + colWeekWidth / 2, y + 3.8, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4.8);
        doc.setTextColor(100, 116, 139);
        doc.text(w.shortDateLabel, x + colWeekWidth / 2, y + 7, { align: 'center' });
      });

      // Borde exterior
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.rect(marginX, y, contentWidth, 8.5);
    };

    drawGanttHeaderRow(currentY);
    currentY += 8.5;

    // Dibujar Filas de Judicaturas en el Gantt (agrupadas por Ramo si groupByRamo está activo)
    const rowHeight = 11.5;
    const sortedGanttJudicaturas = groupByRamo
      ? [...judicaturas].sort((a, b) => (a.tipoRamo === 'Penal' && b.tipoRamo !== 'Penal' ? -1 : 1))
      : judicaturas;

    sortedGanttJudicaturas.forEach((j, rIdx) => {
      // Paginación si excede el límite de la página
      if (currentY + rowHeight > pageHeight - 16) {
        doc.addPage('a4', 'landscape');
        currentY = 34;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text('CRONOGRAMA Y DIAGRAMA DE GANTT (CONTINUACIÓN)', marginX, currentY);
        currentY += 4.5;
        drawGanttHeaderRow(currentY);
        currentY += 8.5;
      }

      const isEven = rIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');

      // Columna Izquierda: Información de la Judicatura
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(ganttLeftX, currentY, ganttLeftX, currentY + rowHeight);

      // Nombre de la judicatura (truncado si excede)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(15, 23, 42);
      const displayName =
        j.nombreJudicatura.length > 44 ? `${j.nombreJudicatura.substring(0, 42)}...` : j.nombreJudicatura;
      doc.text(displayName, marginX + 2.5, currentY + 4);

      // Badges: Cámara y Estatus
      const isPenal = j.tipoRamo === 'Penal';
      const isCivil = j.tipoRamo === 'Civil';
      const ramoColor: [number, number, number] = isPenal 
        ? [109, 40, 217] 
        : isCivil 
        ? [29, 78, 216] 
        : [5, 150, 105];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(ramoColor[0], ramoColor[1], ramoColor[2]);
      const camaraBadge = isPenal ? 'Cámara Penal' : isCivil ? 'Cámara Civil' : 'Cámara Amparos';
      doc.text(camaraBadge, marginX + 2.5, currentY + 7.5);

      const estatus = j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');
      let estatusColor: [number, number, number] = [100, 116, 139];
      if (estatus === 'Inaugurado') estatusColor = [4, 120, 87];
      if (estatus === 'Reprogramado') estatusColor = [217, 119, 6];

      doc.setTextColor(estatusColor[0], estatusColor[1], estatusColor[2]);
      doc.text(`[${estatus}]`, marginX + 26, currentY + 7.5);

      // Fecha de Inauguración en texto
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.8);
      doc.setTextColor(71, 85, 105);
      const fechaInaugLabel = j.fechaInauguracion ? `Inaug: ${formatDate(j.fechaInauguracion)}` : 'Fecha: Por definir';
      doc.text(fechaInaugLabel, marginX + 2.5, currentY + 10.2);

      // Líneas de cuadrícula vertical para cada semana
      weeks.forEach((_, wIdx) => {
        const x = ganttLeftX + wIdx * colWeekWidth;
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(x, currentY, x, currentY + rowHeight);
      });

      // 1. Barra de Período de Adecuaciones
      const startMs = new Date(j.fechaInicioAdecuaciones).getTime();
      const endMs = new Date(j.fechaFinAdecuaciones).getTime();

      if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
        const barStartX =
          ganttLeftX +
          Math.max(0, Math.min(timelineWidth, ((startMs - timelineStartMs) / (timelineEndMs - timelineStartMs)) * timelineWidth));
        const barEndX =
          ganttLeftX +
          Math.max(0, Math.min(timelineWidth, ((endMs - timelineStartMs) / (timelineEndMs - timelineStartMs)) * timelineWidth));
        const barWidth = Math.max(barEndX - barStartX, 4);

        doc.setFillColor(ramoColor[0], ramoColor[1], ramoColor[2]);
        doc.roundedRect(barStartX, currentY + 3.2, barWidth, 4.8, 1, 1, 'F');

        // Texto informativo dentro o sobre la barra si hay espacio
        if (barWidth > 20) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4.5);
          doc.setTextColor(255, 255, 255);
          const dateInterval = `${formatDate(j.fechaInicioAdecuaciones).substring(0, 5)} - ${formatDate(j.fechaFinAdecuaciones).substring(0, 5)}`;
          doc.text(dateInterval, barStartX + barWidth / 2, currentY + 6.4, { align: 'center' });
        }
      }

      // 2. Hito de Fecha de Inauguración
      if (j.fechaInauguracion) {
        const inaugMs = new Date(j.fechaInauguracion).getTime();
        if (!isNaN(inaugMs) && inaugMs >= timelineStartMs && inaugMs <= timelineEndMs) {
          const markerX =
            ganttLeftX +
            Math.max(0, Math.min(timelineWidth, ((inaugMs - timelineStartMs) / (timelineEndMs - timelineStartMs)) * timelineWidth));

          // Círculo/Hito dorado
          doc.setFillColor(245, 158, 11);
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.4);
          doc.circle(markerX, currentY + 5.6, 2.2, 'FD');

          // Etiqueta con fecha en badge superior
          doc.setFillColor(254, 243, 199);
          doc.roundedRect(markerX - 5.5, currentY + 0.8, 11, 2.8, 0.5, 0.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4.2);
          doc.setTextColor(180, 83, 9);
          doc.text(formatDate(j.fechaInauguracion).substring(0, 5), markerX, currentY + 2.7, { align: 'center' });
        }
      }

      // Borde inferior de la fila
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

      currentY += rowHeight;
    });

    // Borde final de la tabla de Gantt
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.rect(marginX, currentY - (judicaturas.length * rowHeight), contentWidth, judicaturas.length * rowHeight);
  }

  // =========================================================================
  // SECCIÓN 3: MATRIZ DE ESTADO DETALLADO DE INFRAESTRUCTURA TIC Y ENLACE
  // =========================================================================
  if (includeStatusMatrix) {
    doc.addPage('a4', 'landscape');
    currentY = 34;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('MATRIZ OFICIAL DE ESTADO DE INFRAESTRUCTURA TIC Y ENLACE DE DATOS', marginX, currentY);

    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Diagnóstico detallado componente por componente: Cómputo, Audio de Sala, Cableado de Red y Enlace de Telecomunicaciones',
      marginX,
      currentY
    );

    currentY += 4;

    const sortedMatrixJudicaturas = groupByRamo
      ? [...judicaturas].sort((a, b) => (a.tipoRamo === 'Penal' && b.tipoRamo !== 'Penal' ? -1 : 1))
      : judicaturas;

    const matrixData = sortedMatrixJudicaturas.map((j, idx) => {
      const camara = j.tipoRamo === 'Penal' ? 'Cámara Penal' : j.tipoRamo === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos';
      
      const computoStatus = j.equipoComputo === 'Si' ? 'Completado' : 'Pendiente';
      const audioStatus = j.equipoAudio === 'Si' ? 'Completado' : 'Pendiente';
      const redStatus = j.cableadoEstructurado === 'Si' ? 'Completado' : 'Pendiente';
      const enlaceStatus = j.enlaceDatos === 'Si' ? 'Completado' : 'Pendiente';

      const readyCount = [j.equipoComputo, j.equipoAudio, j.cableadoEstructurado, j.enlaceDatos].filter((v) => v === 'Si').length;
      const pct = `${(readyCount / 4) * 100}%`;

      const estatusInaug = j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');
      const fechaInaug = j.fechaInauguracion ? formatDate(j.fechaInauguracion) : 'Por Definir';

      const ultObs = j.observaciones && j.observaciones.length > 0 ? j.observaciones[0].texto : 'Sin observaciones';
      const resumenObs = ultObs.length > 80 ? `${ultObs.substring(0, 77)}...` : ultObs;

      return [
        String(idx + 1),
        j.nombreJudicatura,
        camara,
        computoStatus,
        audioStatus,
        redStatus,
        enlaceStatus,
        pct,
        `${estatusInaug}\n(${fechaInaug})`,
        resumenObs,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { top: 34, left: marginX, right: marginX, bottom: 14 },
      head: [
        [
          '#',
          'Judicatura',
          'Cámara',
          'Cómputo (PC)',
          'Audio Sala',
          'Cableado Red',
          'Enlace de Datos',
          'Avance TIC',
          'Apertura',
          'Diagnóstico y Última Acción Registrada',
        ],
      ],
      body: matrixData,
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 2,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [10, 10, 105], // #0A0A69
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 7 },
        1: { halign: 'left', cellWidth: 55, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 23 },
        3: { halign: 'center', cellWidth: 19 },
        4: { halign: 'center', cellWidth: 19 },
        5: { halign: 'center', cellWidth: 19 },
        6: { halign: 'center', cellWidth: 20 },
        7: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        8: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
        9: { halign: 'left', cellWidth: 'auto' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell: (data) => {
        // Indicadores de Componentes TIC (Columnas 3, 4, 5, 6)
        if (data.section === 'body' && [3, 4, 5, 6].includes(data.column.index)) {
          const val = String(data.cell.raw);
          data.cell.styles.fontStyle = 'bold';
          if (val === 'Completado') {
            data.cell.styles.textColor = [4, 120, 87]; // Emerald
          } else {
            data.cell.styles.textColor = [225, 29, 72]; // Rose
          }
        }
        // Avance TIC
        if (data.section === 'body' && data.column.index === 7) {
          const val = String(data.cell.raw);
          if (val === '100%') {
            data.cell.styles.textColor = [4, 120, 87];
          } else {
            data.cell.styles.textColor = [180, 83, 9];
          }
        }
      },
    });
  }

  // =========================================================================
  // PIE Y CABECERA INSTITUCIONAL EN TODAS LAS PÁGINAS (CON LOGOTIPO DEL OJ)
  // =========================================================================
  // Recorrer de forma exhaustiva todas las páginas del documento generado para
  // garantizar que el logotipo oficial del Organismo Judicial y membrete institucional
  // estén presentes en la cabecera de TODAS Y CADA UNA de las páginas.
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageHeader(doc, p, totalPages, {
      auditCode,
      dateStr,
      timeStr,
      currentUser,
      totalRecords: judicaturas.length,
      title,
    });
    drawPageFooter(doc, p, totalPages, { auditCode });
  }

  // Descargar archivo
  const timeFormatted = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${timeFormatted}.pdf`;

  doc.save(filename);
  return filename;
}

/**
 * Función compatible con llamadas existentes: genera el informe consolidado completo.
 */
export function generateJudicaturasPDF(options: ExportJudicaturasPDFOptions): string {
  return generateConsolidatedJudicaturasPDF(options);
}

/**
 * Genera la Ficha Técnica Individual Oficial de una Judicatura en formato PDF.
 * Incluye logotipo oficial del Organismo Judicial en cabecera con color #0A0A69,
 * texto blanco de alto contraste, sin cinta amarilla, datos de infraestructura TIC,
 * cronograma de adecuaciones, estatus y el árbol cronológico de observaciones.
 */
export function generateIndividualJudicaturaPDF(
  judicatura: JudicaturaRecord,
  currentUser?: { nombreCompleto?: string; username?: string; rol?: string } | null
): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const now = new Date();
  const dateStr = formatDate(now.toISOString().slice(0, 10));
  const timeStr = formatDateTime(now.toISOString()).slice(11) || now.toLocaleTimeString('es-GT');
  const auditRandom = Math.random().toString(36).substring(2, 7).toUpperCase();
  const auditCode = `FICHA-JUD-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${auditRandom}`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let currentY = 10;

  // Función para dibujar cabecera institucional en la ficha
  const drawFichaHeader = (pageNum: number, totalNum: number) => {
    const bannerHeight = 22;
    doc.setFillColor(10, 10, 105); // #0A0A69
    doc.rect(marginX, 8, pageWidth - marginX * 2, bannerHeight, 'F');

    // Borde inferior sutil de contraste sin cinta amarilla
    doc.setFillColor(30, 41, 130);
    doc.rect(marginX, 8 + bannerHeight - 0.5, pageWidth - marginX * 2, 0.5, 'F');

    // Logotipo Oficial
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX + 3.5, 9.5, 19, 19, 2, 2, 'F');
      doc.addImage(OJ_LOGO_DATA_URI, 'PNG', marginX + 4.5, 10.5, 17, 17);
    } catch (e) {
      console.warn('Error incrustando logo en ficha individual:', e);
    }

    // Textos institucionales (Blanco puro de alto contraste)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('ORGANISMO JUDICIAL DE GUATEMALA', marginX + 26, 14.5);

    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('GERENCIA DE INFORMÁTICA', marginX + 26, 19.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(224, 231, 255);
    doc.text('FICHA TÉCNICA INSTITUCIONAL: CONTROL DE JUDICATURA EN TRÁMITE DE APERTURA', marginX + 26, 24);

    // Metadatos a la derecha
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`Emisión: ${dateStr} ${timeStr}`, pageWidth - marginX - 4, 14.5, { align: 'right' });
    doc.setFont('courier', 'bold');
    doc.text(auditCode, pageWidth - marginX - 4, 19.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${pageNum} de ${totalNum}`, pageWidth - marginX - 4, 24, { align: 'right' });
  };

  const drawFichaFooter = (pageNum: number, totalNum: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Documento oficial generado por el Sistema de Control de Adquisiciones y Judicaturas • Organismo Judicial • Código: ${auditCode}`,
      marginX,
      pageHeight - 8
    );
    doc.text(`Página ${pageNum} de ${totalNum}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  };

  currentY = 34;

  // 1. TÍTULO Y DATOS PRINCIPALES DE LA JUDICATURA
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 105); // #0A0A69
  const splitTitle = doc.splitTextToSize(judicatura.nombreJudicatura.toUpperCase(), pageWidth - marginX * 2 - 10);
  doc.text(splitTitle, marginX + 5, currentY + 7);

  const titleLinesCount = Array.isArray(splitTitle) ? splitTitle.length : 1;
  const metaY = currentY + 7 + (titleLinesCount * 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CÁMARA:', marginX + 5, metaY);
  doc.setFont('helvetica', 'normal');
  const camaraNombreFicha = judicatura.tipoRamo === 'Penal' ? 'Cámara Penal' : judicatura.tipoRamo === 'Civil' ? 'Cámara Civil' : 'Cámara Amparos';
  doc.text(camaraNombreFicha, marginX + 22, metaY);

  doc.setFont('helvetica', 'bold');
  doc.text('ESTATUS:', marginX + 68, metaY);
  doc.setFont('helvetica', 'bold');
  const estatusActual = judicatura.estadoInauguracion || (judicatura.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');
  if (estatusActual === 'Inaugurado' || estatusActual === 'Finalizado') {
    doc.setTextColor(5, 150, 105);
  } else if (estatusActual === 'Reprogramado') {
    doc.setTextColor(225, 29, 72);
  } else {
    doc.setTextColor(180, 83, 9);
  }
  doc.text(estatusActual.toUpperCase(), marginX + 85, metaY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('FECHA:', marginX + 130, metaY);
  doc.setFont('courier', 'bold');
  doc.setTextColor(10, 10, 105);
  doc.text(judicatura.fechaInauguracion ? formatDate(judicatura.fechaInauguracion) : 'POR DEFINIR', marginX + 144, metaY);

  currentY += 32;

  // 2. RESUMEN DE ADECUACIONES E INFRAESTRUCTURA TECNOLÓGICA (TABLAS RESUMEN)
  const fechaIni = judicatura.fechaInicioAdecuaciones ? formatDate(judicatura.fechaInicioAdecuaciones) : 'N/D';
  const fechaFin = judicatura.fechaFinAdecuaciones ? formatDate(judicatura.fechaFinAdecuaciones) : 'N/D';
  let diffDays = 0;
  if (judicatura.fechaInicioAdecuaciones && judicatura.fechaFinAdecuaciones) {
    const d1 = new Date(judicatura.fechaInicioAdecuaciones);
    const d2 = new Date(judicatura.fechaFinAdecuaciones);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const equipCount = 
    (judicatura.equipoComputo === 'Si' ? 1 : 0) +
    (judicatura.equipoAudio === 'Si' ? 1 : 0) +
    (judicatura.cableadoEstructurado === 'Si' ? 1 : 0) +
    (judicatura.enlaceDatos === 'Si' ? 1 : 0);
  const equipPct = Math.round((equipCount / 4) * 100);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [['PARÁMETRO DE EJECUCIÓN', 'VALOR REGISTRADO', 'COMPONENTE TIC', 'ESTADO INSTALADO']],
    body: [
      ['Inicio de Adecuaciones', fechaIni, 'Equipo de Cómputo (PC)', judicatura.equipoComputo === 'Si' ? 'Instalado (Sí)' : 'Pendiente (No)'],
      ['Finalización de Adecuaciones', fechaFin, 'Equipo de Audio', judicatura.equipoAudio === 'Si' ? 'Instalado (Sí)' : 'Pendiente (No)'],
      ['Plazo Total de Adecuación', `${diffDays} días calendario`, 'Cableado Estructurado', judicatura.cableadoEstructurado === 'Si' ? 'Instalado (Sí)' : 'Pendiente (No)'],
      ['Fecha Apertura / Inauguración', judicatura.fechaInauguracion ? formatDate(judicatura.fechaInauguracion) : 'Pendiente de calendarizar', 'Enlace de Datos', judicatura.enlaceDatos === 'Si' ? 'Instalado (Sí)' : 'Pendiente (No)'],
      ['Estatus Operativo Actual', estatusActual, 'Cobertura Global TIC', `${equipPct}% (${equipCount}/4 componentes listos)`]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [10, 10, 105], // #0A0A69
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    styles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 42 },
      2: { fontStyle: 'bold', cellWidth: 48 },
      3: { cellWidth: 48 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && (data.column.index === 3 || data.column.index === 1)) {
        const val = String(data.cell.raw);
        if (val.includes('Sí') || val.includes('100%') || val.includes('Inaugurado')) {
          data.cell.styles.textColor = [4, 120, 87]; // Emerald
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('No') || val.includes('Pendiente')) {
          data.cell.styles.textColor = [180, 83, 9]; // Amber
        }
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 3. SECCIÓN: ÁRBOL CRONOLÓGICO DE ACCIONES Y OBSERVACIONES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(10, 10, 105);
  doc.text('ÁRBOL CRONOLÓGICO DE ACCIONES Y OBSERVACIONES REGISTRADAS', marginX, currentY);

  currentY += 2;

  const obsList = judicatura.observaciones || [];
  const obsBody = obsList.length > 0
    ? obsList.map((obs) => [
        `#${obs.numeroAccion}`,
        obs.fecha ? formatDateTime(obs.fecha) : 'N/D',
        obs.autor || 'Funcionario OJ',
        obs.texto || ''
      ])
    : [['--', '--', '--', 'No se registran acciones ni observaciones técnicas en la bitácora de esta judicatura.']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [['NO.', 'FECHA Y HORA', 'RESPONSABLE / AUTOR', 'DETALLE DE LA ACCIÓN / OBSERVACIÓN TÉCNICA']],
    body: obsBody,
    theme: 'grid',
    headStyles: {
      fillColor: [10, 10, 105], // #0A0A69
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 12 },
      1: { cellWidth: 32, fontStyle: 'normal' },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { cellWidth: 'auto' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. BLOQUE DE FIRMAS Y RESPONSABILIDAD INSTITUCIONAL
  if (currentY > pageHeight - 38) {
    doc.addPage();
    currentY = 35;
  }

  const signWidth = (pageWidth - marginX * 2 - 20) / 3;
  const signY = currentY + 12;

  // Línea 1: Elaboró
  doc.setDrawColor(148, 163, 184);
  doc.line(marginX, signY, marginX + signWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('ELABORÓ / TÉCNICO ASIGNADO', marginX + signWidth / 2, signY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(currentUser?.nombreCompleto || 'Ingeniero de Infraestructura GIT', marginX + signWidth / 2, signY + 7, { align: 'center' });

  // Línea 2: Revisó
  const sign2X = marginX + signWidth + 10;
  doc.line(sign2X, signY, sign2X + signWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('COORDINACIÓN DE INFRAESTRUCTURA', sign2X + signWidth / 2, signY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Departamento de Servicios Informáticos', sign2X + signWidth / 2, signY + 7, { align: 'center' });

  // Línea 3: Vo.Bo.
  const sign3X = sign2X + signWidth + 10;
  doc.line(sign3X, signY, sign3X + signWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('GERENCIA DE INFORMÁTICA', sign3X + signWidth / 2, signY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Organismo Judicial de Guatemala', sign3X + signWidth / 2, signY + 7, { align: 'center' });

  // Aplicar cabecera y pie a todas las páginas generadas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFichaHeader(p, totalPages);
    drawFichaFooter(p, totalPages);
  }

  const cleanName = judicatura.nombreJudicatura
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 24);
  const timeFormatted = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  const filename = `Ficha_Judicatura_${cleanName}_${timeFormatted}.pdf`;

  doc.save(filename);
  return filename;
}
