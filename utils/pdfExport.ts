import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseRecord } from '../types';
import { formatQuetzales, formatDate, formatDateTime, getModalidadCompraByMonto } from './formatters';
import { OJ_LOGO_DATA_URI } from './ojLogoAsset';
import { generateExecutiveDashboardImage } from './pdfChartRenderer';
import { getPurchaseTimeline } from './timelineUtils';
import { getPurchaseObservaciones } from './movementUtils';

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
    const adjudicados = purchases.filter(p => (p.estatusEvento || '').toLowerCase().includes('adjudic')).length;

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
  const adjudicados = purchases.filter(p => (p.estatusEvento || '').toLowerCase().includes('adjudic')).length;

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

    const modName = p.modalidadCompra || getModalidadCompraByMonto(p.monto, p.modalidadCompra).nombre;

    return [
      (index + 1).toString(),
      p.nog || '-',
      f56Text,
      p.descripcion || '-',
      p.areaSolicitante || 'Soporte técnico',
      dictamenText,
      p.estatusEvento || 'Evaluación',
      `${formatQuetzales(p.monto || 0)}\n(${modName})`,
      p.proveedorAdjudicado || ((p.estatusEvento || '').toLowerCase().includes('adjudic') ? 'Sin registrar' : 'N/A'),
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
        if (val.toLowerCase().includes('adjudic')) {
          data.cell.styles.textColor = [4, 120, 87]; // Emerald 700
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

  try {
    const blob = doc.output('blob');
    downloadPdfBlob(blob, filename);
  } catch (e) {
    console.warn('downloadPdfBlob falló en reporte consolidado, utilizando doc.save:', e);
    doc.save(filename);
  }
  return filename;
}

/**
 * Descarga de manera segura un archivo PDF como Blob en navegadores e iframes.
 * Evita bloqueos por restricciones de sandboxing creando enlaces temporales seguros
 * o fallback por data URI.
 */
export function downloadPdfBlob(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_self';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        // Ignorar limpieza de elemento
      }
    }, 2000);
    return true;
  } catch (err) {
    console.warn('downloadPdfBlob: error creando object URL, intentando fallback FileReader:', err);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const fallbackA = document.createElement('a');
        fallbackA.href = dataUrl;
        fallbackA.download = filename;
        fallbackA.rel = 'noopener noreferrer';
        fallbackA.style.display = 'none';
        document.body.appendChild(fallbackA);
        fallbackA.click();
        setTimeout(() => {
          try {
            document.body.removeChild(fallbackA);
          } catch (e) {}
        }, 1500);
      };
      reader.readAsDataURL(blob);
      return true;
    } catch (e2) {
      console.error('Error final en descarga de PDF:', e2);
      return false;
    }
  }
}

/**
 * Construye y formatea el documento jsPDF oficial de la Ficha Técnica de Adquisición F56-e.
 * Retorna la instancia jsPDF, el nombre de archivo sugerido y el código único de auditoría.
 */
