/**
 * @license
 * Utilidades de Exportación e Importación para Servicios Contratados
 * Gerencia de Informática - Organismo Judicial de Guatemala
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ServicioContratado } from '../types';
import { calcularMetricasServicio } from './serviciosCalculations';
import { OJ_LOGO_DATA_URI } from './ojLogoAsset';

/**
 * Normaliza y enriquece los registros de servicios con sus cálculos para exportación
 */
export function prepareServiciosForExport(records: ServicioContratado[]) {
  return records.map((s, idx) => {
    const m = calcularMetricasServicio(s);
    return {
      'No.': idx + 1,
      'Código': s.codigo,
      'Área Solicitante': s.area,
      'Departamento': s.departamento || '',
      'Servicio Contratado': s.servicioContratado,
      'Objeto / Alcance Técnico': s.objetoAlcance || '',
      'Modalidad Guatecompras': s.modalidad,
      'NOG / Expediente': s.nogExpediente,
      'Proveedor Actual': s.proveedorActual,
      'Inicio Vigencia': s.inicioVigencia,
      'Fin Vigencia': s.finVigencia,
      'Duración (Días)': m.duracionTotalDias,
      'Días Transcurridos': m.diasTranscurridos,
      'Días Restantes': m.diasRestantes,
      '% Consumo': `${m.porcentajeConsumido}%`,
      'Semáforo Vigencia': m.semaforoVigencia.toUpperCase(),
      'Alerta Gestión': m.nivelAlertaGestion.toUpperCase(),
      'Mensaje de Alerta': m.mensajeAlertaGestion,
      'Estatus Operativo': s.estatusActual,
      'Acción Requerida': s.accionRequerida || 'No aplica',
      'Fecha Inicio Gestión': s.fechaInicioGestion || '',
      'Responsable de Seguimiento': s.responsableSeguimiento,
      'Riesgo de Continuidad': s.riesgoContinuidad,
      'Observaciones Técnicas': s.observaciones || '',
      'Creado Por': s.creadoPor,
      'Fecha de Registro': s.fechaCreacion ? s.fechaCreacion.slice(0, 10) : ''
    };
  });
}

/**
 * Exporta los servicios a un archivo Excel (.xlsx) estructurado
 */
export function exportServiciosToExcel(records: ServicioContratado[], customFileName?: string) {
  const exportData = prepareServiciosForExport(records);
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Configuración de ancho de columnas
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 15 }, // Código
    { wch: 30 }, // Área
    { wch: 35 }, // Departamento
    { wch: 45 }, // Servicio Contratado
    { wch: 50 }, // Objeto / Alcance
    { wch: 22 }, // Modalidad
    { wch: 18 }, // NOG
    { wch: 35 }, // Proveedor
    { wch: 15 }, // Inicio
    { wch: 15 }, // Fin
    { wch: 15 }, // Duración
    { wch: 18 }, // Transcurridos
    { wch: 15 }, // Restantes
    { wch: 12 }, // % Consumo
    { wch: 18 }, // Semáforo Vigencia
    { wch: 20 }, // Alerta Gestión
    { wch: 45 }, // Mensaje Alerta
    { wch: 22 }, // Estatus
    { wch: 30 }, // Acción
    { wch: 20 }, // Fecha Inicio Gestión
    { wch: 30 }, // Responsable
    { wch: 20 }, // Riesgo
    { wch: 40 }, // Observaciones
    { wch: 25 }, // Creado Por
    { wch: 18 }  // Fecha Registro
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicios_Consolidados');

  const today = new Date().toISOString().slice(0, 10);
  const fileName = customFileName ? `${customFileName}.xlsx` : `Servicios_Contratados_GIT_${today}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * Exporta los servicios a formato CSV
 */
export function exportServiciosToCSV(records: ServicioContratado[], customFileName?: string) {
  const exportData = prepareServiciosForExport(records);
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', customFileName ? `${customFileName}.csv` : `Servicios_Contratados_GIT_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Descarga una plantilla de Excel lista para diligenciar e importar
 */
