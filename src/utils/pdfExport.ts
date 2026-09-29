import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseRecord } from '../types';
import { formatQuetzales, formatDate, getModalidadCompraByMonto } from './formatters';
import { OJ_LOGO_DATA_URI } from './ojLogoAsset';
import { generateExecutiveDashboardImage } from './pdfChartRenderer';

export interface ExportPurchasesPDFOptions {
  purchases: PurchaseRecord[];
  title?: string;
  subtitle?: string;
  filterInfo?: {
    search?: string;
    status?: string;
    area?: string;
    category?: string;
  };
  currentUser?: {
    nombreCompleto?: string;
    username?: string;
    rol?: string;
    cargo?: string;
  } | null;
  filenamePrefix?: string;
  includeSummaryTable?: boolean;
  includeCharts?: boolean;
}

/**
 * Genera y descarga un archivo PDF oficial con la tabla de compras,
 * cabecera institucional del Organismo Judicial y metadatos para control de auditoría.
 */
export function generatePurchasesPDF(options: ExportPurchasesPDFOptions): string {
  const {
    purchases,
    title = 'REPORTE OFICIAL DE ADQUISICIONES TECNOLÓGICAS',
    subtitle = 'Control institucional de eventos NOG, formularios F56-e y dictámenes técnicos de TI',
    filterInfo,
    currentUser,
    filenamePrefix = 'Reporte_Adquisiciones_GIT_OJ',
    includeSummaryTable = true,
    includeCharts = true,
  } = options;

  // Orientación horizontal (landscape) en formato A4 para óptima legibilidad de columnas
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 14;

  // Generar código único de auditoría para trazabilidad
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
  const auditRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
  const auditCode = `AUD-OJ-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${auditRandom}`;

  const renderOfficialHeader = (pageTitle: string, pageSub: string) => {
    let currentY = 10;
    const headerHeight = 20;
    doc.setFillColor(10, 10, 105); // #0A0A69
    doc.rect(marginX, currentY, pageWidth - (marginX * 2), headerHeight, 'F');

    // Borde sutil inferior
    doc.setFillColor(30, 41, 130);
    doc.rect(marginX, currentY + headerHeight - 0.5, pageWidth - (marginX * 2), 0.5, 'F');

    // Logo Oficial del Organismo Judicial de Guatemala
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX + 2.5, currentY + 2, 16, 16, 2, 2, 'F');
      doc.addImage(OJ_LOGO_DATA_URI, 'PNG', marginX + 3.5, currentY + 2.5, 14, 14);
    } catch (err) {
      console.warn('Error al incrustar el logo en el PDF', err);
    }

    // Textos de la Cabecera Institucional
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('ORGANISMO JUDICIAL DE GUATEMALA', marginX + 22, currentY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('GERENCIA DE INFORMÁTICA', marginX + 22, currentY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(224, 231, 255);
    doc.text('SISTEMA INTEGRAL DE CONTROL DE ADQUISICIONES Y PROCESOS DE TI', marginX + 22, currentY + 15);

    // Insignia de Control de Auditoría
    doc.setFillColor(23, 37, 84);
    doc.roundedRect(pageWidth - marginX - 68, currentY + 3, 62, 14, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('CONTROL DE AUDITORÍA INTERNA', pageWidth - marginX - 65, currentY + 7);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(auditCode, pageWidth - marginX - 65, currentY + 12);

    currentY += headerHeight + 4;

    // Título y Subtítulo
    doc.setTextColor(15, 39, 68);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(pageTitle.toUpperCase(), marginX, currentY);

    currentY += 4;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(pageSub, marginX, currentY);

    currentY += 3.5;
    return currentY;
  };

  const renderMetadataBox = (currentY: number) => {
    const totalMonto = purchases.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
    const conDictamen = purchases.filter(p => p.evaluadoGIT === 'Sí' || Boolean(p.fechaDictamenGIT)).length;
    const adjudicados = purchases.filter(p => p.estatusEvento === 'Adjudicación').length;

    const boxHeight = 16;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), boxHeight, 1.5, 1.5, 'FD');

    const col1X = marginX + 4;
    const col2X = marginX + 90;
    const col3X = marginX + 185;

    // Columna 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Emisión:', col1X, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${dateStr} ${timeStr} (UTC-6 Guatemala)`, col1X + 18, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Emisor:', col1X, currentY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const userName = currentUser?.nombreCompleto || currentUser?.username || 'Usuario Autorizado';
    const userRole = currentUser?.rol ? currentUser.rol.toUpperCase() : 'AUDITORÍA / GIT';
    doc.text(`${userName} [${userRole}]`, col1X + 18, currentY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Filtros:', col1X, currentY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    let filterText = 'Todos los registros';
    if (filterInfo) {
      const parts = [];
      if (filterInfo.status && filterInfo.status !== 'todos') parts.push(`Estatus: ${filterInfo.status}`);
      if (filterInfo.area && filterInfo.area !== 'todas') parts.push(`Área: ${filterInfo.area}`);
      if (filterInfo.search) parts.push(`Búsqueda: "${filterInfo.search}"`);
      if (parts.length > 0) filterText = parts.join(' | ');
    }
    doc.text(filterText.length > 42 ? filterText.substring(0, 40) + '...' : filterText, col1X + 18, currentY + 12);

    // Columna 2
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Registros:', col2X, currentY + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${purchases.length} Adquisiciones`, col2X + 22, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Monto Total:', col2X, currentY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatQuetzales(totalMonto), col2X + 22, currentY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Dictámenes:', col2X, currentY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${conDictamen} de ${purchases.length} con informe técnico GIT`, col2X + 22, currentY + 12);

    // Columna 3
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Adjudicados:', col3X, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${adjudicados} resueltos con proveedor`, col3X + 22, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Carácter:', col3X, currentY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('OFICIAL - FISCALIZACIÓN Y TOMA DE DECISIONES', col3X + 22, currentY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Verificación:', col3X, currentY + 12);
    doc.setFont('courier', 'bold');
    doc.setTextColor(15, 39, 68);
    doc.text(auditCode, col3X + 22, currentY + 12);

    return currentY + boxHeight + 3;
  };

  // =========================================================================
  // PÁGINA 1: PANEL EJECUTIVO DE KPIS Y GRÁFICAS CIRCULARES DE DECISIÓN
  // =========================================================================
  if (includeCharts && purchases.length > 0) {
    let page1Y = renderOfficialHeader(
      `${title} • PANEL EJECUTIVO Y KPIS DE DECISIÓN`,
      `${subtitle} • Análisis visual y gráficos circulares para toma de decisiones institucionales`
    );

    page1Y = renderMetadataBox(page1Y);

    // Generar imagen de gráficos circulares y KPIs con canvas a 300 DPI
    const dashboardImg = generateExecutiveDashboardImage(purchases);
    if (dashboardImg) {
      const imgWidth = pageWidth - (marginX * 2); // 269 mm
      const imgHeight = 150; // mm (aspecto 3000x1680 con máxima nitidez)
      doc.addImage(dashboardImg, 'PNG', marginX, page1Y, imgWidth, imgHeight);
    }

    // Pie de página de la página 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);
    doc.text(
      'Documento oficial de control y auditoría interna • Gerencia de Informática • Organismo Judicial de Guatemala',
      marginX,
      pageHeight - 6
    );

    // Añadir siguiente página para la tabla de adquisiciones
    doc.addPage();
  }

  // =========================================================================
  // PÁGINA DE TABLA DETALLADA DE ADQUISICIONES
  // =========================================================================
  let tableStartY = renderOfficialHeader(
    title,
    `${subtitle} • Matriz oficial de control de compras y proveedores`
  );

  tableStartY = renderMetadataBox(tableStartY);

  const totalMonto = purchases.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const conDictamen = purchases.filter(p => p.evaluadoGIT === 'Sí' || Boolean(p.fechaDictamenGIT)).length;
  const adjudicados = purchases.filter(p => p.estatusEvento === 'Adjudicación').length;

  const tableHeaders = [
    '#',
    'NOG',
    'F56-e / F56',
    'Descripción del Requerimiento Tecnológico',
    'Área Solicitante',
    'Dictamen GIT',
    'Estatus',
    'Monto (GTQ)',
    'Proveedor Adjudicado',
  ];

  const tableRows = purchases.map((p, index) => {
    const dictamenText = (p.evaluadoGIT === 'Sí' || Boolean(p.fechaDictamenGIT))
      ? `Sí ${p.fechaDictamenGIT ? `(${p.fechaDictamenGIT})` : ''}`
      : 'No';

    const f56Text = `${p.f56e || '-'}\nFísico: ${p.f56 || '-'}`;

    return [
      (index + 1).toString(),
      p.nog || '-',
      f56Text,
      p.descripcion || '-',
      p.areaSolicitante || 'Soporte técnico',
      dictamenText,
      p.estatusEvento || 'Evaluación',
      `${formatQuetzales(p.monto || 0)}\n(${getModalidadCompraByMonto(p.monto).nombre})`,
      p.proveedorAdjudicado || (p.estatusEvento === 'Adjudicación' ? 'Sin registrar' : 'N/A'),
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    margin: { left: marginX, right: marginX, bottom: 16 },
    headStyles: {
      fillColor: [10, 10, 105], // #0A0A69
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59], // Slate 800
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },          // #
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // NOG
      2: { cellWidth: 25, halign: 'center' },         // F56-e / F56
      3: { cellWidth: 70, halign: 'left' },           // Descripción
      4: { cellWidth: 38, halign: 'left' },           // Área
      5: { cellWidth: 25, halign: 'center' },         // Dictamen GIT
      6: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }, // Estatus
      7: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },  // Monto
      8: { cellWidth: 32, halign: 'left' },           // Proveedor
    },
    didParseCell: (data) => {
      // Resaltado de estatus
      if (data.section === 'body' && data.column.index === 6) {
        const val = String(data.cell.raw);
        if (val === 'Adjudicación') {
          data.cell.styles.textColor = [29, 78, 216]; // Blue 700
        } else if (val === 'Evaluación') {
          data.cell.styles.textColor = [180, 83, 9]; // Amber 700
        } else if (val === 'Prescindido') {
          data.cell.styles.textColor = [190, 18, 60]; // Rose 700
        } else if (val === 'Desierto') {
          data.cell.styles.textColor = [100, 116, 139]; // Slate 500
        }
      }
      // Resaltado de Dictamen GIT
      if (data.section === 'body' && data.column.index === 5) {
        const val = String(data.cell.raw);
        if (val.startsWith('Sí')) {
          data.cell.styles.textColor = [4, 120, 87]; // Emerald 700
        }
      }
    },
    foot: [
      [
        '',
        '',
        '',
        `TOTAL CONSOLIDADO (${purchases.length} ADQUISICIONES LISTADAS)`,
        '',
        `${conDictamen} Dictámenes`,
        `${adjudicados} Adjudicadas`,
        formatQuetzales(totalMonto),
        '',
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249], // Slate 100
      textColor: [15, 23, 42],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'right',
      lineWidth: 0.3,
      lineColor: [148, 163, 184],
    },
  });

  // PIE DE PÁGINA INSTITUCIONAL EN TODAS LAS HOJAS (con numeración exacta)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);

    // Línea divisoria inferior
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    // Texto izquierdo del pie
    doc.text(
      'Documento oficial de control y auditoría interna • Gerencia de Informática • Organismo Judicial de Guatemala',
      marginX,
      pageHeight - 6
    );

    // Código de verificación y página al pie derecho
    doc.setFont('courier', 'normal');
    doc.text(`${auditCode} | Pág. ${i} de ${totalPages}`, pageWidth - marginX - 52, pageHeight - 6);
  }

  // Guardar archivo descargable
  const timeFormatted = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${timeFormatted}.pdf`;

  doc.save(filename);
  return filename;
}