export function createIndividualPurchasePDFDoc(
  purchase: PurchaseRecord,
  currentUser?: { nombreCompleto?: string; username?: string; rol?: string } | null
): { doc: jsPDF; filename: string; auditCode: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const now = new Date();
  const dateStr = formatDate(now.toISOString().slice(0, 10));
  const timeStr = formatDateTime(now.toISOString()).slice(11) || now.toLocaleTimeString('es-GT');
  const auditRandom = Math.random().toString(36).substring(2, 7).toUpperCase();
  const auditCode = `FICHA-ADQ-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${auditRandom}`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  let currentY = 10;

  // Función para dibujar cabecera institucional en la ficha
  const drawFichaHeader = (pageNum: number, totalNum: number) => {
    const bannerHeight = 22;
    doc.setFillColor(10, 10, 105); // #0A0A69 Azul Institucional
    doc.rect(marginX, 7, pageWidth - marginX * 2, bannerHeight, 'F');

    // Borde inferior sutil
    doc.setFillColor(30, 41, 130);
    doc.rect(marginX, 7 + bannerHeight - 0.5, pageWidth - marginX * 2, 0.5, 'F');

    // Logotipo Oficial
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX + 3, 8.5, 19, 19, 2, 2, 'F');
      doc.addImage(OJ_LOGO_DATA_URI, 'PNG', marginX + 4, 9.5, 17, 17);
    } catch (e) {
      console.warn('Error incrustando logo en ficha individual:', e);
    }

    // Textos institucionales
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('ORGANISMO JUDICIAL DE GUATEMALA', marginX + 25, 13.5);

    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('GERENCIA DE INFORMÁTICA  •  DIRECCIÓN DE COMPRAS', marginX + 25, 18.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(224, 231, 255);
    doc.text('FICHA TÉCNICA Y DICTAMEN OFICIAL DE ADQUISICIÓN TECNOLÓGICA (F56-e)', marginX + 25, 23);

    // Metadatos a la derecha
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`Emisión: ${dateStr} ${timeStr}`, pageWidth - marginX - 4, 13.5, { align: 'right' });
    doc.setFont('courier', 'bold');
    doc.text(auditCode, pageWidth - marginX - 4, 18.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${pageNum} de ${totalNum}`, pageWidth - marginX - 4, 23, { align: 'right' });
  };

  const drawFichaFooter = (pageNum: number, totalNum: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Documento oficial generado por el Sistema de Control de Compras GIT • Organismo Judicial • Código: ${auditCode}`,
      marginX,
      pageHeight - 8
    );
    doc.text(`Página ${pageNum} de ${totalNum}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  };

  currentY = 32;

  // 1. TÍTULO Y IDENTIFICACIÓN PRINCIPAL DEL EVENTO
  const modalidadLCE = getModalidadCompraByMonto(purchase.monto, purchase.modalidadCompra);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(10, 10, 105);
  doc.text(`NOG GUATECOMPRAS: ${purchase.nog}`, marginX + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Formulario F56-e: ${purchase.f56e}  •  F56 Físico: ${purchase.f56 || 'Sin especificar'}`, marginX + 4, currentY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTATUS EVENTO:', marginX + 4, currentY + 17);

  const estatus = purchase.estatusEvento || 'En proceso';
  if (estatus.toLowerCase().includes('adjudic')) {
    doc.setTextColor(5, 150, 105);
  } else if (estatus === 'Evaluación') {
    doc.setTextColor(180, 83, 9);
  } else if (estatus === 'Prescindido' || estatus === 'Desierto') {
    doc.setTextColor(225, 29, 72);
  } else {
    doc.setTextColor(10, 10, 105);
  }
  doc.text(estatus.toUpperCase(), marginX + 32, currentY + 17);

  // Monto a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('MONTO ESTIMADO / ADJUDICADO:', pageWidth - marginX - 4, currentY + 6, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 105);
  doc.text(formatQuetzales(purchase.monto), pageWidth - marginX - 4, currentY + 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Modalidad: ${modalidadLCE.nombre}`, pageWidth - marginX - 4, currentY + 18, { align: 'right' });

  currentY += 27;

  // 2. TABLA RESUMEN DE PARÁMETROS TÉCNICOS Y ADMINISTRATIVOS
  autoTable(doc, {
    startY: currentY,
    margin: { top: 32, bottom: 16, left: marginX, right: marginX },
    head: [['PARÁMETRO ADMINISTRATIVO', 'VALOR REGISTRADO', 'PARÁMETRO FINANCIERO / LCE', 'VALOR REGISTRADO']],
    body: [
      ['Área Solicitante', purchase.areaSolicitante || 'Soporte Técnico', 'Modalidad de Compra', `${modalidadLCE.nombre} (${modalidadLCE.descripcionRango})`],
      ['Dependencia Solicitante', purchase.dependenciaSolicitante || 'Gerencia de Informática', 'Fundamento Legal LCE', modalidadLCE.fundamentoLegal || 'Ley de Contrataciones del Estado'],
      ['Categoría Tecnológica', purchase.categoriaTecnologica || 'Equipo Informático', 'Renglón Presupuestario', `${purchase.renglonPresupuestario || '158'}${purchase.nombreRenglon ? ` (${purchase.nombreRenglon})` : ''}`],
      ['Proveedor Adjudicado', purchase.proveedorAdjudicado || 'Pendiente de Adjudicar', 'Grupo Presupuestario', purchase.grupoPresupuestario || 'Servicios No Personales / Equipo'],
      ['Fecha de Adjudicación', purchase.fechaAdjudicacion ? formatDate(purchase.fechaAdjudicacion) : 'No adjudicado aún', 'Afectación / Estado Pago', purchase.estadoPago === 'pagado' ? 'Pagado que rebaja presupuesto' : 'Comprometido (Pendiente de pago)'],
      ['Evaluación Área Técnica (GIT)', purchase.evaluadoGIT === 'Sí' ? 'SÍ (Dictamen Aprobado)' : 'NO (Sin evaluación técnica)', 'Cantidad de Ofertas Recibidas', `${purchase.cantidadOfertas || 0} postores`]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [10, 10, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'left',
    },
    styles: {
      fontSize: 7.0,
      textColor: [15, 23, 42],
      cellPadding: 2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 54 },
      2: { cellWidth: 42, fontStyle: 'bold', fillColor: [248, 250, 252] },
      3: { cellWidth: 'auto' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 3. DESCRIPCIÓN Y JUSTIFICACIÓN TÉCNICA DEL REQUERIMIENTO
  autoTable(doc, {
    startY: currentY,
    margin: { top: 32, bottom: 16, left: marginX, right: marginX },
    head: [['DESCRIPCIÓN Y JUSTIFICACIÓN TÉCNICA DEL REQUERIMIENTO CONFORME AL EXPEDIENTE']],
    body: [
      [purchase.descripcion || 'Sin descripción técnica registrada en el expediente de adquisición.']
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    styles: {
      fontSize: 7.0,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
      overflow: 'linebreak',
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 4. CRONOGRAMA DE FECHAS CLAVE DEL PROCESO
  autoTable(doc, {
    startY: currentY,
    margin: { top: 32, bottom: 16, left: marginX, right: marginX },
    head: [['FECHA SOLICITUD', 'FECHA VO.BO.', 'FECHA AUTORIZADO', 'FECHA PUBLICACIÓN', 'FECHA OFERTAS', 'FECHA DICTAMEN GIT']],
    body: [
      [
        formatDate(purchase.fechaSolicitud),
        formatDate(purchase.fechaVoBo),
        formatDate(purchase.fechaAutorizado),
        formatDate(purchase.fechaPublicacion),
        formatDate(purchase.fechaOfertas),
        purchase.fechaDictamenGIT ? formatDate(purchase.fechaDictamenGIT) : (purchase.evaluadoGIT === 'Sí' ? 'Favorable' : 'Pendiente')
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.0,
      halign: 'center',
    },
    styles: {
      fontSize: 7.0,
      textColor: [15, 23, 42],
      cellPadding: 2,
      halign: 'center',
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 5. LÍNEA DE TIEMPO Y TRACKING DE HITOS (de getPurchaseTimeline)
  const timelineEvents = getPurchaseTimeline(purchase);
  if (timelineEvents.length > 0) {
    const timelineBody = timelineEvents.map((evt, idx) => [
      String(idx + 1),
      formatDate(evt.fecha) + (evt.hora ? `\n${evt.hora}` : ''),
      evt.titulo + (evt.observaciones ? `\nNota: ${evt.observaciones}` : ''),
      evt.fase || 'Gestión',
      evt.responsable || 'GIT',
      evt.documentoReferencia || '—',
      evt.estado === 'completado' ? 'Completado' : evt.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente'
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { top: 32, bottom: 16, left: marginX, right: marginX },
      head: [['#', 'FECHA', 'HITO / EVENTO INSTITUCIONAL', 'FASE', 'RESPONSABLE', 'REF. DOC.', 'ESTADO']],
      body: timelineBody,
      theme: 'grid',
      headStyles: {
        fillColor: [10, 10, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.0,
        halign: 'center',
      },
      styles: {
        fontSize: 6.8,
        textColor: [15, 23, 42],
        cellPadding: 1.8,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 'auto', fontStyle: 'bold' },
        3: { cellWidth: 26 },
        4: { cellWidth: 26 },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // 6. ÁRBOL CRONOLÓGICO DE OBSERVACIONES (si existen)
  const observaciones = getPurchaseObservaciones(purchase);
  if (observaciones && observaciones.length > 0) {
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 32;
    }

    const obsBody = observaciones.slice(0, 12).map((obs, idx) => [
      `#${obs.numeroAccion || idx + 1}`,
      formatDate(obs.fecha) + (obs.hora ? ` ${obs.hora}` : ''),
      (obs.autor || 'Usuario GIT') + (obs.rolUsuario ? ` (${obs.rolUsuario})` : ''),
      obs.titulo || 'Observación Técnica',
      obs.texto
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { top: 32, bottom: 16, left: marginX, right: marginX },
      head: [['ACC.', 'FECHA / HORA', 'AUTOR / ROL', 'TÍTULO / TIPO', 'DETALLE DE LA OBSERVACIÓN']],
      body: obsBody,
      theme: 'grid',
      headStyles: {
        fillColor: [180, 83, 9], // Amber 700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.0,
        halign: 'center',
      },
      styles: {
        fontSize: 6.8,
        textColor: [15, 23, 42],
        cellPadding: 1.8,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 35 },
        3: { cellWidth: 32, fontStyle: 'bold' },
        4: { cellWidth: 'auto' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // 7. BLOQUE DE FIRMAS Y RESPONSABILIDAD INSTITUCIONAL
  const requiredSignHeight = 44;
  if (currentY + requiredSignHeight > pageHeight - 14 || currentY > pageHeight - 48) {
    doc.addPage();
    currentY = 32;
  }

  const signWidth = (pageWidth - marginX * 2 - 20) / 3;
  const signY = currentY + 12;

  // Firma 1: Elaboró
  doc.setDrawColor(148, 163, 184);
  doc.line(marginX, signY, marginX + signWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('ELABORADO POR:', marginX + signWidth / 2, signY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(currentUser?.nombreCompleto || purchase.creadoPor || 'Analista de Adquisiciones GIT', marginX + signWidth / 2, signY + 7, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Gerencia de Informática - OJ', marginX + signWidth / 2, signY + 10, { align: 'center' });

  // Firma 2: Visto Bueno
  const sign2X = marginX + signWidth + 10;
  doc.line(sign2X, signY, sign2X + signWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('VISTO BUENO (Vo.Bo.):', sign2X + signWidth / 2, signY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Subgerencia de Informática', sign2X + signWidth / 2, signY + 7, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Dictamen Técnico Validado', sign2X + signWidth / 2, signY + 10, { align: 'center' });

  // Firma 3: Autorizado
  const sign3X = sign2X + signWidth + 10;
  doc.line(sign3X, signY, sign3X + signWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('AUTORIZADO POR:', sign3X + signWidth / 2, signY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Gerente de Informática', sign3X + signWidth / 2, signY + 7, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Organismo Judicial de Guatemala', sign3X + signWidth / 2, signY + 10, { align: 'center' });

  // Aplicar cabecera y pie a todas las páginas generadas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFichaHeader(p, totalPages);
    drawFichaFooter(p, totalPages);
  }

  const cleanNog = (purchase.nog || 'S_N').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanF56e = (purchase.f56e || 'F56e').replace(/[^a-zA-Z0-9]/g, '_');
  const timeFormattedFicha = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  const filename = `Ficha_Tecnica_NOG_${cleanNog}_${cleanF56e}_${timeFormattedFicha}.pdf`;

  return { doc, filename, auditCode };
}

/**
 * Genera el Blob y la URL de previsualización para mostrar la Ficha en el navegador
 */
export function getIndividualPurchasePDFBlob(
  purchase: PurchaseRecord,
  currentUser?: { nombreCompleto?: string; username?: string; rol?: string } | null
): { blob: Blob; blobUrl: string; dataUri: string; filename: string; doc: jsPDF } {
  const { doc, filename } = createIndividualPurchasePDFDoc(purchase, currentUser);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const dataUri = doc.output('datauristring');
  return { blob, blobUrl, dataUri, filename, doc };
}

/**
 * Genera y descarga de forma segura la Ficha Técnica de la Adquisición en formato PDF.
 */
export function generateIndividualPurchasePDF(
  purchase: PurchaseRecord,
  currentUser?: { nombreCompleto?: string; username?: string; rol?: string } | null
): string {
  const { doc, filename } = createIndividualPurchasePDFDoc(purchase, currentUser);
  try {
    const blob = doc.output('blob');
    downloadPdfBlob(blob, filename);
  } catch (err) {
    console.warn('downloadPdfBlob falló en ficha individual, intentando doc.save:', err);
    try {
      doc.save(filename);
    } catch (err2) {
      console.error('Error al guardar documento PDF:', err2);
    }
  }
  return filename;
}

