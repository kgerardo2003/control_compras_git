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
  doc.text('GERENCIA DE INFORMÁTICA • DIRECCIÓN DE INFRAESTRUCTURA Y SISTEMAS', marginX + 27, bannerY + 11.5);

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
        filters.push(`Cámara: ${filterInfo.ramo === 'Penal' ? 'Cámara Penal' : 'Cámara Paz Civil'}`);
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

    // Tarjetas de Métricas Resumen
    const camaraPenalCount = judicaturas.filter((j) => j.tipoRamo === 'Penal').length;
    const camaraPazCivilCount = judicaturas.filter((j) => j.tipoRamo === 'Civil').length;
    const equipamiento100Count = judicaturas.filter(
      (j) =>
        j.equipoComputo === 'Si' &&
        j.equipoAudio === 'Si' &&
        j.cableadoEstructurado === 'Si' &&
        j.enlaceDatos === 'Si'
    ).length;
    const inauguradosCount = judicaturas.filter((j) => j.estadoInauguracion === 'Inaugurado').length;
    const reprogramadosCount = judicaturas.filter((j) => j.estadoInauguracion === 'Reprogramado').length;
    const pendientesCount = judicaturas.filter(
      (j) => j.estadoInauguracion === 'Pendiente Fecha' || (!j.estadoInauguracion && !j.fechaInauguracion)
    ).length;

    const cardWidth = (pageWidth - marginX * 2 - 15) / 6;
    const cardHeight = 11.5;

    const summaryCards = [
      { label: 'TOTAL JUDICATURAS', val: `${judicaturas.length}`, color: [15, 23, 42] },
      { label: 'CÁMARA PENAL', val: `${camaraPenalCount}`, color: [109, 40, 217] },
      { label: 'CÁMARA PAZ CIVIL', val: `${camaraPazCivilCount}`, color: [29, 78, 216] },
      { label: 'TIC 100% LISTO', val: `${equipamiento100Count}`, color: [4, 120, 87] },
      { label: 'INAUGURADOS', val: `${inauguradosCount}`, color: [16, 185, 129] },
      { label: 'PEND. FECHA / REPROG.', val: `${pendientesCount + reprogramadosCount}`, color: [217, 119, 6] },
    ];

    summaryCards.forEach((c, idx) => {
      const xPos = marginX + idx * (cardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(xPos, currentY, cardWidth, cardHeight, 'FD');

      doc.setFillColor(c.color[0], c.color[1], c.color[2]);
      doc.rect(xPos, currentY, 2, cardHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.label, xPos + 4, currentY + 3.8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(c.color[0], c.color[1], c.color[2]);
      doc.text(c.val, xPos + 4, currentY + 9);
    });

    currentY += cardHeight + 4.5;

    // Tabla de Judicaturas con Estado de Cada Una
    const tableData = judicaturas.map((j, index) => {
      const isPenal = j.tipoRamo === 'Penal';
      const camaraText = isPenal ? 'Cámara Penal' : 'Cámara Paz Civil';
      const adecuacionesText = `${formatDate(j.fechaInicioAdecuaciones)} al ${formatDate(j.fechaFinAdecuaciones)}`;
      
      const estatus = j.estadoInauguracion || (j.fechaInauguracion ? 'Reprogramado' : 'Pendiente Fecha');
      const fechaInaug = j.fechaInauguracion ? formatDate(j.fechaInauguracion) : 'Por definir';

      const isAllReady =
        j.equipoComputo === 'Si' &&
        j.equipoAudio === 'Si' &&
        j.cableadoEstructurado === 'Si' &&
        j.enlaceDatos === 'Si';

      const estadoEquip = isAllReady ? '100% Completo' : 'En Proceso';

      // Conteo de acciones y última observación en la bitácora
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
          'Estatus Apertura',
          'F. Inauguración',
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
        fillColor: [10, 10, 105], // #0A0A69
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
      didParseCell: (data) => {
        // Columna 2: Cámara
        if (data.section === 'body' && data.column.index === 2) {
          const val = String(data.cell.raw);
          data.cell.styles.fontStyle = 'bold';
          if (val.includes('Penal')) {
            data.cell.styles.textColor = [109, 40, 217]; // Purple
          } else {
            data.cell.styles.textColor = [29, 78, 216]; // Blue
          }
        }
        // Columnas 4, 5, 6, 7: Equipamiento TIC (Si / No)
        if (data.section === 'body' && [4, 5, 6, 7].includes(data.column.index)) {
          const val = String(data.cell.raw);
          if (val === 'Si') {
            data.cell.styles.textColor = [4, 120, 87]; // Emerald
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [225, 29, 72]; // Rose-600
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Columna 8: Estado TIC
        if (data.section === 'body' && data.column.index === 8) {
          const val = String(data.cell.raw);
          data.cell.styles.fontStyle = 'bold';
          if (val.includes('100%')) {
            data.cell.styles.textColor = [4, 120, 87];
          } else {
            data.cell.styles.textColor = [180, 83, 9];
          }
        }
        // Columna 9: Estatus Apertura
        if (data.section === 'body' && data.column.index === 9) {
          const val = String(data.cell.raw);
          data.cell.styles.fontStyle = 'bold';
          if (val === 'Inaugurado') {
            data.cell.styles.textColor = [4, 120, 87];
          } else if (val === 'Reprogramado') {
            data.cell.styles.textColor = [180, 83, 9];
          } else {
            data.cell.styles.textColor = [71, 85, 105];
          }
        }
      },
    });
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
    doc.text('Adecuaciones Cámara Penal', legX + 5, legendY + 4.3);

    legX += 37;
    // Adecuaciones Civil
    doc.setFillColor(29, 78, 216); // blue-700
    doc.roundedRect(legX, legendY + 2, 3.5, 3, 0.5, 0.5, 'F');
    doc.text('Adecuaciones Cámara Paz Civil', legX + 5, legendY + 4.3);

    legX += 39;
    // Hito Inauguración
    doc.setFillColor(245, 158, 11); // amber-500
    doc.circle(legX + 2, legendY + 3.5, 1.8, 'F');
    doc.text('Hito Fecha de Inauguración', legX + 5.5, legendY + 4.3);

    legX += 36;
    // Estado Inaugurado
    doc.setFillColor(4, 120, 87);
    doc.roundedRect(legX, legendY + 2, 3, 3, 0.5, 0.5, 'F');
    doc.text('Inaugurado', legX + 4.5, legendY + 4.3);

    legX += 20;
    // Estado Reprogramado
    doc.setFillColor(217, 119, 6);
    doc.roundedRect(legX, legendY + 2, 3, 3, 0.5, 0.5, 'F');
    doc.text('Reprogramado', legX + 4.5, legendY + 4.3);

    legX += 23;
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

    // Dibujar Filas de Judicaturas en el Gantt
    const rowHeight = 11.5;

    judicaturas.forEach((j, rIdx) => {
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
      const ramoColor: [number, number, number] = isPenal ? [109, 40, 217] : [29, 78, 216];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(ramoColor[0], ramoColor[1], ramoColor[2]);
      doc.text(isPenal ? 'Cámara Penal' : 'Cámara Paz Civil', marginX + 2.5, currentY + 7.5);

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

    const matrixData = judicaturas.map((j, idx) => {
      const isPenal = j.tipoRamo === 'Penal';
      const camara = isPenal ? 'Cámara Penal' : 'Cámara Paz Civil';
      
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
