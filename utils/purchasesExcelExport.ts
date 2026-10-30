import * as XLSX from 'xlsx';
import { PurchaseRecord } from '../types';
import { getModalidadCompraByMonto } from './formatters';

/**
 * Prepara los registros de adquisiciones y eventos para exportación fidedigna
 * manteniendo renglón presupuestario, área solicitante y estatus exactos del sistema.
 */
export const preparePurchasesForExport = (purchases: PurchaseRecord[]) => {
  return purchases.map((p) => {
    // Documentos adjuntos (F56 digitalizado + documentos de movimientos)
    const docsSummary: string[] = [];
    if (p.f56Documento && p.f56Documento.nombre) {
      docsSummary.push(`F56: ${p.f56Documento.nombre}`);
    }
    const movDocs = (p.movimientos || []).filter(m => m.documento && m.documento.nombre);
    if (movDocs.length > 0) {
      docsSummary.push(`${movDocs.length} doc(s) en movimientos (${movDocs.map(m => m.documento?.nombre).join(', ')})`);
    }

    return {
      'ID': p.id,
      'NOG': p.nog || '0',
      'F56-e': p.f56e || '',
      'F56': p.f56 || '',
      'Renglón Presupuestario': p.renglonPresupuestario || '',
      'Nombre del Renglón': p.nombreRenglon || '',
      'Grupo Presupuestario': p.grupoPresupuestario || '',
      'Área Solicitante': p.areaSolicitante || '',
      'Descripción': p.descripcion || '',
      'Fecha Solicitud': p.fechaSolicitud || '',
      'Fecha Vo.Bo.': p.fechaVoBo || 'N/A',
      'Fecha Autorizado': p.fechaAutorizado || 'N/A',
      'Fecha Publicación': p.fechaPublicacion || 'N/A',
      'Fecha Cierre Ofertas': p.fechaOfertas || 'N/A',
      'Fecha Dictamen Técnico': p.fechaDictamenGIT || 'N/A',
      'Fecha Oficio GIT': p.fechaElaboracionOficioGIT || 'N/A',
      'Cantidad de Ofertas': typeof p.cantidadOfertas === 'number' ? p.cantidadOfertas : 0,
      'Monto (GTQ)': typeof p.monto === 'number' ? p.monto : 0,
      'Evaluado por el Área Técnica Correspondiente': p.evaluadoGIT || 'No',
      'Estatus del Evento': p.estatusEvento || '',
      'Fecha Adjudicación': p.fechaAdjudicacion || 'N/A',
      'Categoría Tecnológica': p.categoriaTecnologica || 'N/A',
      'Dependencia Solicitante': p.dependenciaSolicitante || 'N/A',
      'Modalidad de Compra': p.modalidadCompra || getModalidadCompraByMonto(p.monto, p.modalidadCompra).nombre,
      'Proveedor Adjudicado': p.proveedorAdjudicado || 'N/A',
      'Documentos Adjuntos': docsSummary.length > 0 ? docsSummary.join(' | ') : 'Sin adjuntos',
      'Observaciones': p.observaciones || ''
    };
  });
};

/**
 * Exporta registros de compras a un archivo Excel (.xlsx) con anchos de columna adaptados
 */
export const exportPurchasesToExcel = (records: PurchaseRecord[], fileName?: string) => {
  const exportData = preparePurchasesForExport(records);
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  const colWidths = [
    { wch: 16 }, // ID
    { wch: 14 }, // NOG
    { wch: 16 }, // F56-e
    { wch: 12 }, // F56
    { wch: 22 }, // Renglón Presupuestario
    { wch: 32 }, // Nombre del Renglón
    { wch: 28 }, // Grupo Presupuestario
    { wch: 32 }, // Área Solicitante
    { wch: 45 }, // Descripción
    { wch: 16 }, // Fecha Solicitud
    { wch: 16 }, // Fecha Vo.Bo.
    { wch: 16 }, // Fecha Autorizado
    { wch: 16 }, // Fecha Publicación
    { wch: 18 }, // Fecha Cierre Ofertas
    { wch: 20 }, // Fecha Dictamen Técnico
    { wch: 18 }, // Fecha Oficio GIT
    { wch: 18 }, // Cantidad de Ofertas
    { wch: 16 }, // Monto (GTQ)
    { wch: 36 }, // Evaluado Área Técnica
    { wch: 20 }, // Estatus del Evento
    { wch: 18 }, // Fecha Adjudicación
    { wch: 26 }, // Categoría Tecnológica
    { wch: 32 }, // Dependencia Solicitante
    { wch: 22 }, // Modalidad de Compra
    { wch: 36 }, // Proveedor Adjudicado
    { wch: 36 }, // Documentos Adjuntos
    { wch: 40 }, // Observaciones
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Compras_Eventos_OJ');

  const today = new Date().toISOString().slice(0, 10);
  const finalName = fileName ? `${fileName}.xlsx` : `Adquisiciones_GIT_OJ_${today}.xlsx`;

  XLSX.writeFile(workbook, finalName);
};

/**
 * Exporta registros de compras a formato CSV con codificación UTF-8 y BOM
 */
export const exportPurchasesToCSV = (records: PurchaseRecord[], fileName?: string) => {
  const exportData = preparePurchasesForExport(records);
  if (exportData.length === 0) return;

  const headers = Object.keys(exportData[0]);
  const csvRows: string[] = [];
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  for (const row of exportData) {
    const values = headers.map(header => {
      const val = (row as any)[header];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);

  const today = new Date().toISOString().slice(0, 10);
  const finalName = fileName ? `${fileName}.csv` : `Adquisiciones_GIT_OJ_${today}.csv`;
  link.setAttribute('download', finalName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