export function downloadServiciosImportTemplate() {
  const templateRows = [
    {
      'codigo': 'SC-2026-010',
      'area': 'Seguridad Informática',
      'departamento': 'Unidad de Ciberseguridad',
      'servicioContratado': 'Soporte y Renovación de Antivirus Endpoint EDR',
      'objetoAlcance': 'Protección para 3,000 estaciones de trabajo y servidores judiciales.',
      'modalidad': 'Compra directa',
      'nogExpediente': '20194833',
      'proveedorActual': 'Soluciones Tecnológicas S.A.',
      'inicioVigencia': '2026-01-01',
      'finVigencia': '2026-12-31',
      'estatusActual': 'Vigente',
      'accionRequerida': 'Iniciar nuevo evento',
      'fechaInicioGestion': '2026-10-15',
      'responsableSeguimiento': 'Ing. Carlos Mendoza',
      'riesgoContinuidad': 'Alto',
      'observaciones': 'Incluye consola centralizada en nube.'
    },
    {
      'codigo': 'SC-2026-011',
      'area': 'Infraestructura',
      'departamento': 'Mantenimiento TIC',
      'servicioContratado': 'Póliza de Mantenimiento de Aires de Precisión',
      'objetoAlcance': 'Revisión mensual de unidades en salas de servidores.',
      'modalidad': 'Baja cuantía',
      'nogExpediente': '20938471',
      'proveedorActual': 'Climatización Avanzada S.A.',
      'inicioVigencia': '2026-03-01',
      'finVigencia': '2026-09-30',
      'estatusActual': 'Por vencer',
      'accionRequerida': 'Iniciar nuevo evento',
      'fechaInicioGestion': '2026-08-15',
      'responsableSeguimiento': 'Ing. Andrea Morales',
      'riesgoContinuidad': 'Medio',
      'observaciones': 'Requiere cambio de filtros de aire.'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  worksheet['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 40 }, { wch: 45 },
    { wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 35 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Servicios');
  XLSX.writeFile(workbook, 'Plantilla_Importacion_Servicios_GIT.xlsx');
}

/**
 * Lee y parsea un archivo Excel (.xlsx / .xls) o CSV para importar servicios
 */
export async function parseServiciosFile(file: File): Promise<{
  servicios: Partial<ServicioContratado>[];
  errors: string[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const errors: string[] = [];
    const servicios: Partial<ServicioContratado>[] = [];

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
          errors.push('El archivo no contiene filas o está vacío.');
          return resolve({ servicios: [], errors });
        }

        rows.forEach((row, index) => {
          const rowNumber = index + 2;

          // Mapeo flexible de nombres de columnas
          const codigo = row['codigo'] || row['Código'] || row['Codigo'] || `SC-IMP-${Date.now()}-${index + 1}`;
          const servicioContratado = row['servicioContratado'] || row['Servicio Contratado'] || row['servicio'] || row['Servicio'] || row['Nombre del Servicio'];
          const area = row['area'] || row['Área'] || row['Area'] || row['Área Solicitante'] || 'Servicios';
          const departamento = row['departamento'] || row['Departamento'] || row['Unidad'] || 'Gerencia de Informática';
          const modalidad = row['modalidad'] || row['Modalidad'] || row['Modalidad Guatecompras'] || 'Compra directa';
          const nogExpediente = String(row['nogExpediente'] || row['NOG'] || row['nog'] || row['Expediente'] || '0').trim();
          const proveedorActual = row['proveedorActual'] || row['Proveedor'] || row['proveedor'] || row['Proveedor Actual'] || 'No especificado';
          const inicioVigencia = normalizeDateString(row['inicioVigencia'] || row['Inicio Vigencia'] || row['fechaInicio'] || '2026-01-01');
          const finVigencia = normalizeDateString(row['finVigencia'] || row['Fin Vigencia'] || row['fechaFin'] || '2026-12-31');
          const estatusActual = row['estatusActual'] || row['Estatus'] || row['Estado'] || 'Vigente';
          const accionRequerida = row['accionRequerida'] || row['Acción Requerida'] || row['Accion Requerida'] || 'No aplica';
          const fechaInicioGestion = normalizeDateString(row['fechaInicioGestion'] || row['Fecha Inicio Gestión'] || '');
          const responsableSeguimiento = row['responsableSeguimiento'] || row['Responsable'] || row['Responsable de Seguimiento'] || 'GIT';
          const riesgoContinuidad = (row['riesgoContinuidad'] || row['Riesgo'] || 'Medio') as any;
          const objetoAlcance = row['objetoAlcance'] || row['Objeto / Alcance'] || row['Alcance'] || '';
          const observaciones = row['observaciones'] || row['Observaciones'] || '';

          if (!servicioContratado) {
            errors.push(`Fila ${rowNumber}: Falta el nombre del servicio contratado.`);
            return;
          }

          servicios.push({
            id: `srv-imp-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
            codigo: String(codigo).trim(),
            area: String(area).trim(),
            departamento: String(departamento).trim(),
            servicioContratado: String(servicioContratado).trim(),
            objetoAlcance: String(objetoAlcance).trim(),
            modalidad: String(modalidad).trim(),
            nogExpediente,
            proveedorActual: String(proveedorActual).trim(),
            inicioVigencia,
            finVigencia,
            estatusActual: String(estatusActual).trim(),
            accionRequerida: String(accionRequerida).trim(),
            fechaInicioGestion: fechaInicioGestion || undefined,
            responsableSeguimiento: String(responsableSeguimiento).trim(),
            riesgoContinuidad: (['Alto', 'Medio', 'Bajo'].includes(riesgoContinuidad) ? riesgoContinuidad : 'Medio') as any,
            observaciones: String(observaciones).trim(),
            creadoPor: 'Importación Masiva',
            fechaCreacion: new Date().toISOString()
          });
        });

        resolve({ servicios, errors });
      } catch (err: any) {
        errors.push(`Error al procesar el archivo: ${err?.message || 'Formato no reconocido'}`);
        resolve({ servicios: [], errors });
      }
    };

    reader.onerror = () => {
      errors.push('Error al leer el archivo desde el dispositivo.');
      resolve({ servicios: [], errors });
    };

    reader.readAsBinaryString(file);
  });
}

function normalizeDateString(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial number
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Try DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

/**
 * Genera el reporte oficial en PDF de Servicios Contratados y Alertas
 */
export function generateServiciosPDFReport(records: ServicioContratado[], currentUser?: any) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Amber accent line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Logotipo Oficial del Organismo Judicial
  try {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 3.5, 21, 21, 2, 2, 'F');
    doc.addImage(OJ_LOGO_DATA_URI, 'PNG', 13.5, 5, 18, 18);
  } catch (e) {
    console.warn('Error incrustando logotipo en reporte de servicios:', e);
  }

  // Title & Headers (shifted to X = 38 to give ample space for logo)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('ORGANISMO JUDICIAL DE GUATEMALA', 38, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11); // amber-400
  doc.text('GERENCIA DE INFORMÁTICA • CONTROL DE SERVICIOS Y CONTRATOS (GIT)', 38, 17);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Sistema Integrado de Monitoreo de Vigencias de Pólizas, Renovaciones y Alertas Tempranas', 38, 23);

  // Subtitle / Date (top right)
  const today = new Date().toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Fecha de Emisión: ${today}`, pageWidth - 14, 13, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Registros: ${records.length}`, pageWidth - 14, 19, { align: 'right' });

  // Summary Metrics Banner
  let vigentes = 0;
  let porVencer = 0;
  let vencidos = 0;
  let alertasCriticas = 0;

  records.forEach((s) => {
    const m = calcularMetricasServicio(s);
    if (m.esVencido) vencidos++;
    else if (m.semaforoVigencia === 'naranja' || m.semaforoVigencia === 'amarillo') porVencer++;
    else vigentes++;

    if (m.nivelAlertaGestion === 'critico') alertasCriticas++;
  });

  doc.setFillColor(248, 250, 252);
  doc.rect(14, 34, pageWidth - 28, 13, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 34, pageWidth - 28, 13, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`MÉTRICAS EJECUTIVAS:`, 18, 42.5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Total Servicios: ${records.length}`, 65, 42.5);
  doc.setTextColor(16, 185, 129); // green
  doc.text(`Vigentes (+60d): ${vigentes}`, 105, 42.5);
  doc.setTextColor(245, 158, 11); // amber
  doc.text(`Por Vencer (1-60d): ${porVencer}`, 150, 42.5);
  doc.setTextColor(225, 29, 72); // rose
  doc.text(`Vencidos (0d): ${vencidos}`, 200, 42.5);
  doc.setTextColor(185, 28, 28);
  doc.text(`Alertas Críticas: ${alertasCriticas}`, 245, 42.5);

  // Table
  const tableData = records.map((s, idx) => {
    const m = calcularMetricasServicio(s);
    const diasTxt = m.esVencido ? `VENCIDO (${m.diasDesfase}d)` : `${m.diasRestantes} días`;
    return [
      idx + 1,
      s.codigo,
      s.area,
      s.servicioContratado,
      s.modalidad,
      s.nogExpediente,
      s.proveedorActual,
      s.finVigencia,
      diasTxt,
      `${m.porcentajeConsumido}%`,
      m.nivelAlertaGestion.toUpperCase(),
      s.responsableSeguimiento
    ];
  });

  // Table width calculation:
  // Total printable width (Letter landscape 279.4mm - 28mm margins) = 251.4mm
  // Column widths sum exactly to 251mm to avoid any automatic compression or word wrapping on "Vencimiento"
  autoTable(doc, {
    startY: 51,
    head: [[
      'No.',
      'Código',
      'Área Solicitante',
      'Servicio Contratado',
      'Modalidad',
      'NOG',
      'Proveedor Actual',
      'Vencimiento',
      'Días Restantes',
      '% Uso',
      'Alerta Gestión',
      'Responsable'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 16, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 46 },
      4: { cellWidth: 18 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 28 },
      7: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 21, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: 12, halign: 'center' },
      10: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      11: { cellWidth: 21 }
    },
    didDrawCell: (data) => {
      // Color coding for Días Restantes and Alerta Gestión
      if (data.section === 'body' && (data.column.index === 8 || data.column.index === 10)) {
        const text = String(data.cell.raw || '');
        if (text.includes('VENCIDO') || text.includes('CRITICO')) {
          doc.setTextColor(225, 29, 72);
        } else if (text.includes('ALERTA')) {
          doc.setTextColor(217, 119, 6);
        } else if (text.includes('ANTICIPADO')) {
          doc.setTextColor(79, 70, 229);
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 20 }
  });

  // Footer on each page (two clean non-overlapping rows with top divider line)
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    // Row 1: Institutional text (left) & Page number (right)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Organismo Judicial de Guatemala • Gerencia de Informática • Reporte Oficial de Servicios Contratados GIT',
      14,
      pageHeight - 7.5
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      pageHeight - 7.5,
      { align: 'right' }
    );

    // Row 2: Generated by (left) & Confidential notice (right)
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    const userLabel = currentUser?.nombreCompleto
      ? `Generado por: ${currentUser.nombreCompleto} (${currentUser.correo || currentUser.rol || 'Usuario Autorizado'})`
      : 'Generado por: Sistema de Adquisiciones y Servicios GIT';
    doc.text(userLabel, 14, pageHeight - 3.5);
    doc.text('Confidencial - Para Uso Oficial Interno Institucional', pageWidth - 14, pageHeight - 3.5, { align: 'right' });
  }

  const exportDate = new Date().toISOString().slice(0, 10);
  doc.save(`Reporte_Servicios_Contratados_GIT_${exportDate}.pdf`);
}
