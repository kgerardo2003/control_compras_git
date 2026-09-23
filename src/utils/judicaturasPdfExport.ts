import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JudicaturaRecord } from '../types';
import { formatDate, formatDateTime } from './formatters';

export interface ExportJudicaturasPDFOptions {
  judicaturas: JudicaturaRecord[];
  title?: string;
  subtitle?: string;
  filterInfo?: {
    search?: string;
    ramo?: string;
    equipamiento?: string;
  };
  currentUser?: {
    nombreCompleto?: string;
    username?: string;
    rol?: string;
    cargo?: string;
  } | null;
  filenamePrefix?: string;
}

/**
 * Genera y descarga un informe PDF oficial de Judicaturas por Inaugurar,
 * con membrete institucional del Organismo Judicial, resumen de infraestructura TIC y código de auditoría.
 */
export function generateJudicaturasPDF(options: ExportJudicaturasPDFOptions): string {
  const {
    judicaturas,
    title = 'INFORME DE CONTROL DE JUDICATURAS POR INAUGURAR',
    subtitle = 'Gerencia de Informática • Seguimiento de Adecuaciones, Equipamiento TIC e Hitos de Apertura',
    filterInfo,
    currentUser,
    filenamePrefix = 'Informe_Judicaturas_OJ',
  } = options;

  // Orientación horizontal (landscape) A4 para tabla completa de infraestructura y fechas
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 14;
  let currentY = 12;

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

  // 1. BANNER INSTITUCIONAL SUPERIOR
  doc.setFillColor(15, 23, 42); // slate-900 institucional
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 22, 'F');

  // Acento dorado/azul
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(marginX, currentY, 3, 22, 'F');

  // Textos del Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('ORGANISMO JUDICIAL DE GUATEMALA', marginX + 7, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('GERENCIA DE INFORMÁTICA • DIRECCIÓN DE INFRAESTRUCTURA Y SISTEMAS', marginX + 7, currentY + 13);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(253, 224, 71); // amber-300
  doc.text(`CÓDIGO DE AUDITORÍA: ${auditCode}`, marginX + 7, currentY + 18.5);

  // Metadatos a la derecha del Banner
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Fecha Emisión: ${dateStr} ${timeStr}`, pageWidth - marginX - 5, currentY + 7, { align: 'right' });
  doc.text(`Generado por: ${currentUser?.nombreCompleto || currentUser?.username || 'Usuario Sistema'}`, pageWidth - marginX - 5, currentY + 12.5, { align: 'right' });
  doc.text(`Registros: ${judicaturas.length} Judicatura${judicaturas.length === 1 ? '' : 's'}`, pageWidth - marginX - 5, currentY + 18, { align: 'right' });

  currentY += 26;

  // 2. TÍTULO Y DESCRIPCIÓN DEL REPORTE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(title, marginX, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, marginX, currentY);

  currentY += 5;

  // Filtros aplicados si existen
  if (filterInfo && (filterInfo.search || filterInfo.ramo || filterInfo.equipamiento)) {
    const filters = [];
    if (filterInfo.search) filters.push(`Búsqueda: "${filterInfo.search}"`);
    if (filterInfo.ramo && filterInfo.ramo !== 'Todos') {
      const ramoLabel = filterInfo.ramo === 'Penal' ? 'Cámara Penal' : filterInfo.ramo === 'Civil' ? 'Cámara Paz Civil' : filterInfo.ramo;
      filters.push(`Cámara: ${ramoLabel}`);
    }
    if (filterInfo.equipamiento && filterInfo.equipamiento !== 'Todos') {
      filters.push(`Equipamiento: ${filterInfo.equipamiento}`);
    }

    if (filters.length > 0) {
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, currentY, pageWidth - marginX * 2, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Filtros aplicados: ${filters.join('  •  ')}`, marginX + 3, currentY + 4.2);
      currentY += 8;
    }
  }

  // 3. TARJETAS DE RESUMEN EJECUTIVO (METRICAS)
  const camaraPenalCount = judicaturas.filter(j => j.tipoRamo === 'Penal').length;
  const camaraPazCivilCount = judicaturas.filter(j => j.tipoRamo === 'Civil').length;
  const equipamiento100Count = judicaturas.filter(j =>
    j.equipoComputo === 'Si' &&
    j.equipoAudio === 'Si' &&
    j.cableadoEstructurado === 'Si' &&
    j.enlaceDatos === 'Si'
  ).length;
  const equipamientoPendienteCount = judicaturas.length - equipamiento100Count;

  const cardWidth = (pageWidth - marginX * 2 - 9) / 4;
  const cardHeight = 12;

  const summaryCards = [
    { label: 'TOTAL JUDICATURAS', val: `${judicaturas.length}`, color: [30, 41, 59] },
    { label: 'CÁMARA PENAL', val: `${camaraPenalCount}`, color: [109, 40, 217] }, // purple-700
    { label: 'CÁMARA PAZ CIVIL', val: `${camaraPazCivilCount}`, color: [29, 78, 216] }, // blue-700
    { label: 'EQUIPAMIENTO 100%', val: `${equipamiento100Count} / ${judicaturas.length}`, color: [4, 120, 87] }, // emerald-700
  ];

  summaryCards.forEach((c, idx) => {
    const xPos = marginX + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(xPos, currentY, cardWidth, cardHeight, 'FD');

    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(xPos, currentY, 2.5, cardHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, xPos + 5, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, xPos + 5, currentY + 9.5);
  });

  currentY += cardHeight + 5;

  // 4. TABLA DETALLADA DE JUDICATURAS CON AUTOTABLE
  const tableData = judicaturas.map((j, index) => {
    const isPenal = j.tipoRamo === 'Penal';
    const camaraText = isPenal ? 'Cámara Penal' : 'Cámara Paz Civil';
    const adecuacionesText = `${formatDate(j.fechaInicioAdecuaciones)} al ${formatDate(j.fechaFinAdecuaciones)}`;
    const fechaInaug = formatDate(j.fechaInauguracion);

    const isAllReady =
      j.equipoComputo === 'Si' &&
      j.equipoAudio === 'Si' &&
      j.cableadoEstructurado === 'Si' &&
      j.enlaceDatos === 'Si';

    const estadoEquip = isAllReady ? 'Completo (100%)' : 'En Proceso';

    // Última observación o conteo de acciones
    const obsCount = (j.observaciones || []).length;
    const latestObs = j.observaciones && j.observaciones.length > 0 ? j.observaciones[0].texto : 'Sin observaciones';
    const truncatedObs = latestObs.length > 70 ? `${latestObs.substring(0, 67)}...` : latestObs;

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
      fechaInaug,
      `[${obsCount} acc.] ${truncatedObs}`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [
      [
        '#',
        'Nombre de la Judicatura',
        'Cámara Asignada',
        'Período de Adecuaciones',
        'Cómputo',
        'Audio',
        'Cableado',
        'Enlace',
        'Estado TIC',
        'Inauguración',
        'Última Acción en Árbol',
      ],
    ],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { halign: 'left', cellWidth: 56, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 14 },
      7: { halign: 'center', cellWidth: 13 },
      8: { halign: 'center', cellWidth: 22 },
      9: { halign: 'center', cellWidth: 21, fontStyle: 'bold' },
      10: { halign: 'left', cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      // Color condicional para Cámara
      if (data.section === 'body' && data.column.index === 2) {
        const val = String(data.cell.raw);
        if (val.includes('Penal')) {
          data.cell.styles.textColor = [109, 40, 217]; // Purple
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [29, 78, 216]; // Blue
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Color para indicadores Si/No
      if (data.section === 'body' && [4, 5, 6, 7].includes(data.column.index)) {
        const val = String(data.cell.raw);
        if (val === 'Si') {
          data.cell.styles.textColor = [4, 120, 87]; // Emerald
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [148, 163, 184]; // Slate-400
        }
      }
      // Color para Estado TIC
      if (data.section === 'body' && data.column.index === 8) {
        const val = String(data.cell.raw);
        if (val.includes('Completo')) {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [180, 83, 9]; // Amber
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Inauguración
      if (data.section === 'body' && data.column.index === 9) {
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
  });

  // 5. PIE DE PÁGINA INSTITUCIONAL EN TODAS LAS HOJAS
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    doc.text(
      'Documento Oficial de Control y Apertura de Judicaturas • Gerencia de Informática • Organismo Judicial de Guatemala',
      marginX,
      pageHeight - 6
    );

    doc.setFont('courier', 'normal');
    doc.text(`${auditCode} | Pág. ${i} de ${totalPages}`, pageWidth - marginX - 55, pageHeight - 6);
  }

  // Guardar archivo descargable
  const timeFormatted = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${timeFormatted}.pdf`;

  doc.save(filename);
  return filename;
}
